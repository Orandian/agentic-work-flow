"use client";

import PortalLayout from "@/components/portal/PortalLayout";
import {
  useTaskList,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
} from "@/hooks/useTasks";
import { useStaffList } from "@/hooks/useStaff";
import { useSession } from "@/hooks/useSession";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  CalendarDays,
  User,
} from "lucide-react";
import type { Task, SaveTaskPayload, TaskStatus } from "@/types/portal";

// ── Schema ────────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  category: z.enum(["IT", "HR", "FACILITIES", "FINANCE", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  assignedTo: z.number().nullable().optional(),
  dueDate: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const STATUS_COLORS: Record<string, string> = {
  OPEN: "var(--status-slate)",
  IN_PROGRESS: "var(--status-blue)",
  DONE: "var(--status-active)",
  CANCELLED: "var(--color-error)",
};
const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "var(--color-error)",
  MEDIUM: "var(--status-yellow)",
  LOW: "var(--status-active)",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.72rem",
        fontWeight: 600,
        background: `${color}18`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </span>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────────────

function TaskModal({
  editing,
  onClose,
}: {
  editing: Task | null;
  onClose: () => void;
}) {
  const create = useCreateTask();
  const update = useUpdateTask();
  const staffList = useStaffList("", "", 1, 100);
  const isEdit = editing !== null;
  const pending = isEdit ? update.isPending : create.isPending;

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          description: editing.description,
          category: editing.category,
          priority: editing.priority,
          status: editing.status,
          assignedTo: editing.assignedToId ?? null,
          dueDate: editing.dueDate ?? "",
        }
      : { category: "OTHER", priority: "MEDIUM", status: "OPEN" },
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: SaveTaskPayload = {
      ...values,
      assignedTo: values.assignedTo ?? null,
    };
    if (isEdit) {
      update.mutate(
        { id: editing!.id, payload },
        {
          onSuccess: () => {
            toast.success("Task updated");
            onClose();
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Task created");
          onClose();
        },
        onError: (e) => toast.error(e.message),
      });
    }
  });

  const field = {
    width: "100%",
    padding: "0.6rem 0.85rem",
    background: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-text-primary)",
    fontSize: "0.88rem",
    boxSizing: "border-box" as const,
    outline: "none",
  };
  const label = {
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
    fontWeight: 500,
    marginBottom: "0.35rem",
    display: "block" as const,
  };
  const err = {
    color: "var(--color-error)",
    fontSize: "0.78rem",
    margin: "0.25rem 0 0",
  };

  return (
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
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {isEdit ? "Edit Task" : "Create Task"}
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
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label style={label}>Title</label>
            <input
              {...form.register("title")}
              style={field}
              placeholder="Task title"
            />
            {form.formState.errors.title && (
              <p style={err}>{form.formState.errors.title.message}</p>
            )}
          </div>
          <div>
            <label style={label}>Description</label>
            <textarea
              {...form.register("description")}
              style={{ ...field, minHeight: 80, resize: "vertical" }}
              placeholder="Optional details"
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <label style={label}>Category</label>
              <select {...form.register("category")} style={field}>
                {["IT", "HR", "FACILITIES", "FINANCE", "OTHER"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Priority</label>
              <select {...form.register("priority")} style={field}>
                {["LOW", "MEDIUM", "HIGH"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isEdit && (
            <div>
              <label style={label}>Status</label>
              <select {...form.register("status")} style={field}>
                {["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <label style={label}>Assign To</label>
              <select
                {...form.register("assignedTo", {
                  setValueAs: (v) => (v ? Number(v) : null),
                })}
                style={field}
              >
                <option value="">Unassigned</option>
                {staffList.data?.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Due Date</label>
              <input type="date" {...form.register("dueDate")} style={field} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
              marginTop: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
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
              type="submit"
              disabled={pending}
              style={{
                padding: "0.6rem 1.25rem",
                background: pending
                  ? "var(--color-surface-raised)"
                  : "linear-gradient(135deg,#22d3ee,#818cf8)",
                border: "none",
                borderRadius: 8,
                color: pending ? "var(--color-text-muted)" : "#0f1117",
                fontWeight: 600,
                cursor: pending ? "not-allowed" : "pointer",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {pending && (
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              )}
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  isAdmin,
  onEdit,
  onDelete,
}: {
  task: Task;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const updateStatus = useUpdateTaskStatus();
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "1.1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.4rem",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: PRIORITY_COLORS[task.priority],
                flexShrink: 0,
              }}
            />
            <Badge label={task.category} color="var(--status-slate)" />
            <Badge
              label={task.status.replace("_", " ")}
              color={STATUS_COLORS[task.status]}
            />
          </div>
          <h3
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {task.title}
          </h3>
          {task.description && (
            <p
              style={{
                margin: "0 0 0.5rem",
                fontSize: "0.82rem",
                color: "var(--color-text-muted)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {task.description}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
            }}
          >
            {task.assignedToName && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <User size={12} />
                {task.assignedToName}
              </span>
            )}
            {task.dueDate && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  color: isOverdue ? "var(--color-error)" : undefined,
                }}
              >
                <CalendarDays size={12} />
                {task.dueDate}
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
          >
            <button
              onClick={onEdit}
              style={{
                padding: "0.35rem",
                background: "rgba(34,211,238,0.1)",
                border: "1px solid rgba(34,211,238,0.2)",
                borderRadius: 6,
                cursor: "pointer",
                color: "var(--color-brand-primary)",
              }}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              style={{
                padding: "0.35rem",
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 6,
                cursor: "pointer",
                color: "var(--color-error)",
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      {/* Quick status change */}
      <div
        style={{
          marginTop: "0.75rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <select
          value={task.status}
          onChange={(e) =>
            updateStatus.mutate(
              { id: task.id, status: e.target.value },
              { onError: (err) => toast.error(err.message) },
            )
          }
          style={{
            padding: "0.35rem 0.65rem",
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            color: "var(--color-text-muted)",
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          {["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const session = useSession();
  const isAdmin = session.data?.role === "ADMIN";
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [modal, setModal] = useState<"create" | Task | null>(null);
  const [delTarget, setDelTarget] = useState<Task | null>(null);
  const del = useDeleteTask();

  const list = useTaskList(status, search, priority);
  const stats = useTaskStats();
  const s = stats.data;

  const STATUS_TABS = [
    { value: "", label: "All" },
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "DONE", label: "Done" },
  ];

  return (
    <PortalLayout>
      <style>{`@keyframes skeletonPulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {modal && (
        <TaskModal
          editing={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirmation */}
      {delTarget && (
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
              maxWidth: 400,
            }}
          >
            <h3
              style={{
                margin: "0 0 0.75rem",
                color: "var(--color-text-primary)",
              }}
            >
              Delete Task
            </h3>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: "var(--color-text-muted)",
                fontSize: "0.9rem",
              }}
            >
              Delete{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                {delTarget.title}
              </strong>
              ?
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setDelTarget(null)}
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
                  del.mutate(delTarget.id, {
                    onSuccess: () => {
                      toast.success("Task deleted");
                      setDelTarget(null);
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
                  fontSize: "0.88rem",
                  fontWeight: 600,
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
            Tasks
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "0.88rem",
            }}
          >
            Track and manage work assignments
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal("create")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.25rem",
              background: "linear-gradient(135deg,#22d3ee,#818cf8)",
              border: "none",
              borderRadius: 10,
              color: "#0f1117",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> Create Task
          </button>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          { label: "Active", value: s?.active, color: "var(--status-blue)" },
          {
            label: "Due Today",
            value: s?.dueToday,
            color: "var(--color-error)",
          },
          {
            label: "Completed This Week",
            value: s?.completedThisWeek,
            color: "var(--status-active)",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "1rem",
            }}
          >
            <p
              style={{
                margin: "0 0 0.4rem",
                fontSize: "0.78rem",
                color: "var(--color-text-muted)",
              }}
            >
              {label}
            </p>
            {stats.isLoading ? (
              <Skeleton h="1.8rem" w="40%" />
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color,
                  lineHeight: 1,
                }}
              >
                {value ?? 0}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: 8,
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              background:
                status === tab.value
                  ? "rgba(34,211,238,0.1)"
                  : "var(--color-surface)",
              border:
                status === tab.value
                  ? "1px solid rgba(34,211,238,0.3)"
                  : "1px solid var(--color-border)",
              color:
                status === tab.value
                  ? "var(--color-brand-primary)"
                  : "var(--color-text-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{
            marginLeft: "auto",
            padding: "0.45rem 0.85rem",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-text-muted)",
            fontSize: "0.85rem",
          }}
        >
          <option value="">All Priorities</option>
          {["HIGH", "MEDIUM", "LOW"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Task grid */}
      {list.isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: "1rem",
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "1.1rem",
                height: 140,
              }}
            >
              <Skeleton h="1rem" />
              <div style={{ height: 8 }} />
              <Skeleton h="1.5rem" w="80%" />
            </div>
          ))}
        </div>
      ) : list.isError ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--color-error)",
          }}
        >
          Failed to load tasks
        </div>
      ) : list.data?.items.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          <p style={{ fontSize: "2rem", margin: "0 0 0.75rem" }}>📋</p>
          <p
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              margin: "0 0 0.4rem",
              color: "var(--color-text-primary)",
            }}
          >
            No tasks found
          </p>
          <p style={{ fontSize: "0.88rem", margin: 0 }}>
            {status
              ? "Try a different filter"
              : "Create your first task to get started"}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: "1rem",
          }}
        >
          {list.data!.items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              onEdit={() => setModal(task)}
              onDelete={() => setDelTarget(task)}
            />
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
