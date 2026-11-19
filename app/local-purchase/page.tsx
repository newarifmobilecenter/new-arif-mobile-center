"use client";
import { SHOP } from "@/lib/shop";
import { shareLive } from "@/lib/shareSlip";
import { printVoucher, shareVoucher } from "@/lib/voucherPrint";
import { notify } from "@/lib/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "../purchases/purchaseWin.module.css";

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
  const [editId, setEditId] = useState("");
  const [editRec, setEditRec] = useState<any>(null);
  const [findNo, setFindNo] = useState("");
  const [payAmt, setPayAmt] = useState("");
  const [payAcc, setPayAcc] = useState("Cash");
  const [payNote, setPayNote] = useState("");
  const [payVoucher, setPayVoucher] = useState<any>(null);
  const [slip, setSlip] = useState<any>(null);
  const shareSlipImg = (rec: any, mode: "png" | "whatsapp") => { setSlip({ rec, size: "thermal" }); setTimeout(() => { void shareLive(document.querySelector(".lpSlip") as HTMLElement | null, mode, `Slip-${rec.invoiceNo}`, `${SHOP.nameUpper}\nSlip ${rec.invoiceNo}`, { white: false, width: 300 }).catch(() => notify("Image nahi ban saki.", { kind: "danger" })); }, 250); };
  const printSlip = (rec: any, size: string) => { setSlip({ rec, size }); setTimeout(() => window.print(), 150); };
  const slipOf = (h: any) => ({ invoiceNo: h.invoiceNo, date: h.createdAt || new Date().toISOString(), customerName: h.supplierName || customers.find((c) => String(c._id) === String(h.customerId))?.name || "", phone: (customers.find((c) => String(c._id) === String(h.customerId)) || {}).phone || (customers.find((c) => String(c._id) === String(h.customerId)) || {}).phoneNo || "", items: h.items || [], total: h.total, paid: h.paid, adjusted: h.adjusted, remaining: h.remaining, prevBalance: h.prevBalance, newBalance: h.newBalance, account: h.paymentMethod || "Cash", note: h.note || "" });

  const load = async () => {
    const [c, p, s, r, h] = await Promise.all([fetch("/api/data?collection=customers&limit=20000").then(arr), fetch("/api/data?collection=products&limit=20000").then(arr), fetch("/api/data?collection=sales&limit=5000").then(arr), fetch("/api/repairs?status=PAYMENT_DUE").then(arr).catch(() => []), fetch("/api/data?collection=purchases&limit=5000").then(arr)]);
    setCustomers(c); setProducts(p); setSales(s); setRepairs(r); setHistory(h.filter((x: any) => x.kind === "LOCAL"));
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    let last = 0;
    const refresh = () => { if (document.visibilityState === "hidden" || Date.now() - last < 1500) return; last = Date.now(); void load(); };
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customer = customers.find((c) => String(c._id) === customerId);
  const due = useMemo(() => customerId ? sales.filter((x) => String(x.customerId || "") === customerId && x.status !== "cancelled").reduce((a, x) => a + n(x.remaining), 0) + repairs.filter((x) => String(x.customerId || "") === customerId).reduce((a, x) => a + n(x.remaining), 0) : 0, [customerId, sales, repairs]);
  // Current Balance: POS aur Ledger jaisa (sale + repair baqi) minus jo humein is customer ko local purchase ka dena baqi hai.
  const localDue = useMemo(() => customerId ? history.filter((x) => String(x.customerId || "") === customerId).reduce((a, x) => a + n(x.remaining), 0) : 0, [customerId, history]);
  const balance = due - localDue;
  const custMatches = useMemo(() => { const q = cq.trim().toLowerCase(); return q.length < 1 || customer?.name === cq ? [] : customers.filter((c) => `${c.name} ${c.phone} ${c.phoneNo} ${c.code}`.toLowerCase().includes(q)).slice(0, 8); }, [cq, customers, customer]);
  const total = lines.reduce((a, l) => a + n(l.qty) * n(l.cost), 0);
  const cash = n(paid), adj = n(adjust);
  const owe = Math.max(0, total - cash - adj);
  const settledOld = editRec ? n(editRec.paid) + n(editRec.adjusted) : 0;

  const setLine = (key: number, p: Partial<Line>) => setLines((o) => o.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const choose = (key: number, p: any) => { setLine(key, { productId: String(p._id), name: String(p.name || p.model || ""), q: String(p.name || p.model || ""), cost: String(p.costPrice ?? ""), retail: String(p.price ?? "") }); setOpen(null); };
  const matches = (q: string) => { const s = q.trim().toLowerCase(); return s.length < 1 ? [] : products.filter((p) => `${p.name} ${p.model} ${p.code} ${p.sku} ${p.barcode} ${p.brand}`.toLowerCase().includes(s)).slice(0, 10); };

  function loadOld() {
    const no = findNo.trim().toLowerCase();
    const h = history.find((x) => String(x.invoiceNo || "").toLowerCase() === no);
    if (!h) { setMsg({ t: "Ye Local Purchase No nahi mila (jaise LP001).", ok: false }); return; }
    setEditId(String(h._id)); setEditRec(h); setCustomerId(String(h.customerId || "")); setCq("");
    setLines((h.items || []).map((i: any) => ({ key: seq++, productId: String(i.productId), name: String(i.name || ""), qty: String(i.qty), cost: String(i.costPrice ?? ""), retail: String(i.retail || ""), q: String(i.name || "") })));
    setPaid(String(h.paid || "")); setAdjust(String(h.adjusted || "")); setNote(String(h.note || "")); setMsg(null); setSaved(null);
  }
  function cancelEdit() { setEditId(""); setEditRec(null); setFindNo(""); setLines([blank()]); setPaid(""); setAdjust(""); setNote(""); setCustomerId(""); setCq(""); setMsg(null); }
  async function payCustomer() {
    const amt = n(payAmt);
    if (!customerId || !(amt > 0)) return setMsg({ t: "Raqam likhein.", ok: false });
    if (amt > localDue + 0.0001) return setMsg({ t: `Is customer ko dene sirf Rs. ${money(localDue)} baqi hain.`, ok: false });
    if (!window.confirm(`${customer?.name} ko Rs. ${money(amt)} (${payAcc}) dene hain — pakka?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "supplierPayment", customerId, amount: amt, account: payAcc, ref: payNote }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Payment save nahi hui.");
      setPayVoucher(d.voucher || null); setPayAmt(""); setPayNote("");
      setMsg({ t: `Rs. ${money(d.applied)} ${customer?.name} ko ada ho gaye${d.voucher?.voucherNo ? ` (Voucher ${d.voucher.voucherNo})` : ""}. Ab unka dena baqi kam ho gaya.`, ok: true });
      await load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }

  async function save() {
    if (busy) return;
    if (!customerId) return setMsg({ t: "Pehle customer chunein jis se maal le rahe hain.", ok: false });
    const used = lines.filter((l) => l.productId);
    if (!used.length) return setMsg({ t: "Kam az kam ek product (list se chun kar) likhein.", ok: false });
    if (used.some((l) => !(n(l.qty) > 0) || !Number.isInteger(n(l.qty)) || n(l.cost) < 0 || l.cost === "")) return setMsg({ t: "Har item ki poori qty aur rate likhein.", ok: false });
    if (editId) {
      setBusy(true); setMsg(null);
      try {
        const r = await fetch("/api/purchases/local", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, note, items: used.map((l) => ({ productId: l.productId, name: l.name, qty: n(l.qty), costPrice: n(l.cost), retail: n(l.retail) })) }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Modify nahi hua.");
        setMsg({ t: `Local purchase ${d.invoiceNo} modify ho gayi. Naya bill Rs. ${money(d.total)}, dena baqi Rs. ${money(d.remaining)}. Stock farq se theek ho gaya.`, ok: true });
        cancelEdit(); await load();
      } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
      return;
    }
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

  const active = open !== null ? lines.find((l) => l.key === open) : undefined;
  const pickList = active && !active.productId ? matches(active.q) : [];
  const focusLine = lines.filter((l) => l.productId).slice(-1)[0];

  return <main className={styles.page}>
    <nav className={styles.toolbar}><Link href="/">← Dashboard</Link><Link href="/purchases">Purchase</Link><Link href="/vouchers">Vouchers</Link><Link href="/customers">Customers</Link></nav>
    {editId ? <div className={styles.editBar}><b>✏ EDIT MODE — Local Purchase {editRec?.invoiceNo}</b><span>Cash/adjust jo ho chuka wo wesa hi rahega; sirf items/qty/rate badlenge, stock farq se theek hoga.</span><button type="button" onClick={cancelEdit}>Cancel Edit</button></div>
      : <div className={styles.editBar}><b>✏ Modify Local Purchase:</b><input value={findNo} placeholder="Old Local Purchase No (LP001)" onChange={(e) => setFindNo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); loadOld(); } }} /><button type="button" onClick={loadOld}>Load</button></div>}

    <section className={styles.head}>
      <div className={styles.headBox}>
        <div className={styles.grid}>
          <label>Customer:<span style={{ position: "relative", display: "block" }}>
            <input readOnly={!!editId} value={customer && cq === "" ? customer.name : cq} onChange={(e) => { setCq(e.target.value); setCustomerId(""); }} placeholder="naam / phone se dhoondein" />
            {custMatches.length > 0 && <span className={styles.scroll} style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 30, display: "grid", maxHeight: 240 }}>{custMatches.map((c) => <button key={c._id} type="button" style={{ textAlign: "left", padding: "8px 10px", border: 0, borderBottom: "1px solid rgba(128,150,180,.25)", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 15 }} onClick={() => { setCustomerId(String(c._id)); setCq(String(c.name)); }}>{c.name} · {c.phoneNo || c.phone || "-"}</button>)}</span>}
          </span></label>
          <label>Current Balance:<input value={customer ? `Rs. ${money(balance)}` : ""} readOnly /></label>
          <label>Note:<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <div className={styles.grid}>
          <h2 className={styles.title}>LOCAL PURCHASE</h2>
          <label>Date:<input value={localDay(new Date())} readOnly /></label>
          <p className={styles.dim} style={{ margin: 0 }}>{customer ? `${customer.name} ka balance Rs. ${money(balance)}${balance < 0 ? " (humein dene hain)" : balance > 0 ? " (humein milna)" : ""}. ${due > 0 ? `Is mein se Rs. ${money(due)} milna hai: neeche "Adjust" se is maal ki raqam usi mein kaat sakte hain.` : ""}` : "Pehle customer chunein jis se maal le rahe hain."}</p>
        </div>
      </div>
    </section>

    <section className={`${styles.gridWrap} ${active && pickList.length ? styles.split : ""}`}>
      <div className={styles.scroll}>
        <table className={styles.tbl}>
          <thead><tr><th>S#</th><th>Product Name</th><th>Qty</th><th>Cost</th><th>Total</th><th>G Retail</th><th>Del</th></tr></thead>
          <tbody>{lines.map((l, i) => <tr key={l.key} className={open === l.key ? styles.rowOn : ""}>
            <td>{i + 1}</td>
            <td><input className={styles.pname} value={l.q} data-lp={l.key} onFocus={() => setOpen(l.key)} onChange={(e) => { setLine(l.key, { q: e.target.value, productId: "", name: "" }); setOpen(l.key); }} placeholder="product naam / code likhein" /></td>
            <td><input inputMode="numeric" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value.replace(/[^\d]/g, "") })} onFocus={(e) => e.target.select()} /></td>
            <td><input inputMode="decimal" value={l.cost} onChange={(e) => setLine(l.key, { cost: e.target.value.replace(/[^\d.]/g, "") })} onFocus={(e) => e.target.select()} /></td>
            <td className={styles.tot}>{l.productId ? money(n(l.qty) * n(l.cost)) : ""}</td>
            <td><input inputMode="decimal" value={l.retail} onChange={(e) => setLine(l.key, { retail: e.target.value.replace(/[^\d.]/g, "") })} onFocus={(e) => e.target.select()} /></td>
            <td>{lines.length > 1 && <button type="button" className={styles.ico} title="Line delete" onClick={() => setLines((o) => o.filter((x) => x.key !== l.key))}>🗑</button>}</td>
          </tr>)}</tbody>
        </table>
        <div style={{ padding: 6 }}><button type="button" className={styles.ico} onClick={() => setLines((o) => { const b = blank(); setOpen(b.key); return [...o, b]; })}>＋ Item add karein</button> <span className={styles.dim}>Naya item ho to pehle &quot;New Item&quot; (Add Product) se bana lein.</span></div>
      </div>
      {active && pickList.length > 0 && <div className={styles.picker}>
        <table className={styles.tbl}><thead><tr><th>Product</th><th>Stock</th><th>Cost</th><th>Retail</th></tr></thead>
          <tbody>{pickList.map((p) => <tr key={p._id} className={styles.pickRow} onClick={() => choose(active.key, p)}><td>{p.name || p.model}</td><td>{n(p.stock)}</td><td>{money(p.costPrice)}</td><td>{money(p.price)}</td></tr>)}</tbody></table>
      </div>}
    </section>

    <section className={styles.bottom}>
      <div className={styles.status}><i>Status:</i>
        <span>{focusLine ? money(n(focusLine.cost)) : "—"}</span><span>{focusLine ? (products.find((p) => String(p._id) === focusLine.productId)?.stock ?? "—") : "—"}</span>
        <small>Cost / Qty in hand (aakhri select kiya product)</small>
      </div>
      <div className={styles.tot2}>
        <label>Kul Bill:<input value={money(total)} readOnly className={styles.cyan} /></label>
        <label>Cash pay:<input readOnly={!!editId} inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value.replace(/[^\d.]/g, ""))} onFocus={(e) => e.target.select()} /></label>
      </div>
      <div className={styles.tot2}>
        <label>Pay by:<select value={account} onChange={(e) => setAccount(e.target.value)}>{ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label>Adjust:<input readOnly={!!editId} inputMode="decimal" value={adjust} onChange={(e) => setAdjust(e.target.value.replace(/[^\d.]/g, ""))} placeholder={due > 0 ? `max ${money(due)}` : "0"} onFocus={(e) => e.target.select()} /></label>
      </div>
      <div className={styles.tot2}>
        <label>Dene baqi:<input value={money(editId ? Math.max(0, total - settledOld) : owe)} readOnly className={styles.yel} /></label>
        <small className={styles.dim}>Customer ko dene baqi = Kul Bill − Cash − Adjust</small>
      </div>
    </section>

    {customerId && localDue > 0 && !editId && <section className={styles.bottom} style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
      <div className={styles.tot2}>
        <b>💵 {customer?.name} ko payment dein (humein is ko Rs. {money(localDue)} dene hain)</b>
        <label>Raqam:<input inputMode="decimal" value={payAmt} onChange={(e) => setPayAmt(e.target.value.replace(/[^\d.]/g, ""))} placeholder={`max ${money(localDue)}`} onFocus={(e) => e.target.select()} /></label>
        <label>Pay by:<select value={payAcc} onChange={(e) => setPayAcc(e.target.value)}>{ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label>Note:<input value={payNote} onChange={(e) => setPayNote(e.target.value)} /></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className={styles.saveBtn} disabled={busy} onClick={() => void payCustomer()}>💵 Payment Ada Karein</button>
          {payVoucher && <><button type="button" className={styles.ico} onClick={() => printVoucher(payVoucher)}>🖨 Voucher</button><button type="button" className={styles.ico} onClick={() => void shareVoucher(payVoucher, "whatsapp")}>📲</button><button type="button" className={styles.ico} onClick={() => void shareVoucher(payVoucher, "png")}>🖼</button></>}
        </div>
        <small className={styles.dim}>Ye paisa cash/account se nikalta hai aur customer ke dene baqi se kam ho jata hai (jaise -1,570 mein se 1,500 dene par -70 reh jata hai). Voucher bhi ban jata hai.</small>
      </div>
    </section>}

    <footer className={styles.foot}>
      <button type="button" className={styles.saveBtn} disabled={busy} onClick={() => void save()} title="Save (Ctrl+S)">💾 {busy ? "Saving…" : editId ? "Update Local Purchase (Ctrl+S)" : "Save Local Purchase (Ctrl+S)"}</button>
      {msg && <span role="status" className={msg.ok ? styles.ok : styles.bad}>{msg.t}</span>}
    </footer>

    <section className={styles.scroll} style={{ maxHeight: "32vh" }}>
      <table className={styles.tbl}><thead><tr><th>Date</th><th>No</th><th>Customer</th><th>Items</th><th>Bill</th><th>Cash</th><th>Adjust</th><th>Baqi</th><th>Slip</th></tr></thead><tbody>
        {history.map((h) => <tr key={h._id}><td>{localDay(h.createdAt)}</td><td>{h.invoiceNo}</td><td>{h.supplierName}</td><td>{(h.items || []).map((i: any) => `${i.name} ×${i.qty}`).join(", ")}</td><td >{money(h.total)}</td><td >{money(h.paid)}</td><td >{money(h.adjusted)}</td><td >{money(h.remaining)}</td><td><button type="button" className={styles.ico} onClick={() => printSlip(slipOf(h), "thermal")}>🖨 Slip</button> <button type="button" className={styles.ico} title="WhatsApp" onClick={() => shareSlipImg(slipOf(h), "whatsapp")}>📲</button> <button type="button" className={styles.ico} title="PNG" onClick={() => shareSlipImg(slipOf(h), "png")}>🖼</button></td></tr>)}
        {!history.length && <tr><td colSpan={9} className={styles.dim} style={{ textAlign: "center", padding: 14 }}>Abhi koi local purchase nahi.</td></tr>}</tbody></table>
    </section>
    {saved && <div className={styles.savedBar} role="dialog" aria-label="Local purchase save ho gayi">
      <div><b>✅ {saved.invoiceNo} save ho gayi</b><br /><span>Kul Rs. {money(saved.total)} · Slip nikalni hai?</span></div>
      <div className={styles.savedBtns}>
        {[["Thermal", "thermal"], ["A5", "a5"], ["A4", "a4"]].map(([l, v]) => <button key={v} type="button" onClick={() => printSlip(saved, v)}>🖨 {l}</button>)}
        <button type="button" onClick={() => shareSlipImg(saved, "whatsapp")}>📲 WhatsApp</button>
        <button type="button" onClick={() => shareSlipImg(saved, "png")}>🖼 PNG</button>
        <button type="button" className={styles.savedClose} onClick={() => setSaved(null)}>Band</button>
      </div>
    </div>}
    {slip && <div className={`${styles.printSheet} lpSlip`} style={{ width: slip.size === "thermal" ? "72mm" : slip.size === "a5" ? "148mm" : "190mm" }}>
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
