import json
import os
from datetime import datetime, timezone

def handler(event, context):
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "ok": True,
            "stage": os.environ.get("STAGE", "unknown"),
            "time": datetime.now(timezone.utc).isoformat()
        })
    }
