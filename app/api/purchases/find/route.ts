import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Find a purchase by its number: "P009", "p9", "P0009" or just "9" all work.
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const raw = String(req.nextUrl.searchParams.get("no") || "").trim();
    const num = Number(raw.replace(/\D/g, ""));
    if (!raw || !Number.isInteger(num) || num <= 0) return NextResponse.json({ error: "Purchase number likhein, jaise P009." }, { status: 400 });
    const d = await db();
    const p: any = await d.collection("purchases").findOne({ invoiceNo: new RegExp(`^P0*${num}$`, "i"), kind: { $ne: "LOCAL" } });
    if (!p) return NextResponse.json({ error: `Purchase ${raw.toUpperCase()} nahi mili.` }, { status: 404 });
    const returned = await d.collection("returns").countDocuments({ purchaseId: String(p._id), type: "PURCHASE_RETURN" });
    const paidTx = await d.collection("transactions").find({ ref: p.invoiceNo, type: "OUT", note: "Purchase payment" }).toArray();
    const initialPaid = Math.round(paidTx.reduce((a: number, t: any) => a + Number(t.amount || 0), 0) * 100) / 100;
    const laterPaid = Math.max(0, Math.round((Number(p.paid || 0) - initialPaid) * 100) / 100);
    return NextResponse.json({ ...p, _id: String(p._id), returned, initialPaid, laterPaid, paymentAccount: paidTx[0]?.account || p.paymentMethod || "Cash" });
  } catch (e) {
    console.error("purchases/find error", e);
    return NextResponse.json({ error: "Purchase dhoondhne mein masla aaya." }, { status: 500 });
  }
}
