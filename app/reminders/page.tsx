"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../notebook/notebook.module.css";

const dateTime = (value: string) => value ? new Date(value).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" }) : "-";

type ReminderRepair = { _id: string; tokenNo: string; customerName: string; customerPhone: string; model: string; status: string; remaining: number; expectedReadyAt: string };

export default function ReminderInbox() {
  const [data, setData] = useState<{ paymentDue: ReminderRepair[]; repairReady: ReminderRepair[]; mobileDelivery: ReminderRepair[] }>({ paymentDue: [], repairReady: [], mobileDelivery: [] });
  const [view, setView] = useState("PAYMENT_DUE");
  const [q, setQ] = useState("");
  const [windowType, setWindowType] = useState("TODAY");
  const [customDate, setCustomDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ window: windowType });
    if (q.trim()) params.set("q", q.trim());
    if (windowType === "CUSTOM" && customDate) params.set("date", customDate);
    fetch(`/api/reminders?${params.toString()}`).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Reminder inbox could not be loaded.");
      setData(result);
    }).catch((caught: any) => setError(caught.message || "Reminder inbox could not be loaded.")).finally(() => setLoading(false));
  }, [q, windowType, customDate]);

  const rows = view === "REPAIR_READY" ? data.repairReady : view === "MOBILE_DELIVERY" ? data.mobileDelivery : data.paymentDue;
  return <main className={`shell ${styles.page}`}>
    <nav className={`${styles.nav} ${styles.noPrint}`}><Link href="/">← Dashboard</Link><Link href="/repairs">Mobile Repairs</Link><Link href="/customers">Customers</Link></nav>
    <header className={styles.header}><div><h1>Reminder Inbox</h1><p>Review due and ready repairs; WhatsApp remains manual.</p></div></header>
    <section className={`${styles.panel} ${styles.noPrint}`}>
      <label className={styles.field}>Search token, customer, phone, or model<input value={q} onChange={(event) => { setLoading(true); setQ(event.target.value); }} placeholder="Search reminders" /></label>
      <label className={styles.field}>Payment reminder window<select value={windowType} onChange={(event) => setWindowType(event.target.value)}><option value="TODAY">Today</option><option value="TOMORROW">Tomorrow</option><option value="THREE_DAYS">Next 3 Days</option><option value="ONE_WEEK">Next Week</option><option value="CUSTOM">Custom Date</option></select></label>
      {windowType === "CUSTOM" && <label className={styles.field}>Custom date<input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} required /></label>}
      <div className={styles.tabs} role="tablist">
        {[ ["PAYMENT_DUE", `Payment Due (${data.paymentDue.length})`], ["REPAIR_READY", `Repair Ready (${data.repairReady.length})`], ["MOBILE_DELIVERY", `Mobile Delivery (${data.mobileDelivery.length})`] ].map(([key, label]) => <button key={key} role="tab" aria-selected={view === key} className={view === key ? styles.activeTab : styles.tab} onClick={() => setView(key)}>{label}</button>)}
      </div>
    </section>
    <section className={styles.panel}>
      {error && <p className={styles.notice} role="alert">{error}</p>}
      {loading ? <p className={styles.muted}>Loading reminders...</p> : rows.length === 0 ? <p className={styles.empty}>No pending reminders in this group.</p> : <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>Token</th><th>Customer</th><th>Phone</th><th>Model</th><th>Status</th><th>Balance</th><th>Expected Ready</th><th></th></tr></thead>
        <tbody>{rows.map((repair) => <tr key={repair._id}><td><Link href={`/repairs/${repair._id}`}>{repair.tokenNo}</Link></td><td>{repair.customerName}</td><td>{repair.customerPhone || "-"}</td><td>{repair.model}</td><td>{repair.status}</td><td>Rs. {Number(repair.remaining || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}</td><td>{dateTime(repair.expectedReadyAt)}</td><td><Link href={`/repairs/${repair._id}`}>Review</Link></td></tr>)}</tbody>
      </table></div>}
    </section>
  </main>;
}
