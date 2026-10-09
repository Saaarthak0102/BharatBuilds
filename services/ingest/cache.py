"""
Cache utilities for the ingestion pipeline.

Provides consistent caching to DynamoDB DataCache table and S3.
Handles TTL, freshness tracking, and fallback to last-known-good values on failure.
"""

from datetime import datetime, timezone
from decimal import Decimal
import json
import logging
import os
import time
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)

# In-memory last known good cache to guarantee fallback on failure
_LAST_GOOD_CACHE: dict[tuple[str, str], dict[str, Any]] = {}


def _to_decimal(val: Any) -> Any:
    """Recursively convert float values to Decimal for DynamoDB compatibility."""
    if isinstance(val, float):
        return Decimal(str(val))
    if isinstance(val, dict):
        return {k: _to_decimal(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_to_decimal(v) for v in val]
    return val


def _from_decimal(val: Any) -> Any:
    """Recursively convert Decimal back to float or int for standard Python dicts."""
    if isinstance(val, Decimal):
        if val % 1 == 0:
            return int(val)
        return float(val)
    if isinstance(val, dict):
        return {k: _from_decimal(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_from_decimal(v) for v in val]
    return val


def get_dynamodb_table(table_name: str | None = None):
    """Get the DynamoDB Table resource."""
    if not table_name:
        table_name = os.environ.get("DATA_CACHE_TABLE", "saans-data-cache-dev")
    region = os.environ.get("AWS_REGION", "ap-south-1")
    dynamodb = boto3.resource("dynamodb", region_name=region)
    return dynamodb.Table(table_name)


def cache_to_dynamo(
    source: str,
    key: str,
    payload: Any,
    ttl_hours: int = 6,
    ttl_seconds: int | None = None,
    table_name: str | None = None,
) -> dict[str, Any]:
    """
    Cache data in DynamoDB DataCache table with fetched_at and ttl.

    Args:
        source: Data source identifier (e.g., "firms", "open_meteo", "cpcb")
        key: Cache key (e.g., location ID or "all")
        payload: Data to cache
        ttl_hours: Time-to-live in hours (default: 6)
        ttl_seconds: Time-to-live in seconds (overrides ttl_hours if provided)
        table_name: Optional override for DynamoDB table name

    Returns:
        {"source": str, "key": str, "payload": Any, "fetched_at": str, "ttl": int}
    """
    now = datetime.now(timezone.utc)
    fetched_at = now.isoformat()
    seconds = ttl_seconds if ttl_seconds is not None else ttl_hours * 3600
    ttl = int(now.timestamp() + seconds)

    # Clean payload for DynamoDB storage
    clean_payload = _to_decimal(payload)

    item_to_put = {
        "source": str(source),
        "key": str(key),
        "payload": clean_payload,
        "fetched_at": fetched_at,
        "ttl": ttl,
    }

    result_item = {
        "source": str(source),
        "key": str(key),
        "payload": payload,
        "fetched_at": fetched_at,
        "ttl": ttl,
    }

    # Record in memory cache as last known good
    _LAST_GOOD_CACHE[(source, key)] = result_item

    try:
        table = get_dynamodb_table(table_name)
        table.put_item(Item=item_to_put)
    except (ClientError, BotoCoreError, Exception) as exc:
        logger.warning(
            "Failed to write item to DataCache table (%s/%s): %s. Preserved in-memory fallback.",
            source,
            key,
            exc,
        )

    return result_item


# Convenience alias
write_cache = cache_to_dynamo


def get_cached(
    source: str,
    key: str,
    allow_expired: bool = False,
    table_name: str | None = None,
) -> dict[str, Any] | None:
    """
    Get cached data from DataCache table.

    Returns the cached item, or falls back to the last known good value
    on DynamoDB read failure or when expired if fallback is allowed.

    Args:
        source: Data source identifier (e.g., "open_meteo")
        key: Cache key (e.g., location ID)
        allow_expired: If True, return item even if TTL has passed
        table_name: Optional override for DynamoDB table name

    Returns:
        dict containing {"source", "key", "payload", "fetched_at", "ttl"} or None
    """
    now_ts = int(datetime.now(timezone.utc).timestamp())

    try:
        table = get_dynamodb_table(table_name)
        response = table.get_item(Key={"source": str(source), "key": str(key)})
        item = response.get("Item")
        if item:
            item = _from_decimal(item)
            # Update last good value cache
            _LAST_GOOD_CACHE[(source, key)] = item

            ttl = item.get("ttl", 0)
            if ttl and ttl < now_ts and not allow_expired:
                logger.info("Cached item for %s/%s has expired (ttl=%s, now=%s)", source, key, ttl, now_ts)
                return None
            return item
    except (ClientError, BotoCoreError, Exception) as exc:
        logger.warning(
            "Failed to read from DataCache table (%s/%s): %s. Falling back to last good value.",
            source,
            key,
            exc,
        )
        # Return last good value from in-memory fallback on failure
        return _LAST_GOOD_CACHE.get((source, key))

    return None


# Convenience alias
read_cache = get_cached


def get_last_good(
    source: str,
    key: str,
    table_name: str | None = None,
) -> dict[str, Any] | None:
    """
    Return last known good value for a cache key, even if expired or on failure.
    """
    # Try fetching with allow_expired=True first
    cached = get_cached(source, key, allow_expired=True, table_name=table_name)
    if cached:
        return cached

    # Fall back to in-memory last good
    return _LAST_GOOD_CACHE.get((source, key))


def cache_to_s3(bucket: str, key: str, payload: dict) -> dict[str, Any]:
    """
    Cache data to S3 for serving as map layer data.

    Args:
        bucket: S3 bucket name
        key: S3 object key
        payload: GeoJSON or other data to cache

    Returns:
        {"bucket": str, "key": str, "cached_at": str}
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    region = os.environ.get("AWS_REGION", "ap-south-1")

    try:
        s3 = boto3.client("s3", region_name=region)
        serialized = json.dumps(_from_decimal(payload), default=str)
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=serialized.encode("utf-8"),
            ContentType="application/json",
        )
    except (ClientError, BotoCoreError, Exception) as exc:
        logger.warning("Failed to cache payload to S3 bucket %s key %s: %s", bucket, key, exc)

    return {"bucket": bucket, "key": key, "cached_at": now_iso}
