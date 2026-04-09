import { NextRequest, NextResponse } from "next/server";
import { aiApiWithToken } from "@/lib/api/ai";

function getToken(r: NextRequest) {
  return r.cookies.get("ac_token")?.value ?? null;
}
function unauth() {
  return NextResponse.json(
    { success: false, message: "Not authenticated" },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) return unauth();
  const { data } = await aiApiWithToken(token).get("/folders");
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) return unauth();
  const body = await request.json();
  const { data } = await aiApiWithToken(token).post("/folders", body);
  return NextResponse.json({ success: true, data }, { status: 201 });
}
