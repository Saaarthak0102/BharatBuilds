"""
Air Quality Index (AQI) data ingestion.

Fetches AQI and PM2.5/PM10 readings for Delhi NCR monitoring stations from CPCB / OpenAQ.
Stubbed with the standardized ingest provider interface.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

SOURCE_NAME = "aqi"
DEFAULT_TIMEOUT_SECONDS = 5.0
DEFAULT_RETRIES = 3

# Target Delhi NCR monitoring stations / wards
TARGET_STATIONS: list[dict[str, Any]] = [
    {"id": "station-anand-vihar", "name": "Anand Vihar", "city": "Delhi", "lat": 28.6692, "lng": 77.3055},
    {"id": "station-laxmi-nagar", "name": "Laxmi Nagar", "city": "Delhi", "lat": 28.6304, "lng": 77.2770},
    {"id": "station-civil-lines", "name": "Civil Lines", "city": "Delhi", "lat": 28.6814, "lng": 77.2226},
    {"id": "station-hauz-khas", "name": "Hauz Khas", "city": "Delhi", "lat": 28.5494, "lng": 77.2001},
    {"id": "station-connaught-place", "name": "Connaught Place", "city": "Delhi", "lat": 28.6315, "lng": 77.2167},
]


def get_locations() -> list[dict[str, Any]]:
    """Return target monitoring stations for AQI measurement."""
    return [dict(s) for s in TARGET_STATIONS]


def fetch_location(
    location: dict[str, Any],
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
) -> dict[str, Any]:
    """
    Stub: Fetch AQI data for a single station.
    Returns stubbed air quality record conforming to standard interface.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "id": location.get("id"),
        "name": location.get("name"),
        "station_name": location.get("name"),
        "city": location.get("city", "Delhi"),
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "aqi": 0,
        "pm25": 0.0,
        "pm10": 0.0,
        "category": "Good",
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
    Stub: Fetch AQI data for all monitored stations.
    """
    target_locations = locations if locations is not None else get_locations()
    return [fetch_location(loc, timeout=timeout, retries=retries) for loc in target_locations]


# Standard interface alias
fetch_aqi = fetch_data


def ingest(cache_func=None) -> dict[str, Any]:
    """
    Stub: Execute AQI ingestion and store to cache.
    """
    data = fetch_data()
    return {
        "source": SOURCE_NAME,
        "status": "stubbed",
        "locations_updated": len(data),
        "data": data,
    }


def handler(event, context) -> dict[str, Any]:
    """Stub Lambda handler for AQI ingestion."""
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
