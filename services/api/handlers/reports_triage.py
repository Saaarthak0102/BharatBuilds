"""
POST /v1/reports/{id}/triage & Asynchronous Lambda invocation handler for Triage Agent.
Enforces role/ownership checks and executes structured report triage.
"""

import json
import uuid
import boto3
from typing import Dict, Any

from api.common.responses import success_response, error_response
from api.common.errors import ValidationError, ApiError
from api.common.auth import get_claims
from api.common.logging import get_logger
from api.common.config import config
from agents.triage.agent import TriageAgent
from agents.triage.tools import find_nearby_reports

logger = get_logger(__name__)

def _get_table(name: str):
    return boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(name)

def handler(event: Dict[str, Any], context: Any):
    """
    Handles both API Gateway REST invocation and direct asynchronous Lambda event invocation.
    """
    correlation_id = str(uuid.uuid4())
    logger.info("triage_handler_request", correlation_id=correlation_id)

    # 1. Asynchronous direct Lambda event invocation (from ReportsFunction)
    if "httpMethod" not in event:
        return _handle_async_event(event, context, correlation_id)

    # 2. REST API Gateway invocation
    return _handle_api_request(event, context, correlation_id)

def _handle_async_event(event: Dict[str, Any], context: Any, correlation_id: str):
    try:
        report_id = event.get("report_id")
        if not report_id:
            logger.error("Missing report_id in async triage event")
            return {"statusCode": 400, "error": "report_id required"}

        category = event.get("category", "none")
        geohash = event.get("geohash", "")
        confidence = float(event.get("confidence", 0.9)) # Default or classified confidence

        # Check nearby candidate duplicates (within 24h)
        nearby_matches = find_nearby_reports(geohash=geohash, radius=1.0, category=category, hours=24)
        # Exclude self if already in table
        nearby_matches = [m for m in nearby_matches if m.get("report_id") != report_id]

        agent = TriageAgent()
        result = agent.triage_report(
            report_id=report_id,
            category=category,
            confidence=confidence,
            geohash=geohash,
            nearby_matches=nearby_matches
        )
        return {"statusCode": 200, "data": result.model_dump()}

    except Exception as e:
        logger.error(f"Async triage processing failed: {e}", correlation_id=correlation_id)
        return {"statusCode": 500, "error": str(e)}

def _handle_api_request(event: Dict[str, Any], context: Any, correlation_id: str):
    try:
        # Authentication & Role / Ownership checks
        claims = get_claims(event)
        user_id = claims.get("sub")
        role = claims.get("custom:role", "citizen")

        if not user_id:
            return error_response(401, "Unauthorized", correlation_id=correlation_id)

        report_id = event.get("pathParameters", {}).get("id")
        if not report_id:
            return error_response(400, "Report ID is required", correlation_id=correlation_id)

        # Retrieve report from DynamoDB
        table = _get_table(config.REPORTS_TABLE)
        resp = table.get_item(Key={"report_id": report_id})
        item = resp.get("Item")

        if not item:
            return error_response(404, "Report not found", correlation_id=correlation_id)

        # Ownership enforcement:
        # Citizens can ONLY triage their own report. Officials and Admins can triage any report.
        if role not in ("official", "admin") and item.get("user_id") != user_id:
            return error_response(403, "Access denied: cannot triage reports owned by other users", correlation_id=correlation_id)

        category = item.get("category", "none")
        geohash = item.get("geohash", "")
        # Parse confidence from item or classification, default to 0.85 if verified category present
        confidence = float(item.get("confidence", 0.85))

        # Query candidate duplicates
        nearby_matches = find_nearby_reports(geohash=geohash, radius=1.0, category=category, hours=24)
        nearby_matches = [m for m in nearby_matches if m.get("report_id") != report_id]

        agent = TriageAgent()
        result = agent.triage_report(
            report_id=report_id,
            category=category,
            confidence=confidence,
            geohash=geohash,
            nearby_matches=nearby_matches
        )

        return success_response(result.model_dump(), correlation_id=correlation_id)

    except ApiError as e:
        return error_response(e.status_code, e.message, correlation_id=correlation_id)
    except ValidationError as e:
        return error_response(400, str(e), correlation_id=correlation_id)
    except Exception as e:
        logger.error(f"Triage API error: {e}", correlation_id=correlation_id)
        return error_response(500, "Internal server error", correlation_id=correlation_id)
