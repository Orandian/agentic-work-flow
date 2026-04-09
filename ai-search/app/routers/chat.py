import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_staff
from app.schemas.chat import ChatRequest, ChatResponse, SourceDocument
from app.services import ollama_service
from app.repositories import chroma_repository

router = APIRouter(prefix="/chat", tags=["chat"])


def _retrieve_context(query: str, top_k: int) -> tuple[str, list[SourceDocument]]:
    """Embed the query and retrieve top-k chunks from ChromaDB."""
    query_embedding = ollama_service.embed(query)
    results = chroma_repository.query_chunks(query_embedding, top_k)

    chunks    = results.get("documents",  [[]])[0]
    metadatas = results.get("metadatas",  [[]])[0]
    distances = results.get("distances",  [[]])[0]

    context = "\n---\n".join(chunks) if chunks else ""

    sources = [
        SourceDocument(
            doc_id=int(meta.get("doc_id", 0)),
            name=str(meta.get("name", "")),
            chunk_text=chunk,
            relevance_score=round(1.0 - dist, 4),
        )
        for chunk, meta, dist in zip(chunks, metadatas, distances)
    ]

    return context, sources


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: dict = Depends(require_staff),
):
    """
    Streaming chat endpoint. Returns Server-Sent Events.
    Each event is a JSON object: {"token": "..."} or {"sources": [...], "done": true}
    """
    messages = [m.model_dump() for m in request.messages]
    last_user_msg = next(
        (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
    )

    context, sources = _retrieve_context(last_user_msg, request.top_k)

    async def event_stream():
        try:
            async for token in ollama_service.chat_stream(messages, context):
                yield f"data: {json.dumps({'token': token})}\n\n"

            # Send sources as final event
            sources_payload = [s.model_dump() for s in sources]
            yield f"data: {json.dumps({'sources': sources_payload, 'done': True})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc), 'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """Non-streaming chat — returns full answer at once."""
    messages = [m.model_dump() for m in request.messages]
    last_user_msg = next(
        (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
    )

    context, sources = _retrieve_context(last_user_msg, request.top_k)

    answer_parts: list[str] = []
    async for token in ollama_service.chat_stream(messages, context):
        answer_parts.append(token)

    return ChatResponse(answer="".join(answer_parts), sources=sources)
