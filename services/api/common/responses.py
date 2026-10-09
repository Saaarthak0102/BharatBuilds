import json
import os
from .errors import ApiError


def get_cors_headers():
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")
    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }


def success_response(payload, status_code=200, correlation_id=None):
    headers = {"Content-Type": "application/json"}
    headers.update(get_cors_headers())

    if isinstance(payload, dict):
        if "data" in payload:
            body_dict = dict(payload)
        else:
            body_dict = {"data": payload}
    else:
        body_dict = {"data": payload}

    if correlation_id:
        body_dict["correlation_id"] = correlation_id

    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body_dict, default=str),
    }


def error_response(error_or_status, message=None, correlation_id=None):
    headers = {"Content-Type": "application/json"}
    headers.update(get_cors_headers())

    if isinstance(error_or_status, ApiError):
        status_code = error_or_status.status_code
        err_dict = {
            "code": error_or_status.code,
            "status": status_code,
            "message": error_or_status.message,
        }
    elif isinstance(error_or_status, Exception):
        status_code = 500
        err_dict = {
            "code": "InternalServerError",
            "status": 500,
            "message": str(error_or_status),
        }
    elif isinstance(error_or_status, int):
        status_code = error_or_status
        code = (
            "BadRequest"
            if status_code == 400
            else (
                "Forbidden"
                if status_code == 403
                else ("Unauthorized" if status_code == 401 else "InternalServerError")
            )
        )
        err_dict = {
            "code": code,
            "status": status_code,
            "message": message or "",
        }
    else:
        status_code = 500
        err_dict = {
            "code": "InternalServerError",
            "status": 500,
            "message": str(error_or_status),
        }

    body_dict = {"error": err_dict}
    if correlation_id:
        body_dict["correlation_id"] = correlation_id

    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body_dict),
    }
