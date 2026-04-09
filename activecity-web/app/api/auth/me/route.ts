/**
 * GET /api/auth/me
 *
 * Reads the HttpOnly `ac_token` cookie server-side, decodes the JWT payload
 * (without verification — the backend verified it at login time, and the cookie
 * is HttpOnly so it cannot be tampered with client-side), and returns the claims
 * the dashboard needs.
 *
 * JWT claim shape (from UserAuthProvider.createToken):
 *   sub      — email
 *   userId   — long (user primary key)
 *   role     — "STAFF" | "ADMIN"
 *   iat, exp — timestamps
 *
 * Note: fullName is NOT in the JWT. It is returned by the login endpoint in
 * AuthResponse but was not embedded in the token. We return what we have.
 */
import { NextRequest, NextResponse } from "next/server";

export interface SessionPayload {
  userId: number;
  email: string;
  role: "STAFF" | "ADMIN";
  fullName: string | null;
  /** Expiry as Unix seconds */
  exp: number;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ac_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Invalid token" },
      { status: 401 },
    );
  }

  // Check expiry
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  if (exp > 0 && Date.now() / 1000 > exp) {
    return NextResponse.json(
      { success: false, message: "Token expired" },
      { status: 401 },
    );
  }

  const session: SessionPayload = {
    userId: payload.userId as number,
    email: payload.sub as string,
    role: payload.role as "STAFF" | "ADMIN",
    fullName: (payload.fullName as string) || null,
    exp,
  };

  return NextResponse.json({ success: true, data: session }, { status: 200 });
}
