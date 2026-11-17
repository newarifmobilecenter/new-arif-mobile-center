import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { ensureRepairIndexes } from "@/lib/repairs";

export const runtime = "nodejs";

/** Deliver ho chuki repairs ka payment hisaab: unpaid (baqi) aur paid. Bill ho chuki repair ka baqi sale se aata hai. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const rows: any[] = await (await ensureRepairIndexes()).find({
      recordType: "REPAIR", deletedAt: null, status: "DELIVERED",
    }).project({ tokenNo: 1, customerId: 1, customerName: 1, customerPhone: 1, model: 1, fault: 1, parts: 1, totalBill: 1, paid: 1, remaining: 1, billedSaleId: 1, billedRemaining: 1, billedPaidAdd: 1, paymentReminderAt: 1, receivedAt: 1, deliveredAt: 1, updatedAt: 1 }).sort({ receivedAt: -1 }).limit(3000).toArray();
    const ids = rows.filter((r) => r.billedSaleId && ObjectId.isValid(String(r.billedSaleId))).map((r) => new ObjectId(String(r.billedSaleId)));
    const rem = new Map<string, number>();
    const inv = new Map<string, string>();
    if (ids.length) {
      const sales = await (await db()).collection("sales").find({ _id: { $in: ids }, status: { $ne: "cancelled" } }).project({ remaining: 1, invoiceNo: 1 }).toArray();
      for (const s of sales as any[]) { rem.set(String(s._id), Number(s.remaining || 0)); inv.set(String(s._id), String(s.invoiceNo || "")); }
    }
    const out = rows.filter((r) => Number(r.totalBill || 0) > 0).map((r) => {
      let remaining = Number(r.remaining || 0);
      if (r.billedSaleId && Number(r.billedRemaining || 0) > 0) remaining = Math.min(Number(r.billedRemaining), rem.get(String(r.billedSaleId)) || 0);
      const total = Number(r.totalBill || 0);
      return {
        _id: String(r._id), tokenNo: r.tokenNo, customerId: r.customerId || "", customerName: r.customerName || "", customerPhone: r.customerPhone || "",
        model: r.model || "", fault: r.fault || "", parts: Array.isArray(r.parts) ? r.parts.map((p: any) => String(p?.name || "")).filter(Boolean) : [],
        total, remaining, paid: Math.max(0, total - remaining), billedSaleId: r.billedSaleId ? String(r.billedSaleId) : "", invoiceNo: inv.get(String(r.billedSaleId)) || "",
        reminderAt: r.paymentReminderAt || null, receivedAt: r.receivedAt || null, deliveredAt: r.deliveredAt || r.updatedAt || null,
      };
    });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Khata load nahi hua." }, { status: 500 });
  }
}
