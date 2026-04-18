from pydantic import BaseModel, Field
from typing import Literal

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    mode: Literal["clinical", "billing", "docs", "insights"] = "clinical"

class ChatResponse(BaseModel):
    success: bool
    error: str | None = None