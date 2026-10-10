"""
Pytest assertions for API handlers.
"""

import json
import pytest
from tests.conftest import build_event


class TestHealthEndpoint:
    """Tests for GET /v1/health."""

    def test_health_returns_200(self):
        """Health check should return 200 with status healthy."""
        from services.api.handlers.health import handler

        result = handler({}, None)
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert body["data"]["status"] == "healthy"


class TestFarmerPlanEndpoint:
    """Tests for POST /v1/farmer/plan."""

    def test_plan_requires_village_id(self):
        """Should return 400 if village_id is missing."""
        from services.api.handlers.farmer_plan import handler

        event = build_event(
            "POST",
            "/v1/farmer/plan",
            body={"crop_stage": "harvested"},
            role="farmer",
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
        assert "village_id and crop_stage are required" in body["error"]["message"]

    def test_plan_validates_crop_stage(self):
        """Should return 400 for invalid crop_stage."""
        from services.api.handlers.farmer_plan import handler

        event = build_event(
            "POST",
            "/v1/farmer/plan",
            body={"village_id": "village-patiala-001", "crop_stage": "invalid_crop_stage"},
            role="farmer",
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
        assert "crop_stage must be one of" in body["error"]["message"]

    def test_plan_returns_mock_result(self):
        """Should return a valid PlanResult in mock mode."""
        from services.api.handlers.farmer_plan import handler
        from models.plan_result import PlanResult

        event = build_event(
            "POST",
            "/v1/farmer/plan",
            body={"village_id": "village-patiala-001", "crop_stage": "harvested", "language": "en"},
            role="farmer",
        )
        result = handler(event, None)
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert "data" in body
        data = body["data"]
        from datetime import datetime, timezone
        expected_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        assert data["best_day"] == expected_date
        assert data["score"] == 50
        assert data["is_sample"] is True
        assert "score_breakdown" in data
        assert "tool_trace" in data
        assert "seven_day_scores" in data
        # Validate schema parity with Pydantic PlanResult model
        plan_model = PlanResult.model_validate(data)
        assert plan_model.score == 50

    def test_plan_non_farmer_access(self):
        """Should return 403 Forbidden when a non-farmer caller requests a plan."""
        from services.api.handlers.farmer_plan import handler

        event = build_event(
            "POST",
            "/v1/farmer/plan",
            body={"village_id": "village-patiala-001", "crop_stage": "harvested"},
            role="citizen",
        )
        result = handler(event, None)
        assert result["statusCode"] == 403
        body = json.loads(result["body"])
        assert "error" in body

    def test_plan_live_strands_agent(self):
        """Should invoke live Strands planner agent with real weather and fire tools."""
        pytest.skip("Live Strands planner agent integration is not yet implemented (handler returns mock result)")


class TestReportsEndpoint:
    """Tests for POST /v1/reports and GET /v1/reports."""

    def test_submit_report_validates_category(self):
        """Should return 400 for invalid category."""
        from services.api.handlers.reports import handler

        event = build_event(
            "POST",
            "/v1/reports",
            body={
                "photo_key": "photos/test-001.jpg",
                "location": {"lat": 28.65, "lng": 77.25},
                "category": "invalid_burning_type",
            },
            role="citizen",
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
        assert "category must be one of" in body["error"]["message"]

    def test_submit_report_validates_location(self):
        """Should return 400 if location is missing."""
        from services.api.handlers.reports import handler

        event = build_event(
            "POST",
            "/v1/reports",
            body={
                "photo_key": "photos/test-001.jpg",
                "category": "crop_burning",
            },
            role="citizen",
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
        assert "photo_key, location, and category are required" in body["error"]["message"]

    def test_get_reports_returns_list(self):
        """Should return a list of reports."""
        from services.api.handlers.reports import handler

        event = build_event("GET", "/v1/reports", role="citizen")
        result = handler(event, None)
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert "data" in body
        data = body["data"]
        assert "reports" in data
        assert isinstance(data["reports"], list)
        assert len(data["reports"]) > 0
        assert data["is_sample"] is True

    def test_reports_requires_auth(self):
        """Should return 401 Unauthorized when unauthenticated caller accesses reports."""
        from services.api.handlers.reports import handler

        event = build_event("GET", "/v1/reports", sub=None)
        result = handler(event, None)
        assert result["statusCode"] == 401
        body = json.loads(result["body"])
        assert "error" in body

    def test_submit_report_persists_to_dynamodb(self):
        """Should persist submitted report item into DynamoDB Reports table."""
        pytest.skip("DynamoDB persistence in reports handler is not yet implemented (handler returns mock result)")

    def test_get_reports_queries_geohash_index(self):
        """Should query DynamoDB geohash-index GSI by bbox parameter."""
        pytest.skip("DynamoDB GSI geohash query is not yet implemented (handler returns mock result)")


class TestAskEndpoint:
    """Tests for POST /v1/ask."""

    def test_ask_rejects_non_preset_questions(self):
        """Should return 400 for questions not in the preset list."""
        from services.api.handlers.ask import handler

        event = build_event(
            "POST",
            "/v1/ask",
            body={"question": "What is the meaning of life?", "area_id": "ward-delhi-001"},
            role="citizen",
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
        assert "Only preset questions are allowed" in body["error"]["message"]

    def test_ask_returns_answer_for_preset_question(self):
        """Should return an answer for a valid preset question."""
        from services.api.handlers.ask import handler

        event = build_event(
            "POST",
            "/v1/ask",
            body={
                "question": "Is it okay for kids to play outside today?",
                "area_id": "ward-delhi-001",
            },
            role="citizen",
        )
        result = handler(event, None)
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert "data" in body
        data = body["data"]
        assert data["question"] == "Is it okay for kids to play outside today?"
        assert "answer" in data
        assert len(data["answer"]) > 0
        assert "sources" in data
        assert data["is_sample"] is True

    def test_ask_non_citizen_access(self):
        """Should return 403 Forbidden when a non-citizen caller accesses ask."""
        from services.api.handlers.ask import handler

        event = build_event(
            "POST",
            "/v1/ask",
            body={
                "question": "Is it okay for kids to play outside today?",
                "area_id": "ward-delhi-001",
            },
            role="farmer",
        )
        result = handler(event, None)
        assert result["statusCode"] == 403
        body = json.loads(result["body"])
        assert "error" in body

    def test_ask_live_bedrock_agent(self):
        """Should call Bedrock Strands agent with dynamically fetched AQI context."""
        pytest.skip("Live Bedrock agent integration for grounded Ask is not yet implemented (handler returns mock preset answers)")


class TestProfileEndpoint:
    """Tests for POST /v1/auth/profile and GET /v1/profile."""

    def test_create_profile_happy_path_farmer(self):
        """Should create farmer profile with valid role-specific fields and persist to DynamoDB."""
        from services.api.handlers.profile import handler
        import boto3

        sub = "farmer-user-001"
        event = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "name": "Gurpreet Singh",
                "phone": "+91-98765-43210",
                "village": "village-patiala-001",
                "district": "Patiala",
                "land_size": 12.5,
                "crop": "paddy",
                "crop_stage": "harvested",
                "has_own_machine": True,
                "language": "pa",
            },
            role="farmer",
            sub=sub,
        )
        result = handler(event, None)
        assert result["statusCode"] == 201
        body = json.loads(result["body"])
        assert "data" in body
        data = body["data"]
        assert data["user_id"] == sub
        assert data["role"] == "farmer"
        assert data["name"] == "Gurpreet Singh"
        assert data["village_id"] == "village-patiala-001"
        assert data["district"] == "Patiala"
        assert data["land_size_acres"] == 12.5
        assert data["main_crop"] == "paddy"
        assert data["crop_stage"] == "harvested"
        assert data["has_own_machine"] is True
        assert data["language"] == "pa"
        assert "created_at" in data

        # Verify DynamoDB directly
        dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
        table = dynamodb.Table("saans-users-dev")
        item = table.get_item(Key={"user_id": sub})["Item"]
        assert item["user_id"] == sub
        assert item["role"] == "farmer"
        assert item["district"] == "Patiala"

        # Verify GET /v1/profile returns the caller's own profile
        get_event = build_event("GET", "/v1/profile", role="farmer", sub=sub)
        get_result = handler(get_event, None)
        assert get_result["statusCode"] == 200
        get_body = json.loads(get_result["body"])
        assert get_body["data"]["user_id"] == sub
        assert get_body["data"]["name"] == "Gurpreet Singh"

    def test_create_profile_happy_path_citizen(self):
        """Should create citizen profile with valid role-specific fields and persist to DynamoDB."""
        from services.api.handlers.profile import handler
        import boto3

        sub = "citizen-user-002"
        event = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "name": "Priya Sharma",
                "email": "priya@example.com",
                "area": "ward-east-delhi-001",
                "area_name": "Anand Vihar, East Delhi",
                "language": "en",
                "alert_opt_in": True,
                "alert_threshold": 250,
                "household_note": "Elderly parents at home",
                "has_kids": True,
                "has_elderly": True,
            },
            role="citizen",
            sub=sub,
        )
        result = handler(event, None)
        assert result["statusCode"] == 201
        body = json.loads(result["body"])
        assert "data" in body
        data = body["data"]
        assert data["user_id"] == sub
        assert data["role"] == "citizen"
        assert data["name"] == "Priya Sharma"
        assert data["area_id"] == "ward-east-delhi-001"
        assert data["alert_opt_in"] is True
        assert data["alert_threshold"] == 250
        assert data["household_note"] == "Elderly parents at home"
        assert data["has_kids"] is True
        assert data["has_elderly"] is True
        assert data["language"] == "en"

        # Verify DynamoDB directly
        dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
        table = dynamodb.Table("saans-users-dev")
        item = table.get_item(Key={"user_id": sub})["Item"]
        assert item["user_id"] == sub
        assert item["role"] == "citizen"
        assert item["area_id"] == "ward-east-delhi-001"

        # Verify GET /v1/profile returns caller's own item
        get_event = build_event("GET", "/v1/profile", role="citizen", sub=sub)
        get_result = handler(get_event, None)
        assert get_result["statusCode"] == 200
        get_body = json.loads(get_result["body"])
        assert get_body["data"]["user_id"] == sub
        assert get_body["data"]["household_note"] == "Elderly parents at home"

    def test_body_trying_to_override_role_or_user_id(self):
        """Should reject request body attempting to supply role or user_id."""
        from services.api.handlers.profile import handler
        import boto3

        sub = "real-caller-003"
        malicious_user_id = "victim-user-999"

        # Farmer caller trying to override role and user_id in body
        event = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "role": "citizen",
                "user_id": malicious_user_id,
                "village": "village-patiala-001",
                "district": "Patiala",
                "land_size": 10.0,
                "crop": "paddy",
                "crop_stage": "standing",
            },
            role="farmer",
            sub=sub,
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
        assert body["error"]["code"] == "BadRequest"
        assert "user_id and role must not be provided in request body" in body["error"]["message"]

        # Ensure no record was written for victim-user-999 or real-caller-003
        dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
        table = dynamodb.Table("saans-users-dev")
        assert "Item" not in table.get_item(Key={"user_id": malicious_user_id})
        assert "Item" not in table.get_item(Key={"user_id": sub})

        # Citizen caller trying to override user_id only
        event2 = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "user_id": malicious_user_id,
                "area": "ward-east-delhi-001",
            },
            role="citizen",
            sub=sub,
        )
        result2 = handler(event2, None)
        assert result2["statusCode"] == 400
        body2 = json.loads(result2["body"])
        assert "error" in body2

    def test_wrong_role_fields_rejected(self):
        """Should reject payloads with fields belonging to the wrong role or unknown fields."""
        from services.api.handlers.profile import handler

        # Farmer caller sending citizen fields (area_id, household_note, alert_threshold)
        farmer_event = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "village": "village-patiala-001",
                "district": "Patiala",
                "land_size": 10.0,
                "crop": "paddy",
                "crop_stage": "harvested",
                "area_id": "ward-123",
                "alert_threshold": 300,
            },
            role="farmer",
            sub="farmer-sub-bad",
        )
        result = handler(farmer_event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
        assert "area_id" in body["error"]["message"] or "Extra inputs" in body["error"]["message"]

        # Citizen caller sending farmer fields (village_id, crop, land_size_acres)
        citizen_event = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "area": "ward-east-delhi-001",
                "district": "Patiala",
                "crop": "paddy",
                "land_size": 15.0,
            },
            role="citizen",
            sub="citizen-sub-bad",
        )
        result2 = handler(citizen_event, None)
        assert result2["statusCode"] == 400
        body2 = json.loads(result2["body"])
        assert "error" in body2

        # Unknown arbitrary fields rejected
        unknown_event = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "village": "village-patiala-001",
                "district": "Patiala",
                "land_size": 10.0,
                "crop": "paddy",
                "crop_stage": "harvested",
                "completely_unknown_field": "some_value",
            },
            role="farmer",
            sub="farmer-sub-unknown",
        )
        result3 = handler(unknown_event, None)
        assert result3["statusCode"] == 400
        body3 = json.loads(result3["body"])
        assert "error" in body3

    def test_repeat_post_idempotent_preserves_created_at(self):
        """Repeat POST should update fields while strictly preserving original created_at."""
        from services.api.handlers.profile import handler

        sub = "repeat-farmer-004"
        event1 = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "village": "village-patiala-001",
                "district": "Patiala",
                "land_size": 10.0,
                "crop": "paddy",
                "crop_stage": "harvested",
                "language": "pa",
            },
            role="farmer",
            sub=sub,
        )
        res1 = handler(event1, None)
        assert res1["statusCode"] == 201
        body1 = json.loads(res1["body"])
        original_created_at = body1["data"]["created_at"]
        assert original_created_at

        # Repeat POST with updated fields (different language and land size)
        event2 = build_event(
            "POST",
            "/v1/auth/profile",
            body={
                "village": "village-patiala-001",
                "district": "Patiala",
                "land_size": 25.0,
                "crop": "paddy",
                "crop_stage": "harvested",
                "language": "hi",
            },
            role="farmer",
            sub=sub,
        )
        res2 = handler(event2, None)
        assert res2["statusCode"] == 200
        body2 = json.loads(res2["body"])
        data2 = body2["data"]
        assert data2["land_size_acres"] == 25.0
        assert data2["language"] == "hi"
        assert data2["created_at"] == original_created_at

        # Verify GET /v1/profile returns the preserved created_at
        get_res = handler(build_event("GET", "/v1/profile", role="farmer", sub=sub), None)
        assert get_res["statusCode"] == 200
        get_data = json.loads(get_res["body"])["data"]
        assert get_data["created_at"] == original_created_at
        assert get_data["land_size_acres"] == 25.0

    def test_get_of_someone_else_impossible(self):
        """GET /v1/profile must return only caller's own profile and cannot access other users."""
        from services.api.handlers.profile import handler

        user_a = "caller-user-a"
        user_b = "other-user-b"

        # Create Profile for User A
        handler(
            build_event(
                "POST",
                "/v1/auth/profile",
                body={
                    "name": "User Alpha",
                    "village": "village-a",
                    "district": "District A",
                    "land_size": 5.0,
                    "crop": "paddy",
                    "crop_stage": "standing",
                },
                role="farmer",
                sub=user_a,
            ),
            None,
        )

        # Create Profile for User B
        handler(
            build_event(
                "POST",
                "/v1/auth/profile",
                body={
                    "name": "User Beta",
                    "area": "ward-b",
                },
                role="citizen",
                sub=user_b,
            ),
            None,
        )

        # User A calls GET /v1/profile (even attempting query param ?user_id=other-user-b)
        get_event_a = build_event(
            "GET",
            "/v1/profile",
            query={"user_id": user_b, "sub": user_b},
            role="farmer",
            sub=user_a,
        )
        res_a = handler(get_event_a, None)
        assert res_a["statusCode"] == 200
        data_a = json.loads(res_a["body"])["data"]
        assert data_a["user_id"] == user_a
        assert data_a["name"] == "User Alpha"
        assert data_a["user_id"] != user_b

        # User B calls GET /v1/profile
        get_event_b = build_event("GET", "/v1/profile", role="citizen", sub=user_b)
        res_b = handler(get_event_b, None)
        assert res_b["statusCode"] == 200
        data_b = json.loads(res_b["body"])["data"]
        assert data_b["user_id"] == user_b
        assert data_b["name"] == "User Beta"

    def test_get_profile_not_found_returns_standard_error(self):
        """GET /v1/profile for nonexistent user must return 404 with standard error shape."""
        from services.api.handlers.profile import handler

        event = build_event("GET", "/v1/profile", role="citizen", sub="user-unregistered-999")
        result = handler(event, None)
        assert result["statusCode"] == 404
        body = json.loads(result["body"])
        assert "error" in body
        error = body["error"]
        assert error["status"] == 404
        assert error["code"] == "NotFound"
        assert "not found" in error["message"].lower()


class TestStrawOutletsEndpoint:
    """Tests for GET /v1/farmer/straw-outlets."""

    def test_straw_outlets_valid_district(self):
        """Should return 200 and matching seed outlets for a valid district."""
        from services.api.handlers.straw_outlets import handler

        event = build_event(
            "GET",
            "/v1/farmer/straw-outlets",
            query={"district": "patiala"},
            role="farmer",
        )
        result = handler(event, None)
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert "data" in body
        data = body["data"]
        assert data["district"] == "patiala"
        assert data["is_sample"] is True
        assert isinstance(data["outlets"], list)
        assert len(data["outlets"]) == 2
        assert all(o["district_id"] == "patiala" for o in data["outlets"])
        assert all(o.get("is_sample") is True for o in data["outlets"])

    def test_straw_outlets_missing_district(self):
        """Should return 400 validation error when district query parameter is missing."""
        from services.api.handlers.straw_outlets import handler

        event = build_event(
            "GET",
            "/v1/farmer/straw-outlets",
            query=None,
            role="farmer",
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body

    def test_straw_outlets_unsupported_district(self):
        """Should return 400 validation error for an unsupported district without silent fallback."""
        from services.api.handlers.straw_outlets import handler

        event = build_event(
            "GET",
            "/v1/farmer/straw-outlets",
            query={"district": "unsupported_district_xyz"},
            role="farmer",
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body

    def test_straw_outlets_non_farmer_access(self):
        """Should return 403 Forbidden when a non-farmer caller requests straw outlets."""
        from services.api.handlers.straw_outlets import handler

        event = build_event(
            "GET",
            "/v1/farmer/straw-outlets",
            query={"district": "patiala"},
            role="citizen",
        )
        result = handler(event, None)
        assert result["statusCode"] == 403
        body = json.loads(result["body"])
        assert "error" in body
