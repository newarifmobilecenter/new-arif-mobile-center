"use client";
import { SHOP } from "@/lib/shop";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";
import BrandBanner from "../components/BrandBanner";

const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const day = (v: unknown) => { const d = v ? new Date(v as string) : null; return d && !isNaN(+d) ? d.toLocaleDateString("en-PK", { dateStyle: "medium" }) : "-"; };
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

function LedgerContent() {
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [localBuys, setLocalBuys] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setCustomerId(new URLSearchParams(window.location.search).get("customer") || ""); } catch {}
    void Promise.all([fetch("/api/data?collection=customers&limit=5000").then(arr), fetch("/api/data?collection=sales&limit=5000").then(arr), fetch("/api/repairs").then(arr).catch(() => []), fetch("/api/data?collection=transactions&limit=5000").then(arr), fetch("/api/data?collection=purchases&limit=5000").then(arr).catch(() => [])])
      .then(([c, s, r, t, pu]) => { setCustomers(c); setSales(s); setRepairs(r); setTx(t); setLocalBuys(pu.filter((x: any) => x.kind === "LOCAL")); setLoading(false); });
  }, []);

  const summary = useMemo(() => customers.map((c) => {
    const id = String(c._id);
    const bal = sales.filter((s) => String(s.customerId || "") === id).reduce((a, s) => a + n(s.remaining), 0) + repairs.filter((r) => String(r.customerId || "") === id).reduce((a, r) => a + n(r.remaining), 0) - localBuys.filter((p) => String(p.customerId || "") === id).reduce((a, p) => a + n(p.remaining), 0);
    return { ...c, bal };
  }), [customers, sales, repairs, localBuys]);

  const customer = summary.find((c) => String(c._id) === customerId);
  const mySales = sales.filter((s) => String(s.customerId || "") === customerId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const myRepairs = repairs.filter((r) => String(r.customerId || "") === customerId);
  const myPay = tx.filter((t) => String(t.customerId || "") === customerId && t.type === "IN").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const billed = mySales.reduce((a, s) => a + n(s.total), 0) + myRepairs.reduce((a, r) => a + n(r.totalBill), 0);
  const paid = mySales.reduce((a, s) => a + n(s.paid), 0) + myRepairs.reduce((a, r) => a + n(r.paid), 0);
  const bal = customer?.bal || 0;

  const list = useMemo(() => { const s = q.trim().toLowerCase(); return summary.filter((c) => !s || `${c.name} ${c.phone} ${c.phoneNo} ${c.code}`.toLowerCase().includes(s)).sort((a, b) => b.bal - a.bal); }, [summary, q]);

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Customer Ledger — {SHOP.name}</span><span><Link href="/">← Dashboard</Link><Link href="/customers">Customers</Link><Link href="/walking-customers">Walking Customers</Link><Link href="/vouchers?tab=due">Voucher</Link><Link href="/accounts">Bank Ledger</Link></span></div>
    <BrandBanner title="Customer Ledger" subtitle={customer ? `${customer.name}${customer.phone || customer.phoneNo ? " · " + (customer.phoneNo || customer.phone) : ""}` : "Sab customers ka hisaab"} right={<div style={{ fontSize: 12, color: "#cbd5e1" }}>Date: {day(new Date())}</div>} />
    <section className={styles.body} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      {!customer && <div className={styles.card}>
        <h2>Customers ka Hisaab {loading && <small style={{ color: "#94a3b8" }}>load ho raha hai…</small>}</h2>
        <div className={styles.stats}><div className={styles.stat}><small>Customers</small><b>{summary.length}</b></div><div className={styles.stat}><small>Udhaar wale</small><b>{summary.filter((c) => c.bal > 0).length}</b></div><div className={styles.stat}><small>Total baqi</small><b>Rs. {money(summary.reduce((a, c) => a + c.bal, 0))}</b></div></div>
        <div className={styles.bar} style={{ marginTop: 0, marginBottom: 8 }}><input className={styles.in} style={{ maxWidth: 340 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 naam / phone / code" /><button className={styles.alt} onClick={() => window.print()}>🖨 Print</button></div>
        <div className={styles.wrap} style={{ maxHeight: "60vh" }}><table className={styles.tbl}><thead><tr><th>Code</th><th>Customer</th><th>Phone</th><th className={styles.num}>Baqi</th><th></th></tr></thead><tbody>
          {list.map((c) => <tr key={c._id}><td>{c.code || "-"}</td><td>{c.name}</td><td>{c.phoneNo || c.phone || "-"}</td><td className={styles.num}><span className={`${styles.pill} ${c.bal > 0 ? styles.pDue : styles.pPaid}`}>Rs. {money(c.bal)}</span></td><td><button className={styles.alt} onClick={() => { setCustomerId(String(c._id)); window.history.replaceState(null, "", `/ledger?customer=${c._id}`); }}>Ledger kholen</button></td></tr>)}
          {!list.length && <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>Koi customer nahi.</td></tr>}</tbody></table></div>
      </div>}
      {customer && <>
        <div className={styles.card}>
          <div className={styles.stats}>
            <div className={styles.stat}><small>Kul bill (sale + repair)</small><b>Rs. {money(billed)}</b></div>
            <div className={styles.stat}><small>Wasool / Paid</small><b>Rs. {money(paid)}</b></div>
            <div className={styles.stat}><small>Maujooda baqi</small><b style={{ color: bal > 0 ? "#f87171" : "#4ade80" }}>Rs. {money(bal)}{bal < 0 ? " (humein dene)" : ""}</b></div>
          </div>
          <div className={styles.bar} style={{ marginTop: 0 }}>
            <button className={styles.alt} onClick={() => { setCustomerId(""); window.history.replaceState(null, "", "/ledger"); }}>← Sab customers</button>
            {bal > 0 && <Link className={styles.alt} style={{ textDecoration: "none" }} href={`/vouchers?tab=due&customer=${customerId}`}>💰 Wasooli Voucher</Link>}
            <Link className={styles.alt} style={{ textDecoration: "none" }} href={`/repairs/new?customerId=${customerId}`}>＋ New Repair</Link>
            <button className={styles.alt} onClick={() => window.print()}>🖨 Print Ledger</button>
          </div>
        </div>
        <div className={styles.card}><h2>Sales / Bills</h2><div className={styles.wrap} style={{ maxHeight: "30vh" }}><table className={styles.tbl}><thead><tr><th>Date</th><th>Invoice</th><th>Detail</th><th className={styles.num}>Total</th><th className={styles.num}>Paid</th><th className={styles.num}>Baqi</th><th>Status</th></tr></thead><tbody>
          {mySales.map((s) => <tr key={s._id}><td>{day(s.createdAt)}</td><td><Link href={`/invoice/${s._id}`} style={{ color: "#22d3ee" }}>{s.invoiceNo || "-"}</Link></td><td>{s.isOpening ? "Purana baqi" : (s.items || []).map((i: any) => `${i.name} ×${i.qty}`).join(", ").slice(0, 70)}</td><td className={styles.num}>{money(s.total)}</td><td className={styles.num}>{money(s.paid)}</td><td className={styles.num}>{money(s.remaining)}</td><td><span className={`${styles.pill} ${n(s.remaining) > 0 ? styles.pDue : styles.pPaid}`}>{n(s.remaining) > 0 ? "Baqi" : "Paid"}</span></td></tr>)}
          {myRepairs.map((r) => <tr key={r._id}><td>{day(r.receivedAt)}</td><td>{r.tokenNo}</td><td>Repair · {r.model}</td><td className={styles.num}>{money(r.totalBill)}</td><td className={styles.num}>{money(r.paid)}</td><td className={styles.num}>{money(r.remaining)}</td><td><span className={`${styles.pill} ${n(r.remaining) > 0 ? styles.pDue : styles.pPaid}`}>{n(r.remaining) > 0 ? "Baqi" : "Paid"}</span></td></tr>)}
          {!mySales.length && !myRepairs.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: 14 }}>Koi bill nahi.</td></tr>}</tbody></table></div></div>
        <div className={styles.card}><h2>Payments Received</h2><div className={styles.wrap} style={{ maxHeight: "26vh" }}><table className={styles.tbl}><thead><tr><th>Date</th><th>Ref / Voucher</th><th>Account</th><th>Detail</th><th className={styles.num}>Amount</th></tr></thead><tbody>
          {myPay.map((t) => <tr key={t._id}><td>{day(t.createdAt)}</td><td>{t.ref || "-"}</td><td>{t.account || "Cash"}</td><td>{t.note || "-"}</td><td className={styles.num}>{money(t.amount)}</td></tr>)}
          {!myPay.length && <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 14 }}>Koi payment nahi.</td></tr>}</tbody></table></div></div>
      </>}
    </section>
  </main>;
}
export default function Ledger() { return <Suspense fallback={<main className={styles.win}><p style={{ padding: 20 }}>Loading Ledger...</p></main>}><LedgerContent /></Suspense>; }
