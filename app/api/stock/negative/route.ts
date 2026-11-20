import { NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Minus stock wale products: jo stock zero hone par bhi sale ho gaye aur ab purchase chahiye. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const d = await db();
    const rows = await d.collection("products").find({ stock: { $lt: 0 } }, { projection: { name: 1, model: 1, code: 1, sku: 1, stock: 1 } }).sort({ stock: 1 }).limit(500).toArray();
    return NextResponse.json({ count: rows.length, items: rows.map((r: any) => ({ id: String(r._id), name: String(r.name || r.model || "Product"), code: String(r.code ?? r.sku ?? ""), stock: Number(r.stock || 0) })) });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Load nahi hua." }, { status: 500 }); }
}
