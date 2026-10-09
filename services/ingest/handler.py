"""
Lambda ingestion handler for Saans.

Scheduled periodically via EventBridge (e.g. rate(3 hours)).
Fetches weather and wind forecasts from Open-Meteo for Punjab and Delhi
and persists results to DynamoDB DataCache table with TTL and fallback.

Note: firms.py and aqi.py are stubbed with the same interface but not called yet.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Any

try:
    from services.ingest import cache, open_meteo
except (ImportError, ModuleNotFoundError):
    try:
        from ingest import cache, open_meteo  # type: ignore
    except (ImportError, ModuleNotFoundError):
        import cache, open_meteo  # type: ignore

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def handler(event: dict[str, Any] | None, context: Any = None) -> dict[str, Any]:
    """
    Main Lambda handler for scheduled data ingestion.

    Steps:
    1. Fetch 7-day weather forecast and wind data from Open-Meteo for seed locations
    2. Write each location forecast into DynamoDB DataCache table with TTL
    3. Write full aggregated weather list into DataCache under key='all'
    4. Fall back to last-known-good cached data on fetch failure
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    logger.info("Starting ingestion handler run at %s. Event: %s", now_iso, event)

    cached_records: list[dict[str, Any]] = []
    locations_updated: list[str] = []
    errors: list[str] = []

    # Get seed locations for Punjab and Delhi
    seed_locations = open_meteo.get_seed_locations()

    for loc in seed_locations:
        loc_id = str(loc.get("id"))
        loc_name = str(loc.get("name"))

        try:
            # Fetch weather forecast and wind for the location
            parsed_weather = open_meteo.fetch_location(loc)

            # Write to DataCache with 12 hour TTL
            cached_item = cache.cache_to_dynamo(
                source=open_meteo.SOURCE_NAME,
                key=loc_id,
                payload=parsed_weather,
                ttl_hours=12,
            )
            cached_records.append(parsed_weather)
            locations_updated.append(loc_id)
            logger.info("Successfully cached weather for %s (%s)", loc_name, loc_id)

        except Exception as exc:
            err_msg = f"Failed to fetch/cache weather for {loc_name} ({loc_id}): {exc}"
            logger.warning("%s. Attempting fallback to last known good value.", err_msg)
            errors.append(err_msg)

            # Return last good value on failure
            last_good = cache.get_last_good(open_meteo.SOURCE_NAME, loc_id)
            if last_good and "payload" in last_good:
                cached_records.append(last_good["payload"])
                logger.info("Recovered last known good cache for %s (%s)", loc_name, loc_id)
            elif last_good:
                cached_records.append(last_good)
                logger.info("Recovered last known good cache for %s (%s)", loc_name, loc_id)

    # Write aggregated record under key 'all' if we have records
    if cached_records:
        try:
            cache.cache_to_dynamo(
                source=open_meteo.SOURCE_NAME,
                key="all",
                payload=cached_records,
                ttl_hours=12,
            )
            logger.info("Successfully cached aggregated weather for %d locations under key 'all'", len(cached_records))
        except Exception as exc:
            logger.warning("Failed to cache aggregated weather list: %s", exc)

    response_body = {
        "ok": len(cached_records) > 0,
        "source": open_meteo.SOURCE_NAME,
        "locations_attempted": len(seed_locations),
        "locations_updated": len(locations_updated),
        "records_retained": len(cached_records),
        "updated_ids": locations_updated,
        "errors": errors if errors else None,
        "timestamp": now_iso,
    }

    status_code = 200 if len(cached_records) > 0 else 500
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(response_body),
    }
