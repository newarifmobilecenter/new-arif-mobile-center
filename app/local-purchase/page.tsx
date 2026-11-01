"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";

const ACCOUNTS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Bank", "Other"];
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const localDay = (v: unknown) => { const d = v ? new Date(v as string) : null; if (!d || isNaN(+d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
type Line = { key: number; productId: string; name: string; qty: string; cost: string; retail: string; q: string };
let seq = 1;
const blank = (): Line => ({ key: seq++, productId: "", name: "", qty: "1", cost: "", retail: "", q: "" });

export default function LocalPurchase() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [cq, setCq] = useState("");
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [open, setOpen] = useState<number | null>(null);
  const [paid, setPaid] = useState("");
  const [adjust, setAdjust] = useState("");
  const [account, setAccount] = useState("Cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const load = async () => {
    const [c, p, s, r, h] = await Promise.all([fetch("/api/data?collection=customers&limit=5000").then(arr), fetch("/api/data?collection=products&limit=5000").then(arr), fetch("/api/data?collection=sales&limit=5000").then(arr), fetch("/api/repairs?status=PAYMENT_DUE").then(arr).catch(() => []), fetch("/api/data?collection=purchases&limit=5000").then(arr)]);
    setCustomers(c); setProducts(p); setSales(s); setRepairs(r); setHistory(h.filter((x: any) => x.kind === "LOCAL"));
  };
  useEffect(() => { void load(); }, []);

  const customer = customers.find((c) => String(c._id) === customerId);
  const due = useMemo(() => customerId ? sales.filter((x) => String(x.customerId || "") === customerId && x.status !== "cancelled").reduce((a, x) => a + n(x.remaining), 0) + repairs.filter((x) => String(x.customerId || "") === customerId).reduce((a, x) => a + n(x.remaining), 0) : 0, [customerId, sales, repairs]);
  const custMatches = useMemo(() => { const q = cq.trim().toLowerCase(); return q.length < 1 || customer?.name === cq ? [] : customers.filter((c) => `${c.name} ${c.phone} ${c.phoneNo} ${c.code}`.toLowerCase().includes(q)).slice(0, 8); }, [cq, customers, customer]);
  const total = lines.reduce((a, l) => a + n(l.qty) * n(l.cost), 0);
  const cash = n(paid), adj = n(adjust);
  const owe = Math.max(0, total - cash - adj);

  const setLine = (key: number, p: Partial<Line>) => setLines((o) => o.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const choose = (key: number, p: any) => { setLine(key, { productId: String(p._id), name: String(p.name || p.model || ""), q: String(p.name || p.model || ""), cost: String(p.costPrice ?? ""), retail: String(p.price ?? "") }); setOpen(null); };
  const matches = (q: string) => { const s = q.trim().toLowerCase(); return s.length < 1 ? [] : products.filter((p) => `${p.name} ${p.model} ${p.code} ${p.sku} ${p.barcode} ${p.brand}`.toLowerCase().includes(s)).slice(0, 10); };

  async function save() {
    if (busy) return;
    if (!customerId) return setMsg({ t: "Pehle customer chunein jis se maal le rahe hain.", ok: false });
    const used = lines.filter((l) => l.productId);
    if (!used.length) return setMsg({ t: "Kam az kam ek product (list se chun kar) likhein.", ok: false });
    if (used.some((l) => !(n(l.qty) > 0) || !Number.isInteger(n(l.qty)) || n(l.cost) < 0 || l.cost === "")) return setMsg({ t: "Har item ki poori qty aur rate likhein.", ok: false });
    if (cash + adj > total + 0.0001) return setMsg({ t: "Cash + adjust kul bill se zyada hai.", ok: false });
    if (adj > due + 0.0001) return setMsg({ t: `Is customer ka baqi sirf Rs. ${money(due)} hai.`, ok: false });
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/purchases/local", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, items: used.map((l) => ({ productId: l.productId, name: l.name, qty: n(l.qty), costPrice: n(l.cost), retail: n(l.retail) })), paid: cash, adjustDue: adj, paymentMethod: account, note }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua.");
      setMsg({ t: `Local purchase ${d.invoiceNo} save ho gayi. Stock barh gaya.${d.adjusted ? ` Rs. ${money(d.adjusted)} customer ke baqi mein adjust.` : ""}${d.remaining > 0 ? ` Customer ko dene baqi: Rs. ${money(d.remaining)}.` : ""}`, ok: true });
      setLines([blank()]); setPaid(""); setAdjust(""); setNote(""); await load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); void saveRef.current(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Local Purchase (Customer se khareed) — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/purchases">Purchase</Link><Link href="/vouchers">Vouchers</Link><Link href="/customers">Customers</Link></span></div>
    <section className={styles.body} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className={styles.card}>
        <h2>🤝 Saved Customer se Maal Lena</h2>
        <div className={styles.row} style={{ position: "relative", gridTemplateColumns: "120px minmax(0, 420px)" }}><span>Customer:</span><span style={{ position: "relative" }}>
          <input className={styles.in} value={customer && cq === "" ? customer.name : cq} onChange={(e) => { setCq(e.target.value); setCustomerId(""); }} placeholder="naam / phone se dhoondein" />
          {custMatches.length > 0 && <span className={styles.pick}>{custMatches.map((c) => <button key={c._id} type="button" onClick={() => { setCustomerId(String(c._id)); setCq(String(c.name)); }}>{c.name} · {c.phoneNo || c.phone || "-"}</button>)}</span>}</span></div>
        {customer && <p className={styles.hint}>{customer.name} ka mojooda baqi (humein milna): <b>Rs. {money(due)}</b> — chahein to neeche "Baqi mein Adjust" se is maal ki raqam usi mein kaat sakte hain.</p>}
        <table className={styles.lines}><thead><tr><th style={{ width: "42%" }}>Product (stock mein add hoga)</th><th>Qty</th><th>Rate (cost)</th><th>Retail</th><th>Amount</th><th></th></tr></thead><tbody>
          {lines.map((l) => <tr key={l.key}>
            <td style={{ position: "relative" }}><input className={styles.in} value={l.q} onFocus={() => setOpen(l.key)} onChange={(e) => { setLine(l.key, { q: e.target.value, productId: "" }); setOpen(l.key); }} placeholder="product search karein" />
              {open === l.key && !l.productId && matches(l.q).length > 0 && <span className={styles.pick}>{matches(l.q).map((p) => <button key={p._id} type="button" onClick={() => choose(l.key, p)}>{p.name || p.model} · stock {n(p.stock)} · cost {money(p.costPrice)}</button>)}</span>}</td>
            <td><input className={styles.in} style={{ width: 70 }} type="number" min="1" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} /></td>
            <td><input className={styles.in} style={{ width: 100 }} type="number" min="0" value={l.cost} onChange={(e) => setLine(l.key, { cost: e.target.value })} /></td>
            <td><input className={styles.in} style={{ width: 100 }} type="number" min="0" value={l.retail} onChange={(e) => setLine(l.key, { retail: e.target.value })} /></td>
            <td style={{ textAlign: "right", fontWeight: 800 }}>{money(n(l.qty) * n(l.cost))}</td>
            <td>{lines.length > 1 && <button className={styles.nbtn} style={{ padding: "2px 8px" }} onClick={() => setLines((o) => o.filter((x) => x.key !== l.key))}>✕</button>}</td></tr>)}
        </tbody></table>
        <button className={styles.alt} onClick={() => setLines((o) => [...o, blank()])}>+ Item add karein</button>
        <p className={styles.hint}>Naya item ho to pehle "New Item" (Add Product) se bana lein, phir yahan chunein.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8, marginTop: 6 }}>
          <label className={styles.row} style={{ gridTemplateColumns: "1fr" }}><span>Kul Bill</span><input className={`${styles.in} ${styles.ro}`} readOnly value={`Rs. ${money(total)}`} /></label>
          <label className={styles.row} style={{ gridTemplateColumns: "1fr" }}><span>Cash / Account se Ada</span><input className={styles.in} type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} /></label>
          <label className={styles.row} style={{ gridTemplateColumns: "1fr" }}><span>Paid From</span><select className={styles.in} value={account} onChange={(e) => setAccount(e.target.value)}>{ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className={styles.row} style={{ gridTemplateColumns: "1fr" }}><span>Customer ke Baqi mein Adjust</span><input className={styles.in} type="number" min="0" value={adjust} onChange={(e) => setAdjust(e.target.value)} placeholder={due > 0 ? `max ${money(due)}` : "baqi nahi"} disabled={!customerId || due <= 0} /></label>
          <label className={styles.row} style={{ gridTemplateColumns: "1fr" }}><span>Customer ko dene baqi</span><input className={`${styles.in} ${styles.ro}`} readOnly value={`Rs. ${money(owe)}`} /></label>
        </div>
        <label className={styles.row}><span>Note:</span><input className={styles.in} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className={styles.bar}><button className={styles.save} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "💾 Save Local Purchase (Ctrl+S)"}</button>{msg && <span className={`${styles.msg} ${msg.ok ? styles.ok : ""}`} role="status">{msg.t}</span>}</div>
      </div>
      <div className={styles.card}>
        <h2>Pichli Local Purchases</h2>
        <div className={styles.wrap} style={{ maxHeight: "30vh" }}><table className={styles.tbl}><thead><tr><th>Date</th><th>No</th><th>Customer</th><th>Items</th><th className={styles.num}>Bill</th><th className={styles.num}>Cash</th><th className={styles.num}>Adjust</th><th className={styles.num}>Baqi</th></tr></thead><tbody>
          {history.map((h) => <tr key={h._id}><td>{localDay(h.createdAt)}</td><td>{h.invoiceNo}</td><td>{h.supplierName}</td><td>{(h.items || []).map((i: any) => `${i.name} ×${i.qty}`).join(", ")}</td><td className={styles.num}>{money(h.total)}</td><td className={styles.num}>{money(h.paid)}</td><td className={styles.num}>{money(h.adjusted)}</td><td className={styles.num}>{money(h.remaining)}</td></tr>)}
          {!history.length && <tr><td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: 14 }}>Abhi koi local purchase nahi.</td></tr>}</tbody></table></div>
      </div>
    </section>
  </main>;
}
