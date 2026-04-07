# Code Review — ai-search — 2026-04-07

## Summary

3 critical, 8 warnings, 5 info

---

## Findings

---

### [CRITICAL] Hardcoded insecure default values for `jwt_secret` and `database_url` in settings

- **File:** `app/config/settings.py` (lines 16, 18)
- **Issue:** `jwt_secret` defaults to `"changeme"` and `database_url` defaults to a full connection string including plaintext username and password (`activecity:activecity_secret`). If the `.env` file is missing in any environment — CI, a new developer machine, or a misconfigured container — the application starts and silently uses these insecure defaults. A `"changeme"` JWT secret means any attacker who reads the source (or this file in a public repo) can forge valid tokens for any role, including `ADMIN`.
- **Fix:** Set both fields to `...` (Pydantic's required sentinel) so startup fails loudly if the real values are not supplied. Alternatively, add a `model_validator(mode="after")` that raises `ValueError` if `jwt_secret` is still the insecure default:
  ```python
  jwt_secret: str  # required — no default
  database_url: str  # required — no default
  ```

---

### [CRITICAL] `_get_collection()` is not thread-safe — race condition on first request

- **File:** `app/repositories/chroma_repository.py` (lines 4–16)
- **Issue:** The global `_collection` singleton is initialised with a bare `if _collection is None:` check. Under concurrent requests at startup (a very common scenario with `uvicorn --workers N` or async request bursts), two coroutines can both observe `_collection is None` simultaneously, both call `chromadb.HttpClient(...)`, and both attempt to set the global. While Python's GIL prevents true data corruption in CPython, the double-initialisation wastes resources and can produce duplicate connections. More importantly, `chromadb.HttpClient` construction can raise on a bad host/port with no error handling at call sites.
- **Fix:** Use a `threading.Lock` around the initialisation block, or initialise the collection once during the FastAPI `lifespan` event and store it on `app.state`:
  ```python
  _lock = threading.Lock()

  def _get_collection():
      global _client, _collection
      if _collection is None:
          with _lock:
              if _collection is None:
                  _client = chromadb.HttpClient(...)
                  _collection = _client.get_or_create_collection(...)
      return _collection
  ```

---

### [CRITICAL] Global exception handler swallows `HTTPException` — all API errors return 500

- **File:** `app/main.py` (lines 34–39)
- **Issue:** The bare `Exception` handler catches **everything**, including `HTTPException` instances raised by routes and services (401, 403, 404, 413, 415, 503). FastAPI registers its own `HTTPException` handler before user-defined handlers, but a generic `Exception` handler has lower priority in FastAPI's middleware stack — meaning `HTTPException` is normally handled correctly. However, this will catch any unexpected subclass of `Exception` that is also a subclass of `HTTPException` if the framework ordering ever changes, and it makes the behaviour non-obvious. More critically, it masks useful error detail in logs: the handler currently returns a static `"INTERNAL_SERVER_ERROR"` body with no logging. Any uncaught bug in a service will silently return 500 with no traceable information.
- **Fix:** Add explicit logging inside the handler and re-raise `HTTPException` before falling through to the generic case:
  ```python
  import logging
  from fastapi import HTTPException as FastAPIHTTPException

  logger = logging.getLogger(__name__)

  @app.exception_handler(Exception)
  async def global_exception_handler(request: Request, exc: Exception):
      if isinstance(exc, FastAPIHTTPException):
          raise exc
      logger.exception("Unhandled exception on %s %s", request.method, request.url)
      return JSONResponse(
          status_code=500,
          content={"detail": "INTERNAL_SERVER_ERROR", "status_code": 500},
      )
  ```

---

### [WARNING] Embedding model duplicated across two services — no shared singleton

- **File:** `app/services/document_service.py` (lines 19–25), `app/services/rag_service.py` (lines 11–17)
- **Issue:** Both services define an independent `_embedding_model` module-level global and an identical `_get_embedding_model()` factory. At runtime both models will be loaded into memory separately (each `sentence-transformers/all-MiniLM-L6-v2` instance is ~90 MB). This doubles memory consumption unnecessarily.
- **Fix:** Move the model singleton into a dedicated `app/services/embedding_service.py` (or into `app/repositories/embedding_repository.py`) and import `get_embedding_model()` from that single location in both services.

---

### [WARNING] `ChatAnthropic` LLM is re-instantiated on every search request

- **File:** `app/services/rag_service.py` (lines 42–46)
- **Issue:** `llm = ChatAnthropic(...)` is called inside `search()`, creating a new client object on every request. While the underlying HTTP client may be reused by the `anthropic` library internally, constructing the wrapper object per-request adds unnecessary overhead and makes mocking harder (tests must patch the class, not an instance).
- **Fix:** Apply the same module-level singleton pattern used for the embedding model:
  ```python
  _llm: ChatAnthropic | None = None

  def _get_llm() -> ChatAnthropic:
      global _llm
      if _llm is None:
          _llm = ChatAnthropic(model="claude-sonnet-4-6", anthropic_api_key=settings.anthropic_api_key)
      return _llm
  ```

---

### [WARNING] File content-type validation is client-supplied and trivially spoofed

- **File:** `app/services/document_service.py` (lines 42–43)
- **Issue:** `file.content_type` comes from the `Content-Type` part of the multipart upload — a value the client sets freely. An attacker can upload a malicious file (e.g., an executable) with `Content-Type: application/pdf` and bypass the allowlist check. The service then passes those bytes to `pypdf.PdfReader`, which will attempt to parse them.
- **Fix:** Add magic-byte validation after reading the file bytes. For example:
  ```python
  _MAGIC = {
      b"%PDF": "application/pdf",
      b"PK\x03\x04": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }

  def _detect_type(file_bytes: bytes) -> str | None:
      for magic, mime in _MAGIC.items():
          if file_bytes.startswith(magic):
              return mime
      # plain text has no magic bytes; fall back to declared type only for text/plain
      return None
  ```
  Validate the detected MIME type against `ALLOWED_TYPES` in addition to (or instead of) the declared `content_type`.

---

### [WARNING] `rag_service.search()` is synchronous — blocks the event loop during embedding and LLM calls

- **File:** `app/services/rag_service.py` (line 21), `app/routers/search.py` (line 11)
- **Issue:** `rag_service.search()` is a plain `def` function, not `async def`. The route handler calls it directly from an `async def` handler. `model.encode()` (CPU-bound, can take 100–500 ms) and `llm.invoke()` (network I/O, can take 1–10 s) both block the asyncio event loop for their entire duration, preventing any other request from being served during that time.
- **Fix:** Either:
  1. Make `search()` `async def` and run the CPU-bound encoding with `asyncio.get_event_loop().run_in_executor(None, model.encode, query)`, and await the async Anthropic client (`ChatAnthropic` supports `ainvoke()`), or
  2. Decorate the route with `run_in_threadpool` (FastAPI's `run_in_threadpool` utility) to offload the blocking call.

---

### [WARNING] `document_service.delete_document()` has a TOCTOU gap — Chroma delete before DB soft-delete

- **File:** `app/services/document_service.py` (lines 92–97)
- **Issue:** `chroma_repository.delete_by_doc_id(doc_id)` is called before `document_repository.soft_delete_document(db, doc_id)`. If the process crashes between the two calls, the Chroma vectors are deleted but the Postgres row still has `delete_flg == 0`, leaving the document visible in listings while its content is gone. Searches against it will return empty results but no error.
- **Fix:** Reverse the order — soft-delete the Postgres record first (within the existing DB transaction), then delete from Chroma. A Postgres transaction rollback on failure leaves Chroma intact; a Chroma failure after a committed Postgres soft-delete is recoverable by re-running the Chroma delete on next access.

---

### [WARNING] `document_repository.get_engine()` is called on every request cycle inside `dependencies.py`

- **File:** `app/dependencies.py` (line 12), `app/repositories/document_repository.py` (lines 26–28)
- **Issue:** `get_db()` in `dependencies.py` calls `get_engine()` on every invocation, which calls `create_engine(settings.database_url)`. While SQLAlchemy engines are designed to be singletons (they hold the connection pool), creating a new `Engine` object per request bypasses connection pooling entirely — each request opens a fresh pool, negating the benefits of SQLAlchemy's built-in pool.
- **Fix:** Create the engine once at module level (or in `lifespan`) and reuse it:
  ```python
  # app/dependencies.py
  from app.repositories.document_repository import get_db as _get_db, get_engine

  _engine = get_engine()  # created once at import time

  def get_db():
      yield from _get_db(_engine)
  ```

---

### [WARNING] `datetime.utcnow()` is deprecated in Python 3.12 — used in model default and tests

- **File:** `app/repositories/document_repository.py` (line 22), `tests/test_documents.py` (line 42)
- **Issue:** `datetime.utcnow()` was deprecated in Python 3.12 (the version used in the Dockerfile) and will be removed in a future release. It also produces a naive datetime with no timezone info, which can cause silent timezone errors if the application is ever compared against timezone-aware timestamps from Postgres.
- **Fix:** Replace with `datetime.now(timezone.utc)` everywhere:
  ```python
  from datetime import datetime, timezone
  default=lambda: datetime.now(timezone.utc)
  ```

---

### [INFO] `rag_service` imports `anthropic` directly alongside `langchain_anthropic` — redundant dependency

- **File:** `app/services/rag_service.py` (lines 4–5)
- **Issue:** The service imports both `from langchain_anthropic import ChatAnthropic` and `import anthropic`. The `anthropic` import is used only to catch `anthropic.APIError`. Using `langchain_anthropic` already wraps the Anthropic client; catching `anthropic.APIError` from the raw SDK is correct but the dual import is a smell that suggests the abstraction layer is leaking.
- **Fix:** Catch `langchain_core.exceptions.OutputParserException` or a more general `Exception` with a type check, or keep the `anthropic` import but add a comment explaining why the lower-level exception is being caught through the LangChain wrapper.

---

### [INFO] `conftest.py` mutates the `settings` singleton directly — fragile test isolation

- **File:** `tests/conftest.py` (line 32)
- **Issue:** `settings.jwt_secret = "test-secret"` mutates the `lru_cache`-backed singleton in place. While this works in the current single-process test run, any future parallelisation (e.g., `pytest-xdist`) or module import order change could make this mutation unreliable or bleed into other test modules.
- **Fix:** Use `monkeypatch.setattr(settings, "jwt_secret", "test-secret")` inside a session-scoped autouse fixture so the mutation is properly undone after the session, or patch at the `os.environ` level before the first import (the `os.environ.setdefault` on line 23 is already doing this, making line 32 redundant).

---

### [INFO] No `healthz` or readiness probe checks downstream services

- **File:** `app/routers/health.py`
- **Issue:** `GET /health` always returns `{"status": "ok"}` with no verification that ChromaDB, PostgreSQL, or the Anthropic API are reachable. A Kubernetes liveness/readiness probe using this endpoint will report the pod as healthy even when all downstream dependencies are down.
- **Fix:** Add a `/health/ready` endpoint that performs lightweight checks — e.g., `collection.count()` on ChromaDB and a `db.execute(text("SELECT 1"))` on Postgres — and returns 503 if any check fails. Keep the existing `/health` as a simple liveness probe.

---

### [INFO] `requirements.txt` pins minor versions but not patch versions — reproducibility risk

- **File:** `requirements.txt`
- **Issue:** All packages are pinned to exact minor versions (e.g., `fastapi==0.115.0`), which is good. However, transitive dependencies are entirely unconstrained. A `pip install` on a different date may resolve different transitive versions, causing subtle incompatibilities.
- **Fix:** Add a `requirements.lock` generated by `pip-compile` (from `pip-tools`) or switch to `uv lock` / `poetry.lock` to fully pin the dependency tree. The Dockerfile `RUN pip install --no-cache-dir -r requirements.txt` should install from the lock file.

---

### [INFO] `lifespan` warms up the embedding model but discards the returned instance

- **File:** `app/main.py` (lines 10–15)
- **Issue:** `SentenceTransformer(settings.embedding_model)` is called to warm up the model, but the returned object is not stored anywhere. The actual singletons in `document_service` and `rag_service` are lazily initialised on first request, meaning the warm-up does not actually pre-populate the singletons used at runtime.
- **Fix:** Call the real `_get_embedding_model()` functions from each service during lifespan, or expose a shared `warm_up()` function in a centralised embedding module:
  ```python
  from app.services import document_service, rag_service

  async def lifespan(app: FastAPI):
      document_service._get_embedding_model()
      rag_service._get_embedding_model()
      yield
  ```
