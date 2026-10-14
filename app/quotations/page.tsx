"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Quotations() {
  const [products, setProducts] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [quotationNo, setQuotationNo] = useState("");
  const [customer, setCustomer] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/data?collection=products").then((r) => r.json()).then((d:any)=>Array.isArray(d)?d:[]).then(setProducts);
  }, []);

  const shown = products.filter((x) =>
    (x.name + " " + x.model + " " + (x.sku || "")).toLowerCase().includes(search.toLowerCase())
  );
  const total = lines.reduce((sum, x) => sum + Number(x.qty) * Number(x.price), 0);

  async function save() {
    if (!lines.length) return alert("Product select karein");
    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection: "invoices",
        type: "quotation",
        quotationNo: quotationNo || "QTN-" + Date.now(),
        customer,
        items: lines,
        total,
        status: "open",
        createdAt: new Date().toISOString(),
      }),
    });
    if (response.ok) alert("Quotation saved. Stock was not changed.");
    else alert("Quotation save failed");
  }

  return (
    <main className="shell">
      <div className="nav"><Link href="/">← Dashboard</Link><Link href="/pos">POS</Link></div>
      <h1>📄 Quotations</h1>
      <div className="panel">
        <div className="grid">
          <input className="input" value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} placeholder="Quotation No" />
          <input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer / Cash Quote" />
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product/model/SKU" />
        </div>
        <div className="grid">
          {shown.slice(0, 25).map((x) => (
            <button className="card" key={x._id} onClick={() => setLines((current) => [...current, { productId: x._id, name: x.name, qty: 1, price: Number(x.price || 0) }])}>
              <b>{x.name}</b><p>{x.model} • Rs. {x.price}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Quotation Lines</h2>
        {lines.map((x, i) => (
          <div className="row" key={i}>
            <div className="col">{x.name}</div>
            <input className="input" style={{ maxWidth: 100 }} type="number" min="1" value={x.qty} onChange={(e) => setLines((a) => a.map((z, j) => j === i ? { ...z, qty: Number(e.target.value) } : z))} />
            <input className="input" style={{ maxWidth: 150 }} type="number" value={x.price} onChange={(e) => setLines((a) => a.map((z, j) => j === i ? { ...z, price: Number(e.target.value) } : z))} />
          </div>
        ))}
        <h2>Total: Rs. {total.toLocaleString()}</h2>
        <button className="btn green" onClick={save}>Save Quotation</button>
      </div>
    </main>
  );
}
