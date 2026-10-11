"""
Report Triage Agent (Strands Agents SDK)

STUB ONLY — triggered when a report is submitted.

Behavior:
1. Classifies the uploaded photo (crop burning, garbage burning, etc.)
2. Flags low confidence for manual confirmation
3. Finds and merges near-duplicate reports
4. Sets report status
5. All user-submitted text is treated as UNTRUSTED INPUT — never passed
   to agent prompts or tool parameters that could alter behavior.

Optional: Can be orchestrated as an AWS Step Functions workflow
(validate → classify → de-duplicate → write) for clear AWS demo.
"""


import logging
from strands import Agent
from agents.triage.tools import find_nearby_reports, merge_into, update_status, write_report

logger = logging.getLogger(__name__)

class TriageAgent:
    """
    Report triage agent that classifies and routes citizen reports.
    """

    def __init__(self, model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"):
        self.model_id = model_id
        self.max_steps = 5
        self.confidence_threshold = 0.7
        # Initialize Strands Agent
        self.agent = Agent(
            system_prompt="""You are the Saans report triage agent. You evaluate a report based on category, confidence, geohash, and count of nearby matches. 
DO NOT use note or photo metadata. 
Rules:
1. If confidence is below the configured threshold (0.7), the status stays 'received' and the report should be flagged with needs_review=True. Use write_report to update it.
2. If it's a near duplicate (there are 1 or more nearby matches), use merge_into(existing_report_id) and increment its count, then update current report's status to 'merged' via write_report or update_status.
3. Otherwise, set status to 'routed' using update_status.
Return a structured JSON with status and reasoning.""",
            tools=[find_nearby_reports, merge_into, update_status, write_report]
        )

    def run(self, report_id: str, category: str, confidence: float, geohash: str, nearby_count: int, nearby_matches: list) -> dict:
        """
        Triage a submitted report.
        """
        prompt = f"Report {report_id}: category={category}, confidence={confidence}, geohash={geohash}, nearby_matches_count={nearby_count}, nearby_matches={nearby_matches}"
        
        try:
            # Bedrock path
            result = self.agent(prompt)
            return {"report_id": report_id, "status": "processed", "source": "model"}
        except Exception as e:
            logger.error(f"Agent failed, using deterministic fallback: {e}")
            return self._deterministic_fallback(report_id, category, confidence, nearby_matches)
            
    def _deterministic_fallback(self, report_id: str, category: str, confidence: float, nearby_matches: list) -> dict:
        """Deterministic fallback when Bedrock fails: same rules in plain code."""
        if confidence < self.confidence_threshold:
            write_report({"report_id": report_id, "needs_review": True})
            return {"report_id": report_id, "status": "received", "needs_confirmation": True, "source": "fallback"}
            
        if nearby_matches:
            # Find the most recent or first match
            target_id = nearby_matches[0].get("report_id")
            merge_into(target_id)
            write_report({"report_id": report_id, "merged_with": target_id})
            update_status(report_id, "merged")
            return {"report_id": report_id, "status": "merged", "merged_with": target_id, "source": "fallback"}
            
        update_status(report_id, "routed")
        return {"report_id": report_id, "status": "routed", "source": "fallback"}
