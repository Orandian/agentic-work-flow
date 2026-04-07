import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.set("ac_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return res;
}
