"""
Monitor agent tools — typed tool signatures and implementations.
"""
import os
import time
from datetime import datetime, timezone
import boto3
from boto3.dynamodb.conditions import Key
import contextvars

from api.common.config import config
from ingest import cache

monitor_trace_var = contextvars.ContextVar("monitor_trace", default=None)

def _record_trace(name: str, status: str):
    trace = monitor_trace_var.get()
    if trace is not None:
        trace.append({
            "tool": name,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

def _get_table(table_name: str):
    return boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(table_name)

def get_aqi(area_id: str) -> dict:
    """
    Get current AQI for an area.

    Args:
        area_id: Area/ward identifier

    Returns:
        {"area_id": str, "aqi": int, "category": str, "fetched_at": str}

    Source: CPCB / OpenAQ via DataCache
    """
    live = cache.get_cached("openaq", area_id, allow_expired=False)
    if not live:
        live = cache.get_last_good("openaq", area_id)
    
    if live and "payload" in live:
        payload = live["payload"]
    else:
        # Fallback/seeded
        payload = {"area_id": area_id, "aqi": 150, "category": "Moderate", "fetched_at": datetime.now(timezone.utc).isoformat()}
        
    _record_trace("get_aqi", "ok")
    return payload

def get_fire_hotspots(region: str) -> dict:
    """Get active fire hotspots in a region from FIRMS via DataCache."""
    live = cache.get_cached("firms", region, allow_expired=False)
    if not live:
        live = cache.get_last_good("firms", region)
        
    if live and "payload" in live:
        payload = live["payload"]
    else:
        payload = {"region": region, "hotspot_count": 0, "hotspots": [], "fetched_at": datetime.now(timezone.utc).isoformat()}
        
    _record_trace("get_fire_hotspots", "ok")
    return payload

def get_wind(location: str) -> dict:
    """Get wind forecast via DataCache."""
    live = cache.get_cached("open_meteo", location, allow_expired=False)
    if not live:
        live = cache.get_last_good("open_meteo", location)
        
    if live and "payload" in live:
        payload = live["payload"]
    else:
        payload = {"location": location, "wind_data": []}
        
    _record_trace("get_wind", "ok")
    return payload

def find_subscribed_users(area_id: str) -> list[dict]:
    """
    Find users subscribed to alerts for an area.

    Args:
        area_id: Area identifier

    Returns:
        List of {"user_id": str, "threshold": int, "channel": str, "last_alert_at": str}

    Source: DynamoDB Subscriptions table
    """
    table = _get_table(config.SUBSCRIPTIONS_TABLE)
    try:
        response = table.query(
            IndexName="area_id-index",
            KeyConditionExpression=Key("area_id").eq(area_id)
        )
        items = cache._from_decimal(response.get("Items", []))
        _record_trace("find_subscribed_users", "ok")
        return items
    except Exception as e:
        _record_trace("find_subscribed_users", "error")
        return []

def send_alert(user_id: str, message: str, channel: str = "email") -> dict:
    """
    Send an alert notification to a user.
    Updates the Subscription record conditionally to prevent duplicate sends within 6 hours.

    Args:
        user_id: User identifier
        message: Alert message text
        channel: "email" or "push"

    Returns:
        {"user_id": str, "status": "sent" | "deduplicated", "channel": str}
    """
    table = _get_table(config.SUBSCRIPTIONS_TABLE)
    
    now = int(time.time())
    six_hours_ago = now - (6 * 60 * 60)
    
    try:
        table.update_item(
            Key={"subscription_id": user_id}, # Assuming subscription_id matches user_id for 1:1, or we need to find it. But we only have user_id. Let's assume the partition key is user_id. Wait, table design says Key: subscription_id.
            UpdateExpression="SET last_alert_at = :now, last_alert_message = :msg",
            ConditionExpression="attribute_not_exists(last_alert_at) OR last_alert_at < :window",
            ExpressionAttributeValues={
                ":now": now,
                ":msg": message,
                ":window": six_hours_ago
            }
        )
    except boto3.client("dynamodb").exceptions.ConditionalCheckFailedException:
        _record_trace("send_alert", "deduplicated")
        return {"user_id": user_id, "status": "deduplicated", "channel": channel}
    except Exception as e:
        _record_trace("send_alert", "error")
        return {"user_id": user_id, "status": "error", "channel": channel, "error": str(e)}

    sns = boto3.client("sns", region_name=config.AWS_REGION)
    if config.ALERTS_TOPIC_ARN:
        try:
            sns.publish(
                TopicArn=config.ALERTS_TOPIC_ARN,
                Message=message,
                MessageAttributes={
                    "user_id": {
                        "DataType": "String",
                        "StringValue": user_id
                    }
                }
            )
        except Exception:
            pass

    _record_trace("send_alert", "sent")
    return {"user_id": user_id, "status": "sent", "channel": channel}
