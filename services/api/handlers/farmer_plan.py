"""
POST /v1/farmer/plan
Runs the burn-window planner agent for a farmer's village and crop stage.

Returns the best clearing day with score breakdown, machine/straw-outlet
option, reason text, and agent tool trace.
"""

import json
import uuid
from datetime import datetime

from models.plan_result import PlanResult
from common.responses import success_response, error_response
from common.errors import ValidationError, AgentError
from common.auth import require_role
from common.logging import get_logger

logger = get_logger(__name__)


@require_role("farmer")
def handler(event, context):
    """
    Lambda handler for POST /v1/farmer/plan.

    Expected body:
    {
        "village_id": "string",
        "crop_stage": "harvested | partially_cleared | standing",
        "language": "en | hi | pa"
    }

    Returns:
    {
        "best_day": "2024-11-05",
        "score": 82,
        "score_breakdown": { ... },
        "machine_option": { ... } | null,
        "straw_outlet_option": { ... } | null,
        "reason_text": "string (in requested language)",
        "tool_trace": [ ... ],
        "is_sample": true
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("farmer_plan_request", correlation_id=correlation_id)

    try:
        body = json.loads(event.get("body", "{}"))
        village_id = body.get("village_id")
        crop_stage = body.get("crop_stage")
        language = body.get("language", "en")

        if not village_id or not crop_stage:
            raise ValidationError("village_id and crop_stage are required")

        if crop_stage not in ("harvested", "partially_cleared", "standing"):
            raise ValidationError("crop_stage must be one of: harvested, partially_cleared, standing")

        # TODO: Call the Strands planner agent here
        # For now, return mock data
        mock_result = {
            "best_day": "2024-11-05",
            "score": 82,
            "score_breakdown": {
                "sowing_window": 20,
                "rain_and_soil": 18,
                "wind": 15,
                "fire_activity": 14,
                "machine_availability": 15,
            },
            "machine_option": {
                "slot_id": "slot-001",
                "machine_type": "Happy Seeder",
                "owner_label": "Kisan Seva Kendra, Patiala",
                "date": "2024-11-05",
                "is_sample": True,
            },
            "straw_outlet_option": None,
            "reason_text": _get_reason_text(language),
            "tool_trace": [
                {"tool": "get_forecast", "status": "ok", "latency_ms": 120},
                {"tool": "get_wind", "status": "ok", "latency_ms": 95},
                {"tool": "get_fire_hotspots", "status": "ok", "latency_ms": 150},
                {"tool": "get_sowing_window", "status": "ok", "latency_ms": 10},
                {"tool": "find_machine_slots", "status": "ok", "latency_ms": 80},
            ],
            "seven_day_scores": [
                {"date": "2024-11-03", "score": 45},
                {"date": "2024-11-04", "score": 68},
                {"date": "2024-11-05", "score": 82},
                {"date": "2024-11-06", "score": 74},
                {"date": "2024-11-07", "score": 60},
                {"date": "2024-11-08", "score": 55},
                {"date": "2024-11-09", "score": 71},
            ],
            "is_sample": True,
        }

        return success_response(mock_result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except AgentError as e:
        logger.error("agent_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Planner agent failed", correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)


def _get_reason_text(language: str) -> str:
    """Return reason text in the requested language. TODO: Use Bedrock for real multilingual generation."""
    reasons = {
        "en": "November 5th is the best day to clear your field. Low wind speeds mean smoke won't drift toward populated areas, and a Happy Seeder is available at Kisan Seva Kendra. No rain expected, so machinery can operate freely.",
        "hi": "5 नवंबर आपके खेत की सफ़ाई के लिए सबसे अच्छा दिन है। कम हवा की गति का मतलब है कि धुआँ आबादी वाले इलाकों की ओर नहीं जाएगा, और किसान सेवा केंद्र में हैप्पी सीडर उपलब्ध है।",
        "pa": "5 ਨਵੰਬਰ ਤੁਹਾਡੇ ਖੇਤ ਦੀ ਸਫ਼ਾਈ ਲਈ ਸਭ ਤੋਂ ਵਧੀਆ ਦਿਨ ਹੈ। ਘੱਟ ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ ਦਾ ਮਤਲਬ ਹੈ ਕਿ ਧੂੰਆਂ ਆਬਾਦੀ ਵਾਲੇ ਇਲਾਕਿਆਂ ਵੱਲ ਨਹੀਂ ਜਾਵੇਗਾ, ਅਤੇ ਕਿਸਾਨ ਸੇਵਾ ਕੇਂਦਰ ਵਿੱਚ ਹੈਪੀ ਸੀਡਰ ਉਪਲਬਧ ਹੈ।",
    }
    return reasons.get(language, reasons["en"])
