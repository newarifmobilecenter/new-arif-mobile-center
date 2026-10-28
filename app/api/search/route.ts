import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Hit = { type: string; title: string; sub: string; href: string };
const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const s = (v: unknown) => String(v ?? "").trim();
const money = (v: unknown) => `Rs. ${Number(v || 0).toLocaleString("en-PK")}`;
const day = (v: unknown) => { const d = v ? new Date(v as string) : null; return d && !isNaN(+d) ? d.toISOString().slice(0, 10) : ""; };
const join = (...p: unknown[]) => p.map(s).filter(Boolean).join(" · ");

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const q = s(req.nextUrl.searchParams.get("q")).slice(0, 60);
  if (q.length < 2) return NextResponse.json([]);
  try {
    const d = await db();
    const rx = new RegExp(esc(q), "i");
    const find = (col: string, fields: string[], extra: Record<string, unknown> = {}, or: Record<string, unknown>[] = []) =>
      d.collection(col).find({ ...extra, $or: [...fields.map(f => ({ [f]: rx })), ...or] }).sort({ createdAt: -1 }).limit(8).toArray();

    const customers = await find("customers", ["name", "phone", "address"]);
    const custIds = customers.map(c => c._id.toString());
    const idMatch: Record<string, unknown>[] = ObjectId.isValid(q) && q.length === 24 ? [{ _id: new ObjectId(q) }] : [];

    const [products, suppliers, sales, purchases, entries, quotations, expenses, vouchers] = await Promise.all([
      find("products", ["name", "code", "barcode", "sku", "brand", "category"]),
      find("suppliers", ["name", "phone"]),
      find("sales", ["invoiceNo", "customerName", "customerPhone"], {}, [...(custIds.length ? [{ customerId: { $in: custIds } }] : []), ...idMatch]),
      find("purchases", ["invoiceNo", "supplierName"]),
      find("notebookEntries", ["tokenNo", "entryNo", "customerName", "customerPhone", "model", "imei", "fault", "title", "note"], { deletedAt: { $in: [null] } }),
      find("quotations", ["quoteNo", "quotationNo", "customerName", "customerPhone"]),
      find("expenses", ["category", "description", "note", "title"]),
      find("transactions", ["party", "ref", "note", "description"]),
    ]);

    const out: Hit[] = [];
    for (const p of products) out.push({ type: "Product", title: s(p.name), sub: join(p.code ?? p.sku, p.barcode, p.brand, p.category, `Retail ${money(p.price)}`, `Stock ${p.stock ?? 0}`), href: "/admin" });
    for (const c of customers) out.push({ type: "Customer", title: s(c.name), sub: join(c.phone, c.address), href: `/customers/${c._id}` });
    for (const x of suppliers) out.push({ type: "Supplier", title: s(x.name), sub: join(x.phone), href: "/suppliers" });
    const custName = new Map(customers.map(c => [c._id.toString(), s(c.name)]));
    for (const x of sales) out.push({ type: "Sale / Invoice", title: s(x.invoiceNo) || `Sale ${x._id.toString().slice(-6)}`, sub: join(x.customerName || custName.get(s(x.customerId)), day(x.createdAt), money(x.total)), href: `/invoice/${x._id}` });
    for (const x of purchases) out.push({ type: "Purchase", title: s(x.invoiceNo), sub: join(x.supplierName, day(x.createdAt), money(x.total)), href: "/purchases/history" });
    for (const x of entries) {
      const repair = x.recordType === "REPAIR" || x.tokenNo;
      out.push(repair
        ? { type: "Repair / Receiving Slip", title: s(x.tokenNo) || s(x.entryNo), sub: join(x.customerName, x.customerPhone, x.model, x.status, day(x.receivedAt || x.createdAt)), href: `/repairs/${x._id}` }
        : { type: "Notebook / Voucher", title: s(x.entryNo || x.title), sub: join(x.customerName, x.customerPhone, day(x.createdAt)), href: `/notebook/${x._id}` });
    }
    for (const x of quotations) out.push({ type: "Quotation", title: s(x.quoteNo || x.quotationNo) || "Quotation", sub: join(x.customerName, day(x.createdAt), money(x.total)), href: "/quotations" });
    for (const x of expenses) out.push({ type: "Expense", title: s(x.category || x.title) || "Expense", sub: join(x.description || x.note, day(x.createdAt), money(x.amount)), href: "/expenses" });
    for (const x of vouchers) out.push({ type: "Voucher / Transaction", title: s(x.party || x.ref) || "Transaction", sub: join(x.type, x.account, money(x.amount), day(x.createdAt)), href: "/vouchers" });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Search failed" }, { status: 500 });
  }
}
