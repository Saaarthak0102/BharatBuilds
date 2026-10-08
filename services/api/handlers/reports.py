"""
POST /v1/reports - Submit a burning report
GET /v1/reports?bbox= - Get reports for the map
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
    """Route to the correct handler based on HTTP method."""
    method = event.get("httpMethod", "GET")
    if method == "POST":
        return _submit_report(event, context)
    elif method == "GET":
        return _get_reports(event, context)
    else:
        return error_response(405, "Method not allowed")


def _submit_report(event, context):
    """
    POST /v1/reports

    Expected body:
    {
        "photo_key": "string (from upload-url response)",
        "location": { "lat": number, "lng": number },
        "category": "crop_burning | garbage_burning | cracker_burning | construction_dust",
        "category_confirmed": boolean,
        "notes": "string (optional, treated as untrusted input)"
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("submit_report_request", correlation_id=correlation_id)

    try:
        body = json.loads(event.get("body", "{}"))
        photo_key = body.get("photo_key")
        location = body.get("location")
        category = body.get("category")

        if not photo_key or not location or not category:
            raise ValidationError("photo_key, location, and category are required")

        valid_categories = ["crop_burning", "garbage_burning", "cracker_burning", "construction_dust"]
        if category not in valid_categories:
            raise ValidationError(f"category must be one of: {valid_categories}")

        if not isinstance(location, dict) or "lat" not in location or "lng" not in location:
            raise ValidationError("location must have lat and lng fields")

        # NOTE: body.get("notes") is untrusted user input - never pass to agent prompts
        # TODO: Submit to DynamoDB, trigger triage agent/Step Functions workflow

        report_id = f"rpt-{uuid.uuid4().hex[:8]}"
        mock_result = {
            "report_id": report_id,
            "status": "received",
            "category": category,
            "location": location,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_sample": True,
        }

        return success_response(mock_result, status_code=201, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)


def _get_reports(event, context):
    """
    GET /v1/reports?bbox=minLng,minLat,maxLng,maxLat
    """
    correlation_id = str(uuid.uuid4())
    logger.info("get_reports_request", correlation_id=correlation_id)

    try:
        # TODO: Query DynamoDB by geohash range
        mock_result = {
            "reports": [
                {
                    "report_id": "rpt-001",
                    "category": "crop_burning",
                    "confidence": 0.92,
                    "status": "routed",
                    "location": {"lat": 28.65, "lng": 77.25},
                    "created_at": "2024-11-05T08:30:00Z",
                    "is_sample": True,
                },
                {
                    "report_id": "rpt-002",
                    "category": "garbage_burning",
                    "confidence": 0.85,
                    "status": "received",
                    "location": {"lat": 28.63, "lng": 77.22},
                    "created_at": "2024-11-05T10:15:00Z",
                    "is_sample": True,
                },
                {
                    "report_id": "rpt-003",
                    "category": "construction_dust",
                    "confidence": 0.78,
                    "status": "resolved",
                    "location": {"lat": 28.68, "lng": 77.30},
                    "created_at": "2024-11-04T14:00:00Z",
                    "is_sample": True,
                },
            ],
            "is_sample": True,
        }

        return success_response(mock_result, correlation_id=correlation_id)

    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
