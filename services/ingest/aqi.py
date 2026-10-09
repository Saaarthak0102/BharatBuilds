import urllib.request
import json
import urllib.parse
import os
import boto3
import logging
import time
from datetime import datetime, timezone
from typing import Any
import urllib.error

logger = logging.getLogger(__name__)

SOURCE_NAME = "aqi"
DEFAULT_TIMEOUT_SECONDS = 5.0
DEFAULT_RETRIES = 3

_api_key: str | None = None

def get_api_key() -> str | None:
    global _api_key
    if _api_key is not None:
        return _api_key
    param_name = os.environ.get("OPENAQ_API_KEY_PARAM")
    if not param_name:
        return None
    try:
        ssm = boto3.client("ssm", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
        res = ssm.get_parameter(Name=param_name, WithDecryption=True)
        _api_key = res["Parameter"]["Value"]
        return _api_key
    except Exception as exc:
        logger.warning(f"Failed to fetch {param_name}: {exc}")
        return None

def get_locations() -> list[dict[str, Any]]:
    locations = []
    try:
        with open("d:/BharatBuilds/data/seed/wards.json", "r", encoding="utf-8") as f:
            wards = json.load(f)
            for w in wards:
                if w.get("city", "").lower() in ["delhi", "noida", "gurugram", "ghaziabad", "faridabad"]:
                    locations.append({
                        "id": w["ward_id"],
                        "name": w["name"],
                        "station_name": w["name"],
                        "city": w.get("city", "Delhi"),
                        "lat": float(w["lat"]),
                        "lng": float(w["lng"])
                    })
    except Exception as exc:
        logger.warning(f"Could not load wards.json: {exc}")
    return locations

def calc_subindex(c, breakpoints):
    if c is None or c < 0:
        return 0, "Unknown"
    for blo, bhi, ilo, ihi, cat in breakpoints:
        if blo <= c <= bhi:
            sub = ((ihi - ilo) / (bhi - blo)) * (c - blo) + ilo
            return round(sub), cat
    if c > breakpoints[-1][1]:
        return breakpoints[-1][3], breakpoints[-1][4]
    return 0, "Unknown"

PM25_BP = [
    (0, 30, 0, 50, "Good"),
    (30.0001, 60, 51, 100, "Satisfactory"),
    (60.0001, 90, 101, 200, "Moderate"),
    (90.0001, 120, 201, 300, "Poor"),
    (120.0001, 250, 301, 400, "Very Poor"),
    (250.0001, 9999, 401, 500, "Severe")
]

PM10_BP = [
    (0, 50, 0, 50, "Good"),
    (50.0001, 100, 51, 100, "Satisfactory"),
    (100.0001, 250, 101, 200, "Moderate"),
    (250.0001, 350, 201, 300, "Poor"),
    (350.0001, 430, 301, 400, "Very Poor"),
    (430.0001, 9999, 401, 500, "Severe")
]

def calculate_naqi(pm25: float, pm10: float):
    pm25_idx, pm25_cat = calc_subindex(pm25, PM25_BP)
    pm10_idx, pm10_cat = calc_subindex(pm10, PM10_BP)
    if pm25_idx >= pm10_idx:
        return pm25_idx, pm25_cat
    else:
        return pm10_idx, pm10_cat

def http_get_json(url: str, api_key: str | None, timeout: float, retries: int, backoff_base: float = 0.5) -> dict[str, Any]:
    last_exc = None
    for attempt in range(retries + 1):
        try:
            headers = {"Accept": "application/json"}
            if api_key:
                headers["X-API-Key"] = api_key
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            last_exc = exc
            if attempt < retries:
                time.sleep(backoff_base * (2 ** attempt))
    if last_exc:
        raise last_exc
    raise RuntimeError("Failed to fetch")

def get_sample_data(location, now_iso):
    return {
        "id": location.get("id"),
        "name": location.get("name"),
        "station_name": location.get("name"),
        "city": location.get("city", "Delhi"),
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "aqi": 150,
        "pm25": 65.0,
        "pm10": 120.0,
        "category": "Moderate",
        "fetched_at": now_iso,
        "is_sample": True
    }

def fetch_location(location: dict[str, Any], timeout: float = DEFAULT_TIMEOUT_SECONDS, retries: int = DEFAULT_RETRIES) -> dict[str, Any]:
    api_key = get_api_key()
    now_iso = datetime.now(timezone.utc).isoformat()
    if not api_key:
        logger.warning("No OpenAQ API key found. Using sample data.")
        return get_sample_data(location, now_iso)

    try:
        lat = location["lat"]
        lng = location["lng"]
        url_loc = f"https://api.openaq.org/v3/locations?coordinates={lat},{lng}&radius=5000&limit=1"
        loc_res = http_get_json(url_loc, api_key, timeout, retries)
        
        if not loc_res.get("results"):
            logger.warning(f"No OpenAQ location found near {lat}, {lng}. Using sample data.")
            return get_sample_data(location, now_iso)
            
        loc_id = loc_res["results"][0]["id"]
        url_latest = f"https://api.openaq.org/v3/locations/{loc_id}/latest"
        latest_res = http_get_json(url_latest, api_key, timeout, retries)
        
        pm25 = 0.0
        pm10 = 0.0
        for p in latest_res.get("results", []):
            param = p.get("parameter", {}).get("name", "").lower()
            val = float(p.get("value", 0.0))
            if param == "pm25":
                pm25 = val
            elif param == "pm10":
                pm10 = val
                
        if pm25 == 0.0 and pm10 == 0.0:
            logger.warning(f"No PM2.5 or PM10 data for location {loc_id}. Using sample data.")
            return get_sample_data(location, now_iso)
            
        aqi_val, aqi_cat = calculate_naqi(pm25, pm10)
        
        return {
            "id": location.get("id"),
            "name": location.get("name"),
            "station_name": loc_res["results"][0].get("name", location.get("name")),
            "city": location.get("city", "Delhi"),
            "lat": location.get("lat"),
            "lng": location.get("lng"),
            "aqi": aqi_val,
            "pm25": pm25,
            "pm10": pm10,
            "category": aqi_cat,
            "fetched_at": now_iso,
            "is_sample": False
        }
    except Exception as exc:
        logger.error(f"Error fetching OpenAQ data for {location['name']}: {exc}")
        raise exc # Let the handler catch it and fallback to cache

def fetch_data(locations: list[dict[str, Any]] | None = None, timeout: float = DEFAULT_TIMEOUT_SECONDS, retries: int = DEFAULT_RETRIES) -> list[dict[str, Any]]:
    target_locations = locations if locations is not None else get_locations()
    results = []
    for loc in target_locations:
        try:
            results.append(fetch_location(loc, timeout=timeout, retries=retries))
        except Exception as exc:
            logger.error(f"fetch_location failed for {loc['name']}: {exc}")
            raise exc
    return results

fetch_aqi = fetch_data

def ingest(cache_func=None) -> dict[str, Any]:
    try:
        from services.ingest.cache import cache_to_dynamo
    except (ImportError, ModuleNotFoundError):
        try:
            from ingest.cache import cache_to_dynamo
        except (ImportError, ModuleNotFoundError):
            from cache import cache_to_dynamo

    store_fn = cache_func or cache_to_dynamo
    data = fetch_data()
    for item in data:
        store_fn(source=SOURCE_NAME, key=str(item["id"]), payload=item, ttl_hours=6)
    if data:
        store_fn(source=SOURCE_NAME, key="all", payload=data, ttl_hours=6)
    
    return {
        "source": SOURCE_NAME,
        "status": "success",
        "locations_updated": len(data),
        "data": data,
    }

def handler(event, context) -> dict[str, Any]:
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
