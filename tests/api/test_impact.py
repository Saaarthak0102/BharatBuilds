import pytest
from api.common.impact import calculate_farmer_impact, load_impact_factors

def test_impact_factors_loaded():
    cfg = load_impact_factors()
    assert "factors" in cfg
    factors = cfg["factors"]
    for factor_name, factor_val in factors.items():
        assert factor_val["source"] == "TO_VERIFY"
        assert "value" in factor_val

def test_calculate_farmer_impact():
    acres = 10.0
    impact = calculate_farmer_impact(acres)
    assert impact["acres_avoided_est"] == 10.0
    assert impact["tonnes_straw_diverted_est"] == 22.0
    assert impact["pm25_kg_saved_est"] == round(22.0 * 6.5, 2)
    assert impact["co2_tonnes_saved_est"] == round((22.0 * 1460.0) / 1000.0, 2)
    assert impact["financial_savings_inr_est"] == 10000.0
    assert impact["source"] == "TO_VERIFY"
    assert impact["is_estimate"] is True
    assert impact["metrics"]["acres_avoided"]["tag"] == "est."
    assert impact["metrics"]["tonnes_straw_diverted"]["tag"] == "est."
