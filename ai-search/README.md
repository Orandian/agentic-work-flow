# ActiveCity AI Search

RAG-powered document search microservice for the ActiveCity Staff Portal. Staff submit a natural-language query; the service retrieves the most relevant chunks from indexed documents using ChromaDB and generates a grounded answer via Claude (claude-sonnet-4-6). All document metadata is persisted in the shared PostgreSQL database; vector embeddings live exclusively in ChromaDB.

- **Internal port:** 8000
- **Docker Compose mapped port:** 8001
- **Part of:** ActiveCity Staff Portal (Spring Boot backend + Next.js frontend)

---

## Prerequisites

- Python 3.11+
- ChromaDB running (via Docker Compose or standalone on port 8001)
- PostgreSQL 15+ (the same instance shared with the Spring Boot backend)
- Anthropic API key with access to claude-sonnet-4-6

---

## Setup

### Environment variables

Copy `.env.example` to `.env` and fill in the required values before starting the service.

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_NAME` | No | `activecity-ai-search` | Application name used in logs |
| `APP_ENV` | No | `development` | Environment name; set to `production` to disable `/docs` and `/redoc` |
| `APP_PORT` | No | `8000` | Port the uvicorn process binds to |
| `ANTHROPIC_API_KEY` | **Yes** | — | Anthropic API key; must have access to claude-sonnet-4-6 |
| `CHROMA_HOST` | No | `localhost` | Hostname of the ChromaDB HTTP server |
| `CHROMA_PORT` | No | `8001` | Port of the ChromaDB HTTP server |
| `CHROMA_COLLECTION` | No | `activecity-docs` | ChromaDB collection name for document chunks |
| `DATABASE_URL` | **Yes** | — | SQLAlchemy-compatible PostgreSQL URL, e.g. `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | **Yes** | — | HMAC256 secret; must match the `JWT_SECRET` configured in the Spring Boot backend |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `EMBEDDING_MODEL` | No | `sentence-transformers/all-MiniLM-L6-v2` | Sentence-transformers model used for local embedding |
| `RAG_TOP_K` | No | `5` | Number of chunks retrieved from ChromaDB per query |
| `RAG_CHUNK_SIZE` | No | `500` | Maximum character length of each text chunk at index time |
| `RAG_CHUNK_OVERLAP` | No | `50` | Character overlap between consecutive chunks |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS origins |
| `MAX_FILE_SIZE_MB` | No | `20` | Maximum upload size in megabytes |

### Install dependencies

```bash
pip install -r requirements.txt
```

The embedding model (`all-MiniLM-L6-v2`) is downloaded from Hugging Face on first startup and cached locally by `sentence-transformers`. Subsequent starts use the local cache.

### Run locally

```bash
uvicorn app.main:app --reload
```

The service will be available at `http://localhost:8000`. Interactive API docs are served at `/docs` (Swagger UI) and `/redoc` when `APP_ENV` is not `production`.

### Run via Docker Compose (from project root)

```bash
./runAll.sh
```

This starts ChromaDB, PostgreSQL, the Spring Boot backend, the Next.js frontend, and this service together. The ai-search service is accessible externally on port **8001**.

---

## API Reference

All protected endpoints expect a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are issued by the Spring Boot backend's login endpoint and validated here against the same `JWT_SECRET`.

---

### GET /health

Check that the service is running.

**Auth:** None

**Response**

```json
{
  "status": "ok",
  "service": "ai-search"
}
```

**Example**

```bash
curl http://localhost:8001/health
```

---

### POST /search

Submit a natural-language query. Returns a generated answer grounded in indexed documents, plus the source chunks used to produce it.

**Auth:** JWT — STAFF or ADMIN

**Request body**

```json
{
  "query": "string (1–1000 characters, required)",
  "top_k": "integer (1–20, default: 5)"
}
```

**Response body**

```json
{
  "query": "string",
  "answer": "string",
  "sources": [
    {
      "doc_id": "integer",
      "name": "string",
      "chunk_text": "string",
      "relevance_score": "float (0.0–1.0)"
    }
  ]
}
```

`relevance_score` is derived from the ChromaDB cosine distance as `1.0 - distance`; higher is more relevant.

**Example**

```bash
curl -X POST http://localhost:8001/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the staff leave policy?", "top_k": 5}'
```

---

### POST /documents/upload

Upload and index a document. The file is chunked, embedded locally, and stored in ChromaDB. Metadata (name, type, size, chunk count, uploader) is written to PostgreSQL.

**Auth:** JWT — ADMIN only

**Request:** `multipart/form-data` with a single `file` field.

Accepted content types:
- `application/pdf`
- `text/plain`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`)

Maximum file size is controlled by `MAX_FILE_SIZE_MB` (default 20 MB). The service validates magic bytes in addition to the declared content type.

**Response body** (HTTP 201)

```json
{
  "id": "integer",
  "name": "string",
  "file_type": "string (pdf | txt | docx)",
  "file_size": "integer (bytes)",
  "chunk_count": "integer",
  "uploaded_by": "string (email)",
  "uploaded_at": "string (ISO 8601 datetime)"
}
```

**Example**

```bash
curl -X POST http://localhost:8001/documents/upload \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@/path/to/policy.pdf"
```

---

### GET /documents

List all indexed documents.

**Auth:** JWT — STAFF or ADMIN

**Response body**

```json
{
  "documents": [
    {
      "id": "integer",
      "name": "string",
      "file_type": "string",
      "file_size": "integer",
      "chunk_count": "integer",
      "uploaded_by": "string",
      "uploaded_at": "string (ISO 8601 datetime)"
    }
  ],
  "total": "integer"
}
```

**Example**

```bash
curl http://localhost:8001/documents \
  -H "Authorization: Bearer <token>"
```

---

### DELETE /documents/{doc_id}

Remove a document. The PostgreSQL row is soft-deleted first; ChromaDB chunks are then deleted on a best-effort basis.

**Auth:** JWT — ADMIN only

**Path parameter:** `doc_id` — integer ID returned by the upload or list endpoints.

**Response:** HTTP 204 No Content on success. Returns 404 if the document does not exist.

**Example**

```bash
curl -X DELETE http://localhost:8001/documents/42 \
  -H "Authorization: Bearer <admin-token>"
```

---

## How to upload documents

The following steps index a new document and verify it is searchable.

**1. Obtain an ADMIN JWT from the Spring Boot backend**

```bash
curl -X POST http://localhost:8080/pub/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "yourpassword"}'
```

Copy the `token` field from the response.

**2. Upload the file**

```bash
curl -X POST http://localhost:8001/documents/upload \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@/path/to/document.pdf"
```

A successful upload returns HTTP 201 with the document record, including the `id` and `chunk_count`. A `chunk_count` of 0 means no text was extracted from the file.

**3. Verify the document appears in the list**

```bash
curl http://localhost:8001/documents \
  -H "Authorization: Bearer <admin-token>"
```

Confirm the document `name` and `id` appear in the `documents` array.

**4. Test that search retrieves it**

```bash
curl -X POST http://localhost:8001/search \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "a phrase you expect to appear in the document"}'
```

The `sources` array in the response will reference the uploaded document by `doc_id` and `name` when relevant chunks are matched.

---

## How to run tests

```bash
cd ai-search
pytest
```

No real external services are needed. The test suite uses the following mocks and stubs, configured in `tests/conftest.py`:

- **ChromaDB** — `chroma_repository` functions (`upsert_chunks`, `query_chunks`, `delete_by_doc_id`) are monkeypatched to return fixed in-memory data.
- **LLM** — `ChatAnthropic` is replaced with a fake that returns a static answer string, so no Anthropic API key is required.
- **Embedding model** — `SentenceTransformer` is replaced with a fake whose `.encode()` returns zero-filled NumPy arrays of shape `(384,)`, bypassing any model download.
- **PostgreSQL** — the `get_db` dependency is overridden to use an SQLite in-memory database created with SQLAlchemy's `StaticPool`. Tables are created from the ORM `Base` metadata before each test function.
- **JWT** — tokens in tests are signed with the string `test-secret`, which is patched onto the `settings` singleton before the app module is imported.

---

## Architecture

The RAG pipeline works as follows: at upload time, `document_service` extracts text from the file (PDF via `pypdf`, DOCX via `python-docx`, plain text directly), splits it into overlapping chunks using LangChain's `RecursiveCharacterTextSplitter`, and embeds each chunk locally with `sentence-transformers/all-MiniLM-L6-v2`. Chunk vectors are stored in ChromaDB; document metadata (name, type, size, chunk count, uploader) is stored in PostgreSQL. At query time, `rag_service` embeds the user's query with the same local model, retrieves the top-K most similar chunks from ChromaDB, assembles them as context, and calls `claude-sonnet-4-6` via `langchain-anthropic` to generate a grounded answer.

JWT authentication is handled by `jwt_service` using `python-jose`. Tokens are decoded with the same HMAC256 secret configured in the Spring Boot backend (`JWT_SECRET`), so a token issued at login works across both services without any token exchange. Role enforcement (`STAFF` vs. `ADMIN`) is applied at the dependency layer (`app/dependencies.py`) before the router handler is reached.

PostgreSQL stores only document metadata; it holds no vector data. ChromaDB holds only chunk text and embedding vectors; it has no knowledge of user accounts or roles. The two stores are kept in sync by the upload and delete operations in `document_service`.
