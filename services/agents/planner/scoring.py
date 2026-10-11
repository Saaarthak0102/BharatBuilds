import os
import yaml
from datetime import datetime, date

def load_scoring_config() -> dict:
    """Load scoring weights from YAML config."""
    config_path = os.path.join(os.path.dirname(__file__), "scoring_config.yaml")
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def get_sowing_window_for_stage(
    crop_stage: str,
    as_of: date | None = None,
    config: dict | None = None,
    req_window: dict | None = None,
) -> tuple[str, str, str]:
    """
    Returns (window_start_iso, window_end_iso, sowing_window_status).
    sowing_window_status is one of: 'inside', 'before', 'after'.
    Sowing windows go in scoring_config.yaml as month/day ranges per crop stage (no year),
    rolling to next year if past.
    """
    if config is None:
        config = load_scoring_config()

    from api.common.time import today_ist
    ref_date = as_of or today_ist()

    stages = config.get("sowing_windows", {}).get("stages", {})
    stage_info = stages.get(crop_stage, {"start": "10-01", "end": "11-15"})
    start_md = stage_info.get("start", "10-01")
    end_md = stage_info.get("end", "11-15")

    sm, sd = map(int, start_md.split("-"))
    em, ed = map(int, end_md.split("-"))

    cur_year = ref_date.year
    start_dt = date(cur_year, sm, sd)
    end_dt = date(cur_year, em, ed)

    # Check if window for current year is in the past
    # "rolling to next year if past"
    if ref_date > end_dt:
        if (ref_date - end_dt).days <= 45:
            status = "after"
            return start_dt.isoformat(), end_dt.isoformat(), status
        else:
            start_dt = date(cur_year + 1, sm, sd)
            end_dt = date(cur_year + 1, em, ed)

    check_start = req_window.get("start", ref_date.isoformat()) if req_window else ref_date.isoformat()
    check_end = req_window.get("end", ref_date.isoformat()) if req_window else ref_date.isoformat()

    sw_start_str = start_dt.isoformat()
    sw_end_str = end_dt.isoformat()

    if check_end < sw_start_str:
        status = "before"
    elif check_start > sw_end_str:
        status = "after"
    else:
        status = "inside"

    return sw_start_str, sw_end_str, status

def score_days(
    forecast_7d: list[dict],
    fire_counts: int,
    sowing_window: dict,
    machine_slots: list[dict],
    crop_stage: str,
    config: dict | None = None,
    requested_window: dict | None = None
) -> list[dict]:
    """
    Score the next 7 days deterministically.
    No network, no AWS, no model.
    """
    if config is None:
        config = load_scoring_config()
        
    rules = config.get("rules", {})
    
    # Sowing window rules
    sw_rules = rules.get("sowing_window", {})
    sw_start = sowing_window.get("start", "1970-01-01")
    sw_end = sowing_window.get("end", "2999-12-31")
    
    req_start = requested_window.get("start", "1970-01-01") if requested_window else "1970-01-01"
    req_end = requested_window.get("end", "2999-12-31") if requested_window else "2999-12-31"
    
    # Rain rules
    r_rules = rules.get("rain", {})
    
    # Wind rules
    w_rules = rules.get("wind", {})
    
    # Fire rules
    f_rules = rules.get("fire", {})
    f_score = 0
    if fire_counts < f_rules.get("threshold_low", 5):
        f_score = f_rules.get("score_low", 15)
    elif fire_counts < f_rules.get("threshold_moderate", 20):
        f_score = f_rules.get("score_moderate", 10)
    elif fire_counts < f_rules.get("threshold_high", 50):
        f_score = f_rules.get("score_high_max", 5)
    else:
        f_score = f_rules.get("score_high_over", 0)

    # Machine slots mapping
    m_rules = rules.get("machine", {})
    slots_by_date = {m["date"]: m["slots_free"] for m in machine_slots}

    scored_days = []
    
    for day in forecast_7d:
        date = day.get("date")
        if not (req_start <= date <= req_end):
            continue
        
        # Sowing window score
        is_in_window = sw_start <= date <= sw_end
        sw_score = sw_rules.get("bonus_inside", 25) if is_in_window else 0
        
        # Rain score
        rain = day.get("precipitation_sum", 0.0)
        if rain < r_rules.get("threshold_light_mm", 2.0):
            r_score = r_rules.get("score_light", 20)
        elif rain < r_rules.get("threshold_moderate_mm", 10.0):
            r_score = r_rules.get("score_moderate", 12)
        elif rain < r_rules.get("threshold_heavy_mm", 25.0):
            r_score = r_rules.get("score_heavy_max", 5)
        else:
            r_score = r_rules.get("score_heavy_over", 0)
            
        # Wind score
        wind = day.get("wind_speed_10m_max", 0.0)
        toward_city = day.get("carries_toward_city", False)
        
        if wind < w_rules.get("threshold_safe_kmh", 10.0):
            w_score = w_rules.get("score_safe", 20)
        elif wind < w_rules.get("threshold_moderate_kmh", 20.0):
            w_score = w_rules.get("score_moderate", 12)
        elif wind < w_rules.get("threshold_dangerous_kmh", 35.0):
            w_score = w_rules.get("score_dangerous_max", 5)
        else:
            w_score = w_rules.get("score_dangerous_over", 0)
            
        if toward_city:
            w_score = max(0, w_score - w_rules.get("toward_city_penalty", 10))
            
        # Machine score
        slots = slots_by_date.get(date, 0)
        machine_available = slots > 0
        if slots > m_rules.get("threshold_limited", 2):
            m_score = m_rules.get("bonus_available", 20)
        elif slots > 0:
            m_score = m_rules.get("bonus_limited", 10)
        else:
            m_score = m_rules.get("bonus_none", 0)
            
        total_score = sw_score + r_score + w_score + f_score + m_score
        
        # Hard cap if outside window
        if not is_in_window:
            # We hard cap at 50 if outside the window
            total_score = min(total_score, 50)
            
        scored_days.append({
            "date": date,
            "score": total_score,
            "breakdown": {
                "sowing_window": sw_score,
                "rain_and_soil": r_score,
                "wind": w_score,
                "fire_activity": f_score,
                "machine_availability": m_score
            },
            "machine_available": machine_available
        })
        
    return scored_days

def pick_best(scored: list[dict]) -> dict:
    """
    Returns the best day from a list of scored days.
    Tie-break determinism: highest score first, then earliest date.
    """
    if not scored:
        return None
    return sorted(scored, key=lambda x: (-x["score"], x["date"]))[0]

def replan(scored: list[dict], no_machine: bool) -> tuple[dict, bool]:
    """
    Returns (best_day_dict, fallback_flag).
    If no_machine is True (meaning we want a machine but our best day doesn't have one),
    we try to find the next best day that HAS a machine.
    If none found, we return the overall best day and flag True (straw-outlet fallback).
    """
    if not scored:
        return None, False
        
    best_overall = pick_best(scored)
    
    if not no_machine:
        # We don't care about machines, or we just want the absolute best day
        return best_overall, False
        
    if best_overall["machine_available"]:
        return best_overall, False
        
    # We want a machine but best_overall doesn't have one. Find the best day with a machine.
    with_machine = [d for d in scored if d["machine_available"]]
    if with_machine:
        return pick_best(with_machine), False
        
    # No machine available in the entire window
    return best_overall, True
