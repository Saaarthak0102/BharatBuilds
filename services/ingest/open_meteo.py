"""
Open-Meteo weather data ingestion.

Fetches 7-day weather forecast and wind data for Punjab and Delhi
coordinates sourced from data/seed using urllib with timeout and retries.
No external dependencies.
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import time
from typing import Any
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

SOURCE_NAME = "open_meteo"
API_ENDPOINT = "https://api.open-meteo.com/v1/forecast"
DEFAULT_TIMEOUT_SECONDS = 5.0
DEFAULT_RETRIES = 3
DEFAULT_BACKOFF_BASE = 0.5

# Seed fallback coordinates for Punjab and Delhi if data/seed files cannot be read at runtime
DEFAULT_PUNJAB_LOCATIONS: list[dict[str, Any]] = [
    {"id": "village-patiala-001", "name": "Rajpura", "district": "Patiala", "state": "Punjab", "lat": 30.48, "lng": 76.59},
    {"id": "village-patiala-002", "name": "Nabha", "district": "Patiala", "state": "Punjab", "lat": 30.37, "lng": 76.15},
    {"id": "village-ludhiana-001", "name": "Khanna", "district": "Ludhiana", "state": "Punjab", "lat": 30.70, "lng": 76.22},
    {"id": "village-ludhiana-002", "name": "Jagraon", "district": "Ludhiana", "state": "Punjab", "lat": 30.79, "lng": 75.47},
    {"id": "village-sangrur-001", "name": "Malerkotla", "district": "Sangrur", "state": "Punjab", "lat": 30.53, "lng": 75.88},
    {"id": "village-sangrur-002", "name": "Barnala", "district": "Sangrur", "state": "Punjab", "lat": 30.38, "lng": 75.55},
]

DEFAULT_DELHI_LOCATIONS: list[dict[str, Any]] = [
    {"id": "ward-east-delhi-001", "name": "Anand Vihar", "zone": "East Delhi", "city": "Delhi", "lat": 28.6692, "lng": 77.3055},
    {"id": "ward-east-delhi-002", "name": "Laxmi Nagar", "zone": "East Delhi", "city": "Delhi", "lat": 28.6304, "lng": 77.2770},
    {"id": "ward-north-delhi-001", "name": "Civil Lines", "zone": "North Delhi", "city": "Delhi", "lat": 28.6814, "lng": 77.2226},
    {"id": "ward-south-delhi-001", "name": "Hauz Khas", "zone": "South Delhi", "city": "Delhi", "lat": 28.5494, "lng": 77.2001},
    {"id": "ward-central-delhi-001", "name": "Connaught Place", "zone": "Central Delhi", "city": "Delhi", "lat": 28.6315, "lng": 77.2167},
]


def map_wmo_code_to_condition(code: int | None) -> str:
    """Map WMO weather code to standard human-readable condition."""
    if code is None:
        return "unknown"
    if code == 0:
        return "clear"
    if code in (1, 2, 3):
        return "partly_cloudy" if code == 1 else "cloudy"
    if code in (45, 48):
        return "fog"
    if 51 <= code <= 57:
        return "drizzle"
    if 61 <= code <= 65:
        return "rain"
    if 66 <= code <= 67:
        return "freezing_rain"
    if 71 <= code <= 77:
        return "snow"
    if 80 <= code <= 82:
        return "rain_showers"
    if 95 <= code <= 99:
        return "thunderstorm"
    return "cloudy"


def is_wind_carrying_toward_delhi(direction_deg: float | int | None, state_or_city: str) -> bool:
    """
    Determine if wind direction carries stubble smoke toward Delhi.
    Punjab is NW of Delhi; north-westerly winds (approx 270° to 345°) blow
    south-east directly into the Delhi/NCR airshed.
    """
    if direction_deg is None:
        return False
    if state_or_city.lower() == "punjab":
        return 270 <= direction_deg <= 345
    # For Delhi local wind, calm or slow easterly winds trap particulate matter
    return False


def get_seed_locations() -> list[dict[str, Any]]:
    """
    Load Punjab and Delhi coordinates from data/seed JSON files,
    falling back to static seed data if files are unavailable.
    """
    locations: list[dict[str, Any]] = []

    # Attempt to locate data/seed directory relative to workspace or file
    potential_roots = [
        Path.cwd() / "data" / "seed",
        Path(__file__).resolve().parents[2] / "data" / "seed",
        Path("/var/task/data/seed"),
    ]

    villages_file: Path | None = None
    wards_file: Path | None = None
    for seed_dir in potential_roots:
        v_path = seed_dir / "villages.json"
        w_path = seed_dir / "wards.json"
        if v_path.exists() and w_path.exists():
            villages_file = v_path
            wards_file = w_path
            break

    # 1. Villages (all in data/seed)
    if villages_file and villages_file.exists():
        try:
            with open(villages_file, "r", encoding="utf-8") as f:
                villages = json.load(f)
                for v in villages:
                    locations.append({
                        "id": v["village_id"],
                        "name": v["name"],
                        "district": v.get("district", ""),
                        "state": v.get("state", "Punjab"),
                        "lat": float(v["lat"]),
                        "lng": float(v["lng"]),
                        "type": "village",
                    })
        except Exception as exc:
            logger.warning("Could not parse villages.json: %s. Using default list.", exc)

    if not any(loc.get("type") == "village" for loc in locations):
        locations.extend([dict(loc, type="village") for loc in DEFAULT_PUNJAB_LOCATIONS])

    # 2. Wards (all in data/seed)
    if wards_file and wards_file.exists():
        try:
            with open(wards_file, "r", encoding="utf-8") as f:
                wards = json.load(f)
                for w in wards:
                    locations.append({
                        "id": w["ward_id"],
                        "name": w["name"],
                        "district": w.get("zone", ""),
                        "city": w.get("city", "Delhi"),
                        "lat": float(w["lat"]),
                        "lng": float(w["lng"]),
                        "type": "ward",
                    })
        except Exception as exc:
            logger.warning("Could not parse wards.json: %s. Using default list.", exc)

    if not any(loc.get("type") == "ward" for loc in locations):
        locations.extend([dict(loc, type="ward") for loc in DEFAULT_DELHI_LOCATIONS])

    return locations


# Standard interface: get_locations
get_locations = get_seed_locations


def http_get_json(
    url: str,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
    backoff_base: float = DEFAULT_BACKOFF_BASE,
) -> dict[str, Any]:
    """
    Fetch JSON from URL with timeout and exponential backoff retry.
    Uses only standard library urllib.
    """
    last_exc: Exception | None = None
    # retries parameter represents number of retries after initial attempt
    total_attempts = retries + 1

    for attempt in range(total_attempts):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Saans-Ingest/1.0",
                    "Accept": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                content = response.read().decode("utf-8")
                return json.loads(content)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            last_exc = exc
            if attempt < total_attempts - 1:
                sleep_sec = backoff_base * (2 ** attempt)
                logger.warning(
                    "Request to %s failed (attempt %d/%d): %s. Retrying in %.2fs...",
                    url,
                    attempt + 1,
                    total_attempts,
                    exc,
                    sleep_sec,
                )
                time.sleep(sleep_sec)

    if last_exc:
        raise last_exc
    raise RuntimeError(f"Failed to fetch {url} after {total_attempts} attempts.")


def fetch_forecast_and_wind(
    lat: float,
    lng: float,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
    backoff_base: float = DEFAULT_BACKOFF_BASE,
) -> dict[str, Any]:
    """
    Fetch 7-day weather and wind forecast from Open-Meteo for given coordinates.
    """
    params = {
        "latitude": f"{lat:.4f}",
        "longitude": f"{lng:.4f}",
        "current": (
            "temperature_2m,"
            "apparent_temperature,"
            "relative_humidity_2m,"
            "weather_code,"
            "wind_speed_10m,"
            "wind_direction_10m"
        ),
        "daily": (
            "weather_code,"
            "temperature_2m_max,"
            "temperature_2m_min,"
            "precipitation_sum,"
            "precipitation_probability_max,"
            "wind_speed_10m_max,"
            "wind_direction_10m_dominant,"
            "uv_index_max,"
            "sunset"
        ),
        "hourly": "visibility",
        "forecast_days": "7",
        "timezone": "Asia/Kolkata",
    }
    url = f"{API_ENDPOINT}?{urllib.parse.urlencode(params)}"
    return http_get_json(url, timeout=timeout, retries=retries, backoff_base=backoff_base)


def parse_weather_response(location: dict[str, Any], api_data: dict[str, Any]) -> dict[str, Any]:
    """
    Parse raw Open-Meteo daily response into a standardized forecast and wind structure.
    """
    daily = api_data.get("daily", {})
    times = daily.get("time", [])
    weather_codes = daily.get("weather_code", [])
    temp_max = daily.get("temperature_2m_max", [])
    temp_min = daily.get("temperature_2m_min", [])
    precip_sum = daily.get("precipitation_sum", [])
    precip_prob = daily.get("precipitation_probability_max", [])
    wind_speeds = daily.get("wind_speed_10m_max", [])
    wind_dirs = daily.get("wind_direction_10m_dominant", [])
    uv_max = daily.get("uv_index_max", [])
    sunsets = daily.get("sunset", [])

    region_name = location.get("state") or location.get("city", "")

    forecast_list: list[dict[str, Any]] = []
    for i, date_str in enumerate(times):
        w_code = weather_codes[i] if i < len(weather_codes) else None
        w_dir = wind_dirs[i] if i < len(wind_dirs) else None
        p_prob = float(precip_prob[i]) if i < len(precip_prob) and precip_prob[i] is not None else 0.0
        uv_val = float(uv_max[i]) if i < len(uv_max) and uv_max[i] is not None else 0.0
        sunset_val = sunsets[i] if i < len(sunsets) else None

        forecast_list.append({
            "date": date_str,
            "temp_max_c": float(temp_max[i]) if i < len(temp_max) and temp_max[i] is not None else 0.0,
            "temp_min_c": float(temp_min[i]) if i < len(temp_min) and temp_min[i] is not None else 0.0,
            "precipitation_sum_mm": float(precip_sum[i]) if i < len(precip_sum) and precip_sum[i] is not None else 0.0,
            "rain_prob_pct": p_prob,
            "precipitation_probability_max": p_prob,
            "uv_index_max": uv_val,
            "sunset": sunset_val,
            "wind_speed_kmh": float(wind_speeds[i]) if i < len(wind_speeds) and wind_speeds[i] is not None else 0.0,
            "wind_direction_deg": int(w_dir) if w_dir is not None else 0,
            "carries_toward_city": is_wind_carrying_toward_delhi(w_dir, region_name),
            "condition": map_wmo_code_to_condition(w_code),
            "weather_code": int(w_code) if w_code is not None else 0,
        })

    today_forecast = forecast_list[0] if forecast_list else {}

    raw_curr = api_data.get("current", {})
    curr_weather_code = int(raw_curr.get("weather_code", today_forecast.get("weather_code", 0)))
    curr_speed = float(raw_curr.get("wind_speed_10m", today_forecast.get("wind_speed_kmh", 0.0)))
    curr_dir = int(raw_curr.get("wind_direction_10m", today_forecast.get("wind_direction_deg", 0)))

    current_data = {
        "temperature_c": float(raw_curr.get("temperature_2m", today_forecast.get("temp_max_c", 0.0))),
        "apparent_temperature_c": float(raw_curr.get("apparent_temperature", raw_curr.get("temperature_2m", today_forecast.get("temp_max_c", 0.0)))),
        "relative_humidity_pct": int(raw_curr.get("relative_humidity_2m", 0)),
        "weather_code": curr_weather_code,
        "wind_speed_kmh": curr_speed,
        "wind_direction_deg": curr_dir,
        "condition": map_wmo_code_to_condition(curr_weather_code),
    }

    hourly_data = {}
    if "hourly" in api_data and "visibility" in api_data["hourly"]:
        hourly_data["visibility"] = api_data["hourly"]["visibility"]

    return {
        "id": location.get("id"),
        "name": location.get("name"),
        "district": location.get("district"),
        "region": region_name,
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "type": location.get("type", "village"),
        "forecast_days": len(forecast_list),
        "forecast": forecast_list,
        "current": current_data,
        "hourly": hourly_data,
        "wind_summary": {
            "current_speed_kmh": curr_speed,
            "current_direction_deg": curr_dir,
            "carries_toward_city": today_forecast.get("carries_toward_city", False),
        },
        "elevation": api_data.get("elevation", 0.0),
        "timezone": api_data.get("timezone", "Asia/Kolkata"),
        "raw": api_data,
    }


def fetch_location(
    location: dict[str, Any],
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
) -> dict[str, Any]:
    """
    Fetch weather and wind forecast for a single location.
    """
    lat = float(location["lat"])
    lng = float(location["lng"])
    raw_data = fetch_forecast_and_wind(lat, lng, timeout=timeout, retries=retries)
    return parse_weather_response(location, raw_data)


def fetch_data(
    locations: list[dict[str, Any]] | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
) -> list[dict[str, Any]]:
    """
    Fetch 7-day forecast and wind data for Punjab and Delhi locations.

    Args:
        locations: Optional list of location dicts. If omitted, uses seed locations.
        timeout: HTTP request timeout in seconds (default: 5.0)
        retries: Number of retries with exponential backoff (default: 3)

    Returns:
        List of parsed location weather forecast dicts.
    """
    target_locations = locations if locations is not None else get_seed_locations()
    results: list[dict[str, Any]] = []

    for loc in target_locations:
        try:
            parsed = fetch_location(loc, timeout=timeout, retries=retries)
            results.append(parsed)
        except Exception as exc:
            logger.error("Failed to fetch Open-Meteo weather for %s (%s): %s", loc.get("name"), loc.get("id"), exc)

    return results


# Standard interface alias
fetch_weather = fetch_data


def ingest(cache_func=None) -> dict[str, Any]:
    """
    Execute weather ingestion and store to cache.
    """
    try:
        from ingest.cache import cache_to_dynamo
    except (ImportError, ModuleNotFoundError):
        try:
            from ingest.cache import cache_to_dynamo  # type: ignore
        except (ImportError, ModuleNotFoundError):
            from cache import cache_to_dynamo  # type: ignore

    store_fn = cache_func or cache_to_dynamo
    weather_data = fetch_data()

    for item in weather_data:
        store_fn(
            source=SOURCE_NAME,
            key=str(item["id"]),
            payload=item,
            ttl_hours=12,
        )

    # Store aggregated collection
    store_fn(
        source=SOURCE_NAME,
        key="all",
        payload=weather_data,
        ttl_hours=12,
    )

    return {
        "source": SOURCE_NAME,
        "status": "success",
        "locations_updated": len(weather_data),
        "data": weather_data,
    }


def handler(event, context) -> dict[str, Any]:
    """Standalone Lambda handler for Open-Meteo ingestion."""
    res = ingest()
    return {
        "statusCode": 200,
        "body": json.dumps({
            "ok": True,
            "source": res["source"],
            "locations_updated": res["locations_updated"],
            "time": datetime.now(timezone.utc).isoformat(),
        }),
    }
