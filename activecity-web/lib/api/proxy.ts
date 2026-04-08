/**
 * Shared proxy helper for Next.js Route Handlers → Spring Boot.
 * Reads the HttpOnly `ac_token` cookie and forwards the request.
 */
import { NextRequest, NextResponse } from "next/server";
import { springApiWithToken } from "@/lib/api/axios";
import axios from "axios";

export function getToken(request: NextRequest): string | null {
  return request.cookies.get("ac_token")?.value ?? null;
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, message: "Not authenticated" },
    { status: 401 },
  );
}

export async function proxyGet(
  request: NextRequest,
  path: string,
  params?: Record<string, string>,
) {
  const token = getToken(request);
  if (!token) return unauthorized();
  try {
    const api = springApiWithToken(token);
    const { data } = await api.get(path, { params });
    return NextResponse.json({ success: true, data: data.data });
  } catch (err) {
    return handleError(err);
  }
}

export async function proxyPost(
  request: NextRequest,
  path: string,
  body?: unknown,
) {
  const token = getToken(request);
  if (!token) return unauthorized();
  try {
    const api = springApiWithToken(token);
    const payload = body ?? ((await request.json()) as unknown);
    const { data } = await api.post(path, payload);
    return NextResponse.json({ success: true, data: data.data });
  } catch (err) {
    return handleError(err);
  }
}

export async function proxyPut(
  request: NextRequest,
  path: string,
  body?: unknown,
) {
  const token = getToken(request);
  if (!token) return unauthorized();
  try {
    const api = springApiWithToken(token);
    const payload = body ?? ((await request.json()) as unknown);
    const { data } = await api.put(path, payload);
    return NextResponse.json({ success: true, data: data.data });
  } catch (err) {
    return handleError(err);
  }
}

export async function proxyDelete(request: NextRequest, path: string) {
  const token = getToken(request);
  if (!token) return unauthorized();
  try {
    const api = springApiWithToken(token);
    const { data } = await api.delete(path);
    return NextResponse.json({ success: true, data: data.data ?? null });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 500;
    const message =
      (err.response?.data as { message?: string })?.message ?? "Request failed";
    return NextResponse.json({ success: false, message }, { status });
  }
  return NextResponse.json(
    { success: false, message: "Internal server error" },
    { status: 500 },
  );
}
