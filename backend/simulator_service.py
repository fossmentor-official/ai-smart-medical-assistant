"""
simulator_service.py  —  Interactive Use-Case Simulator
TotalCura · Backend Service

Endpoints:
  POST /api/simulator/workflow  — returns a workflow (static preset OR Gemini-generated)
  POST /api/simulator/track     — event tracking (analytics, fire-and-forget)

Design decision:
  The static presets in simulatorData.ts are the primary data source.
  This backend is called when a user wants a CUSTOM workflow beyond the 4 presets —
  e.g. "I run a fertility clinic" or "I'm a radiology department head".
  Gemini generates tailored steps on the fly.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from gemini_service import get_gemini_client
from config import GEMINI_MODEL

logger = logging.getLogger(__name__)

simulator_router = APIRouter(prefix="/api/simulator", tags=["Use-Case Simulator"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

FacilityType = Literal["clinic", "hospital", "lab", "tele", "custom"]

class WorkflowStep(BaseModel):
    tag: str          # short stage label  e.g. "Consultation"
    title: str        # what TotalCura does
    desc: str         # human-readable one-sentence description
    aiOutput: str     # simulated AI output card text
    timingNote: str   # "0 sec — automatic", "During consult", etc.

class RolePersona(BaseModel):
    icon: str         # emoji
    name: str         # "Dr. Sara — General Practitioner"
    role: str         # "Solo GP clinic · 30 patients/day"

class RoleMetric(BaseModel):
    primary: str        # e.g. "3 hrs"
    primaryLabel: str   # e.g. "Saved daily on documentation"

class SimulatorRequest(BaseModel):
    facility: str        # one of the 4 types OR a free-text custom description
    role: str            # role name
    custom_description: Optional[str] = None  # only for custom facility

class SimulatorResponse(BaseModel):
    facility: str
    role: str
    persona: RolePersona
    steps: list[WorkflowStep]
    metric: RoleMetric
    generated_at: str

class TrackRequest(BaseModel):
    facility: str
    role: str
    event: Literal["view", "step_click", "cta_click"]


# ─── Known facilities (for Gemini context) ─────────────────────────────────────

KNOWN_FACILITIES = {"clinic", "hospital", "lab", "tele"}

# ─── Gemini prompt ─────────────────────────────────────────────────────────────

def _build_system_prompt() -> str:
    return """
You are TotalCura's AI product expert.
TotalCura is an AI-powered healthcare platform that automates:
  - Clinical documentation (Voice-to-EMR, SOAP notes)
  - Billing & RCM (ICD-10/CPT coding, claim submission, denial management)
  - No-show prediction & patient reminders
  - AI insights & revenue forecasting
  - Scheduling optimisation

Given a healthcare facility type and a staff role, generate a realistic step-by-step
AI workflow showing exactly how TotalCura helps that specific person in their daily work.

Return ONLY valid JSON — no preamble, no markdown, no backtick fences:
{
  "persona": {
    "icon": "<single relevant emoji>",
    "name": "<Name — Role Title>",
    "role": "<Facility description · key stat>"
  },
  "steps": [
    {
      "tag": "<short stage name>",
      "title": "<what TotalCura AI does — action verb, concise>",
      "desc": "<one clear sentence about the benefit>",
      "aiOutput": "<realistic TotalCura AI output text, specific and data-rich>",
      "timingNote": "<when this happens, e.g. '0 sec — automatic'>"
    }
  ],
  "metric": {
    "primary": "<impressive number, e.g. '3 hrs' or '94%'>",
    "primaryLabel": "<short label for that number>"
  }
}

Rules:
- Include 3–5 steps.
- Each aiOutput must be realistic and specific — not generic. Include numbers, names, drug names, codes where realistic.
- Persona name should feel like a real person in Pakistan / South Asia.
- metric.primary must be a specific, credible number with units.
- Steps must flow chronologically through a typical working day.
""".strip()


async def _generate_workflow_with_gemini(
    facility: str, role: str, custom_description: Optional[str]
) -> SimulatorResponse:
    """Call Gemini Flash to generate a custom workflow."""
    client = get_gemini_client()
    model  = client.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=_build_system_prompt(),
    )

    facility_context = custom_description or facility
    prompt = f"Facility type: {facility_context}\nStaff role: {role}"

    logger.info("Simulator Gemini call — facility=%s role=%s", facility, role)
    resp = await model.generate_content_async(prompt)
    raw  = resp.text.strip()

    # Strip markdown fences if model adds them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    data = json.loads(raw)

    return SimulatorResponse(
        facility=facility,
        role=role,
        persona=RolePersona(**data["persona"]),
        steps=[WorkflowStep(**s) for s in data["steps"]],
        metric=RoleMetric(**data["metric"]),
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


# ─── Static preset loader (mirrors simulatorData.ts) ──────────────────────────
# These are kept in sync with the frontend static data.
# The backend uses them to skip Gemini for known facility+role combos,
# making the response instant and eliminating API cost.

_STATIC_PRESETS: dict[tuple[str, str], dict] = {
    ("clinic", "Doctor"): {
        "persona": {"icon": "🩺", "name": "Dr. Sara — General Practitioner", "role": "Solo GP clinic · 30 patients/day"},
        "metric": {"primary": "3 hrs", "primaryLabel": "Saved daily on documentation"},
        "steps": [
            {"tag": "Patient arrives", "title": "AI auto-pulls patient history", "desc": "TotalCura surfaces last visit, medications, and allergies before you open the door.", "aiOutput": "Summary ready: Diabetes type 2, metformin 500mg, last HbA1c 7.2% (3 months ago). Flag: overdue BP check.", "timingNote": "0 sec — automatic"},
            {"tag": "Consultation", "title": "Voice-to-EMR captures notes live", "desc": "Speak naturally. AI structures your dictation into a SOAP note in real time.", "aiOutput": "Subjective: fatigue. Objective: BP 138/88. Assessment: Hypertension developing. Plan: Amlodipine 5mg, follow-up 4 weeks.", "timingNote": "During consult — hands-free"},
            {"tag": "Coding", "title": "ICD-10 + CPT codes suggested instantly", "desc": "AI reads your SOAP note and proposes billing codes with confidence scores.", "aiOutput": "ICD-10: I10 (Hypertension) · E11.9 (T2DM). CPT: 99213. Confidence: 94%. Upcoding opportunity detected.", "timingNote": "8 sec after dictation"},
            {"tag": "Follow-up", "title": "Smart reminder scheduled automatically", "desc": "AI creates a follow-up task and drafts a patient SMS — you approve in one tap.", "aiOutput": "SMS draft: \"Hi Sara, Dr. Ahmed has scheduled your follow-up. Reply YES to confirm.\" Pending approval.", "timingNote": "Before patient leaves"},
        ],
    },
    # Additional static presets can be added here following the same pattern.
    # For all other facility+role combinations, Gemini generates the workflow.
}


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@simulator_router.post("/workflow", response_model=SimulatorResponse)
async def get_simulator_workflow(req: SimulatorRequest):
    """
    Returns a personalised AI workflow for the given facility + role.

    Strategy:
      1. If it's a known static preset → return instantly (no LLM cost).
      2. If it's a known facility type but unlisted role → generate with Gemini.
      3. If it's a custom facility description → always generate with Gemini.
    """
    key = (req.facility.lower(), req.role)

    if key in _STATIC_PRESETS and not req.custom_description:
        # Fast path: return pre-computed static data
        preset = _STATIC_PRESETS[key]
        return SimulatorResponse(
            facility=req.facility,
            role=req.role,
            persona=RolePersona(**preset["persona"]),
            steps=[WorkflowStep(**s) for s in preset["steps"]],
            metric=RoleMetric(**preset["metric"]),
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    # Slow path: generate with Gemini
    try:
        return await _generate_workflow_with_gemini(
            req.facility, req.role, req.custom_description
        )
    except json.JSONDecodeError as e:
        logger.error("Simulator: Gemini returned invalid JSON: %s", e)
        raise HTTPException(status_code=502, detail="AI returned malformed response — please retry.")
    except Exception as e:
        logger.error("Simulator workflow error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@simulator_router.post("/track")
async def track_simulator_event(req: TrackRequest):
    """
    Lightweight analytics event tracking.
    In production: write to a `simulator_events` table in Supabase.
    """
    logger.info(
        "Simulator event — facility=%s role=%s event=%s",
        req.facility, req.role, req.event,
    )
    # TODO: await supabase.table("simulator_events").insert({
    #   "facility": req.facility, "role": req.role,
    #   "event": req.event, "ts": datetime.now(timezone.utc).isoformat()
    # }).execute()
    return {"ok": True}
