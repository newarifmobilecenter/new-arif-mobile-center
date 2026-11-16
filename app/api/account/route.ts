import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, createSession, getSession } from "@/lib/auth";
import { authenticate, listUsers, updateUser } from "@/lib/users";

/** Har user apna username / password khud badal sakta hai (purana password dena zaroori). */
export async function PATCH(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const { currentPassword, newUsername, newPassword } = await req.json();
    if (!await authenticate(s.u, String(currentPassword || ""))) return NextResponse.json({ error: "Purana password galat hai." }, { status: 400 });
    const me = (await listUsers()).find((u) => u.username === s.u);
    if (!me) return NextResponse.json({ error: "User nahi mila." }, { status: 404 });
    const nu = String(newUsername || "").trim(), np = String(newPassword || "").trim();
    if (!nu && !np) return NextResponse.json({ error: "Naya username ya naya password likhein." }, { status: 400 });
    const r = await updateUser(me.id, { username: nu && nu !== s.u ? nu : undefined, password: np || undefined });
    const res = NextResponse.json({ ok: true, username: r.username });
    res.cookies.set(AUTH_COOKIE, await createSession(r.username, r.role, r.perms), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
    return res;
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Save nahi hua." }, { status: 400 }); }
}
