import { NextRequest, NextResponse } from "next/server";
import { springApiWithToken } from "@/lib/api/axios";

function getToken(request: NextRequest) {
  return request.cookies.get("ac_token")?.value ?? null;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token)
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );

  const url = new URL(request.url);
  const path = url.searchParams.get("_path") ?? "stats";

  try {
    const api = springApiWithToken(token);
    const { data } = await api.get(`/admin/dashboard/${path}`);
    return NextResponse.json({ success: true, data: data.data });
  } catch (err: unknown) {
    const e = err as {
      response?: { status?: number; data?: { message?: string } };
    };
    return NextResponse.json(
      {
        success: false,
        message: e.response?.data?.message ?? "Request failed",
      },
      { status: e.response?.status ?? 500 },
    );
  }
}
