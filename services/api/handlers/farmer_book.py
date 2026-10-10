"""
POST /v1/farmer/book
Books a machine slot for field clearing (simulated).
"""

import json
import uuid

from api.common.responses import success_response, error_response
from api.common.errors import ValidationError
from api.common.auth import require_role
from api.common.logging import get_logger

logger = get_logger(__name__)


@require_role("farmer")
def handler(event, context):
    """
    Lambda handler for POST /v1/farmer/book.

    Expected body:
    {
        "slot_id": "string",
        "village_id": "string",
        "date": "YYYY-MM-DD"
    }

    Returns:
    {
        "booking_id": "string",
        "status": "confirmed",
        "slot": { ... },
        "is_sample": true
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("farmer_book_request", correlation_id=correlation_id)

    try:
        body = json.loads(event.get("body", "{}"))
        slot_id = body.get("slot_id")
        village_id = body.get("village_id")
        date = body.get("date")

        if not slot_id or not village_id or not date:
            raise ValidationError("slot_id, village_id, and date are required")

        # TODO: Actually book the slot in DynamoDB (conditional update to decrement slots_free)
        mock_result = {
            "booking_id": f"book-{uuid.uuid4().hex[:8]}",
            "status": "confirmed",
            "slot": {
                "slot_id": slot_id,
                "machine_type": "Happy Seeder",
                "owner_label": "Kisan Seva Kendra, Patiala",
                "date": date,
                "village_id": village_id,
            },
            "is_sample": True,
        }

        return success_response(mock_result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
