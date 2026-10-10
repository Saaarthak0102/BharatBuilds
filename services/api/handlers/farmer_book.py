import os
import json
import uuid
import hashlib
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

from api.common.responses import success_response, error_response
from api.common.errors import ValidationError, ApiError
from api.common.auth import require_role
from api.common.logging import get_logger
from api.common.config import config

logger = get_logger(__name__)


_dynamodb_client = None
_dynamodb_resource = None

def get_dynamodb_client():
    return boto3.client('dynamodb', region_name=config.AWS_REGION)

def get_dynamodb_resource():
    return boto3.resource('dynamodb', region_name=config.AWS_REGION)


@require_role("farmer")
def handler(event, context):
    method = event.get("httpMethod", "POST")
    if method == "POST":
        return _handle_post(event, context)
    elif method == "GET":
        return _handle_get(event, context)
    else:
        return error_response(405, "Method not allowed")

def _handle_post(event, context):
    correlation_id = str(uuid.uuid4())
    logger.info("farmer_book_request", correlation_id=correlation_id)

    try:
        body = json.loads(event.get("body", "{}"))
        village_id = body.get("village_id")
        date = body.get("date")
        idempotency_key = body.get("idempotency_key")
        
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        claims = authorizer.get("claims", {})
        user_id = claims.get("sub", "unknown-user")

        if not village_id or not date or not idempotency_key:
            raise ValidationError("village_id, date, and idempotency_key are required")

        # Deterministic booking ID
        raw_key = f"{user_id}#{village_id}#{date}#{idempotency_key}"
        booking_hash = hashlib.sha256(raw_key.encode()).hexdigest()[:12]
        booking_id = f"book-{booking_hash}"
        
        bookings_table = get_dynamodb_resource().Table(os.environ.get("BOOKINGS_TABLE", config.BOOKINGS_TABLE))
        try:
            existing = bookings_table.get_item(
                Key={'user_id': user_id, 'booking_id': booking_id}
            )
            if 'Item' in existing:
                return success_response(existing['Item'], correlation_id=correlation_id)
        except Exception as e:
            logger.error("check_booking_failed", error=str(e), correlation_id=correlation_id)

        try:
            get_dynamodb_client().transact_write_items(
                TransactItems=[
                    {
                        'Update': {
                            'TableName': os.environ.get('MACHINE_SLOTS_TABLE', config.MACHINE_SLOTS_TABLE),
                            'Key': {
                                'village_id': {'S': village_id},
                                'date': {'S': date}
                            },
                            'UpdateExpression': 'SET slots_free = slots_free - :dec',
                            'ConditionExpression': 'slots_free > :zero',
                            'ExpressionAttributeValues': {
                                ':dec': {'N': '1'},
                                ':zero': {'N': '0'}
                            }
                        }
                    },
                    {
                        'Put': {
                            'TableName': os.environ.get('BOOKINGS_TABLE', config.BOOKINGS_TABLE),
                            'Item': {
                                'user_id': {'S': user_id},
                                'booking_id': {'S': booking_id},
                                'village_id': {'S': village_id},
                                'date': {'S': date},
                                'idempotency_key': {'S': idempotency_key},
                                'status': {'S': 'PENDING'},
                                'created_at': {'S': datetime.now(timezone.utc).isoformat()},
                                'is_sample': {'BOOL': True}
                            },
                            'ConditionExpression': 'attribute_not_exists(booking_id)'
                        }
                    }
                ]
            )
        except ClientError as e:
            if e.response['Error']['Code'] == 'TransactionCanceledException':
                reasons = e.response.get('CancellationReasons', [])
                if len(reasons) > 0 and reasons[0].get('Code') == 'ConditionalCheckFailed':
                    return error_response(ApiError("No slots remaining", status_code=409, code="Conflict"), correlation_id=correlation_id)
            raise e
            
        result = {
            "booking_id": booking_id,
            "user_id": user_id,
            "village_id": village_id,
            "date": date,
            "idempotency_key": idempotency_key,
            "status": "PENDING",
            "is_sample": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        return success_response(result, status_code=201, correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)


def _handle_get(event, context):
    correlation_id = str(uuid.uuid4())
    logger.info("farmer_bookings_get_request", correlation_id=correlation_id)
    try:
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        claims = authorizer.get("claims", {})
        user_id = claims.get("sub", "unknown-user")

        bookings_table = get_dynamodb_resource().Table(os.environ.get("BOOKINGS_TABLE", config.BOOKINGS_TABLE))
        response = bookings_table.query(
            KeyConditionExpression=Key('user_id').eq(user_id),
            ScanIndexForward=False,
            Limit=20
        )
        
        return success_response({"bookings": response.get('Items', [])}, correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
