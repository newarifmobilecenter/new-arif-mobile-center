import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { nextNumber } from "@/lib/counters";
import { customerBalance } from "@/lib/vouchers";

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Customer-wise sale return (invoice number ki zaroorat nahi).
//  mode "BALANCE": return ki raqam customer ke baqi (sales ke remaining) se oldest-first less hoti hai;
//                  agar baqi kam ho to bacha hua hissa cash wapas (OUT) hota hai.
//  mode "CASH"   : poori raqam cash/bank se wapas.
// Stock har item ka wapas barhta hai.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return fail("Login required.", 401);
  try {
    const b = await req.json();
    const customerId = b.customerId ? String(b.customerId) : "";
    if (customerId && !ObjectId.isValid(customerId)) return fail("Customer sahi nahi.");
    const mode = String(b.mode || "BALANCE").toUpperCase() === "CASH" || !customerId ? "CASH" : "BALANCE";
    const account = String(b.account || "Cash");
    const reason = String(b.reason || "Customer Return").trim().slice(0, 200) || "Customer Return";
    const rows = Array.isArray(b.items) ? b.items : [];
    if (!rows.length) return fail("Kam az kam aik item add karein.");
    const want = new Map<string, { qty: number; rate: number }[]>();
    for (const it of rows) {
      const pid = String(it.productId || "");
      const qty = Number(it.qty), rate = Number(it.rate);
      if (!ObjectId.isValid(pid) || !Number.isInteger(qty) || qty <= 0 || !Number.isFinite(rate) || rate < 0) return fail("Har item ki Qty (poora number) aur Rate sahi honi chahiye.");
      want.set(pid, [...(want.get(pid) || []), { qty, rate }]);
    }

    const d = await db();
    const customer: any = customerId ? await d.collection("customers").findOne({ _id: new ObjectId(customerId) }) : null;
    if (customerId && !customer) return fail("Customer nahi mila.", 404);

    // Customer ko jitna becha gaya aur pehle jitna wapas ho chuka, us se zyada return nahi ho sakta.
    let soldMap = new Map<string, number>(), retMap = new Map<string, number>();
    if (customerId) {
      const custSales = await d.collection("sales").find({ customerId, status: { $ne: "cancelled" } }, { projection: { items: 1 } }).toArray();
      const saleIds = custSales.map((x: any) => String(x._id));
      for (const sl of custSales) for (const it of (sl as any).items || []) if (it.productId) soldMap.set(String(it.productId), (soldMap.get(String(it.productId)) || 0) + Number(it.qty || 0));
      const prev = await d.collection("returns").aggregate([
        { $match: { type: "SALE_RETURN", $or: [{ customerId }, { saleId: { $in: saleIds } }] } },
        { $group: { _id: "$productId", qty: { $sum: "$qty" } } },
      ]).toArray();
      for (const p of prev) retMap.set(String(p._id), Number(p.qty || 0));
      for (const [pid, list] of want) {
        const q = list.reduce((a, x) => a + x.qty, 0);
        const left = (soldMap.get(pid) || 0) - (retMap.get(pid) || 0);
        if (q > left) {
          const p: any = await d.collection("products").findOne({ _id: new ObjectId(pid) }, { projection: { name: 1 } });
          return fail(`${p?.name || "Item"}: is customer ko sirf ${Math.max(0, left)} piece wapas ho sakte hain (becha ${soldMap.get(pid) || 0}, pehle wapas ${retMap.get(pid) || 0}).`, 409);
        }
      }
    }

    const lines: any[] = [];
    for (const [pid, list] of want) {
      const p: any = await d.collection("products").findOne({ _id: new ObjectId(pid) }, { projection: { name: 1 } });
      if (!p) return fail("Product nahi mila.", 404);
      for (const x of list) lines.push({ productId: pid, productName: String(p.name || ""), qty: x.qty, rate: x.rate, amount: r2(x.qty * x.rate) });
    }
    const total = r2(lines.reduce((a, x) => a + x.amount, 0));

    const returnNo = await nextNumber(d, "saleReturn");
    const now = new Date();
    let adjusted = 0, refund = total, allocations: any[] = [];
    const s = client.startSession();
    try {
      await s.withTransaction(async () => {
        allocations = [];
        adjusted = 0;
        if (mode === "BALANCE") {
          let left = total;
          const open = await d.collection("sales").find({ customerId, remaining: { $gt: 0 }, status: { $ne: "cancelled" } }, { session: s }).sort({ createdAt: 1 }).toArray();
          for (const sl of open as any[]) {
            if (left <= 0) break;
            const take = r2(Math.min(left, Number(sl.remaining || 0)));
            if (take <= 0) continue;
            const rem = r2(Number(sl.remaining) - take);
            await d.collection("sales").updateOne({ _id: sl._id }, { $set: { remaining: rem, status: rem > 0 ? "credit" : "paid", updatedAt: now }, $inc: { returnedAmount: take } }, { session: s });
            allocations.push({ saleId: String(sl._id), invoiceNo: sl.invoiceNo, amount: take });
            left = r2(left - take); adjusted = r2(adjusted + take);
          }
          refund = r2(total - adjusted);
        } else { refund = total; adjusted = 0; }

        for (const ln of lines) {
          const up = await d.collection("products").updateOne({ _id: new ObjectId(ln.productId) }, { $inc: { stock: ln.qty }, $set: { updatedAt: now } }, { session: s });
          if (up.matchedCount !== 1) throw new Error(`Product nahi mila: ${ln.productName}`);
          await d.collection("stockMovements").insertOne({ type: "IN", productId: ln.productId, qty: ln.qty, reason: `Sale return: ${reason}`, ref: returnNo, user: user.u, createdAt: now }, { session: s });
        }
        let first = true;
        for (const ln of lines) {
          await d.collection("returns").insertOne({
            type: "SALE_RETURN", returnNo, saleId: null, invoiceNo: allocations.map((a) => a.invoiceNo).join(", ") || "-", customerId: customerId || null, customerName: customer?.name || "CASH",
            productId: ln.productId, productName: ln.productName, qty: ln.qty, rate: ln.rate, amount: ln.amount,
            refundAmount: first ? refund : 0, unpaidReduction: first ? adjusted : 0, allocations: first ? allocations : [], mode, account, reason, user: user.u, createdAt: now,
          }, { session: s });
          first = false;
        }
        if (refund > 0) await d.collection("transactions").insertOne({ type: "OUT", account, amount: refund, ref: returnNo, customerId: customerId || null, party: customer?.name || "", note: "Sale return refund", user: user.u, createdAt: now }, { session: s });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally { await s.endSession(); }

    const newBalance = customerId ? r2(await customerBalance(d, customerId)) : null;
    return NextResponse.json({ ok: true, returnNo, total, adjusted, refund, newBalance, customerName: customer?.name || "", lines });
  } catch (e: any) {
    return fail(e?.message || "Return save nahi hui. Kuch nahi badla.", 409);
  }
}
