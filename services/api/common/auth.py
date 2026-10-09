from .errors import ApiError

def get_claims(event):
    """Extract claims from the API Gateway Cognito Authorizer context."""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    return claims

def require_role(event, required_role: str):
    """
    Validates that the caller has the required role.
    Raises ApiError(403) if the role doesn't match.
    """
    claims = get_claims(event)
    role = claims.get('custom:role')
    
    if role != required_role:
        raise ApiError(
            message=f"Access denied. Requires role: {required_role}", 
            status_code=403, 
            code="Forbidden"
        )
    return role
