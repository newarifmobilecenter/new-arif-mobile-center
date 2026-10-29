import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { NUMBER_KINDS, NumberKind, peekNumber } from "@/lib/counters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const kind = String(req.nextUrl.searchParams.get("type") || "");
  if (!(kind in NUMBER_KINDS)) return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  try { return NextResponse.json({ next: await peekNumber(await db(), kind as NumberKind) }); }
  catch (e: any) { return NextResponse.json({ error: e?.message || "Counter error" }, { status: 500 }); }
}
