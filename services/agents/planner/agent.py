"""
Burn-window Planner Agent (Strands Agents SDK)

STUB ONLY — defines the agent, tools, and flow.

The planner is the star agent. It:
1. Gathers weather, wind, fire, and sowing data via tools
2. Runs the deterministic scorer over the next 7 days
3. Picks the best day and checks machine availability
4. Re-plans if no machine is free (next-best day or straw outlet fallback)
5. Explains the choice in the farmer's preferred language

Max steps: 10 (configurable via MAX_AGENT_STEPS)
"""

from typing import Optional

# TODO: Import from strands_agents when implementing
# from strands import Agent
# from strands.tools import tool


class PlannerAgent:
    """
    Burn-window planner agent.

    Orchestrates tool calls to find the optimal field-clearing day,
    then explains the recommendation in the farmer's language.
    """

    def __init__(self, model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"):
        """
        Initialize the planner agent.

        Args:
            model_id: Bedrock model ID for reasoning and explanation generation.
        """
        self.model_id = model_id
        self.max_steps = 10
        # TODO: Initialize Strands Agent with tools and system prompt
        # self.agent = Agent(
        #     model=model_id,
        #     tools=[
        #         get_forecast,
        #         get_wind,
        #         get_fire_hotspots,
        #         get_sowing_window,
        #         find_machine_slots,
        #         find_straw_outlets,
        #         book_slot,
        #     ],
        #     system_prompt=open("prompts/planner.md").read(),
        #     max_steps=self.max_steps,
        # )

    def run(
        self,
        village_id: str,
        crop_stage: str,
        language: str = "en",
    ) -> dict:
        """
        Run the planner for a village and crop stage.

        Args:
            village_id: Village identifier
            crop_stage: One of "harvested", "partially_cleared", "standing"
            language: Language code for the explanation ("en", "hi", "pa")

        Returns:
            PlanResult dict with best_day, score_breakdown, machine_option,
            straw_outlet_option, reason_text, and tool_trace.
        """
        # TODO: Implement actual agent invocation
        # result = self.agent.run(
        #     f"Find the best clearing day for village {village_id}, "
        #     f"crop stage {crop_stage}, explain in {language}"
        # )
        raise NotImplementedError("Planner agent not yet implemented. Use mock data from the API handler.")
