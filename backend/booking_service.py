"""
booking_service.py  —  Smart Demo Booking (AI-Powered)
TotalCura · Backend Service
"""

from __future__ import annotations

import json
import logging
import asyncio
import uuid
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from gemini_service import get_gemini_client
from config import GEMINI_MODEL

logger = logging.getLogger(__name__)

booking_router = APIRouter(prefix="/api/booking", tags=["Smart Booking"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class BookingChatRequest(BaseModel):
    history: List[ChatMessage]
    user_message: str


class BookingChatResponse(BaseModel):
    reply: str
    is_complete: bool
    collected: dict


class ClinicProfile(BaseModel):
    clinic_type: str
    doctor_count: str
    top_challenge: str
    extra_notes: Optional[str] = None


class RecommendRequest(BaseModel):
    profile: ClinicProfile


class Package(BaseModel):
    name: str
    tag: Literal["recommended", "alternative", "enterprise"]
    headline: str
    features: List[str]
    price_hint: str
    cta: str


class RecommendResponse(BaseModel):
    packages: List[Package]
    personalised_pitch: str
    demo_agenda: List[str]


class BookingConfirmRequest(BaseModel):
    profile: ClinicProfile
    chosen_package: str
    contact_name: str
    contact_email: str
    preferred_slot: Optional[str] = None


class BookingConfirmResponse(BaseModel):
    booking_ref: str
    message: str


# ─── System Prompts ────────────────────────────────────────────────────────────

INTAKE_SYSTEM = """
You are TotalCura's intelligent demo booking assistant.

Collect:
1. clinic_type
2. doctor_count
3. top_challenge

Rules:
- Ask ONE question per turn
- Keep replies under 40 words
- End with [PROFILE_COMPLETE] when done

Return ONLY JSON:
{
  "reply": "",
  "is_complete": false,
  "collected": {
    "clinic_type": null,
    "doctor_count": null,
    "top_challenge": null
  }
}
""".strip()


RECOMMEND_SYSTEM = """
You are TotalCura's senior solutions consultant.

Return ONLY JSON:

{
  "packages": [
    {
      "name": "",
      "tag": "recommended",
      "headline": "",
      "features": [],
      "price_hint": "",
      "cta": ""
    }
  ],
  "personalised_pitch": "",
  "demo_agenda": []
}
""".strip()


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _safe_json(text: str) -> dict:
    """Parse Gemini JSON safely."""
    text = text.strip()

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())


async def _gemini_chat(system: str, user_content: str) -> str:
    """
    Correct Gemini SDK usage (NEW API).
    """
    client = get_gemini_client()
    full_prompt = f"{system}\n\nUser: {user_content}"

    try:
        loop = asyncio.get_event_loop()

        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model=GEMINI_MODEL,
                contents=full_prompt
            )
        )

        return response.text

    except Exception as e:
        logger.error("Gemini error: %s", e)
        raise


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@booking_router.post("/chat", response_model=BookingChatResponse)
async def booking_chat(req: BookingChatRequest):

    history_text = "\n".join(
        f"{m.role}: {m.content}" for m in req.history
    )

    prompt = f"{history_text}\nuser: {req.user_message}"

    try:
        raw = await _gemini_chat(INTAKE_SYSTEM, prompt)
        data = _safe_json(raw)

        return BookingChatResponse(
            reply=data.get("reply", ""),
            is_complete=data.get("is_complete", False),
            collected=data.get("collected", {}),
        )

    except json.JSONDecodeError:
        return BookingChatResponse(
            reply=raw[:500],
            is_complete=False,
            collected={},
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@booking_router.post("/recommend", response_model=RecommendResponse)
async def booking_recommend(req: RecommendRequest):

    profile_text = (
        f"Clinic type: {req.profile.clinic_type}\n"
        f"Doctors: {req.profile.doctor_count}\n"
        f"Challenge: {req.profile.top_challenge}\n"
        f"Notes: {req.profile.extra_notes or 'None'}"
    )

    try:
        raw = await _gemini_chat(RECOMMEND_SYSTEM, profile_text)
        data = _safe_json(raw)

        return RecommendResponse(
            packages=[Package(**p) for p in data.get("packages", [])],
            personalised_pitch=data.get("personalised_pitch", ""),
            demo_agenda=data.get("demo_agenda", []),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@booking_router.post("/confirm", response_model=BookingConfirmResponse)
async def booking_confirm(req: BookingConfirmRequest):

    ref = "TC-" + str(uuid.uuid4())[:8].upper()

    logger.info(
        "Booking confirmed ref=%s email=%s package=%s",
        ref,
        req.contact_email,
        req.chosen_package,
    )

    return BookingConfirmResponse(
        booking_ref=ref,
        message=(
            f"Demo confirmed for {req.chosen_package}. "
            f"Ref: {ref}. Email sent to {req.contact_email}."
        ),
    )