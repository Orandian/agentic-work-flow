"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  FileText,
  Loader2,
  LayoutGrid,
  List,
  FolderPlus,
  Folder,
  FolderOpen,
  Pencil,
  CornerUpLeft,
  Check,
  X,
  ChevronRight,
  MoveRight,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAiDocuments,
  useUploadDocument,
  useDeleteDocument,
  useFolders,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  useRenameDocument,
  useMoveDocument,
} from "@/hooks/useAiDocuments";
import type { DocumentOut, FolderOut } from "@/types/ai";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TYPE_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  pdf: { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "PDF" },
  docx: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "DOCX" },
  doc: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "DOC" },
  txt: { color: "#34d399", bg: "rgba(52,211,153,0.12)", label: "TXT" },
  md: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "MD" },
};

function typeConf(t: string) {
  return (
    TYPE_CONFIG[t.toLowerCase()] ?? {
      color: "#94a3b8",
      bg: "rgba(148,163,184,0.12)",
      label: t.toUpperCase(),
    }
  );
}

// ── File icon ─────────────────────────────────────────────────────────────────

function DocFileIcon({ type, size = 48 }: { type: string; size?: number }) {
  const { color, bg, label } = typeConf(type);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        background: bg,
        border: `1.5px solid ${color}33`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        flexShrink: 0,
      }}
    >
      <FileText style={{ width: size * 0.42, height: size * 0.42, color }} />
      <span
        style={{
          fontSize: size * 0.17,
          fontWeight: 700,
          color,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Inline rename input ───────────────────────────────────────────────────────

function InlineRename({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function commit() {
    const trimmed = val.trim();
    if (trimmed && trimmed !== initial) onCommit(trimmed);
    else onCancel();
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") onCancel();
  }

  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
      onClick={(e) => e.stopPropagation()}
      style={{
        fontSize: 12,
        border: "1.5px solid var(--color-brand, #6366f1)",
        borderRadius: 4,
        padding: "2px 6px",
        background: "var(--color-surface, #1e1e2e)",
        color: "var(--color-text, #e2e8f0)",
        outline: "none",
        width: "100%",
        textAlign: "center",
      }}
    />
  );
}

// ── Move modal ────────────────────────────────────────────────────────────────

function MoveModal({
  doc,
  folders,
  onMove,
  onClose,
}: {
  doc: DocumentOut;
  folders: FolderOut[];
  onMove: (folderId: number | null) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface, #1e1e2e)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 24,
          minWidth: 300,
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-text, #e2e8f0)",
          }}
        >
          Move document
        </h3>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          {doc.display_name ?? doc.name}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Root option */}
          <button
            onClick={() => onMove(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                doc.folder_id === null
                  ? "rgba(99,102,241,0.15)"
                  : "transparent",
              color: "var(--color-text, #e2e8f0)",
              cursor: "pointer",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            <Folder size={14} style={{ opacity: 0.5 }} />
            <span style={{ flex: 1 }}>Root (no folder)</span>
            {doc.folder_id === null && (
              <Check size={14} style={{ color: "#6366f1" }} />
            )}
          </button>

          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => onMove(f.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  doc.folder_id === f.id
                    ? "rgba(99,102,241,0.15)"
                    : "transparent",
                color: "var(--color-text, #e2e8f0)",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <Folder size={14} style={{ color: "#fbbf24" }} />
              <span style={{ flex: 1 }}>{f.name}</span>
              {doc.folder_id === f.id && (
                <Check size={14} style={{ color: "#6366f1" }} />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "8px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Grid folder item ───────────────────────────────────────────────────────────

function GridFolderItem({
  folder,
  docCount,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: FolderOut;
  docCount: number;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onOpen}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 8px 10px",
        borderRadius: 12,
        border: `1.5px solid ${hovered ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.06)"}`,
        background: hovered ? "rgba(251,191,36,0.06)" : "transparent",
        cursor: "pointer",
        transition: "all 0.15s",
        userSelect: "none",
      }}
    >
      {/* Action buttons */}
      {hovered && !renaming && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            display: "flex",
            gap: 3,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setRenaming(true)}
            title="Rename"
            style={iconBtnStyle("#94a3b8")}
          >
            <Pencil size={10} />
          </button>
          <button
            onClick={onDelete}
            title="Delete folder"
            style={iconBtnStyle("#f87171")}
          >
            <X size={10} />
          </button>
        </div>
      )}

      <FolderOpen size={44} style={{ color: "#fbbf24" }} />

      {renaming ? (
        <InlineRename
          initial={folder.name}
          onCommit={(v) => {
            onRename(v);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <span
          style={{
            fontSize: 12,
            color: "var(--color-text, #e2e8f0)",
            textAlign: "center",
            wordBreak: "break-word",
            maxWidth: 90,
          }}
        >
          {folder.name}
        </span>
      )}

      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
        {docCount} {docCount === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

// ── Grid doc item ─────────────────────────────────────────────────────────────

function GridDocItem({
  doc,
  inFolder,
  onDelete,
  onRename,
  onMoveToRoot,
  onMove,
}: {
  doc: DocumentOut;
  inFolder: boolean;
  onDelete: () => void;
  onRename: (name: string) => void;
  onMoveToRoot: () => void;
  onMove: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [hovered, setHovered] = useState(false);
  const displayName = doc.display_name ?? doc.name;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 8px 10px",
        borderRadius: 12,
        border: `1.5px solid ${hovered ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
        background: hovered ? "rgba(99,102,241,0.05)" : "transparent",
        cursor: "default",
        transition: "all 0.15s",
        userSelect: "none",
      }}
    >
      {hovered && !renaming && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            display: "flex",
            gap: 3,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setRenaming(true)}
            title="Rename"
            style={iconBtnStyle("#94a3b8")}
          >
            <Pencil size={10} />
          </button>
          <button
            onClick={onMove}
            title="Move to folder"
            style={iconBtnStyle("#60a5fa")}
          >
            <MoveRight size={10} />
          </button>
          {inFolder && (
            <button
              onClick={onMoveToRoot}
              title="Move to root"
              style={iconBtnStyle("#a78bfa")}
            >
              <CornerUpLeft size={10} />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Delete"
            style={iconBtnStyle("#f87171")}
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}

      <DocFileIcon type={doc.file_type} size={44} />

      {renaming ? (
        <InlineRename
          initial={displayName}
          onCommit={(v) => {
            onRename(v);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <span
          style={{
            fontSize: 12,
            color: "var(--color-text, #e2e8f0)",
            textAlign: "center",
            wordBreak: "break-word",
            maxWidth: 90,
          }}
        >
          {displayName.length > 28
            ? displayName.slice(0, 26) + "…"
            : displayName}
        </span>
      )}

      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
        {formatBytes(doc.file_size)}
      </span>
    </div>
  );
}

// ── List doc row ──────────────────────────────────────────────────────────────

function ListDocRow({
  doc,
  inFolder,
  onDelete,
  onRename,
  onMoveToRoot,
  onMove,
}: {
  doc: DocumentOut;
  inFolder: boolean;
  onDelete: () => void;
  onRename: (name: string) => void;
  onMoveToRoot: () => void;
  onMove: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [hovered, setHovered] = useState(false);
  const displayName = doc.display_name ?? doc.name;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr 80px 80px 100px 120px",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        borderRadius: 8,
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 0.1s",
      }}
    >
      <DocFileIcon type={doc.file_type} size={28} />

      <div style={{ minWidth: 0 }}>
        {renaming ? (
          <InlineRename
            initial={displayName}
            onCommit={(v) => {
              onRename(v);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            style={{
              fontSize: 13,
              color: "var(--color-text, #e2e8f0)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
          >
            {displayName}
          </span>
        )}
      </div>

      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          textAlign: "right",
        }}
      >
        {doc.file_type.toUpperCase()}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          textAlign: "right",
        }}
      >
        {formatBytes(doc.file_size)}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          textAlign: "right",
        }}
      >
        {doc.chunk_count} chunks
      </span>

      {hovered && !renaming ? (
        <div
          style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setRenaming(true)}
            title="Rename"
            style={iconBtnStyle("#94a3b8")}
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={onMove}
            title="Move to folder"
            style={iconBtnStyle("#60a5fa")}
          >
            <MoveRight size={11} />
          </button>
          {inFolder && (
            <button
              onClick={onMoveToRoot}
              title="Move to root"
              style={iconBtnStyle("#a78bfa")}
            >
              <CornerUpLeft size={11} />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Delete"
            style={iconBtnStyle("#f87171")}
          >
            <Trash2 size={11} />
          </button>
        </div>
      ) : (
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            textAlign: "right",
          }}
        >
          {formatDate(doc.uploaded_at)}
        </span>
      )}
    </div>
  );
}

// ── Shared button style ───────────────────────────────────────────────────────

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 5,
    border: `1px solid ${color}44`,
    background: `${color}18`,
    color,
    cursor: "pointer",
    flexShrink: 0,
  };
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  folders,
  documents,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  folders: FolderOut[];
  documents: DocumentOut[];
  activeFolderId: number | null | "root";
  onSelectFolder: (id: number | null | "root") => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: number, name: string) => void;
  onDeleteFolder: (id: number) => void;
}) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);

  const rootCount = documents.filter((d) => d.folder_id === null).length;

  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        padding: "12px 0",
        gap: 2,
      }}
    >
      {/* All documents */}
      <SidebarItem
        label="All Documents"
        count={documents.length}
        active={
          activeFolderId === "root" ? false : activeFolderId === null && false
        }
        isAllDocs={activeFolderId === null && true}
        onClick={() => onSelectFolder(null)}
        icon={<FileText size={14} style={{ opacity: 0.6 }} />}
      />

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.06)",
          margin: "6px 12px",
        }}
      />

      {/* Folders header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          marginBottom: 2,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Folders
        </span>
        <button
          onClick={onCreateFolder}
          title="New folder"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            padding: 2,
            borderRadius: 4,
            display: "flex",
          }}
        >
          <FolderPlus size={13} />
        </button>
      </div>

      {folders.map((f) => {
        const count = documents.filter((d) => d.folder_id === f.id).length;
        return (
          <div
            key={f.id}
            onMouseEnter={() => setHoveredId(f.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelectFolder(f.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 7,
              margin: "0 6px",
              background:
                activeFolderId === f.id
                  ? "rgba(251,191,36,0.1)"
                  : hoveredId === f.id
                    ? "rgba(255,255,255,0.04)"
                    : "transparent",
              cursor: "pointer",
              transition: "background 0.1s",
            }}
          >
            <Folder
              size={14}
              style={{
                color:
                  activeFolderId === f.id ? "#fbbf24" : "rgba(255,255,255,0.5)",
                flexShrink: 0,
              }}
            />

            {renamingId === f.id ? (
              <InlineRename
                initial={f.name}
                onCommit={(v) => {
                  onRenameFolder(f.id, v);
                  setRenamingId(null);
                }}
                onCancel={() => setRenamingId(null)}
              />
            ) : (
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color:
                    activeFolderId === f.id
                      ? "#fbbf24"
                      : "var(--color-text, #e2e8f0)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.name}
              </span>
            )}

            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                flexShrink: 0,
              }}
            >
              {count}
            </span>

            {hoveredId === f.id && renamingId !== f.id && (
              <div
                style={{ display: "flex", gap: 2, flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setRenamingId(f.id)}
                  style={iconBtnStyle("#94a3b8")}
                >
                  <Pencil size={9} />
                </button>
                <button
                  onClick={() => onDeleteFolder(f.id)}
                  style={iconBtnStyle("#f87171")}
                >
                  <X size={9} />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {folders.length === 0 && (
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            padding: "4px 18px",
          }}
        >
          No folders yet
        </span>
      )}
    </div>
  );
}

function SidebarItem({
  label,
  count,
  active,
  isAllDocs,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  isAllDocs?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const isActive = active || isAllDocs;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 7,
        margin: "0 6px",
        background: isActive
          ? "rgba(99,102,241,0.1)"
          : hovered
            ? "rgba(255,255,255,0.04)"
            : "transparent",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
    >
      {icon}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: isActive ? "#818cf8" : "var(--color-text, #e2e8f0)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
        {count}
      </span>
    </div>
  );
}

// ── New folder dialog ─────────────────────────────────────────────────────────

function NewFolderDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Untitled Folder");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function submit() {
    const t = name.trim();
    if (t) onConfirm(t);
    else onCancel();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--color-surface, #1e1e2e)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 24,
          width: 320,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 14px",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-text, #e2e8f0)",
          }}
        >
          New Folder
        </h3>
        <input
          ref={ref}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 8,
            border: "1.5px solid var(--color-brand, #6366f1)",
            background: "rgba(255,255,255,0.05)",
            color: "var(--color-text, #e2e8f0)",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { data: docsData, isLoading: docsLoading } = useAiDocuments();
  const { data: foldersData, isLoading: foldersLoading } = useFolders();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const createFolderMutation = useCreateFolder();
  const renameFolderMutation = useRenameFolder();
  const deleteFolderMutation = useDeleteFolder();
  const renameDocMutation = useRenameDocument();
  const moveDocMutation = useMoveDocument();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  // null = all documents view, number = folder view
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState<DocumentOut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "doc"; id: number; name: string }
    | { kind: "folder"; id: number; name: string }
    | null
  >(null);

  const documents = docsData?.documents ?? [];
  const folders = foldersData?.folders ?? [];

  // Visible documents based on selected folder
  const visibleDocs =
    activeFolderId === null
      ? documents // all
      : documents.filter((d) => d.folder_id === activeFolderId);

  const visibleFolders = activeFolderId === null ? folders : []; // folders only shown at root level

  const isLoading = docsLoading || foldersLoading;

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      try {
        await uploadMutation.mutateAsync(file);
        toast.success(`Uploaded ${file.name}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [uploadMutation],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      try {
        await uploadMutation.mutateAsync(file);
        toast.success(`Uploaded ${file.name}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [uploadMutation],
  );

  // ── Delete doc ──────────────────────────────────────────────────────────────

  function handleDeleteDoc(id: number, name: string) {
    setDeleteTarget({ kind: "doc", id, name });
  }

  async function confirmDeleteDoc(id: number) {
    setDeleteTarget(null);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Document deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  // ── Rename doc ──────────────────────────────────────────────────────────────

  async function handleRenameDoc(id: number, displayName: string) {
    try {
      await renameDocMutation.mutateAsync({ id, displayName });
      toast.success("Renamed");
    } catch {
      toast.error("Rename failed");
    }
  }

  // ── Move doc ────────────────────────────────────────────────────────────────

  async function handleMoveDoc(doc: DocumentOut, folderId: number | null) {
    setMoveTarget(null);
    if (doc.folder_id === folderId) return;
    try {
      await moveDocMutation.mutateAsync({ id: doc.id, folderId });
      toast.success(folderId === null ? "Moved to root" : "Moved to folder");
    } catch {
      toast.error("Move failed");
    }
  }

  // ── Create folder ───────────────────────────────────────────────────────────

  async function handleCreateFolder(name: string) {
    setShowNewFolder(false);
    try {
      await createFolderMutation.mutateAsync(name);
      toast.success(`Folder "${name}" created`);
    } catch {
      toast.error("Failed to create folder");
    }
  }

  // ── Rename folder ───────────────────────────────────────────────────────────

  async function handleRenameFolder(id: number, name: string) {
    try {
      await renameFolderMutation.mutateAsync({ id, name });
      toast.success("Folder renamed");
    } catch {
      toast.error("Rename failed");
    }
  }

  // ── Delete folder ───────────────────────────────────────────────────────────

  function handleDeleteFolder(id: number, name: string) {
    setDeleteTarget({ kind: "folder", id, name });
  }

  async function confirmDeleteFolder(id: number) {
    setDeleteTarget(null);
    try {
      await deleteFolderMutation.mutateAsync(id);
      if (activeFolderId === id) setActiveFolderId(null);
      toast.success("Folder deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  // ── Breadcrumb ──────────────────────────────────────────────────────────────

  const currentFolder =
    activeFolderId !== null
      ? folders.find((f) => f.id === activeFolderId)
      : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PortalLayout>
      {/* Modals */}
      {showNewFolder && (
        <NewFolderDialog
          onConfirm={handleCreateFolder}
          onCancel={() => setShowNewFolder(false)}
        />
      )}
      {moveTarget && (
        <MoveModal
          doc={moveTarget}
          folders={folders}
          onMove={(folderId) => handleMoveDoc(moveTarget, folderId)}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "folder"
                ? "Delete folder?"
                : "Delete document?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "folder" ? (
                <>
                  <strong style={{ color: "rgba(255,255,255,0.7)" }}>
                    {deleteTarget.name}
                  </strong>{" "}
                  will be deleted. Documents inside will be moved to root.
                </>
              ) : (
                <>
                  <strong style={{ color: "rgba(255,255,255,0.7)" }}>
                    {deleteTarget?.name}
                  </strong>{" "}
                  will be permanently removed from the knowledge base.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.kind === "doc")
                  confirmDeleteDoc(deleteTarget.id);
                else confirmDeleteFolder(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finder window */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 64px)",
          background: "var(--color-bg, #13131f)",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flex: 1,
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <button
              onClick={() => setActiveFolderId(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color:
                  activeFolderId === null ? "#e2e8f0" : "rgba(255,255,255,0.5)",
                fontSize: 13,
                padding: 0,
                fontWeight: activeFolderId === null ? 600 : 400,
              }}
            >
              Knowledge Base
            </button>
            {currentFolder && (
              <>
                <ChevronRight size={13} style={{ opacity: 0.4 }} />
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                  {currentFolder.name}
                </span>
              </>
            )}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowNewFolder(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <FolderPlus size={13} />
              New Folder
            </button>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 7,
                border: "1px solid rgba(99,102,241,0.4)",
                background: "rgba(99,102,241,0.12)",
                color: "#818cf8",
                cursor: uploadMutation.isPending ? "not-allowed" : "pointer",
                fontSize: 12,
                opacity: uploadMutation.isPending ? 0.6 : 1,
              }}
            >
              {uploadMutation.isPending ? (
                <Loader2
                  size={13}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Upload size={13} />
              )}
              Upload
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                style={{ display: "none" }}
                onChange={handleFileChange}
                disabled={uploadMutation.isPending}
              />
            </label>

            {/* View toggle */}
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 7,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setView("grid")}
                style={{
                  padding: "6px 8px",
                  background:
                    view === "grid" ? "rgba(255,255,255,0.08)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: view === "grid" ? "#e2e8f0" : "rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView("list")}
                style={{
                  padding: "6px 8px",
                  background:
                    view === "list" ? "rgba(255,255,255,0.08)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: view === "list" ? "#e2e8f0" : "rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  borderLeft: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar */}
          <Sidebar
            folders={folders}
            documents={documents}
            activeFolderId={activeFolderId}
            onSelectFolder={(id) => {
              if (typeof id === "number") setActiveFolderId(id);
              else setActiveFolderId(null);
            }}
            onCreateFolder={() => setShowNewFolder(true)}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={(id) => {
              const folder = folders.find((f) => f.id === id);
              handleDeleteFolder(id, folder?.name ?? "this folder");
            }}
          />

          {/* Content area */}
          <div
            style={{ flex: 1, overflow: "auto", padding: 20 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {isLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  color: "rgba(255,255,255,0.3)",
                  gap: 8,
                }}
              >
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Loading…
              </div>
            ) : visibleFolders.length === 0 && visibleDocs.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 250,
                  gap: 12,
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                <FolderOpen size={48} style={{ opacity: 0.2 }} />
                <span style={{ fontSize: 14 }}>
                  {activeFolderId !== null
                    ? "This folder is empty"
                    : "No documents yet — upload one to get started"}
                </span>
              </div>
            ) : view === "grid" ? (
              <div>
                {/* Folder grid section */}
                {visibleFolders.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    {activeFolderId === null && (
                      <SectionLabel label="Folders" />
                    )}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(110px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {visibleFolders.map((f) => (
                        <GridFolderItem
                          key={f.id}
                          folder={f}
                          docCount={
                            documents.filter((d) => d.folder_id === f.id).length
                          }
                          onOpen={() => setActiveFolderId(f.id)}
                          onRename={(name) => handleRenameFolder(f.id, name)}
                          onDelete={() => handleDeleteFolder(f.id, f.name)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Document grid section */}
                {visibleDocs.length > 0 && (
                  <div>
                    {activeFolderId === null && visibleFolders.length > 0 && (
                      <SectionLabel label="Documents (root)" />
                    )}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(110px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {visibleDocs.map((doc) => (
                        <GridDocItem
                          key={doc.id}
                          doc={doc}
                          inFolder={doc.folder_id !== null}
                          onDelete={() =>
                            handleDeleteDoc(
                              doc.id,
                              doc.display_name ?? doc.name,
                            )
                          }
                          onRename={(name) => handleRenameDoc(doc.id, name)}
                          onMoveToRoot={() => handleMoveDoc(doc, null)}
                          onMove={() => setMoveTarget(doc)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* List view */
              <div>
                {/* Folder list section */}
                {visibleFolders.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    {activeFolderId === null && (
                      <SectionLabel label="Folders" />
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {visibleFolders.map((f) => (
                        <FolderListRow
                          key={f.id}
                          folder={f}
                          docCount={
                            documents.filter((d) => d.folder_id === f.id).length
                          }
                          onOpen={() => setActiveFolderId(f.id)}
                          onRename={(name) => handleRenameFolder(f.id, name)}
                          onDelete={() => handleDeleteFolder(f.id, f.name)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Document list section */}
                {visibleDocs.length > 0 && (
                  <div>
                    {activeFolderId === null && visibleFolders.length > 0 && (
                      <SectionLabel label="Documents (root)" />
                    )}
                    {/* Header row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr 80px 80px 100px 120px",
                        gap: 12,
                        padding: "4px 12px",
                        marginBottom: 4,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {["", "Name", "Type", "Size", "Chunks", "Date"].map(
                        (h) => (
                          <span
                            key={h}
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.3)",
                              fontWeight: 600,
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                            }}
                          >
                            {h}
                          </span>
                        ),
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {visibleDocs.map((doc) => (
                        <ListDocRow
                          key={doc.id}
                          doc={doc}
                          inFolder={doc.folder_id !== null}
                          onDelete={() =>
                            handleDeleteDoc(
                              doc.id,
                              doc.display_name ?? doc.name,
                            )
                          }
                          onRename={(name) => handleRenameDoc(doc.id, name)}
                          onMoveToRoot={() => handleMoveDoc(doc, null)}
                          onMove={() => setMoveTarget(doc)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div
          style={{
            padding: "5px 16px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            display: "flex",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <span>{documents.length} documents total</span>
          <span>{folders.length} folders</span>
          {activeFolderId !== null && (
            <span>
              {visibleDocs.length} in &ldquo;{currentFolder?.name}&rdquo;
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </PortalLayout>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        marginBottom: 8,
        paddingBottom: 6,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Folder list row ───────────────────────────────────────────────────────────

function FolderListRow({
  folder,
  docCount,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: FolderOut;
  docCount: number;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 12px",
        borderRadius: 8,
        background: hovered ? "rgba(251,191,36,0.05)" : "transparent",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
    >
      <FolderOpen size={20} style={{ color: "#fbbf24", flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {renaming ? (
          <InlineRename
            initial={folder.name}
            onCommit={(v) => {
              onRename(v);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            style={{
              fontSize: 13,
              color: "var(--color-text, #e2e8f0)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
          >
            {folder.name}
          </span>
        )}
      </div>

      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
        {docCount} items
      </span>

      {hovered && !renaming && (
        <div
          style={{ display: "flex", gap: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setRenaming(true)}
            style={iconBtnStyle("#94a3b8")}
          >
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} style={iconBtnStyle("#f87171")}>
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
