// TEMP-RATELIST: purani Excel rate list se product ki cost dhoondhna. Kaam khatam hone par ye poori file hata dein.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
const COL = "rateList";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const deny = (s: any) => !s || !hasRole(s, "ADMIN");

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (deny(s)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const c = (await db()).collection(COL);
    const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase().split(/[\s/,+-]+/).filter(Boolean).slice(0, 6);
    if (!q.length) return NextResponse.json({ count: await c.estimatedDocumentCount(), rows: [] });
    const rows = await c.find({ $and: q.map((t) => ({ hay: { $regex: esc(t) } })) }).limit(60).toArray();
    rows.sort((a: any, b: any) => String(a.hay).length - String(b.hay).length);
    return NextResponse.json({ rows: rows.slice(0, 12).map((r: any) => ({ company: r.company, model: r.model, part: r.part, cost: r.cost })) });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Search nahi hui." }, { status: 500 }); }
}

/** body: { rows: [{company, model, part, cost}], replace?: boolean } */
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (deny(s)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    const b = await req.json();
    const rows = (Array.isArray(b?.rows) ? b.rows : []).slice(0, 20000).map((r: any) => {
      const company = String(r.company ?? "").trim().slice(0, 80), model = String(r.model ?? "").trim().slice(0, 200), part = String(r.part ?? "").trim().slice(0, 80), cost = Number(r.cost);
      return { company, model, part, cost, hay: `${company} ${model} ${part}`.toLowerCase() };
    }).filter((r: any) => r.model && r.cost > 0);
    if (!rows.length) return NextResponse.json({ error: "Koi sahi line nahi mili (Company, Model, Part, Cost)." }, { status: 400 });
    const c = (await db()).collection(COL);
    if (b?.replace !== false) await c.deleteMany({});
    await c.insertMany(rows);
    return NextResponse.json({ ok: true, imported: rows.length });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Import nahi hua." }, { status: 500 }); }
}

export async function DELETE() {
  const s = await getSession();
  if (deny(s)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try { await (await db()).collection(COL).deleteMany({}); return NextResponse.json({ ok: true }); }
  catch (e: any) { return NextResponse.json({ error: e?.message || "Delete nahi hua." }, { status: 500 }); }
}
