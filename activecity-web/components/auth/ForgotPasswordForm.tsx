"use client";

import { useState } from "react";
import Link from "next/link";
import { useForgotPassword } from "@/hooks/useAuth";

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate({ email });
  };

  const errorMessage =
    forgotPassword.error instanceof Error
      ? forgotPassword.error.message
      : forgotPassword.data && !forgotPassword.data.success
        ? forgotPassword.data.message
        : null;

  const isSuccess =
    forgotPassword.isSuccess && forgotPassword.data?.success === true;

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "16px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Header */}
      <div className="animate-fade-in-1" style={{ marginBottom: "2rem" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background:
              "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            marginBottom: "1rem",
          }}
        >
          🔑
        </div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "var(--color-text-primary)",
            lineHeight: 1.2,
            margin: 0,
            fontFamily: "var(--font-display)",
          }}
        >
          Reset password
        </h1>
        <p
          style={{
            marginTop: "0.5rem",
            color: "var(--color-text-muted)",
            fontSize: "0.9rem",
          }}
        >
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {/* Success state */}
      {isSuccess ? (
        <div className="animate-fade-in-2">
          <div
            style={{
              background: "rgba(166, 227, 161, 0.12)",
              border: "1px solid rgba(166, 227, 161, 0.3)",
              borderRadius: "12px",
              padding: "1.25rem",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✅</div>
            <p
              style={{
                color: "var(--color-success)",
                fontWeight: 600,
                fontSize: "0.95rem",
                margin: 0,
              }}
            >
              Reset link sent!
            </p>
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "0.875rem",
                marginTop: "0.5rem",
              }}
            >
              Check your inbox at{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                {email}
              </strong>{" "}
              for a password reset link.
            </p>
          </div>

          <p
            style={{
              textAlign: "center",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            Remember your password?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--color-brand-primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Error message */}
          {errorMessage && (
            <div
              className="animate-fade-in-1"
              style={{
                background: "rgba(243, 139, 168, 0.12)",
                border: "1px solid rgba(243, 139, 168, 0.3)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                color: "var(--color-error)",
                fontSize: "0.875rem",
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Email field */}
          <div
            className="animate-fade-in-2"
            style={{ marginBottom: "1.75rem" }}
          >
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--color-text-muted)",
              }}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@activecity.gov"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text-primary)",
                fontSize: "0.95rem",
                outline: "none",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                fontFamily: "var(--font-body)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-brand-primary)";
                e.target.style.boxShadow =
                  "0 0 0 3px rgba(203, 166, 247, 0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--color-border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Submit */}
          <div className="animate-fade-in-3">
            <button
              type="submit"
              disabled={forgotPassword.isPending}
              style={{
                width: "100%",
                padding: "0.875rem 1.5rem",
                background: forgotPassword.isPending
                  ? "var(--color-surface-raised)"
                  : "var(--color-brand-primary)",
                color: forgotPassword.isPending
                  ? "var(--color-text-muted)"
                  : "#1e1e2e",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: forgotPassword.isPending ? "not-allowed" : "pointer",
                transition:
                  "transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease",
                fontFamily: "var(--font-body)",
              }}
              onMouseEnter={(e) => {
                if (!forgotPassword.isPending) {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(-2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 6px 20px rgba(203, 166, 247, 0.35)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {forgotPassword.isPending ? "Sending…" : "Send reset link"}
            </button>
          </div>

          <div
            className="animate-fade-in-4"
            style={{ marginTop: "1.25rem", textAlign: "center" }}
          >
            <Link
              href="/login"
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                textDecoration: "none",
              }}
            >
              Back to{" "}
              <span
                style={{ color: "var(--color-brand-primary)", fontWeight: 600 }}
              >
                sign in
              </span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
