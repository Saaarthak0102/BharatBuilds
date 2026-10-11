import time
import os
import json
import math
from pathlib import Path
from boto3.dynamodb.conditions import Key
import boto3
import contextvars
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, ValidationError
try:
    from strands.tools import tool
except ImportError:
    try:
        from strands import tool
    except ImportError:
        def tool(func=None, **kwargs):
            if func is None:
                return lambda f: f
            return func
from ingest import cache
from api.common.time import today_ist, now_ist
from agents.planner.scoring import get_sowing_window_for_stage

# Optional runtime check logic via contextvars
planner_runner_var = contextvars.ContextVar("planner_runner", default=None)
planner_trace_var = contextvars.ContextVar("planner_trace", default=None)
planner_payloads_var = contextvars.ContextVar("planner_payloads", default={})

def _record_trace(name: str, summary: str, ok: bool, freshness: str, is_sample: bool, latency_ms: int, payload: dict = None):
    runner = planner_runner_var.get()
    if runner:
        runner.check_limits()
    
    trace = planner_trace_var.get()
    if trace is not None:
        trace.append({
            "tool": name,
            "input": summary,
            "status": "ok" if ok else "error",
            "freshness": freshness,
            "is_sample": is_sample,
            "latency_ms": latency_ms
        })
        
    if payload is not None:
        payloads = planner_payloads_var.get()
        if payloads is not None:
            payloads[name] = payload

def _get_table(table_name: str):
    region = os.environ.get("AWS_REGION", "ap-south-1")
    return boto3.resource("dynamodb", region_name=region).Table(table_name)

def _load_village_map() -> dict[str, str]:
    potential_roots = [
        Path.cwd() / "data" / "seed" / "villages.json",
        Path(__file__).resolve().parents[3] / "data" / "seed" / "villages.json",
        Path("/var/task/data/seed/villages.json"),
    ]
    for p in potential_roots:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    v_list = json.load(f)
                    return {v["village_id"]: v["district"] for v in v_list if "village_id" in v and "district" in v}
            except Exception:
                pass
    return {
        "village-patiala-001": "Patiala",
        "village-patiala-002": "Patiala",
        "village-ludhiana-001": "Ludhiana",
        "village-ludhiana-002": "Ludhiana",
        "village-sangrur-001": "Sangrur",
        "village-sangrur-002": "Sangrur",
        "village-karnal-001": "Karnal",
        "village-karnal-002": "Karnal",
    }

VILLAGE_DISTRICT_MAP = _load_village_map()

def resolve_district_from_village_or_name(input_str: str) -> str:
    cleaned = input_str.strip().lower()
    for v_id, dist in VILLAGE_DISTRICT_MAP.items():
        if v_id in cleaned or cleaned in v_id:
            return dist.lower()
    cleaned = cleaned.replace("district-", "").replace("-district", "")
    return cleaned

def _load_village_coords() -> dict[str, tuple[float, float]]:
    potential_roots = [
        Path.cwd() / "data" / "seed" / "villages.json",
        Path(__file__).resolve().parents[3] / "data" / "seed" / "villages.json",
        Path("/var/task/data/seed/villages.json"),
    ]
    for p in potential_roots:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    v_list = json.load(f)
                    return {v["village_id"]: (float(v["lat"]), float(v["lng"])) for v in v_list if "village_id" in v and "lat" in v and "lng" in v}
            except Exception:
                pass
    return {
        "village-patiala-001": (30.48, 76.59),
        "village-patiala-002": (30.37, 76.15),
        "village-ludhiana-001": (30.70, 76.22),
        "village-ludhiana-002": (30.79, 75.47),
        "village-sangrur-001": (30.53, 75.88),
        "village-sangrur-002": (30.38, 75.55),
        "village-karnal-001": (29.69, 76.99),
        "village-karnal-002": (29.84, 76.93),
    }

VILLAGE_COORDS_MAP = _load_village_coords()

DISTRICT_CENTROIDS = {
    "patiala": (30.42, 76.37),
    "ludhiana": (30.75, 75.84),
    "sangrur": (30.45, 75.71),
    "karnal": (29.76, 76.96),
}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def _load_all_straw_outlets() -> list[dict]:
    potential_roots = [
        Path.cwd() / "data" / "seed" / "straw_outlets.json",
        Path(__file__).resolve().parents[3] / "data" / "seed" / "straw_outlets.json",
        Path("/var/task/data/seed/straw_outlets.json"),
    ]
    for p in potential_roots:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return []

class ForecastArgs(BaseModel):
    location: str = Field(description="Village or district name / geohash")
    days: int = Field(default=7, description="Number of days to forecast")

@tool
def get_forecast(location: str, days: int = 7) -> str:
    """Get weather forecast for a location."""
    start_t = time.time()
    try:
        args = ForecastArgs(location=location, days=days)
    except ValidationError as e:
        _record_trace("get_forecast", location, False, "error", False, int((time.time() - start_t)*1000))
        return f"Error: Invalid arguments: {e}"

    today = today_ist()
    req_dates = [(today + timedelta(days=i)).isoformat() for i in range(args.days)]
    seed_data = {
        "location": location,
        "forecasts": [
            {
                "date": req_dates[i],
                "temp_max_c": 32.0,
                "precipitation_sum": 0.0,
                "wind_speed_10m_max": 5.0,
                "carries_toward_city": False,
            }
            for i in range(args.days)
        ],
    }

    live = cache.get_cached("open_meteo", args.location, allow_expired=False)
    stale = None if live else cache.get_last_good("open_meteo", args.location)
    cached_entry = live or stale

    payload = seed_data
    freshness = "seeded"
    is_sample = True

    if cached_entry:
        raw_payload = cached_entry["payload"]
        forecast_items = raw_payload.get("forecast") or raw_payload.get("forecasts") or []
        today_str = today.isoformat()
        # Drop past dates
        valid_items = [f for f in forecast_items if f.get("date") and f.get("date") >= today_str]
        valid_dates = {f.get("date") for f in valid_items}
        # Check if cached forecast covers the window
        if all(d in valid_dates for d in req_dates):
            payload = {"location": location, "forecasts": valid_items}
            freshness = "live" if live else "stale"
            is_sample = False
        else:
            freshness = "stale"
            is_sample = True
            payload = seed_data

    _record_trace("get_forecast", args.location, True, freshness, is_sample, int((time.time() - start_t)*1000), payload=payload)
    return payload if isinstance(payload, str) else json.dumps(payload)


class WindArgs(BaseModel):
    location: str = Field(description="Village or district name / geohash")
    days: int = Field(default=7, description="Number of days")

@tool
def get_wind(location: str, days: int = 7) -> str:
    """Get wind speed and direction forecast for a location."""
    start_t = time.time()
    try:
        args = WindArgs(location=location, days=days)
    except ValidationError as e:
        _record_trace("get_wind", location, False, "error", False, int((time.time() - start_t)*1000))
        return f"Error: {e}"

    today = today_ist()
    req_dates = [(today + timedelta(days=i)).isoformat() for i in range(args.days)]
    seed_data = {
        "location": location,
        "wind_data": [
            {
                "date": req_dates[i],
                "speed_kmh": 5.0,
                "direction_deg": 90,
                "carries_toward_city": False,
            }
            for i in range(args.days)
        ],
    }

    live = cache.get_cached("open_meteo", args.location, allow_expired=False)
    stale = None if live else cache.get_last_good("open_meteo", args.location)
    cached_entry = live or stale

    payload = seed_data
    freshness = "seeded"
    is_sample = True

    if cached_entry:
        raw_payload = cached_entry["payload"]
        wind_items = raw_payload.get("wind_data") or []
        today_str = today.isoformat()
        valid_items = [w for w in wind_items if w.get("date") and w.get("date") >= today_str]
        valid_dates = {w.get("date") for w in valid_items}
        if all(d in valid_dates for d in req_dates):
            payload = {"location": location, "wind_data": valid_items}
            freshness = "live" if live else "stale"
            is_sample = False
        else:
            freshness = "stale"
            is_sample = True
            payload = seed_data

    _record_trace("get_wind", args.location, True, freshness, is_sample, int((time.time() - start_t)*1000), payload=payload)
    return payload if isinstance(payload, str) else json.dumps(payload)


class FireArgs(BaseModel):
    district: str = Field(description="District identifier")

@tool
def get_fire_hotspots(district: str) -> str:
    """Get active fire hotspots in a district from FIRMS."""
    start_t = time.time()
    try:
        args = FireArgs(district=district)
    except ValidationError as e:
        _record_trace("get_fire_hotspots", district, False, "error", False, int((time.time() - start_t)*1000))
        return f"Error: {e}"

    district_clean = resolve_district_from_village_or_name(args.district)
    firms_key = f"district-{district_clean}"

    seed_data = {
        "district": firms_key,
        "hotspot_count": 0,
        "hotspots": [],
        "fetched_at": now_ist().isoformat()
    }

    live = cache.get_cached("firms", firms_key, allow_expired=False)
    if live:
        payload, freshness, is_sample = live["payload"], "live", False
    else:
        stale = cache.get_last_good("firms", firms_key)
        if stale:
            payload, freshness, is_sample = stale["payload"], "stale", False
        else:
            payload, freshness, is_sample = seed_data, "seeded", True

    _record_trace("get_fire_hotspots", firms_key, True, freshness, is_sample, int((time.time() - start_t)*1000), payload=payload)
    return payload if isinstance(payload, str) else json.dumps(payload)


class SowingArgs(BaseModel):
    crop_stage: str = Field(description="Crop stage: harvested, partially_cleared, or standing")

@tool
def get_sowing_window(crop_stage: str) -> str:
    """Get the recommended sowing window for the next crop based on current stage."""
    start_t = time.time()
    try:
        args = SowingArgs(crop_stage=crop_stage)
    except ValidationError as e:
        _record_trace("get_sowing_window", crop_stage, False, "error", False, int((time.time() - start_t)*1000))
        return f"Error: {e}"

    sw_start, sw_end, status = get_sowing_window_for_stage(args.crop_stage)
    payload = {
        "crop_stage": args.crop_stage,
        "window_start": sw_start,
        "window_end": sw_end,
        "sowing_window_status": status,
        "source": "TO_VERIFY",
        "notes": "Optimal window based on PAU sample guidance."
    }

    _record_trace("get_sowing_window", args.crop_stage, True, "live", True, int((time.time() - start_t)*1000), payload=payload)
    return json.dumps(payload)


class MachineArgs(BaseModel):
    village_id: str = Field(description="Village identifier")
    start_date: str = Field(description="Start date YYYY-MM-DD")
    end_date: str = Field(description="End date YYYY-MM-DD")

@tool
def find_machine_slots(village_id: str, start_date: str, end_date: str) -> str:
    """Find available machine slots (Happy Seeder, rotavator, etc.) near a village."""
    start_t = time.time()
    try:
        args = MachineArgs(village_id=village_id, start_date=start_date, end_date=end_date)
    except ValidationError as e:
        _record_trace("find_machine_slots", village_id, False, "error", False, int((time.time() - start_t)*1000))
        return f"Error: {e}"

    table = _get_table(os.environ.get("MACHINE_SLOTS_TABLE", "saans-machine-slots-dev"))

    try:
        response = table.query(
            KeyConditionExpression=Key("village_id").eq(args.village_id) & Key("date").between(args.start_date, args.end_date)
        )
        slots = cache._from_decimal(response.get("Items", []))
        payload = {"village_id": args.village_id, "slots": slots}
        freshness = "live"
        is_sample = all(s.get("is_sample", False) for s in slots) if slots else True
        ok = True
    except Exception as e:
        payload = {"error": str(e), "slots": []}
        freshness = "error"
        is_sample = True
        ok = False

    _record_trace("find_machine_slots", f"{args.village_id} {args.start_date}", ok, freshness, is_sample, int((time.time() - start_t)*1000), payload=payload)
    return json.dumps(payload, default=str)


class StrawArgs(BaseModel):
    district_id: str = Field(description="District or village identifier")

@tool
def find_straw_outlets(district_id: str) -> str:
    """Find nearby straw outlets with deterministic ranking by distance, residue match, and pickup support."""
    start_t = time.time()
    try:
        args = StrawArgs(district_id=district_id)
    except ValidationError as e:
        _record_trace("find_straw_outlets", district_id, False, "error", False, int((time.time() - start_t)*1000))
        return f"Error: {e}"

    norm_input = args.district_id.strip().lower()
    norm_district_id = resolve_district_from_village_or_name(norm_input)

    # Determine reference coordinates for distance ranking
    ref_coords = None
    for v_id, coords in VILLAGE_COORDS_MAP.items():
        if v_id in norm_input or norm_input in v_id:
            ref_coords = coords
            break
    if not ref_coords:
        ref_coords = DISTRICT_CENTROIDS.get(norm_district_id, (30.4, 76.2))

    # Retrieve straw outlets from DynamoDB or seed
    table = _get_table(os.environ.get("STRAW_OUTLETS_TABLE", "saans-straw-outlets-dev"))
    raw_outlets = []
    try:
        response = table.scan()
        raw_outlets = cache._from_decimal(response.get("Items", []))
    except Exception:
        pass

    if not raw_outlets:
        raw_outlets = _load_all_straw_outlets()

    total_outlets = len(raw_outlets)
    unique_districts = len(set(str(o.get("district_id", "")).lower() for o in raw_outlets))

    ranked_outlets = []
    for o in raw_outlets:
        o_lat = float(o["lat"]) if "lat" in o and o["lat"] is not None else ref_coords[0]
        o_lng = float(o["lng"]) if "lng" in o and o["lng"] is not None else ref_coords[1]
        dist_km = haversine_km(ref_coords[0], ref_coords[1], o_lat, o_lng)

        accepts = o.get("accepts", ["paddy_straw"])
        if isinstance(accepts, str):
            accepts = [accepts]
        residue_match = 1 if ("paddy_straw" in accepts or "all" in accepts) else 0

        pickup = str(o.get("pickup_support", "unknown")).lower()
        pickup_score = 2 if pickup == "yes" else (1 if pickup == "unknown" else 0)

        reasons = [f"~{round(dist_km)} km away"]
        if residue_match:
            reasons.append("accepts paddy straw")
        if pickup == "yes":
            reasons.append("pickup support available")
        elif pickup == "unknown":
            reasons.append("pickup unverified")

        ranked_outlets.append({
            "outlet_id": o.get("outlet_id", ""),
            "district_id": str(o.get("district_id", "")).lower(),
            "facility_type": o.get("facility_type", "depot"),
            "name": o.get("name", "Unknown"),
            "lat": o_lat,
            "lng": o_lng,
            "distance_km": round(dist_km, 1),
            "accepts": accepts,
            "pickup_support": pickup,
            "contact_hint": o.get("contact_hint", "Contact your nearest depot or aggregator"),
            "ranking_reason": " • ".join(reasons),
            "is_sample": bool(o.get("is_sample", True)),
            "_sort_key": (-residue_match, round(dist_km, 1), -pickup_score)
        })

    # Sort deterministically
    ranked_outlets.sort(key=lambda x: x["_sort_key"])
    top_3 = ranked_outlets[:3]
    for it in top_3:
        it.pop("_sort_key", None)

    payload = {
        "district_id": norm_district_id,
        "total_checked": total_outlets,
        "districts_checked": unique_districts,
        "top_3": top_3,
        "outlets": top_3,
        "note": "Sample data. Contact your nearest depot or aggregator."
    }

    trace_msg = f"checked {total_outlets} outlets in {unique_districts} districts, top 3 ranked by distance and residue match"
    _record_trace("find_straw_outlets", trace_msg, True, "live", True, int((time.time() - start_t)*1000), payload=payload)
    return json.dumps(payload, default=str)
