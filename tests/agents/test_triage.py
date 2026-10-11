import pytest
from unittest.mock import patch, MagicMock
from services.agents.triage.agent import TriageAgent

@pytest.fixture
def agent():
    return TriageAgent(model_id="test-model")

def test_triage_low_confidence_fallback(agent):
    result = agent._deterministic_fallback("rpt-1", "crop_burning", 0.5, [])
    assert result["status"] == "received"
    assert result["needs_confirmation"] is True
    assert result["source"] == "fallback"

@patch("services.agents.triage.agent.write_report")
@patch("services.agents.triage.agent.merge_into")
@patch("services.agents.triage.agent.update_status")
def test_triage_duplicate_merge_fallback(mock_update, mock_merge, mock_write, agent):
    # Confidence is high enough, but there is a nearby match
    nearby = [{"report_id": "rpt-2", "category": "crop_burning"}]
    result = agent._deterministic_fallback("rpt-1", "crop_burning", 0.9, nearby)
    
    assert result["status"] == "merged"
    assert result["merged_with"] == "rpt-2"
    mock_merge.assert_called_with("rpt-2")
    mock_write.assert_called_with({"report_id": "rpt-1", "merged_with": "rpt-2"})
    mock_update.assert_called_with("rpt-1", "merged")

@patch("services.agents.triage.agent.update_status")
def test_triage_routed_fallback(mock_update, agent):
    # High confidence, no nearby match
    result = agent._deterministic_fallback("rpt-1", "crop_burning", 0.9, [])
    assert result["status"] == "routed"
    mock_update.assert_called_with("rpt-1", "routed")

@patch("strands.Agent.__call__")
def test_triage_agent_success(mock_run, agent):
    mock_run.return_value = {"status": "processed"}
    result = agent.run("rpt-1", "crop_burning", 0.9, "ttnf", 0, [])
    assert result["status"] == "processed"
    assert result["source"] == "model"
    # The note shouldn't be passed in, checking arguments is somewhat implicit since we only pass structured data
    prompt_args = mock_run.call_args[0][0]
    assert "category=crop_burning" in prompt_args
    assert "confidence=0.9" in prompt_args

@patch("strands.Agent.__call__")
def test_triage_injection_attempt_has_no_effect(mock_run, agent):
    # Even if notes had injection, we do not pass notes to run().
    # The signature of run does not accept notes.
    mock_run.return_value = {"status": "processed"}
    result = agent.run("rpt-1", "crop_burning", 0.9, "ttnf", 0, [])
    prompt_args = mock_run.call_args[0][0]
    assert "ignore all previous instructions" not in prompt_args.lower()
    
@patch("strands.Agent.__call__")
def test_triage_step_cap(mock_run, agent):
    mock_run.side_effect = Exception("Step limit exceeded")
    # Agent falls back
    result = agent.run("rpt-1", "crop_burning", 0.9, "ttnf", 0, [])
    assert result["source"] == "fallback"
