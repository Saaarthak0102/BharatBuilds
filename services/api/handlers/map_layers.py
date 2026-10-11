"""
GET /v1/map/layers?bbox=<bbox>&layers=<layers>
Returns GeoJSON layer data for the shared map from real DynamoDB tables with sample fallbacks.
"""

import json
import uuid
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
import boto3
from boto3.dynamodb.conditions import Key
import pygeohash as pgh

from api.common.responses import success_response, error_response
from api.common.errors import ValidationError
from api.common.auth import require_auth, get_claims
from api.common.logging import get_logger
from api.common.config import config
from api.common.time import today_ist, now_ist
from ingest import cache

logger = get_logger(__name__)

def _get_dynamo_table(name: str):
    region = os.environ.get("AWS_REGION", config.AWS_REGION)
    return boto3.resource("dynamodb", region_name=region).Table(name)

def _load_json_file(rel_path: str) -> dict | list:
    potential_roots = [
        Path.cwd() / rel_path,
        Path(__file__).resolve().parents[3] / rel_path,
        Path(f"/var/task/{rel_path}"),
    ]
    for p in potential_roots:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return {}

def _filter_feature_by_bbox(feature: dict, bbox_coords: list[float] | None) -> bool:
    if not bbox_coords:
        return True
    try:
        coords = feature.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            return False
        lng, lat = coords[0], coords[1]
        min_lng, min_lat, max_lng, max_lat = bbox_coords
        return min_lng <= lng <= max_lng and min_lat <= lat <= max_lat
    except Exception:
        return True

@require_auth
def handler(event, context):
    """
    Lambda handler for GET /v1/map/layers.

    Query params:
        bbox: bounding box as "minLng,minLat,maxLng,maxLat"
        layers: comma-separated list of requested layers (e.g. "aqi,fires,reports,machines")

    Returns GeoJSON FeatureCollections for each layer.
    """
    correlation_id = str(uuid.uuid4())
    logger.info("map_layers_request", correlation_id=correlation_id)

    try:
        params = event.get("queryStringParameters") or {}
        bbox_str = params.get("bbox")
        layers_str = params.get("layers")
        active_layers = [s.strip().lower() for s in layers_str.split(",")] if layers_str else []

        parsed_bbox = None
        if bbox_str:
            try:
                parts = [float(x.strip()) for x in bbox_str.split(",")]
                if len(parts) == 4:
                    parsed_bbox = parts  # [min_lng, min_lat, max_lng, max_lat]
            except Exception:
                pass

        claims = get_claims(event)
        current_user_id = claims.get("sub") if claims else None
        now = now_ist()
        now_iso = now.isoformat()

        sample_map_seed = _load_json_file("data/seed/sample_map.json") or {}
        wards_seed = _load_json_file("data/seed/wards.json") or []
        villages_seed = _load_json_file("data/seed/villages.json") or []

        # ─── 1. AQI LAYER ────────────────────────────────────────────────────────
        aqi_features = []
        aqi_is_sample = True
        if not active_layers or any(k in active_layers for k in ("aqi", "aqi_heatmap")):
            cache_table = _get_dynamo_table(config.DATA_CACHE_TABLE)
            cached_cpcb = []
            try:
                # Query cache for CPCB data
                resp = cache_table.query(
                    KeyConditionExpression=Key("source").eq("cpcb")
                )
                cached_cpcb = cache._from_decimal(resp.get("Items", []))
            except Exception as e:
                logger.warning(f"Failed to read CPCB from cache: {e}")

            if cached_cpcb:
                aqi_is_sample = False
                for item in cached_cpcb:
                    payload = item.get("payload", {})
                    lat = float(payload.get("lat", 0))
                    lng = float(payload.get("lng", 0))
                    feat = {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [lng, lat]},
                        "properties": {
                            "ward_id": item.get("key", ""),
                            "station": payload.get("station", payload.get("ward_name", "Station")),
                            "aqi": int(payload.get("aqi", 150)),
                            "category": payload.get("aqi_category", "Moderate"),
                            "is_sample": bool(item.get("is_sample", False)),
                        }
                    }
                    if _filter_feature_by_bbox(feat, parsed_bbox):
                        aqi_features.append(feat)

            # Fallback to sample map stations
            if not aqi_features:
                aqi_is_sample = True
                stations = sample_map_seed.get("aqi_stations", [])
                for st in stations:
                    feat = {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [float(st["lng"]), float(st["lat"])]},
                        "properties": {
                            "ward_id": st.get("ward_id", ""),
                            "station": st.get("station", "Ward"),
                            "aqi": int(st.get("aqi", 200)),
                            "category": st.get("category", "Moderate"),
                            "is_sample": True,
                        }
                    }
                    if _filter_feature_by_bbox(feat, parsed_bbox):
                        aqi_features.append(feat)

        # ─── 2. FIRES LAYER ──────────────────────────────────────────────────────
        fire_features = []
        fire_is_sample = True
        if not active_layers or any(k in active_layers for k in ("fires", "fire_hotspots")):
            cache_table = _get_dynamo_table(config.DATA_CACHE_TABLE)
            cached_fires = []
            try:
                resp = cache_table.query(
                    KeyConditionExpression=Key("source").eq("firms")
                )
                items = cache._from_decimal(resp.get("Items", []))
                for it in items:
                    payload = it.get("payload", {})
                    hotspots = payload.get("hotspots", [])
                    if isinstance(hotspots, list):
                        cached_fires.extend(hotspots)
            except Exception as e:
                logger.warning(f"Failed to read FIRMS from cache: {e}")

            if cached_fires:
                fire_is_sample = False
                # Sort by frp descending and cap 300
                cached_fires.sort(key=lambda x: float(x.get("frp", 0)), reverse=True)
                for f in cached_fires[:300]:
                    lat = float(f.get("lat") or f.get("latitude") or 0)
                    lng = float(f.get("lng") or f.get("longitude") or 0)
                    feat = {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [lng, lat]},
                        "properties": {
                            "fire_id": str(f.get("fire_id", uuid.uuid4().hex[:6])),
                            "frp": float(f.get("frp", 25.0)),
                            "confidence": str(f.get("confidence", "nominal")),
                            "detected_at": f.get("detected_at", now_iso),
                            "source": "FIRMS",
                            "is_sample": bool(f.get("is_sample", False)),
                        }
                    }
                    if _filter_feature_by_bbox(feat, parsed_bbox):
                        fire_features.append(feat)

            if not fire_features:
                fire_is_sample = True
                raw_points = sample_map_seed.get("fire_points", [])
                raw_points.sort(key=lambda x: float(x.get("frp", 0)), reverse=True)
                for f in raw_points[:300]:
                    feat = {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [float(f["lng"]), float(f["lat"])]},
                        "properties": {
                            "fire_id": str(f.get("fire_id", "fp")),
                            "frp": float(f.get("frp", 30.0)),
                            "confidence": str(f.get("confidence", "nominal")),
                            "detected_at": f.get("detected_at", now_iso),
                            "source": "FIRMS",
                            "is_sample": True,
                        }
                    }
                    if _filter_feature_by_bbox(feat, parsed_bbox):
                        fire_features.append(feat)

        # ─── 3. REPORTS LAYER ────────────────────────────────────────────────────
        report_features = []
        reports_is_sample = True
        if not active_layers or any(k in active_layers for k in ("reports", "report_markers")):
            reports_table = _get_dynamo_table(config.REPORTS_TABLE)
            report_items = []
            try:
                resp = reports_table.scan(Limit=100)
                report_items = cache._from_decimal(resp.get("Items", []))
            except Exception as e:
                logger.warning(f"Failed to scan reports table: {e}")

            if not report_items:
                report_items = _load_json_file("data/seed/sample_reports.json") or []

            for it in report_items:
                is_sample = bool(it.get("is_sample", False) or it.get("user_id") == "sample")
                if is_sample:
                    try:
                        age_h = float(it.get("sample_age_hours", 2))
                    except (ValueError, TypeError):
                        age_h = 2.0
                    created_at = (now - timedelta(hours=age_h)).isoformat()
                    pub_lat = float(it.get("public_lat") or it.get("lat") or 0.0)
                    pub_lng = float(it.get("public_lng") or it.get("lng") or 0.0)
                    photo_url = it.get("sample_photo") or it.get("photo_url")
                else:
                    g = it.get("geohash", "")
                    safe_geohash = g[:5] if len(g) >= 5 else g
                    lat, lng = pgh.decode(safe_geohash) if safe_geohash else (0.0, 0.0)
                    pub_lat = lat
                    pub_lng = lng
                    created_at = it.get("created_at") or now_iso
                    photo_url = None

                is_mine = bool(current_user_id and it.get("user_id") == current_user_id and not is_sample)

                conf_label = it.get("confidence_label")
                if not conf_label:
                    try:
                        c_val = float(it.get("confidence", 0.85))
                        conf_label = "High confidence" if c_val >= 0.85 else ("Moderate confidence" if c_val >= 0.70 else "Needs verification")
                    except Exception:
                        conf_label = "High confidence"

                feat = {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [pub_lng, pub_lat]},
                    "properties": {
                        "report_id": it.get("report_id"),
                        "category": it.get("category", ""),
                        "status": str(it.get("status", "received")).lower(),
                        "area_name": it.get("area_name") or ("Local Area" if is_sample else f"Geohash {it.get('geohash', '')[:5]}"),
                        "public_lat": pub_lat,
                        "public_lng": pub_lng,
                        "created_at": created_at,
                        "confidence_label": conf_label,
                        "needs_review": bool(it.get("needs_review", False)),
                        "merged_count": int(it.get("merged_count", 1)),
                        "photo_url": photo_url,
                        "is_sample": is_sample,
                        "is_mine": is_mine,
                    }
                }
                if _filter_feature_by_bbox(feat, parsed_bbox):
                    report_features.append(feat)

            reports_is_sample = any(f["properties"]["is_sample"] for f in report_features) if report_features else True

        # ─── 4. MACHINES LAYER ───────────────────────────────────────────────────
        machine_features = []
        machines_is_sample = True
        if not active_layers or any(k in active_layers for k in ("machines", "machine_points")):
            slots_table = _get_dynamo_table(config.MACHINE_SLOTS_TABLE)
            today_str = today_ist().isoformat()
            slots_today = []
            try:
                # Scan today's machine slots
                resp = slots_table.scan(
                    FilterExpression=boto3.dynamodb.conditions.Attr("date").eq(today_str)
                )
                slots_today = cache._from_decimal(resp.get("Items", []))
            except Exception as e:
                logger.warning(f"Failed to scan machine slots: {e}")

            # Aggregate slots by village
            village_slots: dict[str, list[dict]] = {}
            for s in slots_today:
                v_id = s.get("village_id")
                if v_id and int(s.get("slots_free", 0)) > 0:
                    village_slots.setdefault(v_id, []).append(s)

            # Map villages coordinates
            villages_map = {v["village_id"]: v for v in villages_seed if "village_id" in v}
            for v_id, slots in village_slots.items():
                v_info = villages_map.get(v_id, {})
                v_lat = float(v_info.get("lat", 30.5))
                v_lng = float(v_info.get("lng", 76.0))
                total_free = sum(int(s.get("slots_free", 1)) for s in slots)
                mach_types = list(set(s.get("machine_type", "Equipment") for s in slots))

                feat = {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [v_lng, v_lat]},
                    "properties": {
                        "village_id": v_id,
                        "village_name": v_info.get("name", v_id),
                        "district": v_info.get("district", ""),
                        "state": v_info.get("state", "Punjab"),
                        "total_slots_free": total_free,
                        "machines_available": mach_types,
                        "machine_type": mach_types[0] if mach_types else "Farm Machinery",
                        "owner_label": slots[0].get("owner_label", "Machinery Pool"),
                        "is_sample": True,
                    }
                }
                if _filter_feature_by_bbox(feat, parsed_bbox):
                    machine_features.append(feat)

            # If no live slots found today in DB, seed fallback from villages
            if not machine_features:
                for v in villages_seed[:6]:
                    feat = {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [float(v["lng"]), float(v["lat"])]},
                        "properties": {
                            "village_id": v["village_id"],
                            "village_name": v.get("name", "Village"),
                            "district": v.get("district", "Patiala"),
                            "state": v.get("state", "Punjab"),
                            "total_slots_free": 3,
                            "machines_available": ["Happy Seeder", "Rotavator"],
                            "machine_type": "Happy Seeder",
                            "owner_label": "Kisan Seva Machinery Pool",
                            "is_sample": True,
                        }
                    }
                    if _filter_feature_by_bbox(feat, parsed_bbox):
                        machine_features.append(feat)

        # ─── 5. WIND ARROWS (Baseline) ───────────────────────────────────────────
        wind_features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [76.5, 30.2]},
                "properties": {"speed_kmh": 15, "direction_deg": 135, "is_sample": True},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [77.1, 28.8]},
                "properties": {"speed_kmh": 12, "direction_deg": 140, "is_sample": True},
            }
        ]

        # Overall freshness
        is_sample_overall = aqi_is_sample or fire_is_sample or reports_is_sample or machines_is_sample

        result = {
            "aqi_heatmap": {
                "type": "FeatureCollection",
                "features": aqi_features,
                "fetched_at": now_iso,
                "is_sample": aqi_is_sample,
            },
            "fire_hotspots": {
                "type": "FeatureCollection",
                "features": fire_features[:300],
                "fetched_at": now_iso,
                "is_sample": fire_is_sample,
            },
            "wind_arrows": {
                "type": "FeatureCollection",
                "features": wind_features,
                "fetched_at": now_iso,
                "is_sample": True,
            },
            "report_markers": {
                "type": "FeatureCollection",
                "features": report_features[:100],
                "fetched_at": now_iso,
                "is_sample": reports_is_sample,
            },
            "machine_points": {
                "type": "FeatureCollection",
                "features": machine_features[:50],
                "fetched_at": now_iso,
                "is_sample": machines_is_sample,
            },
            "freshness": {
                "label": "Updated just now",
                "is_sample": is_sample_overall,
            },
        }

        return success_response(result, correlation_id=correlation_id)

    except Exception as e:
        logger.error("unexpected_error", error=str(e), correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
