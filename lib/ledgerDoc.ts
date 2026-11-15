import { SHOP } from "./shop";
import { SHOP_PHONES } from "./shopOptions";

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const money = (v: unknown) => n(v).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const dmy = (d: Date) => `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/,/g, "");
const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type LedgerRow = { date: Date; ref: string; kind: "SALE" | "REPAIR" | "PAYMENT" | "RETURN" | "REFUND" | "LOCAL" | "ADJ" | "OPEN"; title: string; lines?: { name: string; qty: number; amount: number }[]; debit: number; credit: number };

/** Customer ki saari entries (sale, repair, payment, return...) tarteeb se. Balance: + = customer ne dene hain (DR). */
export function buildLedgerRows(customerId: string, d: { sales: any[]; repairs: any[]; tx: any[]; returns: any[]; localBuys: any[] }, authoritativeBalance: number): LedgerRow[] {
  const id = String(customerId);
  const rows: LedgerRow[] = [];
  const mine = (x: any) => String(x?.customerId || "") === id;
  for (const s of d.sales.filter(mine)) {
    if (s.status === "cancelled") continue;
    const date = new Date(s.createdAt || Date.now());
    rows.push({ date, ref: String(s.invoiceNo || "-"), kind: s.isOpening ? "OPEN" : (s.items || []).some((i: any) => i.repairId) ? "REPAIR" : "SALE",
      title: s.isOpening ? "Purana baqi (Opening)" : "Bill",
      lines: s.isOpening ? [] : (s.items || []).map((i: any) => ({ name: String(i.name || "Item"), qty: n(i.qty) || 1, amount: n(i.total ?? n(i.qty) * n(i.price)) })),
      debit: n(s.total), credit: 0 });
  }
  const repairTokensPaid = new Set(d.tx.filter(mine).map((t) => `${t.ref || ""} ${t.note || ""}`.toUpperCase()));
  for (const r of d.repairs.filter((x) => mine(x) && !x.billedSaleId && x.recordType !== "ESTIMATE")) {
    const date = new Date(r.receivedAt || r.createdAt || Date.now());
    rows.push({ date, ref: String(r.tokenNo || "-"), kind: "REPAIR", title: `Repair ${r.tokenNo || ""} · ${r.model || ""}`, lines: [], debit: n(r.totalBill), credit: 0 });
    const tok = String(r.tokenNo || "").toUpperCase();
    const hasTx = tok && Array.from(repairTokensPaid).some((t) => t.includes(tok));
    if (n(r.paid) > 0 && !hasTx) rows.push({ date, ref: String(r.tokenNo || "-"), kind: "PAYMENT", title: "Repair payment (jama)", debit: 0, credit: n(r.paid) });
  }
  for (const t of d.tx.filter(mine)) {
    const date = new Date(t.createdAt || Date.now());
    if (t.type === "IN") rows.push({ date, ref: String(t.ref || "-"), kind: "PAYMENT", title: t.note === "Sale" ? "Cash Received (bill ke saath)" : `Cash Received${t.note ? " · " + t.note : ""}`, debit: 0, credit: n(t.amount) });
    else if (t.type === "OUT") rows.push({ date, ref: String(t.ref || "-"), kind: "REFUND", title: `Refund / wapsi${t.note ? " · " + t.note : ""}`, debit: n(t.amount), credit: 0 });
  }
  const seenRet = new Set<string>();
  for (const r of d.returns.filter((x) => x.type === "SALE_RETURN" && mine(x))) {
    const key = `${r.returnNo || r._id}`;
    const amt = n(r.amount);
    rows.push({ date: new Date(r.createdAt || Date.now()), ref: String(r.returnNo || "-"), kind: "RETURN", title: `Sale Return · ${r.productName || ""}`, debit: 0, credit: amt });
    seenRet.add(key);
  }
  for (const p of d.localBuys.filter(mine)) rows.push({ date: new Date(p.createdAt || Date.now()), ref: String(p.invoiceNo || "-"), kind: "LOCAL", title: "Humne maal liya (Local Purchase)", debit: 0, credit: n(p.total) });
  rows.sort((a, b) => +a.date - +b.date);
  // Hisaab ka milan: agar entries ka jod customer ke asli baqi se alag ho to farq ek line mein dikhayen.
  const calc = rows.reduce((a, r) => a + r.debit - r.credit, 0);
  const diff = Math.round((n(authoritativeBalance) - calc) * 100) / 100;
  if (Math.abs(diff) >= 1) rows.push({ date: new Date(), ref: "-", kind: "ADJ", title: "Hisaab milan (adjustment)", debit: diff > 0 ? diff : 0, credit: diff < 0 ? -diff : 0 });
  return rows;
}

export const LEDGER_CSS = `
.lg{width:900px;box-sizing:border-box;background:#fff;color:#0f172a;font-family:Arial,Helvetica,sans-serif;padding:24px 28px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.lg *{box-sizing:border-box}
.lg .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f172a;padding-bottom:10px}
.lg .shop h1{margin:0;font-size:21px;letter-spacing:.3px}.lg .shop p{margin:2px 0 0;font-size:11px;color:#475569}
.lg .ttl{background:#0f172a;color:#fff;padding:8px 18px;border-radius:6px;font-weight:800;letter-spacing:2px;font-size:15px}
.lg .info{display:flex;justify-content:space-between;margin:12px 0 10px;font-size:12.5px}
.lg .info .c b{font-size:17px;display:block;margin-bottom:2px}.lg .info .r{text-align:right;line-height:1.6}
.lg table{width:100%;border-collapse:collapse;font-size:12px}
.lg th{background:#0f172a;color:#fff;text-align:left;padding:7px 8px;font-size:11.5px}
.lg th.n,.lg td.n{text-align:right;white-space:nowrap}
.lg td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
.lg tr{page-break-inside:avoid}
.lg tr.bf td{background:#f1f5f9;font-weight:700}
.lg td.p b{display:block;margin-bottom:2px}
.lg .it{font-size:10.5px;color:#475569;display:flex;justify-content:space-between;gap:12px;max-width:430px;border-left:2px solid #cbd5e1;padding-left:6px;margin-top:1px}
.lg .it span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.lg tr.pay td{background:#f0fdf4}.lg .cr{color:#15803d;font-weight:700}
.lg .tag{font-size:9.5px;font-weight:800;padding:1px 5px;border-radius:4px;background:#e2e8f0;margin-right:4px}
.lg .tag.rp{background:#fef3c7}.lg .tag.py{background:#bbf7d0}.lg .tag.rt{background:#fecaca}.lg .tag.ad{background:#ddd6fe}
.lg .net{margin-top:10px;border:2px solid #0f172a;border-radius:8px;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-weight:800}
.lg .net .big{font-size:20px}
.lg .sum{display:flex;gap:10px;margin-top:10px}.lg .sum div{flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:11px;color:#475569}.lg .sum b{display:block;font-size:15px;color:#0f172a;margin-top:2px}
.lg .foot{margin-top:12px;font-size:10.5px;color:#64748b;display:flex;justify-content:space-between;border-top:1px dashed #94a3b8;padding-top:6px}
`;

const bal = (v: number) => v === 0 ? "0" : `${money(Math.abs(v))} ${v > 0 ? "DR" : "CR"}`;
const TAG: Record<string, string> = { SALE: '<span class="tag">SALE</span>', REPAIR: '<span class="tag rp">REPAIR</span>', PAYMENT: '<span class="tag py">PAYMENT</span>', RETURN: '<span class="tag rt">RETURN</span>', REFUND: '<span class="tag rt">REFUND</span>', LOCAL: '<span class="tag">PURCHASE</span>', ADJ: '<span class="tag ad">ADJ</span>', OPEN: '<span class="tag">OPENING</span>' };

export function ledgerHtml(o: { name: string; phone?: string; code?: string; from: string; to: string; rows: LedgerRow[] }) {
  const f = new Date(o.from + "T00:00:00"), t = new Date(o.to + "T23:59:59");
  let run = 0, bf = 0;
  const body: string[] = [];
  let sd = 0, sc = 0;
  for (const r of o.rows) {
    if (r.date < f) { bf += r.debit - r.credit; run = bf; }
  }
  run = bf;
  body.push(`<tr class="bf"><td></td><td></td><td>Brought Forward Balance</td><td class="n"></td><td class="n"></td><td class="n">${bal(bf)}</td></tr>`);
  for (const r of o.rows) {
    if (r.date < f || r.date > t) continue;
    run += r.debit - r.credit; sd += r.debit; sc += r.credit;
    const lines = (r.lines || []).slice(0, 12).map((l) => `<div class="it"><span>${esc(l.name)}</span><span>${l.qty} × ${money(l.amount / (l.qty || 1))}</span><span>${money(l.amount)}</span></div>`).join("");
    body.push(`<tr class="${r.credit > 0 && r.debit === 0 ? "pay" : ""}"><td>${esc(short(r.date))}</td><td>${esc(r.ref)}</td><td class="p"><b>${TAG[r.kind] || ""}${esc(r.title)}</b>${lines}</td><td class="n">${r.debit ? money(r.debit) : ""}</td><td class="n ${r.credit ? "cr" : ""}">${r.credit ? money(r.credit) : ""}</td><td class="n">${bal(run)}</td></tr>`);
  }
  const net = bf + sd - sc;
  return `<div class="lg">
<div class="top"><div class="shop"><h1>${esc(SHOP.nameUpper)}</h1><p>${esc(SHOP.address)} · ${esc(SHOP_PHONES.join(" | "))}</p></div><div class="ttl">CUSTOMER LEDGER</div></div>
<div class="info"><div class="c"><b>${esc(o.name)}</b>${o.phone ? "Phone: " + esc(o.phone) : ""}${o.code ? " · Code: " + esc(o.code) : ""}</div><div class="r">From: <b>${dmy(f)}</b> &nbsp; To: <b>${dmy(t)}</b><br>Print Date: ${dmy(new Date())}</div></div>
<table><thead><tr><th>Date</th><th>Ref</th><th>Particulars</th><th class="n">Debit (Bill)</th><th class="n">Credit (Wasool)</th><th class="n">Balance</th></tr></thead><tbody>${body.join("")}</tbody></table>
<div class="net"><span>NET BALANCE</span><span>Debit ${money(bf > 0 ? bf + sd : sd)} &nbsp;|&nbsp; Credit ${money(bf < 0 ? -bf + sc : sc)}</span><span class="big">Rs. ${bal(net)}</span></div>
<div class="sum"><div>Kul Bill<b>Rs. ${money(sd)}</b></div><div>Kul Wasool<b>Rs. ${money(sc)}</b></div><div>Pichla baqi (B/F)<b>Rs. ${bal(bf)}</b></div><div>Closing baqi<b>Rs. ${bal(net)}</b></div></div>
<div class="foot"><span>DR = customer ne dene hain · CR = humein dene hain</span><span>${esc(SHOP.short)}</span></div></div>`;
}
export const ledgerDefaultFrom = () => { const d = new Date(); d.setDate(d.getDate() - 30); return day(d); };
export const ledgerToday = () => day(new Date());
