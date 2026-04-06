import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
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
      <RegisterForm />

      <div
        style={{
          marginTop: "2rem",
          fontSize: "0.8rem",
          color: "var(--color-text-muted)",
        }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          style={{
            color: "var(--color-brand-primary)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
