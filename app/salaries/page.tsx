"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";

const ACCOUNTS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Bank", "Other"];
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });
const localDay = (v: unknown) => { const d = v ? new Date(v as string) : null; if (!d || isNaN(+d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const today = () => localDay(new Date());
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export default function Salaries() {
  const [rows, setRows] = useState<any[]>([]);
  const [emps, setEmps] = useState<any[]>([]);
  const [denied, setDenied] = useState(false);
  const [f, setF] = useState({ employee: "", month: today().slice(0, 7), date: today(), baseSalary: "", bonus: "0", deduction: "0", advance: "0", paid: "", account: "Cash", note: "" });
  const [paidTouched, setPaidTouched] = useState(false);
  const [monthF, setMonthF] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [payFor, setPayFor] = useState<any>(null);
  const [payAmt, setPayAmt] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [sRes, eRes] = await Promise.all([fetch("/api/data?collection=salaries&limit=5000"), fetch("/api/data?collection=employees&limit=500")]);
    if (sRes.status === 403) { setDenied(true); return; }
    setRows(await sRes.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []));
    setEmps(await eRes.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []));
  };
  useEffect(() => { void load(); }, []);
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));

  const names = useMemo(() => Array.from(new Set([...emps.map((e) => String(e.name || "")), ...rows.map((r) => String(r.employee || ""))].filter(Boolean))).sort(), [emps, rows]);
  const lastBase = (name: string) => { const r = rows.find((x) => x.employee === name && n(x.baseSalary) > 0); return r ? String(r.baseSalary) : String(emps.find((e) => e.name === name)?.salary || ""); };
  const net = Math.max(0, n(f.baseSalary) + n(f.bonus) - n(f.deduction) - n(f.advance));
  const paidNow = paidTouched ? f.paid : String(net || "");
  const dup = rows.find((r) => r.employee === f.employee && r.month === f.month);

  function pickEmployee(name: string) { set("employee", name); const b = lastBase(name); if (b && !f.baseSalary) set("baseSalary", b); }

  async function save() {
    if (busy) return;
    if (!f.employee.trim()) { setMsg({ t: "Employee ka naam likhein.", ok: false }); nameRef.current?.focus(); return; }
    if (!(net > 0)) { setMsg({ t: "Salary likhein.", ok: false }); return; }
    if (dup && !window.confirm(`${f.employee} ki ${f.month} ki salary pehle se darj hai. Phir bhi nayi entry karein?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "salary", employee: f.employee.trim(), month: f.month, date: f.date, baseSalary: n(f.baseSalary), bonus: n(f.bonus), deduction: n(f.deduction), advance: n(f.advance), paid: n(paidNow), account: f.account, note: f.note }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua.");
      setMsg({ t: `Salary save ho gayi (${d.salaryNo}). Baqi: Rs. ${money(d.remaining)}`, ok: true });
      setF((c) => ({ ...c, employee: "", baseSalary: "", bonus: "0", deduction: "0", advance: "0", paid: "", note: "" })); setPaidTouched(false);
      await load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }
  async function payRest() {
    if (!payFor) return;
    setBusy(true);
    try {
      const r = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "salaryPay", id: payFor._id, amount: n(payAmt), account: f.account }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Payment save nahi hui.");
      setMsg({ t: "Payment save ho gayi.", ok: true }); setPayFor(null); setPayAmt(""); await load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); void saveRef.current(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  const list = rows.filter((r) => !monthF || r.month === monthF);
  const sum = (k: string) => list.reduce((a, r) => a + n(r[k]), 0);
  const field = (label: string, k: keyof typeof f, type = "number") => <label className={styles.row}><span>{label}</span><input className={styles.in} type={type} min="0" value={f[k]} onChange={(e) => set(k, e.target.value)} /></label>;

  if (denied) return <main className={styles.win}><div className={styles.titlebar}><span>▣ Salary Payments</span><Link href="/">← Dashboard</Link></div><p style={{ padding: 20 }}>Salary page sirf admin dekh sakta hai.</p></main>;

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Salary Payments — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/expenses">Expenses</Link><Link href="/daily-summary">Daily Summary</Link><Link href="/reports">Reports</Link></span></div>
    <section className={styles.body}>
      <div className={styles.card}>
        <h2>👷 Salary Entry</h2>
        <label className={styles.row}><span>Employee:</span><input ref={nameRef} className={styles.in} list="emp-names" value={f.employee} onChange={(e) => pickEmployee(e.target.value)} placeholder="naam likhein ya chunein" /></label>
        <datalist id="emp-names">{names.map((x) => <option key={x} value={x} />)}</datalist>
        <label className={styles.row}><span>Month:</span><input className={styles.in} type="month" value={f.month} onChange={(e) => set("month", e.target.value)} /></label>
        <label className={styles.row}><span>Date:</span><input className={styles.in} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
        {field("Basic Salary:", "baseSalary")}
        {field("Bonus / Overtime:", "bonus")}
        {field("Katoti (Deduction):", "deduction")}
        {field("Advance Katna:", "advance")}
        <label className={styles.row}><span>Net Salary:</span><input className={`${styles.in} ${styles.ro}`} readOnly value={`Rs. ${money(net)}`} /></label>
        <label className={styles.row}><span>Abhi Ada:</span><input className={styles.in} type="number" min="0" value={paidNow} onChange={(e) => { setPaidTouched(true); set("paid", e.target.value); }} /></label>
        <label className={styles.row}><span>Paid From:</span><select className={styles.in} value={f.account} onChange={(e) => set("account", e.target.value)}>{ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label className={styles.row}><span>Note:</span><input className={styles.in} value={f.note} onChange={(e) => set("note", e.target.value)} /></label>
        <p className={styles.hint}>Baqi = Net − Abhi Ada. Baqi rakh kar baad mein "Baqi Ada karein" se poori kar sakte hain.{dup ? ` ⚠ ${f.employee} ki ${f.month} ki entry pehle se hai.` : ""}</p>
        <div className={styles.bar}><button className={styles.save} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "💾 Save (Ctrl+S)"}</button>{msg && <span className={`${styles.msg} ${msg.ok ? styles.ok : ""}`} role="status">{msg.t}</span>}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.stats}>
          <div className={styles.stat}><small>Net salary</small><b>Rs. {money(list.reduce((a, r) => a + n(r.net ?? r.amount), 0))}</b></div>
          <div className={styles.stat}><small>Ada hui</small><b>Rs. {money(list.reduce((a, r) => a + n(r.net === undefined ? r.amount : r.paid), 0))}</b></div>
          <div className={styles.stat}><small>Baqi</small><b>Rs. {money(sum("remaining"))}</b></div>
        </div>
        <div className={styles.bar} style={{ marginTop: 0, marginBottom: 8 }}><input className={styles.in} style={{ width: 170 }} type="month" value={monthF} onChange={(e) => setMonthF(e.target.value)} /><button className={styles.alt} onClick={() => setMonthF("")}>Sab mahine</button><button className={styles.alt} onClick={() => window.print()}>🖨 Print</button></div>
        {payFor && <div className={styles.bar} style={{ padding: 8, border: "1px solid #22d3ee66", borderRadius: 8, marginBottom: 8 }}><b>{payFor.employee} · {payFor.month} · baqi Rs. {money(payFor.remaining)}</b><input className={styles.in} style={{ width: 120 }} type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder="Amount" /><button className={styles.alt} disabled={busy} onClick={() => void payRest()}>Ada karein</button><button className={styles.alt} onClick={() => setPayFor(null)}>✕</button></div>}
        <div className={styles.wrap}><table className={styles.tbl}><thead><tr><th>Month</th><th>Employee</th><th className={styles.num}>Basic</th><th className={styles.num}>+/−</th><th className={styles.num}>Net</th><th className={styles.num}>Ada</th><th className={styles.num}>Baqi</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.map((r) => { const old = r.net === undefined; const rem = n(r.remaining); return <tr key={r._id}><td>{r.month}</td><td>{r.employee}<small style={{ display: "block", color: "#94a3b8" }}>{r.salaryNo || ""} {localDay(r.createdAt)} · {r.account || "Cash"}</small></td>
            <td className={styles.num}>{old ? "-" : money(r.baseSalary)}</td><td className={styles.num}>{old ? "-" : money(n(r.bonus) - n(r.deduction) - n(r.advance))}</td><td className={styles.num}>{money(old ? r.amount : r.net)}</td><td className={styles.num}>{money(old ? r.amount : r.paid)}</td><td className={styles.num}>{money(rem)}</td>
            <td><span className={`${styles.pill} ${rem <= 0 ? styles.pPaid : n(r.paid) > 0 ? styles.pPart : styles.pDue}`}>{rem <= 0 ? "Paid" : n(r.paid) > 0 ? "Partial" : "Baqi"}</span></td>
            <td>{rem > 0 && <button className={styles.alt} onClick={() => { setPayFor(r); setPayAmt(String(rem)); }}>Baqi Ada karein</button>}</td></tr>; })}
            {!list.length && <tr><td colSpan={9} style={{ textAlign: "center", color: "#94a3b8", padding: 18 }}>Koi salary entry nahi.</td></tr>}</tbody></table></div>
      </div>
    </section>
  </main>;
}
