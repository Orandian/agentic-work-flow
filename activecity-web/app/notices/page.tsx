"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Bell,
  Plus,
  Search,
  Pin,
  Send,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Calendar,
  BookOpen,
  Info,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import {
  useNoticeList,
  useCreateNotice,
  useUpdateNotice,
  usePublishNotice,
  useDeleteNotice,
} from "@/hooks/useNotices";
import { useSession } from "@/hooks/useSession";
import type {
  Notice,
  NoticeType,
  NoticeStatus,
  SaveNoticePayload,
} from "@/types/portal";

const noticeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  type: z.enum(["GENERAL", "URGENT", "HOLIDAY", "POLICY"]),
  pinned: z.boolean(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

type NoticeForm = z.infer<typeof noticeSchema>;

const TYPE_META: Record<
  NoticeType,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  URGENT: {
    label: "Urgent",
    color: "var(--status-red)",
    bg: "rgba(248,113,113,0.12)",
    Icon: AlertTriangle,
  },
  HOLIDAY: {
    label: "Holiday",
    color: "var(--status-yellow)",
    bg: "rgba(251,191,36,0.12)",
    Icon: Calendar,
  },
  POLICY: {
    label: "Policy",
    color: "var(--status-blue)",
    bg: "rgba(96,165,250,0.12)",
    Icon: BookOpen,
  },
  GENERAL: {
    label: "General",
    color: "var(--status-slate)",
    bg: "rgba(148,163,184,0.12)",
    Icon: Info,
  },
};

const STATUS_META: Record<NoticeStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "var(--status-yellow)" },
  PUBLISHED: { label: "Published", color: "var(--status-active)" },
  ARCHIVED: { label: "Archived", color: "var(--status-slate)" },
};

const STATUS_TABS: { value: NoticeStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Drafts" },
  { value: "ARCHIVED", label: "Archived" },
];

function NoticeModal({
  initial,
  onClose,
}: {
  initial?: Notice;
  onClose: () => void;
}) {
  const create = useCreateNotice();
  const update = useUpdateNotice();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NoticeForm>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      type: initial?.type ?? "GENERAL",
      pinned: initial?.pinned ?? false,
      status: initial?.status ?? "DRAFT",
    },
  });

  const pinned = watch("pinned");

  const onSubmit = async (values: NoticeForm) => {
    const payload: SaveNoticePayload = values;
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, payload });
        toast.success("Notice updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Notice created");
      }
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-text-primary)",
    fontSize: "0.88rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.78rem",
    color: "var(--color-text-muted)",
    marginBottom: "0.35rem",
    fontWeight: 600,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {initial ? "Edit Notice" : "New Notice"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <label style={labelStyle}>Title</label>
            <input
              {...register("title")}
              placeholder="Notice title"
              style={inputStyle}
            />
            {errors.title && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--status-red)",
                  marginTop: "0.25rem",
                }}
              >
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Content</label>
            <textarea
              {...register("content")}
              placeholder="Write the notice content here..."
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            {errors.content && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--status-red)",
                  marginTop: "0.25rem",
                }}
              >
                {errors.content.message}
              </p>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Type</label>
              <select {...register("type")} style={inputStyle}>
                <option value="GENERAL">General</option>
                <option value="URGENT">Urgent</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="POLICY">Policy</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select {...register("status")} style={inputStyle}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setValue("pinned", !pinned)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.55rem 1rem",
                background: pinned ? "rgba(34,211,238,0.1)" : "var(--color-bg)",
                border: `1px solid ${pinned ? "rgba(34,211,238,0.3)" : "var(--color-border)"}`,
                borderRadius: 8,
                color: pinned
                  ? "var(--color-brand-primary)"
                  : "var(--color-text-muted)",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: pinned ? 600 : 400,
              }}
            >
              <Pin size={15} />
              {pinned ? "Pinned to top" : "Pin to top"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              paddingTop: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.55rem 1.2rem",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-text-muted)",
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.55rem 1.2rem",
                background: "linear-gradient(135deg,#22d3ee,#818cf8)",
                border: "none",
                borderRadius: 8,
                color: "#0f1117",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Saving…" : initial ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NoticeCard({
  notice,
  isAdmin,
  onEdit,
}: {
  notice: Notice;
  isAdmin: boolean;
  onEdit: (n: Notice) => void;
}) {
  const publish = usePublishNotice();
  const del = useDeleteNotice();
  const {
    label: typeLabel,
    color: typeColor,
    bg: typeBg,
    Icon: TypeIcon,
  } = TYPE_META[notice.type];
  const { label: statusLabel, color: statusColor } = STATUS_META[notice.status];

  const handlePublish = async () => {
    try {
      await publish.mutateAsync(notice.id);
      toast.success("Notice published");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${notice.title}"?`)) return;
    try {
      await del.mutateAsync(notice.id);
      toast.success("Notice deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        position: "relative",
      }}
    >
      {notice.pinned && (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <Pin size={14} color="var(--color-brand-primary)" />
        </div>
      )}

      <div
        style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            flexShrink: 0,
            background: typeBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TypeIcon size={16} color={typeColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                padding: "0.15rem 0.55rem",
                borderRadius: 999,
                fontSize: "0.68rem",
                fontWeight: 700,
                background: typeBg,
                color: typeColor,
              }}
            >
              {typeLabel}
            </span>
            <span
              style={{
                padding: "0.15rem 0.55rem",
                borderRadius: 999,
                fontSize: "0.68rem",
                fontWeight: 700,
                background: "rgba(148,163,184,0.1)",
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <h3
            style={{
              margin: "0.35rem 0 0",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              paddingRight: notice.pinned ? "1.5rem" : 0,
            }}
          >
            {notice.title}
          </h3>
        </div>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "0.85rem",
          color: "var(--color-text-muted)",
          lineHeight: 1.6,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {notice.content}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "0.5rem",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          {notice.postedByName && <span>By {notice.postedByName}</span>}
          {notice.publishedAt && (
            <span style={{ marginLeft: "0.5rem" }}>
              · {new Date(notice.publishedAt).toLocaleDateString()}
            </span>
          )}
          {!notice.publishedAt && notice.createdAt && (
            <span style={{ marginLeft: "0.5rem" }}>
              · Created {new Date(notice.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {notice.status === "DRAFT" && (
              <button
                onClick={handlePublish}
                disabled={publish.isPending}
                title="Publish"
                style={{
                  padding: "0.3rem 0.7rem",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  background: "rgba(52,211,153,0.1)",
                  border: "1px solid rgba(52,211,153,0.2)",
                  color: "var(--status-active)",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <Send size={12} /> Publish
              </button>
            )}
            <button
              onClick={() => onEdit(notice)}
              title="Edit"
              style={{
                padding: "0.3rem 0.5rem",
                borderRadius: 6,
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={handleDelete}
              disabled={del.isPending}
              title="Delete"
              style={{
                padding: "0.3rem 0.5rem",
                borderRadius: 6,
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.2)",
                color: "var(--status-red)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NoticesPage() {
  const session = useSession();
  const isAdmin = session.data?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoticeType | "">("");
  const [statusTab, setStatusTab] = useState<NoticeStatus | "">("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; notice?: Notice }>({
    open: false,
  });

  const { data, isLoading, isError } = useNoticeList(
    typeFilter,
    statusTab,
    page,
    12,
  );

  const notices = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const filtered = search
    ? notices.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()),
      )
    : notices;

  return (
    <PortalLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(251,191,36,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={20} color="var(--status-yellow)" />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                }}
              >
                Notices
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                }}
              >
                {total} notice{total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModal({ open: true })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.2rem",
                background: "linear-gradient(135deg,#22d3ee,#818cf8)",
                border: "none",
                borderRadius: 10,
                color: "#0f1117",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Plus size={16} /> New Notice
            </button>
          )}
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{ position: "relative", flex: "1 1 200px", maxWidth: 320 }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notices…"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem 0.55rem 2rem",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-text-primary)",
                fontSize: "0.88rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as NoticeType | "");
              setPage(1);
            }}
            style={{
              padding: "0.55rem 0.75rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <option value="">All Types</option>
            <option value="GENERAL">General</option>
            <option value="URGENT">Urgent</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="POLICY">Policy</option>
          </select>
        </div>

        {/* Status tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            marginBottom: "1.5rem",
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "0",
          }}
        >
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setStatusTab(value);
                setPage(1);
              }}
              style={{
                padding: "0.55rem 1rem",
                background: "none",
                border: "none",
                borderBottom:
                  statusTab === value
                    ? "2px solid var(--color-brand-primary)"
                    : "2px solid transparent",
                color:
                  statusTab === value
                    ? "var(--color-brand-primary)"
                    : "var(--color-text-muted)",
                fontSize: "0.88rem",
                fontWeight: statusTab === value ? 700 : 400,
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "1rem",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 200,
                  borderRadius: 12,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : isError ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--status-red)",
            }}
          >
            Failed to load notices.
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem",
              color: "var(--color-text-muted)",
            }}
          >
            <Bell size={40} style={{ opacity: 0.3, marginBottom: "1rem" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No notices found</p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
              {isAdmin
                ? "Create the first notice using the button above."
                : "Check back later."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "1rem",
            }}
          >
            {filtered.map((n) => (
              <NoticeCard
                key={n.id}
                notice={n}
                isAdmin={isAdmin}
                onEdit={(n) => setModal({ open: true, notice: n })}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
              marginTop: "1.5rem",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 8,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                opacity: page === 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span
              style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 8,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                opacity: page === totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {modal.open && (
        <NoticeModal
          initial={modal.notice}
          onClose={() => setModal({ open: false })}
        />
      )}
    </PortalLayout>
  );
}
