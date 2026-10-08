"""
GET /v1/today?area=<area_id>
Returns AQI, advice, and freshness data for a citizen's area.
"""

import json
import uuid
from datetime import datetime, timezone

from common.responses import success_response, error_response
from common.errors import ValidationError
from common.auth import require_role
from common.logging import get_logger

logger = get_logger(__name__)


@require_role("citizen")
def handler(event, context):
    """
    Lambda handler for GET /v1/today.

    Query params:
        area: area/ward identifier

    Returns:
    {
        "area_id": "string",
        "area_name": "string",
        "aqi": 185,
        "aqi_category": "Unhealthy",
        "aqi_color": "#FF6B35",
        "advice": "string",
        "trend_24h": [ ... ],
        "wind": { ... },
        "smoke_drift_note": "string",
        "nearby_reports": [ ... ],
        "freshness": { ... },
        "is_sample": true
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("today_request", correlation_id=correlation_id)

    try:
        params = event.get("queryStringParameters", {}) or {}
        area_id = params.get("area")

        if not area_id:
            raise ValidationError("area query parameter is required")

        # TODO: Fetch real AQI data from CPCB / OpenAQ, weather from Open-Meteo
        mock_result = {
            "area_id": area_id,
            "area_name": "Anand Vihar, East Delhi",
            "aqi": 185,
            "aqi_category": "Unhealthy",
            "aqi_color": "#FF6B35",
            "advice": "Sensitive groups should reduce prolonged outdoor exertion. Everyone else should limit heavy outdoor activity.",
            "trend_24h": [
                {"hour": "00:00", "aqi": 160},
                {"hour": "03:00", "aqi": 155},
                {"hour": "06:00", "aqi": 170},
                {"hour": "09:00", "aqi": 190},
                {"hour": "12:00", "aqi": 195},
                {"hour": "15:00", "aqi": 185},
                {"hour": "18:00", "aqi": 200},
                {"hour": "21:00", "aqi": 185},
            ],
            "wind": {
                "speed_kmh": 12,
                "direction": "NW",
                "description": "Light north-westerly winds",
            },
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
            ],
            "freshness": {
                "data_updated_at": datetime.now(timezone.utc).isoformat(),
                "label": "Updated just now",
            },
            "is_sample": True,
        }

        return success_response(mock_result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
