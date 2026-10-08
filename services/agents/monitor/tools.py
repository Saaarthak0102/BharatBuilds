"""
Monitor agent tools — typed tool signatures.

STUB ONLY.
"""


def get_aqi(area_id: str) -> dict:
    """
    Get current AQI for an area.

    Args:
        area_id: Area/ward identifier

    Returns:
        {"area_id": str, "aqi": int, "category": str, "fetched_at": str}

    Source: CPCB / OpenAQ
    """
    raise NotImplementedError


def find_subscribed_users(area_id: str) -> list[dict]:
    """
    Find users subscribed to alerts for an area whose threshold is crossed.

    Args:
        area_id: Area identifier

    Returns:
        List of {"user_id": str, "threshold": int, "channel": str, "last_alert_at": str}

    Source: DynamoDB Subscriptions table
    """
    raise NotImplementedError


def send_alert(user_id: str, message: str, channel: str = "email") -> dict:
    """
    Send an alert notification to a user.

    Args:
        user_id: User identifier
        message: Alert message text
        channel: "email" or "push"

    Returns:
        {"user_id": str, "status": "sent" | "deduplicated", "channel": str}

    Note: Uses SNS in production. No real SMS (needs sender registration in India).
    """
    raise NotImplementedError
