import json
import os
from .errors import ApiError

def get_cors_headers():
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")
    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    }

def success_response(payload, status_code=200):
    headers = {"Content-Type": "application/json"}
    headers.update(get_cors_headers())
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(payload)
    }

def error_response(exception):
    headers = {"Content-Type": "application/json"}
    headers.update(get_cors_headers())
    
    if isinstance(exception, ApiError):
        return {
            "statusCode": exception.status_code,
            "headers": headers,
            "body": json.dumps({
                "error": {
                    "code": exception.code,
                    "message": exception.message
                }
            })
        }
    
    # Log the unexpected error natively if needed
    print(f"InternalServerError: {str(exception)}")
    
    return {
        "statusCode": 500,
        "headers": headers,
        "body": json.dumps({
            "error": {
                "code": "InternalServerError",
                "message": "An internal server error occurred."
            }
        })
    }
