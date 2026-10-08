"""
Deterministic day scorer for the burn-window planner.

Scores each of the next 7 days from 0 to 100 using transparent, rule-based
weights. The agent receives this scored table and explains the top choice.

Weights are loaded from scoring_config.yaml so judges can read them in the repo.

TODO: Verify thresholds against official Punjab Agricultural University (PAU) guidance.
"""

from typing import Any

import yaml
import os


def load_scoring_config() -> dict:
    """Load scoring weights from YAML config."""
    config_path = os.path.join(os.path.dirname(__file__), "scoring_config.yaml")
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def score_day(
    date: str,
    forecast: dict,
    wind: dict,
    fire_hotspots: dict,
    sowing_window: dict,
    machine_slots: list,
    config: dict | None = None,
) -> dict:
    """
    Score a single day for field clearing suitability.

    Args:
        date: Date string "YYYY-MM-DD"
        forecast: Weather forecast for the day
        wind: Wind data for the day
        fire_hotspots: Fire activity data for the district
        sowing_window: Sowing window constraints
        machine_slots: Available machine slots for the day
        config: Scoring weights (loaded from YAML if not provided)

    Returns:
        {
            "date": str,
            "total_score": int (0-100),
            "breakdown": {
                "sowing_window": int,
                "rain_and_soil": int,
                "wind": int,
                "fire_activity": int,
                "machine_availability": int
            },
            "flags": [str]  # Any warnings or notes
        }
    """
    if config is None:
        config = load_scoring_config()

    weights = config.get("weights", {})
    thresholds = config.get("thresholds", {})

    # TODO: Implement actual scoring logic
    # Each factor produces a sub-score (0 to its max weight)
    # Total = sum of all sub-scores

    raise NotImplementedError(
        "Scoring logic not yet implemented. "
        "See scoring_config.yaml for weight definitions."
    )


def score_week(
    forecasts: list[dict],
    winds: list[dict],
    fire_data: dict,
    sowing_window: dict,
    machine_slots: list[dict],
) -> list[dict]:
    """
    Score the next 7 days and return sorted by total_score descending.

    Returns a list of score dicts (see score_day return type).
    """
    # TODO: Implement
    raise NotImplementedError
