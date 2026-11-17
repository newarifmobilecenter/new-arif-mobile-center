"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./notebook.module.css";
import { SHOP } from "@/lib/shop";

type Row = {
  _id: string; tokenNo: string; customerId: string; customerName: string; customerPhone: string; model: string; fault: string;
  parts: string[]; total: number; paid: number; remaining: number; billedSaleId: string; invoiceNo: string; reminderAt: string | null; receivedAt: string | null; deliveredAt: string | null;
};
const money = (v: number) => Number(v || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const day = (v: string | null) => v ? new Date(v).toLocaleDateString("en-PK", { dateStyle: "short" }) : "-";
const waPhone = (p: string) => { const d = String(p || "").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("92")) return d; if (d.startsWith("0")) return "92" + d.slice(1); return d.length === 10 ? "92" + d : d; };

export default function RepairKhata() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"UNPAID" | "PAID">("UNPAID");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/repairs/khata").then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Khata load nahi hua."); setRows(Array.isArray(d) ? d : []); })
      .catch((e) => setError(e?.message || "Khata load nahi hua.")).finally(() => setLoading(false));
  }, []);

  const match = (r: Row) => { const s = q.trim().toLowerCase(); return !s || `${r.tokenNo} ${r.customerName} ${r.customerPhone} ${r.model}`.toLowerCase().includes(s); };
  const unpaid = useMemo(() => rows.filter((r) => r.remaining > 0), [rows]);
  const paid = useMemo(() => rows.filter((r) => r.remaining <= 0), [rows]);
  const visible = (tab === "UNPAID" ? unpaid : paid).filter(match);
  const totalDue = unpaid.reduce((s, r) => s + r.remaining, 0);

  const message = (r: Row, reminder: boolean) => [
    `*${SHOP.name}*`,
    reminder ? `Assalam o Alaikum ${r.customerName},` : "",
    `Repair Bill: ${r.tokenNo}`,
    `Mobile: ${r.model}${r.fault ? " (" + r.fault + ")" : ""}`,
    r.parts.length ? `Parts: ${r.parts.join(", ")}` : "",
    `Total: Rs. ${money(r.total)}`,
    `Paid: Rs. ${money(r.paid)}`,
    `*Baqi: Rs. ${money(r.remaining)}*`,
    reminder ? "Meharbani farma kar baqi raqam ada kar dein. Shukriya." : "",
    SHOP.phones?.[0] ? `Ph: ${SHOP.phones[0]}` : "",
  ].filter(Boolean).join("\n");

  const send = (r: Row, reminder: boolean) => {
    const ph = waPhone(r.customerPhone);
    window.open(`https://wa.me/${ph}?text=${encodeURIComponent(message(r, reminder))}`, "_blank", "noopener,noreferrer");
  };
  const overdue = (r: Row) => !!r.reminderAt && new Date(r.reminderAt).getTime() < Date.now() - 86400000;

  return <div>
    <section className={`${styles.panel} ${styles.noPrint}`}>
      <div className={styles.tabs} role="tablist" aria-label="Repair payment khata">
        <button role="tab" aria-selected={tab === "UNPAID"} className={tab === "UNPAID" ? styles.activeTab : styles.tab} onClick={() => setTab("UNPAID")}>⏳ Payment Baqi ({unpaid.length})</button>
        <button role="tab" aria-selected={tab === "PAID"} className={tab === "PAID" ? styles.activeTab : styles.tab} onClick={() => setTab("PAID")}>✅ Payment Mil Gayi ({paid.length})</button>
      </div>
      <div className={styles.filters}>
        <label className={`${styles.field} ${styles.search}`}>Search name, phone, token ya model<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /></label>
      </div>
      {tab === "UNPAID" && <p className={styles.muted}>Kul baqi: <b>Rs. {money(totalDue)}</b> ({unpaid.length} repair). Payment milte hi repair yahan se khud hat kar &quot;Payment Mil Gayi&quot; mein chali jati hai.</p>}
    </section>
    <section className={styles.panel}>
      {error && <p className={styles.notice} role="alert">{error}</p>}
      {loading ? <p className={styles.muted}>Loading...</p> : visible.length === 0 ? <p className={styles.empty}>{tab === "UNPAID" ? "Koi baqi payment nahi." : "Abhi koi record nahi."}</p> : <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>Token</th><th>Deliver</th><th>Customer</th><th>Mobile</th><th>Total</th><th>Paid</th><th>Baqi</th>{tab === "UNPAID" && <th>Reminder</th>}<th></th></tr></thead>
        <tbody>{visible.map((r) => <tr key={r._id}>
          <td><Link href={`/repairs/${encodeURIComponent(r._id)}`}><b>{r.tokenNo}</b></Link></td>
          <td>{day(r.deliveredAt)}</td>
          <td>{r.customerId ? <Link href={`/customers/${r.customerId}`}>{r.customerName}</Link> : <span>{r.customerName} <small>(walking)</small></span>}<br /><small>{r.customerPhone || "-"}</small></td>
          <td>{r.model}</td>
          <td>Rs. {money(r.total)}</td><td>Rs. {money(r.paid)}</td><td>{r.remaining > 0 ? <b>Rs. {money(r.remaining)}</b> : "-"}</td>
          {tab === "UNPAID" && <td>{day(r.reminderAt)}{overdue(r) && <span className={styles.dueTag}>LATE</span>}</td>}
          <td className={styles.rowActions}>
            {tab === "UNPAID" && <button className={styles.textButton} onClick={() => send(r, true)}>🔔 Reminder</button>}
            <button className={styles.textButton} onClick={() => send(r, false)}>📲 Bill</button>
            <Link href={r.invoiceNo ? `/pos?inv=${encodeURIComponent(r.invoiceNo)}` : `/repairs/${encodeURIComponent(r._id)}`}>{tab === "UNPAID" ? "Payment Lein" : "Open"}</Link>
          </td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </div>;
}
