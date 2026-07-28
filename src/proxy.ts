/**
 * The door. Nothing renders without a valid session cookie.
 *
 * Next.js 16 renamed Middleware to Proxy; it runs on the Node.js runtime, which
 * is why src/lib/auth.ts can use node:crypto here.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const LOGIN = "/login";

export function proxy(request: NextRequest) {
  const signedIn = Boolean(verifySession(request.cookies.get(SESSION_COOKIE)?.value));
  const atLogin = request.nextUrl.pathname === LOGIN;

  if (!signedIn && !atLogin) {
    return NextResponse.redirect(new URL(LOGIN, request.url));
  }
  if (signedIn && atLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  /*
    Everything except the auth endpoints (which have to be reachable while
    signed out) and static assets. Matching those would redirect the login
    page's own JS and leave it blank.
  */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
