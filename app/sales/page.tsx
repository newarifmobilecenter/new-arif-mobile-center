"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : []));

export default function Sales() {
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState("");

  const load = async () => {
    const [s, c] = await Promise.all([
      fetch("/api/data?collection=sales&limit=5000&includeCancelled=1").then(arr).catch(() => []),
      fetch("/api/data?collection=customers&limit=5000").then(arr).catch(() => []),
    ]);
    setRows(s); setCustomers(c);
  };
  useEffect(() => { void load(); }, []);

  const names = useMemo(() => new Map(customers.map(c => [String(c._id), String(c.name || "")])), [customers]);
  const nameOf = (s: any) => names.get(String(s.customerId || "")) || s.cashRef || "Cash";
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter(s => [s.invoiceNo, nameOf(s), s.custRef, s.remarks].some(v => String(v ?? "").toLowerCase().includes(t))) : rows;
  }, [rows, q, names]); // eslint-disable-line react-hooks/exhaustive-deps

  async function cancel(s: any) {
    const reason = window.prompt(`Invoice ${s.invoiceNo} cancel karne ki wajah likhein:`, "");
    if (reason === null) return;
    if (!window.confirm(`Invoice ${s.invoiceNo} cancel ho jayegi. Stock wapas aa jayega aur payment ulti ho jayegi. Pakka cancel karein?`)) return;
    setBusy(String(s._id));
    try {
      const r = await fetch("/api/sales/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saleId: s._id, reason }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Cancel nahi hua.");
      setMsg({ text: `Invoice ${s.invoiceNo} cancel ho gayi; stock wapas aa gaya.`, ok: true });
      await load();
    } catch (e: any) { setMsg({ text: e?.message || "Cancel nahi hua.", ok: false }); } finally { setBusy(""); }
  }

  return <main className="shell">
    <div className="nav"><Link href="/">← Dashboard</Link><Link href="/pos">New Sale</Link><Link href="/invoices">Invoices</Link><Link href="/sales/returns">Sale Return</Link></div>
    <h1>📈 Sales</h1>
    <div className="panel">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Invoice no (S001), customer, ref ya remarks search karein…" style={{ width: "100%", maxWidth: 420, padding: "8px 10px", marginBottom: 8 }} />
      {msg && <p role="status" style={{ color: msg.ok ? "#4ade80" : "#f87171", fontWeight: 700 }}>{msg.text}</p>}
      <table className="table"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Due</th><th>Date</th><th>Action</th></tr></thead>
        <tbody>{shown.map(s => { const off = s.status === "cancelled"; return <tr key={s._id} style={off ? { opacity: .55 } : undefined}>
          <td><Link href={"/invoice/" + s._id}>{s.invoiceNo}</Link>{off && <b style={{ color: "#f87171", marginLeft: 6 }}>CANCELLED</b>}{!off && Array.isArray(s.modifications) && s.modifications.length > 0 && <small style={{ marginLeft: 6, color: "#fbbf24" }}>modified</small>}</td>
          <td>{nameOf(s)}</td><td>Rs. {money(s.total)}</td><td>Rs. {money(s.paid)}</td><td>Rs. {money(s.remaining)}</td><td>{new Date(s.createdAt).toLocaleDateString()}</td>
          <td>{!off && <><Link href={`/pos?edit=${s._id}`}>Modify</Link> · <button type="button" disabled={busy === String(s._id)} onClick={() => void cancel(s)} style={{ cursor: "pointer" }}>Cancel</button></>}</td>
        </tr>; })}{!shown.length && <tr><td colSpan={7}>Koi invoice nahi mili.</td></tr>}</tbody></table>
    </div>
  </main>;
}
