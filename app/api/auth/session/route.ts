import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    session ? { authenticated: true, username: session.u, role: session.r } : { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}