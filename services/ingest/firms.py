"""
Lambda stub: FIRMS (Fire Information for Resource Management System) data ingestion.

Fetches active fire hotspot data from NASA FIRMS API and caches in DynamoDB/S3.

Triggered by EventBridge schedule.
"""


def handler(event, context):
    """
    Ingest FIRMS fire hotspot data.

    Steps:
    1. Fetch active fires for Punjab/Haryana region from FIRMS API
    2. Parse CSV/JSON response into GeoJSON features
    3. Store in DynamoDB DataCache with TTL
    4. Update S3 cache for map layer serving

    Source: https://firms.modaps.eosdis.nasa.gov/api/
    Requires: FIRMS API key (stored in Parameter Store)

    TODO: Implement actual FIRMS API call
    TODO: Add retry with backoff
    TODO: Handle rate limits (100 requests/min for free tier)
    """
    raise NotImplementedError("FIRMS ingestion not yet implemented.")
