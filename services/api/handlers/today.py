"""
GET /v1/today?area=<area_id>
Returns AQI, advice, and freshness data for a citizen's area.
"""

import json
from datetime import datetime
import boto3

from api.common.time import now_ist
from api.common.responses import success_response, error_response
from api.common.errors import ValidationError
from api.common.auth import require_role
from api.common.logging import get_logger
from api.common.config import config

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
cache_table = dynamodb.Table(config.DATA_CACHE_TABLE)
subs_table = dynamodb.Table(config.SUBSCRIPTIONS_TABLE)

# Standard CPCB-category guidance (no medical claims)
CPCB_ADVICE = {
    "Good": "Air quality is satisfactory, and air pollution poses little or no risk.",
    "Satisfactory": "Minor breathing discomfort to sensitive people.",
    "Moderate": "Breathing discomfort to the people with lungs, asthma and heart diseases.",
    "Poor": "Breathing discomfort to most people on prolonged exposure.",
    "Very Poor": "Respiratory illness on prolonged exposure.",
    "Severe": "Affects healthy people and seriously impacts those with existing diseases."
}
CPCB_COLORS = {
    "Good": "#00B050",
    "Satisfactory": "#92D050",
    "Moderate": "#FFFF00",
    "Poor": "#FF9900",
    "Very Poor": "#FF0000",
    "Severe": "#C00000"
}

def get_aqi_category(aqi: int) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Satisfactory"
    if aqi <= 200: return "Moderate"
    if aqi <= 300: return "Poor"
    if aqi <= 400: return "Very Poor"
    return "Severe"

DEFAULT_AREA_NAMES = {
    "ward-east-delhi-001": "Anand Vihar, East Delhi",
    "ward-east-delhi-002": "Laxmi Nagar, East Delhi",
    "ward-north-delhi-001": "Civil Lines, North Delhi",
    "ward-south-delhi-001": "Hauz Khas, South Delhi",
    "ward-central-delhi-001": "Connaught Place, Central Delhi",
    "ward-noida-001": "Sector 62, Noida",
    "ward-gurgaon-001": "Sector 29, Gurugram",
}

def resolve_area_name(area_id: str) -> str:
    """Resolve human-readable area name from data/seed/wards.json or fallback."""
    try:
        from pathlib import Path
        for seed_dir in [Path.cwd() / "data" / "seed", Path(__file__).resolve().parents[3] / "data" / "seed"]:
            wards_file = seed_dir / "wards.json"
            if wards_file.exists():
                with open(wards_file, "r", encoding="utf-8") as f:
                    wards = json.load(f)
                    for w in wards:
                        if w.get("ward_id") == area_id:
                            zone = w.get("zone") or w.get("city")
                            return f"{w['name']}, {zone}" if zone else w["name"]
            villages_file = seed_dir / "villages.json"
            if villages_file.exists():
                with open(villages_file, "r", encoding="utf-8") as f:
                    villages = json.load(f)
                    for v in villages:
                        if v.get("village_id") == area_id:
                            dist = v.get("district") or v.get("state")
                            return f"{v['name']}, {dist}" if dist else v["name"]
    except Exception as e:
        logger.warning(f"Error reading seed files for area_name: {e}")

    return DEFAULT_AREA_NAMES.get(area_id, area_id)

@require_role("citizen")
def handler(event, context):
    correlation_id = event.get("requestContext", {}).get("requestId", "unknown")
    logger.info("today_request", correlation_id=correlation_id)

    try:
        params = event.get("queryStringParameters", {}) or {}
        area_id = params.get("area")

        if not area_id:
            raise ValidationError("area query parameter is required")

        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        user_id = claims.get("sub")

        # Track caches read
        sources: list[dict[str, Any]] = []

        # 1. Fetch AQI cache
        aqi_item = cache_table.get_item(Key={"source": "aqi", "key": area_id}).get("Item")
        aqi_is_sample = False
        if not aqi_item:
            aqi_val = 185
            aqi_is_sample = True
            aqi_fetched_at = now_ist().isoformat()
            trend_24h = [
                {"hour": "00:00", "aqi": 160},
                {"hour": "03:00", "aqi": 155},
                {"hour": "06:00", "aqi": 170},
                {"hour": "09:00", "aqi": 190},
                {"hour": "12:00", "aqi": 195},
                {"hour": "15:00", "aqi": 185},
                {"hour": "18:00", "aqi": 200},
                {"hour": "21:00", "aqi": 185},
            ]
        else:
            data = aqi_item.get("data", {}) or aqi_item.get("payload", {})
            aqi_val = data.get("aqi", 0)
            aqi_fetched_at = aqi_item.get("updated_at") or aqi_item.get("fetched_at") or now_ist().isoformat()
            aqi_is_sample = bool(aqi_item.get("is_sample", False))
            trend_24h = data.get("trend_24h", [])

        sources.append({
            "name": "aqi",
            "fetched_at": aqi_fetched_at,
            "is_sample": aqi_is_sample,
        })

        # 2. Fetch Open-Meteo Weather cache
        weather_item = cache_table.get_item(Key={"source": "open_meteo", "key": area_id}).get("Item")
        weather_data = {}
        weather_is_sample = True
        weather_fetched_at = now_ist().isoformat()
        if weather_item:
            weather_data = weather_item.get("data", {}) or weather_item.get("payload", {})
            weather_fetched_at = weather_item.get("updated_at") or weather_item.get("fetched_at") or now_ist().isoformat()
            weather_is_sample = bool(weather_item.get("is_sample", False))

        sources.append({
            "name": "open_meteo",
            "fetched_at": weather_fetched_at,
            "is_sample": weather_is_sample,
        })

        # 3. Fetch FIRMS Fire count for region
        firms_item = cache_table.get_item(Key={"source": "firms", "key": "all"}).get("Item")
        if not firms_item:
            # Fallback to area-specific or sample
            firms_item = cache_table.get_item(Key={"source": "firms", "key": area_id}).get("Item")

        fires_24h = 0
        firms_is_sample = True
        firms_fetched_at = now_ist().isoformat()
        if firms_item:
            firms_payload = firms_item.get("payload") or firms_item.get("data")
            firms_fetched_at = firms_item.get("updated_at") or firms_item.get("fetched_at") or now_ist().isoformat()
            firms_is_sample = bool(firms_item.get("is_sample", False))
            if isinstance(firms_payload, list):
                fires_24h = sum(int(item.get("hotspot_count", len(item.get("hotspots", [])))) for item in firms_payload)
            elif isinstance(firms_payload, dict):
                fires_24h = int(firms_payload.get("hotspot_count", len(firms_payload.get("hotspots", []))))
        else:
            fires_24h = 48  # Realistic sample regional count for dashboard tile

        sources.append({
            "name": "firms",
            "fetched_at": firms_fetched_at,
            "is_sample": firms_is_sample,
        })
        
        # Fetch subscription for latest alert
        latest_alert = None
        if user_id:
            sub_item = subs_table.get_item(Key={"subscription_id": user_id}).get("Item")
            if sub_item:
                latest_alert = sub_item.get("latest_alert_message")

        category = get_aqi_category(aqi_val)
        forecast_summary = weather_data.get("forecast_summary", "Clear skies expected today.")
        area_name = resolve_area_name(area_id)

        result = {
            "area_id": area_id,
            "area_name": area_name,
            "aqi": aqi_val,
            "aqi_category": category,
            "aqi_color": CPCB_COLORS.get(category, "#000000"),
            "advice": CPCB_ADVICE.get(category, ""),
            "freshness": aqi_fetched_at,
            "is_sample": aqi_is_sample,
            "trend_24h": trend_24h,
            "forecast_summary": forecast_summary,
            "latest_alert_message": latest_alert,
            "fires_24h": fires_24h,
            "sources": sources,
            "wind": weather_data.get("wind", {
                "speed_kmh": 12,
                "direction": "NW",
                "description": "Light north-westerly winds",
            }),
            "smoke_drift_note": "Wind patterns may carry particulates from agricultural areas in Haryana toward East Delhi today.",
            "nearby_reports": [
                {
                    "report_id": "rpt-001",
                    "category": "crop_burning",
                    "status": "routed",
                    "distance_km": 2.3,
                    "created_at": "2024-11-05T08:30:00Z",
                },
                {
                    "report_id": "rpt-002",
                    "category": "garbage_burning",
                    "status": "received",
                    "distance_km": 0.8,
                    "created_at": "2024-11-05T10:15:00Z",
                },
            ]
        }

        return success_response(result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
