import time
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from api.common.config import config
from api.common.errors import RateLimitError
from api.common.time import today_ist

def check_rate_limit(user_id: str, action: str = "default") -> None:
    """
    Atomic per-user-per-day and global-per-day counters using UpdateItem ADD with a condition.
    """
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(config.DATA_CACHE_TABLE)
    
    today = today_ist().isoformat()
    
    user_key = f"ratelimit#user#{user_id}#{action}#{today}"
    global_key = f"ratelimit#global#{action}#{today}"
    
    ttl = int(time.time()) + (24 * 60 * 60) # 1 day TTL
    
    user_limit = config.RATELIMIT_USER_PER_DAY
    global_limit = config.RATELIMIT_GLOBAL_PER_DAY
    
    # Global check and increment
    try:
        table.update_item(
            Key={"source": "ratelimit", "key": global_key},
            UpdateExpression="ADD #cnt :inc SET #t = if_not_exists(#t, :ttl)",
            ExpressionAttributeNames={"#cnt": "count", "#t": "ttl"},
            ExpressionAttributeValues={":inc": 1, ":ttl": ttl, ":limit": global_limit},
            ConditionExpression="attribute_not_exists(#cnt) OR #cnt < :limit",
            ReturnValues="UPDATED_NEW"
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            raise RateLimitError("Global rate limit exceeded")
        raise
        
    # User check and increment
    try:
        table.update_item(
            Key={"source": "ratelimit", "key": user_key},
            UpdateExpression="ADD #cnt :inc SET #t = if_not_exists(#t, :ttl)",
            ExpressionAttributeNames={"#cnt": "count", "#t": "ttl"},
            ExpressionAttributeValues={":inc": 1, ":ttl": ttl, ":limit": user_limit},
            ConditionExpression="attribute_not_exists(#cnt) OR #cnt < :limit",
            ReturnValues="UPDATED_NEW"
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            raise RateLimitError("User rate limit exceeded")
        raise
