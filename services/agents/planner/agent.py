"""
Burn-window Planner Agent (Strands Agents SDK)

The planner is the star agent. It:
1. Gathers weather, wind, fire, and sowing data via tools
2. Runs the deterministic scorer over the next 7 days
3. Picks the best day and checks machine availability
4. Re-plans if no machine is free (next-best day or straw outlet fallback)
5. Explains the choice in the farmer's preferred language

Max steps: 10 (configurable via MAX_AGENT_STEPS)
"""

import json
from typing import Optional
from pydantic import BaseModel, Field
import contextvars
from datetime import datetime, timezone, timedelta

from strands import Agent
from strands.models import BedrockModel

from agents.common.runner import AgentRunner, StepLimitExceeded, AgentTimeout
from agents.common.model import build_model, structured_complete
from agents.planner.tools import (
    get_forecast, get_wind, get_fire_hotspots, get_sowing_window,
    find_machine_slots, find_straw_outlets,
    planner_runner_var, planner_trace_var, planner_payloads_var,
    resolve_district_from_village_or_name
)
from agents.planner.scoring import score_days, pick_best, replan, get_sowing_window_for_stage, load_scoring_config
from agents.planner.templates import get_fallback_reason
from api.common.time import today_ist, now_ist
from api.models.plan_result import PlanResult, DayScore, ToolTraceEntry
from api.models import CropStage

class AgentReasoning(BaseModel):
    """Structured output for agent reasoning explanation."""
    reason_text: str = Field(description="2-3 sentences explaining the choice in the requested language")

def run_planner(village_id: str, crop_stage: str, language: str = "en", user_id: str = "anonymous", start_date: str | None = None, end_date: str | None = None) -> tuple[dict, str]:
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

    w_start = start_date or today_ist().isoformat()
    w_end = end_date or (today_ist() + timedelta(days=6)).isoformat()
    
    try:
        model = build_model()
        agent = Agent(
            model=model,
            tools=[get_forecast, get_wind, get_fire_hotspots, get_sowing_window, find_machine_slots, find_straw_outlets],
            system_prompt=open("services/agents/prompts/planner.md").read()
        )
        
        # Resolve village -> district in code (from seed)
        dist_name = resolve_district_from_village_or_name(village_id)
        firms_key = f"district-{dist_name.lower()}"
        outlets_district_id = dist_name.lower()

        date_instruction = f"{w_start} to {w_end}"
            
        prompt = (
            f"Gather data for village_id='{village_id}'. "
            f"Use district='{firms_key}'. "
            f"Crop stage is '{crop_stage}'. "
            f"Machine slots date range is {date_instruction}."
        )
        agent(prompt)
        
        forecast_payload = payloads.get("get_forecast")
        fire_payload = payloads.get("get_fire_hotspots")
        sowing_payload = payloads.get("get_sowing_window")
        
        if not forecast_payload or not fire_payload or not sowing_payload:
            raise ValueError("Agent failed to gather required data via tools.")
            
        forecast_7d = forecast_payload.get("forecasts", []) or forecast_payload.get("forecast", [])
        fire_counts = fire_payload.get("hotspot_count", 0)
        
        # Resolve sowing window and status using config and dates
        sw_start, sw_end, sw_status = get_sowing_window_for_stage(
            crop_stage,
            as_of=today_ist(),
            req_window={"start": w_start, "end": w_end}
        )
        sowing_window = {
            "start": sowing_payload.get("window_start") or sw_start,
            "end": sowing_payload.get("window_end") or sw_end
        }
        
        machine_slots_payload = payloads.get("find_machine_slots", {})
        machine_slots = machine_slots_payload.get("slots", [])
        
        req_window = {"start": w_start, "end": w_end}
            
        scored = score_days(forecast_7d, fire_counts, sowing_window, machine_slots, crop_stage, requested_window=req_window)
        best = pick_best(scored)
        if not best:
            raise ValueError("No feasible dates available.")
        
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
        # Always resolve top 3 ranked straw outlets deterministically
        straw_payload = payloads.get("find_straw_outlets")
        if not straw_payload:
            try:
                res_str = find_straw_outlets(village_id)
                straw_payload = json.loads(res_str)
            except Exception:
                straw_payload = {}

        ranked_outlets = straw_payload.get("top_3") or straw_payload.get("outlets", [])
        straw_opt = None
        if not machine_opt and ranked_outlets:
            o = ranked_outlets[0]
            straw_opt = {
                "outlet_id": o["outlet_id"],
                "facility_type": o["facility_type"],
                "name": o["name"],
                "contact_hint": o.get("contact_hint", "Contact your nearest depot or aggregator"),
                "is_sample": o.get("is_sample", True)
            }

        scoring_cfg = load_scoring_config()
        min_ideal_score = scoring_cfg.get("min_ideal_score", 60)
        no_ideal_day = best["score"] < min_ideal_score

        if sw_status == "before":
            message_key = "sowing_window_before"
        elif sw_status == "after":
            message_key = "sowing_window_after"
        elif no_ideal_day:
            message_key = "no_ideal_day"
        else:
            message_key = "ideal_day_found"

        reason_prompt = (
            f"Write a 2-3 sentence explanation for the farmer in {language}. "
            f"The best day is {best['date']} with score {best['score']}. "
            f"Sowing window status is {sw_status}. No ideal day flag is {no_ideal_day}. "
            f"Machine option: {machine_opt}. Straw option: {straw_opt}. "
            f"Top 3 ranked straw outlets: {ranked_outlets[:3]}. "
            f"The ranking is determined deterministically by distance and residue match; only explain the choices."
        )
        
        reasoning = structured_complete(AgentReasoning, reason_prompt)
        is_sample = any(t.get("is_sample") for t in trace) if trace else True
        
        result = PlanResult(
            best_day=best["date"],
            score=best["score"],
            score_breakdown=best["breakdown"],
            machine_option=machine_opt,
            straw_outlet_option=straw_opt,
            straw_outlets=ranked_outlets[:3],
            reason_text=reasoning.reason_text,
            tool_trace=trace,
            seven_day_scores=[DayScore(date=d["date"], score=d["score"]) for d in scored],
            is_sample=is_sample,
            window_start=w_start,
            window_end=w_end,
            generated_at=now_ist().isoformat(),
            sowing_window_status=sw_status,
            no_ideal_day=no_ideal_day,
            message_key=message_key,
        )
        return result.model_dump(), "success"
        
    except (Exception, StepLimitExceeded, AgentTimeout) as e:
        import logging
        logging.getLogger(__name__).error("Agent run failed: %s", str(e), exc_info=True)
        return _fallback_result(village_id, crop_stage, language, str(e), trace, w_start, w_end)
    finally:
        planner_runner_var.reset(t_runner)
        planner_trace_var.reset(t_trace)
        planner_payloads_var.reset(t_payloads)


def _fallback_result(village_id: str, crop_stage: str, language: str, error: str, trace: list, start_date: str | None = None, end_date: str | None = None) -> tuple[dict, str]:
    reason = get_fallback_reason(language)
    today = today_ist().isoformat()
    w_start = start_date or today
    w_end = end_date or (today_ist() + timedelta(days=6)).isoformat()
    sw_start, sw_end, sw_status = get_sowing_window_for_stage(crop_stage, as_of=today_ist(), req_window={"start": w_start, "end": w_end})
    
    scoring_cfg = load_scoring_config()
    min_ideal_score = scoring_cfg.get("min_ideal_score", 60)
    score_val = 50
    no_ideal_day = score_val < min_ideal_score

    if sw_status == "before":
        message_key = "sowing_window_before"
    elif sw_status == "after":
        message_key = "sowing_window_after"
    elif no_ideal_day:
        message_key = "no_ideal_day"
    else:
        message_key = "ideal_day_found"

    # Resolve fallback straw outlets
    try:
        res_str = find_straw_outlets(village_id)
        fallback_straw_payload = json.loads(res_str)
        fallback_ranked = fallback_straw_payload.get("top_3", []) or fallback_straw_payload.get("outlets", [])
    except Exception:
        fallback_ranked = []

    fallback_straw_opt = None
    if fallback_ranked:
        fo = fallback_ranked[0]
        fallback_straw_opt = {
            "outlet_id": fo["outlet_id"],
            "facility_type": fo["facility_type"],
            "name": fo["name"],
            "contact_hint": fo.get("contact_hint", "Contact your nearest depot or aggregator"),
            "is_sample": True
        }

    result_dict = PlanResult(
        best_day=w_start,
        score=score_val,
        score_breakdown={"sowing_window": 10, "rain_and_soil": 10, "wind": 10, "fire_activity": 10, "machine_availability": 10},
        machine_option=None,
        straw_outlet_option=fallback_straw_opt,
        straw_outlets=fallback_ranked[:3],
        reason_text=reason,
        tool_trace=trace,
        seven_day_scores=[DayScore(date=w_start, score=score_val)],
        is_sample=True,
        window_start=w_start,
        window_end=w_end,
        generated_at=now_ist().isoformat(),
        sowing_window_status=sw_status,
        no_ideal_day=no_ideal_day,
        message_key=message_key,
    ).model_dump()
    return result_dict, "fallback"
