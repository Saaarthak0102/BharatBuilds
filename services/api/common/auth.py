"""
Auth utilities for Lambda handlers.

Reads Cognito JWT claims from API Gateway authorizer context.
Provides decorators for role-based access control.
"""

import functools
from typing import Any, Callable, Optional

from common.errors import AuthError
from common.responses import error_response


def get_user_claims(event: dict) -> dict:
    """
    Extract user claims from the API Gateway event.

    In production, these come from the Cognito authorizer.
    In mock mode, they come from a custom header or are hardcoded.

    Returns:
        dict with at least 'sub' and 'custom:role' keys
    """
    # Try API Gateway Cognito authorizer claims
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
    )

    if claims:
        return claims

    # Fallback: read from custom header (mock/dev mode only)
    # TODO: Remove this fallback in production
    headers = event.get("headers", {}) or {}
    mock_role = headers.get("X-Mock-Role", "citizen")
    mock_user_id = headers.get("X-Mock-User-Id", "mock-user-001")

    return {
        "sub": mock_user_id,
        "custom:role": mock_role,
        "email": "mock@example.com",
    }


def require_auth(handler_fn: Callable) -> Callable:
    """Decorator: requires any authenticated user."""

    @functools.wraps(handler_fn)
    def wrapper(event, context):
        try:
            claims = get_user_claims(event)
            if not claims.get("sub"):
                raise AuthError("Authentication required")
            return handler_fn(event, context)
        except AuthError as e:
            return error_response(401, str(e))

    return wrapper


def require_role(role: str) -> Callable:
    """
    Decorator factory: requires a specific role.

    Usage:
        @require_role("farmer")
        def handler(event, context):
            ...
    """

    def decorator(handler_fn: Callable) -> Callable:
        @functools.wraps(handler_fn)
        def wrapper(event, context):
            try:
                claims = get_user_claims(event)
                if not claims.get("sub"):
                    raise AuthError("Authentication required")

                user_role = claims.get("custom:role")
                if user_role != role:
                    raise AuthError(f"Role '{role}' required, got '{user_role}'")

                return handler_fn(event, context)
            except AuthError as e:
                return error_response(403, str(e))

        return wrapper

    return decorator
