"""
Configuration loaded from environment variables and SSM Parameter Store.
"""

import os


class Config:
    """Application configuration."""

    # Environment
    STAGE = os.environ.get("STAGE", "dev")
    AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")

    # DynamoDB tables
    USERS_TABLE = os.environ.get("USERS_TABLE", "saans-users")
    REPORTS_TABLE = os.environ.get("REPORTS_TABLE", "saans-reports")
    MACHINE_SLOTS_TABLE = os.environ.get("MACHINE_SLOTS_TABLE", "saans-machine-slots")
    STRAW_OUTLETS_TABLE = os.environ.get("STRAW_OUTLETS_TABLE", "saans-straw-outlets")
    BOOKINGS_TABLE = os.environ.get("BOOKINGS_TABLE", "saans-bookings")
    SUBSCRIPTIONS_TABLE = os.environ.get("SUBSCRIPTIONS_TABLE", "saans-subscriptions")
    DATA_CACHE_TABLE = os.environ.get("DATA_CACHE_TABLE", "saans-data-cache")
    AGENT_RUNS_TABLE = os.environ.get("AGENT_RUNS_TABLE", "saans-agent-runs")

    # S3
    REPORTS_BUCKET = os.environ.get("REPORTS_BUCKET", "saans-reports-photos")
    CACHE_BUCKET = os.environ.get("CACHE_BUCKET", "saans-cache")

    # SNS
    ALERTS_TOPIC_ARN = os.environ.get("ALERTS_TOPIC_ARN", "")

    # Cognito
    COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")
    COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")

    # Bedrock
    BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")

    # Agent limits
    MAX_AGENT_STEPS = int(os.environ.get("MAX_AGENT_STEPS", "10"))
    AGENT_TIMEOUT_SECONDS = int(os.environ.get("AGENT_TIMEOUT_SECONDS", "30"))

    # Rate limits
    MAX_REPORTS_PER_USER_PER_HOUR = int(os.environ.get("MAX_REPORTS_PER_USER_PER_HOUR", "5"))
    MAX_PLAN_REQUESTS_PER_USER_PER_HOUR = int(os.environ.get("MAX_PLAN_REQUESTS_PER_USER_PER_HOUR", "10"))

    # TODO: Load secrets from SSM Parameter Store in production
    # FIRMS_API_KEY = get_ssm_parameter("/saans/firms-api-key")
    # OPENAQ_API_KEY = get_ssm_parameter("/saans/openaq-api-key")


config = Config()
