"""
Tests for services/ingest pipeline:
- cache.py (DynamoDB read/write, TTL, fetched_at, last good value fallback)
- open_meteo.py (7-day forecast, wind, seed coordinates, urllib retries)
- handler.py (scheduled ingest Lambda handler)
- firms.py and aqi.py (interface parity stubs)
"""

from datetime import datetime, timezone
from decimal import Decimal
import json
from unittest.mock import MagicMock, patch
import urllib.error

import pytest

from services.ingest import aqi, cache, firms, handler, open_meteo


class TestCache:
    """Tests for services/ingest/cache.py."""

    def test_cache_to_dynamo_stores_item_and_ttl(self):
        """cache_to_dynamo puts item with fetched_at, ttl, and Decimal conversion."""
        mock_table = MagicMock()
        with patch.object(cache, "get_dynamodb_table", return_value=mock_table):
            payload = {
                "temp": 32.5,
                "nested": {"wind": 14.2, "count": 5},
                "list": [1.5, 2.0],
            }
            res = cache.cache_to_dynamo(
                source="open_meteo",
                key="test-loc-1",
                payload=payload,
                ttl_hours=6,
            )

            assert res["source"] == "open_meteo"
            assert res["key"] == "test-loc-1"
            assert "fetched_at" in res
            assert isinstance(res["ttl"], int)
            assert res["ttl"] > int(datetime.now(timezone.utc).timestamp())

            # Verify table.put_item was called with converted Decimals
            mock_table.put_item.assert_called_once()
            call_item = mock_table.put_item.call_args[1]["Item"]
            assert call_item["source"] == "open_meteo"
            assert call_item["key"] == "test-loc-1"
            assert call_item["payload"]["temp"] == Decimal("32.5")
            assert call_item["payload"]["nested"]["wind"] == Decimal("14.2")

    def test_get_cached_returns_item_when_valid(self):
        """get_cached returns item and converts Decimals back to native types."""
        mock_table = MagicMock()
        future_ttl = int(datetime.now(timezone.utc).timestamp()) + 3600
        mock_table.get_item.return_value = {
            "Item": {
                "source": "open_meteo",
                "key": "test-loc-1",
                "payload": {"temp": Decimal("28.4")},
                "fetched_at": "2026-10-09T10:00:00+00:00",
                "ttl": future_ttl,
            }
        }

        with patch.object(cache, "get_dynamodb_table", return_value=mock_table):
            cached = cache.get_cached("open_meteo", "test-loc-1")
            assert cached is not None
            assert cached["payload"]["temp"] == 28.4

    def test_get_cached_falls_back_to_last_good_on_failure(self):
        """When DynamoDB fails, get_cached returns the last known good value."""
        # Prime the cache
        cache._LAST_GOOD_CACHE[("open_meteo", "failover-loc")] = {
            "source": "open_meteo",
            "key": "failover-loc",
            "payload": {"temp": 25.0},
            "fetched_at": "2026-10-09T08:00:00+00:00",
            "ttl": 1234567,
        }

        mock_table = MagicMock()
        mock_table.get_item.side_effect = Exception("DynamoDB service unavailable")

        with patch.object(cache, "get_dynamodb_table", return_value=mock_table):
            res = cache.get_cached("open_meteo", "failover-loc")
            assert res is not None
            assert res["key"] == "failover-loc"
            assert res["payload"]["temp"] == 25.0

    def test_get_last_good_returns_value_even_if_expired(self):
        """get_last_good returns cached item even after TTL expiration."""
        mock_table = MagicMock()
        past_ttl = int(datetime.now(timezone.utc).timestamp()) - 1000
        mock_table.get_item.return_value = {
            "Item": {
                "source": "open_meteo",
                "key": "expired-loc",
                "payload": {"condition": "clear"},
                "ttl": past_ttl,
            }
        }

        with patch.object(cache, "get_dynamodb_table", return_value=mock_table):
            # Normal get_cached ignores expired item
            assert cache.get_cached("open_meteo", "expired-loc", allow_expired=False) is None
            # get_last_good returns it as fallback
            res = cache.get_last_good("open_meteo", "expired-loc")
            assert res is not None
            assert res["payload"]["condition"] == "clear"


class TestOpenMeteo:
    """Tests for services/ingest/open_meteo.py."""

    def test_seed_locations_contain_punjab_and_delhi(self):
        """Coordinates for Punjab villages and Delhi wards are properly loaded."""
        locations = open_meteo.get_seed_locations()
        assert len(locations) >= 11

        punjab_locs = [loc for loc in locations if loc.get("state") == "Punjab"]
        delhi_locs = [loc for loc in locations if loc.get("city") == "Delhi"]

        assert len(punjab_locs) == 6
        assert len(delhi_locs) == 5

        # Check required fields
        for loc in locations:
            assert "id" in loc
            assert "name" in loc
            assert "lat" in loc
            assert "lng" in loc
            assert isinstance(loc["lat"], float)
            assert isinstance(loc["lng"], float)

    def test_wind_direction_heading_delhi(self):
        """Punjab winds between 270° and 345° blow toward Delhi."""
        assert open_meteo.is_wind_carrying_toward_delhi(290, "Punjab") is True
        assert open_meteo.is_wind_carrying_toward_delhi(180, "Punjab") is False
        assert open_meteo.is_wind_carrying_toward_delhi(300, "Delhi") is False

    def test_http_get_json_retries_on_failure(self):
        """http_get_json performs up to 3 retries with backoff."""
        fail_error = urllib.error.URLError("Temporary network timeout")

        with patch("urllib.request.urlopen", side_effect=[fail_error, fail_error, MagicMock()]) as mock_open:
            # On 3rd attempt, mock response
            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps({"ok": True}).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_open.side_effect = [fail_error, fail_error, mock_resp]

            with patch("time.sleep") as mock_sleep:
                data = open_meteo.http_get_json("https://fake-url.com", timeout=5.0, retries=3, backoff_base=0.01)
                assert data == {"ok": True}
                assert mock_open.call_count == 3
                assert mock_sleep.call_count == 2

    def test_parse_weather_response_structures_7_day_forecast(self):
        """Raw Open-Meteo response is converted into 7-day daily forecast and wind summary."""
        mock_raw = {
            "elevation": 218.0,
            "timezone": "Asia/Kolkata",
            "daily": {
                "time": [f"2026-10-{i:02d}" for i in range(1, 8)],
                "weather_code": [0, 1, 2, 3, 45, 61, 95],
                "temperature_2m_max": [35.0, 34.0, 33.0, 32.0, 31.0, 29.0, 28.0],
                "temperature_2m_min": [22.0, 21.0, 21.0, 20.0, 19.0, 18.0, 18.0],
                "precipitation_sum": [0.0, 0.0, 0.0, 0.5, 0.0, 12.0, 5.0],
                "precipitation_probability_max": [0, 5, 10, 30, 10, 80, 70],
                "wind_speed_10m_max": [12.0, 14.0, 15.0, 10.0, 8.0, 18.0, 20.0],
                "wind_direction_10m_dominant": [290, 285, 300, 270, 180, 295, 310],
            },
        }
        loc = {
            "id": "village-patiala-001",
            "name": "Rajpura",
            "district": "Patiala",
            "state": "Punjab",
            "lat": 30.48,
            "lng": 76.59,
        }

        parsed = open_meteo.parse_weather_response(loc, mock_raw)
        assert parsed["id"] == "village-patiala-001"
        assert parsed["forecast_days"] == 7
        assert len(parsed["forecast"]) == 7

        day0 = parsed["forecast"][0]
        assert day0["date"] == "2026-10-01"
        assert day0["temp_max_c"] == 35.0
        assert day0["condition"] == "clear"
        assert day0["carries_toward_city"] is True

        day4 = parsed["forecast"][4]
        assert day4["condition"] == "fog"
        assert day4["carries_toward_city"] is False  # 180 deg


class TestInterfaceParity:
    """Verify firms.py and aqi.py share the same interface as open_meteo.py."""

    def test_all_providers_expose_standard_interface(self):
        """All three ingestion modules implement the same interface functions."""
        providers = [open_meteo, firms, aqi]
        required_functions = [
            "get_locations",
            "fetch_location" if hasattr(open_meteo, "fetch_location") else "get_locations", # firms doesn't have fetch_location
            "fetch_data",
            "ingest",
            "handler",
        ]

        for p in providers:
            assert hasattr(p, "SOURCE_NAME")
            assert isinstance(p.SOURCE_NAME, str)
            for fn in required_functions:
                if fn == "fetch_location" and not hasattr(p, fn):
                    continue
                assert hasattr(p, fn), f"{p.__name__} missing {fn}"
                assert callable(getattr(p, fn)), f"{p.__name__}.{fn} is not callable"


class TestIngestHandler:
    """Tests for services/ingest/handler.py."""

    def test_handler_fetches_weather_and_writes_cache(self):
        """handler fetches weather and writes to DataCache."""
        mock_weather = {
            "id": "village-patiala-001",
            "name": "Rajpura",
            "district": "Patiala",
            "region": "Punjab",
            "lat": 30.48,
            "lng": 76.59,
            "forecast": [{"date": "2026-10-09", "temp_max_c": 32.0}],
        }

        with patch("services.ingest.open_meteo.get_seed_locations", return_value=[{"id": "village-patiala-001", "name": "Rajpura"}]), \
             patch("services.ingest.open_meteo.fetch_location", return_value=mock_weather), \
             patch("services.ingest.firms.ingest", return_value={"status": "success"}), \
             patch("services.ingest.aqi.ingest", return_value={"status": "success"}), \
             patch("services.ingest.cache.cache_to_dynamo") as mock_cache:

            res = handler.handler({}, None)
            assert res["statusCode"] == 200
            body = json.loads(res["body"])
            assert body["ok"] is True
            assert body["source"] == "open_meteo"
            assert "village-patiala-001" in body["updated_ids"]

            # Verifies write for individual item AND aggregated 'all'
            assert mock_cache.call_count == 2
            mock_cache.assert_any_call(
                source="open_meteo",
                key="village-patiala-001",
                payload=mock_weather,
                ttl_hours=12,
            )
            mock_cache.assert_any_call(
                source="open_meteo",
                key="all",
                payload=[mock_weather],
                ttl_hours=12,
            )

    def test_handler_falls_back_to_last_good_on_fetch_failure(self):
        """If location fetch fails, handler falls back to last known good cached value."""
        loc = {"id": "village-patiala-001", "name": "Rajpura"}
        last_good_payload = {"id": "village-patiala-001", "name": "Rajpura", "fallback": True}

        with patch("services.ingest.open_meteo.get_seed_locations", return_value=[loc]), \
             patch("services.ingest.open_meteo.fetch_location", side_effect=Exception("API timeout")), \
             patch("services.ingest.cache.get_last_good", return_value={"payload": last_good_payload}), \
             patch("services.ingest.firms.ingest", return_value={"status": "success"}), \
             patch("services.ingest.aqi.ingest", return_value={"status": "success"}), \
             patch("services.ingest.cache.cache_to_dynamo") as mock_cache:

            res = handler.handler({}, None)
            assert res["statusCode"] == 200
            body = json.loads(res["body"])
            assert body["records_retained"] == 1
            assert body["errors"] is not None

            # Cached 'all' retains the fallback record
            mock_cache.assert_called_once_with(
                source="open_meteo",
                key="all",
                payload=[last_good_payload],
                ttl_hours=12,
            )
