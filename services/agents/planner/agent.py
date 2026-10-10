"""
Burn-window Planner Agent (Strands Agents SDK)

STUB ONLY — defines the agent, tools, and flow.

The planner is the star agent. It:
1. Gathers weather, wind, fire, and sowing data via tools
2. Runs the deterministic scorer over the next 7 days
3. Picks the best day and checks machine availability
4. Re-plans if no machine is free (next-best day or straw outlet fallback)
5. Explains the choice in the farmer's preferred language

Max steps: 10 (configurable via MAX_AGENT_STEPS)
"""

from typing import Optional
from pydantic import BaseModel, Field
import contextvars
from datetime import datetime, timezone

from strands import Agent
from strands.models import BedrockModel

from agents.common.runner import AgentRunner, StepLimitExceeded, AgentTimeout
from agents.common.model import build_model, structured_complete
from agents.planner.tools import (
    get_forecast, get_wind, get_fire_hotspots, get_sowing_window,
    find_machine_slots, find_straw_outlets,
    planner_runner_var, planner_trace_var, planner_payloads_var
)
from agents.planner.scoring import score_days, pick_best, replan
from agents.planner.templates import get_fallback_reason
from api.models.plan_result import PlanResult, DayScore, ToolTraceEntry
from api.models import CropStage

class AgentReasoning(BaseModel):
    """Structured output for agent reasoning explanation."""
    reason_text: str = Field(description="2-3 sentences explaining the choice in the requested language")

def run_planner(village_id: str, crop_stage: str, language: str = "en", user_id: str = "anonymous") -> tuple[dict, str]:
    """
    Run the planner agent.
    Returns: (plan_result_dict, outcome)
    """
    runner = AgentRunner()
    trace = []
    payloads = {}
    
    t_runner = planner_runner_var.set(runner)
    t_trace = planner_trace_var.set(trace)
    t_payloads = planner_payloads_var.set(payloads)
    
    try:
        model = build_model()
        agent = Agent(
            model=model,
            tools=[get_forecast, get_wind, get_fire_hotspots, get_sowing_window, find_machine_slots, find_straw_outlets],
            system_prompt=open("services/agents/prompts/planner.md").read()
        )
        
        prompt = (
            f"Gather data for village_id='{village_id}'. "
            f"Use district='{village_id}-district'. "
            f"Crop stage is '{crop_stage}'. "
            f"Machine slots date range is today to 7 days from now."
        )
        agent(prompt)
        
        forecast_payload = payloads.get("get_forecast")
        fire_payload = payloads.get("get_fire_hotspots")
        sowing_payload = payloads.get("get_sowing_window")
        
        if not forecast_payload or not fire_payload or not sowing_payload:
            raise ValueError("Agent failed to gather required data via tools.")
            
        forecast_7d = forecast_payload.get("forecasts", [])
        fire_counts = fire_payload.get("hotspot_count", 0)
        sowing_window = {
            "start": sowing_payload.get("window_start", ""),
            "end": sowing_payload.get("window_end", "")
        }
        
        machine_slots_payload = payloads.get("find_machine_slots", {})
        machine_slots = machine_slots_payload.get("slots", [])
        
        scored = score_days(forecast_7d, fire_counts, sowing_window, machine_slots, crop_stage)
        best = pick_best(scored)
        
        if not best.get("machine_available"):
            best, _ = replan(scored, no_machine=True)
            
        machine_opt = None
        straw_opt = None
        
        if best.get("machine_available") and machine_slots:
            for m in machine_slots:
                if m["date"] == best["date"]:
                    machine_opt = {
                        "slot_id": m["slot_id"],
                        "machine_type": m["machine_type"],
                        "owner_label": m["owner_label"],
                        "date": m["date"],
                        "is_sample": m.get("is_sample", True)
                    }
                    break
        else:
            straw_payload = payloads.get("find_straw_outlets", {})
            outlets = straw_payload.get("outlets", [])
            if outlets:
                o = outlets[0]
                straw_opt = {
                    "outlet_id": o["outlet_id"],
                    "facility_type": o["facility_type"],
                    "name": o["name"],
                    "contact_hint": o.get("contact_hint", "Contact your nearest depot"),
                    "is_sample": o.get("is_sample", True)
                }

        reason_prompt = (
            f"Write a 2-3 sentence explanation for the farmer in {language}. "
            f"The best day is {best['date']} with score {best['score']}. "
            f"Machine option: {machine_opt}. Straw option: {straw_opt}."
        )
        
        reasoning = structured_complete(AgentReasoning, reason_prompt)
        is_sample = any(t.get("is_sample") for t in trace) if trace else True
        
        result = PlanResult(
            best_day=best["date"],
            score=best["score"],
            score_breakdown=best["breakdown"],
            machine_option=machine_opt,
            straw_outlet_option=straw_opt,
            reason_text=reasoning.reason_text,
            tool_trace=trace,
            seven_day_scores=[DayScore(date=d["date"], score=d["score"]) for d in scored],
            is_sample=is_sample
        )
        return result.model_dump(), "success"
        
    except (Exception, StepLimitExceeded, AgentTimeout) as e:
        import logging
        logging.getLogger(__name__).error("Agent run failed: %s", str(e), exc_info=True)
        return _fallback_result(village_id, crop_stage, language, str(e), trace)
    finally:
        planner_runner_var.reset(t_runner)
        planner_trace_var.reset(t_trace)
        planner_payloads_var.reset(t_payloads)


def _fallback_result(village_id: str, crop_stage: str, language: str, error: str, trace: list) -> tuple[dict, str]:
    reason = get_fallback_reason(language)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result_dict = PlanResult(
        best_day=today,
        score=50,
        score_breakdown={"sowing_window": 10, "rain_and_soil": 10, "wind": 10, "fire_activity": 10, "machine_availability": 10},
        machine_option=None,
        straw_outlet_option=None,
        reason_text=reason,
        tool_trace=trace,
        seven_day_scores=[DayScore(date=today, score=50)],
        is_sample=True
    ).model_dump()
    return result_dict, "fallback"
