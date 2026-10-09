import urllib.error
import urllib.request
import json
from unittest.mock import patch, MagicMock

import pytest

from services.ingest import aqi

def test_aqi_calc_subindex():
    idx, cat = aqi.calc_subindex(20.0, aqi.PM25_BP)
    assert idx == 33
    assert cat == "Good"
    
    idx, cat = aqi.calc_subindex(150.0, aqi.PM25_BP)
    assert idx == 324
    assert cat == "Very Poor"
    
def test_aqi_fetch_location_with_api_key():
    loc_resp = {
        "results": [{"id": 1234, "name": "Test Station"}]
    }
    latest_resp = {
        "results": [
            {"parameter": {"name": "pm25"}, "value": 150.0},
            {"parameter": {"name": "pm10"}, "value": 200.0}
        ]
    }
    
    with patch("services.ingest.aqi.get_api_key", return_value="dummy_key"), \
         patch("services.ingest.aqi.http_get_json", side_effect=[loc_resp, latest_resp]):
         
        loc = {"id": "ward-1", "name": "Ward 1", "lat": 28.0, "lng": 77.0}
        res = aqi.fetch_location(loc)
        
        assert res["id"] == "ward-1"
        assert res["station_name"] == "Test Station"
        assert res["pm25"] == 150.0
        assert res["pm10"] == 200.0
        assert res["is_sample"] is False
        assert res["category"] == "Very Poor" # 150 PM2.5 -> Very poor

def test_aqi_fetch_location_no_api_key():
    with patch("services.ingest.aqi.get_api_key", return_value=None):
        loc = {"id": "ward-1", "name": "Ward 1", "lat": 28.0, "lng": 77.0}
        res = aqi.fetch_location(loc)
        assert res["is_sample"] is True
        assert res["pm25"] == 65.0

def test_aqi_fetch_retries_on_error():
    fail_error = urllib.error.URLError("Temporary error")
    with patch("services.ingest.aqi.get_api_key", return_value="dummy_key"), \
         patch("urllib.request.urlopen") as mock_open, \
         patch("time.sleep") as mock_sleep:
         
        mock_resp1 = MagicMock()
        mock_resp1.read.return_value = json.dumps({"results": [{"id": 1234, "name": "Test"}]}).encode('utf-8')
        mock_resp1.__enter__.return_value = mock_resp1
        
        mock_resp2 = MagicMock()
        mock_resp2.read.return_value = json.dumps({"results": []}).encode('utf-8')
        mock_resp2.__enter__.return_value = mock_resp2
        
        mock_open.side_effect = [fail_error, fail_error, mock_resp1, mock_resp2]
        
        loc = {"id": "ward-1", "name": "Ward 1", "lat": 28.0, "lng": 77.0}
        res = aqi.fetch_location(loc)
        
        # 3 calls for loc (2 fail, 1 success) + 1 call for latest (success)
        assert mock_open.call_count == 4
        assert mock_sleep.call_count == 2
