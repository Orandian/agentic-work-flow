import { Suspense } from "react";
import { VerifyOtpForm } from "@/components/auth/VerifyOtpForm";

function VerifyOtpFallback() {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "16px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "240px",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          border: "3px solid var(--color-border)",
          borderTopColor: "var(--color-brand-primary)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .spin { animation: none; }
        }
      `}</style>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <Suspense fallback={<VerifyOtpFallback />}>
        <VerifyOtpForm />
      </Suspense>
    </main>
  );
}
