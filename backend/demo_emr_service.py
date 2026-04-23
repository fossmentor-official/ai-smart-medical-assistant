"""
demo_emr_service.py
────────────────────
Structures a pre-written (simulated) doctor dictation text into a
full EMR JSON using gemini-2.5-flash-lite.

Used by the Demo Voice-to-EMR feature (no real microphone).
The Live Voice-to-EMR feature uses voice_emr_service.py instead.
"""

import asyncio
import json
import logging
import re

from google import genai
from config import GEMINI_API_KEY

logger = logging.getLogger(__name__)
client = genai.Client(api_key=GEMINI_API_KEY)

DEMO_EMR_PROMPT = """You are TotalCura's clinical AI. A doctor has dictated the following clinical note.
Convert it into a structured EMR JSON. Return ONLY the JSON — no markdown fences, no explanation.

Schema:
{
  "chief_complaint": "one concise sentence",
  "soap": {
    "subjective":  "patient symptoms & history in narrative",
    "objective":   "vitals, exam findings, labs mentioned",
    "assessment":  "clinical impression / diagnosis",
    "plan":        "treatment, medications, referrals, follow-up"
  },
  "icd10": [
    {"code": "X00.0", "description": "Condition name"}
  ],
  "cpt": [
    {"code": "99213", "description": "Service description"}
  ],
  "medications": ["Drug dose frequency"],
  "recommended_tests": ["Test name"],
  "risk": {
    "level": "LOW|MEDIUM|HIGH|CRITICAL",
    "score": 45,
    "rationale": "brief reason"
  },
  "follow_up": "follow-up instruction",
  "confidence": 92
}

Rules:
- risk.score: integer 0-100 matching level (LOW=0-30, MEDIUM=31-60, HIGH=61-85, CRITICAL=86-100)
- Include at least 1 icd10 code and 1 cpt code
- Return ONLY the JSON. Nothing else."""


async def structure_demo_dictation(dictation: str) -> dict:
    """
    Send a simulated doctor dictation string to Gemini → structured EMR dict.
    """
    full_prompt = f"{DEMO_EMR_PROMPT}\n\nDoctor dictation:\n{dictation}"

    loop = asyncio.get_event_loop()
    try:
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=full_prompt,
            ),
        )

        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        return json.loads(raw)

    except json.JSONDecodeError as e:
        logger.error("Gemini returned invalid JSON for demo EMR: %s", e)
        raise ValueError(f"Gemini returned non-JSON: {e}")
    except Exception as e:
        logger.error("Demo EMR generation failed: %s", e)
        raise
