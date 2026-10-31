"use client";
import { useState } from "react";
import Link from "next/link";
import SaleReceipt from "../../components/SaleReceipt";
import { makeSalePdf } from "../../../lib/saleReceiptPdf";

const makePdf = (invoice: any) => makeSalePdf(invoice, invoice.customerName, invoice.customerPhone);

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
    <SaleReceipt sale={invoice} customerName={invoice.customerName} customerPhone={invoice.customerPhone} />
  </>;
}
