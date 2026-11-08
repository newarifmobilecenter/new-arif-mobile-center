"use client";
import { SHOP } from "@/lib/shop";
import { useState, useEffect } from "react";
import Link from "next/link";
import SaleReceipt from "../../components/SaleReceipt";
import { makeSalePdf } from "../../../lib/saleReceiptPdf";

const makePdf = (invoice: any) => makeSalePdf(invoice, invoice.customerName, invoice.customerPhone);

export default function InvoiceActions({ invoice: orig }: any) {
  const [busy, setBusy] = useState(false);
  // Purane bill par Previous Balance save nahi hota: option on karein to customer ka abhi ka baqi se nikal kar dikhaya jata hai.
  const [showPrev, setShowPrev] = useState(false);
  const [curBal, setCurBal] = useState<number | null>(null);
  const hasStored = orig.prevBalance != null;
  useEffect(() => {
    if (!showPrev || hasStored || !orig.customerId || curBal !== null) return;
    fetch(`/api/customers/${orig.customerId}/summary`, { cache: "no-store" }).then((r) => r.json()).then((d) => setCurBal(Number(d.balance || 0))).catch(() => setCurBal(0));
  }, [showPrev, hasStored, orig.customerId, curBal]);
  const invoice = hasStored || !showPrev || curBal === null ? orig : { ...orig, prevBalance: Math.round((curBal - Number(orig.remaining || 0)) * 100) / 100 };
  const canPrev = !hasStored && !!orig.customerId;
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
      const text = `${SHOP.nameUpper}\nInvoice ${invoice.invoiceNo || "-"}\nTotal Rs. ${invoice.total}`;
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
      {canPrev && <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 8 }}><input type="checkbox" checked={showPrev} onChange={(e) => setShowPrev(e.target.checked)} /> Previous Balance dikhao</label>}
    </div>
    <SaleReceipt sale={invoice} customerName={invoice.customerName} customerPhone={invoice.customerPhone} />
  </>;
}
