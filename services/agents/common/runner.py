import time
from typing import Dict, Any, List
import boto3
from api.common.config import config

class StepLimitExceeded(Exception):
    pass

class AgentTimeout(Exception):
    pass

class AgentRunner:
    def __init__(self, max_steps: int = None, timeout_seconds: int = None):
        self.max_steps = max_steps or config.MAX_AGENT_STEPS
        self.timeout_seconds = timeout_seconds or config.AGENT_TIMEOUT_SECONDS
        self.current_step = 0
        self.start_time = time.time()
        
    def check_limits(self):
        self.current_step += 1
        if self.current_step > self.max_steps:
            raise StepLimitExceeded(f"Agent exceeded maximum steps of {self.max_steps}")
            
        if time.time() - self.start_time > self.timeout_seconds:
            raise AgentTimeout(f"Agent exceeded timeout of {self.timeout_seconds}s")
            
def write_agent_run(run_id: str, trace: List[Dict[str, Any]], latency: int, outcome: str):
    """
    Writes tool trace and run metadata to AgentRunsTable.
    PII MUST NOT BE INCLUDED IN THIS RECORD.
    """
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(config.AGENT_RUNS_TABLE)
    
    ttl = int(time.time()) + (7 * 24 * 60 * 60) # 7 days
    
    # Trace elements MUST NOT include PII. 
    # Sanitization should happen prior to this call or here.
    
    table.put_item(
        Item={
            "run_id": run_id,
            "trace": trace,
            "latency_ms": latency,
            "outcome": outcome,
            "ttl": ttl
        }
    )
