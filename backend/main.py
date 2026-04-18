from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import time
from gemini_service import ask_gemini

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

def stream_generator(text: str):
    for word in text.split():
        yield word + " "
        time.sleep(0.03)  # simulate streaming

@app.post("/api/chat")
def chat(req: ChatRequest):
    full_response = ask_gemini(req.message)
    return StreamingResponse(
        stream_generator(full_response),
        media_type="text/plain"
    )