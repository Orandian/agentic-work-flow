# Plan: ActiveCity Staff Portal — Phase 2: ai-search RAG Microservice Scaffold

**Date:** 2026-04-07
**Stack:** FastAPI · Python 3.11 · LangChain · ChromaDB · sentence-transformers · Anthropic Claude claude-sonnet-4-6 · SQLAlchemy + PostgreSQL · python-jose
**Target:** Fully scaffolded RAG microservice at `ai-search/`, port 8000

---

## Dependency Order

| Task | File | Description |
|------|------|-------------|
| 01 | `requirements.txt` | All pinned Python dependencies |
| 02 | `.env.example` | All env vars with placeholder values |
| 03 | `pytest.ini` | pytest config: testpaths, asyncio_mode=auto |
| 04 | `app/config/settings.py` | Pydantic BaseSettings singleton |
| 05 | `app/schemas/search.py` | SearchRequest, SourceDocument, SearchResponse |
| 06 | `app/schemas/document.py` | DocumentOut, DocumentListResponse |
| 07 | `app/repositories/chroma_repository.py` | Sole ChromaDB access point |
| 08 | `app/repositories/document_repository.py` | SQLAlchemy model + async CRUD |
| 09 | `app/services/jwt_service.py` | decode_token, require_role |
| 10 | `app/services/document_service.py` | upload, list, delete documents |
| 11 | `app/services/rag_service.py` | embed → retrieve → generate flow |
| 12 | `app/dependencies.py` | FastAPI Depends: get_db, verify_token, require_staff, require_admin |
| 13 | `app/routers/health.py` | GET /health (no auth) |
| 14 | `app/routers/documents.py` | upload, list, delete endpoints |
| 15 | `app/routers/search.py` | POST /search endpoint |
| 16 | `app/main.py` | FastAPI app, CORS, router registration, startup warmup |
| 17 | `Dockerfile` | python:3.12-slim, expose 8000 |
| 18 | `tests/conftest.py` | fixtures: client, staff_token, admin_token, mock_chroma, mock_llm |
| 19 | `tests/test_search.py` | search happy path, unauth, empty query, LLM failure |
| 20 | `tests/test_documents.py` | upload, list, delete, role checks |
| 21 | `tests/test_rag_service.py` | unit tests for rag_service |

---

## JWT Claim Shape (must match Spring Boot UserAuthProvider)

| Claim | Type | Value |
|-------|------|-------|
| `sub` | string | user email |
| `userId` | long | user ID |
| `role` | string | "STAFF" or "ADMIN" |
| `iat` | epoch | issued-at |
| `exp` | epoch | expiry |

---

## RAG Flow (POST /search)

1. Embed query → `SentenceTransformer(settings.EMBEDDING_MODEL).encode(query)`
2. Query ChromaDB → `chroma_repository.query_chunks(embedding, top_k)`
3. Build context string from returned chunks
4. Invoke `ChatAnthropic(model="claude-sonnet-4-6")` with `Context + Question` prompt
5. Map distances to relevance scores, build `SourceDocument` list
6. Return `SearchResponse(answer, sources, query)`

---

## Coding Rules

- All settings via Pydantic BaseSettings — no `os.environ` reads outside settings.py
- All DB sessions via `Depends(get_db)` — never instantiate directly
- All ChromaDB access via `chroma_repository.py` only
- `HTTPException` with explicit status codes everywhere
- JWT validation in `dependencies.py` as `Depends` — never inline in routes
- Routers are thin: one line calling the service
- Services contain all business logic
- `async def` on all route handlers
