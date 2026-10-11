#!/usr/bin/env python3
"""
Seed script for demo data in Saans.
Idempotent script to seed:
- StrawOutlets (from data/seed/straw_outlets.json)
- MachineSlots (rolling forward from today IST using data/seed/machines.json)
- Reports (from data/seed/sample_reports.json with user_id="sample", NO ttl, pygeohash)

Usage:
    python scripts/seed_demo.py --stage dev
    python scripts/seed_demo.py --dry-run
"""

import argparse
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import json
import os
from pathlib import Path
import sys
from typing import Any

import boto3
import pygeohash as pgh

# Ensure services can be imported
SERVICES_PATH = Path(__file__).resolve().parent.parent / "services"
if str(SERVICES_PATH) not in sys.path:
    sys.path.insert(0, str(SERVICES_PATH))

try:
    from api.common.time import today_ist, now_ist
except ImportError:
    IST = timezone(timedelta(hours=5, minutes=30))
    def today_ist() -> date:
        return datetime.now(IST).date()
    def now_ist() -> datetime:
        return datetime.now(IST)

def parse_decimal(val: Any) -> Any:
    """Recursively convert float values to Decimal for DynamoDB compatibility."""
    if isinstance(val, float):
        return Decimal(str(val))
    if isinstance(val, dict):
        return {k: parse_decimal(v) for k, v in val.items()}
    if isinstance(val, list):
        return [parse_decimal(v) for v in val]
    return val

def load_json(file_path: Path) -> list[dict[str, Any]]:
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f, parse_float=Decimal)

def build_machine_slots(seed_machines: list[dict[str, Any]], start_date: date, num_days: int = 21) -> list[dict[str, Any]]:
    templates_by_village: dict[str, list[dict[str, Any]]] = {}
    for m in seed_machines:
        v_id = str(m["village_id"])
        templates_by_village.setdefault(v_id, []).append(m)

    slots: list[dict[str, Any]] = []
    for day_idx in range(num_days):
        cur_date = start_date + timedelta(days=day_idx)
        cur_date_str = cur_date.isoformat()
        for v_id, tmpls in templates_by_village.items():
            tmpl = tmpls[day_idx % len(tmpls)]
            orig_slot_id = tmpl.get("slot_id", "slot")
            slot_id = f"{orig_slot_id}-{cur_date.strftime('%Y%m%d')}"
            slots.append({
                "village_id": v_id,
                "date": cur_date_str,
                "slot_id": slot_id,
                "machine_type": str(tmpl["machine_type"]),
                "owner_label": str(tmpl["owner_label"]),
                "slots_free": int(tmpl["slots_free"]),
                "is_sample": True,
            })
    return slots

def build_straw_outlets(seed_outlets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for o in seed_outlets:
        items.append({
            "district_id": str(o["district_id"]).lower(),
            "outlet_id": str(o["outlet_id"]),
            "facility_type": str(o["facility_type"]),
            "name": str(o["name"]),
            "lat": parse_decimal(o.get("lat")),
            "lng": parse_decimal(o.get("lng")),
            "accepts": [str(x) for x in o.get("accepts", ["paddy_straw"])],
            "pickup_support": str(o.get("pickup_support", "unknown")),
            "contact_hint": str(o.get("contact_hint", "Contact your nearest depot or aggregator")),
            "is_sample": True,
        })
    return items

def build_sample_reports(seed_reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    now = now_ist()
    items: list[dict[str, Any]] = []
    for r in seed_reports:
        lat = float(r["public_lat"])
        lng = float(r["public_lng"])
        geohash = pgh.encode(lat, lng, precision=7)
        age_hours = float(r.get("sample_age_hours", 1))
        created_at = (now - timedelta(hours=age_hours)).isoformat()
        
        # NO ttl for sample reports
        item = {
            "report_id": str(r["report_id"]),
            "user_id": "sample",
            "status": str(r["status"]),
            "category": str(r["category"]),
            "area_name": str(r.get("area_name", "")),
            "lat": str(lat),
            "lng": str(lng),
            "public_lat": parse_decimal(lat),
            "public_lng": parse_decimal(lng),
            "geohash": geohash,
            "sample_age_hours": parse_decimal(age_hours),
            "confidence": parse_decimal(r.get("confidence", 0.8)),
            "confidence_label": str(r.get("confidence_label", "High confidence")),
            "needs_review": bool(r.get("needs_review", False)),
            "merged_count": int(r.get("merged_count", 1)),
            "sample_photo": str(r.get("sample_photo", "")),
            "created_at": created_at,
            "is_sample": True,
        }
        items.append(item)
    return items

def batch_write(table: Any, items: list[dict[str, Any]], desc: str, dry_run: bool = False):
    if dry_run:
        print(f"[DRY RUN] Would write {len(items)} items to {table.name if hasattr(table, 'name') else desc}")
        return
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
    print(f"Successfully wrote {len(items)} items to {table.name} ({desc})")

def main():
    parser = argparse.ArgumentParser(description="Seed demo data for Saans")
    parser.add_argument("--stage", default="dev", help="Deployment stage (default: dev)")
    parser.add_argument("--dry-run", action="store_true", help="Print items without writing to DynamoDB")
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent.parent
    seed_dir = root_dir / "data" / "seed"

    outlets_data = load_json(seed_dir / "straw_outlets.json")
    machines_data = load_json(seed_dir / "machines.json")
    reports_data = load_json(seed_dir / "sample_reports.json")

    outlets = build_straw_outlets(outlets_data)
    slots = build_machine_slots(machines_data, today_ist(), num_days=21)
    reports = build_sample_reports(reports_data)

    print(f"Prepared {len(outlets)} straw outlets, {len(slots)} machine slots, {len(reports)} sample reports.")

    if args.dry_run:
        print("[DRY RUN] Completed. No records written to DynamoDB.")
        return

    region = os.environ.get("AWS_REGION", "ap-south-1")
    dynamodb = boto3.resource("dynamodb", region_name=region)

    outlets_table_name = os.environ.get("STRAW_OUTLETS_TABLE", f"saans-straw-outlets-{args.stage}")
    slots_table_name = os.environ.get("MACHINE_SLOTS_TABLE", f"saans-machine-slots-{args.stage}")
    reports_table_name = os.environ.get("REPORTS_TABLE", f"saans-reports-{args.stage}")

    print(f"Connecting to DynamoDB tables in region {region}...")
    try:
        outlets_table = dynamodb.Table(outlets_table_name)
        slots_table = dynamodb.Table(slots_table_name)
        reports_table = dynamodb.Table(reports_table_name)

        batch_write(outlets_table, outlets, "Straw Outlets", args.dry_run)
        batch_write(slots_table, slots, "Machine Slots", args.dry_run)
        batch_write(reports_table, reports, "Sample Reports", args.dry_run)

        print("\n--- Summary of Seeded Data ---")
        print(f"Straw Outlets: {len(outlets)}")
        print(f"Machine Slots: {len(slots)}")
        print(f"Sample Reports: {len(reports)}")
    except Exception as e:
        print(f"Error during seeding: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
