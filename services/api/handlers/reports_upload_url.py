"""
POST /v1/reports/upload-url
Returns a presigned S3 URL for photo upload.
"""

import json
import uuid

from api.common.responses import success_response, error_response
from api.common.errors import ValidationError
from api.common.auth import require_auth
from api.common.logging import get_logger

logger = get_logger(__name__)

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@require_auth
def handler(event, context):
    """
    Lambda handler for POST /v1/reports/upload-url.

    Expected body:
    {
        "content_type": "image/jpeg",
        "file_size": 1234567
    }

    Returns:
    {
        "upload_url": "string (presigned S3 URL)",
        "photo_key": "string (S3 key for reference)",
        "expires_in": 300
    }
    """
    correlation_id = str(uuid.uuid4())
    logger.info("upload_url_request", correlation_id=correlation_id)

    try:
        body = json.loads(event.get("body", "{}"))
        content_type = body.get("content_type")
        file_size = body.get("file_size", 0)

        if not content_type:
            raise ValidationError("content_type is required")

        if content_type not in ALLOWED_TYPES:
            raise ValidationError(f"content_type must be one of: {ALLOWED_TYPES}")

        if file_size > MAX_SIZE_BYTES:
            raise ValidationError(f"File size must not exceed {MAX_SIZE_BYTES} bytes")

        # TODO: Generate a real presigned S3 PUT URL
        photo_key = f"reports/{uuid.uuid4().hex}.{content_type.split('/')[-1]}"
        mock_result = {
            "upload_url": f"https://saans-reports-bucket.s3.amazonaws.com/{photo_key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
            "photo_key": photo_key,
            "expires_in": 300,
        }

        return success_response(mock_result, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
