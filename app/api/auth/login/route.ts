import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, createSession } from "@/lib/auth";

function users() {
  // Trim so a trailing space/newline pasted into Vercel does not make the login fail.
  const adminUser = (process.env.ADMIN_USERNAME || "").trim();
  const adminPass = (process.env.ADMIN_PASSWORD || "").trim();
  const list: { username: string; password: string; role: "ADMIN" | "STAFF" }[] = [];
  if (adminUser && adminPass) list.push({ username: adminUser, password: adminPass, role: "ADMIN" });

  try {
    const staff = JSON.parse(process.env.STAFF_USERS_JSON || "[]");
    if (Array.isArray(staff)) {
      for (const u of staff) {
        if (u?.username && u?.password) list.push({
          username: String(u.username).trim(),
          password: String(u.password).trim(),
          role: "STAFF"
        });
      }
    }
  } catch {}
  return list;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const configured = users();
    // Say clearly when the server itself is not set up, instead of "Invalid username or password".
    if (configured.length === 0) {
      return NextResponse.json({ error: "Login is not set up on this deployment: ADMIN_USERNAME and ADMIN_PASSWORD are missing in the Vercel Environment Variables (enable Production and Preview), then Redeploy." }, { status: 503 });
    }
    if ((process.env.AUTH_SECRET || "").trim().length < 32) {
      return NextResponse.json({ error: "Login is not set up on this deployment: AUTH_SECRET is missing or shorter than 32 characters in the Vercel Environment Variables, then Redeploy." }, { status: 503 });
    }
    const user = configured.find(u => u.username === String(username || "").trim() && u.password === String(password || "").trim());
    if (!user) return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });

    const res = NextResponse.json({ ok: true, role: user.role });
res.cookies.set(
  AUTH_COOKIE,
  await createSession(user.username, user.role),
  {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
