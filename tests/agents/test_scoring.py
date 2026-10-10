import pytest
from services.agents.planner.scoring import score_days, pick_best, replan

@pytest.fixture
def base_config():
    return {
        "rules": {
            "sowing_window": {"bonus_inside": 25},
            "rain": {
                "threshold_light_mm": 2.0, "score_light": 20,
                "threshold_moderate_mm": 10.0, "score_moderate": 12,
                "threshold_heavy_mm": 25.0, "score_heavy_max": 5, "score_heavy_over": 0
            },
            "wind": {
                "threshold_safe_kmh": 10.0, "score_safe": 20,
                "threshold_moderate_kmh": 20.0, "score_moderate": 12,
                "threshold_dangerous_kmh": 35.0, "score_dangerous_max": 5, "score_dangerous_over": 0,
                "toward_city_penalty": 10
            },
            "fire": {
                "threshold_low": 5, "score_low": 15,
                "threshold_moderate": 20, "score_moderate": 10,
                "threshold_high": 50, "score_high_max": 5, "score_high_over": 0
            },
            "machine": {
                "threshold_limited": 2, "bonus_available": 20,
                "bonus_limited": 10, "bonus_none": 0
            }
        }
    }

def base_forecast():
    return [
        {"date": f"2026-10-0{i}", "precipitation_sum": 0.0, "wind_speed_10m_max": 5.0, "carries_toward_city": False}
        for i in range(1, 8)
    ]

def base_machine_slots():
    return [{"date": f"2026-10-0{i}", "slots_free": 5} for i in range(1, 8)]

def test_rainy_week(base_config):
    # Test heavy rain gets 0 rain score and reduces overall score
    forecast = base_forecast()
    forecast[0]["precipitation_sum"] = 30.0 # Heavy rain on day 1
    scored = score_days(forecast, 2, {"start": "2026-10-01", "end": "2026-10-10"}, base_machine_slots(), "standing", base_config)
    assert scored[0]["breakdown"]["rain_and_soil"] == 0
    assert scored[0]["score"] < scored[1]["score"]
    
def test_no_machine_free(base_config):
    forecast = base_forecast()
    slots = base_machine_slots()
    slots[0]["slots_free"] = 0 # No machine on day 1
    scored = score_days(forecast, 2, {"start": "2026-10-01", "end": "2026-10-10"}, slots, "standing", base_config)
    
    assert scored[0]["breakdown"]["machine_availability"] == 0
    assert not scored[0]["machine_available"]
    
    # Test replan functionality: If best day has no machine, find next best
    # Let's artificially make day 1 best on other axes by penalizing others
    for f in forecast[1:]:
        f["precipitation_sum"] = 30.0 # Heavy rain
        f["wind_speed_10m_max"] = 40.0 # Dangerous wind
        
    scored2 = score_days(forecast, 2, {"start": "2026-10-01", "end": "2026-10-10"}, slots, "standing", base_config)
    best = pick_best(scored2)
    assert best["date"] == "2026-10-01" # Day 1 is best overall despite no machine
    
    # But replan should pick Day 2 if we need a machine
    replanned, fallback = replan(scored2, no_machine=True)
    assert replanned["date"] == "2026-10-02"
    assert not fallback

def test_no_machine_free_at_all_fallback(base_config):
    # If NO machines are available ANYWHERE, replan flags fallback
    forecast = base_forecast()
    slots = [{"date": f"2026-10-0{i}", "slots_free": 0} for i in range(1, 8)]
    scored = score_days(forecast, 2, {"start": "2026-10-01", "end": "2026-10-10"}, slots, "standing", base_config)
    replanned, fallback = replan(scored, no_machine=True)
    assert fallback is True
    assert replanned["date"] == "2026-10-01" # Should return the absolute best day

def test_high_fire_activity(base_config):
    forecast = base_forecast()
    # 60 is high fire activity, > 50
    scored = score_days(forecast, 60, {"start": "2026-10-01", "end": "2026-10-10"}, base_machine_slots(), "standing", base_config)
    assert scored[0]["breakdown"]["fire_activity"] == 0

def test_tie_break_determinism(base_config):
    forecast = base_forecast()
    # Ensure scores are identical
    scored = score_days(forecast, 2, {"start": "2026-10-01", "end": "2026-10-10"}, base_machine_slots(), "standing", base_config)
    assert scored[0]["score"] == scored[1]["score"]
    best = pick_best(scored)
    # Highest score, then earliest date. Since all identical, earliest date (2026-10-01) wins
    assert best["date"] == "2026-10-01"

def test_all_days_outside_window(base_config):
    forecast = base_forecast()
    # Sowing window is completely outside the forecast dates
    scored = score_days(forecast, 2, {"start": "2026-11-01", "end": "2026-11-10"}, base_machine_slots(), "standing", base_config)
    for day in scored:
        assert day["breakdown"]["sowing_window"] == 0
        assert day["score"] <= 50 # Hard cap if outside window
