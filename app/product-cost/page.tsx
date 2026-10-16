"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./product-cost.module.css";

type CostLine = { id: string; search: string; productId: string; cost: string };
const blankLine = (): CostLine => ({ id: `${Date.now()}-${Math.random()}`, search: "", productId: "", cost: "" });
const money = (n: number) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

export default function ProductCostPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [lines, setLines] = useState<CostLine[]>([blankLine()]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/data?collection=products&limit=5000").then(r => r.json()).then(rows => setProducts(Array.isArray(rows) ? rows : [])).catch(() => setMessage("Products load nahi ho sakay.")); }, []);

  function update(id: string, changes: Partial<CostLine>) { setLines(current => current.map(line => line.id === id ? { ...line, ...changes } : line)); }
  function selectProduct(lineId: string, product: any) {
    update(lineId, { productId: String(product._id), search: `${product.code || product.sku || ""} ${product.name || ""} ${product.brand || ""}`.trim(), cost: String(product.costPrice ?? 0) });
  }
  async function save() {
    const filled = lines.filter(line => line.productId);
    if (!filled.length) { setMessage("Pehle product search karke select karein."); return; }
    if (filled.some(line => !Number.isFinite(Number(line.cost)) || Number(line.cost) < 0)) { setMessage("Har product ki valid zero ya us se zyada cost likhein."); return; }
    setBusy(true); setMessage("");
    try {
      for (const line of filled) {
        const response = await fetch("/api/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "products", id: line.productId, costPrice: Number(line.cost) }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Cost update save nahi hui.");
      }
      setMessage(`${filled.length} product cost update ho gayi.`);
      setLines([blankLine()]);
      const response = await fetch("/api/data?collection=products&limit=5000");
      const rows = await response.json(); setProducts(Array.isArray(rows) ? rows : []);
    } catch (error: any) { setMessage(error?.message || "Cost update save nahi hui."); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <header className={styles.title}><Link href="/">← Dashboard</Link><h1>Change Product Cost</h1><Link href="/admin">Product List</Link></header>
    <p className={styles.intro}>Product dhoondein, nayi purchase cost likhein, aur `＋` se agla product add karein.</p>
    <section className={styles.panel}>
      <div className={styles.heading}><span>Product</span><span>Current Cost</span><span>New Cost</span><span>Next</span></div>
      {lines.map(line => {
        const matches = line.search.trim() ? products.filter(product => `${product.code || ""} ${product.sku || ""} ${product.name || ""} ${product.brand || ""} ${product.barcode || ""}`.toLowerCase().includes(line.search.toLowerCase())).slice(0, 8) : [];
        const selected = products.find(product => String(product._id) === line.productId);
        return <div className={styles.line} key={line.id}>
          <div className={styles.searchBox}><input value={line.search} onChange={event => update(line.id, { search: event.target.value, productId: "", cost: "" })} placeholder="Code, name, brand ya barcode se search" />{matches.length > 0 && !selected && <div className={styles.results}>{matches.map(product => <button key={product._id} type="button" onClick={() => selectProduct(line.id, product)}><b>{product.code || product.sku || "No code"} · {product.name}</b><small>{product.brand || ""} · Cost Rs. {money(product.costPrice)}</small></button>)}</div>}</div>
          <span className={styles.current}>{selected ? `Rs. ${money(Number(selected.costPrice || 0))}` : "—"}</span>
          <input className={styles.cost} type="number" min="0" step="0.01" value={line.cost} onChange={event => update(line.id, { cost: event.target.value })} placeholder="New cost" disabled={!selected} />
          <div className={styles.lineActions}><button type="button" aria-label="Add another cost row" onClick={() => setLines(current => [...current, blankLine()])}>＋</button>{lines.length > 1 && <button type="button" aria-label="Remove row" onClick={() => setLines(current => current.filter(row => row.id !== line.id))}>×</button>}</div>
        </div>;
      })}
      <footer className={styles.footer}><button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save Cost Changes"}</button>{message && <span role="status">{message}</span>}</footer>
    </section>
  </main>;
}
