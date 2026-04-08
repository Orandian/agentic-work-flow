/**
 * POST /api/ai/search
 *
 * Proxies to the FastAPI AI Search service POST /search.
 * Requires STAFF or ADMIN role (enforced by the AI service).
 *
 * Request body: { query: string; top_k?: number }
 * Response:     { answer: string; sources: SourceDocument[]; query: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { aiApiWithToken } from "@/lib/api/ai";
import type { SearchRequest, SearchResponse } from "@/types/ai";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ac_token")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as SearchRequest;

    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Query is required" },
        { status: 400 },
      );
    }

    const api = aiApiWithToken(token);
    const { data } = await api.post<SearchResponse>("/search", {
      query: body.query.trim(),
      top_k: body.top_k ?? 5,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    const status =
      (err as { response?: { status?: number } })?.response?.status ?? 500;
    const message =
      (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail ?? "Search failed";
    return NextResponse.json({ success: false, message }, { status });
  }
}
