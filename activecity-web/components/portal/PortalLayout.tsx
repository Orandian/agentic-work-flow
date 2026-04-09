"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLogout } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  MessageSquare,
} from "lucide-react";
import { Toaster } from "sonner";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/staff", label: "Staff", Icon: Users },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/documents", label: "Documents", Icon: FileText },
  { href: "/chat", label: "Chat AI", Icon: MessageSquare },
  { href: "/notices", label: "Notices", Icon: Bell },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function initials(text: string) {
  return (
    text
      .split(/[\s._-]/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "??"
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const session = useSession();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const email = session.data?.email ?? "";
  const role = session.data?.role ?? "";
  const name =
    session.data?.fullName?.trim() ||
    (email
      ? email
          .split("@")[0]
          .split(/[._-]/)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ")
      : "User");
  const av = initials(name);

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => router.push("/login") });
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-bg)",
      }}
    >
      <Toaster richColors position="bottom-right" />

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: collapsed ? 64 : 240,
          flexShrink: 0,
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          overflow: "hidden",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "1rem",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            minHeight: 64,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 10,
              background: "linear-gradient(135deg,#22d3ee,#818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={18} color="#0f1117" />
          </div>
          {!collapsed && (
            <span
              style={{
                fontWeight: 800,
                fontSize: "0.95rem",
                color: "var(--color-text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              ActiveCity
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0.75rem 0", overflowY: "auto" }}>
          {NAV.map(({ href, label, Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.65rem 1rem",
                  margin: "0.1rem 0.5rem",
                  borderRadius: 8,
                  cursor: "pointer",
                  width: "calc(100% - 1rem)",
                  background: active ? "rgba(34,211,238,0.1)" : "transparent",
                  color: active
                    ? "var(--color-brand-primary)"
                    : "var(--color-text-muted)",
                  border: active
                    ? "1px solid rgba(34,211,238,0.2)"
                    : "1px solid transparent",
                  fontSize: "0.88rem",
                  fontWeight: active ? 600 : 400,
                  textAlign: "left",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          style={{
            margin: "0.75rem",
            padding: "0.5rem",
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <header
          style={{
            height: 64,
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.5rem",
            flexShrink: 0,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.78rem",
                color: "var(--color-text-muted)",
              }}
            >
              {typeof window !== "undefined"
                ? new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </p>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            {role && (
              <span
                style={{
                  padding: "0.2rem 0.65rem",
                  borderRadius: 999,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background:
                    role === "ADMIN"
                      ? "rgba(167,139,250,0.15)"
                      : "rgba(34,211,238,0.1)",
                  color:
                    role === "ADMIN"
                      ? "var(--status-purple)"
                      : "var(--color-brand-primary)",
                }}
              >
                {role}
              </span>
            )}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#22d3ee,#818cf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#0f1117",
              }}
            >
              {session.isLoading ? "…" : av}
            </div>
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-primary)",
                fontWeight: 500,
              }}
            >
              {name}
            </span>
            <button
              onClick={handleLogout}
              disabled={logout.isPending}
              style={{
                padding: "0.4rem 0.9rem",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-text-muted)",
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <LogOut size={14} />
              {logout.isPending ? "…" : "Sign out"}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
