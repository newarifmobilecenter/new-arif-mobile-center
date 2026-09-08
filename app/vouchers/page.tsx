"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const accounts = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Other Bank", "Other"];

export default function Vouchers() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [account, setAccount] = useState("Cash");
  const [type, setType] = useState("IN");
  const [amount, setAmount] = useState("");
  const [party, setParty] = useState("");
  const [note, setNote] = useState("");

  const load = () => fetch("/api/data?collection=transactions").then((r) => r.json()).then(setTransactions);
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!amount) return alert("Amount enter karein");
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection: "transactions",
        account,
        type,
        amount: Number(amount),
        party,
        note,
        voucherType: type === "IN" ? "RECEIVE" : "PAY",
        createdAt: new Date().toISOString(),
      }),
    });
    setAmount("");
    setParty("");
    setNote("");
    void load();
  }

  return (
    <main className="shell">
      <div className="nav"><Link href="/">← Dashboard</Link><Link href="/accounts">Accounts</Link></div>
      <h1>🧾 Vouchers</h1>
      <div className="grid">
        {[["Cash Receive Voucher", "IN"], ["Cash Pay Voucher", "OUT"], ["Bank Receive Voucher", "IN"], ["Bank Pay Voucher", "OUT"]].map(([name, value]) => (
          <button className="card" key={name} onClick={() => setType(value)}><h2>{name}</h2><p className="muted">Click to prepare this voucher</p></button>
        ))}
      </div>
      <div className="panel">
        <h2>{type === "IN" ? "Receive" : "Pay"} Voucher</h2>
        <div className="grid">
          <select className="input" value={account} onChange={(e) => setAccount(e.target.value)}>{accounts.map((x) => <option key={x}>{x}</option>)}</select>
          <input className="input" value={party} onChange={(e) => setParty(e.target.value)} placeholder="Party / Customer / Supplier" />
          <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Narration / Reference" />
        </div>
        <button className="btn green" onClick={save}>Save Voucher</button>
      </div>
      <div className="panel">
        <h2>Voucher Summary</h2>
        {transactions.slice(0, 30).map((x) => (
          <div className="row" key={x._id}><div className="col">{x.voucherType || x.type} • {x.account} • {x.party || "-"}</div><b>Rs. {Number(x.amount || 0).toLocaleString()}</b></div>
        ))}
      </div>
    </main>
  );
}
