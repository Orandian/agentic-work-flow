import { NextRequest } from "next/server";
import { proxyGet, proxyPut } from "@/lib/api/proxy";

export async function GET(request: NextRequest) {
  return proxyGet(request, "/user/profile");
}

export async function PUT(request: NextRequest) {
  return proxyPut(request, "/user/profile");
}
