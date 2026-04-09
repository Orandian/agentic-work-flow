import { NextRequest, NextResponse } from "next/server";
import { aiApiWithToken } from "@/lib/api/ai";
import axios from "axios";

function getToken(r: NextRequest) {
  return r.cookies.get("ac_token")?.value ?? null;
}
function unauth() {
  return NextResponse.json(
    { success: false, message: "Not authenticated" },
    { status: 401 },
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getToken(request);
  if (!token) return unauth();
  const { id } = await params;
  const body = await request.json();
  try {
    const { data } = await aiApiWithToken(token).put(`/folders/${id}`, body);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (axios.isAxiosError(err))
      return NextResponse.json(
        { success: false, message: err.response?.data?.detail ?? "Failed" },
        { status: err.response?.status ?? 500 },
      );
    return NextResponse.json(
      { success: false, message: "Internal error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getToken(request);
  if (!token) return unauth();
  const { id } = await params;
  await aiApiWithToken(token).delete(`/folders/${id}`);
  return NextResponse.json({ success: true, data: null });
}
