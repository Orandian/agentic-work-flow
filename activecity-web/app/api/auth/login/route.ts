import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "ac_token";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(request: NextRequest) {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json(
      { success: false, message: "API_BASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(`${apiBase}/pub/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data?.data?.token) {
      return NextResponse.json(data, { status: response.status });
    }

    // Store JWT in HttpOnly cookie — never expose it to client JS
    const res = NextResponse.json(
      { success: true, message: data.message, data: null },
      { status: 200 },
    );

    res.cookies.set(AUTH_COOKIE, data.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", data: null },
      { status: 500 },
    );
  }
}
