import json
from agents.base import BaseAgent
from prompts.templates import ARCHITECTURE_EXPLANATION_PROMPT
from typing import Dict, Any, Optional
from utils.llm_provider import AIProvider

class ArchitectureExplanationAgent(BaseAgent):
    def __init__(self, client: Optional[AIProvider] = None):
        super().__init__(
            name="ArchitectureExplanationAgent",
            system_prompt=ARCHITECTURE_EXPLANATION_PROMPT,
            client=client
        )

    async def explain(self, plan: Dict[str, Any], raw_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Explains architectural trade-offs and decisions.
        """
        user_prompt = (
            f"Planned Architecture:\n{json.dumps(plan, indent=2)}\n\n"
            f"Raw User Requirements:\n{json.dumps(raw_requirements, indent=2)}"
        )
        return await self.execute(user_prompt)
