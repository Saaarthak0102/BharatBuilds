#!/usr/bin/env python3
"""
Seed script for Saans DynamoDB tables.

Reads data/seed/*.json and idempotently writes sample data to DynamoDB:
- MachineSlots: Generated for 14 days forward from today based on machines.json
- StrawOutlets: Sourced from straw_outlets.json
- Villages lookup: Sourced from villages.json (written to DataCache and/or Villages table)
- Wards lookup: Sourced from wards.json (written to DataCache)

All items are tagged with is_sample = True.
Table names can be configured via environment variables or CLI arguments.
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
from botocore.exceptions import BotoCoreError, ClientError


# Ensure services can be imported
SERVICES_PATH = Path(__file__).resolve().parent.parent / "services"
if str(SERVICES_PATH) not in sys.path:
    sys.path.insert(0, str(SERVICES_PATH))

try:
    from api.common.time import today_ist
except ImportError:
    from datetime import timezone
    IST = timezone(timedelta(hours=5, minutes=30))
    def today_ist() -> date:
        return datetime.now(IST).date()


def parse_decimal(val: Any) -> Any:
    """Recursively convert float values to Decimal for DynamoDB compatibility."""
    if isinstance(val, float):
        return Decimal(str(val))
    if isinstance(val, dict):
        return {k: parse_decimal(v) for k, v in val.items()}
    if isinstance(val, list):
        return [parse_decimal(v) for v in val]
    return val


def load_json_seed(file_path: Path) -> list[dict[str, Any]]:
    """Load JSON seed file with floats converted to Decimal."""
    if not file_path.exists():
        raise FileNotFoundError(f"Seed file not found: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f, parse_float=Decimal)
        if isinstance(data, list):
            return data
        return [data]


def build_machine_slots(
    seed_machines: list[dict[str, Any]],
    start_date: date,
    num_days: int = 21,
) -> list[dict[str, Any]]:
    """
    Generate MachineSlots for num_days forward starting from start_date (today_ist() through +20 days).
    Rolling per village across the window, not coupled to hardcoded machines.json dates.
    Deterministic, idempotent, and tagged with is_sample=True.
    """
    if not seed_machines:
        return []

    templates_by_village: dict[str, list[dict[str, Any]]] = {}
    for machine in seed_machines:
        v_id = str(machine["village_id"])
        templates_by_village.setdefault(v_id, []).append(machine)

    generated_slots: list[dict[str, Any]] = []

    for day_idx in range(num_days):
        current_date = start_date + timedelta(days=day_idx)
        current_date_str = current_date.isoformat()

        for v_id, templates in templates_by_village.items():
            tmpl = templates[day_idx % len(templates)]
            orig_slot_id = tmpl.get("slot_id", "slot")
            slot_id = f"{orig_slot_id}-{current_date.strftime('%Y%m%d')}"
            item = {
                "village_id": v_id,
                "date": current_date_str,
                "slot_id": slot_id,
                "machine_type": str(tmpl["machine_type"]),
                "owner_label": str(tmpl["owner_label"]),
                "slots_free": int(tmpl["slots_free"]),
                "is_sample": True,
            }
            generated_slots.append(item)

    return generated_slots


def build_straw_outlets(seed_outlets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Prepare straw outlets items for DynamoDB.
    Preserves all fields and guarantees is_sample = True.
    """
    items: list[dict[str, Any]] = []
    for outlet in seed_outlets:
        item = {
            "district_id": str(outlet["district_id"]).lower(),
            "outlet_id": str(outlet["outlet_id"]),
            "facility_type": str(outlet["facility_type"]),
            "name": str(outlet["name"]),
            "contact_hint": str(outlet.get("contact_hint", "Contact your nearest depot or aggregator")),
            "is_sample": True,
        }
        # Keep informational note if present
        if "_note" in outlet:
            item["_note"] = str(outlet["_note"])
        items.append(item)
    return items


def build_villages_cache_items(seed_villages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Build items for DynamoDB DataCache table:
    - Individual lookup: source='villages', key=village_id
    - Full list lookup: source='villages', key='all'
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    items: list[dict[str, Any]] = []

    clean_villages = []
    for v in seed_villages:
        clean_v = {
            "village_id": str(v["village_id"]),
            "name": str(v["name"]),
            "district": str(v["district"]),
            "state": str(v["state"]),
            "lat": parse_decimal(v.get("lat")),
            "lng": parse_decimal(v.get("lng")),
            "is_sample": True,
        }
        clean_villages.append(clean_v)

        items.append({
            "source": "villages",
            "key": str(v["village_id"]),
            "payload": clean_v,
            "fetched_at": now_iso,
            "is_sample": True,
        })

    # Aggregated record for fetching all villages in one query
    items.append({
        "source": "villages",
        "key": "all",
        "payload": clean_villages,
        "fetched_at": now_iso,
        "is_sample": True,
    })

    return items


def build_wards_cache_items(seed_wards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Build items for DynamoDB DataCache table:
    - Individual lookup: source='wards', key=ward_id
    - Full list lookup: source='wards', key='all'
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    items: list[dict[str, Any]] = []

    clean_wards = []
    for w in seed_wards:
        clean_w = {
            "ward_id": str(w["ward_id"]),
            "name": str(w["name"]),
            "zone": str(w.get("zone", "")),
            "city": str(w.get("city", "")),
            "lat": parse_decimal(w.get("lat")),
            "lng": parse_decimal(w.get("lng")),
            "is_sample": True,
        }
        clean_wards.append(clean_w)

        items.append({
            "source": "wards",
            "key": str(w["ward_id"]),
            "payload": clean_w,
            "fetched_at": now_iso,
            "is_sample": True,
        })

    items.append({
        "source": "wards",
        "key": "all",
        "payload": clean_wards,
        "fetched_at": now_iso,
        "is_sample": True,
    })

    return items


def build_villages_table_items(seed_villages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build items for a dedicated Villages DynamoDB table if configured."""
    items: list[dict[str, Any]] = []
    for v in seed_villages:
        items.append({
            "village_id": str(v["village_id"]),
            "name": str(v["name"]),
            "district": str(v["district"]),
            "state": str(v["state"]),
            "lat": parse_decimal(v.get("lat")),
            "lng": parse_decimal(v.get("lng")),
            "is_sample": True,
        })
    return items


def batch_write_items(dynamodb_resource: Any, table_name: str, items: list[dict[str, Any]]) -> int:
    """
    Idempotently write items to DynamoDB using batch_writer.
    Returns the number of written items.
    """
    if not items:
        return 0

    table = dynamodb_resource.Table(table_name)
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
    return len(items)


def check_table_exists(dynamodb_client: Any, table_name: str) -> bool:
    """Check if a DynamoDB table exists."""
    try:
        dynamodb_client.describe_table(TableName=table_name)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            return False
        raise


def run_seed(
    stage: str,
    region: str,
    endpoint_url: str | None,
    data_dir: Path,
    machine_slots_table: str,
    straw_outlets_table: str,
    data_cache_table: str,
    villages_table: str | None,
    days: int,
    start_date_str: str | None,
    dry_run: bool,
) -> dict[str, int]:
    """Execute seed workflow and print counts."""
    print("=" * 60)
    print(" Saans DynamoDB Seed Script")
    print("=" * 60)
    print(f"Stage:                {stage}")
    print(f"Region:               {region}")
    if endpoint_url:
        print(f"Endpoint URL:         {endpoint_url}")
    print(f"Seed Data Directory:  {data_dir}")
    print(f"MachineSlots Table:   {machine_slots_table}")
    print(f"StrawOutlets Table:   {straw_outlets_table}")
    print(f"DataCache Table:      {data_cache_table}")
    if villages_table:
        print(f"Villages Table:       {villages_table}")
    print(f"Forward Days:         {days}")
    print(f"Mode:                 {'DRY-RUN (No writes)' if dry_run else 'LIVE SEED'}")
    print("-" * 60)

    # 1. Parse start date
    if start_date_str:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    else:
        start_date = today_ist()
    print(f"Generating MachineSlots from: {start_date} to {start_date + timedelta(days=days - 1)}")

    # 2. Read seed data files
    machines_file = data_dir / "machines.json"
    straw_outlets_file = data_dir / "straw_outlets.json"
    villages_file = data_dir / "villages.json"
    wards_file = data_dir / "wards.json"

    seed_machines = load_json_seed(machines_file) if machines_file.exists() else []
    seed_straw_outlets = load_json_seed(straw_outlets_file) if straw_outlets_file.exists() else []
    seed_villages = load_json_seed(villages_file) if villages_file.exists() else []
    seed_wards = load_json_seed(wards_file) if wards_file.exists() else []

    print(f"Loaded {len(seed_machines)} machine templates from {machines_file.name}")
    print(f"Loaded {len(seed_straw_outlets)} straw outlets from {straw_outlets_file.name}")
    print(f"Loaded {len(seed_villages)} villages from {villages_file.name}")
    print(f"Loaded {len(seed_wards)} wards from {wards_file.name}")

    # 3. Build DynamoDB items
    machine_slot_items = build_machine_slots(seed_machines, start_date=start_date, num_days=days)
    straw_outlet_items = build_straw_outlets(seed_straw_outlets)
    village_cache_items = build_villages_cache_items(seed_villages)
    ward_cache_items = build_wards_cache_items(seed_wards)
    village_table_items = build_villages_table_items(seed_villages) if villages_table else []

    all_cache_items = village_cache_items + ward_cache_items

    counts = {
        "machine_slots": len(machine_slot_items),
        "straw_outlets": len(straw_outlet_items),
        "data_cache_villages": len(village_cache_items),
        "data_cache_wards": len(ward_cache_items),
        "data_cache_total": len(all_cache_items),
        "villages_table": len(village_table_items),
    }

    print("-" * 60)
    print("Items Prepared for Seeding:")
    print(f"  MachineSlots:           {counts['machine_slots']} items across {days} days")
    print(f"  StrawOutlets:           {counts['straw_outlets']} items")
    print(f"  DataCache (Villages):   {counts['data_cache_villages']} items (8 individual + 1 all)")
    print(f"  DataCache (Wards):      {counts['data_cache_wards']} items (7 individual + 1 all)")
    print(f"  DataCache (Total):      {counts['data_cache_total']} items")
    if villages_table:
        print(f"  Villages (Table):       {counts['villages_table']} items")
    print("-" * 60)

    # 4. Display sample items
    if machine_slot_items:
        print("Sample MachineSlot Item:")
        print(json.dumps(machine_slot_items[0], default=str, indent=2))
    if straw_outlet_items:
        print("\nSample StrawOutlet Item:")
        print(json.dumps(straw_outlet_items[0], default=str, indent=2))
    if village_cache_items:
        print("\nSample DataCache Item (Village lookup):")
        print(json.dumps(village_cache_items[0], default=str, indent=2))

    if dry_run:
        print("\n[DRY RUN] Completed validation successfully. No DynamoDB operations executed.")
        return counts

    # 5. Connect to DynamoDB via boto3
    boto_kwargs: dict[str, Any] = {"region_name": region}
    if endpoint_url:
        boto_kwargs["endpoint_url"] = endpoint_url

    session = boto3.Session()
    dynamodb = session.resource("dynamodb", **boto_kwargs)
    client = session.client("dynamodb", **boto_kwargs)

    print("\nWriting to DynamoDB...")

    # Write MachineSlots
    print(f"Writing {len(machine_slot_items)} items to {machine_slots_table}...")
    batch_write_items(dynamodb, machine_slots_table, machine_slot_items)
    print(f"  [OK] Successfully seeded {len(machine_slot_items)} MachineSlots.")

    # Write StrawOutlets
    print(f"Writing {len(straw_outlet_items)} items to {straw_outlets_table}...")
    batch_write_items(dynamodb, straw_outlets_table, straw_outlet_items)
    print(f"  [OK] Successfully seeded {len(straw_outlet_items)} StrawOutlets.")

    # Write DataCache
    print(f"Writing {len(all_cache_items)} lookup items to {data_cache_table}...")
    batch_write_items(dynamodb, data_cache_table, all_cache_items)
    print(f"  [OK] Successfully seeded {len(all_cache_items)} DataCache lookup items.")

    # Write dedicated Villages table if specified and exists
    if villages_table:
        print(f"Writing {len(village_table_items)} items to {villages_table}...")
        batch_write_items(dynamodb, villages_table, village_table_items)
        print(f"  [OK] Successfully seeded {len(village_table_items)} villages to {villages_table}.")

    print("=" * 60)
    print(" Seeding Completed Successfully!")
    print(f" Total MachineSlots: {counts['machine_slots']}")
    print(f" Total StrawOutlets: {counts['straw_outlets']}")
    print(f" Total DataCache:    {counts['data_cache_total']}")
    if villages_table:
        print(f" Total Villages:     {counts['villages_table']}")
    print("=" * 60)

    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Saans DynamoDB tables with sample data.")
    stage_default = os.environ.get("STAGE", "dev")
    region_default = os.environ.get("AWS_REGION", "ap-south-1")
    endpoint_default = os.environ.get("AWS_ENDPOINT_URL")

    parser.add_argument("-s", "--stage", default=stage_default, help=f"Deployment stage (default: {stage_default})")
    parser.add_argument("-r", "--region", default=region_default, help=f"AWS region (default: {region_default})")
    parser.add_argument("--endpoint-url", default=endpoint_default, help="DynamoDB endpoint URL (e.g. for LocalStack)")
    parser.add_argument(
        "--data-dir",
        default=str(Path(__file__).resolve().parent.parent / "data" / "seed"),
        help="Path to seed JSON directory",
    )
    parser.add_argument(
        "--machine-slots-table",
        default=None,
        help="DynamoDB MachineSlots table name (default: saans-machine-slots-{stage} or MACHINE_SLOTS_TABLE env)",
    )
    parser.add_argument(
        "--straw-outlets-table",
        default=None,
        help="DynamoDB StrawOutlets table name (default: saans-straw-outlets-{stage} or STRAW_OUTLETS_TABLE env)",
    )
    parser.add_argument(
        "--data-cache-table",
        default=None,
        help="DynamoDB DataCache table name (default: saans-data-cache-{stage} or DATA_CACHE_TABLE env)",
    )
    parser.add_argument(
        "--villages-table",
        default=os.environ.get("VILLAGES_TABLE"),
        help="Optional dedicated DynamoDB Villages table name",
    )
    parser.add_argument("--days", type=int, default=21, help="Days forward to generate MachineSlots (default: 21, today through +20 days)")
    parser.add_argument("--start-date", default=None, help="Start date YYYY-MM-DD for MachineSlots (default: today)")
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate without writing to DynamoDB")

    args = parser.parse_args()

    stage = args.stage
    machine_slots_table = (
        args.machine_slots_table
        or os.environ.get("MACHINE_SLOTS_TABLE")
        or f"saans-machine-slots-{stage}"
    )
    straw_outlets_table = (
        args.straw_outlets_table
        or os.environ.get("STRAW_OUTLETS_TABLE")
        or f"saans-straw-outlets-{stage}"
    )
    data_cache_table = (
        args.data_cache_table
        or os.environ.get("DATA_CACHE_TABLE")
        or f"saans-data-cache-{stage}"
    )
    villages_table = args.villages_table

    try:
        run_seed(
            stage=stage,
            region=args.region,
            endpoint_url=args.endpoint_url,
            data_dir=Path(args.data_dir),
            machine_slots_table=machine_slots_table,
            straw_outlets_table=straw_outlets_table,
            data_cache_table=data_cache_table,
            villages_table=villages_table,
            days=args.days,
            start_date_str=args.start_date,
            dry_run=args.dry_run,
        )
    except FileNotFoundError as e:
        print(f"\n[Error] {e}", file=sys.stderr)
        sys.exit(1)
    except (BotoCoreError, ClientError) as e:
        print(f"\n[AWS DynamoDB Error] {e}", file=sys.stderr)
        print("Check your AWS credentials, permissions, and ensure the tables exist in the region/endpoint.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n[Unexpected Error] {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
