from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from models import ChatRequest
from gemini_service import ask_gemini_stream
from config import ALLOWED_ORIGINS
import json

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="TotalCura AI API")
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,   # ← env-based, not ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(status_code=429, content={"error": "Too many requests. Please wait."})

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
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )