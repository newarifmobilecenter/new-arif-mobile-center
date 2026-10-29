"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const localDay = (v: unknown) => { const d = v ? new Date(v as string) : null; if (!d || isNaN(+d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const today = () => localDay(new Date());
const shift = (day: string, by: number) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + by); return localDay(d); };

const card = { background: "#0f1a33", border: "1px solid #26304a", borderRadius: 10, padding: "10px 14px" } as const;
const label = { color: "#94a3b8", fontSize: 13 } as const;

export default function DailySummary() {
  const [day, setDay] = useState(today);
  const [data, setData] = useState<any>({ sales: [], purchases: [], expenses: [], tx: [], returns: [], repairs: [], products: [], customers: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [sales, purchases, expenses, tx, returns, repairs, products, customers] = await Promise.all(
      ["sales", "purchases", "expenses", "transactions", "returns", "x", "products", "customers"].map(c =>
        c === "x" ? fetch("/api/repairs").then(arr).catch(() => []) : fetch(`/api/data?collection=${c}&limit=5000`).then(arr).catch(() => []))
    );
    setData({ sales, purchases, expenses, tx, returns, repairs, products, customers });
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const s = useMemo(() => {
    const on = (rows: any[], f = "createdAt") => rows.filter(r => localDay(r[f]) === day);
    const sales = on(data.sales), purchases = on(data.purchases), expenses = on(data.expenses), tx = on(data.tx), returns = on(data.returns);
    const repairsIn = data.repairs.filter((r: any) => localDay(r.receivedAt || r.createdAt) === day);
    const cost = new Map<string, number>(data.products.map((p: any) => [String(p._id), Number(p.costPrice || 0)]));
    const names = new Map<string, string>(data.customers.map((c: any) => [String(c._id), String(c.name || "")]));
    const sum = (rows: any[], f: string) => rows.reduce((t, r) => t + Number(r[f] || 0), 0);
    const saleReturns = returns.filter((r: any) => r.type === "SALE_RETURN");
    const profit = sales.reduce((t: number, x: any) => t + (x.items || []).reduce((a: number, i: any) => a + Number(i.total ?? i.qty * i.price) - Number(cost.get(String(i.productId)) || 0) * Number(i.qty || 0), 0), 0);
    const byAccount: Record<string, { in: number; out: number }> = {};
    for (const t of tx) { const a = String(t.account || "Cash"); (byAccount[a] ||= { in: 0, out: 0 })[t.type === "IN" ? "in" : "out"] += Number(t.amount || 0); }
    const cashIn = sum(tx.filter((t: any) => t.type === "IN"), "amount"), cashOut = sum(tx.filter((t: any) => t.type === "OUT"), "amount");
    return { sales, purchases, expenses, saleReturns, repairsIn, names, byAccount, cashIn, cashOut,
      salesTotal: sum(sales, "total"), salesPaid: sum(sales, "paid"), salesDue: sum(sales, "remaining"),
      purchaseTotal: sum(purchases, "total"), purchasePaid: sum(purchases, "paid"), expenseTotal: sum(expenses, "amount"),
      returnTotal: sum(saleReturns, "amount"), profit, repairBill: sum(repairsIn, "totalBill"), repairPaid: sum(repairsIn, "paid") };
  }, [data, day]);

  const stat = (title: string, value: string, sub?: string, color = "#e5e7eb") => <div style={card}><div style={label}>{title}</div><div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>{sub && <div style={label}>{sub}</div>}</div>;

  return <main className="shell">
    <div className="nav"><Link href="/">← Dashboard</Link><Link href="/reports">Reports</Link><Link href="/sales">Sales</Link><Link href="/ledger">Cash Book</Link></div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "4px 0 8px" }}>
      <h1 style={{ margin: 0 }}>📅 Daily Summary</h1>
      <button className="btn" type="button" onClick={() => setDay(d => shift(d, -1))}>◀</button>
      <input type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} />
      <button className="btn" type="button" onClick={() => setDay(d => shift(d, 1))}>▶</button>
      <button className="btn" type="button" onClick={() => setDay(today())}>Aaj</button>
      <button className="btn" type="button" onClick={() => void load()}>⟳ Refresh</button>
      <button className="btn" type="button" onClick={() => window.print()}>🖨 Print</button>
      {loading && <span style={label}>load ho raha hai…</span>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>
      {stat("Sales", `Rs. ${money(s.salesTotal)}`, `${s.sales.length} invoice · received ${money(s.salesPaid)} · udhaar ${money(s.salesDue)}`, "#22d3ee")}
      {stat("Estimated Profit", `Rs. ${money(s.profit)}`, "maujooda cost ke hisaab se", "#4ade80")}
      {stat("Sale Returns", `Rs. ${money(s.returnTotal)}`, `${s.saleReturns.length} return`, "#fbbf24")}
      {stat("Purchases", `Rs. ${money(s.purchaseTotal)}`, `${s.purchases.length} bill · paid ${money(s.purchasePaid)}`)}
      {stat("Expenses", `Rs. ${money(s.expenseTotal)}`, `${s.expenses.length} entry`, "#f87171")}
      {stat("Cash In / Out", `${money(s.cashIn)} / ${money(s.cashOut)}`, `net Rs. ${money(s.cashIn - s.cashOut)}`)}
      {stat("Repairs (received)", `${s.repairsIn.length}`, `bill ${money(s.repairBill)} · paid ${money(s.repairPaid)}`)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 8, marginTop: 8 }}>
      <div className="panel" style={{ margin: 0 }}><h2 style={{ marginTop: 0 }}>Aaj ki Sales</h2>
        <div style={{ maxHeight: "34vh", overflow: "auto" }}><table className="table"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th></tr></thead>
          <tbody>{s.sales.map((x: any) => <tr key={x._id}><td><Link href={`/invoice/${x._id}`}>{x.invoiceNo}</Link></td><td>{s.names.get(String(x.customerId || "")) || x.cashRef || "Cash"}</td><td>{money(x.total)}</td><td>{money(x.paid)}</td></tr>)}{!s.sales.length && <tr><td colSpan={4}>Is din koi sale nahi.</td></tr>}</tbody></table></div></div>
      <div className="panel" style={{ margin: 0 }}><h2 style={{ marginTop: 0 }}>Cash / Account wise</h2>
        <table className="table"><thead><tr><th>Account</th><th>In</th><th>Out</th><th>Net</th></tr></thead>
          <tbody>{Object.entries(s.byAccount).map(([a, v]: any) => <tr key={a}><td>{a}</td><td>{money(v.in)}</td><td>{money(v.out)}</td><td>{money(v.in - v.out)}</td></tr>)}{!Object.keys(s.byAccount).length && <tr><td colSpan={4}>Is din koi cash entry nahi.</td></tr>}</tbody></table>
        <h2>Purchases / Expenses</h2>
        <div style={{ maxHeight: "16vh", overflow: "auto" }}><table className="table"><tbody>
          {s.purchases.map((p: any) => <tr key={p._id}><td>{p.invoiceNo}</td><td>{p.supplierName}</td><td>{money(p.total)}</td></tr>)}
          {s.expenses.map((e: any) => <tr key={e._id}><td>Expense</td><td>{e.title || e.category}</td><td>{money(e.amount)}</td></tr>)}
          {!s.purchases.length && !s.expenses.length && <tr><td>Is din koi purchase ya expense nahi.</td></tr>}</tbody></table></div></div>
    </div>
  </main>;
}
