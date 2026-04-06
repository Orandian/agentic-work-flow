import { NextRequest, NextResponse } from "next/server";

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", data: null },
      { status: 500 },
    );
  }
}
