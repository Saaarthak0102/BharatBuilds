"""
Triage agent tools — typed tool signatures.

STUB ONLY.

IMPORTANT: Report text/notes are UNTRUSTED user input.
Never pass user-submitted text to these tool functions in a way
that could alter classification or routing behavior.
"""


def classify_image(photo_key: str) -> dict:
    """
    Classify a report photo into a fixed category.

    Args:
        photo_key: S3 key for the photo

    Returns:
        {
            "category": "crop_burning" | "garbage_burning" | "cracker_burning" | "construction_dust",
            "confidence": float (0-1),
            "needs_confirmation": bool  # True if confidence < threshold
        }

    Model: Bedrock vision model with fixed category labels.
    Guardrail: Confidence threshold (0.7), user confirmation step.
    """
    raise NotImplementedError


def find_nearby_reports(lat: float, lng: float, radius_km: float = 1.0) -> list[dict]:
    """
    Find existing reports near a location for de-duplication.

    Args:
        lat: Latitude
        lng: Longitude
        radius_km: Search radius in km

    Returns:
        List of {"report_id": str, "category": str, "distance_km": float, "created_at": str}

    Source: DynamoDB Reports table with geohash range query
    """
    raise NotImplementedError


def write_report(report: dict) -> dict:
    """
    Write a classified report to DynamoDB.

    Args:
        report: Report dict with all fields

    Returns:
        {"report_id": str, "status": "written"}
    """
    raise NotImplementedError


def update_status(report_id: str, status: str) -> dict:
    """
    Update a report's status.

    Args:
        report_id: Report identifier
        status: "received", "routed", or "resolved"

    Returns:
        {"report_id": str, "status": str, "updated_at": str}
    """
    raise NotImplementedError
