import urllib.error
import urllib.request
import json
from unittest.mock import patch, MagicMock

import pytest

from services.ingest import firms

def test_firms_fetch_data_with_api_key():
    mock_csv_content = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
30.34,76.38,310.2,0.4,0.4,2026-10-09,1200,N,VIIRS,n,1.0,290.0,25.5,D
30.90,75.85,300.1,0.4,0.4,2026-10-09,1215,N,VIIRS,n,1.0,290.0,15.5,D
"""
    with patch("services.ingest.firms.get_api_key", return_value="dummy_key"), \
         patch("urllib.request.urlopen") as mock_open:
        
        mock_resp = MagicMock()
        mock_resp.read.return_value = mock_csv_content.encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp
        mock_open.return_value = mock_resp
        
        results = firms.fetch_data()
        assert len(results) == 4 # 4 target districts
        
        # Check Patiala (closest to 30.34, 76.38)
        patiala = next(r for r in results if r["id"] == "district-patiala")
        assert patiala["hotspot_count"] == 1
        assert patiala["hotspots"][0]["frp"] == 25.5
        
        # Check Ludhiana (closest to 30.90, 75.85)
        ludhiana = next(r for r in results if r["id"] == "district-ludhiana")
        assert ludhiana["hotspot_count"] == 1
        assert ludhiana["hotspots"][0]["frp"] == 15.5

def test_firms_fetch_data_no_api_key():
    with patch("services.ingest.firms.get_api_key", return_value=None):
        results = firms.fetch_data()
        assert len(results) == 4
        assert results[0]["is_sample"] is True

def test_firms_fetch_retries_on_error():
    fail_error = urllib.error.URLError("Temporary error")
    with patch("services.ingest.firms.get_api_key", return_value="dummy_key"), \
         patch("urllib.request.urlopen", side_effect=[fail_error, fail_error, MagicMock()]) as mock_open, \
         patch("time.sleep") as mock_sleep:
        
        mock_resp = MagicMock()
        mock_resp.read.return_value = "latitude,longitude,frp\n".encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp
        mock_open.side_effect = [fail_error, fail_error, mock_resp]
        
        results = firms.fetch_data()
        assert mock_open.call_count == 3
        assert mock_sleep.call_count == 2
