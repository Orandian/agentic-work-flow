import { NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/api/proxy";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    params[k] = v;
  });
  return proxyGet(request, "/admin/notices", params);
}

export async function POST(request: NextRequest) {
  return proxyPost(request, "/admin/notices");
}
