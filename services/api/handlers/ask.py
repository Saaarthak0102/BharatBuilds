"""
POST /v1/ask
Grounded Q&A from preset questions, answered from fetched AQI/forecast/report data.
"""

import json
import uuid

from common.responses import success_response, error_response
from common.errors import ValidationError
from common.auth import require_role
from common.logging import get_logger

logger = get_logger(__name__)

# Only these preset questions are allowed
ALLOWED_QUESTIONS = [
    "Is it okay for kids to play outside today?",
    "Should I wear a mask when going out?",
    "When will the air quality improve?",
]


@require_role("citizen")
def handler(event, context):
    """
    Lambda handler for POST /v1/ask.

    Expected body:
    {
        "question": "string (must be one of preset questions)",
        "area_id": "string"
    }

    Returns:
    {
        "question": "string",
        "answer": "string",
        "sources": ["AQI data", "Weather forecast"],
        "is_sample": true
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("ask_request", correlation_id=correlation_id)

    try:
        body = json.loads(event.get("body", "{}"))
        question = body.get("question")
        area_id = body.get("area_id")

        if not question or not area_id:
            raise ValidationError("question and area_id are required")

        if question not in ALLOWED_QUESTIONS:
            raise ValidationError(
                "Only preset questions are allowed. "
                f"Choose from: {ALLOWED_QUESTIONS}"
            )

        # TODO: Call the Strands Ask agent with fetched AQI/forecast context
        mock_answers = {
            ALLOWED_QUESTIONS[0]: "With the current AQI at 185 (Unhealthy), it's best to keep children indoors or limit outdoor play to short periods. If they must go out, early morning before 7 AM typically has better air quality.",
            ALLOWED_QUESTIONS[1]: "Yes, an N95 mask is recommended today. The AQI is in the Unhealthy range (185). A cloth mask won't filter fine particulate matter (PM2.5) effectively.",
            ALLOWED_QUESTIONS[2]: "Based on current wind patterns and forecast data, air quality may improve slightly by tomorrow evening as north-westerly winds are expected to pick up, helping disperse pollutants. However, this is a forecast and conditions may change.",
        }

        mock_result = {
            "question": question,
            "answer": mock_answers.get(question, "I can only answer from today's data."),
            "sources": ["AQI data (CPCB)", "Weather forecast (Open-Meteo)"],
            "is_sample": True,
        }

        return success_response(mock_result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
