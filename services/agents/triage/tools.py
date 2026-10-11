import time
import contextvars
from datetime import datetime, timezone, timedelta
from strands import tool
import boto3
from api.common.config import config
from api.common.logging import get_logger

logger = get_logger(__name__)

triage_trace_var = contextvars.ContextVar("triage_trace", default=None)

def _record_trace(tool_name: str, status: str):
    trace = triage_trace_var.get()
    if trace is not None:
        trace.append({
            "tool": tool_name,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

def _get_table(name: str):
    return boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(name)

@tool
def find_nearby_reports(geohash: str, radius: float = 1.0, category: str = "", hours: int = 24) -> list[dict]:
    """
    Find existing reports near a location for de-duplication.

    Args:
        geohash: Geohash of the location (e.g. 5-7 chars)
        radius: Search radius in km
        category: Category to filter by
        hours: Number of hours to look back (default 24h)

    Returns:
        List of matching reports (sanitized, no PII/notes)
    """
    try:
        table = _get_table(config.REPORTS_TABLE)
        prefix = geohash[:5] if geohash else ""
        
        filter_expr = "begins_with(geohash, :prefix)"
        expr_values = {":prefix": prefix}
        
        if category:
            filter_expr += " AND category = :category"
            expr_values[":category"] = category
            
        response = table.scan(
            FilterExpression=filter_expr,
            ExpressionAttributeValues=expr_values
        )
        
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        cutoff_iso = cutoff.isoformat()
        
        matches = []
        for item in response.get("Items", []):
            if item.get("created_at", "") >= cutoff_iso:
                matches.append({
                    "report_id": item.get("report_id"),
                    "category": item.get("category"),
                    "created_at": item.get("created_at"),
                    "geohash": item.get("geohash"),
                    "status": item.get("status")
                })
        _record_trace("find_nearby_reports", "success")
        return matches
    except Exception as e:
        logger.error(f"Failed to find nearby reports: {e}")
        _record_trace("find_nearby_reports", f"error: {str(e)}")
        return []

@tool
def merge_into(existing_report_id: str) -> dict:
    """
    Merge into an existing report by incrementing its duplicate count.

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
        _record_trace("merge_into", "success")
        return {"status": "merged", "merged_into": existing_report_id}
    except Exception as e:
        logger.error(f"Failed to merge report into {existing_report_id}: {e}")
        _record_trace("merge_into", f"error: {str(e)}")
        return {"error": str(e)}

@tool
def update_status(report_id: str, status: str) -> dict:
    """
    Update a report's status in DynamoDB.

    Args:
        report_id: Report identifier
        status: "received", "routed", "merged", or "resolved"

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
        _record_trace("update_status", "success")
        return {"report_id": report_id, "status": status, "updated_at": updated_at}
    except Exception as e:
        logger.error(f"Failed to update report status for {report_id}: {e}")
        _record_trace("update_status", f"error: {str(e)}")
        return {"error": str(e)}

@tool
def write_report(patch: dict) -> dict:
    """
    Write updates (such as needs_review, priority, rationale, triage_result) to the report.
    Never accepts or writes user notes or untrusted input.

    Args:
        patch: Dictionary of updates containing report_id and validated attributes.

    Returns:
        {"status": "written"}
    """
    try:
        if "report_id" not in patch:
            _record_trace("write_report", "error: missing report_id")
            return {"error": "report_id is required in patch"}
            
        report_id = patch.get("report_id")
        fields = {k: v for k, v in patch.items() if k != "report_id" and k != "notes"}
        if not fields:
            _record_trace("write_report", "success: no fields")
            return {"status": "written"}
            
        table = _get_table(config.REPORTS_TABLE)
        update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in fields.keys())
        attr_names = {f"#{k}": k for k in fields.keys()}
        attr_values = {f":{k}": v for k, v in fields.items()}
        
        table.update_item(
            Key={"report_id": report_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=attr_names,
            ExpressionAttributeValues=attr_values
        )
        _record_trace("write_report", "success")
        return {"status": "written"}
    except Exception as e:
        logger.error(f"Failed to write report patch for {patch.get('report_id')}: {e}")
        _record_trace("write_report", f"error: {str(e)}")
        return {"error": str(e)}
