import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/lib/auth";
import { apiAllowed, pageAllowed } from "@/lib/perms";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/health" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) return NextResponse.next();

  const session = await verifySession(req.cookies.get(AUTH_COOKIE)?.value);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/api/")) {
    if (!apiAllowed(session, pathname, req.method)) return NextResponse.json({ error: "Is kaam ki ijazat nahi hai. Admin se access maangein." }, { status: 403 });
  } else if (!pageAllowed(session, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "?blocked=1";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)"],
};
