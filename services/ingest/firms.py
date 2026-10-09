"""
NASA FIRMS (Fire Information for Resource Management System) data ingestion.

Fetches active fire hotspot data for Punjab and Haryana agricultural regions.
Stubbed with the standardized ingest provider interface.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

SOURCE_NAME = "firms"
DEFAULT_TIMEOUT_SECONDS = 5.0
DEFAULT_RETRIES = 3

# Target agricultural districts in Punjab and Haryana for fire monitoring
TARGET_DISTRICTS: list[dict[str, Any]] = [
    {"id": "district-patiala", "name": "Patiala", "state": "Punjab", "lat": 30.34, "lng": 76.38},
    {"id": "district-ludhiana", "name": "Ludhiana", "state": "Punjab", "lat": 30.90, "lng": 75.85},
    {"id": "district-sangrur", "name": "Sangrur", "state": "Punjab", "lat": 30.25, "lng": 75.84},
    {"id": "district-karnal", "name": "Karnal", "state": "Haryana", "lat": 29.69, "lng": 76.99},
]


def get_locations() -> list[dict[str, Any]]:
    """Return target monitoring districts for FIRMS fire hotspot detection."""
    return [dict(d) for d in TARGET_DISTRICTS]


def fetch_location(
    location: dict[str, Any],
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
) -> dict[str, Any]:
    """
    Stub: Fetch active fire hotspot data for a single district or bounding box.
    Returns stubbed hotspot record conforming to standard interface.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "id": location.get("id"),
        "name": location.get("name"),
        "district": location.get("name"),
        "state": location.get("state"),
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "hotspot_count": 0,
        "hotspots": [],
        "fetched_at": now_iso,
        "is_sample": True,
        "stubbed": True,
    }


def fetch_data(
    locations: list[dict[str, Any]] | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
) -> list[dict[str, Any]]:
    """
    Stub: Fetch active fire hotspots for all monitored districts.
    """
    target_locations = locations if locations is not None else get_locations()
    return [fetch_location(loc, timeout=timeout, retries=retries) for loc in target_locations]


# Standard interface alias
fetch_hotspots = fetch_data


def ingest(cache_func=None) -> dict[str, Any]:
    """
    Stub: Execute FIRMS hotspot ingestion and store to cache.
    """
    data = fetch_data()
    return {
        "source": SOURCE_NAME,
        "status": "stubbed",
        "locations_updated": len(data),
        "data": data,
    }


def handler(event, context) -> dict[str, Any]:
    """Stub Lambda handler for FIRMS ingestion."""
    res = ingest()
    return {
        "statusCode": 200,
        "body": json.dumps({
            "ok": True,
            "source": res["source"],
            "status": res["status"],
            "locations_updated": res["locations_updated"],
            "time": datetime.now(timezone.utc).isoformat(),
        }),
    }
