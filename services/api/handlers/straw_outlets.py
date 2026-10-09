"""
GET /v1/farmer/straw-outlets?district=<district_id>
Returns straw outlets / ex-situ facilities for a district.
"""

import functools
import inspect
import json
from pathlib import Path
import uuid

from common import responses as common_responses
from common.responses import success_response
from common.logging import get_logger

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
    from common.errors import ValidationError
except ImportError:
    try:
        from common.errors import ApiError
        class ValidationError(ApiError):
            def __init__(self, message: str):
                super().__init__(message=message, status_code=400, code="BadRequest")
    except ImportError:
        class ValidationError(Exception):
            pass

# Auth decorator compatible with both function require_role(event, role) and decorator @require_role(role)
try:
    from common.auth import require_role as _base_require_role
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
            from common.errors import ApiError
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


SEED_FILE_PATHS = [
    Path(__file__).resolve().parent.parent.parent.parent / "data" / "seed" / "straw_outlets.json",
    Path(__file__).resolve().parent.parent.parent / "data" / "seed" / "straw_outlets.json",
    Path("data/seed/straw_outlets.json"),
    Path("/var/task/data/seed/straw_outlets.json"),
]


def _load_seed_outlets() -> list[dict]:
    """Load mock outlet data from existing seed JSON."""
    for p in SEED_FILE_PATHS:
        if p.is_file():
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    return []


@require_role("farmer")
def handler(event, context):
    """
    Lambda handler for GET /v1/farmer/straw-outlets.

    Query params:
        district: district identifier (e.g. patiala)

    Returns:
    {
        "outlets": [ ... ],
        "district": "string",
        "is_sample": true
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("straw_outlets_request", correlation_id=correlation_id)

    try:
        params = event.get("queryStringParameters", {}) or {}
        district = params.get("district")

        if not district or not district.strip():
            raise ValidationError("district query parameter is required")

        district_normalized = district.strip().lower()

        seed_outlets = _load_seed_outlets()
        matching = [
            o for o in seed_outlets
            if str(o.get("district_id", "")).strip().lower() == district_normalized
        ]

        if not matching:
            raise ValidationError(
                f"Unsupported district '{district}'. No straw outlets available."
            )

        mock_result = {
            "outlets": matching,
            "district": district_normalized,
            "is_sample": True,
        }

        return _format_success_response(mock_result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(e, correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
