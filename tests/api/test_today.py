import json
import pytest
from unittest.mock import MagicMock
from tests.conftest import build_event

class TestTodayEndpoint:
    def test_today_requires_area(self):
        from services.api.handlers.today import handler
        event = build_event("GET", "/v1/today", role="citizen")
        res = handler(event, None)
        assert res["statusCode"] == 400
        assert "area query parameter is required" in json.loads(res["body"])["error"]["message"]

    def test_today_returns_cached_data(self, mocker):
        from services.api.handlers.today import handler
        
        cache_mock = MagicMock()
        cache_mock.get_item.side_effect = lambda Key: {
            "Item": {
                "source": Key["source"],
                "key": Key["key"],
                "data": {"aqi": 120} if Key["source"] == "aqi" else {"forecast_summary": "Sunny day"}
            }
        }
        mocker.patch("services.api.handlers.today.cache_table", cache_mock)
        
        subs_mock = MagicMock()
        subs_mock.get_item.return_value = {"Item": {"latest_alert_message": "Warning!"}}
        mocker.patch("services.api.handlers.today.subs_table", subs_mock)

        event = build_event("GET", "/v1/today", query={"area": "a1"}, role="citizen", sub="user1")
        res = handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])["data"]
        
        assert data["aqi"] == 120
        assert data["aqi_category"] == "Moderate"
        assert "Breathing discomfort" in data["advice"]
        assert data["is_sample"] is False
        assert data["latest_alert_message"] == "Warning!"
        assert data["forecast_summary"] == "Sunny day"

    def test_today_fallback_mock_data(self, mocker):
        from services.api.handlers.today import handler
        
        cache_mock = MagicMock()
        cache_mock.get_item.return_value = {} # No data found
        mocker.patch("services.api.handlers.today.cache_table", cache_mock)
        
        subs_mock = MagicMock()
        subs_mock.get_item.return_value = {}
        mocker.patch("services.api.handlers.today.subs_table", subs_mock)

        event = build_event("GET", "/v1/today", query={"area": "a1"}, role="citizen", sub="user1")
        res = handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])["data"]
        
        assert data["aqi"] == 185
        assert data["is_sample"] is True
        assert data["aqi_category"] == "Moderate" # Wait, 185 is Moderate based on 101-200.
