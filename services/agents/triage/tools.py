import time
from datetime import datetime, timezone, timedelta
from strands import tool
import boto3
from boto3.dynamodb.conditions import Key
from api.common.config import config

def _get_table(name: str):
    return boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(name)

@tool
def find_nearby_reports(geohash: str, radius: float, category: str, hours: int) -> list[dict]:
    """
    Find existing reports near a location for de-duplication.

    Args:
        geohash: Geohash of the location (typically precision 7)
        radius: Search radius (not fully supported by simple DynamoDB query, using geohash prefix)
        category: Category to filter by
        hours: Number of hours to look back

    Returns:
        List of matching reports
    """
    try:
        table = _get_table(config.REPORTS_TABLE)
        # Simplify: search by 5-char geohash prefix for near proximity
        # and filter by category
        prefix = geohash[:5]
        response = table.scan(
            FilterExpression="begins_with(geohash, :prefix) AND category = :category",
            ExpressionAttributeValues={
                ":prefix": prefix,
                ":category": category
            }
        )
        
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        cutoff_iso = cutoff.isoformat()
        
        matches = []
        for item in response.get("Items", []):
            if item.get("created_at", "") >= cutoff_iso:
                # Exclude the current report if needed, though we don't have its ID here
                matches.append({
                    "report_id": item.get("report_id"),
                    "category": item.get("category"),
                    "created_at": item.get("created_at"),
                    "geohash": item.get("geohash"),
                    "status": item.get("status")
                })
        return matches
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to find nearby reports: {e}")
        return []

@tool
def merge_into(existing_report_id: str) -> dict:
    """
    Merge the current report into an existing report (increment its count).

    Args:
        existing_report_id: The report ID to merge into.

    Returns:
        {"status": "merged", "merged_into": existing_report_id}
    """
    try:
        table = _get_table(config.REPORTS_TABLE)
        table.update_item(
            Key={"report_id": existing_report_id},
            UpdateExpression="ADD duplicate_count :inc",
            ExpressionAttributeValues={":inc": 1}
        )
        return {"status": "merged", "merged_into": existing_report_id}
    except Exception as e:
        return {"error": str(e)}

@tool
def update_status(report_id: str, status: str) -> dict:
    """
    Update a report's status.

    Args:
        report_id: Report identifier
        status: "received", "routed", or "resolved"

    Returns:
        {"report_id": str, "status": str, "updated_at": str}
    """
    try:
        table = _get_table(config.REPORTS_TABLE)
        updated_at = datetime.now(timezone.utc).isoformat()
        table.update_item(
            Key={"report_id": report_id},
            UpdateExpression="SET #s = :status, updated_at = :updated_at",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":status": status, ":updated_at": updated_at}
        )
        return {"report_id": report_id, "status": status, "updated_at": updated_at}
    except Exception as e:
        return {"error": str(e)}

@tool
def write_report(patch: dict) -> dict:
    """
    Write updates (like needs_review flag or merged_with) to the report.

    Args:
        patch: Dictionary containing fields to update, e.g., {"needs_review": True, "merged_with": "rpt-xxx", "report_id": "rpt-yyy"}

    Returns:
        {"status": "written"}
    """
    try:
        if "report_id" not in patch:
            return {"error": "report_id is required in patch"}
            
        report_id = patch.pop("report_id")
        if not patch:
            return {"status": "written"}
            
        table = _get_table(config.REPORTS_TABLE)
        
        update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in patch.keys())
        attr_names = {f"#{k}": k for k in patch.keys()}
        attr_values = {f":{k}": v for k, v in patch.items()}
        
        table.update_item(
            Key={"report_id": report_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_values
        )
        return {"status": "written"}
    except Exception as e:
        return {"error": str(e)}

