import json
import pytest
import boto3
from api.common.config import config
from api.handlers import weather
from tests.conftest import build_event

class TestWeatherEndpoint:
    def test_weather_requires_auth(self):
        event = build_event("GET", "/v1/weather", query={"location_id": "loc-1"})
        # Remove claims to simulate unauthenticated
        event["requestContext"]["authorizer"] = {}
        res = weather.handler(event, None)
        assert res["statusCode"] == 401

    def test_weather_requires_location_id(self):
        event = build_event("GET", "/v1/weather", query={}, role="citizen", sub="user1")
        res = weather.handler(event, None)
        assert res["statusCode"] == 400
        body = json.loads(res["body"])
        assert "location_id query parameter is required" in body["error"]["message"]

    def test_weather_unknown_location_returns_404(self, moto_dynamodb):
        event = build_event("GET", "/v1/weather", query={"location_id": "unknown-loc"}, role="citizen", sub="user1")
        res = weather.handler(event, None)
        assert res["statusCode"] == 404
        body = json.loads(res["body"])
        assert "error" in body
        assert "not found in weather cache" in body["error"]["message"]

    def test_weather_returns_complete_weather_data(self, moto_dynamodb):
        from decimal import Decimal
        dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
        cache_table = dynamodb.Table(config.DATA_CACHE_TABLE)

        sample_weather = {
            "current": {
                "temperature_c": Decimal("28.5"),
                "relative_humidity_pct": Decimal("45"),
                "weather_code": Decimal("0"),  # Clear
                "wind_speed_kmh": Decimal("14.2"),
                "wind_direction_deg": Decimal("310"),
            },
            "forecast": [
                {
                    "temp_max_c": Decimal("32.0"),
                    "temp_min_c": Decimal("21.0"),
                    "precipitation_probability_max": Decimal("10.0"),
                    "uv_index_max": Decimal("6.5"),
                    "sunset": "18:15",
                }
            ],
            "raw": {
                "hourly": {
                    "time": [f"2026-10-11T{h:02d}:00" for h in range(24)],
                    "temperature_2m": [Decimal(str(20 + h)) for h in range(24)],
                    "precipitation_probability": [Decimal("5.0") for _ in range(24)],
                    "weather_code": [Decimal("0") for _ in range(24)],
                }
            }
        }

        cache_table.put_item(Item={
            "source": "open_meteo",
            "key": "village-patiala-001",
            "payload": sample_weather,
            "fetched_at": "2026-10-11T14:00:00+05:30",
            "is_sample": False,
        })

        event = build_event(
            "GET",
            "/v1/weather",
            query={"location_id": "village-patiala-001"},
            role="farmer",
            sub="farmer1"
        )
        res = weather.handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])["data"]

        assert data["location_id"] == "village-patiala-001"
        assert data["current"] == 28.5
        assert data["today_high"] == 32.0
        assert data["today_low"] == 21.0
        assert data["rain_chance"] == 10.0
        assert data["uv"] == 6.5
        assert data["sunset"] == "18:15"
        assert data["wind"]["speed"] == 14.2
        assert data["wind"]["direction"] == 310
        assert data["humidity"] == 45
        assert data["condition"] == "Clear"
        assert len(data["hourly_summary"]) == 24
        assert data["fetched_at"] == "2026-10-11T14:00:00+05:30"
        assert data["is_sample"] is False
