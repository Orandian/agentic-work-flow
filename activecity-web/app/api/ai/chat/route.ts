/**
 * POST /api/ai/chat
 * Proxies streaming SSE from FastAPI /chat/stream to the browser.
 */
import { NextRequest, NextResponse } from "next/server";

const AI_BASE_URL = process.env.AI_BASE_URL ?? "http://localhost:8000";

function getToken(request: NextRequest): string | null {
  return request.cookies.get("ac_token")?.value ?? null;
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await request.text();

  const upstream = await fetch(`${AI_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json(
      { success: false, message: err },
      { status: upstream.status },
    );
  }

  // Forward the SSE stream directly to the browser
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
