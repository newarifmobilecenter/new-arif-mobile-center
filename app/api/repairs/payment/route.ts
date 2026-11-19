import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession, hasRole, can } from "@/lib/auth";
import { ensureRepairIndexes } from "@/lib/repairs";

export const runtime = "nodejs";
const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Repair par payment jama (IN, +) ya wapas (OUT, -). Paid amount seedha badla nahi jata:
 * har tabdeeli date/waqt, user, wajah ke saath paymentHistory mein likhi jati hai aur cash book (transactions) mein bhi.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return fail("Login required.", 401);
  try {
    const b = await req.json();
    const id = String(b?.id || "");
    if (!ObjectId.isValid(id)) return fail("Invalid repair id.");
    const dir = String(b?.direction || "").toUpperCase() === "OUT" ? "OUT" : "IN";
    const amount = r2(Number(b?.amount));
    if (!Number.isFinite(amount) || amount <= 0) return fail("Raqam sahi likhein (0 se zyada).");
    const account = String(b?.account || "Cash").slice(0, 40);
    const note = String(b?.note || "").trim().slice(0, 300);
    if (dir === "OUT" && !note) return fail("Payment wapas karne ki wajah likhna zaroori hai.");
    if (dir === "OUT" && !(hasRole(session, "ADMIN") || can(session, "sale_modify"))) return fail("Payment wapas (minus) sirf Admin ya ijazat wala user kar sakta hai.", 403);

    const col = await ensureRepairIndexes();
    const _id = new ObjectId(id);
    const cur: any = await col.findOne({ _id, recordType: "REPAIR", deletedAt: null });
    if (!cur) return fail("Repair nahi mili.", 404);
    if (cur.billedSaleId) return fail("Is repair ka bill ban chuka hai. Payment us bill ke Sale Modify (POS) se karein.", 409);
    if (cur.status === "CANCELLED") return fail("Cancel hui repair par payment nahi ho sakti.", 409);

    const paid = r2(Number(cur.paid || 0)), total = r2(Number(cur.totalBill || 0));
    if (dir === "IN" && total > 0 && amount > r2(total - paid) + 0.001) return fail(`Baqi sirf Rs. ${r2(total - paid)} hai, zyada raqam jama nahi ho sakti.`);
    if (dir === "OUT" && amount > paid + 0.001) return fail(`Ab tak sirf Rs. ${paid} jama hai, utna hi wapas ho sakta hai.`);

    const newPaid = r2(dir === "IN" ? paid + amount : paid - amount);
    const remaining = total > 0 ? Math.max(0, r2(total - newPaid)) : 0;
    const now = new Date();
    const hist: any[] = Array.isArray(cur.paymentHistory) ? cur.paymentHistory : [];
    // Walking customer ka purana advance cash book mein nahi likha jata; wapsi bhi utni hi likhi jaye jitni cash book mein aayi thi.
    const booked = hist.reduce((t, h) => t + (h?.tx ? (h.type === "PAYMENT_OUT" ? -Number(h.amount || 0) : Number(h.amount || 0)) : 0), 0);
    const txAmount = dir === "IN" ? amount : cur.customerId ? amount : Math.max(0, Math.min(amount, booked));
    const entry = { amount, paymentMethod: account, type: dir === "IN" ? "PAYMENT_IN" : "PAYMENT_OUT", sign: dir === "IN" ? "+" : "-", note, reference: cur.tokenNo, at: now, user: session.u, tx: txAmount > 0 };

    const s = client.startSession();
    try {
      await s.withTransaction(async () => {
        const upd = await col.updateOne({ _id, recordType: "REPAIR", deletedAt: null, paid: cur.paid ?? 0 }, {
          $set: { paid: newPaid, remaining, paymentStatus: remaining > 0 ? "PAYMENT_DUE" : "PAID", paymentHistory: [...hist, entry], updatedAt: now, updatedBy: session.u },
        }, { session: s });
        if (upd.modifiedCount !== 1) throw new Error("Repair abhi kisi aur ne badli hai; dobara koshish karein.");
        if (txAmount > 0) {
          const d = await db();
          await d.collection("transactions").insertOne({ type: dir, account, amount: txAmount, customerId: cur.customerId || null, party: cur.customerName || "", ref: cur.tokenNo, repairId: id, note: (dir === "IN" ? "Repair payment jama" : "Repair payment wapas") + (note ? `: ${note}` : ""), user: session.u, createdAt: now }, { session: s });
        }
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally { await s.endSession(); }
    return NextResponse.json({ ok: true, paid: newPaid, remaining });
  } catch (e: any) { return fail(e?.message || "Payment save nahi hui.", 500); }
}
