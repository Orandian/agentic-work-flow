from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


class SourceDocument(BaseModel):
    doc_id: int
    name: str
    chunk_text: str
    relevance_score: float


class SearchResponse(BaseModel):
    answer: str
    sources: list[SourceDocument]
    query: str
