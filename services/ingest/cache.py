"""
Cache utilities for the ingestion pipeline.

Provides consistent caching to DynamoDB DataCache table and S3.
Handles TTL, freshness tracking, and fallback to last-known-good values.
"""


def cache_to_dynamo(source: str, key: str, payload: dict, ttl_hours: int = 6) -> dict:
    """
    Cache data in DynamoDB DataCache table.

    Args:
        source: Data source identifier (e.g., "firms", "open_meteo", "cpcb")
        key: Cache key (e.g., region or station ID)
        payload: Data to cache
        ttl_hours: Time-to-live in hours

    Returns:
        {"source": str, "key": str, "cached_at": str, "ttl": int}

    TODO: Implement DynamoDB put with TTL
    """
    raise NotImplementedError


def cache_to_s3(bucket: str, key: str, payload: dict) -> dict:
    """
    Cache data to S3 for serving as map layer data.

    Args:
        bucket: S3 bucket name
        key: S3 object key
        payload: GeoJSON or other data to cache

    Returns:
        {"bucket": str, "key": str, "cached_at": str}

    TODO: Implement S3 put
    """
    raise NotImplementedError


def get_cached(source: str, key: str) -> dict | None:
    """
    Get cached data, returns None if expired or missing.

    Falls back to last-known-good value if available.

    TODO: Implement DynamoDB get with TTL check
    """
    raise NotImplementedError
