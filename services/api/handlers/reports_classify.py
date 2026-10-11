import json
import uuid
import boto3
from io import BytesIO
from PIL import Image
from pydantic import BaseModel, Field

from api.common.responses import success_response, error_response
from api.common.errors import ValidationError, ApiError
from api.common.auth import require_auth, get_claims
from api.common.logging import get_logger
from api.common.config import config
from agents.common.model import structured_complete

logger = get_logger(__name__)

class ClassificationResult(BaseModel):
    category: str = Field(description="One of: crop_burning, garbage_burning, cracker_burning, construction_dust, none")
    confidence: float = Field(description="Confidence from 0.0 to 1.0")
    is_unsafe: bool = Field(description="True if the image contains inappropriate or unsafe content")

@require_auth
def handler(event, context):
    correlation_id = str(uuid.uuid4())
    logger.info("classify_report_request", correlation_id=correlation_id)

    try:
        user_id = get_claims(event).get("sub")
        if not user_id:
            raise ValidationError("Unauthorized")

        body = json.loads(event.get("body", "{}"))
        photo_key = body.get("photo_key")

        if not photo_key:
            raise ValidationError("photo_key is required")

        if not photo_key.startswith(f"reports/{user_id}/"):
            raise ApiError(message="Access denied to this photo_key", status_code=403, code="Forbidden")

        if not config.BEDROCK_ENABLED:
            return error_response(
                ApiError(message="Bedrock model is unavailable", status_code=503, code="MODEL_UNAVAILABLE"),
                correlation_id=correlation_id
            )

        s3 = boto3.client("s3", region_name=config.AWS_REGION)
        bucket = config.REPORTS_BUCKET

        try:
            resp = s3.get_object(Bucket=bucket, Key=photo_key)
            image_data = resp["Body"].read()
        except Exception:
            raise ValidationError("Photo not found")

        # Strip EXIF with Pillow
        img = Image.open(BytesIO(image_data))
        clean_io = BytesIO()
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(clean_io, format="JPEG", quality=85)
        clean_image_data = clean_io.getvalue()
        
        # Upload clean image back
        s3.put_object(Bucket=bucket, Key=photo_key, Body=clean_image_data, ContentType="image/jpeg")

        # Call Bedrock Vision
        prompt = (
            "Classify this image into one of the following categories: "
            "crop_burning, garbage_burning, cracker_burning, construction_dust, none. "
            "Also flag if it is unsafe."
        )

        content = structured_complete(ClassificationResult, prompt, image=clean_image_data)

        if content.is_unsafe or content.category == "none":
            category = "none"
            confidence = 0.1
        else:
            category = content.category
            if category not in ["crop_burning", "garbage_burning", "cracker_burning", "construction_dust"]:
                category = "none"
                confidence = 0.1
            else:
                confidence = content.confidence

        return success_response({
            "category": category,
            "confidence": confidence
        }, correlation_id=correlation_id)

    except ApiError as e:
        return error_response(e.status_code, e.message, correlation_id=correlation_id)
    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
