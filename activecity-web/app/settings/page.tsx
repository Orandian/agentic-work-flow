"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Settings,
  User,
  Shield,
  Info,
  Save,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import {
  useProfile,
  useUpdateProfile,
  useChangePassword,
} from "@/hooks/useProfile";

// ── Schemas ────────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().optional(),
  position: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ── Shared input styles ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.85rem",
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
  letterSpacing: "0.03em",
};

const fieldError = (msg?: string) =>
  msg ? (
    <p
      style={{
        fontSize: "0.75rem",
        color: "var(--status-red)",
        marginTop: "0.25rem",
        marginBottom: 0,
      }}
    >
      {msg}
    </p>
  ) : null;

// ── Profile Tab ────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", department: "", position: "" },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name ?? "",
        department: profile.department ?? "",
        position: profile.position ?? "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: ProfileForm) => {
    try {
      await update.mutateAsync(values);
      toast.success("Profile updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 56,
              borderRadius: 8,
              background: "var(--color-surface-raised)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      {/* Read-only info */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(34,211,238,0.05)",
          border: "1px solid rgba(34,211,238,0.15)",
          borderRadius: 10,
        }}
      >
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <p
              style={{
                margin: "0 0 0.2rem",
                fontSize: "0.72rem",
                color: "var(--color-text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Email
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                color: "var(--color-text-primary)",
              }}
            >
              {profile?.email ?? "—"}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: "0 0 0.2rem",
                fontSize: "0.72rem",
                color: "var(--color-text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Role
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                color: "var(--color-text-primary)",
              }}
            >
              {profile?.userType ?? "—"}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: "0 0 0.2rem",
                fontSize: "0.72rem",
                color: "var(--color-text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Member since
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                color: "var(--color-text-primary)",
              }}
            >
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Display Name</label>
        <input
          {...register("name")}
          placeholder="Your full name"
          style={inputStyle}
        />
        {fieldError(errors.name?.message)}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
      >
        <div>
          <label style={labelStyle}>Department</label>
          <input
            {...register("department")}
            placeholder="e.g. IT, HR, Finance"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Position</label>
          <input
            {...register("position")}
            placeholder="e.g. Senior Developer"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.4rem",
            background: isDirty
              ? "linear-gradient(135deg,#22d3ee,#818cf8)"
              : "var(--color-surface-raised)",
            border: "none",
            borderRadius: 8,
            color: isDirty ? "#0f1117" : "var(--color-text-muted)",
            fontSize: "0.88rem",
            fontWeight: 700,
            cursor: isDirty ? "pointer" : "not-allowed",
            opacity: isSubmitting ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          <Save size={15} />
          {isSubmitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Security Tab ───────────────────────────────────────────────────────────────

function SecurityTab() {
  const changePassword = useChangePassword();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (values: PasswordForm) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password changed successfully");
      reset();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    }
  };

  const PasswordInput = ({
    id,
    placeholder,
    show,
    onToggle,
    registration,
    error,
  }: {
    id: string;
    placeholder: string;
    show: boolean;
    onToggle: () => void;
    registration: ReturnType<typeof register>;
    error?: string;
  }) => (
    <div>
      <div style={{ position: "relative" }}>
        <input
          {...registration}
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: "2.5rem" }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            padding: 0,
          }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {fieldError(error)}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div
        style={{
          padding: "1rem",
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.15)",
          borderRadius: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.83rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.6,
          }}
        >
          Choose a strong password that is at least 8 characters and includes a
          mix of letters, numbers, and symbols.
        </p>
      </div>

      <div>
        <label style={labelStyle} htmlFor="currentPassword">
          Current Password
        </label>
        <PasswordInput
          id="currentPassword"
          placeholder="Enter current password"
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          registration={register("currentPassword")}
          error={errors.currentPassword?.message}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="newPassword">
          New Password
        </label>
        <PasswordInput
          id="newPassword"
          placeholder="Enter new password (min 8 chars)"
          show={showNew}
          onToggle={() => setShowNew((v) => !v)}
          registration={register("newPassword")}
          error={errors.newPassword?.message}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="confirmPassword">
          Confirm New Password
        </label>
        <PasswordInput
          id="confirmPassword"
          placeholder="Re-enter new password"
          show={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
          registration={register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.4rem",
            background: "linear-gradient(135deg,#22d3ee,#818cf8)",
            border: "none",
            borderRadius: 8,
            color: "#0f1117",
            fontSize: "0.88rem",
            fontWeight: 700,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          <Shield size={15} />
          {isSubmitting ? "Updating…" : "Change Password"}
        </button>
      </div>
    </form>
  );
}

// ── About Tab ──────────────────────────────────────────────────────────────────

function AboutTab() {
  const rows = [
    { label: "Application", value: "ActiveCity Staff Portal" },
    { label: "Version", value: "1.0.0" },
    { label: "Environment", value: process.env.NODE_ENV ?? "production" },
    { label: "Frontend", value: "Next.js 16 · React 19 · TypeScript 6" },
    { label: "Backend", value: "Spring Boot 3.5 · Java 21 · MyBatis 3" },
    { label: "Database", value: "PostgreSQL 15" },
    { label: "Auth", value: "BCrypt + HMAC256 JWT · HttpOnly cookie" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Logo card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1.5rem",
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "linear-gradient(135deg,#22d3ee,#818cf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Zap size={24} color="#0f1117" />
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 800,
              color: "var(--color-text-primary)",
            }}
          >
            ActiveCity
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
            }}
          >
            Internal Staff Management Portal
          </p>
        </div>
      </div>

      {/* Info table */}
      <div
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {rows.map(({ label, value }, i) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.85rem 1.25rem",
              borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
            }}
          >
            <span
              style={{
                fontSize: "0.83rem",
                color: "var(--color-text-muted)",
                fontWeight: 600,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: "0.83rem",
                color: "var(--color-text-primary)",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "0.78rem",
          color: "var(--color-text-muted)",
          textAlign: "center",
        }}
      >
        &copy; {new Date().getFullYear()} ActiveCity. All rights reserved.
      </p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "security", label: "Security", Icon: Shield },
  { id: "about", label: "About", Icon: Info },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <PortalLayout>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "rgba(129,140,248,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Settings size={20} color="var(--color-brand-secondary)" />
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
              Settings
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--color-text-muted)",
              }}
            >
              Manage your account preferences
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "0.35rem",
            marginBottom: "2rem",
          }}
        >
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.6rem 1rem",
                background:
                  activeTab === id ? "var(--color-bg)" : "transparent",
                border:
                  activeTab === id
                    ? "1px solid var(--color-border)"
                    : "1px solid transparent",
                borderRadius: 9,
                color:
                  activeTab === id
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
                fontSize: "0.88rem",
                fontWeight: activeTab === id ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            padding: "1.75rem",
          }}
        >
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "about" && <AboutTab />}
        </div>
      </div>
    </PortalLayout>
  );
}
