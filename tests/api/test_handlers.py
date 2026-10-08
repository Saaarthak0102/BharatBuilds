"""
Pytest stubs for API handlers.
"""

import json
import pytest


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
        # TODO: Implement with mock auth context
        pass

    def test_plan_validates_crop_stage(self):
        """Should return 400 for invalid crop_stage."""
        # TODO: Implement
        pass

    def test_plan_returns_mock_result(self):
        """Should return a valid PlanResult in mock mode."""
        # TODO: Implement with mock auth context
        pass


class TestReportsEndpoint:
    """Tests for POST /v1/reports and GET /v1/reports."""

    def test_submit_report_validates_category(self):
        """Should return 400 for invalid category."""
        # TODO: Implement
        pass

    def test_submit_report_validates_location(self):
        """Should return 400 if location is missing."""
        # TODO: Implement
        pass

    def test_get_reports_returns_list(self):
        """Should return a list of reports."""
        # TODO: Implement
        pass


class TestAskEndpoint:
    """Tests for POST /v1/ask."""

    def test_ask_rejects_non_preset_questions(self):
        """Should return 400 for questions not in the preset list."""
        # TODO: Implement
        pass

    def test_ask_returns_answer_for_preset_question(self):
        """Should return an answer for a valid preset question."""
        # TODO: Implement
        pass


class TestProfileEndpoint:
    """Tests for POST /v1/auth/profile and GET /v1/profile."""

    def test_create_profile_requires_role(self):
        """Should return 400 if role is missing."""
        # TODO: Implement
        pass

    def test_get_profile_returns_user_data(self):
        """Should return the current user's profile."""
        # TODO: Implement
        pass
