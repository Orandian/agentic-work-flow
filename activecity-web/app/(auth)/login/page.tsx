import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
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
      <LoginForm />

      <div
        style={{
          marginTop: "2rem",
          display: "flex",
          gap: "1.5rem",
          fontSize: "0.8rem",
          color: "var(--color-text-muted)",
        }}
      >
        <Link
          href="/register"
          style={{
            color: "var(--color-text-muted)",
            textDecoration: "none",
            transition: "color 0.15s ease",
          }}
        >
          Create account
        </Link>
        <span aria-hidden>·</span>
        <Link
          href="/forgot-password"
          style={{
            color: "var(--color-text-muted)",
            textDecoration: "none",
            transition: "color 0.15s ease",
          }}
        >
          Forgot password
        </Link>
      </div>
    </main>
  );
}
