from typing import Optional, Literal
from pydantic import BaseModel, Field

class TriageAssessment(BaseModel):
    """Structured assessment produced by Bedrock or deterministic triage."""
    category: str = Field(description="Incident category: crop_burning, garbage_burning, cracker_burning, construction_dust, or none")
    priority: Literal["low", "medium", "high", "critical"] = Field(description="Assigned priority: low, medium, high, or critical")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    rationale: str = Field(description="Concise rationale explaining the triage assessment without user-submitted notes")
    next_action: Literal["route_department", "flag_manual_review", "merge_duplicate", "reject_unsafe"] = Field(
        description="Supported next action: route_department, flag_manual_review, merge_duplicate, or reject_unsafe"
    )

class TriageResult(BaseModel):
    """Full triage workflow output."""
    report_id: str
    status: Literal["received", "routed", "merged", "rejected"]
    category: str
    priority: str
    confidence: float
    rationale: str
    next_action: str
    needs_review: bool
    merged_with: Optional[str] = None
    source: Literal["bedrock", "fallback"]
    run_id: str
    triaged_at: str
