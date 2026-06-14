import json
import re
import logging
from typing import Dict, Any

logger = logging.getLogger("safe_json_parser")

class SafeJsonParser:
    @staticmethod
    def parse(raw_text: str) -> Dict[str, Any]:
        """
        Safely parses JSON out of a noisy LLM response.
        Strips <think> blocks and markdown formatting.
        """
        # 1. Remove <think>...</think> blocks completely
        text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL)
        
        # 2. Extract JSON from markdown fences if present
        json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
        if json_match:
            text = json_match.group(1)
        else:
            # 3. If no fences, find the first '{' and last '}'
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                text = text[start_idx:end_idx+1]
        
        # 4. Attempt basic JSON parse
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"Initial JSON parse failed: {e}")
            # Attempt basic repair (e.g. trailing commas)
            repaired = re.sub(r',\s*}', '}', text)
            repaired = re.sub(r',\s*]', ']', repaired)
            try:
                return json.loads(repaired)
            except Exception as e2:
                logger.error(f"Repaired JSON parse also failed: {e2}")
                raise ValueError("Could not parse JSON from LLM response")
