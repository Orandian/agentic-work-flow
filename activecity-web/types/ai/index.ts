// ── Folder schemas ────────────────────────────────────────────────────────────

export interface FolderOut {
  id: number;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface FolderListResponse {
  folders: FolderOut[];
  total: number;
}

// ── Document schemas ──────────────────────────────────────────────────────────

export interface DocumentOut {
  id: number;
  name: string;
  display_name: string | null;
  file_type: string;
  file_size: number;
  chunk_count: number;
  uploaded_by: string;
  uploaded_at: string;
  folder_id: number | null;
}

export interface DocumentListResponse {
  documents: DocumentOut[];
  total: number;
}

// ── Search schemas ────────────────────────────────────────────────────────────

export interface SearchRequest {
  query: string;
  top_k?: number;
}

export interface SourceDocument {
  doc_id: number;
  name: string;
  chunk_text: string;
  relevance_score: number;
}

export interface SearchResponse {
  answer: string;
  sources: SourceDocument[];
  query: string;
}
