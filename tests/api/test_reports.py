import json
import pytest
import os
import boto3
from unittest import mock

from api.handlers import reports, reports_upload_url, reports_classify
from api.common.config import config

@pytest.fixture
def mock_event():
    return {
        "httpMethod": "POST",
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "user123",
                    "custom:role": "citizen"
                }
            }
        },
        "body": ""
    }

def test_upload_url_bad_type(mock_event):
    mock_event["body"] = json.dumps({
        "content_type": "application/pdf",
        "file_size": 1000
    })
    res = reports_upload_url.handler(mock_event, None)
    assert res["statusCode"] == 400
    assert "content_type must be one of" in json.loads(res["body"])["error"]["message"]

def test_upload_url_oversize(mock_event):
    mock_event["body"] = json.dumps({
        "content_type": "image/jpeg",
        "file_size": 20 * 1024 * 1024
    })
    res = reports_upload_url.handler(mock_event, None)
    assert res["statusCode"] == 400
    assert "File size must not exceed" in json.loads(res["body"])["error"]["message"]

def test_classify_foreign_photo_key(mock_event):
    mock_event["body"] = json.dumps({
        "photo_key": "reports/other_user/img.jpg"
    })
    res = reports_classify.handler(mock_event, None)
    assert res["statusCode"] == 403
    assert "Access denied" in json.loads(res["body"])["error"]["message"]

def test_report_idempotency(moto_dynamodb, mock_event):
    dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
    # Setup test table
    table = dynamodb.create_table(
        TableName=config.REPORTS_TABLE,
        KeySchema=[{"AttributeName": "report_id", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "report_id", "AttributeType": "S"}
        ],
        BillingMode="PAY_PER_REQUEST"
    )
    
    # We also need DATA_CACHE_TABLE for rate limit mock
    cache_table = dynamodb.create_table(
        TableName=config.DATA_CACHE_TABLE,
        KeySchema=[
            {"AttributeName": "source", "KeyType": "HASH"},
            {"AttributeName": "key", "KeyType": "RANGE"}
        ],
        AttributeDefinitions=[
            {"AttributeName": "source", "AttributeType": "S"},
            {"AttributeName": "key", "AttributeType": "S"}
        ],
        BillingMode="PAY_PER_REQUEST"
    )

    mock_event["body"] = json.dumps({
        "photo_key": "reports/user123/img.jpg",
        "location": {"lat": 28.1, "lng": 77.1},
        "category": "crop_burning",
        "idempotency_key": "idemp-key-1"
    })
    
    # First submit
    res1 = reports.handler(mock_event, None)
    assert res1["statusCode"] == 201
    
    # Second submit (idempotent)
    res2 = reports.handler(mock_event, None)
    assert res2["statusCode"] == 201

def test_report_flood_limit(moto_dynamodb, mock_event):
    dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
    dynamodb.create_table(
        TableName=config.REPORTS_TABLE,
        KeySchema=[{"AttributeName": "report_id", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "report_id", "AttributeType": "S"}
        ],
        BillingMode="PAY_PER_REQUEST"
    )
    
    dynamodb.create_table(
        TableName=config.DATA_CACHE_TABLE,
        KeySchema=[
            {"AttributeName": "source", "KeyType": "HASH"},
            {"AttributeName": "key", "KeyType": "RANGE"}
        ],
        AttributeDefinitions=[
            {"AttributeName": "source", "AttributeType": "S"},
            {"AttributeName": "key", "AttributeType": "S"}
        ],
        BillingMode="PAY_PER_REQUEST"
    )
    
    mock_event["body"] = json.dumps({
        "photo_key": "reports/user123/img.jpg",
        "location": {"lat": 28.1, "lng": 77.1},
        "category": "crop_burning"
    })

    original_limit = config.RATELIMIT_USER_PER_DAY
    config.RATELIMIT_USER_PER_DAY = 2
    
    reports.handler(mock_event, None) # count 1
    reports.handler(mock_event, None) # count 2
    res = reports.handler(mock_event, None) # count 3 -> should fail
    
    config.RATELIMIT_USER_PER_DAY = original_limit
    
    assert res["statusCode"] == 429
    assert "Rate limit exceeded" in json.loads(res["body"])["error"]["message"]

def test_reports_privacy_get(moto_dynamodb, mock_event):
    dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
    table = dynamodb.create_table(
        TableName=config.REPORTS_TABLE,
        KeySchema=[{"AttributeName": "report_id", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "report_id", "AttributeType": "S"}
        ],
        BillingMode="PAY_PER_REQUEST"
    )
    
    table.put_item(Item={
        "report_id": "test-rpt-1",
        "user_id": "secret-user",
        "photo_key": "reports/secret-user/1.jpg",
        "notes": "secret notes",
        "category": "crop_burning",
        "geohash": "ttp6xyz",
        "lat": "28.12345",
        "lng": "77.12345",
        "status": "received",
        "created_at": "2024-01-01T00:00:00Z"
    })
    
    mock_event["httpMethod"] = "GET"
    mock_event["body"] = ""
    
    res = reports.handler(mock_event, None)
    assert res["statusCode"] == 200
    
    data = json.loads(res["body"])
    reports_list = data["data"]["reports"]
    
    assert len(reports_list) == 1
    rpt = reports_list[0]
    
    assert "user_id" not in rpt
    assert "photo_key" not in rpt
    assert "notes" not in rpt
    
    # Location should be decoded from truncated geohash (not exact)
    assert rpt["location"]["lat"] != 28.12345
