"""
SlotRefreshFunction: EventBridge daily schedule at 00:30 IST (19:00 UTC).
Refreshes rolling MachineSlots for today_ist() through +20 days (21 days total).
IAM write permissions on MachineSlotsTable only.
"""

import os
import json
import logging
from pathlib import Path
from datetime import timedelta
from typing import Any

import boto3
from api.common.time import today_ist
from api.common.config import config

logger = logging.getLogger(__name__)

DEFAULT_SEED_MACHINES = [
    {
        "slot_id": "slot-001",
        "village_id": "village-patiala-001",
        "machine_type": "Happy Seeder",
        "owner_label": "Kisan Seva Kendra, Patiala",
        "slots_free": 3,
        "is_sample": True,
    },
    {
        "slot_id": "slot-002",
        "village_id": "village-patiala-001",
        "machine_type": "Super SMS (Straw Management System)",
        "owner_label": "Punjab Agro, Rajpura",
        "slots_free": 1,
        "is_sample": True,
    },
    {
        "slot_id": "slot-003",
        "village_id": "village-ludhiana-001",
        "machine_type": "Rotavator",
        "owner_label": "FPO Ludhiana Cooperative",
        "slots_free": 5,
        "is_sample": True,
    },
    {
        "slot_id": "slot-004",
        "village_id": "village-ludhiana-001",
        "machine_type": "Happy Seeder",
        "owner_label": "Kisan Seva Kendra, Ludhiana",
        "slots_free": 2,
        "is_sample": True,
    },
    {
        "slot_id": "slot-005",
        "village_id": "village-sangrur-001",
        "machine_type": "Mulcher",
        "owner_label": "Panchayat Equipment Pool, Sangrur",
        "slots_free": 4,
        "is_sample": True,
    },
]


def load_machine_templates() -> list[dict[str, Any]]:
    potential_roots = [
        Path.cwd() / "data" / "seed" / "machines.json",
        Path(__file__).resolve().parents[3] / "data" / "seed" / "machines.json",
        Path("/var/task/data/seed/machines.json"),
    ]
    for p in potential_roots:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and data:
                        return data
            except Exception as e:
                logger.warning("Could not read %s: %s", p, e)
    return DEFAULT_SEED_MACHINES


def generate_rolling_slots(num_days: int = 21) -> list[dict[str, Any]]:
    templates = load_machine_templates()
    templates_by_village: dict[str, list[dict[str, Any]]] = {}
    for m in templates:
        v_id = str(m["village_id"])
        templates_by_village.setdefault(v_id, []).append(m)

    start_date = today_ist()
    slots = []
    for day_idx in range(num_days):
        current_date = start_date + timedelta(days=day_idx)
        current_date_str = current_date.isoformat()

        for v_id, t_list in templates_by_village.items():
            tmpl = t_list[day_idx % len(t_list)]
            orig_slot_id = tmpl.get("slot_id", "slot")
            slot_id = f"{orig_slot_id}-{current_date.strftime('%Y%m%d')}"
            slots.append({
                "village_id": v_id,
                "date": current_date_str,
                "slot_id": slot_id,
                "machine_type": str(tmpl["machine_type"]),
                "owner_label": str(tmpl["owner_label"]),
                "slots_free": int(tmpl["slots_free"]),
                "is_sample": True,
            })
    return slots


def handler(event, context) -> dict[str, Any]:
    logger.info("Executing daily MachineSlots refresh...")
    items = generate_rolling_slots(num_days=21)

    table_name = os.environ.get("MACHINE_SLOTS_TABLE", config.MACHINE_SLOTS_TABLE)
    dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
    table = dynamodb.Table(table_name)

    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

    logger.info("Successfully refreshed %d MachineSlots across 21 days in %s", len(items), table_name)
    return {
        "statusCode": 200,
        "slots_refreshed": len(items),
        "start_date": today_ist().isoformat(),
        "days": 21,
    }
