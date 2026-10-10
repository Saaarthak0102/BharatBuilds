"""
GET /v1/today?area=<area_id>
Returns AQI, advice, and freshness data for a citizen's area.
"""

import json
from datetime import datetime, timezone
import boto3

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

        # Fetch cached data
        aqi_item = cache_table.get_item(Key={"source": "aqi", "key": area_id}).get("Item")
        weather_item = cache_table.get_item(Key={"source": "open_meteo", "key": area_id}).get("Item")
        
        # Fetch subscription for latest alert
        latest_alert = None
        if user_id:
            sub_item = subs_table.get_item(Key={"subscription_id": user_id}).get("Item")
            if sub_item:
                latest_alert = sub_item.get("latest_alert_message")

        is_sample = False
        if not aqi_item:
            # Seeded/Sample Scenario
            aqi_val = 185
            is_sample = True
            fetched_at = datetime.now(timezone.utc).isoformat()
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
            data = aqi_item.get("data", {})
            aqi_val = data.get("aqi", 0)
            fetched_at = aqi_item.get("updated_at") or aqi_item.get("created_at") or datetime.now(timezone.utc).isoformat()
            trend_24h = data.get("trend_24h", [])
            
        category = get_aqi_category(aqi_val)
        
        weather_data = {}
        if weather_item:
            weather_data = weather_item.get("data", {})
            
        forecast_summary = weather_data.get("forecast_summary", "Clear skies expected today.")

        result = {
            "area_id": area_id,
            "area_name": "Anand Vihar, East Delhi",
            "aqi": aqi_val,
            "aqi_category": category,
            "aqi_color": CPCB_COLORS.get(category, "#000000"),
            "advice": CPCB_ADVICE.get(category, ""),
            "freshness": fetched_at,
            "is_sample": is_sample,
            "trend_24h": trend_24h,
            "forecast_summary": forecast_summary,
            "latest_alert_message": latest_alert,
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
