/**
 * GET  /api/ai/documents   — list all documents
 * POST /api/ai/documents   — upload a document (multipart/form-data)
 *
 * Both endpoints proxy to the FastAPI AI Search service at /documents and
 * /documents/upload. The HttpOnly `ac_token` cookie is forwarded as a Bearer
 * token so the AI service can authenticate the request.
 */
import { NextRequest, NextResponse } from "next/server";
import { aiApiWithToken } from "@/lib/api/ai";
import type { DocumentListResponse, DocumentOut } from "@/types/ai";

function getToken(request: NextRequest): string | null {
  return request.cookies.get("ac_token")?.value ?? null;
}

// ── GET /api/ai/documents ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  try {
    const api = aiApiWithToken(token);
    const { data } = await api.get<DocumentListResponse>("/documents");
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    const status =
      (err as { response?: { status?: number } })?.response?.status ?? 500;
    const message =
      (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail ?? "Failed to fetch documents";
    return NextResponse.json({ success: false, message }, { status });
  }
}

// ── POST /api/ai/documents ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  try {
    // Forward the raw multipart body directly to the AI service
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 },
      );
    }

    // Re-build a FormData for the upstream request
    const upstream = new FormData();
    upstream.append("file", file, file.name);

    const AI_BASE_URL = process.env.AI_BASE_URL ?? "http://localhost:8000";
    const response = await fetch(`${AI_BASE_URL}/documents/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: upstream,
    });

    const json = (await response.json()) as DocumentOut;

    if (!response.ok) {
      const detail =
        (json as unknown as { detail?: string })?.detail ?? "Upload failed";
      return NextResponse.json(
        { success: false, message: detail },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, data: json }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/ai/documents]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
