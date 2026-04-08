"use client";

import PortalLayout from "@/components/portal/PortalLayout";
import {
  useAiDocuments,
  useUploadDocument,
  useDeleteDocument,
  useAiSearch,
} from "@/hooks/useAiDocuments";
import { useSession } from "@/hooks/useSession";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  Search,
  FileText,
  Loader2,
  Layers,
} from "lucide-react";
import type { SearchResponse } from "@/types/ai";

function Skeleton({ h = "1rem", w = "100%" }: { h?: string; w?: string }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        borderRadius: 6,
        background: "var(--color-surface-raised)",
        animation: "skeletonPulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function FileTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    pdf: "#f87171",
    txt: "#34d399",
    docx: "#60a5fa",
    md: "#a78bfa",
  };
  const c = colors[type.toLowerCase()] ?? "var(--status-slate)";
  return (
    <span
      style={{
        padding: "0.15rem 0.5rem",
        borderRadius: 4,
        fontSize: "0.7rem",
        fontWeight: 700,
        background: `${c}18`,
        color: c,
        border: `1px solid ${c}33`,
        textTransform: "uppercase",
      }}
    >
      {type}
    </span>
  );
}

export default function DocumentsPage() {
  const session = useSession();
  const isAdmin = session.data?.role === "ADMIN";
  const docs = useAiDocuments();
  const upload = useUploadDocument();
  const del = useDeleteDocument();
  const search = useAiSearch();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [delId, setDelId] = useState<number | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    upload.mutate(file, {
      onSuccess: (doc) => toast.success(`"${doc.name}" indexed`),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setResult(null);
    search.mutate(
      { query: query.trim(), top_k: 5 },
      {
        onSuccess: setResult,
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const totalChunks =
    docs.data?.documents?.reduce((acc, d) => acc + (d.chunk_count ?? 0), 0) ??
    0;

  return (
    <PortalLayout>
      <style>{`@keyframes skeletonPulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Delete confirm */}
      {delId !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 16,
              padding: "1.5rem",
              width: "100%",
              maxWidth: 380,
            }}
          >
            <h3
              style={{
                margin: "0 0 0.75rem",
                color: "var(--color-text-primary)",
              }}
            >
              Delete Document
            </h3>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: "var(--color-text-muted)",
                fontSize: "0.9rem",
              }}
            >
              This will permanently remove the document and all its indexed
              chunks.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setDelId(null)}
                style={{
                  padding: "0.6rem 1.25rem",
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  fontSize: "0.88rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  del.mutate(delId, {
                    onSuccess: () => {
                      toast.success("Document deleted");
                      setDelId(null);
                    },
                    onError: (e) => toast.error(e.message),
                  })
                }
                disabled={del.isPending}
                style={{
                  padding: "0.6rem 1.25rem",
                  background: "rgba(248,113,113,0.15)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: 8,
                  color: "var(--color-error)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                {del.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 0.2rem",
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "var(--color-text-primary)",
            }}
          >
            Documents
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "0.88rem",
            }}
          >
            AI-powered knowledge base
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.25rem",
              background: upload.isPending
                ? "var(--color-surface-raised)"
                : "linear-gradient(135deg,#22d3ee,#818cf8)",
              border: "none",
              borderRadius: 10,
              color: upload.isPending ? "var(--color-text-muted)" : "#0f1117",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: upload.isPending ? "not-allowed" : "pointer",
            }}
          >
            {upload.isPending ? (
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Upload size={16} />
            )}
            {upload.isPending ? "Uploading…" : "Upload Document"}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleUpload}
          accept=".pdf,.txt,.docx,.md"
        />
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          {
            label: "Total Documents",
            value: docs.data?.total ?? 0,
            Icon: FileText,
            color: "#22d3ee",
          },
          {
            label: "Total Chunks",
            value: totalChunks,
            Icon: Layers,
            color: "#818cf8",
          },
          {
            label: "AI Service",
            value: "Online",
            Icon: Search,
            color: "#34d399",
          },
        ].map(({ label, value, Icon, color }) => (
          <div
            key={label}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${color}1a`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={18} color={color} />
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 0.15rem",
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  fontSize: "1.1rem",
                }}
              >
                {docs.isLoading ? "…" : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Split-pane layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: "1.25rem",
        }}
      >
        {/* LEFT: Document library */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              Document Library
            </h3>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 600 }}>
            {docs.isLoading ? (
              <div
                style={{
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} h="3rem" />
                ))}
              </div>
            ) : docs.isError ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--color-error)",
                }}
              >
                AI service unavailable
              </div>
            ) : docs.data?.total === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <p style={{ fontSize: "2rem", margin: "0 0 0.75rem" }}>📂</p>
                <p
                  style={{
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    margin: "0 0 0.4rem",
                  }}
                >
                  No documents indexed yet
                </p>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-text-muted)",
                    margin: 0,
                  }}
                >
                  Upload your first document to get started.
                </p>
              </div>
            ) : (
              <div>
                {docs.data?.documents?.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.85rem",
                      padding: "0.85rem 1.25rem",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "var(--color-surface-raised)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={18} color="var(--color-text-muted)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.2rem",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.88rem",
                            color: "var(--color-text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.name}
                        </span>
                        <FileTypeBadge type={doc.file_type} />
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.75rem",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {formatBytes(doc.file_size)} · {doc.chunk_count} chunks
                        · {doc.uploaded_by}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setDelId(doc.id)}
                        style={{
                          padding: "0.35rem",
                          background: "rgba(248,113,113,0.1)",
                          border: "1px solid rgba(248,113,113,0.2)",
                          borderRadius: 6,
                          cursor: "pointer",
                          color: "var(--color-error)",
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: AI Search */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Search size={18} color="var(--color-brand-primary)" />
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              AI Search
            </h3>
          </div>

          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.65rem",
              marginBottom: "1rem",
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about city policies…"
              disabled={search.isPending}
              style={{
                width: "100%",
                padding: "0.65rem 0.9rem",
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-text-primary)",
                fontSize: "0.88rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="submit"
              disabled={search.isPending || !query.trim()}
              style={{
                padding: "0.65rem",
                background:
                  search.isPending || !query.trim()
                    ? "var(--color-surface-raised)"
                    : "linear-gradient(135deg,#22d3ee,#818cf8)",
                border: "none",
                borderRadius: 8,
                color:
                  search.isPending || !query.trim()
                    ? "var(--color-text-muted)"
                    : "#0f1117",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor:
                  search.isPending || !query.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              {search.isPending ? (
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Search size={16} />
              )}
              {search.isPending ? "Searching…" : "Search"}
            </button>
          </form>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {search.isPending && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <Skeleton />
                <Skeleton w="80%" />
                <Skeleton w="60%" />
              </div>
            )}
            {search.isError && !search.isPending && (
              <div
                style={{
                  padding: "0.75rem",
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  borderRadius: 8,
                  color: "var(--color-error)",
                  fontSize: "0.85rem",
                }}
              >
                {search.error?.message ??
                  "Search failed. Ensure the AI service is running."}
              </div>
            )}
            {!search.isPending && !search.isError && !result && (
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.85rem",
                  margin: 0,
                  textAlign: "center",
                  padding: "1.5rem 0",
                  opacity: 0.7,
                }}
              >
                Ask anything about city policies, HR guidelines, or procedures.
              </p>
            )}
            {result && !search.isPending && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div
                  style={{
                    padding: "0.85rem",
                    background: "rgba(52,211,153,0.07)",
                    border: "1px solid rgba(52,211,153,0.15)",
                    borderRadius: 8,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.3rem",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--status-active)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Answer
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.88rem",
                      color: "var(--color-text-primary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {result.answer}
                  </p>
                </div>
                {result.sources.length > 0 && (
                  <div>
                    <p
                      style={{
                        margin: "0 0 0.5rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Sources ({result.sources.length})
                    </p>
                    {result.sources.map((src, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "0.6rem 0.85rem",
                          background: "var(--color-surface-raised)",
                          borderRadius: 8,
                          marginBottom: "0.4rem",
                          fontSize: "0.82rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.2rem",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--color-brand-primary)",
                            }}
                          >
                            {src.name}
                          </span>
                          <span style={{ color: "var(--color-text-muted)" }}>
                            {(src.relevance_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            color: "var(--color-text-muted)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {src.chunk_text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
