"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const accounts = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Other Bank", "Other"];
const customerPaymentMethods = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "Bank", "Other"];
const money = (value: number) => Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

export default function Vouchers() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [account, setAccount] = useState("Cash");
  const [type, setType] = useState("IN");
  const [amount, setAmount] = useState("");
  const [party, setParty] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const [t, c, s, r] = await Promise.all([
      fetch("/api/data?collection=transactions&limit=5000").then(x => x.json()).catch(() => []),
      fetch("/api/data?collection=customers&limit=5000").then(x => x.json()).catch(() => []),
      fetch("/api/data?collection=sales&limit=5000").then(x => x.json()).catch(() => []),
      fetch("/api/repairs?status=PAYMENT_DUE").then(x => x.json()).catch(() => []),
    ]);
    setTransactions(Array.isArray(t) ? t : []);
    setCustomers(Array.isArray(c) ? c : []);
    setSales(Array.isArray(s) ? s : []);
    setRepairs(Array.isArray(r) ? r : []);
  };
  useEffect(() => { void load(); }, []);

  const dues = useMemo(() => customers.map(customer => {
    const salesDue = sales.filter(sale => String(sale.customerId || "") === String(customer._id)).reduce((sum, sale) => sum + Number(sale.remaining || 0), 0);
    const repairsDue = repairs.filter(repair => String(repair.customerId || "") === String(customer._id)).reduce((sum, repair) => sum + Number(repair.remaining || 0), 0);
    return { ...customer, due: salesDue + repairsDue };
  }).filter(customer => customer.due > 0), [customers, sales, repairs]);
  const selectedCustomer = dues.find(customer => String(customer._id) === customerId);

  async function save() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { setMessage("Valid payment amount likhein."); return; }
    if (type === "CUSTOMER_RECEIVE") {
      if (!customerId || !selectedCustomer) { setMessage("Due wala customer select karein."); return; }
      if (value > selectedCustomer.due + 0.00001) { setMessage(`Is customer ka total due Rs. ${money(selectedCustomer.due)} hai.`); return; }
    } else if (!party.trim()) { setMessage("Party / Customer / Supplier ka naam likhein."); return; }
    setBusy(true); setMessage("");
    try {
      let response: Response;
      let data: any;
      if (type === "CUSTOMER_RECEIVE") {
        response = await fetch("/api/customers/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, amount: value, paymentMethod: account, ref: note }) });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || "Customer payment save nahi hui.");
        setMessage(`Rs. ${money(data.applied)} receive aur customer ki pending sale/repair mein adjust ho gaye.`);
      } else {
        response = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "transactions", account, type, amount: value, party: party.trim(), note: note.trim(), voucherType: type === "IN" ? "RECEIVE" : "PAY", createdAt: new Date().toISOString() }) });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || "Voucher save nahi hua.");
        setMessage("Voucher save ho gaya.");
      }
      setAmount(""); setParty(""); setNote("");
      await load();
    } catch (error: any) { setMessage(error?.message || "Voucher save nahi hua."); }
    finally { setBusy(false); }
  }

  const voucherTypes = [["Cash Receive", "IN"], ["Cash Pay", "OUT"], ["Bank Receive", "IN"], ["Bank Pay", "OUT"], ["Receive Customer Due", "CUSTOMER_RECEIVE"]];
  return <main className="shell">
    <div className="nav"><Link href="/">← Dashboard</Link><Link href="/accounts">Accounts</Link><Link href="/ledger">Customer Ledger</Link><Link href="/pos">New Sale</Link></div>
    <h1>🧾 Vouchers & Customer Due Collection</h1>
    <div className="grid">
      {voucherTypes.map(([name, value]) => <button className="card" key={name} onClick={() => { setType(value); if (value === "CUSTOMER_RECEIVE") setAccount("Cash"); setMessage(""); }}><h2>{name}</h2><p className="muted">{value === "CUSTOMER_RECEIVE" ? "Customer se pending sale ya repair payment wasool karein." : "Voucher ki type select karein."}</p></button>)}
    </div>
    <section className="panel">
      <h2>{type === "CUSTOMER_RECEIVE" ? "Customer Pending Payment Receive" : type === "IN" ? "Receive Voucher" : "Pay Voucher"}</h2>
      <div className="grid">
        <label className="input">Account / Method<select className="input" value={type === "CUSTOMER_RECEIVE" && !customerPaymentMethods.includes(account) ? "Cash" : account} onChange={e => setAccount(e.target.value)}>{(type === "CUSTOMER_RECEIVE" ? customerPaymentMethods : accounts).map(x => <option key={x}>{x}</option>)}</select></label>
        {type === "CUSTOMER_RECEIVE" ? <label className="input">Due Customer<select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Select customer with balance</option>{dues.map(customer => <option key={customer._id} value={customer._id}>{customer.name} · Due Rs. {money(customer.due)}</option>)}</select></label> : <input className="input" value={party} onChange={e => setParty(e.target.value)} placeholder="Party / Customer / Supplier" />}
        <input className="input" type="number" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
        <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Narration / Reference" />
      </div>
      {type === "CUSTOMER_RECEIVE" && selectedCustomer && <p className="muted">{selectedCustomer.name} outstanding balance (sale + repair): <b>Rs. {money(selectedCustomer.due)}</b>. Payment auto-adjust hogi sab se purane due par.</p>}
      <button className="btn green" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : type === "CUSTOMER_RECEIVE" ? "Receive & Adjust Customer Due" : "Save Voucher"}</button>
      {message && <p role="status">{message}</p>}
    </section>
    <section className="panel"><h2>Voucher Summary</h2><table className="table"><thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Party</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{transactions.slice(0, 50).map(row => <tr key={row._id}><td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</td><td>{row.note === "Customer balance payment" ? "Customer Due Receive" : row.voucherType || row.type}</td><td>{row.account || "-"}</td><td>{row.customerId ? customers.find(c => String(c._id) === String(row.customerId))?.name || row.party || "Customer" : row.party || "-"}</td><td>{row.ref || row.note || "-"}</td><td>Rs. {money(row.amount)}</td></tr>)}{!transactions.length && <tr><td colSpan={6}>No vouchers saved yet.</td></tr>}</tbody></table></section>
  </main>;
}
