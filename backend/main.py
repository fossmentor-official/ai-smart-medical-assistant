import json
import logging

from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import ChatRequest, TranscriptRequest, DemoEMRRequest
from gemini_service import ask_gemini_stream
from whisper_service import transcribe_audio
from voice_emr_service import structure_transcript_to_emr
from demo_emr_service import structure_demo_dictation
from config import ALLOWED_ORIGINS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="TotalCura AI API")
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(status_code=429, content={"error": "Too many requests. Please wait."})


# ─────────────────────────────────────────────────────────────────────────────
# Core chat endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "TotalCura AI"}


@app.post("/api/chat")
@limiter.limit("15/minute")
async def chat(request: Request, req: ChatRequest):
    async def event_stream():
        try:
            async for chunk in ask_gemini_stream(req.message, req.mode):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Demo Voice-to-EMR  (pre-written dictation scripts, no microphone)
# Endpoint: POST /api/demo/generate-emr
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/demo/generate-emr")
@limiter.limit("20/minute")
async def demo_generate_emr(request: Request, req: DemoEMRRequest):
    """
    Demo feature: accepts a pre-written doctor dictation string,
    sends it to Gemini-2.5-flash, returns structured EMR JSON.
    No audio/microphone involved.
    """
    logger.info("Demo EMR request — dictation length=%d", len(req.dictation))
    try:
        emr = await structure_demo_dictation(req.dictation)
        emr["dictation"] = req.dictation          # echo back for display
        emr["scenario_id"] = req.scenario_id      # echo back for UI
        return emr
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Demo EMR failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Demo EMR generation failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Live Voice-to-EMR  (real microphone → Whisper → Gemini)
# Endpoints: POST /api/voice/transcribe  +  POST /api/voice/generate-emr
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/voice/transcribe")
@limiter.limit("10/minute")
async def transcribe(request: Request, audio: UploadFile = File(...)):
    """
    Step 1 — Live pipeline.
    Accepts browser-recorded audio (webm/ogg/wav/mp3/m4a),
    transcribes with Whisper, returns text + segments.
    """
    allowed_types = {
        "audio/webm", "audio/ogg", "audio/wav", "audio/mpeg",
        "audio/mp4", "audio/m4a", "audio/x-m4a", "video/webm",
    }
    # Use startswith so codec params like "audio/webm;codecs=opus" are accepted
    allowed_prefixes = (
        "audio/webm", "audio/ogg", "audio/wav", "audio/mpeg",
        "audio/mp4", "audio/m4a", "audio/x-m4a", "video/webm",
    )
    ct = (audio.content_type or "").lower().split(";")[0].strip()
    if ct and not any(ct == p for p in allowed_prefixes):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported format: {audio.content_type}. Use webm, ogg, wav, mp3, or m4a.",
        )

    audio_bytes = await audio.read()
    if len(audio_bytes) < 1000:
        raise HTTPException(status_code=400, detail="Audio too small or empty.")
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio exceeds 25 MB limit.")

    logger.info("Live transcribe: %s  size=%d bytes", audio.filename, len(audio_bytes))
    try:
        result = await transcribe_audio(audio_bytes, audio.filename or "recording.webm")
        return {
            "transcript": result["text"],
            "language":   result["language"],
            "segments":   result["segments"],
        }
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/api/voice/generate-emr")
@limiter.limit("10/minute")
async def live_generate_emr(request: Request, req: TranscriptRequest):
    """
    Step 2 — Live pipeline.
    Takes Whisper transcript, sends to Gemini-2.5-flash,
    returns fully structured EMR with speaker diarization.
    """
    logger.info("Live EMR gen — transcript length=%d", len(req.transcript))
    try:
        emr = await structure_transcript_to_emr(req.transcript)
        emr["transcript"] = req.transcript
        return emr
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Live EMR failed: %s", e)
        raise HTTPException(status_code=500, detail=f"EMR generation failed: {str(e)}")
