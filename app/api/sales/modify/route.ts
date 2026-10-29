import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// Modify an existing invoice: stock and payment entries are corrected in one transaction, invoice number stays the same.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (!hasRole(user, "ADMIN")) return NextResponse.json({ error: "Invoice modify karne ke liye Admin access chahiye." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const saleId = String(body.saleId || "");
  if (!ObjectId.isValid(saleId)) return NextResponse.json({ error: "Invalid invoice." }, { status: 400 });
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return NextResponse.json({ error: "At least one item is required." }, { status: 400 });
  if (items.some((i: any) => !Number.isInteger(Number(i.qty)) || Number(i.qty) <= 0 || !Number.isFinite(Number(i.price)) || Number(i.price) < 0 || num(i.discountPct) < 0 || num(i.discountPct) > 100))
    return NextResponse.json({ error: "Each item needs a positive whole quantity, a valid price and discount 0-100%." }, { status: 400 });
  const freight = num(body.freight), discountPct = num(body.discountPct), salesTaxPct = num(body.salesTaxPct), paid = num(body.paid);
  if (freight < 0 || discountPct < 0 || discountPct > 100 || salesTaxPct < 0 || paid < 0) return NextResponse.json({ error: "Invalid freight/percentages/paid amount." }, { status: 400 });

  const subtotal = items.reduce((s: number, i: any) => s + num(i.qty) * num(i.price), 0);
  const lineDiscountAmount = items.reduce((s: number, i: any) => s + num(i.qty) * num(i.price) * num(i.discountPct) / 100, 0);
  const globalDiscountAmount = Math.max(0, subtotal - lineDiscountAmount) * discountPct / 100;
  const discountAmount = lineDiscountAmount + globalDiscountAmount;
  const taxable = Math.max(0, subtotal - discountAmount + freight);
  const salesTaxValue = taxable * salesTaxPct / 100;
  const netTotal = Math.max(0, taxable + salesTaxValue);
  if (paid > netTotal + 0.000001) return NextResponse.json({ error: "Paid amount cannot exceed the net total." }, { status: 400 });
  const remaining = Math.max(0, netTotal - paid);
  const normalized = items.map((i: any) => ({ ...i, qty: num(i.qty), price: num(i.price), discountPct: num(i.discountPct), discountAmount: num(i.qty) * num(i.price) * num(i.discountPct) / 100, total: num(i.qty) * num(i.price) * (1 - num(i.discountPct) / 100) }));

  try {
    const d = await db();
    const sale = await d.collection("sales").findOne({ _id: new ObjectId(saleId) });
    if (!sale) return NextResponse.json({ error: "Invoice nahi mili." }, { status: 404 });
    if (sale.status === "cancelled") return NextResponse.json({ error: "Cancelled invoice modify nahi ho sakti." }, { status: 409 });
    if (await d.collection("returns").findOne({ saleId, type: "SALE_RETURN" })) return NextResponse.json({ error: "Is invoice par return ho chuka hai, modify nahi ho sakti." }, { status: 409 });

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of Array.isArray(sale.items) ? sale.items : []) {
          if (!item.productId || !ObjectId.isValid(String(item.productId))) continue;
          await d.collection("products").updateOne({ _id: new ObjectId(String(item.productId)) }, { $inc: { stock: Number(item.qty || 0) }, $set: { updatedAt: new Date() } }, { session });
          await d.collection("stockMovements").insertOne({ type: "IN", productId: String(item.productId), qty: Number(item.qty || 0), reason: "Sale modified (old items reversed)", ref: sale.invoiceNo, user: user.u, createdAt: new Date() }, { session });
        }
        for (const item of normalized) {
          if (!item.productId) continue;
          if (!ObjectId.isValid(String(item.productId))) throw new Error(`Invalid product: ${item.name || "item"}`);
          const updated = await d.collection("products").findOneAndUpdate({ _id: new ObjectId(String(item.productId)), stock: { $gte: item.qty } }, { $inc: { stock: -item.qty }, $set: { updatedAt: new Date() } }, { session, returnDocument: "after" });
          if (!updated) throw new Error(`Insufficient stock for ${item.name || "item"}.`);
          await d.collection("stockMovements").insertOne({ type: "OUT", productId: String(item.productId), qty: item.qty, reason: "Sale modified (new items)", ref: sale.invoiceNo, user: user.u, createdAt: new Date() }, { session });
        }
        const keep = ["customerId", "cashRef", "custRef", "remarks", "salesman", "date", "paymentMethod", "type", "saleType"];
        const fields: Record<string, unknown> = {};
        for (const k of keep) if (k in body) fields[k] = body[k];
        const history = Array.isArray(sale.modifications) ? sale.modifications : [];
        history.push({ at: new Date(), by: user.u, prevTotal: sale.total, prevPaid: sale.paid });
        await d.collection("sales").updateOne({ _id: sale._id }, { $set: { ...fields, items: normalized, subtotal, discountAmount, lineDiscountAmount, globalDiscountAmount, discountPct, freight, salesTaxValue, salesTaxPct, grandTotal: subtotal, total: netTotal, netTotal, paid, remaining, status: remaining > 0 ? "credit" : "paid", modifications: history, updatedAt: new Date() } }, { session });
        const tx = d.collection("transactions");
        const old = await tx.findOne({ ref: sale.invoiceNo, type: "IN", note: "Sale" }, { session });
        if (old && paid > 0) await tx.updateOne({ _id: old._id }, { $set: { amount: paid, account: (body.paymentMethod || old.account || "Cash"), customerId: body.customerId || null } }, { session });
        else if (old) await tx.deleteOne({ _id: old._id }, { session });
        else if (paid > 0) await tx.insertOne({ type: "IN", account: body.paymentMethod || "Cash", amount: paid, ref: sale.invoiceNo, customerId: body.customerId || null, note: "Sale", user: user.u, createdAt: new Date() }, { session });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally { await session.endSession(); }
    return NextResponse.json({ ok: true, _id: saleId, invoiceNo: sale.invoiceNo, total: netTotal, paid, remaining });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Modify nahi hua. Kuch change nahi hua." }, { status: 409 }); }
}
