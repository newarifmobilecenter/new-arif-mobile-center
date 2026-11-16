"use client";
import { SHOP } from "@/lib/shop";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";
import BrandBanner from "../components/BrandBanner";
import { buildLedgerRows, ledgerHtml, LEDGER_CSS, ledgerDefaultFrom, ledgerToday } from "@/lib/ledgerDoc";
import { htmlToPng, downloadBlob, sharePng, pngToPdf, printHtml } from "@/lib/shareSlip";
import { notify } from "@/lib/toast";

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
  const [returns, setReturns] = useState<any[]>([]);
  const [from, setFrom] = useState(ledgerDefaultFrom());
  const [to, setTo] = useState(ledgerToday());
  const [working, setWorking] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setCustomerId(new URLSearchParams(window.location.search).get("customer") || ""); } catch {}
    void Promise.all([fetch("/api/data?collection=customers&limit=20000").then(arr), fetch("/api/data?collection=sales&limit=5000").then(arr), fetch("/api/repairs").then(arr).catch(() => []), fetch("/api/data?collection=transactions&limit=5000").then(arr), fetch("/api/data?collection=returns&limit=5000").then(arr).catch(() => []), fetch("/api/data?collection=purchases&limit=5000").then(arr).catch(() => [])])
      .then(([c, s, r, t, ret, pu]) => { setCustomers(c); setSales(s); setRepairs(r); setTx(t); setReturns(ret); setLocalBuys(pu.filter((x: any) => x.kind === "LOCAL")); setLoading(false); });
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
  const bal = customer?.bal || 0;
  // Side ke teen dabbe statement ke saath barabar: sab entries (date range se qat-e-nazar) ka jod, deliver na hui repair alag.
  const allRows = useMemo(() => customer ? buildLedgerRows(customerId, { sales, repairs, tx, returns, localBuys }, bal) : [], [customer, customerId, sales, repairs, tx, returns, localBuys, bal]);
  const billed = allRows.reduce((a, r) => a + r.debit, 0);
  const paid = allRows.reduce((a, r) => a + r.credit, 0);
  const pendingRep = allRows.filter((r) => r.kind === "PENDING").reduce((a, r) => a + n(r.pending), 0);
  const ledgerBal = billed - paid;

  const docHtml = useMemo(() => customer ? ledgerHtml({ name: String(customer.name || ""), phone: String(customer.phoneNo || customer.phone || ""), code: String(customer.code || ""), from, to, rows: allRows }) : "", [customer, customerId, from, to, allRows]);
  const act = async (mode: "pdf" | "png" | "whatsapp") => {
    setWorking(true);
    try {
      const blob = await htmlToPng(docHtml, LEDGER_CSS, 900, 2);
      const base = `Ledger-${String(customer?.name || "customer").replace(/[^\w]+/g, "_")}`;
      if (mode === "png") downloadBlob(blob, `${base}.png`);
      else if (mode === "pdf") downloadBlob(await pngToPdf(blob), `${base}.pdf`);
      else await sharePng(blob, `${base}.png`, `${SHOP.nameUpper}\nCustomer Ledger: ${customer?.name}\n${from} se ${to}`);
    } catch { notify("Ledger file nahi ban saki. Dobara koshish karein.", { kind: "danger" }); }
    finally { setWorking(false); }
  };
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return summary.filter((c) => !s || `${c.name} ${c.phone} ${c.phoneNo} ${c.code}`.toLowerCase().includes(s)).sort((a, b) => b.bal - a.bal); }, [summary, q]);

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Customer Ledger — {SHOP.name}</span><span><Link href="/">← Dashboard</Link><Link href="/customers">Customers</Link><Link href="/walking-customers">Walking Customers</Link><Link href="/vouchers?tab=due">Voucher</Link><Link href="/accounts">Bank Ledger</Link></span></div>
    {!customer && <BrandBanner title="Customer Ledger" subtitle={customer ? `${customer.name}${customer.phone || customer.phoneNo ? " · " + (customer.phoneNo || customer.phone) : ""}` : "Sab customers ka hisaab"} right={<div style={{ fontSize: 12, color: "#cbd5e1" }}>Date: {day(new Date())}</div>} />}
    <section className={styles.body} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      {!customer && <div className={styles.card}>
        <h2>Customers ka Hisaab {loading && <small style={{ color: "#94a3b8" }}>load ho raha hai…</small>}</h2>
        <div className={styles.stats}><div className={styles.stat}><small>Customers</small><b>{summary.length}</b></div><div className={styles.stat}><small>Udhaar wale</small><b>{summary.filter((c) => c.bal > 0).length}</b></div><div className={styles.stat}><small>Total baqi</small><b>Rs. {money(summary.reduce((a, c) => a + c.bal, 0))}</b></div></div>
        <div className={styles.bar} style={{ marginTop: 0, marginBottom: 8 }}><input className={styles.in} style={{ maxWidth: 340 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 naam / phone / code" /><button className={styles.alt} onClick={() => window.print()}>🖨 Print</button></div>
        <div className={styles.wrap} style={{ maxHeight: "60vh" }}><table className={styles.tbl}><thead><tr><th>Code</th><th>Customer</th><th>Phone</th><th className={styles.num}>Baqi</th><th></th></tr></thead><tbody>
          {list.map((c) => <tr key={c._id}><td>{c.code || "-"}</td><td>{c.name}</td><td>{c.phoneNo || c.phone || "-"}</td><td className={styles.num}><span className={`${styles.pill} ${c.bal > 0 ? styles.pDue : styles.pPaid}`}>Rs. {money(c.bal)}</span></td><td><button className={styles.alt} onClick={() => { setCustomerId(String(c._id)); window.history.replaceState(null, "", `/ledger?customer=${c._id}`); }}>Ledger kholen</button></td></tr>)}
          {!list.length && <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>Koi customer nahi.</td></tr>}</tbody></table></div>
      </div>}
      {customer && <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <div className={styles.card} style={{ overflowX: "auto", background: "#fff", padding: 0, flex: "0 1 900px", minWidth: 0, maxWidth: "100%" }}><style>{LEDGER_CSS}</style><div dangerouslySetInnerHTML={{ __html: docHtml }} /></div>
        <div style={{ flex: "1 1 280px", maxWidth: 380, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className={styles.card}><div className={styles.stat}><small>{String(customer.name || "")}</small><b style={{ fontSize: 15 }}>{String(customer.phoneNo || customer.phone || "")}{customer.code ? ` · Code ${customer.code}` : ""}</b></div></div>
          <div className={styles.card}><div style={{ display: "grid", gap: 8 }}>
            <div className={styles.stat}><small>Kul bill (sale + repair)</small><b>Rs. {money(billed)}</b></div>
            <div className={styles.stat}><small>Wasool / Paid</small><b>Rs. {money(paid)}</b></div>
            <div className={styles.stat}><small>Maujooda baqi</small><b style={{ color: ledgerBal > 0 ? "#f87171" : "#4ade80" }}>Rs. {money(Math.abs(ledgerBal))}{ledgerBal < 0 ? " (humein dene)" : ""}</b></div>
            {pendingRep > 0 && <div style={{ fontSize: 12, color: "#facc15" }}>⏳ + Rs. {money(pendingRep)} repair abhi deliver nahi hui (is mein shamil nahi)</div>}
          </div></div>
          <div className={styles.card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label>From <input className={styles.in} type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: "100%" }} /></label>
              <label>To <input className={styles.in} type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "100%" }} /></label>
            </div>
            <button className={styles.alt} style={{ marginTop: 8, width: "100%" }} onClick={() => { setFrom("2000-01-01"); setTo(ledgerToday()); }}>Sab</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className={styles.alt} disabled={working} onClick={() => printHtml(docHtml, LEDGER_CSS, `Ledger ${customer.name}`)}>🖨 Print</button>
            <button className={styles.alt} disabled={working} onClick={() => void act("pdf")}>📄 Generate PDF</button>
            <button className={styles.alt} disabled={working} onClick={() => void act("whatsapp")}>📲 WhatsApp</button>
            <button className={styles.alt} disabled={working} onClick={() => void act("png")}>🖼 PNG</button>
            {ledgerBal > 0 && <Link className={styles.alt} style={{ textDecoration: "none", textAlign: "center" }} href={`/vouchers?tab=due&customer=${customerId}`}>💰 Wasooli Voucher</Link>}
            <Link className={styles.alt} style={{ textDecoration: "none", textAlign: "center" }} href={`/repairs/new?customerId=${customerId}`}>＋ New Repair</Link>
          </div>
          <button className={styles.alt} style={{ width: "100%" }} onClick={() => { setCustomerId(""); window.history.replaceState(null, "", "/ledger"); }}>← Sab customers</button>
        </div>
      </div>}
    </section>
  </main>;
}
export default function Ledger() { return <Suspense fallback={<main className={styles.win}><p style={{ padding: 20 }}>Loading Ledger...</p></main>}><LedgerContent /></Suspense>; }
