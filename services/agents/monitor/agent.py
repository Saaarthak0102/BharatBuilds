"""
Monitoring Agent (Strands Agents SDK)

Triggered on EventBridge schedule (every few hours).

Behavior:
1. Checks AQI levels for subscribed areas
2. Checks fire hotspot activity
3. If a threshold is crossed, generates and sends an alert via SNS
4. De-duplicates: no more than one alert per user per time window
5. Writes an audit record to AgentRuns table
"""

import time
import uuid
import logging
from pydantic import BaseModel, Field

from strands import Agent
from agents.common.runner import AgentRunner, write_agent_run
from agents.common.model import build_model, structured_complete
from api.common.config import config
from agents.monitor.tools import (
    get_aqi, get_fire_hotspots, get_wind, find_subscribed_users, send_alert,
    _get_table, monitor_trace_var
)

logger = logging.getLogger(__name__)

class AlertContent(BaseModel):
    """Structured output for the generated alert text."""
    alert_text: str = Field(description="A short, calm alert message (1-2 sentences) about the air quality.")

class MonitorAgent:
    """
    Scheduled monitoring agent that watches AQI and fire activity,
    triggering alerts when thresholds are crossed.
    """

    def __init__(self, model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"):
        self.model_id = model_id
        self.max_steps = 5

    def _get_all_areas_with_subscriptions(self) -> dict:
        table = _get_table(config.SUBSCRIPTIONS_TABLE)
        areas = {}
        try:
            # For a production app with millions of subs, we'd use a different pattern.
            # Here we scan or assume a small set of subscriptions.
            response = table.scan()
            for item in response.get("Items", []):
                area_id = item.get("area_id")
                if area_id:
                    if area_id not in areas:
                        areas[area_id] = []
                    areas[area_id].append(item)
        except Exception as e:
            logger.error(f"Failed to scan subscriptions: {e}")
        return areas

    def run(self) -> dict:
        """
        Run a monitoring sweep.

        Returns:
            {
                "areas_checked": int,
                "alerts_sent": int,
                "alerts_deduplicated": int,
                "run_id": str
            }
        """
        run_id = str(uuid.uuid4())
        runner = AgentRunner(max_steps=self.max_steps)
        trace = []
        t_trace = monitor_trace_var.set(trace)
        
        areas_checked = 0
        alerts_sent = 0
        alerts_deduplicated = 0
        
        start_t = time.time()
        
        try:
            areas = self._get_all_areas_with_subscriptions()
            areas_checked = len(areas)
            
            for area_id, subs in areas.items():
                runner.check_limits()
                
                aqi_data = get_aqi(area_id)
                current_aqi = aqi_data.get("aqi", 0)
                
                # Find users in this area whose threshold is crossed
                targets = [s for s in subs if current_aqi >= s.get("threshold", 999)]
                
                if targets:
                    fire_data = get_fire_hotspots(area_id)
                    wind_data = get_wind(area_id)
                    
                    prompt = (
                        f"Write a short, calm alert message (1-2 sentences) for citizens in {area_id}. "
                        f"Current AQI is {current_aqi} ({aqi_data.get('category', 'Unknown')}). "
                        f"Fire hotspots: {fire_data.get('hotspot_count', 0)}. "
                        f"Do not include medical advice. Just state the air quality and a brief fact from the data."
                    )
                    
                    try:
                        content = structured_complete(AlertContent, prompt)
                        alert_text = content.alert_text
                    except Exception as e:
                        logger.error(f"Model failed to generate alert: {e}")
                        alert_text = f"Air quality alert for {area_id}: AQI is {current_aqi}."
                        
                    for target in targets:
                        user_id = target.get("user_id")
                        if not user_id:
                            continue
                            
                        # subscription_id is the partition key in tools.py send_alert
                        sub_id = target.get("subscription_id", user_id) 
                        
                        res = send_alert(sub_id, alert_text, target.get("channel", "email"))
                        if res.get("status") == "sent":
                            alerts_sent += 1
                        elif res.get("status") == "deduplicated":
                            alerts_deduplicated += 1

            outcome = "success"
        except Exception as e:
            logger.error(f"Monitor run failed: {e}")
            outcome = f"error: {str(e)}"
        finally:
            monitor_trace_var.reset(t_trace)
            latency = int((time.time() - start_t) * 1000)
            
            # sanitize trace (though we only log tool names and statuses in monitor)
            safe_trace = [{"tool": t["tool"], "status": t["status"]} for t in trace]
            
            write_agent_run(run_id, safe_trace, latency, outcome)

        return {
            "areas_checked": areas_checked,
            "alerts_sent": alerts_sent,
            "alerts_deduplicated": alerts_deduplicated,
            "run_id": run_id
        }
