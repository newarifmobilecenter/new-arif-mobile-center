import { jsPDF } from "jspdf";
import { SHOP_PHONES } from "./shopOptions";
import { groupItems, warrantyFlags } from "./saleReceiptUtil";

const W = 80, M = 4, CW = W - M * 2;
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

function draw(pdf: jsPDF, sale: any, customerName: string, customerPhone: string): number {
  const items: any[] = Array.isArray(sale?.items) ? sale.items : [];
  const when = sale?.createdAt ? new Date(sale.createdAt) : new Date();
  const date = when.toLocaleDateString("en-PK", { dateStyle: "medium" });
  const time = when.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  let y = M;
  const txt = (s: string, x: number, yy: number, o?: any) => (o ? pdf.text(s, x, yy, o) : pdf.text(s, x, yy));
  const bar = (label: string, size: number, h: number, round = 1) => {
    pdf.setFillColor(0, 0, 0); pdf.roundedRect(M, y, CW, h, round, round, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(size);
    txt(label, W / 2, y + h / 2 + size * 0.14, { align: "center" }); pdf.setTextColor(0, 0, 0);
    y += h;
  };
  pdf.setTextColor(0, 0, 0); pdf.setDrawColor(0, 0, 0);

  // header
  pdf.setLineWidth(0.7); pdf.roundedRect(M, y, 13, 14, 2, 2, "S");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(6);
  txt("NEW", M + 6.5, y + 4.6, { align: "center" }); txt("ARIF", M + 6.5, y + 7.6, { align: "center" }); txt("MOBILE", M + 6.5, y + 10.6, { align: "center" });
  const cx = M + 13 + (CW - 13) / 2;
  pdf.setFontSize(14); txt("NEW ARIF MOBILE", cx, y + 5.5, { align: "center" });
  pdf.setFontSize(8); txt("MOBILE & REPAIRING", cx, y + 9.5, { align: "center" });
  pdf.setFontSize(4.8); txt("SALES | REPAIRING | ACCESSORIES | SOFTWARE", cx, y + 12.4, { align: "center" });
  y += 17;
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(8); txt("Your Phone Our Care", W / 2, y, { align: "center" }); y += 2;
  bar("SALE INVOICE", 11, 7); y += 3;

  // meta
  const row = (l: string, v: string, big = false) => {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); txt(l, M, y);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(big ? 10 : 8);
    if (big) { const w = pdf.getTextWidth(v) + 3; pdf.setLineWidth(0.4); pdf.roundedRect(W - M - w, y - 3.4, w, 4.6, 1, 1, "S"); txt(v, W - M - 1.5, y, { align: "right" }); }
    else txt(v, W - M, y, { align: "right" });
    y += big ? 5.4 : 4.3;
  };
  row("Invoice No", String(sale?.invoiceNo || "-"), true); row("Date", date); row("Time", time);
  row("Customer", customerName || sale?.cashRef || "WALKING CUSTOMER");
  if (customerPhone) row("Phone", customerPhone);
  if (sale?.paymentMethod) row("Payment", String(sale.paymentMethod));
  pdf.setLineDashPattern([0.8, 0.8], 0); pdf.setLineWidth(0.2); pdf.line(M, y - 2, W - M, y - 2); pdf.setLineDashPattern([], 0); y += 1;

  // table
  const cQty = 47, cRate = 60, cAmt = W - M;
  pdf.setFillColor(0, 0, 0); pdf.rect(M, y, CW, 5, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
  txt("#", M + 1, y + 3.5); txt("Item", M + 6, y + 3.5); txt("Qty", cQty, y + 3.5, { align: "right" }); txt("Rate", cRate + 3, y + 3.5, { align: "right" }); txt("Amount", cAmt - 1, y + 3.5, { align: "right" });
  pdf.setTextColor(0, 0, 0); y += 5;
  for (const [cat, list] of groupItems(items)) {
    pdf.setFillColor(232, 232, 232); pdf.rect(M, y, CW, 4.2, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); txt(cat.toUpperCase(), M + 1, y + 3); y += 4.2;
    list.forEach((i, k) => {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
      const lines: string[] = pdf.splitTextToSize(String(i.name || "Product"), 30);
      txt(String(k + 1), M + 1, y + 3.3);
      lines.forEach((ln, li) => txt(ln, M + 6, y + 3.3 + li * 3.2));
      txt(String(i.qty), cQty, y + 3.3, { align: "right" }); txt(money(i.price), cRate + 3, y + 3.3, { align: "right" });
      txt(money(i.total ?? Number(i.price || 0) * Number(i.qty || 0)), cAmt - 1, y + 3.3, { align: "right" });
      y += 1.2 + lines.length * 3.2;
      if (i.imei || i.serial) { pdf.setFontSize(5.5); txt(`IMEI/Serial: ${i.imei || i.serial}`, M + 6, y + 0.6); y += 2.6; }
      pdf.setLineDashPattern([0.4, 0.6], 0); pdf.setLineWidth(0.15); pdf.line(M, y, W - M, y); pdf.setLineDashPattern([], 0); y += 0.8;
    });
  }

  // totals
  y += 1; pdf.setLineWidth(0.3); pdf.line(M, y, W - M, y); y += 4;
  const qtyTotal = items.reduce((n, i) => n + Number(i.qty || 0), 0);
  const tr = (l: string, v: string) => { pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); txt(l, M, y); txt(v, W - M, y, { align: "right" }); y += 4.3; };
  tr("Total Items", String(qtyTotal));
  if (Number(sale?.grandTotal) > 0 && Number(sale?.grandTotal) !== Number(sale?.total)) tr("Gross", `Rs. ${money(sale.grandTotal)}`);
  if (Number(sale?.discountAmount) > 0) tr("Discount", `- Rs. ${money(sale.discountAmount)}`);
  if (Number(sale?.salesTaxValue) > 0) tr("Sales Tax", `Rs. ${money(sale.salesTaxValue)}`);
  pdf.setLineWidth(0.6); pdf.roundedRect(M, y - 3.4, CW, 6.2, 1, 1, "S");
  pdf.setFontSize(10.5); txt("NET TOTAL", M + 1.5, y + 0.9); txt(`Rs. ${money(sale?.total)}`, W - M - 1.5, y + 0.9, { align: "right" }); y += 7;
  tr("Paid", `Rs. ${money(sale?.paid)}`); tr("Remaining", `Rs. ${money(sale?.remaining)}`);

  // warranty
  const wf = warrantyFlags(items);
  if (wf.battery || wf.panel) {
    y += 1.5;
    const lines: string[] = [];
    if (wf.battery) lines.push(...pdf.splitTextToSize("Battery: 7 days warranty - sirf battery timing (backup) ki. Physical damage / pani / ghalat istemal covered nahi.", CW - 4));
    if (wf.panel) lines.push(...pdf.splitTextToSize("Panel / Display: koi warranty ya guarantee nahi. Check karke lein.", CW - 4));
    const h = 5.5 + lines.length * 3.2;
    pdf.setLineWidth(0.4); pdf.roundedRect(M, y, CW, h, 1.2, 1.2, "S");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); txt("WARRANTY", M + 2, y + 3.6);
    pdf.setFontSize(7); lines.forEach((ln, k) => txt(ln, M + 2, y + 7 + k * 3.2));
    y += h + 1;
  }

  // footer
  y += 2; bar("--- CUSTOMER COPY ---", 9.5, 6.2); y += 4.5;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); txt("New Arif Mobile", W / 2, y, { align: "center" }); y += 3.8;
  pdf.setFontSize(7); txt("Al saif plaza kamar mushani, mianwali", W / 2, y, { align: "center" }); y += 3.4;
  pdf.setFontSize(6.2); txt(SHOP_PHONES.join(" | "), W / 2, y, { align: "center" }); y += 3.6;
  pdf.setLineWidth(0.25); pdf.line(M, y, W - M, y); y += 3.4;
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(6.2);
  const f: string[] = pdf.splitTextToSize("Bill dikhaye baghair warranty nahi. Shukriya! | Quality Service | Happy Customers", CW);
  f.forEach((ln) => { txt(ln, W / 2, y, { align: "center" }); y += 2.8; });
  return y + M;
}

export function makeSalePdf(sale: any, customerName = "", customerPhone = "") {
  const probe = new jsPDF({ unit: "mm", format: [W, 600] });
  const h = draw(probe, sale, customerName, customerPhone);
  const pdf = new jsPDF({ unit: "mm", format: [W, Math.max(60, Math.ceil(h))] });
  draw(pdf, sale, customerName, customerPhone);
  return pdf;
}
