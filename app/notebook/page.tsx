"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./notebook.module.css";

type Entry = {
  _id: string;
  entryNo: string;
  date: string;
  customerName: string;
  phone: string;
  title: string;
  amount: number;
  paid: number;
  remaining: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
};

const money = (value: number) => Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const dateLabel = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-PK", { dateStyle: "short" }) : "-";

export default function Notebook() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (status) params.set("status", status);
      setLoading(true);
      setError("");
      fetch(`/api/notebook?${params.toString()}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Notebook entries could not be loaded.");
          setEntries(Array.isArray(data.entries) ? data.entries : []);
          setCanDelete(Boolean(data.permissions?.canDelete));
        })
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Notebook entries could not be loaded."))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [q, from, to, status, refreshKey]);

  async function softDelete(entry: Entry) {
    if (!window.confirm(`Move Notebook entry ${entry.entryNo} to deleted records?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/notebook/${encodeURIComponent(entry._id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Notebook entry could not be deleted.");
      setRefreshKey((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notebook entry could not be deleted.");
    }
  }

  return <main className={`shell ${styles.page}`}>
    <nav className={`${styles.nav} ${styles.noPrint}`}><Link href="/">← Dashboard</Link><Link href="/repairs">Mobile Repairs</Link></nav>
    <header className={styles.header}>
      <div><h1>Notebook</h1><p>Independent voucher entries</p></div>
      <Link className={styles.button} href="/notebook/new">＋ Add Entry</Link>
    </header>
    <section className={`${styles.panel} ${styles.noPrint}`}>
      <div className={styles.filters}>
        <label className={`${styles.field} ${styles.search}`}>Search entry, name, phone, subject, or details<input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search Notebook" /></label>
        <label className={styles.field}>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className={styles.field}>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label className={styles.field}>Payment Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="UNPAID">Unpaid</option></select></label>
      </div>
    </section>
    <section className={styles.panel}>
      {error && <p className={styles.notice} role="alert">{error}</p>}
      {loading ? <p className={styles.muted}>Loading Notebook entries...</p> : error ? null : entries.length === 0 ? <p className={styles.empty}>No Notebook entries match these filters.</p> : <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>Entry No.</th><th>Date</th><th>Name / Phone</th><th>Subject / Title</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Status</th><th></th></tr></thead>
        <tbody>{entries.map((entry) => <tr key={entry._id}>
          <td><Link href={`/notebook/${encodeURIComponent(entry._id)}`}><b>{entry.entryNo}</b></Link></td>
          <td>{dateLabel(entry.date)}</td>
          <td>{entry.customerName}<br /><small>{entry.phone || "-"}</small></td>
          <td>{entry.title}</td>
          <td>Rs. {money(entry.amount)}</td><td>Rs. {money(entry.paid)}</td><td>Rs. {money(entry.remaining)}</td>
          <td><span className={styles.status} data-status={entry.status}>{entry.status}</span></td>
          <td className={styles.rowActions}><Link href={`/notebook/${encodeURIComponent(entry._id)}`}>View</Link>{canDelete && <button className={styles.textButton} onClick={() => void softDelete(entry)} aria-label={`Delete ${entry.entryNo}`}>Delete</button>}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </main>;
}