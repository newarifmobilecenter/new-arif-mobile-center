"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "../../notebook/notebook.module.css";

const money = (value: number) => Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const dateTime = (value: string) => value ? new Date(value).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" }) : "-";

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${encodeURIComponent(id)}/summary`).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Customer history could not be loaded.");
      setData(result);
    }).catch((caught: any) => setError(caught.message || "Customer history could not be loaded."));
  }, [id]);

  function beginReminder() {
    setMessage(`Assalam-o-Alaikum ${data.customer.name},\nNew Arif Mobile ki taraf se aapka outstanding balance Rs. ${money(data.balance)} hai.\nShukriya.`);
    setReminderOpen(true);
  }

  async function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setBusy(true);
    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(id)}/reminders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "PAYMENT_DUE", message }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Reminder preparation could not be recorded.");
      setReminderOpen(false);
      setData((current: any) => ({ ...current, reminders: [result, ...(current.reminders || [])] }));
    } catch (caught: any) { setError(caught.message || "Reminder preparation could not be recorded."); }
    finally { setBusy(false); }
  }

  if (error && !data) return <main className="shell"><Link href="/customers">← Customers</Link><p role="alert">{error}</p></main>;
  if (!data) return <main className="shell"><p>Loading customer history...</p></main>;

  const customer = data.customer;
  return <main className={`shell ${styles.page}`}>
    <nav className={`${styles.nav} ${styles.noPrint}`}><Link href="/customers">← Customers</Link><Link href={`/ledger?customer=${customer._id}`}>Customer Ledger</Link><Link href={`/repairs/new?customerId=${customer._id}`}>New Repair</Link><Link href="/repairs">Repair List</Link></nav>
    {error && <p className={`${styles.notice} ${styles.noPrint}`} role="alert">{error}</p>}
    <header className={styles.header}><div><h1>{customer.name}</h1><p>{customer.phone || "No phone on file"}{customer.address ? ` · ${customer.address}` : ""}</p></div><div className={styles.actions}><Link className={styles.button} href={`/repairs/new?customerId=${customer._id}`}>＋ New Repair</Link>{Number(data.balance) > 0 && <button className={styles.buttonSecondary} onClick={beginReminder}>WhatsApp Reminder</button>}</div></header>
    <section className={styles.panel}><div className={styles.balanceSummary}><div><span className={styles.muted}>Current Outstanding</span><div className={styles.balanceValue}>Rs. {money(data.balance)}</div></div><div><span className={styles.muted}>Current Repairs</span><div className={styles.balanceValue}>{data.currentRepairs.length}</div></div><div><span className={styles.muted}>Old Repairs</span><div className={styles.balanceValue}>{data.oldRepairs.length}</div></div></div></section>
    <section className={styles.panel}><h2>Current Repairs</h2><RepairTable repairs={data.currentRepairs} /></section>
    <section className={styles.panel}><h2>Old Repairs</h2><RepairTable repairs={data.oldRepairs} /></section>
    <section className={styles.panel}><h2>Sales / Ledger History</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Reference</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{data.sales.map((sale: any) => <tr key={sale._id}><td>{dateTime(sale.createdAt)}</td><td>{sale.invoiceNo || "Sale"}</td><td>Rs. {money(sale.total)}</td><td>Rs. {money(sale.paid)}</td><td>Rs. {money(sale.remaining)}</td><td>{Number(sale.remaining) > 0 ? "CREDIT / PAYMENT DUE" : "PAID"}</td></tr>)}</tbody></table></div></section>
    <section className={styles.panel}><h2>Payments</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Reference</th><th>Method</th><th>Amount</th><th>Note</th></tr></thead><tbody>{data.payments.map((payment: any) => <tr key={payment._id}><td>{dateTime(payment.createdAt)}</td><td>{payment.ref || "-"}</td><td>{payment.account || "-"}</td><td>Rs. {money(payment.amount)}</td><td>{payment.note || "-"}</td></tr>)}</tbody></table></div></section>
    <section className={styles.panel}><h2>Reminder History</h2>{data.reminders?.length ? <div className={styles.historyList}>{data.reminders.map((item: any) => <div className={styles.historyItem} key={item._id}><b>{item.type}</b> · {item.method} · {item.action} · {dateTime(item.createdAt)}<br /><small>Draft preparation only; opening/sending is not verified.</small></div>)}</div> : <p className={styles.muted}>No reminders prepared.</p>}</section>
    {reminderOpen && <div className={styles.reminderModal}><section className={styles.reminderDialog} role="dialog" aria-modal="true"><h2>Review WhatsApp reminder</h2><label className={styles.field}>Message<textarea rows={7} value={message} onChange={(event) => setMessage(event.target.value)} /></label><p className={styles.muted}>This prepares an editable WhatsApp draft. It will not send automatically, and the app cannot verify that it was opened or sent.</p><div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setReminderOpen(false)}>Cancel</button><button className={styles.button} disabled={busy} onClick={() => void openWhatsApp()}>Prepare WhatsApp Draft</button></div></section></div>}
  </main>;
}

function RepairTable({ repairs }: { repairs: any[] }) {
  if (!repairs.length) return <p className={styles.empty}>No repair records.</p>;
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Token</th><th>Date</th><th>Model</th><th>Fault</th><th>Status</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Expected Ready</th></tr></thead><tbody>{repairs.map((repair) => <tr key={repair._id}><td><Link href={`/repairs/${repair._id}`}>{repair.tokenNo}</Link></td><td>{dateTime(repair.receivedAt)}</td><td>{repair.model}</td><td>{repair.fault}</td><td>{repair.status}{repair.remaining > 0 ? " · PAYMENT DUE" : ""}</td><td>Rs. {money(repair.totalBill ?? repair.agreedRate)}</td><td>Rs. {money(repair.paid)}</td><td>Rs. {money(repair.remaining)}</td><td>{dateTime(repair.expectedReadyAt)}</td></tr>)}</tbody></table></div>;
}
