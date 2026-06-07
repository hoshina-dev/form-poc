import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_DURATION_MS } from "@/lib/auth/constants";
import type { AppRole } from "@/lib/auth/definitions";
import { decryptSession } from "@/lib/auth/sessionCrypto";

function homeForRole(role: AppRole): string {
  return role === "technician" ? "/experiments" : "/";
}

export default async function proxy(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = await decryptSession(session);
  const isAuthPage = req.nextUrl.pathname === "/login";

  if (isAuthPage && payload?.userId) {
    return NextResponse.redirect(
      new URL(homeForRole(payload.appRole), req.url),
    );
  }

  if (!isAuthPage && !payload?.userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (payload?.userId && session) {
    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + SESSION_DURATION_MS),
      sameSite: "lax",
      path: "/",
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
