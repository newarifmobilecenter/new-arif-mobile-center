import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, createSession, getSession, hasRole } from "@/lib/auth";
import { createStaff, deleteStaff, listUsers, updateUser } from "@/lib/users";

const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
async function admin() { const s = await getSession(); return hasRole(s, "ADMIN") ? s : null; }

export async function GET() {
  if (!await admin()) return fail("Admin access required.", 403);
  return NextResponse.json(await listUsers(), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: NextRequest) {
  if (!await admin()) return fail("Admin access required.", 403);
  try { const b = await req.json(); return NextResponse.json({ id: await createStaff(b.username, b.password, b.perms) }, { status: 201 }); }
  catch (e: any) { return fail(e?.message || "Save nahi hua."); }
}
export async function PATCH(req: NextRequest) {
  const s = await admin(); if (!s) return fail("Admin access required.", 403);
  try {
    const b = await req.json();
    const id = String(b.id || "");
    const before = (await listUsers()).find((x) => x.id === id);
    const r = await updateUser(id, { username: b.username, password: b.password, perms: b.perms, active: b.active }, s.u);
    const res = NextResponse.json({ ok: true, renamed: before?.username === s.u });
    // Admin ne apna hi naam/password badla: cookie naye naam ke saath dobara banayen.
    if (before?.username === s.u) res.cookies.set(AUTH_COOKIE, await createSession(r.username, r.role, r.perms), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
    return res;
  } catch (e: any) { return fail(e?.message || "Save nahi hua."); }
}
export async function DELETE(req: NextRequest) {
  if (!await admin()) return fail("Admin access required.", 403);
  try { await deleteStaff(req.nextUrl.searchParams.get("id") || ""); return NextResponse.json({ ok: true }); }
  catch (e: any) { return fail(e?.message || "Delete nahi hua."); }
}
