import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSession();
  if (!sessionUser) return NextResponse.json({ error: "Login required." }, { status: 401 });

  try {
    const body = await req.json();
    const saleId = String(body.saleId || "");
    const productId = String(body.productId || "");
    const qty = Number(body.qty);
    const reason = String(body.reason || "Customer Return").trim();

    if (!ObjectId.isValid(saleId) || !ObjectId.isValid(productId))
      return NextResponse.json({ error: "Invalid sale/product." }, { status: 400 });
    if (!Number.isInteger(qty) || qty <= 0)
      return NextResponse.json({ error: "Return quantity must be a positive whole number." }, { status: 400 });

    const d = await db();
    const sales = d.collection("sales");
    const returns = d.collection("returns");
    const products = d.collection("products");
    const transactions = d.collection("transactions");
    const movements = d.collection("stockMovements");

    const sale = await sales.findOne({ _id: new ObjectId(saleId) });
    if (!sale) return NextResponse.json({ error: "Sale not found." }, { status: 404 });

    const saleItems = (Array.isArray(sale.items) ? sale.items : []).filter((x:any) => String(x.productId || "") === productId);
    if (!saleItems.length) return NextResponse.json({ error: "Product is not part of this sale." }, { status: 400 });

    const previous = await returns.aggregate([
      { $match: { saleId, productId, type: "SALE_RETURN" } },
      { $group: { _id: null, qty: { $sum: "$qty" }, amount: { $sum: "$amount" } } }
    ]).toArray();
    const returnedQty = Number(previous[0]?.qty || 0);
    const alreadyReturnedAmount = Number(previous[0]?.amount || 0);
    const soldQty = saleItems.reduce((sum:number, row:any) => sum + Number(row.qty || 0), 0);
    if (returnedQty + qty > soldQty)
      return NextResponse.json({ error: `Only ${Math.max(0, soldQty - returnedQty)} item(s) are still returnable.` }, { status: 409 });

    const lineGross = saleItems.reduce((sum:number, row:any) => sum + Number(row.price || 0) * Number(row.qty || 0), 0);
    const itemDiscount = saleItems.reduce((sum:number, row:any) => sum + Number(row.discountAmount ?? Number(row.price || 0) * Number(row.qty || 0) * Number(row.discountPct || 0) / 100), 0);
    const invoiceGlobalDiscount = Number(sale.globalDiscountAmount ?? Math.max(0, Number(sale.discountAmount || 0) - Number(sale.lineDiscountAmount || 0)));
    const allocatedGlobalDiscount = lineGross > 0 ? invoiceGlobalDiscount * (lineGross / Math.max(0.000001, Number(sale.subtotal || lineGross))) : 0;
    const netLine = Math.max(0, lineGross - itemDiscount - allocatedGlobalDiscount);
    const taxFactor = 1 + Math.max(0, Number(sale.salesTaxPct || 0)) / 100;
    const amount = (netLine / soldQty) * qty * taxFactor;
    const salePaid = Number(sale.paid || 0);
    const saleRefunded = Number(sale.refunded || 0);
    const refundAvailable = Math.max(0, salePaid - saleRefunded);
    const refundAmount = Math.min(refundAvailable, amount);
    const unpaidReduction = Math.max(0, amount - refundAmount);

    const session = client.startSession();
    try {
      let result:any;
      await session.withTransaction(async () => {
        const updatedProduct = await products.findOneAndUpdate(
          { _id: new ObjectId(productId) },
          { $inc: { stock: qty }, $set: { updatedAt: new Date() } },
          { session, returnDocument: "after" }
        );
        if (!updatedProduct) throw new Error("Product not found.");

        await movements.insertOne({
          type: "IN",
          productId,
          qty,
          reason: `Sale return: ${reason}`,
          ref: sale.invoiceNo || saleId,
          user: sessionUser.u,
          createdAt: new Date(),
        }, { session });

        await returns.insertOne({
          type: "SALE_RETURN",
          saleId,
          invoiceId: sale._id,
          invoiceNo: sale.invoiceNo,
          productId,
          qty,
          amount,
          refundAmount,
          unpaidReduction,
          reason,
          user: sessionUser.u,
          createdAt: new Date(),
        }, { session });

        const newPaid = Math.max(0, salePaid - refundAmount);
        const newRemaining = Math.max(0, Number(sale.remaining || 0) - unpaidReduction);
        await sales.updateOne(
          { _id: sale._id },
          { $set: {
            paid: newPaid,
            remaining: newRemaining,
            refunded: saleRefunded + refundAmount,
            returnedAmount: alreadyReturnedAmount + amount,
            status: newRemaining > 0 ? "credit" : "paid",
            updatedAt: new Date(),
          }},
          { session }
        );

        if (refundAmount > 0) {
          await transactions.insertOne({
            type: "OUT",
            account: sale.paymentMethod || "Cash",
            amount: refundAmount,
            ref: sale.invoiceNo || saleId,
            customerId: sale.customerId || null,
            note: "Sale return refund",
            user: sessionUser.u,
            createdAt: new Date(),
          }, { session });
        }
        result = { newRemaining };
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });

      return NextResponse.json({
        ok: true,
        invoiceNo: sale.invoiceNo,
        returnedQty: returnedQty + qty,
        amount,
        refundAmount,
        remaining: result.newRemaining,
      });
    } finally {
      await session.endSession();
    }
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Return failed. Nothing was changed." }, { status: 409 });
  }
}
