"""Custom error classes for the Saans API."""


class ApiError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "BadRequest"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class SaansError(Exception):
    """Base error for all Saans API errors."""
    pass


class ValidationError(ApiError):
    """Request validation failed."""
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400, code="BadRequest")


class AgentError(ApiError):
    """An agent invocation failed."""
    def __init__(self, message: str):
        super().__init__(message=message, status_code=500, code="AgentFailed")


class NotFoundError(ApiError):
    """Requested resource not found."""
    def __init__(self, message: str):
        super().__init__(message=message, status_code=404, code="NotFound")


class AuthError(ApiError):
    """Authentication or authorization failed."""
    def __init__(self, message: str, status_code: int = 401):
        super().__init__(
            message=message,
            status_code=status_code,
            code="Unauthorized" if status_code == 401 else "Forbidden",
        )


class RateLimitError(ApiError):
    """Rate limit exceeded."""
    def __init__(self, message: str):
        super().__init__(message=message, status_code=429, code="TooManyRequests")
