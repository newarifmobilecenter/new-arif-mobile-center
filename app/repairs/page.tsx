"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../notebook/notebook.module.css";

type Repair = {
  _id: string; tokenNo: string; receivedAt: string; expectedReadyAt: string; customerId: string;
  customerName: string; customerPhone: string; model: string; fault: string; status: string;
  totalBill: number; paid: number; remaining: number;
};
type Customer = { _id: string; name: string; phone?: string };
const money = (value: number) => Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const dateTime = (value: string) => value ? new Date(value).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" }) : "-";

export default function Repairs() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("CURRENT");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (customerId) params.set("customerId", customerId);
      if (status) params.set("status", status);
      setLoading(true);
      setError("");
      fetch(`/api/repairs?${params.toString()}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Repair records could not be loaded.");
          setRepairs(Array.isArray(data) ? data : []);
        })
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Repair records could not be loaded."))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [q, from, to, customerId, status]);

  useEffect(() => {
    fetch("/api/data?collection=customers&limit=5000")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]));
  }, []);

  const current = repairs.filter((repair) => !["DELIVERED", "CANCELLED"].includes(repair.status));
  const ready = repairs.filter((repair) => repair.status === "READY");
  const due = repairs.filter((repair) => Number(repair.remaining || 0) > 0);
  const history = repairs.filter((repair) => ["DELIVERED", "CANCELLED"].includes(repair.status));
  const visible = view === "READY" ? ready : view === "DUE" ? due : view === "HISTORY" ? history : current;

  return <main className={`shell ${styles.page}`}>
    <nav className={`${styles.nav} ${styles.noPrint}`}><Link href="/">← Dashboard</Link><Link href="/notebook">Notebook</Link><Link href="/customers">Customers</Link><Link href="/ledger">Customer Ledger</Link><Link href="/reminders">Reminder Inbox</Link></nav>
    <header className={styles.header}>
      <div><h1>Mobile Repair Receiving</h1><p>Customer intake, repair progress, balance, and history</p></div>
      <Link className={styles.button} href="/repairs/new">＋ New Mobile Repair</Link>
    </header>
    <section className={`${styles.panel} ${styles.noPrint}`}>
      <div className={styles.filters}>
        <label className={`${styles.field} ${styles.search}`}>Search customer, phone, token, IMEI, or model<input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search repairs" /></label>
        <label className={styles.field}>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className={styles.field}>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label className={styles.field}>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">All customers</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}</option>)}</select></label>
        <label className={styles.field}>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option>RECEIVED</option><option>IN_REPAIR</option><option>READY</option><option>DELIVERED</option><option>CANCELLED</option><option value="PAYMENT_DUE">PAYMENT DUE</option></select></label>
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Repair worklist">
        {[["CURRENT", `Current (${current.length})`], ["READY", `Ready (${ready.length})`], ["DUE", `Payment Due (${due.length})`], ["HISTORY", `Delivered / History (${history.length})`]].map(([key, label]) => <button key={key} role="tab" aria-selected={view === key} className={view === key ? styles.activeTab : styles.tab} onClick={() => setView(key)}>{label}</button>)}
      </div>
    </section>
    <section className={styles.panel}>
      {error && <p className={styles.notice} role="alert">{error}</p>}
      {loading ? <p className={styles.muted}>Loading repairs...</p> : visible.length === 0 ? <p className={styles.empty}>No repair records match these filters.</p> : <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>Token</th><th>Date</th><th>Customer</th><th>Mobile</th><th>Fault</th><th>Status</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Expected Ready</th><th></th></tr></thead>
        <tbody>{visible.map((repair) => <tr key={repair._id}>
          <td><Link href={`/repairs/${encodeURIComponent(repair._id)}`}><b>{repair.tokenNo}</b></Link></td><td>{dateTime(repair.receivedAt)}</td>
          <td><Link href={`/customers/${repair.customerId}`}>{repair.customerName}</Link><br /><small>{repair.customerPhone}</small></td>
          <td>{repair.model}</td><td>{repair.fault}</td><td><span className={styles.status} data-status={repair.status}>{repair.status}</span>{repair.remaining > 0 && <span className={styles.dueTag}>PAYMENT DUE</span>}</td>
          <td>Rs. {money(repair.totalBill)}</td><td>Rs. {money(repair.paid)}</td><td>Rs. {money(repair.remaining)}</td><td>{dateTime(repair.expectedReadyAt)}</td><td><Link href={`/repairs/${encodeURIComponent(repair._id)}`}>Open</Link></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </main>;
}