"""
Planner agent tools — typed tool signatures for the Strands Agents SDK.

Each tool fetches data from external APIs or DynamoDB and returns typed results
for the planner agent to reason over.

STUB ONLY — returns NotImplementedError. Implement when connecting to real data sources.
"""

from datetime import date, datetime
from typing import Optional

# TODO: Import from strands_agents when implementing
# from strands.tools import tool


# @tool
def get_forecast(location: str, days: int = 7) -> dict:
    """
    Get weather forecast for a location.

    Args:
        location: Village or district name / geohash
        days: Number of days to forecast (default 7)

    Returns:
        {
            "location": str,
            "forecasts": [
                {
                    "date": "YYYY-MM-DD",
                    "temp_max_c": float,
                    "temp_min_c": float,
                    "precipitation_mm": float,
                    "humidity_pct": float,
                    "condition": str  # "clear", "cloudy", "rain", "heavy_rain"
                }
            ]
        }

    Source: Open-Meteo API (free, no key required)
    """
    # TODO: Fetch from Open-Meteo
    raise NotImplementedError


# @tool
def get_wind(location: str, days: int = 7) -> dict:
    """
    Get wind speed and direction forecast for a location.

    Args:
        location: Village or district name / geohash
        days: Number of days

    Returns:
        {
            "location": str,
            "wind_data": [
                {
                    "date": "YYYY-MM-DD",
                    "speed_kmh": float,
                    "direction_deg": int,   # 0=N, 90=E, 180=S, 270=W
                    "carries_toward_city": bool  # True if wind heads toward Delhi/populated area
                }
            ]
        }

    Source: Open-Meteo API
    """
    raise NotImplementedError


# @tool
def get_fire_hotspots(district: str) -> dict:
    """
    Get active fire hotspots in a district from NASA FIRMS data.

    Args:
        district: District identifier

    Returns:
        {
            "district": str,
            "hotspot_count": int,
            "hotspots": [
                {
                    "lat": float,
                    "lng": float,
                    "confidence": str,  # "low", "medium", "high"
                    "detected_at": str  # ISO 8601
                }
            ],
            "fetched_at": str
        }

    Source: NASA FIRMS API (requires API key)
    """
    raise NotImplementedError


# @tool
def get_sowing_window(crop_stage: str) -> dict:
    """
    Get the recommended sowing window for the next crop based on current stage.

    Args:
        crop_stage: "harvested", "partially_cleared", or "standing"

    Returns:
        {
            "crop_stage": str,
            "window_start": "YYYY-MM-DD",
            "window_end": "YYYY-MM-DD",
            "notes": str  # Guidance text
        }

    Source: Seeded from Punjab Agricultural University (PAU) guidance.
    TODO: Verify thresholds against official PAU publications.
    """
    raise NotImplementedError


# @tool
def find_machine_slots(village_id: str, date_range: tuple[str, str]) -> dict:
    """
    Find available machine slots (Happy Seeder, rotavator, etc.) near a village.

    Args:
        village_id: Village identifier
        date_range: Tuple of (start_date, end_date) as "YYYY-MM-DD"

    Returns:
        {
            "village_id": str,
            "slots": [
                {
                    "slot_id": str,
                    "machine_type": str,
                    "owner_label": str,
                    "date": str,
                    "slots_free": int,
                    "is_sample": bool
                }
            ]
        }

    Source: DynamoDB MachineSlots table (sample data)
    """
    raise NotImplementedError


# @tool
def find_straw_outlets(village_id: str) -> dict:
    """
    Find nearby straw outlets (biomass plants, CBG plants, depots, aggregators).

    All entries are sample data. No live prices or availability.
    Fallback copy: "Contact your nearest depot or aggregator"

    Args:
        village_id: Village identifier (used to determine district)

    Returns:
        {
            "village_id": str,
            "district_id": str,
            "outlets": [
                {
                    "outlet_id": str,
                    "facility_type": str,
                    "name": str,
                    "contact_hint": str,
                    "is_sample": true
                }
            ],
            "note": "Sample data. Contact your nearest depot or aggregator."
        }

    Source: Seeded sample data. Exact facility lists to be sourced from
    state pollution control board / agriculture department pages.
    """
    raise NotImplementedError


# @tool
def book_slot(slot_id: str) -> dict:
    """
    Book a machine slot (simulated).

    Args:
        slot_id: The slot ID to book

    Returns:
        {
            "booking_id": str,
            "slot_id": str,
            "status": "confirmed" | "unavailable",
            "is_sample": true
        }

    Note: In production, this would do a conditional update on
    the DynamoDB MachineSlots table (decrement slots_free).
    """
    raise NotImplementedError
