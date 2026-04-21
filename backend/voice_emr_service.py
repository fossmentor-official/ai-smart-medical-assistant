"""
voice_emr_service.py
────────────────────
Takes a raw doctor-patient transcript and uses Gemini-2.5-flash to:
  1. Identify speaker roles (doctor vs patient)
  2. Extract structured SOAP notes
  3. Suggest ICD-10 + CPT codes
  4. Assess risk level
  5. Return a clean JSON payload for the frontend EMR card
"""

import asyncio
import json
import logging
import re
from google import genai
from config import GEMINI_API_KEY

logger = logging.getLogger(__name__)
client = genai.Client(api_key=GEMINI_API_KEY)

# ── System prompt ─────────────────────────────────────────────────────────────
VOICE_EMR_PROMPT = """You are TotalCura's clinical AI specializing in converting raw doctor-patient conversation transcripts into structured Electronic Medical Records (EMR).

Given the raw transcript below, produce ONLY a single valid JSON object — no markdown fences, no explanation, no preamble.

The JSON must follow this EXACT schema:
{
  "speakers": [
    {"role": "doctor|patient|unknown", "text": "what they said"}
  ],
  "chief_complaint": "one concise sentence",
  "soap": {
    "subjective": "patient's reported symptoms and history in narrative form",
    "objective": "any observable findings mentioned (vitals, exam, labs)",
    "assessment": "clinical impression / probable diagnosis",
    "plan": "treatment, medications, follow-up"
  },
  "icd10": [
    {"code": "X00.0", "description": "Condition description"}
  ],
  "cpt": [
    {"code": "99213", "description": "Service description"}
  ],
  "medications": ["Drug name dose frequency"],
  "recommended_tests": ["Test name"],
  "risk": {
    "level": "LOW|MEDIUM|HIGH|CRITICAL",
    "score": 45,
    "rationale": "brief reason for this risk level"
  },
  "follow_up": "follow-up instruction",
  "confidence": 88
}

Rules:
- speakers: Break the transcript into alternating speaker segments. Infer role from context (the first person asking questions is usually the doctor; the person describing symptoms is usually the patient). Use "unknown" only if truly ambiguous.
- icd10: Include all clinically relevant codes you can infer, minimum 1.
- cpt: Include the most likely billing codes for this visit type.
- risk.score: integer 0–100 matching the risk level (LOW=0–30, MEDIUM=31–60, HIGH=61–85, CRITICAL=86–100).
- confidence: your overall confidence in this EMR extraction (0–100).
- If information for a field is not present in the transcript, use an empty string "" or empty array [].
- Return ONLY the JSON object. Nothing else."""


async def structure_transcript_to_emr(transcript: str) -> dict:
    """
    Send transcript to Gemini-2.5-flash → parse structured EMR JSON.
    Returns the parsed dict or raises on failure.
    """
    full_prompt = f"{VOICE_EMR_PROMPT}\n\nTranscript:\n{transcript}"

    loop = asyncio.get_event_loop()

    try:
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt,
            ),
        )

        raw = response.text.strip()
        logger.debug("Gemini raw response: %s", raw[:300])

        # Strip accidental markdown fences if Gemini adds them
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        emr_data = json.loads(raw)
        return emr_data

    except json.JSONDecodeError as e:
        logger.error("Gemini returned invalid JSON: %s", e)
        raise ValueError(f"Gemini returned non-JSON output: {e}")
    except Exception as e:
        logger.error("Gemini EMR structuring failed: %s", e)
        raise
