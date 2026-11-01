"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";

const ACCOUNTS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Bank", "Other"];
const BASE_CATS = ["Shop Rent", "Bijli / Gas Bill", "Chai / Khana", "Transport / Kiraya", "Internet / Phone", "Tools / Samaan", "Shop Maintenance", "Salary Advance", "Packing / Stationery", "Other"];
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });
const localDay = (v: unknown) => { const d = v ? new Date(v as string) : null; if (!d || isNaN(+d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const today = () => localDay(new Date());
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);

export default function Expenses() {
  const [rows, setRows] = useState<any[]>([]);
  const [opts, setOpts] = useState<any[]>([]);
  const [f, setF] = useState({ date: today(), category: "Shop Rent", title: "", amount: "", account: "Cash", party: "", ref: "", note: "" });
  const [from, setFrom] = useState(today().slice(0, 8) + "01");
  const [to, setTo] = useState(today());
  const [catF, setCatF] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [e, o] = await Promise.all([fetch("/api/data?collection=expenses&limit=5000").then(arr), fetch("/api/data?collection=productOptions").then(arr)]);
    setRows(e); setOpts(o);
  };
  useEffect(() => { void load(); }, []);
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));
  const cats = useMemo(() => Array.from(new Set([...BASE_CATS, ...opts.filter((o) => o.type === "exp_category").map((o) => String(o.name)), ...rows.map((r) => String(r.category || "")).filter(Boolean)])), [opts, rows]);

  async function addCat() {
    const name = (window.prompt("Naya kharche ki category likhein:") || "").trim();
    if (!name) return;
    if (!cats.some((c) => c.toLowerCase() === name.toLowerCase())) { await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "productOptions", type: "exp_category", name }) }); setOpts((o) => [...o, { type: "exp_category", name }]); }
    set("category", name);
  }

  async function save() {
    if (busy) return;
    if (!f.title.trim()) { setMsg({ t: "Kharche ki detail likhein (kis cheez ka).", ok: false }); titleRef.current?.focus(); return; }
    if (!(Number(f.amount) > 0)) { setMsg({ t: "Amount likhein.", ok: false }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "expense", ...f, amount: Number(f.amount) }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua.");
      setMsg({ t: `Kharcha save ho gaya (${d.expenseNo}).`, ok: true });
      setF((c) => ({ ...c, title: "", amount: "", party: "", ref: "", note: "" }));
      await load(); titleRef.current?.focus();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); void saveRef.current(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  const list = useMemo(() => rows.filter((r) => { const d = localDay(r.createdAt); return d >= from && d <= to && (!catF || r.category === catF); }), [rows, from, to, catF]);
  const total = list.reduce((a, r) => a + Number(r.amount || 0), 0);
  const byCat = useMemo(() => { const m = new Map<string, number>(); for (const r of list) m.set(String(r.category || "Other"), (m.get(String(r.category || "Other")) || 0) + Number(r.amount || 0)); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [list]);
  const todayTotal = rows.filter((r) => localDay(r.createdAt) === today()).reduce((a, r) => a + Number(r.amount || 0), 0);

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Add Expense — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/daily-summary">Daily Summary</Link><Link href="/reports">Reports</Link><Link href="/vouchers">Vouchers</Link></span></div>
    <section className={styles.body}>
      <div className={styles.card}>
        <h2>💸 Naya Kharcha</h2>
        <label className={styles.row}><span>Date:</span><input className={styles.in} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
        <div className={styles.row}><span>Category:</span><div className={styles.with}><select className={styles.in} value={f.category} onChange={(e) => set("category", e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select><button type="button" className={styles.nbtn} title="Nayi category" onClick={() => void addCat()}>N</button></div></div>
        <label className={styles.row}><span>Detail:</span><input ref={titleRef} className={styles.in} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="kis cheez ka kharcha" /></label>
        <label className={styles.row}><span>Amount:</span><input className={styles.in} type="number" min="0" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className={styles.row}><span>Paid From:</span><select className={styles.in} value={f.account} onChange={(e) => set("account", e.target.value)}>{ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label className={styles.row}><span>Paid To:</span><input className={styles.in} value={f.party} onChange={(e) => set("party", e.target.value)} placeholder="kis ko diye (optional)" /></label>
        <label className={styles.row}><span>Bill / Ref:</span><input className={styles.in} value={f.ref} onChange={(e) => set("ref", e.target.value)} placeholder="bill number (optional)" /></label>
        <label className={styles.row}><span>Note:</span><input className={styles.in} value={f.note} onChange={(e) => set("note", e.target.value)} /></label>
        <div className={styles.bar}><button className={styles.save} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "💾 Save (Ctrl+S)"}</button>{msg && <span className={`${styles.msg} ${msg.ok ? styles.ok : ""}`} role="status">{msg.t}</span>}</div>
        <p className={styles.hint}>Kharcha Cash Book mein bhi chala jata hai aur Daily Summary / Reports ke profit se minus hota hai.</p>
      </div>
      <div className={styles.card}>
        <div className={styles.stats}>
          <div className={styles.stat}><small>Aaj ka kharcha</small><b>Rs. {money(todayTotal)}</b></div>
          <div className={styles.stat}><small>Chuni hui muddat</small><b>Rs. {money(total)}</b></div>
          <div className={styles.stat}><small>Entries</small><b>{list.length}</b></div>
        </div>
        <div className={styles.bar} style={{ marginTop: 0, marginBottom: 8 }}>
          <input className={styles.in} style={{ width: 150 }} type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          <input className={styles.in} style={{ width: 150 }} type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
          <select className={styles.in} style={{ width: 190 }} value={catF} onChange={(e) => setCatF(e.target.value)}><option value="">Sab categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
          <button className={styles.alt} onClick={() => window.print()}>🖨 Print</button>
        </div>
        {byCat.length > 0 && <div className={styles.stats}>{byCat.map(([c, v]) => <div key={c} className={styles.stat}><small>{c}</small><b>{money(v)}</b></div>)}</div>}
        <div className={styles.wrap}><table className={styles.tbl}><thead><tr><th>Date</th><th>No</th><th>Category</th><th>Detail</th><th>Paid To</th><th>From</th><th className={styles.num}>Amount</th></tr></thead>
          <tbody>{list.map((r) => <tr key={r._id}><td>{localDay(r.createdAt)}</td><td>{r.expenseNo || "-"}</td><td>{r.category}</td><td>{r.title}{r.note ? <small style={{ display: "block", color: "#94a3b8" }}>{r.note}</small> : null}</td><td>{r.party || "-"}</td><td>{r.account || "Cash"}</td><td className={styles.num}>{money(r.amount)}</td></tr>)}
            {!list.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: 18 }}>Is muddat mein koi kharcha nahi.</td></tr>}</tbody></table></div>
      </div>
    </section>
  </main>;
}
