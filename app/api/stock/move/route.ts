import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

const decrementTypes = new Set(["OUT", "DAMAGE", "EXPIRED"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  try {
    const body = await req.json();
    const productId = String(body.productId || "");
    const type = String(body.type || "IN").toUpperCase();
    const qty = Number(body.qty);
    const reason = String(body.reason || "Stock movement").trim();

    if (!ObjectId.isValid(productId)) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
    if (!["IN", "OUT", "DAMAGE", "EXPIRED"].includes(type)) return NextResponse.json({ error: "Invalid movement type." }, { status: 400 });
    if (!Number.isInteger(qty) || qty <= 0) return NextResponse.json({ error: "Quantity must be a positive whole number." }, { status: 400 });

    const d = await db();
    const products = d.collection("products");
    const movements = d.collection("stockMovements");
    const _id = new ObjectId(productId);

    const filter = decrementTypes.has(type) ? { _id, stock: { $gte: qty } } : { _id };
    const delta = decrementTypes.has(type) ? -qty : qty;
    const updated = await products.findOneAndUpdate(
      filter,
      { $inc: { stock: delta }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!updated) {
      const exists = await products.findOne({ _id }, { projection: { stock: 1 } });
      if (!exists) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      return NextResponse.json({ error: `Insufficient stock. Available: ${Number(exists.stock || 0)}.` }, { status: 409 });
    }

    try {
      await movements.insertOne({
        type,
        productId,
        qty,
        reason,
        ref: body.ref || null,
        user: session.u,
        createdAt: new Date(),
      });
    } catch (e) {
      // Roll back the stock change if the movement record cannot be written.
      await products.updateOne({ _id }, { $inc: { stock: -delta }, $set: { updatedAt: new Date() } });
      throw e;
    }

    return NextResponse.json({
      ok: true,
      productId,
      stock: Number(updated.stock || 0),
      movement: { type, qty, reason },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stock movement failed." }, { status: 500 });
  }
}
