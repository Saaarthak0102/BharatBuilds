"""
GET /v1/health
Health check endpoint.
"""

import json
from datetime import datetime, timezone

from common.responses import success_response


def handler(event, context):
    """Health check - no auth required."""
    return success_response({
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "0.1.0",
    })
