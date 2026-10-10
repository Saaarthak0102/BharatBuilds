import time
import os
from boto3.dynamodb.conditions import Key
import boto3
import contextvars
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ValidationError

from strands.tools import tool
from ingest import cache

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

    seed_data = {
        "location": location,
        "forecasts": [
            {"date": "2026-10-09", "temp_max_c": 32.0, "precipitation_sum": 0.0, "wind_speed_10m_max": 5.0, "carries_toward_city": False}
        ] * args.days
    }
    
    live = cache.get_cached("open_meteo", args.location, allow_expired=False)
    if live:
        payload, freshness, is_sample = live["payload"], "live", False
    else:
        stale = cache.get_last_good("open_meteo", args.location)
        if stale:
            payload, freshness, is_sample = stale["payload"], "stale", False
        else:
            payload, freshness, is_sample = seed_data, "seeded", True
            
    _record_trace("get_forecast", args.location, True, freshness, is_sample, int((time.time() - start_t)*1000), payload=payload)
    return payload if isinstance(payload, str) else __import__('json').dumps(payload)


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

    seed_data = {
        "location": location,
        "wind_data": [
            {"date": "2026-10-09", "speed_kmh": 5.0, "direction_deg": 90, "carries_toward_city": False}
        ] * args.days
    }
    
    live = cache.get_cached("open_meteo", args.location, allow_expired=False)
    if live:
        # Assuming payload has wind_data inside or we just return the full payload
        payload, freshness, is_sample = live["payload"], "live", False
    else:
        stale = cache.get_last_good("open_meteo", args.location)
        if stale:
            payload, freshness, is_sample = stale["payload"], "stale", False
        else:
            payload, freshness, is_sample = seed_data, "seeded", True

    _record_trace("get_wind", args.location, True, freshness, is_sample, int((time.time() - start_t)*1000), payload=payload)
    return payload if isinstance(payload, str) else __import__('json').dumps(payload)


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

    seed_data = {
        "district": district,
        "hotspot_count": 0,
        "hotspots": [],
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }
    
    live = cache.get_cached("firms", args.district, allow_expired=False)
    if live:
        payload, freshness, is_sample = live["payload"], "live", False
    else:
        stale = cache.get_last_good("firms", args.district)
        if stale:
            payload, freshness, is_sample = stale["payload"], "stale", False
        else:
            payload, freshness, is_sample = seed_data, "seeded", True

    _record_trace("get_fire_hotspots", args.district, True, freshness, is_sample, int((time.time() - start_t)*1000), payload=payload)
    return payload if isinstance(payload, str) else __import__('json').dumps(payload)


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

    # Sample static guidance
    payload = {
        "crop_stage": args.crop_stage,
        "window_start": "2026-10-05",
        "window_end": "2026-10-25",
        "notes": "Optimal window based on PAU sample guidance."
    }
    
    _record_trace("get_sowing_window", args.crop_stage, True, "seeded", True, int((time.time() - start_t)*1000), payload=payload)
    return __import__('json').dumps(payload)


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
    return __import__('json').dumps(payload, default=str)


class StrawArgs(BaseModel):
    district_id: str = Field(description="District identifier")

@tool
def find_straw_outlets(district_id: str) -> str:
    """Find nearby straw outlets. All entries are sample data."""
    start_t = time.time()
    try:
        args = StrawArgs(district_id=district_id)
    except ValidationError as e:
        _record_trace("find_straw_outlets", district_id, False, "error", False, int((time.time() - start_t)*1000))
        return f"Error: {e}"

    table = _get_table(os.environ.get("STRAW_OUTLETS_TABLE", "saans-straw-outlets-dev"))
    
    try:
        response = table.query(
            KeyConditionExpression=Key("district_id").eq(args.district_id)
        )
        outlets = cache._from_decimal(response.get("Items", []))
        payload = {
            "district_id": args.district_id,
            "outlets": outlets,
            "note": "Sample data. Contact your nearest depot or aggregator."
        }
        ok = True
    except Exception as e:
        payload = {"error": str(e), "outlets": []}
        ok = False

    _record_trace("find_straw_outlets", args.district_id, ok, "live", True, int((time.time() - start_t)*1000), payload=payload)
    return __import__('json').dumps(payload, default=str)
