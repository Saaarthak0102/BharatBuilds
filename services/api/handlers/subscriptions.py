"""
GET, POST, DELETE /v1/subscriptions - Alert opt-in for AQI threshold notifications
"""

import json
from datetime import datetime, timezone

import boto3

from api.common.responses import success_response, error_response
from api.common.errors import ValidationError
from api.common.auth import require_role
from api.common.logging import get_logger
from api.common.config import config

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
table = dynamodb.Table(config.SUBSCRIPTIONS_TABLE)
sns = boto3.client("sns", region_name=config.AWS_REGION)

@require_role("citizen")
def handler(event, context):
    correlation_id = event.get("requestContext", {}).get("requestId", "unknown")
    logger.info("subscription_request", correlation_id=correlation_id)

    try:
        http_method = event.get("httpMethod", "GET")
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        user_id = claims.get("sub")
        if not user_id:
            return error_response(401, "Unauthorized", correlation_id=correlation_id)

        if http_method == "GET":
            response = table.get_item(Key={"subscription_id": user_id})
            item = response.get("Item")
            if not item:
                return success_response({"status": "no_subscription"}, correlation_id=correlation_id)
            return success_response(item, correlation_id=correlation_id)

        elif http_method == "DELETE":
            response = table.get_item(Key={"subscription_id": user_id})
            item = response.get("Item")
            if item and item.get("sns_subscription_arn"):
                try:
                    sns.unsubscribe(SubscriptionArn=item["sns_subscription_arn"])
                except Exception as e:
                    logger.warning("sns_unsubscribe_failed", error=str(e), correlation_id=correlation_id)
            table.delete_item(Key={"subscription_id": user_id})
            return success_response({"status": "unsubscribed"}, correlation_id=correlation_id)

        elif http_method == "POST":
            body = json.loads(event.get("body", "{}"))
            area_id = body.get("area_id")
            threshold = body.get("threshold")
            email = body.get("email")

            if not area_id or threshold is None or not email:
                raise ValidationError("area_id, threshold, and email are required")

            if not isinstance(threshold, (int, float)) or threshold < 0 or threshold > 500:
                raise ValidationError("threshold must be a number between 0 and 500")

            existing = table.get_item(Key={"subscription_id": user_id}).get("Item")
            sns_sub_arn = existing.get("sns_subscription_arn") if existing else None

            if not sns_sub_arn:
                sns_res = sns.subscribe(
                    TopicArn=config.ALERTS_TOPIC_ARN,
                    Protocol="email",
                    Endpoint=email,
                    ReturnSubscriptionArn=True,
                    Attributes={
                        "FilterPolicy": json.dumps({
                            "user_id": [user_id]
                        })
                    }
                )
                sns_sub_arn = sns_res.get("SubscriptionArn")

            item = {
                "subscription_id": user_id,
                "area_id": area_id,
                "threshold": threshold,
                "email": email,
                "status": "active",
                "sns_subscription_arn": sns_sub_arn,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "is_sample": False,
            }
            if not existing:
                item["created_at"] = item["updated_at"]
            else:
                item["created_at"] = existing.get("created_at", item["updated_at"])
                
            table.put_item(Item=item)
            return success_response(item, status_code=201, correlation_id=correlation_id)

        else:
            return error_response(405, "Method Not Allowed", correlation_id=correlation_id)

    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
