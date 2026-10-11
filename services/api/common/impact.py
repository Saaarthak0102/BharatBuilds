import os
import yaml
from pathlib import Path
from typing import Any

_FACTORS_CACHE: dict[str, Any] | None = None

def load_impact_factors() -> dict[str, Any]:
    """Load impact calculation factors from YAML config."""
    global _FACTORS_CACHE
    if _FACTORS_CACHE is not None:
        return _FACTORS_CACHE

    config_path = Path(__file__).resolve().parent / "impact_factors.yaml"
    if not config_path.exists():
        # Fallback defaults if file cannot be read
        return {
            "factors": {
                "tonnes_straw_per_acre": {"value": 2.2, "source": "TO_VERIFY"},
                "pm25_kg_per_tonne_straw": {"value": 6.5, "source": "TO_VERIFY"},
                "co2_kg_per_tonne_straw": {"value": 1460.0, "source": "TO_VERIFY"},
                "financial_incentive_inr_per_acre": {"value": 1000.0, "source": "TO_VERIFY"},
            }
        }

    with open(config_path, "r", encoding="utf-8") as f:
        _FACTORS_CACHE = yaml.safe_load(f) or {}
    return _FACTORS_CACHE


def calculate_farmer_impact(acres: float) -> dict[str, Any]:
    """
    Calculate environmental and economic impact of stubble clearing for a farmer
    based on non-cancelled booking acres and emission factors.
    
    Every factor has source 'TO_VERIFY' and each output is tagged as an estimate ('est').
    """
    config = load_impact_factors()
    factors = config.get("factors", {})

    tonnes_per_acre_cfg = factors.get("tonnes_straw_per_acre", {"value": 2.2, "source": "TO_VERIFY"})
    pm25_per_tonne_cfg = factors.get("pm25_kg_per_tonne_straw", {"value": 6.5, "source": "TO_VERIFY"})
    co2_per_tonne_cfg = factors.get("co2_kg_per_tonne_straw", {"value": 1460.0, "source": "TO_VERIFY"})
    incentive_cfg = factors.get("financial_incentive_inr_per_acre", {"value": 1000.0, "source": "TO_VERIFY"})

    tonnes_per_acre = float(tonnes_per_acre_cfg.get("value", 2.2))
    pm25_per_tonne = float(pm25_per_tonne_cfg.get("value", 6.5))
    co2_per_tonne = float(co2_per_tonne_cfg.get("value", 1460.0))
    incentive_per_acre = float(incentive_cfg.get("value", 1000.0))

    acres_safe = max(0.0, float(acres or 0.0))
    straw_tonnes = round(acres_safe * tonnes_per_acre, 2)
    pm25_saved = round(straw_tonnes * pm25_per_tonne, 2)
    co2_tonnes = round((straw_tonnes * co2_per_tonne) / 1000.0, 2)
    financial_savings = round(acres_safe * incentive_per_acre, 2)

    return {
        "acres_avoided_est": acres_safe,
        "tonnes_straw_diverted_est": straw_tonnes,
        "pm25_kg_saved_est": pm25_saved,
        "co2_tonnes_saved_est": co2_tonnes,
        "financial_savings_inr_est": financial_savings,
        "metrics": {
            "acres_avoided": {
                "value": acres_safe,
                "unit": "acres",
                "tag": "est.",
                "source": "non_cancelled_bookings"
            },
            "tonnes_straw_diverted": {
                "value": straw_tonnes,
                "unit": "tonnes",
                "tag": "est.",
                "source": tonnes_per_acre_cfg.get("source", "TO_VERIFY")
            },
            "pm25_kg_saved": {
                "value": pm25_saved,
                "unit": "kg",
                "tag": "est.",
                "source": pm25_per_tonne_cfg.get("source", "TO_VERIFY")
            },
            "co2_tonnes_saved": {
                "value": co2_tonnes,
                "unit": "tonnes",
                "tag": "est.",
                "source": co2_per_tonne_cfg.get("source", "TO_VERIFY")
            },
            "financial_savings_inr": {
                "value": financial_savings,
                "unit": "INR",
                "tag": "est.",
                "source": incentive_cfg.get("source", "TO_VERIFY")
            }
        },
        "factors_used": {
            "tonnes_straw_per_acre": tonnes_per_acre_cfg,
            "pm25_kg_per_tonne_straw": pm25_per_tonne_cfg,
            "co2_kg_per_tonne_straw": co2_per_tonne_cfg,
            "financial_incentive_inr_per_acre": incentive_cfg,
        },
        "source": "TO_VERIFY",
        "is_estimate": True
    }
