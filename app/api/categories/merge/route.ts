import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Do category ko aik karna (Admin only): "from" category ke sab products / options / orders / auto-rules "to" category mein chale jate hain.
// Koi product delete nahi hota; sirf category ka naam badalta hai.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return fail("Login required.", 401);
  if (!hasRole(user, "ADMIN")) return fail("Category merge sirf Admin kar sakta hai.", 403);
  try {
    const body = await req.json();
    const from = String(body.from || "").trim();
    const to = String(body.to || "").trim();
    if (!from || !to) return fail("Dono category chunein.");
    if (from === to) return fail("Dono category aik hi hain.");
    const d = await db();
    const products = (await d.collection("products").updateMany({ category: from }, { $set: { category: to, updatedAt: new Date() } })).modifiedCount;
    const orders = (await d.collection("orders").updateMany({ category: from }, { $set: { category: to } })).modifiedCount;
    const opts = d.collection("productOptions");
    // Category ki apni entry: agar "to" pehle se hai to "from" wali hata dein, warna uska naam badal dein.
    const toExists = await opts.findOne({ type: "category", name: to });
    let options = 0;
    if (toExists) options += (await opts.deleteMany({ type: "category", name: from })).deletedCount;
    else options += (await opts.updateMany({ type: "category", name: from }, { $set: { name: to } })).modifiedCount;
    // Wo options (brand, type...) jo is category ke saath bandhe thay.
    options += (await opts.updateMany({ type: { $ne: "category" }, category: from }, { $set: { category: to } })).modifiedCount;
    // Auto-select rules mein category ka naam.
    const rulesDoc = await opts.findOne({ type: "autoRules" });
    let rules = 0;
    if (rulesDoc && Array.isArray(rulesDoc.rules)) {
      const next = rulesDoc.rules.map((r: any) => (r && r.category === from ? (rules++, { ...r, category: to }) : r));
      if (rules) await opts.updateOne({ _id: rulesDoc._id }, { $set: { rules: next } });
    }
    return NextResponse.json({ ok: true, products, orders, options, rules });
  } catch (e: any) {
    return fail(e?.message || "Category merge nahi hui.", 500);
  }
}
