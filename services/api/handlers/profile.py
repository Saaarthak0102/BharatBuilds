"""
POST /v1/auth/profile - Store role-specific fields on signup
GET /v1/profile - View user profile
"""

import json
import uuid
from datetime import datetime, timezone

from common.responses import success_response, error_response
from common.errors import ValidationError
from common.auth import require_auth, get_user_claims
from common.logging import get_logger

logger = get_logger(__name__)


@require_auth
def handler(event, context):
    """Route to the correct handler based on HTTP method and path."""
    method = event.get("httpMethod", "GET")
    path = event.get("path", "")

    if method == "POST" and "/auth/profile" in path:
        return _create_profile(event, context)
    elif method == "GET" and "/profile" in path:
        return _get_profile(event, context)
    else:
        return error_response(405, "Method not allowed")


def _create_profile(event, context):
    """
    POST /v1/auth/profile
    Stores role-specific profile fields after Cognito signup.

    Expected body:
    {
        "role": "farmer | citizen",
        "name": "string",
        "phone": "string (farmer)",
        "email": "string (citizen)",
        "language": "en | hi | pa",
        // Farmer-specific:
        "village_id": "string",
        "district": "string",
        "land_size_acres": number,
        "main_crop": "string",
        "crop_stage": "string",
        "has_own_machine": boolean,
        // Citizen-specific:
        "area_id": "string",
        "alert_threshold": number | null,
        "has_kids": boolean,
        "has_elderly": boolean
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("create_profile_request", correlation_id=correlation_id)

    try:
        claims = get_user_claims(event)
        body = json.loads(event.get("body", "{}"))
        role = body.get("role")
        name = body.get("name")

        if not role or not name:
            raise ValidationError("role and name are required")

        if role not in ("farmer", "citizen"):
            raise ValidationError("role must be 'farmer' or 'citizen'")

        # TODO: Store in DynamoDB Users table, keyed by Cognito user_id
        mock_result = {
            "user_id": claims.get("sub", f"user-{uuid.uuid4().hex[:8]}"),
            "role": role,
            "name": name,
            "language": body.get("language", "en"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_sample": True,
        }

        if role == "farmer":
            mock_result.update({
                "village_id": body.get("village_id"),
                "district": body.get("district"),
                "land_size_acres": body.get("land_size_acres"),
                "main_crop": body.get("main_crop"),
                "crop_stage": body.get("crop_stage"),
                "has_own_machine": body.get("has_own_machine", False),
            })
        else:
            mock_result.update({
                "area_id": body.get("area_id"),
                "alert_threshold": body.get("alert_threshold"),
                "has_kids": body.get("has_kids", False),
                "has_elderly": body.get("has_elderly", False),
            })

        return success_response(mock_result, status_code=201, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)


def _get_profile(event, context):
    """
    GET /v1/profile
    Returns the current user's profile.
    """
    correlation_id = str(uuid.uuid4())
    logger.info("get_profile_request", correlation_id=correlation_id)

    try:
        claims = get_user_claims(event)
        role = claims.get("custom:role", "citizen")

        # TODO: Fetch from DynamoDB Users table
        if role == "farmer":
            mock_result = {
                "user_id": claims.get("sub", "user-abc123"),
                "role": "farmer",
                "name": "Gurpreet Singh",
                "phone": "+91-98765-XXXXX",
                "language": "pa",
                "village_id": "village-patiala-001",
                "village_name": "Rajpura",
                "district": "Patiala",
                "land_size_acres": 12,
                "main_crop": "Paddy (Rice)",
                "crop_stage": "harvested",
                "has_own_machine": False,
                "created_at": "2024-10-15T10:00:00Z",
                "is_sample": True,
            }
        else:
            mock_result = {
                "user_id": claims.get("sub", "user-xyz789"),
                "role": "citizen",
                "name": "Priya Sharma",
                "email": "priya@example.com",
                "language": "en",
                "area_id": "ward-east-delhi-001",
                "area_name": "Anand Vihar, East Delhi",
                "alert_threshold": 200,
                "has_kids": True,
                "has_elderly": False,
                "created_at": "2024-10-20T14:00:00Z",
                "is_sample": True,
            }

        return success_response(mock_result, correlation_id=correlation_id)

    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
