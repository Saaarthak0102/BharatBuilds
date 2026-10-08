"""
POST /v1/subscriptions - Alert opt-in for AQI threshold notifications
"""

import json
import uuid
from datetime import datetime, timezone

from common.responses import success_response, error_response
from common.errors import ValidationError
from common.auth import require_auth
from common.logging import get_logger

logger = get_logger(__name__)


@require_auth
def handler(event, context):
    """
    Lambda handler for POST /v1/subscriptions.

    Expected body:
    {
        "area_id": "string",
        "threshold": 200,
        "channel": "email | push"
    }

    Returns:
    {
        "subscription_id": "string",
        "area_id": "string",
        "threshold": 200,
        "channel": "email",
        "status": "active",
        "is_sample": true
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("subscription_request", correlation_id=correlation_id)

    try:
        body = json.loads(event.get("body", "{}"))
        area_id = body.get("area_id")
        threshold = body.get("threshold")
        channel = body.get("channel", "email")

        if not area_id or threshold is None:
            raise ValidationError("area_id and threshold are required")

        if not isinstance(threshold, (int, float)) or threshold < 0 or threshold > 500:
            raise ValidationError("threshold must be a number between 0 and 500")

        if channel not in ("email", "push"):
            raise ValidationError("channel must be 'email' or 'push'")

        # TODO: Store subscription in DynamoDB, set up SNS topic subscription
        mock_result = {
            "subscription_id": f"sub-{uuid.uuid4().hex[:8]}",
            "area_id": area_id,
            "threshold": threshold,
            "channel": channel,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_sample": True,
        }

        return success_response(mock_result, status_code=201, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
