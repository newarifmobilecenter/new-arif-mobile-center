import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, createSession } from "@/lib/auth";
import { authenticate, envUsers } from "@/lib/users";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if ((process.env.AUTH_SECRET || "").trim().length < 32) {
      return NextResponse.json({ error: "Login is not set up on this deployment: AUTH_SECRET is missing or shorter than 32 characters in the Vercel Environment Variables, then Redeploy." }, { status: 500 });
    }
    const user = await authenticate(String(username || ""), String(password || ""));
    if (!user) {
      if (envUsers().length === 0) return NextResponse.json({ error: "Login is not set up on this deployment: ADMIN_USERNAME and ADMIN_PASSWORD are missing in the Vercel Environment Variables (enable Production and Preview), then Redeploy." }, { status: 500 });
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(AUTH_COOKIE, await createSession(user.username, user.role, user.perms), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
