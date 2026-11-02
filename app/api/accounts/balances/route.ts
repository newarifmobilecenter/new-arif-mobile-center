import { NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Money currently in each account = all IN minus all OUT (every transaction, no row limit).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const d = await db();
    const rows = await d.collection("transactions").aggregate([
      { $group: { _id: { $ifNull: ["$account", "Cash"] }, bal: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, { $toDouble: { $ifNull: ["$amount", 0] } }, { $multiply: [-1, { $toDouble: { $ifNull: ["$amount", 0] } }] }] } } } },
    ]).toArray();
    const balances: Record<string, number> = {};
    for (const r of rows) balances[String(r._id || "Cash")] = Math.round(Number(r.bal || 0) * 100) / 100;
    return NextResponse.json({ balances, total: Object.values(balances).reduce((a, b) => a + b, 0) });
  } catch (e) {
    console.error("balances error", e);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}
