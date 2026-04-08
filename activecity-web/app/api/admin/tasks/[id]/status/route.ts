import { NextRequest } from "next/server";
import { proxyPut } from "@/lib/api/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyPut(request, `/admin/tasks/${id}/status`);
}
