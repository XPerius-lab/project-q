import { NextResponse, type NextRequest } from "next/server";

// This middleware only does a cheap "is there a session cookie at all" check.
// The REAL role check (ADMIN vs OWNER vs CUSTOMER, isBanned) happens server-side
// in each route group's layout via requireRole() — because D1 is only reachable
// with a request-bound env binding, not from middleware's lighter runtime.
// This two-layer approach avoids letting unauthenticated requests render any
// admin/owner UI at all, while keeping the real authorization logic in one place.

const PROTECTED_PREFIXES = ["/admin", "/owner", "/hesabim"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const sessionCookie = request.cookies.get("better-auth.session_token");
  if (!sessionCookie) {
    const loginUrl = new URL("/giris", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/hesabim/:path*"],
};
