"""
Grounded Ask Agent (Strands Agents SDK)

STUB ONLY — triggered when a citizen taps a suggested question.

Behavior:
1. Receives one of three preset questions
2. Answers ONLY from already-fetched AQI, forecast, and report data
3. Fixed system prompt, short output limit, refusal for anything outside scope
4. No free-form chat — only the preset questions are accepted

Guardrails:
- Data passed in context, not fetched by the agent
- No medical advice, only standard AQI-category guidance
- Output limited to ~100 words
- Bedrock Guardrails or equivalent output filter
"""


class AskAgent:
    """
    Grounded Q&A agent for citizens.
    Only answers preset questions from fetched data context.
    """

    PRESET_QUESTIONS = [
        "Is it okay for kids to play outside today?",
        "Should I wear a mask when going out?",
        "When will the air quality improve?",
    ]

    def __init__(self, model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"):
        self.model_id = model_id
        self.max_output_tokens = 200
        # TODO: Initialize Strands Agent with grounded system prompt

    def run(self, question: str, context: dict) -> dict:
        """
        Answer a preset question using provided data context.

        Args:
            question: Must be one of PRESET_QUESTIONS
            context: {
                "aqi": int,
                "aqi_category": str,
                "forecast": dict,
                "wind": dict,
                "reports_nearby": int
            }

        Returns:
            {
                "question": str,
                "answer": str,
                "sources": [str],
                "is_sample": bool
            }
        """
        if question not in self.PRESET_QUESTIONS:
            return {
                "question": question,
                "answer": "I can only answer the suggested questions about today's conditions.",
                "sources": [],
                "is_sample": True,
            }

        raise NotImplementedError("Ask agent not yet implemented.")
