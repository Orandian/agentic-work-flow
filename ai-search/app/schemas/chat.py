from pydantic import BaseModel, Field
from typing import Literal


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


class SourceDocument(BaseModel):
    doc_id: int
    name: str
    chunk_text: str
    relevance_score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceDocument]
