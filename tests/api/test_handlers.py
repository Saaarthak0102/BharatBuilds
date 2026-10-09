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
        assert data["best_day"] == "2024-11-05"
        assert data["score"] == 82
        assert data["is_sample"] is True
        assert "score_breakdown" in data
        assert "tool_trace" in data
        assert "seven_day_scores" in data
        # Validate schema parity with Pydantic PlanResult model
        plan_model = PlanResult.model_validate(data)
        assert plan_model.score == 82

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

    def test_create_profile_requires_role(self):
        """Should return 400 if role is missing."""
        from services.api.handlers.profile import handler

        event = build_event(
            "POST",
            "/v1/auth/profile",
            body={"name": "Gurpreet Singh"},
            role="farmer",
        )
        result = handler(event, None)
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
        assert "role and name are required" in body["error"]["message"]

    def test_get_profile_returns_user_data(self):
        """Should return the current user's profile."""
        from services.api.handlers.profile import handler

        event = build_event(
            "GET",
            "/v1/profile",
            role="farmer",
            sub="user-farmer-001",
        )
        result = handler(event, None)
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert "data" in body
        data = body["data"]
        assert data["role"] == "farmer"
        assert data["name"] == "Gurpreet Singh"
        assert data["district"] == "Patiala"
        assert data["is_sample"] is True

    def test_create_profile_persists_to_dynamodb(self):
        """Should write profile item to DynamoDB Users table."""
        pytest.skip("DynamoDB Users table persistence is not yet implemented (handler returns mock result)")

    def test_get_profile_fetches_from_dynamodb(self):
        """Should fetch user profile from DynamoDB Users table by user_id."""
        pytest.skip("DynamoDB Users table fetch is not yet implemented (handler returns mock result)")


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
