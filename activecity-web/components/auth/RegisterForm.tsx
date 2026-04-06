"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRegister } from "@/hooks/useAuth";
import type { RegisterPayload } from "@/types/auth";

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();

  const [form, setForm] = useState<RegisterPayload>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setValidationError("Password must be at least 8 characters.");
      return;
    }

    register.mutate(form, {
      onSuccess: (data) => {
        if (data.success) {
          router.push(`/verify-otp?email=${encodeURIComponent(form.email)}`);
        }
      },
    });
  };

  const errorMessage =
    validationError ||
    (register.error instanceof Error
      ? register.error.message
      : register.data && !register.data.success
        ? register.data.message
        : null);

  const inputStyle: React.CSSProperties = {
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
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--color-text-muted)",
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: "1.25rem",
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--color-brand-primary)";
    e.target.style.boxShadow = "0 0 0 3px rgba(203, 166, 247, 0.12)";
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--color-border)";
    e.target.style.boxShadow = "none";
  };

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
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background:
                "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ActiveCity
          </span>
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
          Create account
        </h1>
        <p
          style={{
            marginTop: "0.5rem",
            color: "var(--color-text-muted)",
            fontSize: "0.9rem",
          }}
        >
          Register for staff portal access
        </p>
      </div>

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

        {/* Full Name */}
        <div className="animate-fade-in-2" style={fieldStyle}>
          <label htmlFor="fullName" style={labelStyle}>
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={handleChange}
            placeholder="Jane Smith"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        {/* Email */}
        <div className="animate-fade-in-2" style={fieldStyle}>
          <label htmlFor="email" style={labelStyle}>
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@activecity.gov"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        {/* Password */}
        <div className="animate-fade-in-3" style={fieldStyle}>
          <label htmlFor="password" style={labelStyle}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 8 characters"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        {/* Confirm Password */}
        <div
          className="animate-fade-in-3"
          style={{ ...fieldStyle, marginBottom: "1.75rem" }}
        >
          <label htmlFor="confirmPassword" style={labelStyle}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Repeat your password"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        {/* Submit */}
        <div className="animate-fade-in-4">
          <button
            type="submit"
            disabled={register.isPending}
            style={{
              width: "100%",
              padding: "0.875rem 1.5rem",
              background: register.isPending
                ? "var(--color-surface-raised)"
                : "var(--color-brand-primary)",
              color: register.isPending ? "var(--color-text-muted)" : "#1e1e2e",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: register.isPending ? "not-allowed" : "pointer",
              transition:
                "transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => {
              if (!register.isPending) {
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
            {register.isPending ? "Creating account…" : "Create account"}
          </button>

          <p
            style={{
              textAlign: "center",
              marginTop: "1.25rem",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            Already have an account?{" "}
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
      </form>
    </div>
  );
}
