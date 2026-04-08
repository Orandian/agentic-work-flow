"use client";

/**
 * TanStack Query hooks for the AI Search document and search endpoints.
 * All requests go through Next.js Route Handlers under /api/ai/* which
 * proxy to the FastAPI AI service server-side (keeping the JWT HttpOnly).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  DocumentListResponse,
  DocumentOut,
  SearchRequest,
  SearchResponse,
} from "@/types/ai";

// ── Query keys ────────────────────────────────────────────────────────────────

export const AI_QUERY_KEYS = {
  documents: ["ai", "documents"] as const,
  search: (query: string) => ["ai", "search", query] as const,
};

// ── Response envelopes ────────────────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── useAiDocuments ────────────────────────────────────────────────────────────

/**
 * Fetches the list of AI knowledge-base documents.
 *
 * States: isLoading | isError | data (DocumentListResponse)
 */
export function useAiDocuments() {
  return useQuery<DocumentListResponse, Error>({
    queryKey: AI_QUERY_KEYS.documents,
    queryFn: async () => {
      const { data } =
        await axios.get<ApiEnvelope<DocumentListResponse>>("/api/ai/documents");
      if (!data.success)
        throw new Error(data.message ?? "Failed to load documents");
      return data.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// ── useUploadDocument ─────────────────────────────────────────────────────────

/**
 * Uploads a file to the AI knowledge base (ADMIN only).
 * Invalidates the documents query on success.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation<DocumentOut, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const { data } = await axios.post<ApiEnvelope<DocumentOut>>(
        "/api/ai/documents",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (!data.success) throw new Error(data.message ?? "Upload failed");
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AI_QUERY_KEYS.documents });
    },
  });
}

// ── useDeleteDocument ─────────────────────────────────────────────────────────

/**
 * Deletes a document from the AI knowledge base by ID (ADMIN only).
 * Invalidates the documents query on success.
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (docId: number) => {
      await axios.delete(`/api/ai/documents/${docId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AI_QUERY_KEYS.documents });
    },
  });
}

// ── useAiSearch ───────────────────────────────────────────────────────────────

/**
 * Performs a RAG search against the AI knowledge base.
 * Returns { answer, sources, query }.
 *
 * This is a mutation (not a query) so the caller can trigger it imperatively
 * on form submit rather than on mount.
 */
export function useAiSearch() {
  return useMutation<SearchResponse, Error, SearchRequest>({
    mutationFn: async (request: SearchRequest) => {
      const { data } = await axios.post<ApiEnvelope<SearchResponse>>(
        "/api/ai/search",
        request,
      );
      if (!data.success) throw new Error(data.message ?? "Search failed");
      return data.data;
    },
  });
}
