import { NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { REPAIR_COLLECTION } from "@/lib/repairs";
import { backfillWalking } from "@/lib/vouchers";

// Walking customers (people with no saved profile) who left a repair/sale unpaid. Kept separate from the permanent customer list.
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const d = await db();
    await backfillWalking(d, user.u);
    const [list, reps, sales] = await Promise.all([
      d.collection("walkingCustomers").find({}).sort({ createdAt: -1 }).limit(2000).toArray(),
      d.collection(REPAIR_COLLECTION).find({ recordType: "REPAIR", deletedAt: null, walkingId: { $nin: [null, ""] } }).toArray(),
      d.collection("sales").find({ walkingId: { $nin: [null, ""] }, status: { $ne: "cancelled" } }).toArray(),
    ]);
    const out = list.map((w) => {
      const id = String(w._id);
      const r = reps.filter((x) => String(x.walkingId) === id).map((x) => ({ kind: "Repair", ref: x.tokenNo, model: x.model, date: x.receivedAt || x.createdAt, total: Number(x.totalBill || 0), paid: Number(x.paid || 0), remaining: Number(x.remaining || 0) }));
      const s = sales.filter((x) => String(x.walkingId) === id).map((x) => ({ kind: "Sale", ref: x.invoiceNo, model: "", date: x.createdAt, total: Number(x.total || 0), paid: Number(x.paid || 0), remaining: Number(x.remaining || 0) }));
      const rows = [...r, ...s].sort((a, b) => +new Date(b.date) - +new Date(a.date));
      return { _id: id, code: w.code, name: w.name, phone: w.phone || "", createdAt: w.createdAt, rows, balance: rows.reduce((a, x) => a + x.remaining, 0), totalBill: rows.reduce((a, x) => a + x.total, 0) };
    });
    return NextResponse.json(out);
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Walking list load nahi hui." }, { status: 500 }); }
}
