import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";
import { ensureRepairIndexes } from "@/lib/repairs";

export const runtime = "nodejs";
const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Mobile theek nahi ho saka: customer ko wapas (RETURNED).
// charge = jo paisa shop rakhta hai (checking / parts / mehnat). Baqi advance wapas hota hai.
//   paid > charge  -> (paid - charge) refund (OUT)
//   paid < charge  -> farq ya abhi cash (collectNow) ya customer ke hisab mein baqi
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return fail("Login required.", 401);
  try {
    const b = await req.json();
    const id = String(b?.id || "");
    if (!ObjectId.isValid(id)) return fail("Invalid repair id.");
    const charge = r2(Number(b.charge ?? 0));
    if (!Number.isFinite(charge) || charge < 0) return fail("Charge sahi likhein (0 ya zyada).");
    const reason = String(b.reason || "").trim().slice(0, 300);
    if (!reason) return fail("Wapsi ki wajah likhein (jaise: board dead, part available nahi).");
    const account = String(b.account || "Cash");
    const recipientType = String(b.recipientType || "CUSTOMER").toUpperCase();
    const collectNow = b.collectNow !== false;

    const collection = await ensureRepairIndexes();
    const _id = new ObjectId(id);
    const cur: any = await collection.findOne({ _id, recordType: "REPAIR", deletedAt: null });
    if (!cur) return fail("Repair nahi mili.", 404);
    if (!["RECEIVED", "IN_REPAIR", "READY"].includes(cur.status)) return fail(`Is repair ki halat ${cur.status} hai; wapsi nahi ho sakti.`, 409);

    const paid = r2(Number(cur.paid || 0));
    const refund = paid > charge ? r2(paid - charge) : 0;
    const extra = charge > paid ? r2(charge - paid) : 0;
    if (refund > 0 && !hasRole(session, "ADMIN")) return fail("Advance wapas (refund) sirf Admin kar sakta hai.", 403);
    if (extra > 0 && !collectNow && !cur.customerId) return fail("Customer linked nahi, is liye baqi charge abhi cash mein lein.");

    let delivery: any;
    if (recipientType === "OTHER_PERSON") {
      const name = String(b.recipientName || "").trim(), cnic = String(b.cnic || "").trim(), phone = String(b.phone || "").trim();
      if (!name || !cnic || !phone) return fail("Dusre bande ko dene ke liye naam, CNIC aur phone zaroori hain.");
      delivery = { recipientType, name, cnic, phone };
    } else delivery = { recipientType: "CUSTOMER", name: cur.customerName, phone: cur.customerPhone };

    const now = new Date();
    const hist: any[] = [...(cur.paymentHistory || [])];
    if (refund > 0) hist.push({ amount: refund, paymentMethod: account, type: "RETURN_REFUND", reference: cur.tokenNo, at: now, user: session.u });
    const paidNow = extra > 0 && collectNow;
    if (paidNow) hist.push({ amount: extra, paymentMethod: account, type: "RETURN_CHARGE", reference: cur.tokenNo, at: now, user: session.u });
    const finalPaid = paidNow ? charge : Math.min(paid, charge);
    const remaining = r2(charge - finalPaid);

    const s = client.startSession();
    try {
      await s.withTransaction(async () => {
        const upd = await collection.updateOne({ _id, recordType: "REPAIR", deletedAt: null, status: cur.status, paid: cur.paid ?? 0 }, {
          $set: {
            status: "RETURNED", totalBill: charge, agreedRate: charge, paid: finalPaid, remaining, paymentStatus: remaining > 0 ? "PAYMENT_DUE" : "PAID",
            paymentHistory: hist, delivery: { ...delivery, deliveredAt: now, deliveredBy: session.u }, deliveredAt: now,
            returnInfo: { reason, charge, refund, extraCharged: extra, advancePaid: paid, account, at: now, by: session.u },
            updatedAt: now, updatedBy: session.u,
          },
          $push: { statusHistory: { status: "RETURNED", at: now, user: session.u, note: reason } } as any,
        }, { session: s });
        if (upd.modifiedCount !== 1) throw new Error("Repair abhi kisi aur ne badli hai; dobara koshish karein.");
        const d = await db();
        const tx = (type: "IN" | "OUT", amount: number, note: string) => d.collection("transactions").insertOne({ type, account, amount, customerId: cur.customerId || null, party: cur.customerName || "", ref: cur.tokenNo, repairId: id, note, user: session.u, createdAt: now }, { session: s });
        // Advance sirf tab accounts mein likha jata hai jab customer linked ho, isi liye refund bhi usi shart par.
        if (refund > 0 && cur.customerId) await tx("OUT", refund, "Repair return refund");
        if (paidNow && cur.customerId) await tx("IN", extra, "Repair return charge");
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally { await s.endSession(); }

    const saved: any = await collection.findOne({ _id });
    return NextResponse.json({ ...saved, _id: String(saved._id), summary: { advance: paid, charge, refund, extra, remaining } });
  } catch (e: any) {
    return fail(e?.message || "Wapsi save nahi hui.", 500);
  }
}
