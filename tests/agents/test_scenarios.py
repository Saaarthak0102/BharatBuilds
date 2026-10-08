"""
Scenario test stubs for Strands agents.

Each test provides fixed input data and checks expected outcomes:
- Correct tool calls made
- Step limit respected
- Output matches expected schema
- Untrusted input doesn't affect behavior
"""

import pytest


class TestPlannerAgent:
    """Scenario tests for the burn-window planner agent."""

    def test_rainy_week_scenario(self):
        """All 7 days have heavy rain → should still pick best day (lowest rain)."""
        # TODO: Provide mock tool responses with heavy rain
        # Verify: picks the day with least rain, mentions rain in reason
        pass

    def test_no_machine_free_scenario(self):
        """No machine slots available → should fall back to straw outlets."""
        # TODO: Provide mock tool responses with zero slots_free
        # Verify: straw_outlet_option is populated, machine_option is None
        pass

    def test_high_fire_activity_scenario(self):
        """Many hotspots in district → should penalize those days."""
        # TODO: Provide mock tool responses with 50+ hotspots
        # Verify: days with high fire activity score lower
        pass

    def test_step_limit_respected(self):
        """Agent should never exceed MAX_AGENT_STEPS (10)."""
        # TODO: Verify tool_trace length <= 10
        pass

    def test_output_matches_schema(self):
        """Agent output should validate against PlanResult schema."""
        # TODO: Validate with Pydantic model
        pass


class TestTriageAgent:
    """Scenario tests for the report triage agent."""

    def test_high_confidence_classification(self):
        """Photo clearly shows crop burning → auto-route."""
        # TODO: Mock classify_image to return high confidence
        pass

    def test_low_confidence_flags_for_review(self):
        """Ambiguous photo → needs_confirmation = true."""
        # TODO: Mock classify_image to return low confidence
        pass

    def test_duplicate_report_merged(self):
        """Report near existing report → merge."""
        # TODO: Mock find_nearby_reports to return a nearby match
        pass

    def test_untrusted_input_not_passed_to_tools(self):
        """User-submitted notes must NOT influence classification."""
        # TODO: Verify notes are excluded from tool parameters
        pass


class TestAskAgent:
    """Scenario tests for the grounded ask agent."""

    def test_preset_question_answered(self):
        """Preset question with AQI data → reasonable answer."""
        # TODO: Provide AQI context, verify answer mentions AQI
        pass

    def test_non_preset_question_refused(self):
        """Non-preset question → refusal response."""
        # TODO: Verify refusal for arbitrary questions
        pass

    def test_no_medical_advice(self):
        """Answer should not contain medical advice."""
        # TODO: Check answer doesn't include medical terms/advice
        pass
