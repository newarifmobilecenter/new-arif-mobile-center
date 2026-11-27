import { cachedBill, logoLinesOf } from "./billSettings";
import { SHOP } from "./shop";
import { SHOP_PHONES } from "./shopOptions";
import { VOUCHER_CSS } from "./voucherPrint";

const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export type ReturnMeta = { prevBalance?: number | null; newBalance?: number | null; live?: boolean };

/** Ek returnNo ke saare item-rows (returns collection) ko ek slip ke liye jama karta hai. */
export function returnDocs(all: any[], returnNo: string, fallbackId?: string) {
  return all.filter((r) => (returnNo && returnNo !== "-" ? String(r.returnNo) === returnNo : String(r._id) === fallbackId))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
}

const RETURN_CSS = VOUCHER_CSS + `
.vr .items{width:100%;border-collapse:collapse;margin:4px 0;font-size:11px}
.vr .items th{border-bottom:1.5px solid #000;text-align:left;padding:2px 2px}
.vr .items td{border-bottom:1px dashed #000;padding:3px 2px;vertical-align:top}
.vr .items .r{text-align:right;white-space:nowrap}
`;

export function returnBody(docs: any[], meta: ReturnMeta = {}) {
  const f = docs[0] || {};
  const when = f.createdAt ? new Date(f.createdAt) : new Date();
  const date = when.toLocaleDateString("en-PK", { dateStyle: "medium" }), time = when.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  const total = docs.reduce((n, d) => n + Number(d.amount || 0), 0);
  const adjusted = docs.reduce((n, d) => n + Number(d.unpaidReduction || 0), 0);
  const refund = docs.reduce((n, d) => n + Number(d.refundAmount || 0), 0);
  const stored = f.prevBalance != null && f.newBalance != null;
  const m: ReturnMeta = stored ? { prevBalance: Number(f.prevBalance), newBalance: Number(f.newBalance) } : meta;
  const hasBal = m.prevBalance != null && m.newBalance != null;
  const rows = docs.map((d, i) => `<tr><td>${i + 1}</td><td>${esc(d.productName || "Item")}</td><td class="r">${esc(d.qty)}</td><td class="r">${money(d.rate)}</td><td class="r">${money(d.amount)}</td></tr>`).join("");
  return `<div class="vr">
  <div class="head"><div class="logo"><b>${logoLinesOf(cachedBill(), SHOP.logoLines).map(esc).join("<br>")}</b></div><div class="brand"><div class="name">${esc(SHOP.shortUpper)}</div></div></div>
  <div class="tag">Your Phone Our Care</div>
  <div class="bar t">SALE RETURN</div>
  <div class="meta"><div><span>Return No</span><b class="no">${esc(f.returnNo || "-")}</b></div><div><span>Date</span><b>${esc(date)}</b></div><div><span>Time</span><b>${esc(time)}</b></div>${f.reason ? `<div><span>Reason</span><b>${esc(f.reason)}</b></div>` : ""}</div>
  <div class="party">${f.customerId ? "Customer" : "Cash Customer"}<b>${esc(f.customerName || "CASH")}</b></div>
  <table class="items"><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot">
    ${hasBal ? `<div><span>Pichla baqi (Previous)${m.live ? "*" : ""}</span><b>Rs. ${money(m.prevBalance)}</b></div>` : ""}
    <div class="net"><div><span>Total Return</span><b>Rs. ${money(total)}</b></div></div>
    ${adjusted > 0 ? `<div><span>Balance se less</span><b>Rs. ${money(adjusted)}</b></div>` : ""}
    ${refund > 0 ? `<div><span>Cash wapas diya</span><b>Rs. ${money(refund)}</b></div>` : ""}
    ${hasBal ? `<div><span>Maujooda baqi (Current)${m.live ? "*" : ""}</span><b>Rs. ${money(m.newBalance)}</b></div>` : ""}
  </div>
  ${hasBal && m.live ? `<div class="note">* Ye return purana hai: baqi abhi ke hisab se likha hai.</div>` : ""}
  <div class="sig"><span>Receiver</span><span>Customer</span></div>
  <div class="bar c">--- COPY ---</div>
  <div class="shop"><b>${esc(SHOP.short)}</b><span>${esc(SHOP.address)}</span><span>${esc(SHOP_PHONES.join(" | "))}</span></div>
  <div class="foot">Shukriya! | Quality Service | Happy Customers</div></div>`;
}

export function printReturn(docs: any[], meta: ReturnMeta = {}) {
  const old = document.getElementById("return-print-frame");
  if (old) old.remove();
  const f = document.createElement("iframe");
  f.id = "return-print-frame";
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const doc = f.contentWindow!.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(docs[0]?.returnNo || "Sale Return")}</title><style>@page{size:auto;margin:0}body{margin:0;background:#fff}${RETURN_CSS}</style></head><body>${returnBody(docs, meta)}</body></html>`);
  doc.close();
  window.setTimeout(() => { try { f.contentWindow!.focus(); f.contentWindow!.print(); } catch {} }, 300);
}

/** Return slip ko PNG bana kar save ("png") ya WhatsApp par share ("whatsapp") karta hai. */
export async function shareReturn(docs: any[], mode: "png" | "whatsapp", meta: ReturnMeta = {}) {
  const { htmlToPng, downloadBlob, sharePng } = await import("./shareSlip");
  const blob = await htmlToPng(returnBody(docs, meta), RETURN_CSS, 320, 3);
  const no = docs[0]?.returnNo || "return";
  if (mode === "png") { downloadBlob(blob, `${no}.png`); return; }
  const total = docs.reduce((n, d) => n + Number(d.amount || 0), 0);
  await sharePng(blob, `${no}.png`, `${SHOP.nameUpper}\nSale Return ${no}\nRs. ${money(total)}`);
}
