"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  FileText,
  Trash2,
  Loader2,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import { useAiDocuments } from "@/hooks/useAiDocuments";

interface Source {
  doc_id: number;
  name: string;
  chunk_text: string;
  relevance_score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
  error?: boolean;
}

function SourcesPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div style={{ marginTop: "0.6rem" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
          padding: 0,
        }}
      >
        <ChevronRight
          size={13}
          style={{
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
        {sources.length} source{sources.length > 1 ? "s" : ""} used
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          {sources.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "0.6rem 0.75rem",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.3rem",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--color-brand-primary)",
                  }}
                >
                  <FileText
                    size={11}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  {s.name}
                </span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {Math.round(s.relevance_score * 100)}% match
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-muted)",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {s.chunk_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Thinking step types ───────────────────────────────────────────────────────

interface ThinkingStep {
  label: string;
  status: "loading" | "done";
}

// ── Thinking bubble (ported from local-rag-agent mobile ChatScreen) ───────────

function ThinkingBubble() {
  const [steps, setSteps] = useState<ThinkingStep[]>([
    { label: "Searching documents...", status: "loading" },
  ]);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setSteps([
        { label: "Searching documents...", status: "done" },
        { label: "Analyzing relevant content...", status: "loading" },
      ]);
    }, 1500);

    const t2 = setTimeout(() => {
      setSteps([
        { label: "Searching documents...", status: "done" },
        { label: "Analyzing relevant content...", status: "done" },
        { label: "Generating response...", status: "loading" },
      ]);
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
        }}
      >
        <Sparkles
          size={13}
          color="#e879a8"
          style={{ animation: "sparkSpin 3s linear infinite" }}
        />
        <span
          style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e879a8" }}
        >
          Thinking
        </span>
      </div>

      {/* Steps */}
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "msgSlideUp 0.22s ease-out both",
          }}
        >
          {step.status === "loading" ? (
            <Loader2
              size={14}
              style={{
                color: "#e879a8",
                animation: "spin 1s linear infinite",
                flexShrink: 0,
              }}
            />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="rgba(16,185,129,0.15)"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              <path
                d="M7 12.5l3.5 3.5 6.5-7"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <span
            style={{
              fontSize: "0.8rem",
              color:
                step.status === "done" ? "#10b981" : "rgba(255,255,255,0.55)",
              transition: "color 0.3s",
            }}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const isThinking = !isUser && msg.isStreaming && msg.content === "";

  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        animation: "msgSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          flexShrink: 0,
          background: isUser
            ? "linear-gradient(135deg,#22d3ee,#818cf8)"
            : "var(--color-surface-raised)",
          border: `1px solid ${msg.isStreaming && !isUser ? "rgba(232,121,168,0.45)" : "var(--color-border)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.3s",
          animation:
            msg.isStreaming && !isUser
              ? "avatarPulse 2s ease-in-out infinite"
              : "none",
        }}
      >
        {isUser ? (
          <User size={15} color="#0f1117" />
        ) : (
          <Sparkles
            size={15}
            color={msg.isStreaming ? "#e879a8" : "var(--color-brand-secondary)"}
            style={{
              transition: "color 0.3s",
              animation: msg.isStreaming
                ? "sparkSpin 3s linear infinite"
                : "none",
            }}
          />
        )}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: "72%", minWidth: 60 }}>
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
            background: isUser
              ? "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(129,140,248,0.15))"
              : isThinking
                ? "#161622"
                : "var(--color-surface)",
            border: `1px solid ${
              isUser
                ? "rgba(34,211,238,0.2)"
                : isThinking
                  ? "#1f1f35"
                  : msg.isStreaming
                    ? "rgba(232,121,168,0.2)"
                    : "var(--color-border)"
            }`,
            transition: "background 0.3s, border-color 0.3s",
          }}
        >
          {isThinking ? (
            <ThinkingBubble />
          ) : msg.error ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--status-red)",
              }}
            >
              <AlertCircle size={14} />
              <span style={{ fontSize: "0.85rem" }}>{msg.content}</span>
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                color: "var(--color-text-primary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.content}
              {msg.isStreaming && msg.content && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: "1em",
                    background: "var(--color-brand-secondary)",
                    marginLeft: 2,
                    borderRadius: 2,
                    verticalAlign: "text-bottom",
                    animation: "cursorBlink 0.8s step-end infinite",
                  }}
                />
              )}
            </p>
          )}
        </div>
        {!isUser && msg.sources && !msg.isStreaming && (
          <SourcesPanel sources={msg.sources} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const suggestions = [
    "What are the key policies in the uploaded documents?",
    "Summarise the main points of the latest report.",
    "What are the leave policies for staff?",
    "Find any information about budget allocations.",
  ];
  return (
    <div
      style={{
        textAlign: "center",
        padding: "3rem 1rem",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: "rgba(129,140,248,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.25rem",
        }}
      >
        <MessageSquare size={28} color="var(--color-brand-secondary)" />
      </div>
      <h2
        style={{
          margin: "0 0 0.5rem",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "var(--color-text-primary)",
        }}
      >
        Chat with your documents
      </h2>
      <p
        style={{
          margin: "0 0 1.5rem",
          fontSize: "0.85rem",
          color: "var(--color-text-muted)",
          lineHeight: 1.6,
        }}
      >
        Ask questions about your uploaded documents. Powered by local Ollama AI.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          textAlign: "left",
        }}
      >
        {suggestions.map((s) => (
          <div
            key={s}
            style={{
              padding: "0.65rem 1rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: "0.83rem",
              color: "var(--color-text-muted)",
              cursor: "default",
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: docsData } = useAiDocuments();
  const docs = docsData?.documents ?? [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    // Build conversation history for the API
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, top_k: 5 }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalSources: Source[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw) as {
              token?: string;
              sources?: Source[];
              done?: boolean;
              error?: string;
            };

            if (event.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: event.error ?? "Error",
                        isStreaming: false,
                        error: true,
                      }
                    : m,
                ),
              );
              break;
            }

            if (event.token) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.token }
                    : m,
                ),
              );
            }

            if (event.done) {
              finalSources = event.sources ?? [];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, isStreaming: false, sources: finalSources }
                    : m,
                ),
              );
            }
          } catch {
            // malformed JSON line — skip
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  err instanceof Error
                    ? err.message
                    : "Failed to get a response.",
                isStreaming: false,
                error: true,
              }
            : m,
        ),
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <PortalLayout>
      <style>{`
        @keyframes thinkBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes msgSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes avatarPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,121,168,0); }
          50%       { box-shadow: 0 0 0 6px rgba(232,121,168,0.22); }
        }
        @keyframes sparkSpin {
          0%   { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.15); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          height: "calc(100vh - 120px)",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* ── Sidebar: document list ─────────────────────────── */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 14,
              padding: "1rem",
              flex: 1,
              overflowY: "auto",
            }}
          >
            <p
              style={{
                margin: "0 0 0.75rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Indexed Documents
            </p>
            {docs.length === 0 ? (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                  textAlign: "center",
                  marginTop: "1rem",
                }}
              >
                No documents yet. Upload from the Documents page.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                {docs.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0.6rem",
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                  >
                    <FileText
                      size={13}
                      color="var(--color-brand-primary)"
                      style={{ flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--color-text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 14,
              padding: "0.85rem",
            }}
          >
            <p
              style={{
                margin: "0 0 0.4rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Model
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--color-brand-secondary)",
                fontWeight: 600,
              }}
            >
              llama3.1:8b
            </p>
            <p
              style={{
                margin: "0.15rem 0 0",
                fontSize: "0.72rem",
                color: "var(--color-text-muted)",
              }}
            >
              nomic-embed-text
            </p>
          </div>
        </div>

        {/* ── Chat panel ─────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(129,140,248,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={17} color="var(--color-brand-secondary)" />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                  }}
                >
                  Document Chat
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.72rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {docs.length} document{docs.length !== 1 ? "s" : ""} available
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 0.85rem",
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  borderRadius: 8,
                  color: "var(--status-red)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-end",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: 14,
                padding: "0.65rem 0.75rem",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents… (Enter to send, Shift+Enter for newline)"
                rows={1}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "var(--color-text-primary)",
                  fontSize: "0.88rem",
                  resize: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                  maxHeight: 120,
                  overflowY: "auto",
                }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                }}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  flexShrink: 0,
                  background:
                    input.trim() && !loading
                      ? "linear-gradient(135deg,#22d3ee,#818cf8)"
                      : "var(--color-surface-raised)",
                  border: "none",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {loading ? (
                  <Loader2
                    size={16}
                    color="var(--color-text-muted)"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Send
                    size={15}
                    color={input.trim() ? "#0f1117" : "var(--color-text-muted)"}
                  />
                )}
              </button>
            </div>
            <p
              style={{
                margin: "0.4rem 0 0",
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                textAlign: "center",
              }}
            >
              Answers are generated from your uploaded documents only.
            </p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
