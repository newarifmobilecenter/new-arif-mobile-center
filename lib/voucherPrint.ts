import { SHOP_PHONES } from "./shopOptions";

const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const KIND: Record<string, { title: string; label: string; incoming: boolean; balanceLabel: string }> = {
  CUSTOMER_RECEIVE: { title: "PAYMENT RECEIVED", label: "Wasool hui raqam", incoming: true, balanceLabel: "Customer ka baqi" },
  WALKING_RECEIVE: { title: "PAYMENT RECEIVED", label: "Wasool hui raqam", incoming: true, balanceLabel: "Walking customer ka baqi" },
  RECEIVE: { title: "RECEIVE VOUCHER", label: "Wasool hui raqam", incoming: true, balanceLabel: "Baqi" },
  SUPPLIER_PAY: { title: "PAYMENT PAID", label: "Ada ki gayi raqam", incoming: false, balanceLabel: "Supplier ko dene baqi" },
  PARTY_PAY: { title: "PAYMENT PAID", label: "Ada ki gayi raqam", incoming: false, balanceLabel: "Party ko dene baqi" },
  OWNER_PAY: { title: "OWNER CASH OUT", label: "Owner ne nikali raqam", incoming: false, balanceLabel: "Baqi" },
  PAY: { title: "PAY VOUCHER", label: "Ada ki gayi raqam", incoming: false, balanceLabel: "Baqi" },
  OLD_BALANCE_CUSTOMER: { title: "OLD BALANCE ENTRY", label: "Purana baqi darj", incoming: false, balanceLabel: "Customer ka baqi" },
  OLD_BALANCE_SUPPLIER: { title: "OLD BALANCE ENTRY", label: "Purana baqi darj", incoming: false, balanceLabel: "Supplier ko dene baqi" },
};

export const VOUCHER_CSS = `
.vr{width:80mm;max-width:100%;box-sizing:border-box;margin:0 auto;padding:3mm 4mm;background:#fff;color:#000;font:12px/1.35 Arial,Helvetica,sans-serif;font-weight:800;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.vr .head{display:grid;grid-template-columns:52px 1fr;gap:8px;align-items:center}
.vr .logo{display:grid;place-items:center;height:56px;border:3px solid #000;border-radius:9px;font-size:10px;line-height:1.05;text-align:center}
.vr .brand{text-align:center}.vr .name{font-size:21px;font-weight:900;line-height:1}.vr .sub{font-size:12px;letter-spacing:1px}.vr .svc{font-size:7.5px}
.vr .tag{margin:3px 0;text-align:center;font-style:italic;font-size:12px}
.vr .bar{background:#000;color:#fff;border-radius:4px;text-align:center;font-weight:900;padding:4px;letter-spacing:1px}
.vr .t{font-size:15px}.vr .c{font-size:13px;margin-top:8px}
.vr .meta{display:grid;gap:2px;margin:6px 0;padding-bottom:6px;border-bottom:1px dashed #000}
.vr .meta div,.vr .tot div{display:flex;justify-content:space-between;gap:8px}.vr .meta b{text-align:right}
.vr .no{border:1.5px solid #000;border-radius:4px;padding:0 6px;font-size:14px}
.vr .party{margin:4px 0;padding:5px 6px;border:1.5px solid #000;border-radius:6px}.vr .party b{font-size:15px;display:block}
.vr .tot{display:grid;gap:3px;margin-top:6px}
.vr .net{margin:2px 0;padding:4px 6px;border:2px solid #000;border-radius:4px;font-size:15px;font-weight:900}
.vr .note{margin-top:6px;font-size:11px}
.vr .sig{display:flex;justify-content:space-between;margin-top:18px;font-size:10px}.vr .sig span{border-top:1px solid #000;padding-top:2px;width:42%;text-align:center}
.vr .shop{display:grid;gap:1px;margin-top:8px;text-align:center;font-size:11px}.vr .shop b{font-size:13px}
.vr .foot{margin-top:6px;padding-top:4px;border-top:1px solid #000;text-align:center;font-size:10px;font-style:italic}
`;

export function voucherBody(v: any) {
  const k = KIND[String(v?.kind)] || KIND.RECEIVE;
  const when = v?.createdAt ? new Date(v.createdAt) : new Date();
  const date = when.toLocaleDateString("en-PK", { dateStyle: "medium" }), time = when.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  const hasBal = v?.prevBalance !== null && v?.prevBalance !== undefined && v?.newBalance !== null && v?.newBalance !== undefined;
  return `<div class="vr">
  <div class="head"><div class="logo"><b>NEW<br>ARIF<br>MOBILE</b></div><div class="brand"><div class="name">NEW ARIF MOBILE</div><div class="sub">MOBILE &amp; REPAIRING</div><div class="svc">SALES | REPAIRING | ACCESSORIES | SOFTWARE</div></div></div>
  <div class="tag">Your Phone Our Care</div>
  <div class="bar t">${esc(k.title)}</div>
  <div class="meta"><div><span>Voucher No</span><b class="no">${esc(v?.voucherNo || "-")}</b></div><div><span>Date</span><b>${esc(date)}</b></div><div><span>Time</span><b>${esc(time)}</b></div><div><span>Account</span><b>${esc(v?.account || "-")}</b></div></div>
  <div class="party">${esc(v?.partyType === "walking" ? "Walking Customer" : v?.partyType === "supplier" ? "Supplier" : v?.partyType === "customer" ? "Customer" : "Party")}<b>${esc(v?.partyName || "-")}</b>${v?.phone ? `<span>${esc(v.phone)}</span>` : ""}</div>
  <div class="tot">
    ${hasBal ? `<div><span>Pichla baqi (Previous)</span><b>Rs. ${money(v.prevBalance)}</b></div>` : ""}
    <div class="net"><div><span>${esc(k.label)}</span><b>Rs. ${money(v?.amount)}</b></div></div>
    ${hasBal ? `<div><span>Maujooda baqi (Current)</span><b>Rs. ${money(v.newBalance)}</b></div>` : ""}
  </div>
  ${v?.note ? `<div class="note">Detail: ${esc(v.note)}</div>` : ""}
  <div class="sig"><span>Receiver</span><span>${esc(v?.partyType === "other" ? "Party" : "Customer / Party")}</span></div>
  <div class="bar c">--- COPY ---</div>
  <div class="shop"><b>New Arif Mobile</b><span>Al saif plaza kamar mushani, mianwali</span><span>${esc(SHOP_PHONES.join(" | "))}</span></div>
  <div class="foot">Shukriya! | Quality Service | Happy Customers</div></div>`;
}

export function printVoucher(v: any) {
  // Hidden iframe: no popup blocker, prints only the voucher.
  const old = document.getElementById("voucher-print-frame");
  if (old) old.remove();
  const f = document.createElement("iframe");
  f.id = "voucher-print-frame";
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const doc = f.contentWindow!.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(v?.voucherNo || "Voucher")}</title><style>@page{size:auto;margin:0}body{margin:0;background:#fff}${VOUCHER_CSS}</style></head><body>${voucherBody(v)}</body></html>`);
  doc.close();
  window.setTimeout(() => { try { f.contentWindow!.focus(); f.contentWindow!.print(); } catch {} }, 300);
}
