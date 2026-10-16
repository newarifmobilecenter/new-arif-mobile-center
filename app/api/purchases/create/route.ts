import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const body = await req.json();
    const supplierId = String(body.supplierId || "");
    const invoiceNo = String(body.invoiceNo || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!ObjectId.isValid(supplierId) || !invoiceNo || !items.length) return NextResponse.json({ error: "Supplier, invoice number, and at least one product are required." }, { status: 400 });
    for (const item of items) {
      if (!ObjectId.isValid(String(item.productId || "")) || !Number.isInteger(Number(item.qty)) || Number(item.qty) <= 0 || !Number.isFinite(Number(item.costPrice)) || Number(item.costPrice) < 0) return NextResponse.json({ error: "Each purchase item needs a valid product, positive whole quantity, and non-negative cost." }, { status: 400 });
    }
    const d = await db();
    const existing = await d.collection("purchases").findOne({ supplierId, invoiceNo });
    if (existing) return NextResponse.json({ error: "Yeh supplier invoice pehle se save hai." }, { status: 409 });
    const supplier = await d.collection("suppliers").findOne({ _id: new ObjectId(supplierId) });
    if (!supplier) return NextResponse.json({ error: "Supplier nahi mila." }, { status: 404 });
    const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.qty) * Number(item.costPrice), 0);
    const tcs = Number(body.tcs || 0), bilty = Number(body.bilty || 0), freight = Number(body.freight || 0), otherExpense = Number(body.otherExpense || 0);
    const paid = Number(body.paid || 0), total = subtotal + tcs + bilty + freight + otherExpense;
    if (![tcs, bilty, freight, otherExpense, paid].every(Number.isFinite) || [tcs, bilty, freight, otherExpense, paid].some(n => n < 0) || paid > total) return NextResponse.json({ error: "Purchase expenses or payment amount are invalid; paid amount cannot exceed total." }, { status: 400 });
    const session = client.startSession();
    let saved: any = null;
    try {
      await session.withTransaction(async () => {
        for (const item of items) {
          const productId = String(item.productId);
          const product = await d.collection("products").findOneAndUpdate({ _id: new ObjectId(productId) }, { $inc: { stock: Number(item.qty) }, $set: { costPrice: Number(item.costPrice), updatedAt: new Date() } }, { session, returnDocument: "after" });
          if (!product) throw new Error(`Product not found: ${item.name || productId}`);
          await d.collection("stockMovements").insertOne({ type: "IN", productId, qty: Number(item.qty), ref: invoiceNo, reason: "Purchase", costPrice: Number(item.costPrice), user: user.u, createdAt: new Date() }, { session });
        }
        const purchase = { ...body, supplierName: supplier.name || "", invoiceNo, items, subtotal, total, paid, remaining: total - paid, status: total - paid > 0 ? "credit" : "paid", createdAt: new Date(), updatedAt: new Date(), createdBy: user.u };
        delete purchase._id;
        const result = await d.collection("purchases").insertOne(purchase, { session });
        saved = { ...purchase, _id: result.insertedId.toString() };
        if (paid > 0) await d.collection("transactions").insertOne({ type: "OUT", account: body.paymentMethod || "Cash", amount: paid, ref: invoiceNo, supplierId, party: supplier.name || "", note: "Purchase payment", user: user.u, createdAt: new Date() }, { session });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally { await session.endSession(); }
    return NextResponse.json({ ok: true, ...saved }, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Purchase save nahi hui. Stock update bhi nahi hua." }, { status: 409 }); }
}
