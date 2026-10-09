"""
POST /v1/auth/profile - Store role-specific fields on signup
GET /v1/profile - View caller's user profile
"""

from decimal import Decimal
import json
import os
from typing import Any
import uuid
from datetime import datetime, timezone

import boto3
import pydantic

try:
    from common.responses import success_response, error_response
    from common.errors import ValidationError, NotFoundError
    from common.auth import require_auth, get_user_claims
    from common.logging import get_logger
    from common.config import config
except ImportError:
    from services.api.common.responses import success_response, error_response
    from services.api.common.errors import ValidationError, NotFoundError
    from services.api.common.auth import require_auth, get_user_claims
    from services.api.common.logging import get_logger
    from services.api.common.config import config

try:
    from models import (
        CropStage,
        Role,
        FarmerProfile,
        CitizenProfile,
        FarmerProfileInput,
        CitizenProfileInput,
    )
except ImportError:
    from services.api.models import (
        CropStage,
        Role,
        FarmerProfile,
        CitizenProfile,
        FarmerProfileInput,
        CitizenProfileInput,
    )

logger = get_logger(__name__)


def _to_decimal(val: Any) -> Any:
    """Recursively convert float values to Decimal for DynamoDB storage."""
    if isinstance(val, float):
        return Decimal(str(val))
    if isinstance(val, dict):
        return {k: _to_decimal(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_to_decimal(v) for v in val]
    return val


def _from_decimal(val: Any) -> Any:
    """Recursively convert Decimal objects to int or float for API responses."""
    if isinstance(val, Decimal):
        if val % 1 == 0:
            return int(val)
        return float(val)
    if isinstance(val, dict):
        return {k: _from_decimal(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_from_decimal(v) for v in val]
    return val


def _get_users_table():
    """Get the DynamoDB UsersTable resource."""
    table_name = os.environ.get("USERS_TABLE") or getattr(config, "USERS_TABLE", "saans-users")
    region = os.environ.get("AWS_REGION") or getattr(config, "AWS_REGION", "ap-south-1")
    dynamodb = boto3.resource("dynamodb", region_name=region)
    return dynamodb.Table(table_name)


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
    Stores or updates role-specific profile fields after Cognito signup.

    Requirements:
    - user_id comes ONLY from claims["sub"]
    - role comes ONLY from claims["custom:role"] (never from the body)
    - Role-specific validation with Pydantic:
      * farmer: village, district, land size, crop, crop stage, has_own_machine, language
      * citizen: area/ward, language, alert opt-in + threshold, household note
    - Reject unknown fields
    - Upsert into UsersTable with created_at preserved on repeat calls
    """
    correlation_id = str(uuid.uuid4())
    logger.info("create_profile_request", correlation_id=correlation_id)

    try:
        claims = get_user_claims(event)
        user_id = claims.get("sub")
        role = claims.get("custom:role")

        if not user_id:
            return error_response(401, "Authentication required", correlation_id=correlation_id)

        if not role or role not in ("farmer", "citizen"):
            raise ValidationError("Valid user role required in authentication claims ('farmer' or 'citizen')")

        raw_body = event.get("body")
        if not raw_body:
            raise ValidationError("Request body is required")

        if isinstance(raw_body, str):
            try:
                body = json.loads(raw_body)
            except json.JSONDecodeError as err:
                raise ValidationError(f"Invalid JSON in request body: {err}")
        elif isinstance(raw_body, dict):
            body = raw_body
        else:
            raise ValidationError("Request body must be a JSON object")

        if not isinstance(body, dict):
            raise ValidationError("Request body must be a JSON object")

        # Explicitly prevent body from overriding role or user_id
        if "role" in body or "user_id" in body:
            raise ValidationError(
                "user_id and role must not be provided in request body; "
                "they are determined strictly from authentication claims"
            )

        table = _get_users_table()
        existing_res = table.get_item(Key={"user_id": user_id})
        existing_item = existing_res.get("Item")
        now_iso = datetime.now(timezone.utc).isoformat()

        if existing_item:
            created_at = existing_item.get("created_at", now_iso)
            status_code = 200
        else:
            created_at = now_iso
            status_code = 201

        if role == "farmer":
            validated_farmer = FarmerProfileInput.model_validate(body)
            item = {
                "user_id": user_id,
                "role": "farmer",
                "village_id": validated_farmer.village_id,
                "district": validated_farmer.district,
                "land_size_acres": validated_farmer.land_size_acres,
                "main_crop": validated_farmer.main_crop,
                "crop_stage": (
                    validated_farmer.crop_stage.value
                    if hasattr(validated_farmer.crop_stage, "value")
                    else str(validated_farmer.crop_stage)
                ),
                "has_own_machine": validated_farmer.has_own_machine,
                "language": validated_farmer.language,
                "name": (
                    validated_farmer.name
                    or (existing_item.get("name") if existing_item else "")
                    or claims.get("name", "")
                ),
                "created_at": created_at,
                "updated_at": now_iso,
                "is_sample": False,
            }
            phone = (
                validated_farmer.phone
                or (existing_item.get("phone") if existing_item else None)
                or claims.get("phone_number")
            )
            if phone:
                item["phone"] = phone
            village_name = (
                validated_farmer.village_name
                or (existing_item.get("village_name") if existing_item else None)
            )
            if village_name:
                item["village_name"] = village_name

        else:  # role == "citizen"
            validated_citizen = CitizenProfileInput.model_validate(body)
            item = {
                "user_id": user_id,
                "role": "citizen",
                "area_id": validated_citizen.area_id,
                "language": validated_citizen.language,
                "has_kids": bool(validated_citizen.has_kids),
                "has_elderly": bool(validated_citizen.has_elderly),
                "name": (
                    validated_citizen.name
                    or (existing_item.get("name") if existing_item else "")
                    or claims.get("name", "")
                ),
                "created_at": created_at,
                "updated_at": now_iso,
                "is_sample": False,
            }
            if validated_citizen.area_name or (existing_item and existing_item.get("area_name")):
                item["area_name"] = (
                    validated_citizen.area_name
                    or (existing_item.get("area_name") if existing_item else None)
                )
            if validated_citizen.alert_threshold is not None:
                item["alert_threshold"] = validated_citizen.alert_threshold
            elif existing_item and existing_item.get("alert_threshold") is not None:
                item["alert_threshold"] = existing_item.get("alert_threshold")

            if validated_citizen.alert_opt_in is not None:
                item["alert_opt_in"] = validated_citizen.alert_opt_in
            elif existing_item and existing_item.get("alert_opt_in") is not None:
                item["alert_opt_in"] = existing_item.get("alert_opt_in")

            if validated_citizen.household_note is not None:
                item["household_note"] = validated_citizen.household_note
            elif existing_item and existing_item.get("household_note") is not None:
                item["household_note"] = existing_item.get("household_note")

            email = (
                validated_citizen.email
                or (existing_item.get("email") if existing_item else None)
                or claims.get("email")
            )
            if email:
                item["email"] = email
            phone = (
                validated_citizen.phone
                or (existing_item.get("phone") if existing_item else None)
                or claims.get("phone_number")
            )
            if phone:
                item["phone"] = phone

        table.put_item(Item=_to_decimal(item))
        return success_response(_from_decimal(item), status_code=status_code, correlation_id=correlation_id)

    except pydantic.ValidationError as e:
        return error_response(ValidationError(f"Invalid profile data: {e}"), correlation_id=correlation_id)
    except ValidationError as e:
        return error_response(e, correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error_create_profile", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)


def _get_profile(event, context):
    """
    GET /v1/profile
    Returns the caller's own profile item from UsersTable.
    Returns 404 with standard error shape if missing.
    """
    correlation_id = str(uuid.uuid4())
    logger.info("get_profile_request", correlation_id=correlation_id)

    try:
        claims = get_user_claims(event)
        user_id = claims.get("sub")

        if not user_id:
            return error_response(401, "Authentication required", correlation_id=correlation_id)

        table = _get_users_table()
        res = table.get_item(Key={"user_id": user_id})
        item = res.get("Item")

        if not item:
            return error_response(
                NotFoundError(f"Profile for user '{user_id}' not found"),
                correlation_id=correlation_id,
            )

        return success_response(_from_decimal(item), correlation_id=correlation_id)

    except NotFoundError as e:
        return error_response(e, correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error_get_profile", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
