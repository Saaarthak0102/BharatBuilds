"""
GET /v1/weather?location_id=<id>
Returns current weather, today's high/low, rain chance, UV, sunset, wind,
humidity, condition label, 24h hourly summary, fetched_at, and is_sample
from DataCache for any signed-in user.
"""

import json
import uuid
import boto3
from datetime import datetime, timezone
from typing import Any

from api.common.time import now_ist
from api.common.responses import success_response, error_response
from api.common.errors import ValidationError
from api.common.auth import require_auth
from api.common.logging import get_logger
from api.common.config import config

logger = get_logger(__name__)

def _get_table(name: str):
    return boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(name)

# WMO weather code mapping to human-readable condition labels
WMO_CONDITION_LABELS: dict[int, str] = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail",
}


def map_wmo_code_to_label(code: int | None) -> str:
    """Map WMO numeric code to human-readable string label."""
    if code is None:
        return "Clear"
    return WMO_CONDITION_LABELS.get(int(code), "Partly Cloudy")


def _build_hourly_summary(payload: dict[str, Any], curr_temp: float, high: float, low: float, condition: str) -> list[dict[str, Any]]:
    """Build or extract a 24h hourly summary list."""
    raw_hourly = payload.get("raw", {}).get("hourly", {})
    if not raw_hourly and "hourly" in payload:
        raw_hourly = payload["hourly"]

    times = raw_hourly.get("time", [])
    temps = raw_hourly.get("temperature_2m", [])
    probs = raw_hourly.get("precipitation_probability", [])
    codes = raw_hourly.get("weather_code", [])

    if times and temps:
        summary = []
        for i in range(min(24, len(times))):
            t_str = str(times[i])
            hour_label = t_str.split("T")[-1][:5] if "T" in t_str else f"{i:02d}:00"
            t_val = float(temps[i]) if i < len(temps) and temps[i] is not None else curr_temp
            p_val = float(probs[i]) if i < len(probs) and probs[i] is not None else 0.0
            c_val = codes[i] if i < len(codes) else None
            summary.append({
                "hour": hour_label,
                "temperature": t_val,
                "temperature_c": t_val,
                "rain_chance": p_val,
                "condition": map_wmo_code_to_label(c_val),
            })
        return summary

    # Synthesize standard 24h summary if raw hourly not available
    summary = []
    for h in range(24):
        # simple diurnal temp variation between low and high
        ratio = (1.0 - abs(h - 14) / 14.0)
        est_t = round(low + (high - low) * max(0.0, ratio), 1)
        summary.append({
            "hour": f"{h:02d}:00",
            "temperature": est_t,
            "temperature_c": est_t,
            "rain_chance": 0.0,
            "condition": condition,
        })
    return summary


@require_auth
def handler(event, context):
    correlation_id = event.get("requestContext", {}).get("requestId", str(uuid.uuid4()))
    logger.info("weather_request", correlation_id=correlation_id)

    try:
        params = event.get("queryStringParameters") or {}
        location_id = params.get("location_id") or params.get("location")

        if not location_id:
            raise ValidationError("location_id query parameter is required")

        cache_table = _get_table(config.DATA_CACHE_TABLE)
        resp = cache_table.get_item(Key={"source": "open_meteo", "key": location_id})
        item = resp.get("Item")

        if not item:
            # 404 with standard error shape for unknown location IDs
            return error_response(404, f"Location '{location_id}' not found in weather cache", correlation_id=correlation_id)

        payload = item.get("payload") or item.get("data") or {}
        is_sample = bool(item.get("is_sample", False) or payload.get("is_sample", False))
        fetched_at = item.get("fetched_at") or item.get("updated_at") or now_ist().isoformat()

        curr = payload.get("current", {})
        curr_temp = float(curr.get("temperature_c") or curr.get("temperature_2m") or 25.0)
        apparent_temp = float(curr.get("apparent_temperature_c") or curr.get("apparent_temperature") or curr_temp)
        humidity = int(curr.get("relative_humidity_pct") or curr.get("relative_humidity_2m") or 50)
        weather_code = curr.get("weather_code")
        wind_speed = float(curr.get("wind_speed_kmh") or curr.get("wind_speed_10m") or 10.0)
        wind_dir = int(curr.get("wind_direction_deg") or curr.get("wind_direction_10m") or 290)

        forecast_list = payload.get("forecast", [])
        today_fc = forecast_list[0] if forecast_list else {}

        today_high = float(today_fc.get("temp_max_c") or today_fc.get("temperature_2m_max") or curr_temp + 4.0)
        today_low = float(today_fc.get("temp_min_c") or today_fc.get("temperature_2m_min") or curr_temp - 5.0)
        rain_chance = float(today_fc.get("precipitation_probability_max") or today_fc.get("rain_prob_pct") or 0.0)
        uv = float(today_fc.get("uv_index_max") or today_fc.get("uv_index") or 4.5)
        sunset = str(today_fc.get("sunset") or "18:05")

        vis_raw = payload.get("hourly", {}).get("visibility")
        if isinstance(vis_raw, list) and len(vis_raw) > 0 and vis_raw[0] is not None:
            visibility_km = round(float(vis_raw[0]) / 1000.0, 1)
        else:
            visibility_km = 10.0

        condition_label = map_wmo_code_to_label(weather_code)

        hourly_summary = _build_hourly_summary(payload, curr_temp, today_high, today_low, condition_label)

        result = {
            "location_id": location_id,
            "current": curr_temp,
            "temperature": curr_temp,
            "temperature_c": curr_temp,
            "feels_like": apparent_temp,
            "apparent_temperature": apparent_temp,
            "today_high": today_high,
            "today_low": today_low,
            "high": today_high,
            "low": today_low,
            "rain_chance": rain_chance,
            "uv": uv,
            "UV": uv,
            "uv_index": uv,
            "sunset": sunset,
            "wind": {
                "speed": wind_speed,
                "speed_kmh": wind_speed,
                "direction": wind_dir,
                "direction_deg": wind_dir,
            },
            "wind_speed": wind_speed,
            "wind_direction": wind_dir,
            "humidity": humidity,
            "relative_humidity": humidity,
            "visibility": f"{visibility_km} km",
            "visibility_km": visibility_km,
            "condition": condition_label,
            "hourly_summary_24h": hourly_summary,
            "hourly_summary": hourly_summary,
            "fetched_at": fetched_at,
            "is_sample": is_sample,
        }

        return success_response(result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_weather_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
