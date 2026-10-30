import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getHolds } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    return NextResponse.json(await getHolds(String(req.nextUrl.searchParams.get("exclude") || "")));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not load reservations." }, { status: 500 });
  }
}
