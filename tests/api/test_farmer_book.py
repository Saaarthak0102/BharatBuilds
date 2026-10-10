import json
import pytest
import boto3
from moto import mock_aws
from tests.conftest import build_event

class TestFarmerBookEndpoint:

    def setup_method(self):
        # We need to manually add some slots to MachineSlots table for testing
        from api.common.config import config
        dynamodb = boto3.client("dynamodb", region_name="ap-south-1")
        dynamodb.put_item(
            TableName=config.MACHINE_SLOTS_TABLE,
            Item={
                "village_id": {"S": "village-123"},
                "date": {"S": "2024-11-10"},
                "slots_free": {"N": "1"}
            }
        )
        dynamodb.put_item(
            TableName=config.MACHINE_SLOTS_TABLE,
            Item={
                "village_id": {"S": "village-456"},
                "date": {"S": "2024-11-11"},
                "slots_free": {"N": "2"}
            }
        )

    def test_double_book_race_returns_409(self):
        """Second call for the same slot when slots_free becomes 0 should return 409."""
        from services.api.handlers.farmer_book import handler
        
        # User 1 books the only slot
        event1 = build_event(
            "POST",
            "/v1/farmer/book",
            body={
                "village_id": "village-123",
                "date": "2024-11-10",
                "idempotency_key": "key1"
            },
            role="farmer",
            sub="user-1"
        )
        res1 = handler(event1, None)
        assert res1["statusCode"] == 201

        # User 2 tries to book the same slot
        event2 = build_event(
            "POST",
            "/v1/farmer/book",
            body={
                "village_id": "village-123",
                "date": "2024-11-10",
                "idempotency_key": "key2"
            },
            role="farmer",
            sub="user-2"
        )
        res2 = handler(event2, None)
        assert res2["statusCode"] == 409
        body2 = json.loads(res2["body"])
        assert body2["error"]["message"] == "No slots remaining"
        assert body2["error"]["status"] == 409

    def test_same_idempotency_key_returns_same_booking(self):
        """Same idempotency key for the same user returns the same booking."""
        from services.api.handlers.farmer_book import handler
        
        event1 = build_event(
            "POST",
            "/v1/farmer/book",
            body={
                "village_id": "village-456",
                "date": "2024-11-11",
                "idempotency_key": "idemp-same"
            },
            role="farmer",
            sub="user-1"
        )
        res1 = handler(event1, None)
        assert res1["statusCode"] == 201
        booking1 = json.loads(res1["body"])["data"]
        
        # Call again with same idempotency key
        res2 = handler(event1, None)
        assert res2["statusCode"] == 200 # Note: returning 200 for idempotency hit, or wait, my code returns 200 for existing
        booking2 = json.loads(res2["body"])["data"]
        
        assert booking1["booking_id"] == booking2["booking_id"]

    def test_cross_user_isolation(self):
        """Different users can use the same idempotency key without colliding."""
        from services.api.handlers.farmer_book import handler
        
        event1 = build_event(
            "POST",
            "/v1/farmer/book",
            body={
                "village_id": "village-456",
                "date": "2024-11-11",
                "idempotency_key": "idemp-same"
            },
            role="farmer",
            sub="user-1"
        )
        res1 = handler(event1, None)
        assert res1["statusCode"] == 201
        booking1 = json.loads(res1["body"])["data"]
        
        event2 = build_event(
            "POST",
            "/v1/farmer/book",
            body={
                "village_id": "village-456",
                "date": "2024-11-11",
                "idempotency_key": "idemp-same"
            },
            role="farmer",
            sub="user-2"
        )
        res2 = handler(event2, None)
        assert res2["statusCode"] == 201
        booking2 = json.loads(res2["body"])["data"]
        
        assert booking1["booking_id"] != booking2["booking_id"]

    def test_get_bookings(self):
        """GET /v1/farmer/bookings returns only the caller's bookings."""
        from services.api.handlers.farmer_book import handler
        
        # User 1 books
        handler(build_event("POST", "/v1/farmer/book", body={"village_id": "village-456", "date": "2024-11-11", "idempotency_key": "k1"}, role="farmer", sub="user-1"), None)
        
        # User 2 books
        handler(build_event("POST", "/v1/farmer/book", body={"village_id": "village-456", "date": "2024-11-11", "idempotency_key": "k2"}, role="farmer", sub="user-2"), None)
        
        # Get User 1 bookings
        res1 = handler(build_event("GET", "/v1/farmer/bookings", role="farmer", sub="user-1"), None)
        assert res1["statusCode"] == 200
        data1 = json.loads(res1["body"])["data"]
        assert len(data1["bookings"]) == 1
        assert data1["bookings"][0]["user_id"] == "user-1"
