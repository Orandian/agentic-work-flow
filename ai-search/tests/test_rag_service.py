"""
test_rag_service.py — unit tests for app.services.rag_service.search().

No HTTP layer involved; functions are called directly.
ChromaDB and the LLM are always monkeypatched.
"""
import numpy as np
import pytest
from fastapi import HTTPException

from app.schemas.search import SearchRequest


# ---------------------------------------------------------------------------
# Shared user dict used in all tests
# ---------------------------------------------------------------------------

_STAFF_USER = {"email": "u@t.com", "user_id": 1, "role": "STAFF"}


# ---------------------------------------------------------------------------
# 1. Happy-path: returns a populated SearchResponse
# ---------------------------------------------------------------------------

def test_search_returns_response(mock_chroma, mock_llm, mock_embedding):
    """search() with mocked chroma + LLM returns SearchResponse with answer and sources."""
    from app.services import rag_service

    request = SearchRequest(query="test query", top_k=3)
    result = rag_service.search(request, _STAFF_USER)

    assert result.answer == "This is the answer."
    assert isinstance(result.sources, list)
    assert len(result.sources) > 0


# ---------------------------------------------------------------------------
# 2. Source mapping: doc_id, name, chunk_text, relevance_score
# ---------------------------------------------------------------------------

def test_search_maps_sources_correctly(mock_chroma, mock_llm, mock_embedding):
    """
    Sources list entries must have the correct fields derived from chroma metadata.
    relevance_score = round(1.0 - distance, 4)
    """
    from app.services import rag_service

    # mock_chroma returns distance=0.1, so relevance_score = round(0.9, 4) = 0.9
    request = SearchRequest(query="budget report", top_k=5)
    result = rag_service.search(request, _STAFF_USER)

    assert len(result.sources) == 1
    source = result.sources[0]
    assert source.doc_id == 1
    assert source.name == "test.pdf"
    assert source.chunk_text == "chunk text"
    assert source.relevance_score == round(1.0 - 0.1, 4)


# ---------------------------------------------------------------------------
# 3. Empty chroma results → no-results response
# ---------------------------------------------------------------------------

def test_search_empty_chroma_results(mock_llm, mock_embedding, monkeypatch):
    """
    When chroma returns empty document lists the service must:
    - Return sources == []
    - Return an answer containing "No relevant"
    """
    import app.repositories.chroma_repository as chroma_mod
    import app.services.rag_service as rag_mod

    def _empty(embedding, top_k):
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    monkeypatch.setattr(chroma_mod, "query_chunks", _empty)
    monkeypatch.setattr(rag_mod.chroma_repository, "query_chunks", _empty)

    request = SearchRequest(query="obscure query", top_k=5)
    result = rag_mod.search(request, _STAFF_USER)

    assert result.sources == []
    assert "No relevant" in result.answer


# ---------------------------------------------------------------------------
# 4. LLM failure → HTTPException 503
# ---------------------------------------------------------------------------

def test_search_llm_failure_raises_503(mock_chroma, mock_embedding, monkeypatch):
    """
    When ChatAnthropic.invoke() raises anthropic.APIError the service must
    raise an HTTPException with status_code 503.
    """
    import anthropic
    import app.services.rag_service as rag_mod

    class _FailingLLM:
        def __init__(self, *args, **kwargs):
            pass

        def invoke(self, messages):
            # anthropic.APIError requires a `request` keyword argument.
            # We pass None for the internal request object as it is not
            # inspected during exception construction.
            raise anthropic.APIError(
                message="service unavailable",
                request=None,  # type: ignore[arg-type]
                body=None,
            )

    monkeypatch.setattr(rag_mod, "ChatAnthropic", _FailingLLM)

    request = SearchRequest(query="trigger failure", top_k=3)

    with pytest.raises(HTTPException) as exc_info:
        rag_mod.search(request, _STAFF_USER)

    assert exc_info.value.status_code == 503
