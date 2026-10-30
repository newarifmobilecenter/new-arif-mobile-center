import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { ORDER_COLLECTION } from "@/lib/orderBookServer";

export const dynamic = "force-dynamic";
const s = (v: unknown, n = 160) => String(v ?? "").trim().slice(0, n);

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const d = await db();
    const all = req.nextUrl.searchParams.get("all") === "1";
    const rows = await d.collection(ORDER_COLLECTION).find(all ? {} : { status: { $in: ["OPEN", "ORDERED"] } }).sort({ createdAt: -1 }).limit(2000).toArray();
    return NextResponse.json(rows.map((r) => ({ ...r, _id: String(r._id) })));
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Order book load nahi hui." }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items.slice(0, 30) : [];
    const d = await db();
    const col = d.collection(ORDER_COLLECTION);
    const added: any[] = [];
    for (const it of items) {
      const name = s(it.name);
      if (!name) continue;
      const repairId = s(it.repairId, 40);
      const productId = ObjectId.isValid(s(it.productId, 40)) ? s(it.productId, 40) : null;
      const dup = await col.findOne({ status: { $in: ["OPEN", "ORDERED"] }, name, repairId: repairId || null, productId });
      if (dup) continue;
      const doc = { name, productId, category: s(it.category, 80) || "Other", qty: Math.max(1, Math.min(999, Math.floor(Number(it.qty) || 1))), urgent: true, repairId: repairId || null, token: s(it.token, 20), customerName: s(it.customerName, 120), model: s(it.model, 120), note: s(it.note, 200), source: repairId ? "repair" : "manual", status: "OPEN", createdBy: user.u, createdAt: new Date(), updatedAt: new Date() };
      const r = await col.insertOne(doc);
      added.push({ ...doc, _id: String(r.insertedId) });
    }
    return NextResponse.json({ ok: true, added }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Order book save nahi hua." }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const body = await req.json();
    const id = s(body?.id, 40), status = s(body?.status, 20).toUpperCase();
    if (!ObjectId.isValid(id) || !["OPEN", "ORDERED", "CANCELLED"].includes(status)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const d = await db();
    const r = await d.collection(ORDER_COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date(), updatedBy: user.u } });
    if (!r.matchedCount) return NextResponse.json({ error: "Order nahi mila." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Update nahi hua." }, { status: 500 }); }
}
