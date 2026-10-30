"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./purchaseWin.module.css";

type Line = { key: number; productId: string; name: string; code: string; barcode: string; qty: string; disc: string; cost: string; retail: string; stock: number; category: string };
const money = (n: number) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const n = (v: string) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : []));
let seq = 1;
const emptyLine = (): Line => ({ key: seq++, productId: "", name: "", code: "", barcode: "", qty: "1", disc: "0", cost: "", retail: "", stock: 0, category: "" });
const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

export default function Purchases() {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [active, setActive] = useState<number | null>(null);
  const [hl, setHl] = useState(0);
  const [purchaseNo, setPurchaseNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [suppRef, setSuppRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("CASH");
  const [salesman, setSalesman] = useState("admin");
  const [barcode, setBarcode] = useState("");
  const [discPct, setDiscPct] = useState("0");
  const [discAmt, setDiscAmt] = useState("0");
  const [freight, setFreight] = useState("0");
  const [other, setOther] = useState("0");
  const [paid, setPaid] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [onCost, setOnCost] = useState(false);
  const [printSize, setPrintSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [printed, setPrinted] = useState<any>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const loadNo = () => fetch("/api/counters?type=purchase", { cache: "no-store" }).then(r => r.json()).then(d => setPurchaseNo(d.next || "")).catch(() => {});
  const loadAll = async () => {
    const [p, s, pu] = await Promise.all([
      fetch("/api/data?collection=products&limit=5000").then(arr).catch(() => []),
      fetch("/api/data?collection=suppliers&limit=5000").then(arr).catch(() => []),
      fetch("/api/data?collection=purchases&limit=5000").then(arr).catch(() => []),
    ]);
    setProducts(p); setSuppliers(s); setPurchases(pu);
  };
  useEffect(() => { void loadAll(); void loadNo(); }, []);

  const subtotal = useMemo(() => lines.reduce((t, l) => t + (l.productId ? n(l.qty) * n(l.cost) * (1 - n(l.disc) / 100) : 0), 0), [lines]);
  const totalQty = lines.reduce((t, l) => t + (l.productId ? n(l.qty) : 0), 0);
  const discount = Math.min(subtotal, n(discAmt));
  const net = Math.max(0, subtotal - discount + (onCost ? 0 : n(freight) + n(other)));
  const shipment = n(freight) + n(other);
  const supplierBalance = useMemo(() => purchases.filter(p => String(p.supplierId) === supplier).reduce((t, p) => t + Number(p.remaining || 0), 0), [purchases, supplier]);
  const paidNow = type === "CASH" ? net : type === "CREDIT" ? 0 : n(paid);

  const setLine = (key: number, patch: Partial<Line>) => setLines(cur => cur.map(l => l.key === key ? { ...l, ...patch } : l));
  const pick = (key: number, p: any) => {
    setLine(key, { productId: String(p._id), name: String(p.name || p.model || ""), code: String(p.code ?? p.sku ?? ""), barcode: String(p.barcode ?? ""), cost: String(p.costPrice ?? 0), retail: String(p.price ?? ""), stock: Number(p.stock || 0), category: String(p.category || "") });
    setActive(null); setHl(0); focusEl(`[data-ql="${key}"]`);
  };
  const focusEl = (sel: string) => window.setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.focus(), 30);
  const addLineAfter = (key: number) => { const fresh = emptyLine(); setLines(cur => { const i = cur.findIndex(l => l.key === key); const next = [...cur]; next.splice(i + 1, 0, fresh); return next; }); return fresh.key; };
  const removeLine = (key: number) => setLines(cur => (cur.length > 1 ? cur.filter(l => l.key !== key) : [emptyLine()]));

  const activeLine = lines.find(l => l.key === active);
  const matches = useMemo(() => {
    if (active === null) return [];
    const tokens = (activeLine?.name || "").toLowerCase().split(/\s+/).filter(Boolean);
    const list = tokens.length ? products.filter(p => { const text = `${p.name || ""} ${p.model || ""} ${p.code || ""} ${p.sku || ""} ${p.barcode || ""} ${p.brand || ""} ${p.category || ""}`.toLowerCase(); return tokens.every(t => text.includes(t)); }) : products;
    return list.slice(0, 60);
  }, [products, active, activeLine?.name]);

  function scanBarcode() {
    const v = barcode.trim().toLowerCase();
    if (!v) return;
    const p = products.find(x => [x.barcode, x.code, x.sku].some(f => String(f ?? "").toLowerCase() === v));
    if (!p) { setMsg({ text: "Is barcode ka product nahi mila.", ok: false }); return; }
    setLines(cur => {
      const same = cur.find(l => l.productId === String(p._id));
      if (same) return cur.map(l => l.key === same.key ? { ...l, qty: String(n(l.qty) + 1) } : l);
      const free = cur.find(l => !l.productId);
      const base = { productId: String(p._id), name: String(p.name || ""), code: String(p.code ?? p.sku ?? ""), barcode: String(p.barcode ?? ""), qty: "1", cost: String(p.costPrice ?? 0), retail: String(p.price ?? ""), stock: Number(p.stock || 0), category: String(p.category || "") };
      return free ? cur.map(l => l.key === free.key ? { ...l, ...base } : l) : [...cur, { ...emptyLine(), ...base }];
    });
    setBarcode(""); setMsg(null);
  }

  function reset() {
    setLines([emptyLine()]); setSupplier(""); setSuppRef(""); setRemarks(""); setBarcode(""); setDiscPct("0"); setDiscAmt("0"); setFreight("0"); setOther("0"); setPaid(""); setActive(null);
    void loadNo(); barcodeRef.current?.focus();
  }

  async function save() {
    if (busy) return;
    const used = lines.filter(l => l.productId);
    if (!supplier) { setMsg({ text: "Supplier select karein.", ok: false }); return; }
    if (!used.length) { setMsg({ text: "Kam az kam aik product select karein.", ok: false }); return; }
    if (used.some(l => !Number.isInteger(n(l.qty)) || n(l.qty) <= 0 || n(l.cost) < 0 || l.cost.trim() === "")) { setMsg({ text: "Har product ki Qty (poora number) aur Cost likhein.", ok: false }); return; }
    const perUnit = onCost && totalQty > 0 ? shipment / totalQty : 0;
    const items = used.map(l => ({ productId: l.productId, name: l.name, qty: n(l.qty), costPrice: Math.round((n(l.cost) * (1 - n(l.disc) / 100) + perUnit) * 10000) / 10000, retail: n(l.retail) }));
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/purchases/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: supplier, suppRef, remarks, date, type, salesman, items, discount, freight: onCost ? 0 : n(freight), otherExpense: onCost ? 0 : n(other), paid: paidNow, paymentMethod: payMethod }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Purchase save nahi hui.");
      setMsg({ text: `Purchase ${d.invoiceNo} save ho gayi; stock bhi update hua.`, ok: true });
      if (printSize) { setPrinted({ ...d, lines: used, supplierName: suppliers.find(s => String(s._id) === supplier)?.name || "", size: printSize }); setTimeout(() => window.print(), 150); }
      reset(); await loadAll();
    } catch (e: any) { setMsg({ text: e?.message || "Purchase save nahi hui.", ok: false }); } finally { setBusy(false); }
  }
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); void saveRef.current(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focusLine = activeLine && activeLine.productId ? activeLine : [...lines].reverse().find(l => l.productId);

  return <main className={styles.page}>
    <nav className={styles.toolbar}>
      <Link href="/">← Dashboard</Link><Link href="/suppliers">👤 Supplier List</Link><Link href="/admin">📦 New Item</Link><Link href="/suppliers">＋ New Supplier</Link>
      <button type="button" onClick={() => barcodeRef.current?.focus()}>🔍 Item Search</button><Link href="/purchases/history">🧾 Purchase History</Link><Link href="/purchases/returns">↩ Purchase Return</Link>
    </nav>

    <section className={styles.head}>
      <div className={styles.headBox}>
        <div className={styles.grid}>
          <label>Purchase No:<input className={styles.code} value={purchaseNo} readOnly /></label>
          <label>Supplier:<select value={supplier} onChange={e => setSupplier(e.target.value)}><option value="">Select Supplier</option>{suppliers.map(s => <option key={s._id} value={s._id}>{s.name}{s.phone ? ` — ${s.phone}` : ""}</option>)}</select></label>
          <label>Current Balance:<input value={supplier ? money(supplierBalance) : ""} readOnly /></label>
          <label>Supp Ref:<input value={suppRef} onChange={e => setSuppRef(e.target.value)} /></label>
          <label>Remarks:<input value={remarks} onChange={e => setRemarks(e.target.value)} /></label>
        </div>
        <div className={styles.grid}>
          <h2 className={styles.title}>PURCHASE INVOICE</h2>
          <label>Date:<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label>Type:<select value={type} onChange={e => setType(e.target.value)}><option>CASH</option><option>CREDIT</option><option>CASH &amp; CREDIT</option></select></label>
          <label>Salesman:<input value={salesman} onChange={e => setSalesman(e.target.value)} /></label>
        </div>
      </div>
      <div className={styles.barRow}><b>Barcode ──&gt;</b><input ref={barcodeRef} value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); scanBarcode(); } }} placeholder="barcode / code scan karein, Enter dabayen" /><span className={styles.branch}>Main Branch</span></div>
    </section>

    <section className={`${styles.gridWrap} ${active !== null ? styles.split : ""}`}>
      <div className={styles.scroll}>
        <table className={styles.tbl}>
          <thead><tr><th>S#</th><th>Product Name</th><th>Qty</th><th>Disc %</th><th>Cost</th><th>Total</th><th>G Retail</th><th>Del</th><th>New</th><th>Barcode</th></tr></thead>
          <tbody>{lines.map((l, i) => <tr key={l.key} className={active === l.key ? styles.rowOn : ""}>
            <td>{i + 1}</td>
            <td><input className={styles.pname} value={l.name} placeholder="product naam / code likhein ya yahan click karein" data-ln={l.key} onFocus={() => { setActive(l.key); setHl(0); }} onChange={e => { setLine(l.key, { name: e.target.value, productId: "" }); setActive(l.key); setHl(0); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (matches[hl] || matches[0]) pick(l.key, matches[hl] || matches[0]); else if (l.productId) focusEl(`[data-ql="${l.key}"]`); } else if (e.key === "ArrowDown") { e.preventDefault(); setHl(h => Math.min(matches.length - 1, h + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHl(h => Math.max(0, h - 1)); } else if (e.key === "Escape") setActive(null); }} /></td>
            <td><input data-ql={l.key} value={l.qty} inputMode="numeric" onFocus={selectAll} onChange={e => setLine(l.key, { qty: e.target.value.replace(/[^\d]/g, "") })} /></td>
            <td><input value={l.disc} inputMode="decimal" onFocus={selectAll} onChange={e => setLine(l.key, { disc: e.target.value.replace(/[^\d.]/g, "") })} /></td>
            <td><input value={l.cost} inputMode="decimal" onFocus={selectAll} onChange={e => setLine(l.key, { cost: e.target.value.replace(/[^\d.]/g, "") })} /></td>
            <td className={styles.tot}>{l.productId ? money(n(l.qty) * n(l.cost) * (1 - n(l.disc) / 100)) : ""}</td>
            <td><input value={l.retail} inputMode="decimal" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const last = lines[lines.length - 1]; if (last && last.key === l.key) focusEl(`[data-ln="${addLineAfter(l.key)}"]`); else { const nx = lines[lines.findIndex(x => x.key === l.key) + 1]; if (nx) focusEl(`[data-ln="${nx.key}"]`); } } }} onFocus={selectAll} onChange={e => setLine(l.key, { retail: e.target.value.replace(/[^\d.]/g, "") })} /></td>
            <td><button type="button" className={styles.ico} title="Line delete" onClick={() => removeLine(l.key)}>🗑</button></td>
            <td><button type="button" className={styles.ico} title="Is ke neeche nayi line" onClick={() => focusEl(`[data-ln="${addLineAfter(l.key)}"]`)}>＋</button></td>
            <td className={styles.dim}>{l.code}{l.barcode && l.barcode !== l.code ? ` / ${l.barcode}` : ""}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {active !== null && <div className={styles.picker}>
        <table className={styles.tbl}><thead><tr><th>Code</th><th>Product Name</th><th>Category</th><th>Brand</th><th>Cost</th><th>In Hand</th><th>Retail</th></tr></thead>
          <tbody>{matches.map((p, mi) => <tr key={p._id} ref={mi === hl ? (el => el?.scrollIntoView({ block: "nearest" })) : undefined} className={`${styles.pickRow} ${mi === hl ? styles.pickOn : ""}`} onMouseDown={e => { e.preventDefault(); pick(active, p); }}><td>{p.code ?? p.sku ?? ""}</td><td>{p.name}</td><td>{p.category}</td><td>{p.brand}</td><td>{money(p.costPrice)}</td><td>{p.stock ?? 0}</td><td>{money(p.price)}</td></tr>)}
            {!matches.length && <tr><td colSpan={7} className={styles.dim}>Koi product nahi mila. <Link href="/admin">Naya item banayein</Link></td></tr>}</tbody></table>
      </div>}
    </section>

    <section className={styles.bottom}>
      <div className={styles.status}><i>Status:</i>
        <span>{focusLine ? money(n(focusLine.cost)) : "—"}</span><span>{focusLine ? focusLine.stock : "—"}</span><span>{focusLine ? focusLine.category || "—" : "—"}</span>
        <small>Cost / Qty in hand / Category (aakhri select kiya product)</small>
      </div>
      <div className={styles.tot2}>
        <label>Grand Total:<input value={money(subtotal)} readOnly className={styles.cyan} /></label>
        <label>Disc (%):<input value={discPct} inputMode="decimal" onFocus={selectAll} onChange={e => { const v = e.target.value.replace(/[^\d.]/g, ""); setDiscPct(v); setDiscAmt(String(Math.round(subtotal * n(v)) / 100)); }} /></label>
        <label>Net Total:<input value={money(net)} readOnly className={styles.cyan} /></label>
      </div>
      <div className={styles.tot2}>
        <label>Freight:<input value={freight} inputMode="decimal" onFocus={selectAll} className={styles.yel} onChange={e => setFreight(e.target.value.replace(/[^\d.]/g, ""))} /></label>
        <label>Disc Amnt:<input value={discAmt} inputMode="decimal" onFocus={selectAll} onChange={e => { const v = e.target.value.replace(/[^\d.]/g, ""); setDiscAmt(v); setDiscPct(subtotal ? String(Math.round((n(v) / subtotal) * 10000) / 100) : "0"); }} /></label>
        <label>Cash pay:<input value={type === "CASH & CREDIT" ? paid : String(Math.round(paidNow * 100) / 100)} readOnly={type !== "CASH & CREDIT"} inputMode="decimal" onFocus={selectAll} onChange={e => setPaid(e.target.value.replace(/[^\d.]/g, ""))} /></label>
      </div>
      <div className={styles.tot2}>
        <label>Other Exp:<input value={other} inputMode="decimal" onFocus={selectAll} className={styles.yel} onChange={e => setOther(e.target.value.replace(/[^\d.]/g, ""))} /></label>
        <label>Pay by:<select value={payMethod} onChange={e => setPayMethod(e.target.value)}>{["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Other Bank"].map(x => <option key={x}>{x}</option>)}</select></label>
        <fieldset className={styles.print}><legend>Print</legend>{[["A4", "a4"], ["A5", "a5"], ["Thermal", "thermal"]].map(([label, v]) => <label key={v}><input type="checkbox" checked={printSize === v} onChange={e => setPrintSize(e.target.checked ? v : "")} /> {label}</label>)}</fieldset>
      </div>
    </section>

    <footer className={styles.foot}>
      <button type="button" className={styles.saveBtn} disabled={busy} onClick={() => void save()} title="Save (Ctrl+S)">💾 {busy ? "Saving…" : "Save (Ctrl+S)"}</button>
      <label className={styles.chk}><input type="checkbox" checked={onCost} onChange={e => setOnCost(e.target.checked)} /> Shipment Expense On Cost</label>
      <div className={styles.sum}>T.Qty: <b>{totalQty}</b> &nbsp; T.Freight: <b>{money(n(freight))}</b> &nbsp; Other Exp: <b>{money(n(other))}</b></div>
      {msg && <span role="status" className={msg.ok ? styles.ok : styles.bad}>{msg.text}</span>}
    </footer>

    {printed && <div className={`${styles.printSheet} ${styles["p_" + printed.size]}`}>
      <h2>NEW ARIF MOBILE CENTER</h2><h3>PURCHASE INVOICE</h3>
      <p>No: <b>{printed.invoiceNo}</b> &nbsp; Date: {date} &nbsp; Supplier: {printed.supplierName}</p>
      <table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Cost</th><th>Total</th></tr></thead>
        <tbody>{printed.lines.map((l: Line, i: number) => <tr key={l.key}><td>{i + 1}</td><td>{l.name}</td><td>{l.qty}</td><td>{money(n(l.cost))}</td><td>{money(n(l.qty) * n(l.cost) * (1 - n(l.disc) / 100))}</td></tr>)}</tbody></table>
      <p>Total: <b>Rs. {money(printed.total)}</b> &nbsp; Paid: Rs. {money(printed.paid)} &nbsp; Due: Rs. {money(printed.remaining)}</p>
    </div>}
  </main>;
}
