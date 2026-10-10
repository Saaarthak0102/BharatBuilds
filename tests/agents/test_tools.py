import json
import pytest
import os
from moto import mock_aws
import boto3
import contextvars
from datetime import datetime, timezone, timedelta

from agents.planner.tools import (
    get_forecast, get_wind, get_fire_hotspots, get_sowing_window,
    find_machine_slots, find_straw_outlets,
    planner_runner_var, planner_trace_var
)
from agents.common.runner import AgentRunner, StepLimitExceeded

@pytest.fixture
def aws_credentials():
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"

@pytest.fixture
def dynamo_tables(aws_credentials):
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
        
        try:
            # Create DataCache table
            cache_table = dynamodb.create_table(
                TableName="saans-data-cache-dev",
                KeySchema=[
                    {"AttributeName": "source", "KeyType": "HASH"},
                    {"AttributeName": "key", "KeyType": "RANGE"}
                ],
                AttributeDefinitions=[
                    {"AttributeName": "source", "AttributeType": "S"},
                    {"AttributeName": "key", "AttributeType": "S"}
                ],
                BillingMode="PAY_PER_REQUEST"
            )
        except Exception:
            pass
        os.environ["DATA_CACHE_TABLE"] = "saans-data-cache-dev"
        
        try:
            # Create MachineSlots table
            machine_table = dynamodb.create_table(
                TableName="saans-machine-slots-dev",
                KeySchema=[
                    {"AttributeName": "village_id", "KeyType": "HASH"},
                    {"AttributeName": "date", "KeyType": "RANGE"}
                ],
                AttributeDefinitions=[
                    {"AttributeName": "village_id", "AttributeType": "S"},
                    {"AttributeName": "date", "AttributeType": "S"}
                ],
                BillingMode="PAY_PER_REQUEST"
            )
        except Exception:
            pass
        os.environ["MACHINE_SLOTS_TABLE"] = "saans-machine-slots-dev"
        
        try:
            # Create StrawOutlets table
            straw_table = dynamodb.create_table(
                TableName="saans-straw-outlets-dev",
                KeySchema=[
                    {"AttributeName": "district_id", "KeyType": "HASH"},
                    {"AttributeName": "outlet_id", "KeyType": "RANGE"}
                ],
                AttributeDefinitions=[
                    {"AttributeName": "district_id", "AttributeType": "S"},
                    {"AttributeName": "outlet_id", "AttributeType": "S"}
                ],
                BillingMode="PAY_PER_REQUEST"
            )
        except Exception:
            pass
        os.environ["STRAW_OUTLETS_TABLE"] = "saans-straw-outlets-dev"
        
        yield dynamodb

@pytest.fixture
def mock_context():
    runner = AgentRunner(max_steps=5, timeout_seconds=30)
    trace = []
    
    t_runner = planner_runner_var.set(runner)
    t_trace = planner_trace_var.set(trace)
    
    yield runner, trace
    
    planner_runner_var.reset(t_runner)
    planner_trace_var.reset(t_trace)

def test_get_forecast_seeded(dynamo_tables, mock_context):
    runner, trace = mock_context
    
    # Table is empty, should return seeded fallback
    res = json.loads(get_forecast(location="delhi", days=3))
    assert res["location"] == "delhi"
    assert len(trace) == 1
    assert trace[0]["is_sample"] is True
    assert trace[0]["freshness"] == "seeded"
    assert runner.current_step == 1

def test_get_forecast_live_and_stale(dynamo_tables, mock_context):
    runner, trace = mock_context
    table = dynamo_tables.Table("saans-data-cache-dev")
    
    now = datetime.now(timezone.utc).timestamp()
    
    # Add a live item
    table.put_item(Item={
        "source": "open_meteo",
        "key": "live_loc",
        "payload": {"location": "live_loc", "forecasts": []},
        "ttl": int(now + 3600)
    })
    
    # Add an expired (stale) item
    table.put_item(Item={
        "source": "open_meteo",
        "key": "stale_loc",
        "payload": {"location": "stale_loc", "forecasts": []},
        "ttl": int(now - 3600)
    })
    
    # Test live
    res_live = json.loads(get_forecast(location="live_loc"))
    assert res_live["location"] == "live_loc"
    assert trace[-1]["freshness"] == "live"
    
    # Test stale
    # Need to clear in-memory _LAST_GOOD_CACHE first because ingest.cache uses it
    from ingest import cache
    cache._LAST_GOOD_CACHE.clear()
    
    res_stale = json.loads(get_forecast(location="stale_loc"))
    assert res_stale["location"] == "stale_loc"
    assert trace[-1]["freshness"] == "stale"
    assert runner.current_step == 2

def test_step_budget_guard(dynamo_tables, mock_context):
    runner, trace = mock_context
    runner.max_steps = 1
    
    get_forecast(location="loc1") # Step 1 is fine
    
    with pytest.raises(StepLimitExceeded):
        get_forecast(location="loc2") # Step 2 exceeds budget

def test_find_machine_slots(dynamo_tables, mock_context):
    runner, trace = mock_context
    table = dynamo_tables.Table("saans-machine-slots-dev")
    table.put_item(Item={
        "village_id": "v1",
        "date": "2026-10-09",
        "slots_free": 5,
        "is_sample": True
    })
    
    res = json.loads(find_machine_slots(village_id="v1", start_date="2026-10-08", end_date="2026-10-10"))
    assert len(res["slots"]) == 1
    assert res["slots"][0]["slots_free"] == 5
    assert trace[-1]["tool"] == "find_machine_slots"
    assert trace[-1]["is_sample"] is True

def test_find_straw_outlets(dynamo_tables, mock_context):
    runner, trace = mock_context
    table = dynamo_tables.Table("saans-straw-outlets-dev")
    table.put_item(Item={
        "district_id": "d1",
        "outlet_id": "o1",
        "facility_type": "depot",
        "name": "Test Depot",
        "is_sample": True
    })
    
    res = json.loads(find_straw_outlets(district_id="d1"))
    assert len(res["outlets"]) == 1
    assert res["outlets"][0]["name"] == "Test Depot"
    assert trace[-1]["tool"] == "find_straw_outlets"

def test_validation_error(mock_context):
    runner, trace = mock_context
    
    # Should trigger pydantic validation error if we pass wrong types (e.g., district as int when str is expected and missing args)
    # Wait, python will typecast. Let's just miss an arg or pass something strictly invalid if we can, but kwargs are bound by strands
    # Strands might pass kwargs. Let's call tool function directly with invalid kwargs
    res = get_forecast(location="") # Not exactly invalid, just empty. 
    # Actually, pydantic doesn't fail on empty strings by default unless min_length is set.
    res = get_wind(location=None) # Missing required string location
    assert "Error" in res
    assert trace[-1]["ok"] is False
