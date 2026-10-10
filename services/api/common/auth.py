import functools
from .errors import ApiError


def get_claims(event):
    """Extract claims from the API Gateway Cognito Authorizer context."""
    if not isinstance(event, dict):
        return {}
    request_context = event.get("requestContext", {})
    if isinstance(request_context, dict):
        authorizer = request_context.get("authorizer", {})
        if isinstance(authorizer, dict):
            claims = authorizer.get("claims")
            if isinstance(claims, dict) and claims:
                return claims

    # Dev/mock mode header fallback if requestContext is not configured
    headers = event.get("headers", {}) or {}
    if "X-Mock-Role" in headers or "X-Mock-User-Id" in headers:
        return {
            "sub": headers.get("X-Mock-User-Id", "mock-user-001"),
            "custom:role": headers.get("X-Mock-Role", "citizen"),
            "email": "mock@example.com",
        }

    return {}


def get_user_claims(event):
    """Extract user claims from the API Gateway event."""
    return get_claims(event)


def require_auth(handler_fn):
    """Decorator: requires any authenticated user with a valid sub claim."""
    @functools.wraps(handler_fn)
    def wrapper(event, context):
        claims = get_claims(event)
        if not claims or not claims.get("sub"):
            from api.common.responses import error_response
            return error_response(401, "Authentication required")
        return handler_fn(event, context)
    return wrapper


def require_role(role_or_event, maybe_role=None):
    """
    Role check supporting both:
    1. Function invocation: require_role(event, "farmer")
    2. Decorator factory: @require_role("farmer")
    """
    if maybe_role is not None or (isinstance(role_or_event, dict) and isinstance(maybe_role, str)):
        event = role_or_event
        required_role = maybe_role
        claims = get_claims(event)
        role = claims.get("custom:role")
        if role != required_role:
            raise ApiError(
                message=f"Access denied. Requires role: {required_role}",
                status_code=403,
                code="Forbidden",
            )
        return role
    else:
        required_role = role_or_event

        def decorator(handler_fn):
            @functools.wraps(handler_fn)
            def wrapper(event, context):
                claims = get_claims(event)
                role = claims.get("custom:role")
                if role != required_role:
                    from api.common.responses import error_response
                    return error_response(
                        403,
                        f"Access denied. Requires role: {required_role}",
                    )
                return handler_fn(event, context)
            return wrapper

        return decorator
