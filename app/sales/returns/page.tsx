"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./saleReturn.module.css";

const money = (n: any) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const day = (v: any) => { const d = new Date(v); return isNaN(+d) ? "-" : d.toLocaleDateString("en-GB"); };
type Line = { key: string; productId: string; name: string; qty: string; rate: string };

export default function SaleReturns() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [custQ, setCustQ] = useState(""); const [custOpen, setCustOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [q, setQ] = useState(""); const [qOpen, setQOpen] = useState(false); const [hl, setHl] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [focus, setFocus] = useState<string>("");
  const [mode, setMode] = useState("BALANCE"); const [account, setAccount] = useState("Cash");
  const [reason, setReason] = useState("Customer Return");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const qRef = useRef<HTMLInputElement>(null);

  const arr = (r: Response) => r.json().then((d) => (Array.isArray(d) ? d : []));
  const load = () => Promise.all([
    fetch("/api/data?collection=customers&limit=5000", { cache: "no-store" }).then(arr),
    fetch("/api/data?collection=products&limit=5000", { cache: "no-store" }).then(arr),
    fetch("/api/data?collection=sales&limit=5000", { cache: "no-store" }).then(arr),
    fetch("/api/data?collection=returns&limit=5000", { cache: "no-store" }).then(arr),
  ]).then(([c, p, s, r]) => { setCustomers(c); setProducts(p); setSales(s); setReturns(r.filter((x: any) => x.type === "SALE_RETURN")); }).catch(() => {});
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    let last = 0;
    const refresh = () => { if (document.visibilityState === "hidden" || Date.now() - last < 1500) return; last = Date.now(); void load(); };
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  const customer = customers.find((c) => String(c._id) === customerId);
  async function loadBalance(id: string) {
    setBalance(null);
    if (!id) return;
    try { const r = await fetch(`/api/customers/${id}/summary`, { cache: "no-store" }); const d = await r.json(); if (r.ok) setBalance(Number(d.balance || 0)); } catch {}
  }
  function pickCustomer(id: string) { setCustomerId(id); setCustOpen(false); setCustQ(""); setLines([]); setFocus(""); setMode(id ? "BALANCE" : "CASH"); void loadBalance(id); setTimeout(() => qRef.current?.focus(), 50); }

  const custMatches = useMemo(() => {
    const t = custQ.toLowerCase().split(/\s+/).filter(Boolean);
    return (t.length ? customers.filter((c) => { const x = `${c.name || ""} ${c.phone || ""} ${c.code || ""} ${c.city || ""}`.toLowerCase(); return t.every((w) => x.includes(w)); }) : customers).slice(0, 50);
  }, [customers, custQ]);

  // Is customer ko becha gaya maal: product -> [{date, invoiceNo, qty, rate}]
  const sold = useMemo(() => {
    const m = new Map<string, any[]>();
    if (!customerId) return m;
    for (const s of sales) {
      if (String(s.customerId || "") !== customerId || s.status === "cancelled") continue;
      for (const it of s.items || []) if (it.productId) {
        const k = String(it.productId);
        const net = Number(it.price || 0) * (1 - Number(it.discountPct || 0) / 100);
        m.set(k, [...(m.get(k) || []), { date: s.date || s.createdAt, createdAt: s.createdAt, invoiceNo: s.invoiceNo, qty: Number(it.qty || 0), rate: net, name: it.name }]);
      }
    }
    for (const v of m.values()) v.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return m;
  }, [sales, customerId]);
  const returnedQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of returns) if (String(r.customerId || "") === customerId || (r.saleId && sales.find((s) => String(s._id) === String(r.saleId) && String(s.customerId || "") === customerId))) m.set(String(r.productId), (m.get(String(r.productId)) || 0) + Number(r.qty || 0));
    return m;
  }, [returns, sales, customerId]);
  const soldQty = (pid: string) => (sold.get(pid) || []).reduce((a, x) => a + x.qty, 0);
  const leftQty = (pid: string) => Math.max(0, soldQty(pid) - (returnedQty.get(pid) || 0));

  const matches = useMemo(() => {
    const t = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    return products.filter((p) => { const x = `${p.name || ""} ${p.code || ""} ${p.barcode || ""} ${p.model || ""}`.toLowerCase(); return t.every((w) => x.includes(w)); }).slice(0, 40);
  }, [products, q]);

  function addProduct(p: any) {
    const pid = String(p._id);
    const last = (sold.get(pid) || [])[0];
    const rate = last ? last.rate : Number(p.price || 0);
    setLines((cur) => {
      const ex = cur.find((l) => l.productId === pid);
      if (ex) return cur.map((l) => (l.productId === pid ? { ...l, qty: String(Number(l.qty || 0) + 1) } : l));
      return [...cur, { key: `${pid}-${Date.now()}`, productId: pid, name: String(p.name || ""), qty: "1", rate: String(Math.round(rate * 100) / 100) }];
    });
    setFocus(pid); setQ(""); setQOpen(false); setHl(0); setMsg(null);
    setTimeout(() => qRef.current?.focus(), 30);
  }
  const total = lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.rate || 0), 0);
  const newBalance = balance === null ? null : balance - total;
  const focusLine = lines.find((l) => l.productId === focus) || lines[lines.length - 1];
  const focusHist = focusLine ? sold.get(focusLine.productId) || [] : [];

  async function save() {
    if (busy) return;
    if (!lines.length) return setMsg({ t: "Pehle item add karein.", ok: false });
    for (const l of lines) {
      const qn = Number(l.qty);
      if (!Number.isInteger(qn) || qn <= 0 || !(Number(l.rate) >= 0)) return setMsg({ t: `${l.name}: Qty aur Rate sahi likhein.`, ok: false });
      if (customerId && qn > leftQty(l.productId)) return setMsg({ t: `${l.name}: is customer ko sirf ${leftQty(l.productId)} piece wapas ho sakte hain.`, ok: false });
    }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/sales/return-customer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: customerId || null, mode, account, reason, items: lines.map((l) => ({ productId: l.productId, qty: Number(l.qty), rate: Number(l.rate) })) }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Return save nahi hui.");
      setMsg({ t: `Return ${d.returnNo} save: Rs. ${money(d.total)}${d.adjusted > 0 ? ` balance se less hue` : ""}${d.refund > 0 ? ` · Rs. ${money(d.refund)} cash wapas` : ""}${d.newBalance !== null ? ` · naya balance Rs. ${money(d.newBalance)}` : ""}`, ok: true });
      setLines([]); setFocus(""); await load(); void loadBalance(customerId);
    } catch (e: any) { setMsg({ t: e?.message || "Return save nahi hui.", ok: false }); } finally { setBusy(false); }
  }

  const prodName = (r: any) => r.productName || products.find((p) => String(p._id) === String(r.productId))?.name || "(deleted)";
  const recent = [...returns].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 30);

  return <main className={styles.page}><div className={styles.win}>
    <header className={styles.top}><Link href="/">← Dashboard</Link><h1>Sale Return</h1><nav><Link href="/pos" target="arifSide" rel="noopener">New Sale</Link><Link href="/sales" target="arifSide" rel="noopener">Sales History</Link><Link href="/purchases/returns" target="arifSide" rel="noopener">Purchase Return</Link></nav></header>

    <section className={styles.head}>
      <label className={`${styles.wide}`}>Customer
        <input autoComplete="off" value={custOpen ? custQ : (customer ? `${customer.name}${customer.phone ? ` — ${customer.phone}` : ""}` : "CASH (walking customer)")} placeholder="Customer ka naam / phone likhein"
          onFocus={(e) => { setCustQ(""); setCustOpen(true); e.currentTarget.select(); }} onBlur={() => setTimeout(() => setCustOpen(false), 160)} onChange={(e) => { setCustQ(e.target.value); setCustOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); pickCustomer(custMatches[0] ? String(custMatches[0]._id) : ""); } }} />
        {custOpen && <div className={styles.custList}>
          <button type="button" className={styles.opt} onMouseDown={(e) => { e.preventDefault(); pickCustomer(""); }}>CASH (walking customer)</button>
          {custMatches.map((c) => <button type="button" key={c._id} className={styles.opt} onMouseDown={(e) => { e.preventDefault(); pickCustomer(String(c._id)); }}>{c.name}{c.phone ? ` — ${c.phone}` : ""}{c.city ? ` · ${c.city}` : ""}</button>)}
          {!custMatches.length && custQ.trim() && <div className={styles.none}>Koi customer nahi mila</div>}
        </div>}
      </label>
      <label>Return ka tareeqa
        <select value={mode} disabled={!customerId} onChange={(e) => setMode(e.target.value)}><option value="BALANCE">Customer ke balance se less</option><option value="CASH">Cash / Bank wapas</option></select>
      </label>
      {(mode === "CASH" || !customerId) ? <label>Account<select value={account} onChange={(e) => setAccount(e.target.value)}><option>Cash</option><option>Bank</option><option>JazzCash</option><option>Easypaisa</option></select></label> : <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
    </section>

    {customerId && <div className={styles.balBox}>
      <span>Customer balance: <b className={(balance ?? 0) > 0 ? styles.pos : styles.neg}>{balance === null ? "…" : `Rs. ${money(balance)}`}</b></span>
      {balance !== null && lines.length > 0 && <span>Return ke baad: <b>{`Rs. ${money(newBalance)}`}</b></span>}
    </div>}

    <div className={styles.entryRow}>
      <input ref={qRef} className={styles.entry} autoComplete="off" value={q} placeholder="Item ka naam / code / barcode likh kar Enter dabayein"
        onChange={(e) => { setQ(e.target.value); setQOpen(true); setHl(0); }} onFocus={() => setQOpen(true)} onBlur={() => setTimeout(() => setQOpen(false), 160)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHl((h) => Math.min(matches.length - 1, h + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHl((h) => Math.max(0, h - 1)); }
          else if (e.key === "Enter") { e.preventDefault(); const exact = products.find((p) => q.trim() && String(p.barcode || "").toLowerCase() === q.trim().toLowerCase()); const p = exact || matches[hl]; if (p) addProduct(p); }
          else if (e.key === "Escape") setQOpen(false);
        }} />
      {qOpen && matches.length > 0 && <div className={styles.prodList} style={{ left: 12, right: 12 }}>
        {matches.map((p, i) => { const pid = String(p._id); const s = soldQty(pid); return <button type="button" key={pid} className={`${styles.opt} ${i === hl ? styles.optOn : ""}`} onMouseDown={(e) => { e.preventDefault(); addProduct(p); }}>{p.name}<small>{p.code || ""}</small>{customerId && <small>{s > 0 ? `isko becha: ${s}` : "isko nahi becha"}</small>}</button>; })}
      </div>}
    </div>

    {customerId && sold.size > 0 && <div className={styles.chips}>
      <span style={{ color: "#7fa8c9", fontSize: 12, alignSelf: "center" }}>Is customer ke items:</span>
      {[...sold.entries()].slice(0, 40).map(([pid, list]) => { const p = products.find((x) => String(x._id) === pid); if (!p || leftQty(pid) <= 0) return null; return <button type="button" key={pid} className={styles.chip} onClick={() => addProduct(p)}>{p.name} · Rs. {money(list[0].rate)}</button>; })}
    </div>}

    <div className={styles.tableWrap}>
      <table className={styles.tbl}><thead><tr><th>#</th><th>Item</th><th className={styles.num}>Isko becha</th><th>Qty</th><th>Rate</th><th className={styles.num}>Total</th><th></th></tr></thead>
        <tbody>
          {lines.map((l, i) => <tr key={l.key} className={l.productId === focus ? styles.on : ""} onClick={() => setFocus(l.productId)}>
            <td>{i + 1}</td><td>{l.name}</td><td className={styles.num}>{customerId ? `${soldQty(l.productId)} (wapas ho sakte ${leftQty(l.productId)})` : "-"}</td>
            <td><input inputMode="numeric" value={l.qty} onFocus={(e) => e.target.select()} onChange={(e) => setLines((c) => c.map((x) => (x.key === l.key ? { ...x, qty: e.target.value.replace(/\D/g, "") } : x)))} /></td>
            <td><input inputMode="decimal" value={l.rate} onFocus={(e) => e.target.select()} onChange={(e) => setLines((c) => c.map((x) => (x.key === l.key ? { ...x, rate: e.target.value.replace(/[^\d.]/g, "") } : x)))} /></td>
            <td className={styles.num}>{money(Number(l.qty || 0) * Number(l.rate || 0))}</td>
            <td><button type="button" className={styles.x} onClick={() => setLines((c) => c.filter((x) => x.key !== l.key))}>✕</button></td></tr>)}
          {!lines.length && <tr><td colSpan={7} className={styles.empty}>Customer chunein, phir wapas aane wala item likhein.</td></tr>}
        </tbody></table>
    </div>

    {customerId && focusLine && <div className={styles.hist}>
      <h3>{customer?.name} ne "{focusLine.name}" kab aur kis rate par liya</h3>
      {focusHist.length ? <table className={styles.tbl}><thead><tr><th>Date</th><th>Invoice</th><th className={styles.num}>Qty</th><th className={styles.num}>Rate</th><th className={styles.num}>Amount</th></tr></thead>
        <tbody>{focusHist.slice(0, 10).map((h, i) => <tr key={i}><td>{day(h.date)}</td><td>{h.invoiceNo}</td><td className={styles.num}>{h.qty}</td><td className={styles.num}>Rs. {money(h.rate)}</td><td className={styles.num}>Rs. {money(h.qty * h.rate)}</td></tr>)}</tbody></table>
        : <div className={styles.none}>Ye item is customer ko kabhi nahi becha gaya.</div>}
    </div>}

    <div className={styles.foot}>
      <div className={styles.sums}>
        <div>Total Return<b>Rs. {money(total)}</b></div>
        {mode === "BALANCE" && customerId && balance !== null && <div>{total > Math.max(0, balance) ? "Balance se less / baqi cash wapas" : "Balance se less"}<b>{`Rs. ${money(Math.min(total, Math.max(0, balance)))}${total > Math.max(0, balance) ? ` / Rs. ${money(total - Math.max(0, balance))}` : ""}`}</b></div>}
      </div>
      <button type="button" className={styles.save} disabled={busy || !lines.length} onClick={() => void save()}>{busy ? "Saving…" : "💾 Process Sale Return"}</button>
    </div>
    {msg && <div className={`${styles.msg} ${msg.ok ? styles.ok : styles.err}`}>{msg.t}</div>}
  </div>

  <div className={`${styles.win} ${styles.sub}`}>
    <header className={styles.top}><h1 style={{ fontSize: 16 }}>Recent Sale Returns</h1></header>
    <div className={styles.tableWrap}><table className={styles.tbl}><thead><tr><th>No</th><th>Customer</th><th>Item</th><th className={styles.num}>Qty</th><th className={styles.num}>Amount</th><th>Reason</th><th>Date</th></tr></thead>
      <tbody>{recent.map((r, i) => <tr key={i}><td>{r.returnNo || "-"}</td><td>{r.customerName || sales.find((s) => String(s._id) === String(r.saleId))?.customerName || r.invoiceNo || "-"}</td><td>{prodName(r)}</td><td className={styles.num}>{r.qty}</td><td className={styles.num}>Rs. {money(r.amount)}</td><td>{r.reason}</td><td>{day(r.createdAt)}</td></tr>)}
        {!recent.length && <tr><td colSpan={7} className={styles.empty}>Abhi koi return nahi.</td></tr>}</tbody></table></div>
  </div></main>;
}
