import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { nextNumber } from "@/lib/counters";
import { clearOrdersForPurchase } from "@/lib/orderBookServer";
import { REPAIR_COLLECTION } from "@/lib/repairs";
import { customerBalance } from "@/lib/vouchers";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const ACCOUNTS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Bank", "Other Bank", "Other"];

// Local purchase: we buy goods from a saved customer. Stock goes up; we either pay cash, offset the customer's pending dues, or owe the rest.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return fail("Login required.", 401);
  try {
    const b = await req.json();
    const customerId = String(b.customerId || "");
    const items = Array.isArray(b.items) ? b.items : [];
    if (!ObjectId.isValid(customerId)) return fail("Customer select karein.");
    if (!items.length) return fail("Kam az kam ek item likhein.");
    for (const it of items) {
      if (!ObjectId.isValid(String(it.productId || "")) || !Number.isInteger(Number(it.qty)) || Number(it.qty) <= 0 || !Number.isFinite(Number(it.costPrice)) || Number(it.costPrice) < 0) return fail("Har item ka product, poori qty aur sahi rate zaroori hai.");
    }
    const d = await db();
    const customer = await d.collection("customers").findOne({ _id: new ObjectId(customerId) });
    if (!customer) return fail("Customer nahi mila.", 404);
    const total = items.reduce((t: number, i: any) => t + Number(i.qty) * Number(i.costPrice), 0);
    const paid = Number(b.paid || 0), adjust = Number(b.adjustDue || 0);
    if (![paid, adjust].every(Number.isFinite) || paid < 0 || adjust < 0) return fail("Amounts sahi likhein.");
    if (paid + adjust > total + 0.0001) return fail("Cash + due adjust kul bill se zyada nahi ho sakta.");
    const account = ACCOUNTS.includes(String(b.paymentMethod)) ? String(b.paymentMethod) : "Cash";
    const invoiceNo = await nextNumber(d, "localPurchase");
    const s = client.startSession();
    let adjusted = 0;
    let prevBalance = 0;
    try {
      await s.withTransaction(async () => {
        adjusted = 0;
        prevBalance = Math.round((await customerBalance(d, customerId, s)) * 100) / 100;
        for (const it of items) {
          const pid = String(it.productId);
          const p = await d.collection("products").findOneAndUpdate({ _id: new ObjectId(pid) }, { $inc: { stock: Number(it.qty) }, $set: { costPrice: Number(it.costPrice), ...(Number(it.retail) > 0 ? { price: Number(it.retail) } : {}), ...(Number(it.wholesale) > 0 ? { wholesale: Number(it.wholesale) } : {}), updatedAt: new Date() } }, { session: s, returnDocument: "after" });
          if (!p) throw new Error(`Product nahi mila: ${it.name || pid}`);
          await d.collection("stockMovements").insertOne({ type: "IN", productId: pid, qty: Number(it.qty), ref: invoiceNo, reason: "Local Purchase", costPrice: Number(it.costPrice), user: user.u, createdAt: new Date() }, { session: s });
        }
        await clearOrdersForPurchase(d, items.map((i: any) => ({ productId: String(i.productId), name: String(i.name || "") })), invoiceNo, s);

        // Offset the customer's pending dues (oldest first): sales, then repairs.
        let left = adjust;
        if (left > 0) {
          const sales = await d.collection("sales").find({ customerId, status: { $ne: "cancelled" }, remaining: { $gt: 0 } }, { session: s }).sort({ createdAt: 1 }).toArray();
          for (const sale of sales) {
            if (left <= 0) break;
            const due = Number(sale.remaining || 0), use = Math.min(due, left);
            const r = await d.collection("sales").updateOne({ _id: sale._id, remaining: { $gte: use } }, { $inc: { paid: use }, $set: { remaining: Math.round((due - use) * 100) / 100, status: due - use > 0 ? "credit" : "paid", updatedAt: new Date() }, $push: { adjustments: { amount: use, ref: invoiceNo, at: new Date(), note: "Local purchase se adjust" } } as any }, { session: s });
            if (r.modifiedCount !== 1) throw new Error("Adjust conflict, dobara try karein.");
            adjusted += use; left -= use;
          }
          if (left > 0) {
            const repairs = await d.collection(REPAIR_COLLECTION).find({ recordType: "REPAIR", deletedAt: null, customerId, remaining: { $gt: 0 } }, { session: s }).sort({ receivedAt: 1, createdAt: 1 }).toArray();
            for (const rp of repairs) {
              if (left <= 0) break;
              const due = Number(rp.remaining || 0), use = Math.min(due, left);
              const remaining = Math.round((due - use) * 100) / 100;
              const r = await d.collection(REPAIR_COLLECTION).updateOne({ _id: rp._id, remaining: { $gte: use } }, { $inc: { paid: use }, $set: { remaining, paymentStatus: remaining > 0 ? "PAYMENT_DUE" : "PAID", updatedAt: new Date() }, $push: { paymentHistory: { amount: use, paymentMethod: "Local Purchase", type: "ADJUSTMENT", reference: invoiceNo, at: new Date(), user: user.u } } as any }, { session: s });
              if (r.modifiedCount !== 1) throw new Error("Adjust conflict, dobara try karein.");
              adjusted += use; left -= use;
            }
          }
          if (left > 0.0001) throw new Error(`Customer ka sirf Rs. ${adjusted} baqi tha; adjust ${adjust} nahi ho sakta.`);
        }
        const remaining = Math.round((total - paid - adjusted) * 100) / 100;
        const purchase = { kind: "LOCAL", invoiceNo, customerId, supplierName: String(customer.name || ""), supplierId: null, items: items.map((i: any) => ({ productId: String(i.productId), name: String(i.name || ""), qty: Number(i.qty), costPrice: Number(i.costPrice), retail: Number(i.retail || 0) })), subtotal: total, total, paid, adjusted, remaining, prevBalance, newBalance: Math.round((prevBalance - total + paid) * 100) / 100, status: remaining > 0 ? "credit" : "paid", note: String(b.note || "").slice(0, 300), paymentMethod: account, createdAt: new Date(), updatedAt: new Date(), createdBy: user.u };
        await d.collection("purchases").insertOne(purchase, { session: s });
        if (paid > 0) await d.collection("transactions").insertOne({ type: "OUT", account, amount: paid, ref: invoiceNo, customerId, party: customer.name || "", note: "Local purchase payment", voucherType: "PAY", user: user.u, createdAt: new Date() }, { session: s });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } catch (e: any) { return fail(e?.message || "Local purchase save nahi hui."); } finally { await s.endSession(); }
    return NextResponse.json({ ok: true, invoiceNo, total, adjusted, prevBalance, newBalance: Math.round((prevBalance - total + paid) * 100) / 100, remaining: Math.round((total - paid - adjusted) * 100) / 100 }, { status: 201 });
  } catch (e: any) { return fail(e?.message || "Save nahi hua.", 500); }
}
