import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getSession();
  if (!sessionUser) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (String(body.type || "").toUpperCase() === "RETURN") {
    return NextResponse.json({ error: "Process returns through the sale return workflow." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return NextResponse.json({ error: "At least one item is required." }, { status: 400 });
  if (items.some((item:any) => !Number.isInteger(Number(item.qty)) || Number(item.qty) <= 0 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0)) {
    return NextResponse.json({ error: "Each item must have a positive whole quantity and a valid non-negative price." }, { status: 400 });
  }

  const num = (v:any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const [freight, discountPct, salesTaxPct, paid] = [
    body.freight ?? 0,
    body.discountPct ?? 0,
    body.salesTaxPct ?? 0,
    body.paid ?? 0,
  ].map(Number);
  if (![freight, discountPct, salesTaxPct, paid].every(Number.isFinite) || freight < 0 || discountPct < 0 || discountPct > 100 || salesTaxPct < 0 || paid < 0) {
    return NextResponse.json({ error: "Freight, percentages, and paid amount must be valid non-negative values; discount cannot exceed 100%." }, { status: 400 });
  }
  const subtotal = items.reduce((sum:any, i:any) => sum + num(i.qty) * num(i.price), 0);
  const discountAmount = subtotal * discountPct / 100;
  const taxable = Math.max(0, subtotal - discountAmount + freight);
  const salesTaxValue = taxable * salesTaxPct / 100;
  const netTotal = Math.max(0, taxable + salesTaxValue);
  if (paid > netTotal + 0.000001) {
    return NextResponse.json({ error: "Paid amount cannot exceed the net total." }, { status: 400 });
  }
  const remaining = Math.max(0, netTotal - paid);

  const d = await db();
  const sales = d.collection("sales");
  const products = d.collection("products");
  const movements = d.collection("stockMovements");
  const transactions = d.collection("transactions");

  const normalizedItems = items.map((i:any) => ({
    ...i,
    qty: num(i.qty),
    price: num(i.price),
    total: num(i.qty) * num(i.price),
  }));

  const session = client.startSession();
  try {
    let saved:any;
    await session.withTransaction(async () => {
      for (const item of normalizedItems) {
        if (!item.productId) continue;
        if (!ObjectId.isValid(String(item.productId))) throw new Error(`Invalid product: ${item.name || "item"}`);
        const updated = await products.findOneAndUpdate(
          { _id: new ObjectId(String(item.productId)), stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty }, $set: { updatedAt: new Date() } },
          { session, returnDocument: "after" }
        );
        if (!updated) throw new Error(`Insufficient stock for ${item.name || "item"}.`);
        await movements.insertOne({
          type: "OUT",
          productId: String(item.productId),
          qty: item.qty,
          reason: "Sale",
          ref: String(body.invoiceNo || ""),
          user: sessionUser.u,
          createdAt: new Date(),
        }, { session });
      }

      const sale = {
        ...body,
        items: normalizedItems,
        subtotal,
        discountAmount,
        discountPct,
        freight,
        salesTaxValue,
        salesTaxPct,
        grandTotal: subtotal,
        total: netTotal,
        netTotal,
        paid,
        remaining,
        status: remaining > 0 ? "credit" : "paid",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      delete (sale as any)._id;
      saved = await sales.insertOne(sale, { session });

      if (paid > 0) {
        await transactions.insertOne({
          type: "IN",
          account: body.paymentMethod || "Cash",
          amount: paid,
          ref: body.invoiceNo || null,
          customerId: body.customerId || null,
          note: "Sale",
          user: sessionUser.u,
          createdAt: new Date(),
        }, { session });
      }
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });

    return NextResponse.json({
      ok: true,
      _id: saved.insertedId.toString(),
      ...body,
      items: normalizedItems,
      subtotal,
      discountAmount,
      discountPct,
      freight,
      salesTaxValue,
      salesTaxPct,
      grandTotal: subtotal,
      total: netTotal,
      netTotal,
      paid,
      remaining,
      status: remaining > 0 ? "credit" : "paid",
    }, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Sale transaction failed. Nothing was saved." }, { status: 409 });
  } finally {
    await session.endSession();
  }
}
