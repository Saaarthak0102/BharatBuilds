import os
"""
GET /v1/farmer/straw-outlets?district=<district_id>
Returns straw outlets / ex-situ facilities for a district.
"""

import functools
import inspect
import json
import uuid

import boto3
from boto3.dynamodb.conditions import Key

from api.common import responses as common_responses
from api.common.responses import success_response
from api.common.logging import get_logger
from api.common.config import config

_raw_logger = get_logger(__name__)


class _CorrelationLogger:
    def __init__(self, base_logger):
        self._logger = base_logger

    def info(self, msg, *args, **kwargs):
        if "correlation_id" in kwargs:
            cid = kwargs.pop("correlation_id")
            extra = kwargs.setdefault("extra", {})
            extra["correlation_id"] = cid
        self._logger.info(msg, *args, **kwargs)

    def error(self, msg, *args, **kwargs):
        if "correlation_id" in kwargs:
            cid = kwargs.pop("correlation_id")
            extra = kwargs.setdefault("extra", {})
            extra["correlation_id"] = cid
        self._logger.error(msg, *args, **kwargs)

    def warning(self, msg, *args, **kwargs):
        if "correlation_id" in kwargs:
            cid = kwargs.pop("correlation_id")
            extra = kwargs.setdefault("extra", {})
            extra["correlation_id"] = cid
        self._logger.warning(msg, *args, **kwargs)


logger = _CorrelationLogger(_raw_logger)

# Error and exception handling compatible with both ApiError and legacy conventions
try:
    from api.common.errors import ValidationError
except ImportError:
    try:
        from api.common.errors import ApiError
        class ValidationError(ApiError):
            def __init__(self, message: str):
                super().__init__(message=message, status_code=400, code="BadRequest")
    except ImportError:
        class ValidationError(Exception):
            pass

# Auth decorator compatible with both function require_role(event, role) and decorator @require_role(role)
try:
    from api.common.auth import require_role as _base_require_role
    if len(inspect.signature(_base_require_role).parameters) == 2:
        def require_role(role: str):
            def decorator(handler_fn):
                @functools.wraps(handler_fn)
                def wrapper(event, context):
                    try:
                        _base_require_role(event, role)
                    except Exception as e:
                        return error_response(e)
                    return handler_fn(event, context)
                return wrapper
            return decorator
    else:
        require_role = _base_require_role
except ImportError:
    def require_role(role: str):
        def decorator(handler_fn):
            return handler_fn
        return decorator


def error_response(error_or_status, message: str = None, correlation_id: str = None):
    """Bridge for error responses supporting both ApiError/Exception and (status_code, message)."""
    if isinstance(error_or_status, Exception):
        resp = common_responses.error_response(error_or_status)
    else:
        try:
            from api.common.errors import ApiError
            err = ApiError(message=message or str(error_or_status), status_code=error_or_status, code="BadRequest" if error_or_status == 400 else "InternalServerError")
            resp = common_responses.error_response(err)
        except Exception:
            resp = common_responses.error_response(error_or_status)

    if correlation_id and isinstance(resp, dict) and "body" in resp:
        try:
            body = json.loads(resp["body"])
            if isinstance(body, dict):
                body["correlation_id"] = correlation_id
                resp["body"] = json.dumps(body)
        except Exception:
            pass
    return resp


def _format_success_response(data: dict, correlation_id: str = None) -> dict:
    """Format success response with data payload and correlation ID."""
    payload = {
        "data": data,
    }
    if correlation_id:
        payload["correlation_id"] = correlation_id
    return success_response(payload)


_dynamodb_resource = None

def get_dynamodb_resource():
    return boto3.resource('dynamodb', region_name=config.AWS_REGION)



@require_role("farmer")
def handler(event, context):
    """
    Lambda handler for GET /v1/farmer/straw-outlets.

    Query params:
        district_id: district identifier (e.g. patiala)

    Returns:
    {
        "outlets": [ ... ],
        "district_id": "string",
        "copy": "string",
        "is_sample": true
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("straw_outlets_request", correlation_id=correlation_id)

    try:
        params = event.get("queryStringParameters", {}) or {}
        district_id = params.get("district_id") or params.get("district")

        if not district_id or not district_id.strip():
            raise ValidationError("district_id query parameter is required")

        district_normalized = district_id.strip().lower()

        outlets_table = get_dynamodb_resource().Table(os.environ.get('STRAW_OUTLETS_TABLE', config.STRAW_OUTLETS_TABLE))
        response = outlets_table.query(
            KeyConditionExpression=Key('district_id').eq(district_normalized)
        )
        
        items = response.get('Items', [])

        if not items:
            try:
                from pathlib import Path
                seed_path = Path(__file__).resolve().parents[3] / "data" / "seed" / "straw_outlets.json"
                if seed_path.exists():
                    with open(seed_path, "r", encoding="utf-8") as f:
                        all_seed = json.load(f)
                        items = [o for o in all_seed if str(o.get("district_id", "")).lower() == district_normalized]
            except Exception as e:
                logger.warning(f"Failed to load seed straw outlets: {e}")

        if not items:
            raise ValidationError(f"No straw outlets available for district '{district_id}'.")

        outlets = []
        for item in items:
            outlets.append({
                "outlet_id": item.get("outlet_id", ""),
                "facility_type": item.get("facility_type", "depot"),
                "name": item.get("name", "Unknown"),
                "lat": float(item["lat"]) if "lat" in item and item["lat"] is not None else None,
                "lng": float(item["lng"]) if "lng" in item and item["lng"] is not None else None,
                "accepts": item.get("accepts", ["paddy_straw"]),
                "pickup_support": item.get("pickup_support", "unknown"),
                "contact_hint": item.get("contact_hint", "Contact your nearest depot or aggregator"),
                "is_sample": item.get("is_sample", True),
                "district_id": item.get("district_id", district_normalized)
            })

        mock_result = {
            "outlets": outlets,
            "district": district_normalized,
            "copy": "Contact your nearest depot or aggregator",
            "is_sample": True,
        }

        return _format_success_response(mock_result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(e, correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
