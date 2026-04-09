"use client";

import PortalLayout from "@/components/portal/PortalLayout";
import { useDashboardStats, useDashboardActivity } from "@/hooks/useDashboard";
import {
  useAiDocuments,
  useUploadDocument,
  useAiSearch,
} from "@/hooks/useAiDocuments";
import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Users,
  CheckSquare,
  FileText,
  Bell,
  Upload,
  Search,
  Plus,
  Loader2,
  TrendingUp,
} from "lucide-react";
import type { SearchResponse } from "@/types/ai";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = "1rem" }: { w?: string; h?: string }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        background: "var(--color-surface-raised)",
        animation: "skeletonPulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  trend,
  Icon,
  color,
  loading,
}: {
  label: string;
  value?: number | string;
  trend?: string;
  Icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: "0 0 0.4rem",
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
              fontWeight: 500,
            }}
          >
            {label}
          </p>
          {loading ? (
            <Skeleton h="2rem" w="60%" />
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--color-text-primary)",
                lineHeight: 1,
              }}
            >
              {value ?? 0}
            </p>
          )}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}1a`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} color={color} />
        </div>
      </div>
      <p
        style={{
          margin: "0.75rem 0 0",
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
        }}
      >
        {loading ? <Skeleton h="0.7rem" w="70%" /> : (trend ?? " ")}
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const session = useSession();
  const stats = useDashboardStats();
  const activity = useDashboardActivity();
  const docs = useAiDocuments();
  const upload = useUploadDocument();
  const search = useAiSearch();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);

  const email = session.data?.email ?? "";
  const fullName = session.data?.fullName?.trim();
  const firstName = fullName
    ? fullName.split(/\s+/)[0]
    : email
      ? email
          .split("@")[0]
          .split(/[._-]/)[0]
          .replace(/^\w/, (c) => c.toUpperCase())
      : "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    upload.mutate(file, {
      onSuccess: (doc) => toast.success(`"${doc.name}" uploaded`),
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

  const s = stats.data;

  return (
    <PortalLayout>
      <style>{`@keyframes skeletonPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Welcome */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            margin: "0 0 0.2rem",
            fontSize: "1.6rem",
            fontWeight: 800,
            color: "var(--color-text-primary)",
          }}
        >
          {greeting}, {firstName}
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-muted)",
            fontSize: "0.9rem",
          }}
        >
          Here&apos;s what&apos;s happening in your city today.
        </p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="Total Staff"
          value={s?.totalStaff}
          trend={`+${s?.newStaffThisMonth ?? 0} this month`}
          Icon={Users}
          color="#22d3ee"
          loading={stats.isLoading}
        />
        <StatCard
          label="Active Tasks"
          value={s?.activeTasks}
          trend={`${s?.tasksDueToday ?? 0} due today`}
          Icon={CheckSquare}
          color="#818cf8"
          loading={stats.isLoading}
        />
        <StatCard
          label="Documents"
          value={s?.totalDocuments ?? docs.data?.total}
          trend={`+${s?.newDocumentsThisWeek ?? 0} this week`}
          Icon={FileText}
          color="#34d399"
          loading={stats.isLoading && docs.isLoading}
        />
        <StatCard
          label="Pending Notices"
          value={s?.pendingNotices}
          trend={`${s?.urgentNotices ?? 0} urgent`}
          Icon={Bell}
          color="#fbbf24"
          loading={stats.isLoading}
        />
      </div>

      {/* Bottom grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {/* Activity */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            Recent Activity
          </h3>
          {activity.isLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} h="2.5rem" />
              ))}
            </div>
          ) : activity.data && activity.data.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {activity.data.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "rgba(34,211,238,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--color-brand-primary)",
                      flexShrink: 0,
                    }}
                  >
                    {item.userInitials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <strong>{item.userName}</strong> {item.action}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {item.timeAgo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "0.85rem",
              }}
            >
              No recent activity yet.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "1.25rem",
            alignSelf: "flex-start",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            Quick Actions
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
          >
            {[
              {
                label: "Add Staff Member",
                Icon: Plus,
                action: () => router.push("/staff"),
              },
              {
                label: "Create Task",
                Icon: Plus,
                action: () => router.push("/tasks"),
              },
              {
                label: "Post Notice",
                Icon: Bell,
                action: () => router.push("/notices"),
              },
            ].map(({ label, Icon, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.65rem 0.9rem",
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text-primary)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "border-color 0.15s",
                }}
              >
                <Icon size={16} color="var(--color-brand-primary)" />
                {label}
              </button>
            ))}

            <button
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.65rem 0.9rem",
                background: upload.isPending
                  ? "rgba(34,211,238,0.05)"
                  : "var(--color-surface-raised)",
                border: `1px solid ${upload.isPending ? "rgba(34,211,238,0.3)" : "var(--color-border)"}`,
                borderRadius: 8,
                color: upload.isPending
                  ? "var(--color-brand-primary)"
                  : "var(--color-text-primary)",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: upload.isPending ? "wait" : "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              {upload.isPending ? (
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Upload size={16} color="var(--color-brand-primary)" />
              )}
              {upload.isPending ? "Uploading…" : "Upload Document"}
            </button>
            <input
              ref={fileRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleUpload}
              accept=".pdf,.txt,.docx,.md"
            />

            <div
              style={{
                height: 1,
                background: "var(--color-border)",
                margin: "0.25rem 0",
              }}
            />

            <button
              onClick={() => router.push("/documents")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.65rem 0.9rem",
                background:
                  "linear-gradient(135deg,rgba(34,211,238,0.1),rgba(129,140,248,0.1))",
                border: "1px solid rgba(34,211,238,0.2)",
                borderRadius: 8,
                color: "var(--color-brand-primary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <Search size={16} />
              AI Knowledge Search
            </button>
          </div>
        </div>
      </div>

      {/* AI Search panel */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: "1.25rem",
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
          <TrendingUp size={18} color="var(--color-brand-primary)" />
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            AI Knowledge Search
          </h3>
        </div>
        <form
          onSubmit={handleSearch}
          style={{ display: "flex", gap: "0.65rem", marginBottom: "1rem" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about policies, procedures…"
            disabled={search.isPending}
            style={{
              flex: 1,
              padding: "0.65rem 0.9rem",
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: "0.88rem",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={search.isPending || !query.trim()}
            style={{
              padding: "0.65rem 1.25rem",
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
            }}
          >
            {search.isPending ? "Searching…" : "Search"}
          </button>
        </form>

        {search.isPending && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
          >
            <Skeleton />
            <Skeleton w="85%" />
            <Skeleton w="65%" />
          </div>
        )}
        {search.isError && !search.isPending && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 8,
              color: "var(--color-error)",
              fontSize: "0.85rem",
            }}
          >
            {search.error?.message}
          </div>
        )}
        {!search.isPending && !search.isError && !result && (
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.85rem",
              margin: 0,
              opacity: 0.7,
            }}
          >
            Enter a question above to search the knowledge base.
          </p>
        )}
        {result && !search.isPending && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div
              style={{
                padding: "1rem",
                background: "rgba(52,211,153,0.07)",
                border: "1px solid rgba(52,211,153,0.2)",
                borderRadius: 8,
              }}
            >
              <p
                style={{
                  margin: "0 0 0.35rem",
                  fontSize: "0.72rem",
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
                  fontSize: "0.9rem",
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
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Sources ({result.sources.length})
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {result.sources.map((src, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "0.65rem 0.9rem",
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: "0.82rem",
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
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          marginLeft: "0.5rem",
                        }}
                      >
                        · {(src.relevance_score * 100).toFixed(0)}%
                      </span>
                      <p
                        style={{
                          margin: "0.3rem 0 0",
                          color: "var(--color-text-muted)",
                          lineHeight: 1.5,
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
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
