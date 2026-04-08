import { NextRequest } from "next/server";
import { proxyGet, proxyPut, proxyDelete } from "@/lib/api/proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyGet(request, `/admin/notices/${id}`);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyPut(request, `/admin/notices/${id}`);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyDelete(request, `/admin/notices/${id}`);
}
