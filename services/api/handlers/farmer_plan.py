"""
POST /v1/farmer/plan
Runs the burn-window planner agent for a farmer's village and crop stage.

Returns the best clearing day with score breakdown, machine/straw-outlet
option, reason text, and agent tool trace.
"""

import json
import uuid
from datetime import datetime

from api.models.plan_result import PlanResult
from api.common.responses import success_response, error_response
from api.common.errors import ValidationError, AgentError
from api.common.auth import require_role
from api.common.logging import get_logger

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
            
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', village_id):
            raise ValidationError("Invalid village_id format")

        if crop_stage not in ("harvested", "partially_cleared", "standing"):
            raise ValidationError("crop_stage must be one of: harvested, partially_cleared, standing")

        # Rate limiting (e.g., max 5 requests per minute)
        from api.common.ratelimit import check_rate_limit
        user_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub", "anonymous")
        check_rate_limit(user_id, action="plan")
        
        from agents.planner.agent import run_planner
        import time
        
        start_t = time.time()
        result, outcome = run_planner(village_id=village_id, crop_stage=crop_stage, language=language, user_id=user_id)
        latency = int((time.time() - start_t) * 1000)
        
        from agents.common.runner import write_agent_run
        run_id = str(uuid.uuid4())
        write_agent_run(run_id, result.get("tool_trace", []), latency, outcome)
        
        return success_response(result, correlation_id=correlation_id)
        
    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        # Attempt a fallback response even if something at the handler level broke
        from agents.planner.agent import _fallback_result
        result, outcome = _fallback_result(village_id, crop_stage, language, str(e), [])
        return success_response(result, correlation_id=correlation_id)


def _get_reason_text(language: str) -> str:
    """Return reason text in the requested language. TODO: Use Bedrock for real multilingual generation."""
    reasons = {
        "en": "November 5th is the best day to clear your field. Low wind speeds mean smoke won't drift toward populated areas, and a Happy Seeder is available at Kisan Seva Kendra. No rain expected, so machinery can operate freely.",
        "hi": "5 नवंबर आपके खेत की सफ़ाई के लिए सबसे अच्छा दिन है। कम हवा की गति का मतलब है कि धुआँ आबादी वाले इलाकों की ओर नहीं जाएगा, और किसान सेवा केंद्र में हैप्पी सीडर उपलब्ध है।",
        "pa": "5 ਨਵੰਬਰ ਤੁਹਾਡੇ ਖੇਤ ਦੀ ਸਫ਼ਾਈ ਲਈ ਸਭ ਤੋਂ ਵਧੀਆ ਦਿਨ ਹੈ। ਘੱਟ ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ ਦਾ ਮਤਲਬ ਹੈ ਕਿ ਧੂੰਆਂ ਆਬਾਦੀ ਵਾਲੇ ਇਲਾਕਿਆਂ ਵੱਲ ਨਹੀਂ ਜਾਵੇਗਾ, ਅਤੇ ਕਿਸਾਨ ਸੇਵਾ ਕੇਂਦਰ ਵਿੱਚ ਹੈਪੀ ਸੀਡਰ ਉਪਲਬਧ ਹੈ।",
    }
    return reasons.get(language, reasons["en"])
