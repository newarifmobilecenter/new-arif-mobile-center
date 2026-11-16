import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEFAULT_STAFF_PERMS } from "@/lib/perms";

export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    session ? { authenticated: true, username: session.u, role: session.r, perms: session.r === "ADMIN" ? "all" : (session.p ?? DEFAULT_STAFF_PERMS) } : { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}