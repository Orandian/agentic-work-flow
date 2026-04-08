"use client";

/**
 * useSession
 *
 * Calls GET /api/auth/me — the Next.js Route Handler that reads the HttpOnly
 * `ac_token` cookie server-side, decodes the JWT payload, and returns the
 * claims the dashboard needs: { userId, email, role, exp }.
 *
 * The JWT does not embed fullName (only sub/email, userId, role, iat, exp),
 * so we derive a display name from the email as a fallback.
 */
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface SessionPayload {
  userId: number;
  email: string;
  role: "STAFF" | "ADMIN";
  exp: number;
}

interface MeResponse {
  success: boolean;
  data: SessionPayload;
  message?: string;
}

async function fetchSession(): Promise<SessionPayload> {
  const { data } = await axios.get<MeResponse>("/api/auth/me");
  if (!data.success) throw new Error(data.message ?? "Not authenticated");
  return data.data;
}

/**
 * Returns the decoded JWT session from the server-side cookie.
 *
 * States:
 *   isLoading — fetching session from /api/auth/me
 *   isError   — not authenticated or token expired
 *   data      — { userId, email, role, exp }
 */
export function useSession() {
  return useQuery<SessionPayload, Error>({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000, // 5 minutes — don't re-fetch on every render
    retry: false, // Don't retry 401s
  });
}

/**
 * Derives a display name from the email address when fullName is unavailable.
 * e.g. "john.doe@example.com" → "John Doe"
 */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Returns a time-of-day greeting string.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
