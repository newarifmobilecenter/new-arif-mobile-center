import { SHOP } from "./shop";
import { jsPDF } from "jspdf";
import { billPhones } from "./shopOptions";
import { groupItems, shortItemName } from "./saleReceiptUtil";
import { cachedBill, logoLinesOf, warrantiesFor, type BillSettings } from "./billSettings";

const W = 80, M = 4, CW = W - M * 2;
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

function draw(pdf: jsPDF, sale: any, customerName: string, customerPhone: string, bill: BillSettings): number {
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
  pdf.setLineWidth(0.7); pdf.roundedRect(M, y, 12, 11, 2, 2, "S");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
  const ll = logoLinesOf(bill, SHOP.logoLines);
  ll.forEach((l, i) => txt(l, M + 6, y + (11 - 3 * ll.length) / 2 + 2.4 + 3 * i, { align: "center" }));
  const cx = M + 12 + (CW - 12) / 2;
  pdf.setFontSize(13); txt(SHOP.shortUpper, cx, y + 5, { align: "center" });
  pdf.setFontSize(4.8); txt("SALES | REPAIRING | ACCESSORIES | SOFTWARE", cx, y + 9, { align: "center" });
  y += 13.5;
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(7.5); txt("Your Phone Our Care", W / 2, y, { align: "center" }); y += 1.5;
  bar("SALE INVOICE", 10, 6); y += 3;

  // meta: 2 lines (Inv/Date/Time, Customer/Payment)
  const isRepair = items.some((i) => /^repair\b/i.test(String(i.name || "")) || (i as any).repairId);
  const who = (customerName || `${sale?.cashRef ? String(sale.cashRef) : "Walking Customer"} (${isRepair ? "Repair" : "Cash Sale"})`) + (customerPhone ? ` · ${customerPhone}` : "");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  const inv = `Inv ${String(sale?.invoiceNo || "-")}`;
  txt(inv, M, y); txt(date, W / 2, y, { align: "center" }); txt(time, W - M, y, { align: "right" }); y += 4.2;
  const pay = sale?.paymentMethod ? String(sale.paymentMethod) : "";
  const payW = pay ? pdf.getTextWidth(pay) + 2 : 0;
  const whoLine: string = pdf.splitTextToSize(who, CW - payW)[0] || who;
  txt(whoLine, M, y); if (pay) txt(pay, W - M, y, { align: "right" }); y += 3.2;
  pdf.setLineDashPattern([0.8, 0.8], 0); pdf.setLineWidth(0.2); pdf.line(M, y, W - M, y); pdf.setLineDashPattern([], 0); y += 2;

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
      const lines: string[] = pdf.splitTextToSize(shortItemName(i.name || "Product"), 30);
      txt(String(k + 1), M + 1, y + 3.3);
      lines.forEach((ln, li) => txt(ln, M + 6, y + 3.3 + li * 3.2));
      txt(String(i.qty), cQty, y + 3.3, { align: "right" }); txt(money(i.price), cRate + 3, y + 3.3, { align: "right" });
      txt(money(i.total ?? Number(i.price || 0) * Number(i.qty || 0)), cAmt - 1, y + 3.3, { align: "right" });
      y += 1.2 + lines.length * 3.2;
      if (Array.isArray((i as any).parts)) for (const x of (i as any).parts) { pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.2); let nm = String(x.name || ""); const suf = ` x${x.qty}`; // ek line: naam utna hi jitna fit ho
        while (nm.length > 1 && pdf.getTextWidth(`- ${nm}...${suf}`) > 34 && pdf.getTextWidth(`- ${nm}${suf}`) > 34) nm = nm.slice(0, -1);
        const pl: string[] = [pdf.getTextWidth(`- ${nm}${suf}`) <= 34 ? `- ${nm}${suf}` : `- ${nm.trimEnd()}...${suf}`]; pl.forEach((ln, li) => txt(ln, M + 6, y + 2.2 + li * 2.6)); y += 0.6 + pl.length * 2.6; }
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
  if (sale?.prevBalance != null) {
    tr("Previous Balance", `Rs. ${money(sale.prevBalance)}`); tr("Cash Received", `Rs. ${money(sale?.paid)}`);
    pdf.setLineWidth(0.6); pdf.roundedRect(M, y - 3.4, CW, 6.2, 1, 1, "S");
    pdf.setFontSize(10); txt("CURRENT BALANCE", M + 1.5, y + 0.9); txt(`Rs. ${money(Number(sale.prevBalance) + Number(sale?.remaining || 0))}`, W - M - 1.5, y + 0.9, { align: "right" }); y += 7;
  }

  // warranty (Settings se)
  const warrs = warrantiesFor(items, bill);
  if (warrs.length) {
    y += 1;
    const lines: string[] = [];
    for (const w of warrs) lines.push(...pdf.splitTextToSize(w.text, CW - 4));
    const h = 5 + lines.length * 3;
    pdf.setLineWidth(0.4); pdf.roundedRect(M, y, CW, h, 1.2, 1.2, "S");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); txt("WARRANTY", M + 2, y + 3.4);
    pdf.setFontSize(7); lines.forEach((ln, k) => txt(ln, M + 2, y + 6.6 + k * 3));
    y += h + 1;
  }

  // footer
  y += 2;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); txt(SHOP.address, W / 2, y, { align: "center" }); y += 3.2;
  pdf.setFontSize(6.5); txt(billPhones(sale?.priceLevel), W / 2, y, { align: "center" }); y += 3.2;
  pdf.setLineWidth(0.25); pdf.line(M, y, W - M, y); y += 3;
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(6.2);
  const f: string[] = pdf.splitTextToSize("Bill dikhaye baghair warranty nahi. Shukriya!", CW);
  f.forEach((ln) => { txt(ln, W / 2, y, { align: "center" }); y += 2.8; });
  return y + M;
}

export function makeSalePdf(sale: any, customerName = "", customerPhone = "", bill: BillSettings = cachedBill()) {
  const probe = new jsPDF({ unit: "mm", format: [W, 600] });
  const h = draw(probe, sale, customerName, customerPhone, bill);
  const pdf = new jsPDF({ unit: "mm", format: [W, Math.max(60, Math.ceil(h))] });
  draw(pdf, sale, customerName, customerPhone, bill);
  return pdf;
}
