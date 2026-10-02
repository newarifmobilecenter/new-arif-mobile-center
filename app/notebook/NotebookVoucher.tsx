import styles from "./notebook.module.css";
import type { NotebookEntry } from "./NotebookEntryForm";

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value || "-" : date.toLocaleDateString("en-PK", { dateStyle: "long" });
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NotebookVoucher({ entry }: { entry: NotebookEntry }) {
  return <article className={styles.notebookVoucher} aria-label="Notebook entry voucher">
    <header className={styles.voucherHeader}>
      <div className={styles.voucherBrand}>NEW ARIF MOBILE CENTER</div>
      <div className={styles.voucherSubtitle}>NOTEBOOK ENTRY / VOUCHER</div>
    </header>

    <section className={styles.voucherMeta}>
      <div><b>Entry No.</b><strong>{entry.entryNo || "-"}</strong></div>
      <div><b>Date</b><strong>{dateLabel(entry.date)}</strong></div>
    </section>

    <section className={styles.voucherIdentity}>
      <div><b>Name</b><span>{entry.customerName || "-"}</span></div>
      <div><b>Phone</b><span>{entry.phone || "-"}</span></div>
    </section>

    <section className={styles.voucherTextField}>
      <b>Subject / Title</b>
      <span>{entry.title || "-"}</span>
    </section>
    <section className={`${styles.voucherTextField} ${styles.voucherDescription}`}>
      <b>Description / Details</b>
      <span>{entry.description || "-"}</span>
    </section>

    <section className={styles.voucherAmounts} aria-label="Notebook amounts">
      <div><b>Amount</b><strong>Rs. {money(entry.amount)}</strong></div>
      <div><b>Paid</b><strong>Rs. {money(entry.paid)}</strong></div>
      <div><b>Remaining</b><strong>Rs. {money(entry.remaining)}</strong></div>
    </section>

    <section className={styles.voucherTextField}>
      <b>Payment Method</b>
      <span>{entry.paymentMethod || "-"}</span>
    </section>
    <section className={`${styles.voucherTextField} ${styles.voucherRemarks}`}>
      <b>Remarks</b>
      <span>{entry.remarks || "-"}</span>
    </section>

    <footer className={styles.voucherFooter}>
      <span>NEW ARIF MOBILE CENTER</span>
      <span>Thank you for your business</span>
    </footer>
  </article>;
}