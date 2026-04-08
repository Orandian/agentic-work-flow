/**
 * TypeScript types mirroring the FastAPI AI Search service schemas.
 * Field names match the Pydantic models exactly (snake_case).
 *
 * Source schemas:
 *   ai-search/app/schemas/document.py
 *   ai-search/app/schemas/search.py
 */

// ── Document schemas ──────────────────────────────────────────────────────────

/** Mirrors DocumentOut in document.py */
export interface DocumentOut {
  id: number;
  name: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  uploaded_by: string;
  uploaded_at: string; // ISO datetime string from Python datetime
}

/** Mirrors DocumentListResponse in document.py */
export interface DocumentListResponse {
  documents: DocumentOut[];
  total: number;
}

// ── Search schemas ────────────────────────────────────────────────────────────

/** Mirrors SearchRequest in search.py */
export interface SearchRequest {
  query: string;
  top_k?: number; // default 5, range 1-20
}

/** Mirrors SourceDocument in search.py */
export interface SourceDocument {
  doc_id: number;
  name: string;
  chunk_text: string;
  relevance_score: number;
}

/** Mirrors SearchResponse in search.py */
export interface SearchResponse {
  answer: string;
  sources: SourceDocument[];
  query: string;
}
