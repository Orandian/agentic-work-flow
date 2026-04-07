"""
conftest.py — shared fixtures for the ai-search test suite.

Environment note: JWT_SECRET is patched directly on the settings singleton
before the app module is imported (via autouse session-scoped fixture), so
all JWT decode operations inside the app see "test-secret".
"""
import os
import time

import numpy as np
import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# Patch JWT_SECRET on the settings object BEFORE the app is imported so that
# decode_token() validates tokens signed with "test-secret".
# ---------------------------------------------------------------------------
os.environ.setdefault("JWT_SECRET", "test-secret")

# Now import the app (settings are already loaded with JWT_SECRET=test-secret)
from app.main import app as _app  # noqa: E402  (import after env patch)
from app.dependencies import get_db, get_current_user  # noqa: E402
from app.repositories.document_repository import Base  # noqa: E402
from app.config.settings import settings  # noqa: E402

# Force the settings singleton to use our test secret regardless of cache
settings.jwt_secret = "test-secret"

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_TEST_SECRET = "test-secret"
_ALGORITHM = "HS256"
_FAR_FUTURE = int(time.time()) + 86400 * 365  # 1 year from now


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------

def _make_token(role: str, user_id: int = 1, email: str | None = None) -> str:
    email = email or f"{role.lower()}@test.com"
    payload = {
        "sub": email,
        "userId": user_id,
        "role": role,
        "exp": _FAR_FUTURE,
    }
    return jwt.encode(payload, _TEST_SECRET, algorithm=_ALGORITHM)


# ---------------------------------------------------------------------------
# SQLite in-memory DB helpers
# ---------------------------------------------------------------------------

def _make_sqlite_engine():
    """Create a fresh SQLite in-memory engine with all tables."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # SQLite does not support ARRAY columns natively; patch chroma_ids to Text
    # by overriding the column type before table creation.
    from sqlalchemy import Text
    from app.repositories.document_repository import AiDocument
    AiDocument.__table__.c.chroma_ids.type = Text()
    Base.metadata.create_all(bind=engine)
    return engine


# ---------------------------------------------------------------------------
# app fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def app():
    """
    Return the FastAPI app with dependency overrides applied:
      - get_db   → SQLite in-memory session
      - get_current_user → default STAFF user (override per-test as needed)
    """
    sqlite_engine = _make_sqlite_engine()

    def _override_get_db():
        db = Session(sqlite_engine)
        try:
            yield db
        finally:
            db.close()

    async def _override_get_current_user():
        return {"email": "staff@test.com", "user_id": 1, "role": "STAFF"}

    _app.dependency_overrides[get_db] = _override_get_db
    _app.dependency_overrides[get_current_user] = _override_get_current_user

    yield _app

    _app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# client fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def client(app):
    """Synchronous TestClient wrapping the app (no lifespan startup)."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Header fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def staff_headers():
    token = _make_token(role="STAFF", user_id=1, email="staff@test.com")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def admin_headers():
    token = _make_token(role="ADMIN", user_id=2, email="admin@test.com")
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# mock_chroma fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def mock_chroma(monkeypatch):
    """
    Monkeypatch app.repositories.chroma_repository so tests never hit ChromaDB.
    """
    import app.repositories.chroma_repository as chroma_mod

    def _upsert_chunks(doc_id, chunks, embeddings, metadatas):
        return ["id1", "id2"]

    def _query_chunks(embedding, top_k):
        return {
            "documents": [["chunk text"]],
            "metadatas": [[{"doc_id": 1, "name": "test.pdf", "chunk_index": 0}]],
            "distances": [[0.1]],
        }

    def _delete_by_doc_id(doc_id):
        return None

    monkeypatch.setattr(chroma_mod, "upsert_chunks", _upsert_chunks)
    monkeypatch.setattr(chroma_mod, "query_chunks", _query_chunks)
    monkeypatch.setattr(chroma_mod, "delete_by_doc_id", _delete_by_doc_id)

    # Also patch the reference used inside rag_service and document_service
    import app.services.rag_service as rag_mod
    import app.services.document_service as doc_svc_mod

    monkeypatch.setattr(rag_mod.chroma_repository, "query_chunks", _query_chunks)
    monkeypatch.setattr(doc_svc_mod.chroma_repository, "upsert_chunks", _upsert_chunks)
    monkeypatch.setattr(doc_svc_mod.chroma_repository, "delete_by_doc_id", _delete_by_doc_id)

    return {
        "upsert_chunks": _upsert_chunks,
        "query_chunks": _query_chunks,
        "delete_by_doc_id": _delete_by_doc_id,
    }


# ---------------------------------------------------------------------------
# mock_llm fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def mock_llm(monkeypatch):
    """
    Monkeypatch ChatAnthropic in rag_service so tests never call the real LLM.
    The mock's .invoke() returns an object whose .content == "This is the answer."
    """
    import app.services.rag_service as rag_mod

    class _FakeResponse:
        content = "This is the answer."

    class _FakeLLM:
        def __init__(self, *args, **kwargs):
            pass

        def invoke(self, messages):
            return _FakeResponse()

    monkeypatch.setattr(rag_mod, "ChatAnthropic", _FakeLLM)
    return _FakeLLM


# ---------------------------------------------------------------------------
# mock_embedding fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def mock_embedding(monkeypatch):
    """
    Monkeypatch SentenceTransformer in both rag_service and document_service
    so .encode() returns a zero numpy array of shape (384,) for a single string
    or a list of such arrays for a list of strings.
    """
    import app.services.rag_service as rag_mod
    import app.services.document_service as doc_svc_mod

    class _FakeEncoder:
        def __init__(self, *args, **kwargs):
            pass

        def encode(self, input_data):
            if isinstance(input_data, str):
                return np.zeros(384, dtype=np.float32)
            # list of strings → 2D array
            return np.zeros((len(input_data), 384), dtype=np.float32)

    monkeypatch.setattr(rag_mod, "_embedding_model", None)
    monkeypatch.setattr(doc_svc_mod, "_embedding_model", None)

    monkeypatch.setattr(rag_mod, "SentenceTransformer", _FakeEncoder)
    monkeypatch.setattr(doc_svc_mod, "SentenceTransformer", _FakeEncoder)

    return _FakeEncoder
