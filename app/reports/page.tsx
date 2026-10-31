"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./reports.module.css";
import { costMapOf, saleLines, returnProfitLoss } from "../../lib/profit";
import { itemCategory } from "../../lib/saleReceiptUtil";

const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const localDay = (v: unknown) => { const d = v ? new Date(v as string) : null; if (!d || isNaN(+d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const shift = (day: string, by: number) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + by); return localDay(d); };
const today = () => localDay(new Date());
const t = (v: unknown) => String(v ?? "");

type Col = { k: string; h: string; num?: boolean; money?: boolean; tone?: boolean };
type Rep = { id: string; group: string; title: string };
const REPORTS: Rep[] = [
  { id: "summary", group: "Overview", title: "Profit & Loss Summary" },
  { id: "dateProfit", group: "Sales", title: "Date Wise Sale Profit" },
  { id: "invoiceProfit", group: "Sales", title: "Invoice Wise Profit" },
  { id: "itemSale", group: "Sales", title: "Item Sale Report" },
  { id: "itemProfit", group: "Sales", title: "Item Sale Profit Report" },
  { id: "catProfit", group: "Sales", title: "Category Sale Profit" },
  { id: "topItems", group: "Sales", title: "Top Items Sale" },
  { id: "itemCust", group: "Sales", title: "Item Sale Customer" },
  { id: "audit", group: "Stock", title: "Stock Audit" },
  { id: "dead", group: "Stock", title: "Dead Stock" },
  { id: "moves", group: "Stock", title: "Stock Movement" },
];

export default function Reports() {
  const [rep, setRep] = useState("summary");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cust, setCust] = useState("");
  const [deadDays, setDeadDays] = useState("30");
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null);
  const [data, setData] = useState<any>({ sales: [], purchases: [], expenses: [], tx: [], returns: [], products: [], customers: [], moves: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const names = ["sales", "purchases", "expenses", "transactions", "returns", "products", "customers", "stockMovements"];
    const r = await Promise.all(names.map((c) => fetch(`/api/data?collection=${c}&limit=5000`).then(arr).catch(() => [])));
    setData({ sales: r[0], purchases: r[1], expenses: r[2], tx: r[3], returns: r[4], products: r[5], customers: r[6], moves: r[7] });
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { setSort(null); }, [rep]);

  const preset = (k: string) => {
    const d = today();
    if (k === "today") { setFrom(d); setTo(d); }
    else if (k === "yesterday") { const y = shift(d, -1); setFrom(y); setTo(y); }
    else if (k === "week") { setFrom(shift(d, -6)); setTo(d); }
    else if (k === "month") { setFrom(d.slice(0, 8) + "01"); setTo(d); }
    else if (k === "lastmonth") { const first = new Date(); first.setDate(1); first.setMonth(first.getMonth() - 1); const last = new Date(); last.setDate(0); setFrom(localDay(first)); setTo(localDay(last)); }
    else if (k === "year") { setFrom(d.slice(0, 5) + "01-01"); setTo(d); }
    else { setFrom("2000-01-01"); setTo(d); }
  };

  const m = useMemo(() => {
    const costs = costMapOf(data.products);
    const prodById = new Map<string, any>(data.products.map((p: any) => [String(p._id), p]));
    const custName = new Map<string, string>(data.customers.map((c: any) => [String(c._id), t(c.name)]));
    const catOf = (i: any) => t(i.category).trim() || t(prodById.get(String(i.productId || ""))?.category).trim() || itemCategory(i);
    const inR = (x: any, f = "createdAt") => { const d = localDay(x[f]); return d >= from && d <= to; };
    const sales = data.sales.filter((x: any) => inR(x));
    const lines: any[] = [];
    const invoices: any[] = [];
    for (const s of sales) {
      const customer = custName.get(t(s.customerId)) || t(s.cashRef) || "Walking Customer";
      const ls = saleLines(s, costs, catOf);
      let rev = 0, cost = 0;
      for (const l of ls) { lines.push({ ...l, day: localDay(s.createdAt), invoice: t(s.invoiceNo), customer }); rev += l.revenue; cost += l.cost; }
      invoices.push({ day: localDay(s.createdAt), invoice: t(s.invoiceNo), customer, items: ls.length, total: n(s.total), cost, profit: n(s.total) - n(s.salesTaxValue) - cost - 0, paid: n(s.paid), due: n(s.remaining) });
    }
    const returns = data.returns.filter((r: any) => r.type === "SALE_RETURN" && inR(r));
    const retLoss = returns.reduce((a: number, r: any) => a + returnProfitLoss(r, costs), 0);
    const purchases = data.purchases.filter((x: any) => inR(x));
    const expenses = data.expenses.filter((x: any) => inR(x));
    const tx = data.tx.filter((x: any) => inR(x));
    const saleTotal = sales.reduce((a: number, x: any) => a + n(x.total), 0);
    const costTotal = lines.reduce((a, l) => a + l.cost, 0);
    const gross = lines.reduce((a, l) => a + l.profit, 0) - retLoss;
    const expTotal = expenses.reduce((a: number, x: any) => a + n(x.amount), 0);
    const lastSold = new Map<string, string>();
    for (const s of data.sales) for (const i of s.items || []) { const id = t(i.productId); const d = localDay(s.createdAt); if (id && d > (lastSold.get(id) || "")) lastSold.set(id, d); }
    return { costs, prodById, custName, sales, lines, invoices, returns, retLoss, purchases, expenses, tx, saleTotal, costTotal, gross, expTotal, net: gross - expTotal, lastSold,
      receivable: sales.reduce((a: number, x: any) => a + n(x.remaining), 0), payable: purchases.reduce((a: number, x: any) => a + n(x.remaining), 0),
      returnTotal: returns.reduce((a: number, r: any) => a + n(r.amount), 0), purchaseTotal: purchases.reduce((a: number, x: any) => a + n(x.total), 0) };
  }, [data, from, to]);

  const categories = useMemo(() => Array.from(new Set(data.products.map((p: any) => t(p.category).trim()).filter(Boolean))).sort() as string[], [data.products]);
  const customers = useMemo(() => Array.from(new Set(m.lines.map((l) => l.customer))).sort() as string[], [m.lines]);

  const view = useMemo((): { cols: Col[]; rows: any[]; cards?: [string, string, string?][]; hint?: string; foot?: string[] } => {
    const ql = q.trim().toLowerCase();
    const lines = m.lines.filter((l) => (!cat || l.category === cat) && (!cust || l.customer === cust) && (!ql || `${l.name} ${l.category} ${l.invoice} ${l.customer}`.toLowerCase().includes(ql)));
    const group = (keyFn: (l: any) => string, extra?: (g: any, l: any) => void) => {
      const g = new Map<string, any>();
      for (const l of lines) { const k = keyFn(l); const o = g.get(k) || { name: k, qty: 0, revenue: 0, cost: 0, profit: 0, bills: new Set<string>() }; o.qty += l.qty; o.revenue += l.revenue; o.cost += l.cost; o.profit += l.profit; o.bills.add(l.invoice); extra?.(o, l); g.set(k, o); }
      return [...g.values()].map((o) => ({ ...o, bills: o.bills.size, margin: o.revenue ? Math.round((o.profit / o.revenue) * 100) : 0 }));
    };
    switch (rep) {
      case "dateProfit": return { cols: [{ k: "name", h: "Date" }, { k: "bills", h: "Invoices", num: true }, { k: "revenue", h: "Sale", num: true, money: true }, { k: "cost", h: "Cost", num: true, money: true }, { k: "profit", h: "Profit", num: true, money: true, tone: true }, { k: "margin", h: "Margin %", num: true }], rows: group((l) => l.day).sort((a, b) => b.name.localeCompare(a.name)) };
      case "invoiceProfit": return { cols: [{ k: "day", h: "Date" }, { k: "invoice", h: "Invoice" }, { k: "customer", h: "Customer" }, { k: "items", h: "Items", num: true }, { k: "total", h: "Bill", num: true, money: true }, { k: "cost", h: "Cost", num: true, money: true }, { k: "profit", h: "Profit", num: true, money: true, tone: true }, { k: "due", h: "Udhaar", num: true, money: true }], rows: m.invoices.filter((i) => (!cust || i.customer === cust) && (!ql || `${i.invoice} ${i.customer}`.toLowerCase().includes(ql))) };
      case "itemSale": return { cols: [{ k: "name", h: "Item" }, { k: "cat", h: "Category" }, { k: "qty", h: "Qty", num: true }, { k: "bills", h: "Invoices", num: true }, { k: "revenue", h: "Sale", num: true, money: true }], rows: group((l) => l.name, (o, l) => { o.cat = l.category; }).sort((a, b) => b.revenue - a.revenue) };
      case "itemProfit": return { cols: [{ k: "name", h: "Item" }, { k: "cat", h: "Category" }, { k: "qty", h: "Qty", num: true }, { k: "revenue", h: "Sale", num: true, money: true }, { k: "cost", h: "Cost", num: true, money: true }, { k: "profit", h: "Profit", num: true, money: true, tone: true }, { k: "margin", h: "Margin %", num: true }], rows: group((l) => l.name, (o, l) => { o.cat = l.category; }).sort((a, b) => b.profit - a.profit) };
      case "catProfit": return { cols: [{ k: "name", h: "Category" }, { k: "qty", h: "Qty", num: true }, { k: "revenue", h: "Sale", num: true, money: true }, { k: "cost", h: "Cost", num: true, money: true }, { k: "profit", h: "Profit", num: true, money: true, tone: true }, { k: "margin", h: "Margin %", num: true }], rows: group((l) => l.category || "Other").sort((a, b) => b.profit - a.profit) };
      case "topItems": return { hint: "Sab se zyada bikne wale 25 items (qty ke hisaab se).", cols: [{ k: "rank", h: "#", num: true }, { k: "name", h: "Item" }, { k: "qty", h: "Qty", num: true }, { k: "revenue", h: "Sale", num: true, money: true }, { k: "profit", h: "Profit", num: true, money: true, tone: true }], rows: group((l) => l.name).sort((a, b) => b.qty - a.qty).slice(0, 25).map((r, i) => ({ ...r, rank: i + 1 })) };
      case "itemCust": return { cols: [{ k: "customer", h: "Customer" }, { k: "name", h: "Item" }, { k: "qty", h: "Qty", num: true }, { k: "revenue", h: "Sale", num: true, money: true }, { k: "profit", h: "Profit", num: true, money: true, tone: true }], rows: group((l) => `${l.customer}\u0000${l.name}`).map((r) => { const [c, i] = r.name.split("\u0000"); return { ...r, customer: c, name: i }; }).sort((a, b) => a.customer.localeCompare(b.customer) || b.revenue - a.revenue) };
      case "audit": {
        const rows = data.products.filter((p: any) => (!cat || t(p.category) === cat) && (!ql || `${p.name} ${p.code} ${p.brand} ${p.model}`.toLowerCase().includes(ql))).map((p: any) => { const stock = n(p.stock), cost = n(p.costPrice), price = n(p.price); return { name: t(p.name || p.model), code: t(p.code ?? p.sku), cat: t(p.category), stock, cost, price, value: stock * cost, retailValue: stock * price, status: stock <= 0 ? "ZERO" : stock <= n(p.minStock ?? p.reorderLevel ?? 2) ? "LOW" : "OK" }; });
        return { hint: "Stock ki maujooda halat. Dead stock/low stock ek nazar mein.", cols: [{ k: "code", h: "Code" }, { k: "name", h: "Item" }, { k: "cat", h: "Category" }, { k: "stock", h: "Stock", num: true }, { k: "cost", h: "Cost", num: true, money: true }, { k: "price", h: "Retail", num: true, money: true }, { k: "value", h: "Stock Value", num: true, money: true }, { k: "retailValue", h: "Retail Value", num: true, money: true }, { k: "status", h: "Status" }], rows, cards: [["Items", money(rows.length)], ["Stock units", money(rows.reduce((a: number, r: any) => a + r.stock, 0))], ["Stock value (cost)", `Rs. ${money(rows.reduce((a: number, r: any) => a + r.value, 0))}`], ["Retail value", `Rs. ${money(rows.reduce((a: number, r: any) => a + r.retailValue, 0))}`], ["Zero stock", money(rows.filter((r: any) => r.status === "ZERO").length)]] };
      }
      case "dead": {
        const days = Math.max(1, n(deadDays) || 30); const limit = shift(today(), -days);
        const rows = data.products.filter((p: any) => n(p.stock) > 0 && (!cat || t(p.category) === cat) && (!ql || `${p.name} ${p.code}`.toLowerCase().includes(ql))).map((p: any) => { const last = m.lastSold.get(String(p._id)) || ""; return { name: t(p.name || p.model), code: t(p.code ?? p.sku), cat: t(p.category), stock: n(p.stock), value: n(p.stock) * n(p.costPrice), last: last || "Kabhi nahi bika" , _last: last }; }).filter((r: any) => !r._last || r._last < limit).sort((a: any, b: any) => b.value - a.value);
        return { hint: `Woh items jo ${days} din se nahi bike (ya kabhi nahi bike) magar stock mein pade hain.`, cols: [{ k: "code", h: "Code" }, { k: "name", h: "Item" }, { k: "cat", h: "Category" }, { k: "stock", h: "Stock", num: true }, { k: "value", h: "Paisa phansa (cost)", num: true, money: true }, { k: "last", h: "Aakhri sale" }], rows, cards: [["Dead items", money(rows.length)], ["Paisa phansa", `Rs. ${money(rows.reduce((a: number, r: any) => a + r.value, 0))}`]] };
      }
      case "moves": {
        const rows = data.moves.filter((x: any) => localDay(x.createdAt) >= from && localDay(x.createdAt) <= to).map((x: any) => ({ day: localDay(x.createdAt), type: t(x.type), name: t(m.prodById.get(t(x.productId))?.name || x.name || x.productId), qty: n(x.qty), reason: t(x.reason), ref: t(x.ref), user: t(x.user) })).filter((r: any) => (!ql || `${r.name} ${r.reason} ${r.ref}`.toLowerCase().includes(ql)));
        return { cols: [{ k: "day", h: "Date" }, { k: "type", h: "Type" }, { k: "name", h: "Item" }, { k: "qty", h: "Qty", num: true }, { k: "reason", h: "Reason" }, { k: "ref", h: "Ref" }, { k: "user", h: "User" }], rows };
      }
      default: return { cols: [], rows: [] };
    }
  }, [rep, m, q, cat, cust, deadDays, data]);

  const rows = useMemo(() => {
    if (!sort) return view.rows;
    return [...view.rows].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (typeof x === "number" && typeof y === "number" ? x - y : t(x).localeCompare(t(y))) * sort.dir; });
  }, [view.rows, sort]);

  const totals = useMemo(() => {
    const tot: Record<string, number> = {};
    for (const c of view.cols) if (c.money || (c.num && ["qty", "stock", "items", "bills"].includes(c.k))) tot[c.k] = rows.reduce((a, r) => a + n(r[c.k]), 0);
    return tot;
  }, [view.cols, rows]);

  const csv = () => {
    const esc = (v: unknown) => `"${t(v).replace(/"/g, '""')}"`;
    const out = [view.cols.map((c) => esc(c.h)).join(","), ...rows.map((r) => view.cols.map((c) => esc(r[c.k])).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + out], { type: "text/csv" })); a.download = `${rep}_${from}_${to}.csv`; a.click();
  };

  const title = REPORTS.find((r) => r.id === rep)?.title || "";
  const showCat = !["summary", "dateProfit", "invoiceProfit", "moves"].includes(rep);
  const showCust = ["dateProfit", "invoiceProfit", "itemSale", "itemProfit", "catProfit", "topItems", "itemCust"].includes(rep);
  const showDates = !["audit", "dead"].includes(rep);
  const tone = (v: number) => (v < 0 ? styles.neg : v > 0 ? styles.pos : "");
  const card = (label: string, value: string, cls = "") => <div className={styles.cardx} key={label}><small>{label}</small><b className={cls}>{value}</b></div>;

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Reports — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/daily-summary">Daily Summary</Link><Link href="/sales">Sales</Link><Link href="/stock">Stock</Link><Link href="/accounts">Accounts</Link></span></div>
    <div className={styles.main}>
      <nav className={styles.menu}>
        {["Overview", "Sales", "Stock"].map((g) => <div key={g} style={{ display: "contents" }}><h3>{g}</h3>{REPORTS.filter((r) => r.group === g).map((r) => <button key={r.id} className={`${styles.mbtn} ${rep === r.id ? styles.mon : ""}`} onClick={() => setRep(r.id)}>{r.title}</button>)}</div>)}
      </nav>
      <section className={styles.pane}>
        <div className={styles.filters}>
          {showDates && <>
            <label>From<input className={styles.in} type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
            <label>To<input className={styles.in} type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
            <div className={styles.chips}>{[["Aaj", "today"], ["Kal", "yesterday"], ["7 din", "week"], ["Is mahine", "month"], ["Pichla mahina", "lastmonth"], ["Saal", "year"], ["Sab", "all"]].map(([l, k]) => <button key={k} className={styles.chipb} onClick={() => preset(k)}>{l}</button>)}</div>
          </>}
          {showCat && <label>Category<select className={styles.in} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Sab</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>}
          {showCust && <label>Customer<select className={styles.in} value={cust} onChange={(e) => setCust(e.target.value)}><option value="">Sab</option>{customers.map((c) => <option key={c}>{c}</option>)}</select></label>}
          {rep === "dead" && <label>Kitne din se nahi bika<input className={styles.in} type="number" min="1" value={deadDays} onChange={(e) => setDeadDays(e.target.value)} style={{ width: 90 }} /></label>}
          {rep !== "summary" && <label>Search<input className={styles.in} value={q} onChange={(e) => setQ(e.target.value)} placeholder="naam / invoice / customer" /></label>}
          <button className={styles.act} onClick={() => void load()}>⟳ Refresh</button>
          {rep !== "summary" && <button className={styles.act} onClick={csv}>⬇ CSV</button>}
          <button className={styles.act} onClick={() => window.print()}>🖨 Print</button>
          {loading && <span className={styles.hint}>load ho raha hai…</span>}
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>{title}{rep !== "audit" && rep !== "dead" ? ` — ${from} se ${to}` : ""}</h2>

        {rep === "summary" ? <>
          <div className={styles.cards}>
            {card("Sale", `Rs. ${money(m.saleTotal)}`, "")}
            {card("Cost of Sold", `Rs. ${money(m.costTotal)}`, styles.warn)}
            {card("Gross Profit", `Rs. ${money(m.gross)}`, tone(m.gross))}
            {card("Margin", m.saleTotal ? `${Math.round((m.gross / m.saleTotal) * 100)}%` : "-", tone(m.gross))}
            {card("Expenses", `Rs. ${money(m.expTotal)}`, styles.neg)}
            {card("Net Profit / Loss", `Rs. ${money(m.net)}`, tone(m.net))}
            {card("Sale Returns", `Rs. ${money(m.returnTotal)}`, styles.warn)}
            {card("Purchases", `Rs. ${money(m.purchaseTotal)}`)}
            {card("Receivable (udhaar)", `Rs. ${money(m.receivable)}`)}
            {card("Payable", `Rs. ${money(m.payable)}`)}
          </div>
          <div className={styles.tblWrap}><table className={styles.tbl}><thead><tr><th>Payment Account</th><th className={styles.num}>In</th><th className={styles.num}>Out</th><th className={styles.num}>Net</th></tr></thead>
            <tbody>{Object.entries(m.tx.reduce((a: any, x: any) => { const k = t(x.account || "Cash"); (a[k] ||= { i: 0, o: 0 })[x.type === "IN" ? "i" : "o"] += n(x.amount); return a; }, {})).map(([k, v]: any) => <tr key={k}><td>{k}</td><td className={styles.num}>{money(v.i)}</td><td className={styles.num}>{money(v.o)}</td><td className={`${styles.num} ${tone(v.i - v.o)}`}>{money(v.i - v.o)}</td></tr>)}
              {!m.tx.length && <tr><td colSpan={4} className={styles.empty}>Is muddat mein koi cash entry nahi.</td></tr>}</tbody></table></div>
        </> : <>
          {view.hint && <p className={styles.hint}>{view.hint}</p>}
          {view.cards && <div className={styles.cards}>{view.cards.map(([l, v]) => card(l, v))}</div>}
          <div className={styles.tblWrap}><table className={styles.tbl}>
            <thead><tr>{view.cols.map((c) => <th key={c.k} className={c.num ? styles.num : ""} onClick={() => setSort((s) => (s?.k === c.k ? { k: c.k, dir: (s.dir * -1) as 1 | -1 } : { k: c.k, dir: 1 }))}>{c.h}{sort?.k === c.k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{view.cols.map((c) => { const v = r[c.k]; return <td key={c.k} className={`${c.num ? styles.num : ""} ${c.tone ? tone(n(v)) : ""} ${c.k === "status" && v !== "OK" ? styles.warn : ""}`}>{c.money ? money(v) : t(v)}</td>; })}</tr>)}
              {!rows.length && <tr><td colSpan={view.cols.length} className={styles.empty}>Is muddat / filter mein koi data nahi.</td></tr>}</tbody>
            {rows.length > 0 && Object.keys(totals).length > 0 && <tfoot><tr>{view.cols.map((c, i) => <td key={c.k} className={c.num ? styles.num : ""}>{i === 0 ? `Total (${rows.length})` : c.k in totals ? (c.money ? money(totals[c.k]) : money(totals[c.k])) : ""}</td>)}</tr></tfoot>}
          </table></div>
        </>}
      </section>
    </div>
  </main>;
}
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
