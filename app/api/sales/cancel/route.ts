import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";
import { REPAIR_COLLECTION } from "@/lib/repairs";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (!hasRole(user, "ADMIN")) return NextResponse.json({ error: "Invoice cancel karne ke liye Admin access chahiye." }, { status: 403 });
  try {
    const body = await req.json();
    const saleId = String(body.saleId || "");
    const reason = String(body.reason || "Cancelled").trim().slice(0, 200);
    if (!ObjectId.isValid(saleId)) return NextResponse.json({ error: "Invalid invoice." }, { status: 400 });
    const d = await db();
    const sale = await d.collection("sales").findOne({ _id: new ObjectId(saleId) });
    if (!sale) return NextResponse.json({ error: "Invoice nahi mili." }, { status: 404 });
    if (sale.status === "cancelled") return NextResponse.json({ error: "Ye invoice pehle se cancel hai." }, { status: 409 });
    const hasReturns = await d.collection("returns").findOne({ saleId, type: "SALE_RETURN" });
    if (hasReturns) return NextResponse.json({ error: "Is invoice par return ho chuka hai, isay cancel nahi kiya ja sakta." }, { status: 409 });

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of Array.isArray(sale.items) ? sale.items : []) {
          if (!item.productId || !ObjectId.isValid(String(item.productId))) continue;
          await d.collection("products").updateOne({ _id: new ObjectId(String(item.productId)) }, { $inc: { stock: Number(item.qty || 0) }, $set: { updatedAt: new Date() } }, { session });
          await d.collection("stockMovements").insertOne({ type: "IN", productId: String(item.productId), qty: Number(item.qty || 0), reason: `Sale cancelled: ${reason}`, ref: sale.invoiceNo, user: user.u, createdAt: new Date() }, { session });
        }
        for (const item of Array.isArray(sale.items) ? sale.items : []) {
          if (!item.repairId || !ObjectId.isValid(String(item.repairId))) continue;
          const repair = await d.collection(REPAIR_COLLECTION).findOne({ _id: new ObjectId(String(item.repairId)), billedSaleId: saleId }, { session });
          if (!repair) continue;
          for (const part of Array.isArray(repair.parts) ? repair.parts : []) {
            if (!ObjectId.isValid(String(part.productId))) continue;
            const q = Math.max(1, Number(part.qty || 1));
            await d.collection("products").updateOne({ _id: new ObjectId(String(part.productId)) }, { $inc: { stock: q }, $set: { updatedAt: new Date() } }, { session });
            await d.collection("stockMovements").insertOne({ type: "IN", productId: String(part.productId), qty: q, reason: `Sale cancelled: repair ${repair.tokenNo}`, ref: sale.invoiceNo, user: user.u, createdAt: new Date() }, { session });
          }
          await d.collection(REPAIR_COLLECTION).updateOne({ _id: repair._id }, { $set: { billedSaleId: null, billedInvoiceNo: null }, $unset: { billedAt: "" } }, { session });
        }
        const paid = Number(sale.paid || 0);
        if (paid > 0) {
          await d.collection("transactions").insertOne({ type: "OUT", account: sale.paymentMethod || "Cash", amount: paid, ref: sale.invoiceNo, customerId: sale.customerId || null, note: `Sale cancelled: ${sale.invoiceNo}`, user: user.u, createdAt: new Date() }, { session });
        }
        await d.collection("sales").updateOne({ _id: sale._id }, { $set: { status: "cancelled", cancelReason: reason, cancelledAt: new Date(), cancelledBy: user.u, updatedAt: new Date() } }, { session });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally { await session.endSession(); }
    return NextResponse.json({ ok: true, invoiceNo: sale.invoiceNo });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Cancel nahi hua. Kuch change nahi hua." }, { status: 409 }); }
}
