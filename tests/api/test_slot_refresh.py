"""
Tests for SlotRefreshFunction handler.
"""

import json
import boto3
import pytest
from moto import mock_aws
from datetime import timedelta
from services.api.common.time import today_ist
from services.api.handlers.slot_refresh import handler
from api.common.config import config


def test_slot_refresh_handler(moto_dynamodb):
    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    table = dynamodb.Table(config.MACHINE_SLOTS_TABLE)

    event = {"source": "aws.events", "detail-type": "Scheduled Event"}
    result = handler(event, None)
    assert result["statusCode"] == 200
    body = json.loads(result["body"])
    assert body["status"] == "success"
    assert body["days_refreshed"] == 21
    assert body["slots_created"] > 0

    # Verify slots in DynamoDB for today_ist and today_ist + 20 days
    today = today_ist()
    day_0 = today.strftime("%Y-%m-%d")
    day_20 = (today + timedelta(days=20)).strftime("%Y-%m-%d")

    item_0 = table.get_item(Key={"village_id": "village-patiala-001", "date": day_0}).get("Item")
    item_20 = table.get_item(Key={"village_id": "village-patiala-001", "date": day_20}).get("Item")

    assert item_0 is not None
    assert item_0["is_sample"] is True
    assert item_20 is not None
    assert item_20["is_sample"] is True
