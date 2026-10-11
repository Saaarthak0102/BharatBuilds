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
    table = dynamodb.Table(config.REPORTS_TABLE)
    cache_table = dynamodb.Table(config.DATA_CACHE_TABLE)

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
    table = dynamodb.Table(config.REPORTS_TABLE)
    
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


def test_demo_advance_reports_safety_guards(monkeypatch):
    from scripts.demo_advance_reports import advance_reports

    # 1. Without safe demo configuration, must fail
    monkeypatch.delenv("ALLOW_DEMO_MUTATION", raising=False)
    monkeypatch.delenv("DEMO_MODE", raising=False)
    monkeypatch.setenv("STAGE", "dev")
    with pytest.raises(RuntimeError, match="Demo mutation requires an explicit safe demo configuration"):
        advance_reports()

    # 2. In production stage, must fail even if demo flag is set
    monkeypatch.setenv("STAGE", "prod")
    monkeypatch.setenv("ALLOW_DEMO_MUTATION", "true")
    with pytest.raises(RuntimeError, match="cannot run in production environment"):
        advance_reports()

    # 3. With safe demo configuration in dev stage, should run safely
    monkeypatch.setenv("STAGE", "dev")
    monkeypatch.setenv("REPORTS_TABLE", "test-reports")
    with mock.patch("boto3.resource") as mock_boto:
        mock_table = mock.MagicMock()
        mock_table.scan.return_value = {"Items": []}
        mock_boto.return_value.Table.return_value = mock_table
        advance_reports(force_demo=True)
        mock_table.scan.assert_called_once()


def test_get_report_by_id_owner_can_read(moto_dynamodb, mock_event):
    dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
    table = dynamodb.Table(config.REPORTS_TABLE)

    table.put_item(Item={
        "report_id": "rpt-owner-123",
        "user_id": "user123",
        "category": "crop_burning",
        "confidence": "0.95",
        "status": "received",
        "needs_review": False,
        "geohash": "ttp6xyz",
        "lat": "28.12345",
        "lng": "77.12345",
        "photo_key": "reports/user123/img.jpg",
        "notes": "private citizen notes",
        "created_at": "2024-11-05T08:30:00Z"
    })

    mock_event["httpMethod"] = "GET"
    mock_event["body"] = ""
    mock_event["pathParameters"] = {"report_id": "rpt-owner-123"}
    mock_event["requestContext"]["authorizer"]["claims"]["sub"] = "user123"

    res = reports.handler(mock_event, None)
    assert res["statusCode"] == 200

    data = json.loads(res["body"])["data"]
    assert data["report_id"] == "rpt-owner-123"
    assert data["category"] == "crop_burning"
    assert data["confidence"] == 0.95
    assert data["status"] == "received"
    assert data["needs_review"] is False
    assert data["created_at"] == "2024-11-05T08:30:00Z"

    # Rounded geohash location only
    assert "location" in data
    assert data["location"]["lat"] != 28.12345
    assert data["location"]["lng"] != 77.12345

    # Private fields must never leak
    assert "user_id" not in data
    assert "photo_key" not in data
    assert "notes" not in data


def test_get_report_by_id_another_user_gets_404(moto_dynamodb, mock_event):
    dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
    table = dynamodb.Table(config.REPORTS_TABLE)

    table.put_item(Item={
        "report_id": "rpt-owner-123",
        "user_id": "user123",
        "category": "crop_burning",
        "confidence": "0.95",
        "status": "received",
        "needs_review": False,
        "geohash": "ttp6xyz",
        "lat": "28.12345",
        "lng": "77.12345",
        "photo_key": "reports/user123/img.jpg",
        "created_at": "2024-11-05T08:30:00Z"
    })

    mock_event["httpMethod"] = "GET"
    mock_event["body"] = ""
    mock_event["pathParameters"] = {"report_id": "rpt-owner-123"}
    # Another user signed in (sub != owner user123)
    mock_event["requestContext"]["authorizer"]["claims"]["sub"] = "other_user_456"

    res = reports.handler(mock_event, None)
    # Must be 404, never 403, so ids are not guessable
    assert res["statusCode"] == 404
    body = json.loads(res["body"])
    assert "error" in body
    assert body["error"]["message"] == "Report not found"

    # Non-existent ID also returns 404
    mock_event["pathParameters"] = {"report_id": "rpt-does-not-exist"}
    res_nonexistent = reports.handler(mock_event, None)
    assert res_nonexistent["statusCode"] == 404


def test_get_reports_mine_true_queries_gsi(moto_dynamodb, mock_event):
    dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
    table = dynamodb.Table(config.REPORTS_TABLE)

    # Put multiple reports for user123 and another user
    table.put_item(Item={
        "report_id": "rpt-user-1",
        "user_id": "user123",
        "status": "received",
        "category": "crop_burning",
        "created_at": "2026-10-10T10:00:00Z"
    })
    table.put_item(Item={
        "report_id": "rpt-user-2",
        "user_id": "user123",
        "status": "resolved",
        "category": "garbage_burning",
        "created_at": "2026-10-11T12:00:00Z"
    })
    table.put_item(Item={
        "report_id": "rpt-other",
        "user_id": "other_person",
        "status": "received",
        "category": "construction_dust",
        "created_at": "2026-10-11T13:00:00Z"
    })

    mock_event["httpMethod"] = "GET"
    mock_event["body"] = ""
    mock_event["pathParameters"] = None
    mock_event["queryStringParameters"] = {"mine": "true"}
    mock_event["requestContext"]["authorizer"]["claims"]["sub"] = "user123"

    with mock.patch.object(table, "scan", side_effect=Exception("Scan should never be called when mine=true")):
        with mock.patch.object(reports, "_get_table", return_value=table):
            res = reports.handler(mock_event, None)

    assert res["statusCode"] == 200
    data = json.loads(res["body"])["data"]
    
    assert len(data["reports"]) == 2
    # Newest first
    assert data["reports"][0]["report_id"] == "rpt-user-2"
    assert data["reports"][1]["report_id"] == "rpt-user-1"
    
    # Status counts
    assert "status_counts" in data
    assert data["status_counts"]["received"] == 1
    assert data["status_counts"]["resolved"] == 1
    assert data["status_counts"]["routed"] == 0


