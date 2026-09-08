"use client";
import { useState } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";

function makePdf(invoice: any) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const left = 15;
  let y = 18;
  const money = (v: any) => `Rs. ${Number(v || 0).toLocaleString("en-PK")}`;

  pdf.setFontSize(18); pdf.setFont("helvetica", "bold");
  pdf.text("NEW ARIF MOBILE CENTER", 105, y, { align: "center" }); y += 7;
  pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
  pdf.text("Mobile Parts • Repairing • Better Service", 105, y, { align: "center" }); y += 8;
  pdf.line(left, y, 195, y); y += 7;

  pdf.setFont("helvetica", "bold"); pdf.text(`Invoice: ${invoice.invoiceNo || "-"}`, left, y);
  pdf.setFont("helvetica", "normal"); pdf.text(`Date: ${new Date(invoice.createdAt).toLocaleString()}`, left, y + 6);
  pdf.text(`Customer: ${invoice.customerName || "Cash Sale"}`, left, y + 12);
  pdf.text(`Mobile: ${invoice.customerPhone || "-"}`, left, y + 18);
  pdf.text(`Pickup By: ${invoice.pickupBy || "Customer"}`, left, y + 24); y += 32;

  pdf.line(left, y, 195, y); y += 7;
  pdf.setFont("helvetica", "bold"); pdf.text("Item", left, y); pdf.text("Qty", 125, y); pdf.text("Amount", 170, y);
  y += 6; pdf.setFont("helvetica", "normal");
  for (const item of invoice.items || []) {
    const name = String(item.name || item.model || "Product").slice(0, 48);
    pdf.text(name, left, y); pdf.text(String(item.qty || 0), 127, y);
    pdf.text(money(Number(item.price || 0) * Number(item.qty || 0)), 170, y);
    y += 6;
    if (item.imei || item.serial) { pdf.setFontSize(8); pdf.text(`IMEI/Serial: ${item.imei || item.serial}`, left + 2, y); y += 5; pdf.setFontSize(10); }
    if (y > 275) { pdf.addPage(); y = 18; }
  }
  pdf.line(left, y, 195, y); y += 7;
  pdf.setFont("helvetica", "bold"); pdf.text(`TOTAL: ${money(invoice.total)}`, left, y); y += 6;
  pdf.text(`PAID: ${money(invoice.paid)}`, left, y); y += 6;
  pdf.text(`REMAINING: ${money(invoice.remaining)}`, left, y); y += 6;
  pdf.setFont("helvetica", "normal"); pdf.text(`Payment: ${invoice.paymentMethod || "-"}`, left, y); y += 9;
  pdf.line(left, y, 195, y); y += 7;
  pdf.setFont("helvetica", "bold"); pdf.text(`Warranty: ${invoice.warrantyDays || 0} days`, left, y); y += 6;
  pdf.setFont("helvetica", "normal"); pdf.text(`IMEI/Serial: ${invoice.imei || "-"}`, left, y); y += 7;
  pdf.setFontSize(8);
  const note = `Warranty starts on ${new Date(invoice.warrantyStart || invoice.createdAt).toLocaleDateString()}. Physical damage, water damage and broken seal are not covered. Receipt required.`;
  pdf.text(pdf.splitTextToSize(note, 180), left, y);
  return pdf;
}

export default function InvoiceActions({ invoice }: any) {
  const [busy, setBusy] = useState(false);
  async function downloadPdf() {
    setBusy(true);
    try { makePdf(invoice).save(`${invoice.invoiceNo || "invoice"}.pdf`); }
    finally { setBusy(false); }
  }
  async function whatsapp() {
    setBusy(true);
    try {
      const pdf = makePdf(invoice);
      const blob = pdf.output("blob");
      const file = new File([blob], `${invoice.invoiceNo || "invoice"}.pdf`, { type: "application/pdf" });
      const text = `NEW ARIF MOBILE CENTER\nInvoice ${invoice.invoiceNo || "-"}\nTotal Rs. ${invoice.total}`;
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: invoice.invoiceNo || "Invoice", text, files: [file] });
      } else {
        pdf.save(file.name);
        location.href = "https://wa.me/?text=" + encodeURIComponent(text + "\nPDF saved on this device. Attach the PDF in WhatsApp.");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") alert("PDF/WhatsApp sharing failed. PDF download can be used instead.");
    } finally { setBusy(false); }
  }
  return <>
    <div className="nav no-print">
      <Link href="/invoices">← Invoices</Link>
      <button className="btn" onClick={downloadPdf} disabled={busy}>📄 Download PDF</button>
      <button className="btn" onClick={() => print()} disabled={busy}>🖨 Print</button>
      <button className="btn green" onClick={whatsapp} disabled={busy}>📲 WhatsApp PDF</button>
    </div>
    <div className="panel receipt">
      <h2 style={{ textAlign: "center" }}>NEW ARIF MOBILE CENTER</h2>
      <p style={{ textAlign: "center" }}>Mobile Parts • Repairing • Better Service</p><div className="line" />
      <b>Invoice:</b> {invoice.invoiceNo}<br/><b>Date:</b> {new Date(invoice.createdAt).toLocaleString()}<br/>
      <b>Customer:</b> {invoice.customerName}<br/><b>Mobile:</b> {invoice.customerPhone || "-"}<br/><b>Pickup By:</b> {invoice.pickupBy || "Customer"}<div className="line" />
      {(invoice.items || []).map((i: any) => <div key={i.productId || i.name}>{i.name} × {i.qty} — Rs. {Number(i.price || 0) * Number(i.qty || 0)}</div>)}
      <div className="line" /><b>TOTAL:</b> Rs. {invoice.total}<br/><b>PAID:</b> Rs. {invoice.paid}<br/><b>REMAINING:</b> Rs. {invoice.remaining}<br/><b>Payment:</b> {invoice.paymentMethod}<div className="line" />
      <b>Warranty:</b> {invoice.warrantyDays || 0} days<br/><b>IMEI/Serial:</b> {invoice.imei || "-"}
      <p>Warranty starts on {new Date(invoice.warrantyStart || invoice.createdAt).toLocaleDateString()}. Physical damage, water damage and broken seal are not covered. Receipt required.</p>
    </div>
  </>;
}
