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


class TriageAgent:
    """
    Report triage agent that classifies and routes citizen reports.
    """

    def __init__(self, model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"):
        self.model_id = model_id
        self.max_steps = 5
        self.confidence_threshold = 0.7
        # TODO: Initialize Strands Agent

    def run(self, report_id: str, photo_key: str, location: dict) -> dict:
        """
        Triage a submitted report.

        Args:
            report_id: Report identifier
            photo_key: S3 key for the uploaded photo
            location: {"lat": float, "lng": float}

        Returns:
            {
                "report_id": str,
                "category": str,
                "confidence": float,
                "needs_confirmation": bool,
                "merged_with": str | None,
                "status": "received" | "routed",
                "run_id": str
            }
        """
        raise NotImplementedError("Triage agent not yet implemented.")
