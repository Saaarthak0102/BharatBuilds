"""
GET /v1/map/layers?bbox=<bbox>
Returns GeoJSON layer data for the shared map.
"""

import json
import uuid

from common.responses import success_response, error_response
from common.errors import ValidationError
from common.auth import require_auth
from common.logging import get_logger

logger = get_logger(__name__)


@require_auth
def handler(event, context):
    """
    Lambda handler for GET /v1/map/layers.

    Query params:
        bbox: bounding box as "minLng,minLat,maxLng,maxLat"

    Returns GeoJSON FeatureCollections for each layer.
    """
    correlation_id = str(uuid.uuid4())
    logger.info("map_layers_request", correlation_id=correlation_id)

    try:
        params = event.get("queryStringParameters", {}) or {}
        bbox = params.get("bbox")

        # bbox is optional; if omitted return default Delhi-Punjab region
        # TODO: Parse bbox and filter data spatially

        mock_result = {
            "aqi_heatmap": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [77.3055, 28.6692]},
                        "properties": {"aqi": 185, "station": "Anand Vihar", "is_sample": True},
                    },
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [77.2090, 28.6139]},
                        "properties": {"aqi": 165, "station": "India Gate", "is_sample": True},
                    },
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [76.7794, 30.7333]},
                        "properties": {"aqi": 120, "station": "Chandigarh", "is_sample": True},
                    },
                ],
            },
            "fire_hotspots": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [75.8573, 30.9000]},
                        "properties": {
                            "confidence": "high",
                            "detected_at": "2024-11-05T06:00:00Z",
                            "source": "FIRMS",
                            "is_sample": True,
                        },
                    },
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [76.3869, 30.3398]},
                        "properties": {
                            "confidence": "medium",
                            "detected_at": "2024-11-05T07:30:00Z",
                            "source": "FIRMS",
                            "is_sample": True,
                        },
                    },
                ],
            },
            "wind_arrows": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [76.5, 30.2]},
                        "properties": {
                            "speed_kmh": 15,
                            "direction_deg": 135,
                            "is_sample": True,
                        },
                    },
                ],
            },
            "report_markers": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [77.25, 28.65]},
                        "properties": {
                            "report_id": "rpt-001",
                            "category": "crop_burning",
                            "status": "routed",
                            "created_at": "2024-11-05T08:30:00Z",
                            "is_sample": True,
                        },
                    },
                ],
            },
            "machine_points": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [75.7873, 30.9100]},
                        "properties": {
                            "machine_type": "Happy Seeder",
                            "owner_label": "Kisan Seva Kendra",
                            "slots_free": 3,
                            "is_sample": True,
                        },
                    },
                ],
            },
            "freshness": {
                "label": "Updated 20 min ago",
                "is_sample": True,
            },
        }

        return success_response(mock_result, correlation_id=correlation_id)

    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
