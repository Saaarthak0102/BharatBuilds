"""Custom error classes for the Saans API."""


class SaansError(Exception):
    """Base error for all Saans API errors."""
    pass


class ValidationError(SaansError):
    """Request validation failed."""
    pass


class AgentError(SaansError):
    """An agent invocation failed."""
    pass


class NotFoundError(SaansError):
    """Requested resource not found."""
    pass


class AuthError(SaansError):
    """Authentication or authorization failed."""
    pass


class RateLimitError(SaansError):
    """Rate limit exceeded."""
    pass
