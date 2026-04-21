from pydantic import BaseModel, Field
from typing import Literal, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Core chat
# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)  # 100-char limit for free users
    mode: Literal["clinical", "billing", "docs", "insights"] = "clinical"

class ChatResponse(BaseModel):
    success: bool
    error: str | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Demo Voice-to-EMR  (pre-written dictation, no mic)
# ─────────────────────────────────────────────────────────────────────────────

class DemoEMRRequest(BaseModel):
    """POST /api/demo/generate-emr"""
    dictation:   str = Field(..., min_length=20, max_length=5000)
    scenario_id: str = Field(default="", max_length=100)


# ─────────────────────────────────────────────────────────────────────────────
# Live Voice-to-EMR  (real mic → Whisper → Gemini)
# ─────────────────────────────────────────────────────────────────────────────

class TranscriptRequest(BaseModel):
    """POST /api/voice/generate-emr  — step 2 of live pipeline"""
    transcript: str = Field(..., min_length=10, max_length=10000)

class Speaker(BaseModel):
    role: Literal["doctor", "patient", "unknown"]
    text: str

class SOAPNotes(BaseModel):
    subjective: str
    objective:  str
    assessment: str
    plan:       str

class ICD10Code(BaseModel):
    code:        str
    description: str

class CPTCode(BaseModel):
    code:        str
    description: str

class RiskInfo(BaseModel):
    level:     Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    score:     int        # 0–100
    rationale: str

class VoiceEMRResponse(BaseModel):
    transcript:        str
    speakers:          list[Speaker]
    chief_complaint:   str
    soap:              SOAPNotes
    icd10:             list[ICD10Code]
    cpt:               list[CPTCode]
    medications:       list[str]
    recommended_tests: list[str]
    risk:              RiskInfo
    follow_up:         str
    confidence:        int   # 0–100
