"""
Report Triage Agent (Strands Agents SDK & Deterministic Fallback)
Assesses citizen-submitted reports and produces a structured, validated triage result.
"""

import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from api.common.config import config
from api.common.logging import get_logger
from agents.common.runner import AgentRunner, write_agent_run
from agents.common.model import structured_complete
from strands import Agent
from agents.triage.schemas import TriageAssessment, TriageResult
from agents.triage.tools import (
    find_nearby_reports, merge_into, update_status, write_report,
    triage_trace_var
)

logger = get_logger(__name__)

VALID_CATEGORIES = ["crop_burning", "garbage_burning", "cracker_burning", "construction_dust"]

class TriageAgent:
    """
    Evaluates and triages incoming reports using Bedrock with deterministic safety fallbacks.
    Input to the model is strictly structured: category, confidence, geohash, count of nearby matches.
    Citizen notes and raw uploaded content are NEVER passed to model prompts or tool calls.
    """

    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id or config.BEDROCK_MODEL_ID or "anthropic.claude-3-sonnet-20240229-v1:0"
        self.max_steps = config.MAX_AGENT_STEPS
        self.confidence_threshold = 0.7
        self.min_valid_confidence = 0.3

        # Initialize Strands Agent for Bedrock interaction
        try:
            self.agent = Agent(
                system_prompt="""You are the Saans report triage agent. You evaluate a report based strictly on structured evidence: category, confidence, geohash, and count of nearby matches.
NEVER process or repeat user-submitted notes or photo metadata.
Rules:
1. Low confidence (<0.7) or unsafe content must NOT be confirmed; status stays 'received', flagged needs_review=True, next_action='flag_manual_review'.
2. If confidence is extremely low (<0.3) or category is 'none', next_action='reject_unsafe'.
3. Near duplicates (1 or more nearby matches with same category within 24h) must be merged into the existing report: status='merged', next_action='merge_duplicate'.
4. Otherwise, if confidence >= 0.7: status='routed', next_action='route_department'. Assign appropriate priority (critical, high, medium, low).
Return structured assessment with category, priority, confidence, rationale, next_action.""",
                tools=[find_nearby_reports, merge_into, update_status, write_report]
            )
        except Exception as e:
            logger.warning(f"Strands Agent initialization fallback: {e}")
            self.agent = None

    def triage_report(
        self,
        report_id: str,
        category: str,
        confidence: float,
        geohash: str,
        nearby_matches: Optional[List[Dict[str, Any]]] = None,
        environmental_context: Optional[Dict[str, Any]] = None
    ) -> TriageResult:
        """
        Execute the triage workflow for an eligible report.
        Produces a validated TriageResult and updates DynamoDB.
        """
        run_id = str(uuid.uuid4())
        runner = AgentRunner(max_steps=self.max_steps)
        trace: List[Dict[str, Any]] = []
        token = triage_trace_var.set(trace)
        start_time = time.time()
        outcome = "success"

        try:
            runner.check_limits()
            nearby_list = nearby_matches if nearby_matches is not None else []
            nearby_count = len(nearby_list)

            # 1. Primary path: Attempt Bedrock structured triage
            assessment: Optional[TriageAssessment] = None
            source: str = "bedrock"

            if self.model_id:
                try:
                    assessment = self._run_bedrock_assessment(
                        report_id=report_id,
                        category=category,
                        confidence=confidence,
                        geohash=geohash,
                        nearby_count=nearby_count,
                        environmental_context=environmental_context
                    )
                except Exception as e:
                    logger.warning(f"Bedrock triage failed, switching to deterministic fallback: {e}")
                    assessment = None

            # 2. Fallback path: Deterministic rule evaluation
            if assessment is None:
                source = "fallback"
                assessment = self._deterministic_assessment(
                    category=category,
                    confidence=confidence,
                    nearby_count=nearby_count
                )

            # 3. Apply state changes based on assessment (Safety-critical actions remain deterministic)
            result = self._apply_triage_decision(
                report_id=report_id,
                assessment=assessment,
                nearby_list=nearby_list,
                source=source,
                run_id=run_id
            )
            return result

        except Exception as e:
            logger.error(f"Triage workflow error for {report_id}: {e}")
            outcome = f"error: {str(e)}"
            # Return conservative fallback
            fallback_assessment = self._deterministic_assessment(
                category=category,
                confidence=confidence,
                nearby_count=len(nearby_matches or [])
            )
            return self._apply_triage_decision(
                report_id=report_id,
                assessment=fallback_assessment,
                nearby_list=nearby_matches or [],
                source="fallback",
                run_id=run_id
            )

        finally:
            triage_trace_var.reset(token)
            latency_ms = int((time.time() - start_time) * 1000)
            safe_trace = [{"tool": t.get("tool"), "status": t.get("status")} for t in trace]
            try:
                write_agent_run(run_id, safe_trace, latency_ms, outcome)
            except Exception as e:
                logger.error(f"Failed to record agent run audit: {e}")

    def _run_bedrock_assessment(
        self,
        report_id: str,
        category: str,
        confidence: float,
        geohash: str,
        nearby_count: int,
        environmental_context: Optional[Dict[str, Any]] = None
    ) -> TriageAssessment:
        """Call Bedrock with strictly sanitized, structured evidence only."""
        # System/user prompt uses structured tokens only. Untrusted citizen text is NEVER included.
        prompt = (
            f"Triage Assessment for report: ID={report_id}, category={category}, "
            f"confidence={confidence:.2f}, geohash_prefix={geohash[:5] if geohash else 'unknown'}, "
            f"nearby_reports_count={nearby_count}. "
            f"Environmental data: {environmental_context or 'None'}."
        )
        return structured_complete(TriageAssessment, prompt)

    def _deterministic_assessment(
        self,
        category: str,
        confidence: float,
        nearby_count: int
    ) -> TriageAssessment:
        """Conservative, deterministic fallback rules in plain code."""
        # Low confidence or invalid/unsafe category
        if category not in VALID_CATEGORIES or confidence < self.min_valid_confidence:
            return TriageAssessment(
                category=category if category in VALID_CATEGORIES else "none",
                priority="low",
                confidence=float(confidence),
                rationale="Unsafe, irrelevant, or insufficient confidence evidence.",
                next_action="reject_unsafe"
            )

        if confidence < self.confidence_threshold:
            return TriageAssessment(
                category=category,
                priority="low",
                confidence=float(confidence),
                rationale="Confidence below verification threshold (0.7); requires manual confirmation.",
                next_action="flag_manual_review"
            )

        # Near duplicate detection
        if nearby_count > 0:
            return TriageAssessment(
                category=category,
                priority="medium",
                confidence=float(confidence),
                rationale=f"Near-duplicate report matching {nearby_count} recent incident(s) in proximity.",
                next_action="merge_duplicate"
            )

        # Standard verified incident
        priority = "high" if (category in ["crop_burning", "garbage_burning"] and confidence >= 0.85) else "medium"
        return TriageAssessment(
            category=category,
            priority=priority,
            confidence=float(confidence),
            rationale="Verified single report with sufficient confidence; ready for departmental routing.",
            next_action="route_department"
        )

    def _apply_triage_decision(
        self,
        report_id: str,
        assessment: TriageAssessment,
        nearby_list: List[Dict[str, Any]],
        source: str,
        run_id: str
    ) -> TriageResult:
        """Applies status changes to DynamoDB and formats the final validated TriageResult."""
        triaged_at = datetime.now(timezone.utc).isoformat()
        merged_with = None
        status = "received"
        needs_review = False

        if assessment.next_action == "reject_unsafe":
            status = "rejected"
            update_status(report_id, "rejected")
            write_report({
                "report_id": report_id,
                "needs_review": False,
                "triage_rationale": assessment.rationale
            })

        elif assessment.next_action == "flag_manual_review":
            status = "received"
            needs_review = True
            update_status(report_id, "received")
            write_report({
                "report_id": report_id,
                "needs_review": True,
                "triage_rationale": assessment.rationale
            })

        elif assessment.next_action == "merge_duplicate":
            status = "merged"
            if nearby_list:
                merged_with = nearby_list[0].get("report_id")
                merge_into(merged_with)
            update_status(report_id, "merged")
            write_report({
                "report_id": report_id,
                "merged_with": merged_with,
                "triage_rationale": assessment.rationale
            })

        else: # route_department
            status = "routed"
            update_status(report_id, "routed")
            write_report({
                "report_id": report_id,
                "priority": assessment.priority,
                "triage_rationale": assessment.rationale,
                "routing_label": "simulated_department_dispatch"
            })

        return TriageResult(
            report_id=report_id,
            status=status,
            category=assessment.category,
            priority=assessment.priority,
            confidence=assessment.confidence,
            rationale=assessment.rationale,
            next_action=assessment.next_action,
            needs_review=needs_review,
            merged_with=merged_with,
            source=source,
            run_id=run_id,
            triaged_at=triaged_at
        )

    # Legacy interface for backward compatibility with initial tests
    def run(self, report_id: str, category: str, confidence: float, geohash: str, nearby_count: int, nearby_matches: list) -> dict:
        """Backward-compatible run method."""
        res = self.triage_report(
            report_id=report_id,
            category=category,
            confidence=confidence,
            geohash=geohash,
            nearby_matches=nearby_matches
        )
        return {
            "report_id": res.report_id,
            "status": res.status,
            "source": res.source,
            "needs_confirmation": res.needs_review,
            "merged_with": res.merged_with
        }

    def _deterministic_fallback(self, report_id: str, category: str, confidence: float, nearby_matches: list) -> dict:
        """Backward-compatible fallback method."""
        assessment = self._deterministic_assessment(category, confidence, len(nearby_matches or []))
        res = self._apply_triage_decision(report_id, assessment, nearby_matches or [], "fallback", "legacy_fallback")
        return {
            "report_id": res.report_id,
            "status": res.status,
            "source": "fallback",
            "needs_confirmation": res.needs_review,
            "merged_with": res.merged_with
        }
