"use client";

import PortalLayout from "@/components/portal/PortalLayout";
import {
  useStaffList,
  useStaffStats,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
} from "@/hooks/useStaff";
import { useSession } from "@/hooks/useSession";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, X, Loader2 } from "lucide-react";
import type {
  StaffMember,
  CreateStaffPayload,
  UpdateStaffPayload,
} from "@/types/portal";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  department: z.string().min(1, "Department required"),
  position: z.string().min(1, "Position required"),
  password: z.string().min(8, "Min 8 characters"),
  userType: z.enum(["STAFF", "ADMIN"]),
});

const editSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  position: z.string().min(1),
  password: z.string().optional(),
  userType: z.enum(["STAFF", "ADMIN"]),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

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

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
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
      {children}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const chars = name
    .split(/[\s._-]/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: `hsl(${hue},60%,40%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {chars || "??"}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function StaffModal({
  editing,
  onClose,
}: {
  editing: StaffMember | null;
  onClose: () => void;
}) {
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();

  const isEdit = editing !== null;

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { userType: "STAFF" },
  });
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          department: editing.department,
          position: editing.position,
          userType: editing.userType as "STAFF" | "ADMIN",
          password: "",
        }
      : {},
  });

  const form = isEdit ? editForm : createForm;
  const pending = isEdit ? updateStaff.isPending : createStaff.isPending;

  const onSubmit = isEdit
    ? editForm.handleSubmit((values: EditForm) => {
        const payload: UpdateStaffPayload = {
          name: values.name,
          department: values.department,
          position: values.position,
          userType: values.userType,
          password: values.password || undefined,
        };
        updateStaff.mutate(
          { id: editing!.id, payload },
          {
            onSuccess: () => {
              toast.success("Staff member updated");
              onClose();
            },
            onError: (e) => toast.error(e.message),
          },
        );
      })
    : createForm.handleSubmit((values: CreateForm) => {
        createStaff.mutate(values as CreateStaffPayload, {
          onSuccess: () => {
            toast.success("Staff member created");
            onClose();
          },
          onError: (e) => toast.error(e.message),
        });
      });

  const fieldStyle = {
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
  const errorStyle = {
    color: "var(--color-error)",
    fontSize: "0.78rem",
    margin: "0.25rem 0 0",
  };
  const labelStyle = {
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
    fontWeight: 500,
    marginBottom: "0.35rem",
    display: "block" as const,
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
          maxWidth: 480,
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
            {isEdit ? "Edit Staff Member" : "Add Staff Member"}
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
          {!isEdit && (
            <div>
              <label style={labelStyle}>Email</label>
              <input
                {...createForm.register("email")}
                style={fieldStyle}
                placeholder="email@example.com"
              />
              {createForm.formState.errors.email && (
                <p style={errorStyle}>
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              {...form.register("name")}
              style={fieldStyle}
              placeholder="John Doe"
            />
            {form.formState.errors.name && (
              <p style={errorStyle}>
                {(form.formState.errors.name as { message?: string }).message}
              </p>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <label style={labelStyle}>Department</label>
              <input
                {...form.register("department")}
                style={fieldStyle}
                placeholder="IT, HR…"
              />
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <input
                {...form.register("position")}
                style={fieldStyle}
                placeholder="Manager…"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Password{" "}
              {isEdit && (
                <span style={{ opacity: 0.6 }}>(leave blank to keep)</span>
              )}
            </label>
            <input
              {...form.register("password")}
              type="password"
              style={fieldStyle}
              placeholder="Min 8 characters"
            />
            {!isEdit && createForm.formState.errors.password && (
              <p style={errorStyle}>
                {createForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Role</label>
            <select {...form.register("userType")} style={fieldStyle}>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
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

// ── Delete confirmation ───────────────────────────────────────────────────────

function ConfirmDelete({
  staff,
  onClose,
}: {
  staff: StaffMember;
  onClose: () => void;
}) {
  const del = useDeleteStaff();
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
          maxWidth: 400,
        }}
      >
        <h3
          style={{ margin: "0 0 0.75rem", color: "var(--color-text-primary)" }}
        >
          Remove Staff Member
        </h3>
        <p
          style={{
            margin: "0 0 1.25rem",
            color: "var(--color-text-muted)",
            fontSize: "0.9rem",
          }}
        >
          Are you sure you want to remove{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>
            {staff.name}
          </strong>
          ? This action cannot be undone.
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
          }}
        >
          <button
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
            onClick={() =>
              del.mutate(staff.id, {
                onSuccess: () => {
                  toast.success("Staff member removed");
                  onClose();
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
            {del.isPending ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const session = useSession();
  const isAdmin = session.data?.role === "ADMIN";
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"create" | StaffMember | null>(null);
  const [delTarget, setDelTarget] = useState<StaffMember | null>(null);

  const list = useStaffList(search, dept, page);
  const stats = useStaffStats();

  const s = stats.data;
  const statCards = [
    {
      label: "Total Staff",
      value: s?.total,
      color: "var(--color-brand-primary)",
    },
    { label: "Active", value: s?.active, color: "var(--status-active)" },
    {
      label: "New This Month",
      value: s?.newThisMonth,
      color: "var(--status-yellow)",
    },
  ];

  return (
    <PortalLayout>
      <style>{`@keyframes skeletonPulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {modal && (
        <StaffModal
          editing={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
      {delTarget && (
        <ConfirmDelete staff={delTarget} onClose={() => setDelTarget(null)} />
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
            Staff
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "0.88rem",
            }}
          >
            Manage your organization&apos;s staff members
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
            <Plus size={16} /> Add Staff Member
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
        {statCards.map(({ label, value, color }) => (
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

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-muted)",
            }}
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email…"
            style={{
              width: "100%",
              paddingLeft: "2.25rem",
              padding: "0.65rem 0.9rem 0.65rem 2.25rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              fontSize: "0.88rem",
              outline: "none",
            }}
          />
        </div>
        <select
          value={dept}
          onChange={(e) => {
            setDept(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "0.65rem 0.9rem",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-text-primary)",
            fontSize: "0.88rem",
          }}
        >
          <option value="">All Departments</option>
          {["IT", "HR", "Finance", "Facilities", "Operations", "Legal"].map(
            (d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ),
          )}
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {[
                "Name",
                "Email",
                "Department",
                "Position",
                "Role",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <td key={j} style={{ padding: "0.85rem 1rem" }}>
                      <Skeleton h="1rem" />
                    </td>
                  ))}
                </tr>
              ))
            ) : list.isError ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--color-error)",
                  }}
                >
                  Failed to load staff
                </td>
              </tr>
            ) : list.data?.items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "2.5rem",
                    textAlign: "center",
                    color: "var(--color-text-muted)",
                  }}
                >
                  No staff members found
                </td>
              </tr>
            ) : (
              list.data?.items.map((m) => (
                <tr
                  key={m.id}
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                      }}
                    >
                      <Avatar name={m.name} />
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          fontSize: "0.88rem",
                        }}
                      >
                        {m.name}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "0.85rem 1rem",
                      color: "var(--color-text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {m.email}
                  </td>
                  <td
                    style={{
                      padding: "0.85rem 1rem",
                      color: "var(--color-text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {m.department || "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.85rem 1rem",
                      color: "var(--color-text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {m.position || "—"}
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <Badge
                      color={
                        m.userType === "ADMIN"
                          ? "var(--status-purple)"
                          : "var(--color-brand-primary)"
                      }
                    >
                      {m.userType}
                    </Badge>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <Badge
                      color={
                        m.status === 1
                          ? "var(--status-active)"
                          : "var(--color-error)"
                      }
                    >
                      {m.status === 1 ? "Active" : "Locked"}
                    </Badge>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    {isAdmin && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => setModal(m)}
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
                          onClick={() => setDelTarget(m)}
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {list.data && list.data.totalPages > 1 && (
          <div
            style={{
              padding: "0.75rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <span
              style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}
            >
              Page {page} of {list.data.totalPages} · {list.data.total} total
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "0.4rem 0.75rem",
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  color: "var(--color-text-muted)",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  fontSize: "0.82rem",
                }}
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(list.data!.totalPages, p + 1))
                }
                disabled={page >= list.data.totalPages}
                style={{
                  padding: "0.4rem 0.75rem",
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  color: "var(--color-text-muted)",
                  cursor:
                    page >= list.data.totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.82rem",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
