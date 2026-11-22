import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Owner ke PC ke liye: staff ki banayi repair slips jo abhi print nahi hui (pichle 24 ghantay). */
export async function GET() {
  const u = await getSession();
  if (!hasRole(u, "ADMIN")) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const d = await db();
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const rows = await d.collection("printJobs").find({ status: "pending", createdAt: { $gte: since } }).sort({ createdAt: 1 }).limit(10).toArray();
  return NextResponse.json(rows.map((r: any) => ({ id: String(r._id), kind: r.kind, repairId: r.repairId, tokenNo: r.tokenNo, by: r.by })));
}

/** Job ko "claim" karta hai (sirf ek PC print kare, dobara nahi). */
export async function POST(req: NextRequest) {
  const u = await getSession();
  if (!hasRole(u, "ADMIN")) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { id } = await req.json().catch(() => ({}));
  if (!ObjectId.isValid(String(id))) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const d = await db();
  const r = await d.collection("printJobs").updateOne({ _id: new ObjectId(String(id)), status: "pending" }, { $set: { status: "done", printedAt: new Date() } });
  return NextResponse.json({ claimed: r.modifiedCount === 1 });
}
