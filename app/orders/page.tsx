"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./orders.module.css";
import { categoryOf, nameCovers } from "@/lib/orderBook";
import { notify } from "@/lib/toast";

const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const CATS = ["Displays / LCD", "CHB Strip", "Back Ring", "Displays / INCELL / TFT", "Displays LED ORG", "Batteries", "Charging Ports", "Speakers / Mic", "Cameras", "Buttons / Flex", "Body / Housing", "Repairing Parts", "Tools", "Other Parts"];

function group<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>();
  for (const r of rows) { const k = key(r) || "Other"; (m.get(k) || m.set(k, []).get(k)!).push(r); }
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default function OrderBook() {
  const [tab, setTab] = useState<"urgent" | "stock">("urgent");
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [cat, setCat] = useState(CATS[0]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [o, p] = await Promise.all([fetch("/api/orders", { cache: "no-store" }).then(arr), fetch("/api/data?collection=products&limit=5000").then(arr)]);
    setOrders(o); setProducts(p);
  };
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "stock") setTab("stock");
    void load();
  }, []);

  const needle = q.trim().toLowerCase();
  const urgent = useMemo(() => orders.filter((o) => !needle || `${o.name} ${o.token} ${o.customerName} ${o.category}`.toLowerCase().includes(needle)), [orders, needle]);
  const outOfStock = useMemo(() => products.filter((p) => Number(p.stock || 0) <= 0 && (!needle || `${p.name} ${p.code} ${p.brand} ${p.category}`.toLowerCase().includes(needle))), [products, needle]);
  const allOut = products.filter((p) => Number(p.stock || 0) <= 0).length;
  const inBook = (p: any) => orders.some((o) => (o.productId && String(o.productId) === String(p._id)) || nameCovers(String(p.name || ""), String(o.name || "")) && nameCovers(String(o.name || ""), String(p.name || "")));

  async function post(items: any[]) {
    setBusy(true);
    try {
      const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua.");
      await load();
      notify(d.added?.length ? "Order Book mein add ho gaya." : "Ye pehle se Order Book mein hai.", { kind: d.added?.length ? "success" : "info" });
    } catch (e: any) { notify(e?.message || "Save nahi hua.", { kind: "danger" }); } finally { setBusy(false); }
  }
  async function setStatus(id: string, status: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (!r.ok) throw new Error((await r.json()).error || "Update nahi hua.");
      await load();
    } catch (e: any) { notify(e?.message || "Update nahi hua.", { kind: "danger" }); } finally { setBusy(false); }
  }
  const addManual = () => { const n = name.trim(); if (!n) { notify("Cheez ka naam likhein (jaise VIVO Y100 BACK RING).", { kind: "warning" }); return; } void post([{ name: n.toUpperCase(), category: cat, qty: 1 }]).then(() => setName("")); };

  return <main className={styles.page}>
    <div className={styles.top}>
      <Link href="/">← Dashboard</Link><h1>📒 Order Book</h1>
      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${tab === "urgent" ? styles.tabOn : ""}`} onClick={() => setTab("urgent")}>🔥 Urgent Order Book<span className={styles.badge}>{orders.length}</span></button>
        <button type="button" className={`${styles.tab} ${tab === "stock" ? styles.tabOn : ""}`} onClick={() => setTab("stock")}>📦 Out of Stock<span className={styles.badge}>{allOut}</span></button>
      </div>
    </div>
    <div className={styles.bar}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: naam / C1400 / customer…" style={{ minWidth: 240 }} />
      {tab === "urgent" && <>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naya order: e.g. VIVO Y100 BACK RING" style={{ minWidth: 260 }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <button type="button" disabled={busy} onClick={addManual}>＋ Order Book mein daalein</button>
      </>}
    </div>

    <div className={styles.body}>
      {tab === "urgent" && (urgent.length === 0 ? <div className={styles.empty}>Order Book khali hai. Repair mein jo cheez stock mein na ho wo yahan khud aa jati hai; purchase karte hi khud hat jati hai.</div>
        : group(urgent, (o) => o.category).map(([c, list]) => <section key={c} className={styles.group}><h3><span>{c}</span><span>{list.length}</span></h3>
          {list.map((o) => <div key={o._id} className={styles.row}>
            <b>{o.name}{o.qty > 1 ? ` × ${o.qty}` : ""}<span className={styles.sub}>{o.token ? `${o.token} · ${o.customerName || o.model}` : "Manual order"}</span></b>
            <span className={`${styles.chip} ${o.status === "ORDERED" ? styles.ordered : styles.open}`}>{o.status === "ORDERED" ? "Ordered" : "Order karna hai"}</span>
            {o.status !== "ORDERED" && <button type="button" className={styles.btn} disabled={busy} onClick={() => void setStatus(o._id, "ORDERED")}>Order ho gaya</button>}
            <button type="button" className={styles.btn} disabled={busy} onClick={() => { if (window.confirm(`"${o.name}" Order Book se hata dein?`)) void setStatus(o._id, "CANCELLED"); }}>✖</button>
          </div>)}
        </section>))}

      {tab === "stock" && (outOfStock.length === 0 ? <div className={styles.empty}>Koi item out of stock nahi. 👍</div>
        : group(outOfStock, (p) => categoryOf(String(p.name || ""), String(p.category || "").trim())).map(([c, list]) => <section key={c} className={styles.group}><h3><span>{c}</span><span>{list.length}</span></h3>
          {list.map((p) => <div key={p._id} className={styles.row}>
            <b>{p.name}<span className={styles.sub}>{[p.code ?? p.sku, p.brand].filter(Boolean).join(" · ")}</span></b>
            <span className={`${styles.chip} ${styles.open}`}>Stock 0</span>
            <button type="button" className={styles.btn} disabled={busy || inBook(p)} onClick={() => void post([{ name: String(p.name || "").toUpperCase(), category: categoryOf(String(p.name || ""), String(p.category || "").trim()), productId: String(p._id), qty: 1 }])}>{inBook(p) ? "✔ Order Book mein" : "📒 Order Book"}</button>
          </div>)}
        </section>))}
    </div>
  </main>;
}
