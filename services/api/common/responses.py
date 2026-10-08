"""Consistent API response helpers."""

import json
from typing import Any, Optional


def success_response(
    data: Any,
    status_code: int = 200,
    correlation_id: Optional[str] = None,
) -> dict:
    """Return a standard success response for API Gateway."""
    body = {"data": data}
    if correlation_id:
        body["correlation_id"] = correlation_id

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body, default=str),
    }


def error_response(
    status_code: int,
    message: str,
    correlation_id: Optional[str] = None,
) -> dict:
    """Return a standard error response for API Gateway."""
    body: dict[str, Any] = {
        "error": {
            "status": status_code,
            "message": message,
        }
    }
    if correlation_id:
        body["correlation_id"] = correlation_id

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body),
    }
