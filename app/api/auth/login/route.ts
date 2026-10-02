import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, createSession } from "@/lib/auth";

function users() {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  const list: { username: string; password: string; role: "ADMIN" | "STAFF" }[] = [];
  if (adminUser && adminPass) list.push({ username: adminUser, password: adminPass, role: "ADMIN" });

  try {
    const staff = JSON.parse(process.env.STAFF_USERS_JSON || "[]");
    if (Array.isArray(staff)) {
      for (const u of staff) {
        if (u?.username && u?.password) list.push({
          username: String(u.username),
          password: String(u.password),
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
    const user = users().find(u => u.username === String(username || "") && u.password === String(password || ""));
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
