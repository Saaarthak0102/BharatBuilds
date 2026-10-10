import urllib.request
import json
import csv
import io
import os
import boto3
import logging
import time
from datetime import datetime, timezone
from typing import Any
import urllib.error

logger = logging.getLogger(__name__)

SOURCE_NAME = "firms"
DEFAULT_TIMEOUT_SECONDS = 10.0
DEFAULT_RETRIES = 3

TARGET_DISTRICTS = [
    {"id": "district-patiala", "name": "Patiala", "state": "Punjab", "lat": 30.34, "lng": 76.38},
    {"id": "district-ludhiana", "name": "Ludhiana", "state": "Punjab", "lat": 30.90, "lng": 75.85},
    {"id": "district-sangrur", "name": "Sangrur", "state": "Punjab", "lat": 30.25, "lng": 75.84},
    {"id": "district-karnal", "name": "Karnal", "state": "Haryana", "lat": 29.69, "lng": 76.99},
]

_api_key: str | None = None

def get_api_key() -> str | None:
    global _api_key
    if _api_key is not None:
        return _api_key
    param_name = os.environ.get("FIRMS_API_KEY_PARAM")
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
    return [dict(d) for d in TARGET_DISTRICTS]

def assign_district(fire_lat: float, fire_lon: float) -> str:
    best_dist = float('inf')
    best_id = "unknown"
    for d in TARGET_DISTRICTS:
        dist = (fire_lat - d["lat"])**2 + (fire_lon - d["lng"])**2
        if dist < best_dist:
            best_dist = dist
            best_id = d["id"]
    return best_id

def get_sample_data(location, now_iso):
    return {
        "id": location.get("id"),
        "name": location.get("name"),
        "district": location.get("name"),
        "state": location.get("state"),
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "hotspot_count": 12,
        "hotspots": [
            {"lat": location.get("lat") + 0.01, "lng": location.get("lng") + 0.01, "frp": 15.5, "confidence": "n", "acq_date": now_iso.split('T')[0], "acq_time": "1200"}
        ],
        "fetched_at": now_iso,
        "is_sample": True
    }

def fetch_data(locations: list[dict[str, Any]] | None = None, timeout: float = DEFAULT_TIMEOUT_SECONDS, retries: int = DEFAULT_RETRIES) -> list[dict[str, Any]]:
    target_locations = locations if locations is not None else get_locations()
    api_key = get_api_key()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    if not api_key:
        logger.warning("No FIRMS API key found. Using sample data.")
        return [get_sample_data(loc, now_iso) for loc in target_locations]
        
    try:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/VIIRS_SNPP_NRT/73.0,27.0,78.0,33.0/2"
        last_exc = None
        content = ""
        for attempt in range(retries + 1):
            try:
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=timeout) as res:
                    content = res.read().decode('utf-8')
                    break
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_exc = exc
                if attempt < retries:
                    time.sleep(0.5 * (2 ** attempt))
        else:
            if last_exc:
                raise last_exc
            raise RuntimeError("Failed to fetch FIRMS data")
            
        reader = csv.DictReader(io.StringIO(content))
        points = []
        for row in reader:
            try:
                lat = float(row["latitude"])
                lng = float(row["longitude"])
                frp = float(row["frp"])
                confidence = row.get("confidence", "")
                acq_date = row.get("acq_date", "")
                acq_time = row.get("acq_time", "")
                points.append({
                    "lat": lat,
                    "lng": lng,
                    "frp": frp,
                    "confidence": confidence,
                    "acq_date": acq_date,
                    "acq_time": acq_time,
                })
            except (KeyError, ValueError):
                continue
                
        points.sort(key=lambda x: x["frp"], reverse=True)
        top_points = points[:500]
        
        results_by_id = {loc["id"]: {"count": 0, "hotspots": []} for loc in target_locations}
        
        # Distribute top 500 points
        for p in top_points:
            dist_id = assign_district(p["lat"], p["lng"])
            if dist_id in results_by_id:
                results_by_id[dist_id]["hotspots"].append(p)
                
        # Count all points for per-district counts (not just top 500)
        for p in points:
            dist_id = assign_district(p["lat"], p["lng"])
            if dist_id in results_by_id:
                results_by_id[dist_id]["count"] += 1
                
        results = []
        for loc in target_locations:
            r = dict(loc)
            r["district"] = loc.get("name")
            r["hotspot_count"] = results_by_id[loc["id"]]["count"]
            r["hotspots"] = results_by_id[loc["id"]]["hotspots"]
            r["fetched_at"] = now_iso
            r["is_sample"] = False
            results.append(r)
            
        return results
        
    except Exception as exc:
        logger.error(f"Error fetching FIRMS data: {exc}")
        raise exc

fetch_hotspots = fetch_data

def ingest(cache_func=None) -> dict[str, Any]:
    try:
        from ingest.cache import cache_to_dynamo
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
