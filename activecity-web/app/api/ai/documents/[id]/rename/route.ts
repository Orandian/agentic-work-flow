import { NextRequest, NextResponse } from "next/server";
import { aiApiWithToken } from "@/lib/api/ai";
import axios from "axios";

function getToken(r: NextRequest) {
  return r.cookies.get("ac_token")?.value ?? null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getToken(request);
  if (!token)
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  const { id } = await params;
  const body = await request.json();
  try {
    const { data } = await aiApiWithToken(token).put(
      `/documents/${id}/rename`,
      body,
    );
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
