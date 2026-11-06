"use client";
import { SHOP } from "@/lib/shop";
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
  const [saved, setSaved] = useState<any>(null);
  const [slip, setSlip] = useState<any>(null);
  const printSlip = (rec: any, size: string) => { setSlip({ rec, size }); setTimeout(() => window.print(), 150); };
  const slipOf = (h: any) => ({ invoiceNo: h.invoiceNo, date: h.createdAt || new Date().toISOString(), customerName: h.supplierName || customers.find((c) => String(c._id) === String(h.customerId))?.name || "", phone: (customers.find((c) => String(c._id) === String(h.customerId)) || {}).phone || (customers.find((c) => String(c._id) === String(h.customerId)) || {}).phoneNo || "", items: h.items || [], total: h.total, paid: h.paid, adjusted: h.adjusted, remaining: h.remaining, prevBalance: h.prevBalance, newBalance: h.newBalance, account: h.paymentMethod || "Cash", note: h.note || "" });

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
      setSaved(slipOf({ invoiceNo: d.invoiceNo, createdAt: new Date().toISOString(), supplierName: customer?.name, customerId, items: used.map((l) => ({ name: l.name, qty: n(l.qty), costPrice: n(l.cost) })), total: d.total, paid: cash, adjusted: d.adjusted, remaining: d.remaining, prevBalance: d.prevBalance, newBalance: d.newBalance, paymentMethod: account, note }));
      setLines([blank()]); setPaid(""); setAdjust(""); setNote(""); await load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); void saveRef.current(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Local Purchase (Customer se khareed) — {SHOP.name}</span><span><Link href="/">← Dashboard</Link><Link href="/purchases">Purchase</Link><Link href="/vouchers">Vouchers</Link><Link href="/customers">Customers</Link></span></div>
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
        <div className={styles.wrap} style={{ maxHeight: "30vh" }}><table className={styles.tbl}><thead><tr><th>Date</th><th>No</th><th>Customer</th><th>Items</th><th className={styles.num}>Bill</th><th className={styles.num}>Cash</th><th className={styles.num}>Adjust</th><th className={styles.num}>Baqi</th><th></th></tr></thead><tbody>
          {history.map((h) => <tr key={h._id}><td>{localDay(h.createdAt)}</td><td>{h.invoiceNo}</td><td>{h.supplierName}</td><td>{(h.items || []).map((i: any) => `${i.name} ×${i.qty}`).join(", ")}</td><td className={styles.num}>{money(h.total)}</td><td className={styles.num}>{money(h.paid)}</td><td className={styles.num}>{money(h.adjusted)}</td><td className={styles.num}>{money(h.remaining)}</td><td><button type="button" className={styles.nbtn} style={{ padding: "2px 8px" }} onClick={() => printSlip(slipOf(h), "thermal")}>🖨 Slip</button></td></tr>)}
          {!history.length && <tr><td colSpan={9} style={{ textAlign: "center", color: "#94a3b8", padding: 14 }}>Abhi koi local purchase nahi.</td></tr>}</tbody></table></div>
      </div>
    </section>
    {saved && <div role="dialog" aria-label="Local purchase save ho gayi" style={{ position: "fixed", left: "50%", bottom: 14, transform: "translateX(-50%)", zIndex: 50, width: "min(560px, calc(100vw - 24px))", boxSizing: "border-box", background: "#0b1220", border: "1px solid #22d3ee", borderRadius: 12, padding: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
      <div><b>✅ {saved.invoiceNo} save ho gayi</b><br /><span style={{ color: "#94a3b8", fontSize: 13 }}>Kul Rs. {money(saved.total)} · Slip nikalni hai?</span></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[["Thermal", "thermal"], ["A5", "a5"], ["A4", "a4"]].map(([l, v]) => <button key={v} type="button" className={styles.save} onClick={() => printSlip(saved, v)}>🖨 {l}</button>)}
        <button type="button" className={styles.alt} onClick={() => setSaved(null)}>Band</button>
      </div>
    </div>}
    {slip && <div className="lpSlip" style={{ width: slip.size === "thermal" ? "72mm" : slip.size === "a5" ? "148mm" : "190mm" }}>
      <style>{`.lpSlip{display:none}@media print{@page{size:${slip.size === "a4" ? "A4" : slip.size === "a5" ? "A5" : "auto"};margin:${slip.size === "thermal" ? "0" : "10mm"}}html,body{height:auto!important;min-height:0!important;overflow:visible!important;background:#fff!important}main:has(.lpSlip)>:not(.lpSlip){display:none!important}main:has(.lpSlip){height:auto!important;min-height:0!important;display:block!important;border:0!important;background:#fff!important}.lpSlip{display:block;color:#000;background:#fff;font:${slip.size === "thermal" ? "11px" : "13px"} Arial,sans-serif;padding:${slip.size === "thermal" ? "2mm 3mm" : "0"};box-sizing:content-box}.lpSlip h2,.lpSlip h3,.lpSlip p{margin:2px 0;text-align:center}.lpSlip table{width:100%;border-collapse:collapse}.lpSlip th,.lpSlip td{border-bottom:1px solid #999;padding:2px 3px;text-align:left}.lpSlip td.r,.lpSlip th.r{text-align:right}.lpSlip .tot div{display:flex;justify-content:space-between;padding:1px 0}.lpSlip .sig{display:flex;justify-content:space-between;margin-top:22px}}`}</style>
      <h2>{SHOP.nameUpper}</h2><h3>LOCAL PURCHASE SLIP</h3>
      <p>{SHOP.address}</p>
      <p style={{ textAlign: "left" }}>No: <b>{slip.rec.invoiceNo}</b> &nbsp; Date: {localDay(slip.rec.date)}</p>
      <p style={{ textAlign: "left" }}>Customer: <b>{slip.rec.customerName}</b>{slip.rec.phone ? ` · ${slip.rec.phone}` : ""}</p>
      <table><thead><tr><th>#</th><th>Item</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
        <tbody>{slip.rec.items.map((i: any, k: number) => <tr key={k}><td>{k + 1}</td><td>{String(i.name || "")}</td><td className="r">{i.qty}</td><td className="r">{money(i.costPrice)}</td><td className="r">{money(n(i.qty) * n(i.costPrice))}</td></tr>)}</tbody></table>
      <div className="tot">
        <div><b>Total Bill</b><b>Rs. {money(slip.rec.total)}</b></div>
        {n(slip.rec.paid) > 0 && <div><span>Paid in {slip.rec.account}</span><span>Rs. {money(slip.rec.paid)}</span></div>}
        {slip.rec.prevBalance != null ? <>
          <div style={{ borderTop: "1px solid #000", marginTop: 2, paddingTop: 2 }}><span>Previous Balance</span><span>Rs. {money(slip.rec.prevBalance)}</span></div>
          <div><span>Less: Bill Adjusted from Account (Khata)</span><span>Rs. {money(n(slip.rec.total) - n(slip.rec.paid))}</span></div>
          <div style={{ borderTop: "1px solid #000", marginTop: 2, paddingTop: 2 }}><b>Current Balance</b><b>Rs. {money(slip.rec.newBalance)}</b></div>
        </> : <div><b>Balance Due to Customer</b><b>Rs. {money(slip.rec.remaining)}</b></div>}
      </div>
      <p style={{ textAlign: "left", fontSize: "0.85em" }}>(-) minus balance = shop has to pay the customer.</p>
      {slip.rec.note ? <p style={{ textAlign: "left" }}>Note: {slip.rec.note}</p> : null}
      <p>Thank you!</p>
    </div>}
  </main>;
}
