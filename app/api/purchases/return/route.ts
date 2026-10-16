import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const body = await req.json();
    const purchaseId = String(body.purchaseId || ""), productId = String(body.productId || ""), qty = Number(body.qty);
    const reason = String(body.reason || "Supplier Return").trim();
    if (!ObjectId.isValid(purchaseId) || !ObjectId.isValid(productId) || !Number.isInteger(qty) || qty <= 0) return NextResponse.json({ error: "Purchase, product, and a positive whole return quantity are required." }, { status: 400 });
    const d = await db(), purchases = d.collection("purchases"), products = d.collection("products"), returns = d.collection("returns"), movements = d.collection("stockMovements");
    const purchase = await purchases.findOne({ _id: new ObjectId(purchaseId) });
    if (!purchase) return NextResponse.json({ error: "Purchase invoice nahi mili." }, { status: 404 });
    const item = (purchase.items || []).find((row: any) => String(row.productId) === productId);
    if (!item) return NextResponse.json({ error: "Yeh product is purchase mein nahi hai." }, { status: 400 });
    const prior = await returns.aggregate([{ $match: { purchaseId, productId, type: "PURCHASE_RETURN" } }, { $group: { _id: null, qty: { $sum: "$qty" } } }]).toArray();
    const returnable = Math.max(0, Number(item.qty || 0) - Number(prior[0]?.qty || 0));
    if (qty > returnable) return NextResponse.json({ error: `Is invoice mein sirf ${returnable} quantity return ho sakti hai.` }, { status: 409 });
    const amount = Number(item.costPrice || 0) * qty;
    const session = client.startSession(); let remaining = Number(purchase.remaining || 0), supplierCredit = Number(purchase.supplierCredit || 0);
    try {
      await session.withTransaction(async () => {
        const stock = await products.findOneAndUpdate({ _id: new ObjectId(productId), stock: { $gte: qty } }, { $inc: { stock: -qty }, $set: { updatedAt: new Date() } }, { session, returnDocument: "after" });
        if (!stock) throw new Error("Current stock is less than return quantity.");
        const dueReduction = Math.min(remaining, amount); remaining -= dueReduction; supplierCredit += amount - dueReduction;
        await purchases.updateOne({ _id: purchase._id }, { $set: { remaining, supplierCredit, status: remaining > 0 ? "credit" : "paid", updatedAt: new Date() } }, { session });
        await returns.insertOne({ type: "PURCHASE_RETURN", purchaseId, invoiceId: purchase._id, invoiceNo: purchase.invoiceNo, supplierId: purchase.supplierId, productId, qty, amount, dueReduction, supplierCreditAdded: amount - dueReduction, reason, user: user.u, createdAt: new Date() }, { session });
        await movements.insertOne({ type: "OUT", productId, qty, ref: purchase.invoiceNo, reason: `Purchase return: ${reason}`, user: user.u, createdAt: new Date() }, { session });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally { await session.endSession(); }
    return NextResponse.json({ ok: true, invoiceNo: purchase.invoiceNo, qty, amount, remaining, supplierCredit });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Purchase return save nahi hua." }, { status: 409 }); }
}
