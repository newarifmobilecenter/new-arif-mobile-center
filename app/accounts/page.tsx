"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";
import BrandBanner from "../components/BrandBanner";

const ACC = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Bank", "Other Bank", "Other"];
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const localDay = (v: unknown) => { const d = v ? new Date(v as string) : null; if (!d || isNaN(+d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const today = () => localDay(new Date());
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const signed = (t: any) => (t.type === "IN" ? n(t.amount) : -n(t.amount));

export default function Accounts() {
  const [tx, setTx] = useState<any[]>([]);
  const [account, setAccount] = useState("Cash");
  const [from, setFrom] = useState(today().slice(0, 8) + "01");
  const [to, setTo] = useState(today());
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ type: "IN", amount: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/data?collection=transactions&limit=5000").then(arr).then(setTx);
  useEffect(() => { void load(); }, []);

  const balances = useMemo(() => ACC.map((a) => ({ name: a, bal: tx.filter((t) => (t.account || "Cash") === a).reduce((s, t) => s + signed(t), 0) })), [tx]);
  const rows = useMemo(() => {
    const mine = tx.filter((t) => (t.account || "Cash") === account).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const opening = mine.filter((t) => localDay(t.createdAt) < from).reduce((s, t) => s + signed(t), 0);
    let run = opening;
    const s = q.trim().toLowerCase();
    const list = mine.filter((t) => { const d = localDay(t.createdAt); return d >= from && d <= to; }).map((t) => { run += signed(t); return { ...t, run }; }).filter((t) => !s || `${t.party} ${t.note} ${t.ref}`.toLowerCase().includes(s));
    return { opening, list, closing: run };
  }, [tx, account, from, to, q]);
  const totIn = rows.list.filter((t) => t.type === "IN").reduce((a, t) => a + n(t.amount), 0);
  const totOut = rows.list.filter((t) => t.type === "OUT").reduce((a, t) => a + n(t.amount), 0);

  async function addEntry() {
    if (!(n(form.amount) > 0)) { setMsg("Amount likhein."); return; }
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "transactions", account, type: form.type, amount: n(form.amount), note: form.note, party: "Manual entry", voucherType: "MANUAL" }) });
      if (!r.ok) throw new Error();
      setForm({ type: "IN", amount: "", note: "" }); setMsg("Entry save ho gayi."); await load();
    } catch { setMsg("Entry save nahi hui."); } finally { setBusy(false); }
  }

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Bank / Account Ledger — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/vouchers">Voucher</Link><Link href="/expenses">Expenses</Link><Link href="/reports">Reports</Link></span></div>
    <BrandBanner title="Account Ledger" subtitle={`${account} · ${from} se ${to}`} />
    <section className={styles.body} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className={styles.card}>
        <div className={styles.stats}>{balances.map((b) => <button key={b.name} onClick={() => setAccount(b.name)} className={styles.stat} style={{ cursor: "pointer", textAlign: "left", borderColor: account === b.name ? "#22d3ee" : undefined, background: account === b.name ? "#0b3b6b" : undefined, color: "#e5e7eb" }}><small>{b.name}</small><b style={{ color: b.bal < 0 ? "#f87171" : "#22d3ee" }}>Rs. {money(b.bal)}</b></button>)}</div>
        <div className={styles.bar} style={{ marginTop: 0, marginBottom: 8 }}>
          <input className={styles.in} style={{ width: 150 }} type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          <input className={styles.in} style={{ width: 150 }} type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
          <input className={styles.in} style={{ width: 240 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 party / detail / ref" />
          <button className={styles.alt} onClick={() => { setFrom(today()); setTo(today()); }}>Aaj</button>
          <button className={styles.alt} onClick={() => { setFrom(today().slice(0, 8) + "01"); setTo(today()); }}>Is mahine</button>
          <button className={styles.alt} onClick={() => { setFrom("2000-01-01"); setTo(today()); }}>Sab</button>
          <button className={styles.alt} onClick={() => window.print()}>🖨 Print</button>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}><small>Opening</small><b>Rs. {money(rows.opening)}</b></div>
          <div className={styles.stat}><small>Total In</small><b style={{ color: "#4ade80" }}>Rs. {money(totIn)}</b></div>
          <div className={styles.stat}><small>Total Out</small><b style={{ color: "#f87171" }}>Rs. {money(totOut)}</b></div>
          <div className={styles.stat}><small>Closing</small><b>Rs. {money(rows.closing)}</b></div>
        </div>
        <div className={styles.wrap} style={{ maxHeight: "44vh" }}><table className={styles.tbl}><thead><tr><th>Date</th><th>Ref</th><th>Party</th><th>Detail</th><th className={styles.num}>In</th><th className={styles.num}>Out</th><th className={styles.num}>Balance</th></tr></thead><tbody>
          <tr><td colSpan={6}><i>Opening balance</i></td><td className={styles.num}>{money(rows.opening)}</td></tr>
          {rows.list.map((t) => <tr key={t._id}><td>{localDay(t.createdAt)}</td><td>{t.ref || "-"}</td><td>{t.party || "-"}</td><td>{t.note || t.voucherType || "-"}</td><td className={styles.num} style={{ color: "#4ade80" }}>{t.type === "IN" ? money(t.amount) : ""}</td><td className={styles.num} style={{ color: "#f87171" }}>{t.type === "OUT" ? money(t.amount) : ""}</td><td className={styles.num}>{money(t.run)}</td></tr>)}
          {!rows.list.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: 14 }}>Is muddat mein {account} mein koi entry nahi.</td></tr>}</tbody></table></div>
      </div>
      <div className={styles.card}>
        <h2>➕ {account} mein Manual Entry</h2>
        <div className={styles.bar} style={{ marginTop: 0 }}>
          <select className={styles.in} style={{ width: 140 }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="IN">Money In</option><option value="OUT">Money Out</option></select>
          <input className={styles.in} style={{ width: 140 }} type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" />
          <input className={styles.in} style={{ width: 260 }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Detail" />
          <button className={styles.save} disabled={busy} onClick={() => void addEntry()}>Save</button>{msg && <span className={styles.msg}>{msg}</span>}
        </div>
        <p className={styles.hint}>Sale, voucher, expense, salary aur purchase ki payments yahan khud aa jati hain; ye sirf alag se paisa dalne/nikalne ke liye hai.</p>
      </div>
    </section>
  </main>;
}
