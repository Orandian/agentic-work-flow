/**
 * DELETE /api/ai/documents/[id]
 *
 * Proxies to the FastAPI AI Search service DELETE /documents/{doc_id}.
 * Requires ADMIN role (enforced by the AI service).
 */
import { NextRequest, NextResponse } from "next/server";
import { aiApiWithToken } from "@/lib/api/ai";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get("ac_token")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const docId = Number(id);
  if (isNaN(docId)) {
    return NextResponse.json(
      { success: false, message: "Invalid document id" },
      { status: 400 },
    );
  }

  try {
    const api = aiApiWithToken(token);
    await api.delete(`/documents/${docId}`);
    // FastAPI returns 204 No Content on success
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const status =
      (err as { response?: { status?: number } })?.response?.status ?? 500;
    const message =
      (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail ?? "Failed to delete document";
    return NextResponse.json({ success: false, message }, { status });
  }
}
