"""
POST /v1/reports - Submit a burning report
GET /v1/reports - Get reports for the map
GET /v1/reports/{report_id} - Get single report (owner only)
DELETE /v1/reports/{id} - Delete a report
"""

import json
import uuid
import time
from datetime import datetime, timezone
import boto3
from boto3.dynamodb.conditions import Key
import pygeohash as pgh
import os
from botocore.exceptions import ClientError

from api.common.responses import success_response, error_response
from api.common.errors import ValidationError, ApiError
from api.common.auth import require_auth, get_claims
from api.common.logging import get_logger
from api.common.config import config

logger = get_logger(__name__)

def _get_table(name: str):
    return boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(name)

@require_auth
def handler(event, context):
    """Route to the correct handler based on HTTP method."""
    method = event.get("httpMethod", "GET")
    if method == "POST":
        return _submit_report(event, context)
    elif method == "GET":
        path_params = event.get("pathParameters") or {}
        report_id = path_params.get("report_id") or path_params.get("id")
        if report_id:
            return _get_report_by_id(event, context, report_id)
        return _get_reports(event, context)
    elif method == "DELETE":
        return _delete_report(event, context)
    else:
        return error_response(405, "Method not allowed")


def _check_rate_limit(user_id: str):
    # Very simple mock ratelimit via DynamoDB scan or query - using DataCache for counting
    cache = _get_table(config.DATA_CACHE_TABLE)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"{user_id}#{today}"
    
    try:
        response = cache.update_item(
            Key={"source": "ratelimit_reports", "key": key},
            UpdateExpression="ADD request_count :inc SET #ttl = :ttl",
            ExpressionAttributeNames={"#ttl": "ttl"},
            ExpressionAttributeValues={":inc": 1, ":ttl": int(time.time()) + 86400},
            ReturnValues="UPDATED_NEW"
        )
        count = response.get("Attributes", {}).get("request_count", 1)
        if count > config.RATELIMIT_USER_PER_DAY:
            raise ApiError(message="Rate limit exceeded (per day)", status_code=429)
    except ApiError:
        raise
    except Exception as e:
        logger.error(f"Ratelimit check failed: {e}")


def _submit_report(event, context):
    correlation_id = str(uuid.uuid4())
    logger.info("submit_report_request", correlation_id=correlation_id)

    try:
        user_id = get_claims(event).get("sub")
        if not user_id:
            raise ValidationError("Unauthorized")

        body = json.loads(event.get("body", "{}"))
        photo_key = body.get("photo_key")
        location = body.get("location")
        category = body.get("category")
        idempotency_key = body.get("idempotency_key")
        notes = body.get("notes", "")
        confidence = body.get("confidence")

        if not photo_key or not location or not category:
            raise ValidationError("photo_key, location, and category are required")

        valid_categories = ["crop_burning", "garbage_burning", "cracker_burning", "construction_dust"]
        if category not in valid_categories:
            raise ValidationError(f"category must be one of: {valid_categories}")

        if not isinstance(location, dict) or "lat" not in location or "lng" not in location:
            raise ValidationError("location must have lat and lng fields")
            
        if not photo_key.startswith(f"reports/{user_id}/"):
            raise ApiError(403, "Access denied to this photo_key")
            
        _check_rate_limit(user_id)

        lat = float(location["lat"])
        lng = float(location["lng"])
        geohash = pgh.encode(lat, lng, precision=7)
        
        if idempotency_key:
            report_id = f"rpt-{idempotency_key}"
        else:
            report_id = f"rpt-{uuid.uuid4().hex[:8]}"

        table = _get_table(config.REPORTS_TABLE)
        
        item = {
            "report_id": report_id,
            "user_id": user_id,
            "status": "received",
            "category": category,
            "geohash": geohash,
            "lat": str(lat),
            "lng": str(lng),
            "photo_key": photo_key,
            "notes": notes, # NEVER placed in prompt
            "created_at": datetime.now(timezone.utc).isoformat(),
            "ttl": int(time.time()) + (30 * 24 * 60 * 60)
        }
        if confidence is not None:
            item["confidence"] = str(confidence)
        
        try:
            table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(report_id)"
            )
        except (ClientError, boto3.client("dynamodb").exceptions.ConditionalCheckFailedException) as err:
            if isinstance(err, ClientError) and err.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise
            # Idempotent - return the existing report if it's the same
            pass
            
        try:
            lambda_client = boto3.client("lambda", region_name=config.AWS_REGION)
            triage_fn = os.environ.get("TRIAGE_FUNCTION_NAME", "saans-dev-TriageFunction")
            
            payload = {
                "report_id": report_id,
                "category": category,
                "geohash": geohash,
                "photo_key": photo_key,
                "lat": float(lat),
                "lng": float(lng)
            }
            lambda_client.invoke(
                FunctionName=triage_fn,
                InvocationType="Event",
                Payload=json.dumps(payload)
            )
        except Exception as e:
            logger.error("triage_invoke_failed", error=str(e))

        return success_response({
            "report_id": report_id,
            "status": "received",
            "category": category,
            "location": location,
            "created_at": item["created_at"]
        }, status_code=201, correlation_id=correlation_id)

    except ApiError as e:
        return error_response(e.status_code, e.message, correlation_id=correlation_id)
    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)


SAMPLE_REPORTS = [
    {
        "report_id": "rpt-001",
        "category": "crop_burning",
        "status": "routed",
        "location": {"lat": 28.65, "lng": 77.25},
        "created_at": "2024-11-05T08:30:00Z",
    },
    {
        "report_id": "rpt-002",
        "category": "garbage_burning",
        "status": "received",
        "location": {"lat": 28.63, "lng": 77.22},
        "created_at": "2024-11-05T10:15:00Z",
    },
    {
        "report_id": "rpt-003",
        "category": "construction_dust",
        "status": "resolved",
        "location": {"lat": 28.68, "lng": 77.30},
        "created_at": "2024-11-04T14:00:00Z",
    },
]

def _get_reports(event, context):
    correlation_id = str(uuid.uuid4())
    logger.info("get_reports_request", correlation_id=correlation_id)

    try:
        # Scan for reports; if table does not exist or empty, fallback to sample reports
        table = _get_table(config.REPORTS_TABLE)
        response = table.scan()
        items = response.get("Items", [])
        
        if not items:
            return success_response({"reports": SAMPLE_REPORTS, "is_sample": True}, correlation_id=correlation_id)

        safe_reports = []
        for item in items:
            # Mask precision and remove private fields
            g = item.get("geohash", "")
            safe_geohash = g[:5] if len(g) >= 5 else g
            lat, lng = pgh.decode(safe_geohash) if safe_geohash else (0.0, 0.0)
            
            safe_reports.append({
                "report_id": item.get("report_id"),
                "category": item.get("category"),
                "status": item.get("status"),
                "location": {"lat": lat, "lng": lng},
                "created_at": item.get("created_at")
            })

        return success_response({"reports": safe_reports, "is_sample": False}, correlation_id=correlation_id)

    except Exception as e:
        logger.warning(f"Failed to scan reports table, falling back to sample data: {e}", correlation_id=correlation_id)
        return success_response({"reports": SAMPLE_REPORTS, "is_sample": True}, correlation_id=correlation_id)


def _get_report_by_id(event, context, report_id: str):
    correlation_id = str(uuid.uuid4())
    logger.info("get_report_by_id_request", correlation_id=correlation_id, report_id=report_id)

    try:
        user_id = get_claims(event).get("sub")
        if not user_id:
            raise ValidationError("Unauthorized")

        table = _get_table(config.REPORTS_TABLE)
        resp = table.get_item(Key={"report_id": report_id})
        item = resp.get("Item")

        # Owner only: user_id from claims must equal item's user_id, otherwise 404 (never 403, so ids are not guessable)
        if not item or item.get("user_id") != user_id:
            return error_response(404, "Report not found", correlation_id=correlation_id)

        # Mask location precision: return geohash-rounded location only
        g = item.get("geohash", "")
        if not g and "lat" in item and "lng" in item:
            try:
                g = pgh.encode(float(item["lat"]), float(item["lng"]), precision=7)
            except Exception:
                g = ""
        safe_geohash = g[:5] if len(g) >= 5 else g
        lat, lng = pgh.decode(safe_geohash) if safe_geohash else (0.0, 0.0)

        # Parse confidence as float if present
        confidence_val = None
        if "confidence" in item and item["confidence"] is not None:
            try:
                confidence_val = float(item["confidence"])
            except (ValueError, TypeError):
                confidence_val = None

        report_data = {
            "report_id": item.get("report_id"),
            "category": item.get("category"),
            "confidence": confidence_val,
            "status": item.get("status", "received"),
            "needs_review": bool(item.get("needs_review", False)),
            "created_at": item.get("created_at"),
            "location": {"lat": float(lat), "lng": float(lng)}
        }

        return success_response(report_data, correlation_id=correlation_id)

    except ApiError as e:
        return error_response(e.status_code, e.message, correlation_id=correlation_id)
    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)


def _delete_report(event, context):
    correlation_id = str(uuid.uuid4())
    try:
        user_id = get_claims(event).get("sub")
        if not user_id:
            raise ValidationError("Unauthorized")
            
        path_params = event.get("pathParameters") or {}
        report_id = path_params.get("report_id") or path_params.get("id")
        if not report_id:
            raise ValidationError("report id is required")
            
        table = _get_table(config.REPORTS_TABLE)
        
        # We need to verify ownership
        resp = table.get_item(Key={"report_id": report_id})
        item = resp.get("Item")
        
        if not item:
            return error_response(404, "Report not found")
            
        if item.get("user_id") != user_id:
            raise ApiError(403, "Access denied")
            
        table.delete_item(Key={"report_id": report_id})
        
        return success_response({"status": "deleted"}, correlation_id=correlation_id)
        
    except ApiError as e:
        return error_response(e.status_code, e.message, correlation_id=correlation_id)
    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
