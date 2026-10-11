"""
Pytest configuration and shared fixtures for Saans test suite.
"""

import json
import os
from pathlib import Path
import sys
import boto3
from moto import mock_aws
import pytest

# Ensure repo root and services packages are in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
SERVICES_DIR = REPO_ROOT / "services"
API_DIR = SERVICES_DIR / "api"

for path in [str(API_DIR), str(SERVICES_DIR), str(REPO_ROOT)]:
    if path not in sys.path:
        sys.path.insert(0, path)

# 8 DynamoDB tables configuration matching infra/template.yaml and Config class
TABLE_DEFINITIONS = [
    {
        "env_var": "USERS_TABLE",
        "table_name": "saans-users-dev",
        "key_schema": [
            {"AttributeName": "user_id", "KeyType": "HASH"},
        ],
        "attribute_definitions": [
            {"AttributeName": "user_id", "AttributeType": "S"},
        ],
    },
    {
        "env_var": "REPORTS_TABLE",
        "table_name": "saans-reports-dev",
        "key_schema": [
            {"AttributeName": "report_id", "KeyType": "HASH"},
        ],
        "attribute_definitions": [
            {"AttributeName": "report_id", "AttributeType": "S"},
            {"AttributeName": "geohash", "AttributeType": "S"},
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "created_at", "AttributeType": "S"},
        ],
        "global_secondary_indexes": [
            {
                "IndexName": "geohash-index",
                "KeySchema": [
                    {"AttributeName": "geohash", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "user_id-created_at-index",
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                    {"AttributeName": "created_at", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
    },
    {
        "env_var": "MACHINE_SLOTS_TABLE",
        "table_name": "saans-machine-slots-dev",
        "key_schema": [
            {"AttributeName": "village_id", "KeyType": "HASH"},
            {"AttributeName": "date", "KeyType": "RANGE"},
        ],
        "attribute_definitions": [
            {"AttributeName": "village_id", "AttributeType": "S"},
            {"AttributeName": "date", "AttributeType": "S"},
        ],
    },
    {
        "env_var": "STRAW_OUTLETS_TABLE",
        "table_name": "saans-straw-outlets-dev",
        "key_schema": [
            {"AttributeName": "district_id", "KeyType": "HASH"},
            {"AttributeName": "outlet_id", "KeyType": "RANGE"},
        ],
        "attribute_definitions": [
            {"AttributeName": "district_id", "AttributeType": "S"},
            {"AttributeName": "outlet_id", "AttributeType": "S"},
        ],
    },
    {
        "env_var": "BOOKINGS_TABLE",
        "table_name": "saans-bookings-dev",
        "key_schema": [
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "booking_id", "KeyType": "RANGE"},
        ],
        "attribute_definitions": [
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "booking_id", "AttributeType": "S"},
        ],
    },
    {
        "env_var": "SUBSCRIPTIONS_TABLE",
        "table_name": "saans-subscriptions-dev",
        "key_schema": [
            {"AttributeName": "subscription_id", "KeyType": "HASH"},
        ],
        "attribute_definitions": [
            {"AttributeName": "subscription_id", "AttributeType": "S"},
            {"AttributeName": "area_id", "AttributeType": "S"},
        ],
        "global_secondary_indexes": [
            {
                "IndexName": "area_id-index",
                "KeySchema": [
                    {"AttributeName": "area_id", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
    },
    {
        "env_var": "DATA_CACHE_TABLE",
        "table_name": "saans-data-cache-dev",
        "key_schema": [
            {"AttributeName": "source", "KeyType": "HASH"},
            {"AttributeName": "key", "KeyType": "RANGE"},
        ],
        "attribute_definitions": [
            {"AttributeName": "source", "AttributeType": "S"},
            {"AttributeName": "key", "AttributeType": "S"},
        ],
    },
    {
        "env_var": "AGENT_RUNS_TABLE",
        "table_name": "saans-agent-runs-dev",
        "key_schema": [
            {"AttributeName": "run_id", "KeyType": "HASH"},
        ],
        "attribute_definitions": [
            {"AttributeName": "run_id", "AttributeType": "S"},
        ],
    },
]


def build_event(method, path, body=None, query=None, role=None, sub="user-1"):
    """
    Helper that fakes an API Gateway event with requestContext.authorizer.claims.
    """
    claims = {}
    if sub is not None:
        claims["sub"] = sub
    if role is not None:
        claims["custom:role"] = role

    event = {
        "httpMethod": method.upper(),
        "path": path,
        "headers": {
            "Content-Type": "application/json",
        },
        "requestContext": {
            "authorizer": {
                "claims": claims,
            }
        },
        "queryStringParameters": query if query is not None else None,
    }
    if body is not None:
        if isinstance(body, (dict, list)):
            event["body"] = json.dumps(body)
        else:
            event["body"] = str(body)
    return event


@pytest.fixture
def make_event():
    """Fixture providing the build_event helper."""
    return build_event


@pytest.fixture(autouse=True)
def moto_dynamodb():
    """
    Moto fixture that creates all 8 DynamoDB tables with the same keys/GSIs
    as infra/template.yaml and sets the table-name env vars the Config class reads.
    """
    # Configure mock AWS environment variables
    os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"
    os.environ["AWS_REGION"] = "ap-south-1"
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"

    for table in TABLE_DEFINITIONS:
        os.environ[table["env_var"]] = table["table_name"]

    # Sync Config class if already imported
    for mod_name in ["common.config", "api.common.config", "services.api.common.config"]:
        if mod_name in sys.modules:
            mod = sys.modules[mod_name]
            if hasattr(mod, "Config"):
                for table in TABLE_DEFINITIONS:
                    setattr(mod.Config, table["env_var"], table["table_name"])
            if hasattr(mod, "config"):
                for table in TABLE_DEFINITIONS:
                    setattr(mod.config, table["env_var"], table["table_name"])

    try:
        from api.common.config import Config as ApiConfig, config as api_config
        for table in TABLE_DEFINITIONS:
            setattr(ApiConfig, table["env_var"], table["table_name"])
            setattr(api_config, table["env_var"], table["table_name"])
    except Exception:
        pass

    with mock_aws():
        dynamodb = boto3.client("dynamodb", region_name="ap-south-1")

        for table in TABLE_DEFINITIONS:
            create_params = {
                "TableName": table["table_name"],
                "KeySchema": table["key_schema"],
                "AttributeDefinitions": table["attribute_definitions"],
                "BillingMode": "PAY_PER_REQUEST",
            }
            if "global_secondary_indexes" in table:
                create_params["GlobalSecondaryIndexes"] = table["global_secondary_indexes"]

            try:
                dynamodb.create_table(**create_params)
            except Exception:
                pass

        yield dynamodb
