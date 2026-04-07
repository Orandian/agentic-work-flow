import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "ac_token";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
];

const PROTECTED_PATTERNS = [
  /^\/dashboard(\/.*)?$/,
  /^\/admin(\/.*)?$/,
  /^\/user(\/.*)?$/,
];

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API routes and static assets through
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow public auth pages through
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token || isTokenExpired(token)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
