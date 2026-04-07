"""
test_search.py — integration tests for POST /search.

All tests use the synchronous TestClient from conftest.py.
ChromaDB and the LLM are always mocked; no real external service is called.
"""
import pytest


# ---------------------------------------------------------------------------
# Happy-path tests
# ---------------------------------------------------------------------------

def test_search_happy_path(client, staff_headers, mock_chroma, mock_llm, mock_embedding):
    """STAFF token + valid query → 200, response has answer / sources / query keys."""
    payload = {"query": "What is the city budget?", "top_k": 3}
    response = client.post("/search", json=payload, headers=staff_headers)

    assert response.status_code == 200
    body = response.json()
    assert "answer" in body
    assert "sources" in body
    assert "query" in body
    assert isinstance(body["sources"], list)


def test_search_admin_can_search(client, admin_headers, mock_chroma, mock_llm, mock_embedding):
    """ADMIN role satisfies the STAFF+ check — should get 200."""
    payload = {"query": "Show me procurement rules.", "top_k": 5}
    response = client.post("/search", json=payload, headers=admin_headers)

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Auth / authorisation tests
# ---------------------------------------------------------------------------

def test_search_no_token(client, mock_chroma, mock_llm, mock_embedding):
    """Missing Authorization header → 403 (HTTPBearer rejects the request)."""
    payload = {"query": "anything", "top_k": 5}
    response = client.post("/search", json=payload)

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------

def test_search_empty_query(client, staff_headers, mock_chroma, mock_llm, mock_embedding):
    """Empty query string violates min_length=1 → 422 Unprocessable Entity."""
    payload = {"query": "", "top_k": 5}
    response = client.post("/search", json=payload, headers=staff_headers)

    assert response.status_code == 422


def test_search_top_k_out_of_range(client, staff_headers, mock_chroma, mock_llm, mock_embedding):
    """top_k=25 exceeds le=20 constraint → 422 Unprocessable Entity."""
    payload = {"query": "test query", "top_k": 25}
    response = client.post("/search", json=payload, headers=staff_headers)

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# No-results path
# ---------------------------------------------------------------------------

def test_search_no_results(client, staff_headers, mock_llm, mock_embedding, monkeypatch):
    """
    When ChromaDB returns empty document lists the service returns 200 with
    an answer containing "No relevant" and an empty sources list.
    """
    import app.repositories.chroma_repository as chroma_mod
    import app.services.rag_service as rag_mod

    def _empty_query(embedding, top_k):
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    monkeypatch.setattr(chroma_mod, "query_chunks", _empty_query)
    monkeypatch.setattr(rag_mod.chroma_repository, "query_chunks", _empty_query)

    payload = {"query": "something obscure", "top_k": 5}
    response = client.post("/search", json=payload, headers=staff_headers)

    assert response.status_code == 200
    body = response.json()
    assert "No relevant" in body["answer"]
    assert body["sources"] == []
