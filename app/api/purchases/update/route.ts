import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";

const r2 = (x: number) => Math.round(x * 100) / 100;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Modify an already saved purchase (Admin only). Stock, supplier balance and payments are corrected by the DIFFERENCE,
// the old values are kept in purchase.history, and nothing is deleted.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return fail("Login required.", 401);
  if (!hasRole(user, "ADMIN")) return fail("Purchase modify sirf Admin kar sakta hai.", 403);
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!ObjectId.isValid(id)) return fail("Purchase ki id sahi nahi.");
    const supplierId = String(body.supplierId || "");
    const suppRef = String(body.suppRef || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!ObjectId.isValid(supplierId) || !items.length) return fail("Supplier aur kam az kam aik product zaroori hai.");
    for (const it of items) {
      if (!ObjectId.isValid(String(it.productId || "")) || !Number.isInteger(Number(it.qty)) || Number(it.qty) <= 0 || !Number.isFinite(Number(it.costPrice)) || Number(it.costPrice) < 0) return fail("Har product ki Qty (poora number) aur Cost sahi honi chahiye.");
    }
    const d = await db();
    const old: any = await d.collection("purchases").findOne({ _id: new ObjectId(id), kind: { $ne: "LOCAL" } });
    if (!old) return fail("Purchase nahi mili.", 404);
    if (await d.collection("returns").findOne({ purchaseId: String(old._id), type: "PURCHASE_RETURN" })) return fail("Is purchase par Purchase Return ho chuka hai, is liye isay modify nahi kar sakte.", 409);
    if (suppRef && await d.collection("purchases").findOne({ supplierId, suppRef, _id: { $ne: old._id } })) return fail("Yeh supplier invoice pehle se save hai.", 409);
    const supplier: any = await d.collection("suppliers").findOne({ _id: new ObjectId(supplierId) });
    if (!supplier) return fail("Supplier nahi mila.", 404);

    const subtotal = items.reduce((s: number, it: any) => s + Number(it.qty) * Number(it.costPrice), 0);
    const tcs = Number(body.tcs || 0), bilty = Number(body.bilty || 0), freight = Number(body.freight || 0), otherExpense = Number(body.otherExpense || 0), discount = Number(body.discount || 0), paidNow = Number(body.paid || 0);
    if (![tcs, bilty, freight, otherExpense, discount, paidNow].every(Number.isFinite) || [tcs, bilty, freight, otherExpense, discount, paidNow].some(x => x < 0)) return fail("Raqam sahi nahi.");
    if (discount > subtotal) return fail("Discount invalid hai.");
    const total = r2(subtotal + tcs + bilty + freight + otherExpense - discount);

    const invoiceNo = String(old.invoiceNo);
    const oldTx = await d.collection("transactions").find({ ref: invoiceNo, type: "OUT", note: "Purchase payment" }).toArray();
    const oldInitialPaid = r2(oldTx.reduce((a: number, t: any) => a + Number(t.amount || 0), 0));
    const oldAccount = String(oldTx[0]?.account || old.paymentMethod || "Cash");
    const laterPaid = Math.max(0, r2(Number(old.paid || 0) - oldInitialPaid));
    const newPaidTotal = r2(paidNow + laterPaid);
    if (newPaidTotal > total) return fail(`Is purchase par baad mein Rs. ${laterPaid} ki payment ho chuki hai; total itna kam nahi ho sakta (paid ${newPaidTotal} > total ${total}).`);
    const account = String(body.paymentMethod || oldAccount || "Cash");

    const oldQty = new Map<string, number>(), newQty = new Map<string, number>();
    for (const it of old.items || []) oldQty.set(String(it.productId), (oldQty.get(String(it.productId)) || 0) + Number(it.qty || 0));
    for (const it of items) newQty.set(String(it.productId), (newQty.get(String(it.productId)) || 0) + Number(it.qty));
    const names = new Map<string, string>();
    for (const it of [...(old.items || []), ...items]) names.set(String(it.productId), String(it.name || ""));

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        for (const pid of new Set([...oldQty.keys(), ...newQty.keys()])) {
          const delta = (newQty.get(pid) || 0) - (oldQty.get(pid) || 0);
          if (delta === 0) continue;
          const filter: any = { _id: new ObjectId(pid) };
          if (delta < 0) filter.stock = { $gte: -delta };
          const upd = await d.collection("products").updateOne(filter, { $inc: { stock: delta }, $set: { updatedAt: now } }, { session });
          if (upd.matchedCount !== 1) throw new Error(delta < 0 ? `Stock kam hai: ${names.get(pid) || pid} ka ${-delta} piece wapas nahi ho sakta (maal pehle bik chuka hai).` : `Product nahi mila: ${names.get(pid) || pid}`);
          await d.collection("stockMovements").insertOne({ type: delta > 0 ? "IN" : "OUT", productId: pid, qty: Math.abs(delta), ref: invoiceNo, reason: `Purchase edit ${invoiceNo}`, user: user.u, createdAt: now }, { session });
        }
        // Cost / rates only follow this purchase when no newer purchase of the same product exists.
        for (const it of items) {
          const newer = await d.collection("purchases").findOne({ _id: { $ne: old._id }, createdAt: { $gt: old.createdAt }, "items.productId": String(it.productId) }, { session });
          if (newer) continue;
          await d.collection("products").updateOne({ _id: new ObjectId(String(it.productId)) }, { $set: { costPrice: Number(it.costPrice), ...(Number(it.retail) > 0 ? { price: Number(it.retail) } : {}), ...(Number(it.wholesale) > 0 ? { wholesale: Number(it.wholesale) } : {}), updatedAt: now } }, { session });
        }
        // Payment correction (old payment rows stay untouched; only the difference is recorded today).
        const mk = (type: "IN" | "OUT", acc: string, amount: number, note: string) => d.collection("transactions").insertOne({ type, account: acc, amount, ref: invoiceNo, supplierId, party: supplier.name || "", note, user: user.u, createdAt: now }, { session });
        if (account === oldAccount) {
          const diff = r2(paidNow - oldInitialPaid);
          if (diff > 0) await mk("OUT", account, diff, "Purchase edit adjustment");
          else if (diff < 0) await mk("IN", account, -diff, "Purchase edit adjustment");
        } else {
          if (oldInitialPaid > 0) await mk("IN", oldAccount, oldInitialPaid, "Purchase edit adjustment (account change)");
          if (paidNow > 0) await mk("OUT", account, paidNow, "Purchase edit adjustment (account change)");
        }
        const before = { supplierId: old.supplierId, supplierName: old.supplierName, suppRef: old.suppRef, items: old.items, subtotal: old.subtotal, discount: old.discount, freight: old.freight, otherExpense: old.otherExpense, total: old.total, paid: old.paid, remaining: old.remaining, date: old.date };
        await d.collection("purchases").updateOne({ _id: old._id }, {
          $set: { supplierId, supplierName: supplier.name || "", suppRef, remarks: String(body.remarks || ""), date: body.date || old.date, type: body.type || old.type, salesman: body.salesman || old.salesman, items, subtotal, discount, tcs, bilty, freight, otherExpense, total, paid: newPaidTotal, remaining: r2(total - newPaidTotal), status: total - newPaidTotal > 0 ? "credit" : "paid", paymentMethod: account, updatedAt: now, editedAt: now, editedBy: user.u },
          $inc: { editCount: 1 },
          $push: { history: { at: now, by: user.u, before } } as any,
        }, { session });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally { await session.endSession(); }
    const saved: any = await d.collection("purchases").findOne({ _id: old._id });
    return NextResponse.json({ ok: true, ...saved, _id: String(old._id), history: undefined });
  } catch (e: any) {
    console.error("purchases/update error", e);
    return fail(e?.message || "Purchase update nahi hui.", 409);
  }
}
