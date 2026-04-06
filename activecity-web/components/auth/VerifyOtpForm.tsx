"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVerifyOtp } from "@/hooks/useAuth";

export function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const verifyOtp = useVerifyOtp();

  const [otp, setOtp] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    verifyOtp.mutate(
      { email, otpCode: otp },
      {
        onSuccess: (data) => {
          if (data.success) {
            setSuccessMessage(data.message || "Email verified successfully!");
            setTimeout(() => {
              router.push("/login");
            }, 1500);
          }
        },
      },
    );
  };

  const errorMessage =
    verifyOtp.error instanceof Error
      ? verifyOtp.error.message
      : verifyOtp.data && !verifyOtp.data.success
        ? verifyOtp.data.message
        : null;

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
          ✉️
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
          Verify your email
        </h1>
        <p
          style={{
            marginTop: "0.5rem",
            color: "var(--color-text-muted)",
            fontSize: "0.9rem",
          }}
        >
          {email
            ? `We sent a code to ${email}`
            : "Enter the verification code from your email"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Success message */}
        {successMessage && (
          <div
            className="animate-fade-in-1"
            style={{
              background: "rgba(166, 227, 161, 0.12)",
              border: "1px solid rgba(166, 227, 161, 0.3)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "var(--color-success)",
              fontSize: "0.875rem",
            }}
          >
            {successMessage} Redirecting to login…
          </div>
        )}

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

        {/* OTP input */}
        <div className="animate-fade-in-2" style={{ marginBottom: "1.75rem" }}>
          <label
            htmlFor="otp"
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--color-text-muted)",
            }}
          >
            Verification code
          </label>
          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            maxLength={6}
            style={{
              width: "100%",
              padding: "0.875rem 1rem",
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "0.35em",
              outline: "none",
              textAlign: "center",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              fontFamily: "var(--font-body)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-brand-primary)";
              e.target.style.boxShadow = "0 0 0 3px rgba(203, 166, 247, 0.12)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-border)";
              e.target.style.boxShadow = "none";
            }}
          />
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
            }}
          >
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </div>

        {/* Submit */}
        <div className="animate-fade-in-3">
          <button
            type="submit"
            disabled={verifyOtp.isPending || otp.length < 6}
            style={{
              width: "100%",
              padding: "0.875rem 1.5rem",
              background:
                verifyOtp.isPending || otp.length < 6
                  ? "var(--color-surface-raised)"
                  : "var(--color-brand-primary)",
              color:
                verifyOtp.isPending || otp.length < 6
                  ? "var(--color-text-muted)"
                  : "#1e1e2e",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor:
                verifyOtp.isPending || otp.length < 6
                  ? "not-allowed"
                  : "pointer",
              transition:
                "transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => {
              if (!verifyOtp.isPending && otp.length >= 4) {
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
            {verifyOtp.isPending ? "Verifying…" : "Verify email"}
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
    </div>
  );
}
