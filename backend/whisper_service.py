"""
whisper_service.py
──────────────────
Audio transcription using faster-whisper (CTranslate2 backend).

Fixes applied for macOS:
  - KMP_DUPLICATE_LIB_OK=TRUE  — silences the OMP Error #15 (duplicate
    libiomp5.dylib from torch + ctranslate2 both loaded on macOS)
  - numpy<2 pin in requirements.txt  — fixes the NumPy 2.x warning
  - model downloaded to local cache on first use (~140 MB, one-time)
"""

import asyncio
import os
import tempfile
import logging
from pathlib import Path

# ── Fix: macOS OMP duplicate library crash ────────────────────────────────────
# Must be set BEFORE ctranslate2 / torch are imported.
# This is safe for development; in production use a Docker image instead.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

logger = logging.getLogger(__name__)

# ── Check faster-whisper is importable at startup ─────────────────────────────
try:
    from faster_whisper import WhisperModel as _check  # noqa: F401
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    logger.error(
        "\n\n"
        "═══════════════════════════════════════════════════════\n"
        "  faster-whisper is NOT installed.\n"
        "  Run:  pip install faster-whisper\n"
        "  Then restart the server.\n"
        "═══════════════════════════════════════════════════════\n"
    )

# ── Singleton model — loaded once, reused forever ─────────────────────────────
_model = None
_model_lock = asyncio.Lock()


async def _get_model():
    """Load WhisperModel once on first call, return cached instance after."""
    if not WHISPER_AVAILABLE:
        raise RuntimeError(
            "faster-whisper is not installed. "
            "Run: pip install faster-whisper  then restart the server."
        )

    global _model
    if _model is not None:
        return _model

    async with _model_lock:
        if _model is not None:
            return _model

        from faster_whisper import WhisperModel

        logger.info("Loading faster-whisper 'base' model — downloading if needed (~140 MB)…")
        loop = asyncio.get_event_loop()

        # device="cpu"       — works on all machines, no GPU needed
        # compute_type="int8" — fastest CPU inference, low memory usage
        # Model is cached in ~/.cache/huggingface after first download
        _model = await loop.run_in_executor(
            None,
            lambda: WhisperModel("base", device="cpu", compute_type="int8"),
        )

        logger.info("faster-whisper model ready ✓")
        return _model


async def transcribe_audio(audio_bytes: bytes, filename: str) -> dict:
    """
    Transcribe raw audio bytes → dict:
        text     : str   — full joined transcript
        segments : list  — [{start, end, text}, ...]
        language : str   — detected language code (e.g. 'en')
    """
    if not WHISPER_AVAILABLE:
        raise RuntimeError(
            "faster-whisper is not installed. "
            "Run: pip install faster-whisper  then restart the server."
        )

    # Derive file extension — strip codec params e.g. "recording.webm" from
    # a filename that came from "audio/webm;codecs=opus"
    ext = Path(filename).suffix.lower()
    if not ext or ext not in (".webm", ".ogg", ".wav", ".mp3", ".mp4", ".m4a"):
        ext = ".webm"

    # faster-whisper requires a real file path, not in-memory bytes
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        model = await _get_model()
        loop = asyncio.get_event_loop()

        def _run_transcribe():
            segments_gen, info = model.transcribe(
                tmp_path,
                language="en",       # remove this line for auto language detection
                task="transcribe",
                beam_size=5,
                vad_filter=True,     # automatically skip silence
                vad_parameters=dict(min_silence_duration_ms=500),
            )
            # Must materialise generator inside this thread — not outside
            segments = [
                {
                    "start": round(seg.start, 2),
                    "end":   round(seg.end, 2),
                    "text":  seg.text.strip(),
                }
                for seg in segments_gen
            ]
            return segments, info

        segments, info = await loop.run_in_executor(None, _run_transcribe)

        full_text = " ".join(s["text"] for s in segments).strip()
        logger.info(
            "Transcription done — lang=%s  duration=%.1fs  words=%d",
            info.language, info.duration, len(full_text.split()),
        )

        return {
            "text":     full_text,
            "segments": segments,
            "language": info.language,
        }

    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass