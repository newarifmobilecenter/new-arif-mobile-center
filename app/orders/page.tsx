"use client";

import { useEffect, useMemo, useState } from "react";
import SearchSelect from "@/app/components/SearchSelect";
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

// WhatsApp copy: "*Category*" then one short model per line (brand and part words removed).
const COPY_TITLE: Record<string, string> = { "Displays / LCD": "Panel" };
const DROP = new Set(["VIVO","OPPO","SAMSUNG","INFINIX","TECNO","REALME","XIAOMI","REDMI","POCO","HUAWEI","HONOR","ITEL","NOKIA","APPLE","IPHONE","LCD","LED","INCELL","TFT","ORG","ORIGINAL","DISPLAY","DISPLAYS","PANEL","CHB","STRIP","BACK","RING","BATTERY","CHARGING","PORT","BOARD","SPEAKER","MIC","CAMERA","FLEX","BUTTON","BODY","HOUSING","FOR","WITH","FRAME","TOUCH","SCREEN","AMOLED","OLED"]);
const shortName = (name: string) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const kept = parts.filter((w) => !DROP.has(w.toUpperCase()));
  return (kept.length ? kept : parts).join(" ");
};
function copyText(blocks: [string, { name: string; qty?: number }[]][]) {
  return blocks.map(([c, list]) => {
    const seen = new Map<string, number>();
    for (const o of list) { const k = shortName(o.name); seen.set(k, (seen.get(k) || 0) + Math.max(1, Number(o.qty || 1))); }
    return `*${COPY_TITLE[c] || c}*\n` + Array.from(seen.entries()).map(([k, n]) => n > 1 ? `${k} x${n}` : k).join("\n");
  }).join("\n\n");
}
async function copyToClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  try {
    const t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok;
  } catch { return false; }
}

export default function OrderBook() {
  const [tab, setTab] = useState<"urgent" | "stock" | "low">("urgent");
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [cat, setCat] = useState(CATS[0]);
  const [busy, setBusy] = useState(false);
  const [mqty, setMqty] = useState("1");
  const [pq, setPq] = useState("");
  const [minDraft, setMinDraft] = useState<Record<string, string>>({});
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});

  const [optCats, setOptCats] = useState<string[]>([]);
  const load = async () => {
    const [o, p, opts] = await Promise.all([fetch("/api/orders", { cache: "no-store" }).then(arr), fetch("/api/data?collection=products&limit=20000").then(arr), fetch("/api/data?collection=productOptions&limit=20000", { cache: "no-store" }).then(arr).catch(() => [])]);
    setOrders(o); setProducts(p);
    setOptCats((opts as any[]).filter((x) => x.type === "category").map((x) => String(x.name || "").trim()).filter(Boolean));
  };
  // Dropdown mein purani list + New Item mein banai hui sab categories (productOptions aur products ki)
  const catList = useMemo(() => {
    const seen = new Set<string>(); const out: string[] = [];
    for (const c of [...CATS, ...optCats, ...products.map((x: any) => String(x.category || "").trim())]) { const k = c.toLowerCase(); if (c && !seen.has(k)) { seen.add(k); out.push(c); } }
    return out;
  }, [optCats, products]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "stock") setTab("stock");
    void load();
  }, []);

  const needle = q.trim().toLowerCase();
  const urgent = useMemo(() => orders.filter((o) => !needle || `${o.name} ${o.token} ${o.customerName} ${o.category}`.toLowerCase().includes(needle)), [orders, needle]);
  const outOfStock = useMemo(() => products.filter((p) => Number(p.stock || 0) <= 0 && (!needle || `${p.name} ${p.code} ${p.brand} ${p.category}`.toLowerCase().includes(needle))), [products, needle]);
  const lowList = useMemo(() => products.filter((p) => Number(p.minStock || 0) > 0 && Number(p.stock || 0) <= Number(p.minStock || 0) && (!needle || `${p.name} ${p.code} ${p.brand} ${p.category}`.toLowerCase().includes(needle))), [products, needle]);
  const allLow = products.filter((p) => Number(p.minStock || 0) > 0 && Number(p.stock || 0) <= Number(p.minStock || 0)).length;
  const pickMatches = useMemo(() => { const n = pq.trim().toLowerCase(); return n.length < 2 ? [] : products.filter((p) => `${p.name} ${p.code} ${p.brand}`.toLowerCase().includes(n)).slice(0, 8); }, [pq, products]);
  async function saveMin(p: any, v: number) {
    setBusy(true);
    try {
      const r = await fetch("/api/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "products", id: String(p._id), minStock: Math.max(0, Math.floor(v)) }) });
      if (!r.ok) throw new Error("Min Stock save nahi hua.");
      await load();
      notify(v > 0 ? `Min Stock ${v} set ho gaya.` : "Min Stock hata diya.", { kind: "success" });
    } catch (e: any) { notify(e?.message || "Save nahi hua.", { kind: "danger" }); } finally { setBusy(false); }
  }
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
  const copyBlocks = async (blocks: [string, any[]][]) => {
    const text = copyText(blocks);
    notify(await copyToClipboard(text) ? "Copy ho gaya — ab WhatsApp mein paste karein." : "Copy nahi hua.", { kind: "success" });
  };
  const addManual = () => {
    const n = name.trim(); if (!n) { notify("Cheez ka naam likhein (jaise VIVO Y100 BACK RING).", { kind: "warning" }); return; }
    const qty = Math.max(1, Math.floor(Number(mqty) || 1));
    const norm = (x: string) => x.toLowerCase().replace(/\s+/g, " ").trim();
    const prod = products.find((p) => norm(String(p.name || "")) === norm(n));
    void post([{ name: n.toUpperCase(), category: prod ? categoryOf(String(prod.name || ""), String(prod.category || "").trim()) : cat, qty, productId: prod ? String(prod._id) : undefined }]).then(() => { setName(""); setMqty("1"); });
  };

  return <main className={styles.page}>
    <div className={styles.top}>
      <Link href="/">← Dashboard</Link><h1>📒 Order Book</h1>
      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${tab === "urgent" ? styles.tabOn : ""}`} onClick={() => setTab("urgent")}>🔥 Urgent Order Book<span className={styles.badge}>{orders.length}</span></button>
        <button type="button" className={`${styles.tab} ${tab === "stock" ? styles.tabOn : ""}`} onClick={() => setTab("stock")}>📦 Out of Stock<span className={styles.badge}>{allOut}</span></button>
        <button type="button" className={`${styles.tab} ${tab === "low" ? styles.tabOn : ""}`} onClick={() => setTab("low")}>⚠ Kam Stock<span className={styles.badge}>{allLow}</span></button>
      </div>
    </div>
    <div className={styles.bar}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: naam / C1400 / customer…" style={{ minWidth: 240 }} />
      {tab === "urgent" && <>
        <input list="ob-products" value={name} onChange={(e) => setName(e.target.value)} placeholder="Naya order: product chunein ya likhein" style={{ minWidth: 260 }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = e.currentTarget.value.trim().toLowerCase(); /* list se item Enter se chunte waqt abhi adhoora naam hota hai: sirf poora naam milne par hi add karein */ if (v && products.some((p) => String(p.name || "").trim().toLowerCase() === v)) addManual(); } }} />
        <datalist id="ob-products">{products.slice(0, 3000).map((p) => <option key={p._id} value={String(p.name || "")} />)}</datalist>
        <input type="number" min="1" value={mqty} onChange={(e) => setMqty(e.target.value)} title="Quantity" placeholder="Qty" style={{ width: 70 }} />
        <SearchSelect value={cat} onChange={setCat} options={catList} />
        <button type="button" disabled={busy} onClick={addManual}>＋ Order Book mein daalein</button>
      </>}
      <button type="button" onClick={() => {
        const src = tab === "urgent" ? group(urgent.filter((o: any) => o.status !== "ORDERED"), (o: any) => o.category) : group(outOfStock, (p: any) => categoryOf(String(p.name || ""), String(p.category || "").trim()));
        if (!src.length) { notify("Copy karne ke liye kuch nahi.", { kind: "info" }); return; }
        void copyBlocks(src as [string, any[]][]);
      }}>📋 Copy All (WhatsApp)</button>
    </div>

    <div className={styles.body}>
      {tab === "urgent" && (urgent.length === 0 ? <div className={styles.empty}>Order Book khali hai. Repair mein jo cheez stock mein na ho wo yahan khud aa jati hai; purchase karte hi khud hat jati hai.</div>
        : group(urgent, (o) => o.category).map(([c, list]) => <section key={c} className={styles.group}><h3><span>{c}</span><span>{list.length} <button type="button" className={styles.btn} onClick={() => { const open = list.filter((o: any) => o.status !== "ORDERED"); if (open.length) void copyBlocks([[c, open]]); else notify("Is category mein sab Ordered hain.", { kind: "info" }); }}>📋 Copy</button></span></h3>
          {list.map((o) => <div key={o._id} className={styles.row}>
            <b>{o.name}{o.qty > 1 ? ` × ${o.qty}` : ""}<span className={styles.sub}>{o.token ? `${o.token} · ${o.customerName || o.model}` : "Manual order"}</span></b>
            <span className={`${styles.chip} ${o.status === "ORDERED" ? styles.ordered : styles.open}`}>{o.status === "ORDERED" ? "Ordered" : "Order karna hai"}</span>
            {o.status !== "ORDERED" && <button type="button" className={styles.btn} disabled={busy} onClick={() => void setStatus(o._id, "ORDERED")}>Order ho gaya</button>}
            <button type="button" className={styles.btn} disabled={busy} onClick={() => { if (window.confirm(`"${o.name}" Order Book se hata dein?`)) void setStatus(o._id, "CANCELLED"); }}>✖</button>
          </div>)}
        </section>))}

      {tab === "stock" && (outOfStock.length === 0 ? <div className={styles.empty}>Koi item out of stock nahi. 👍</div>
        : group(outOfStock, (p) => categoryOf(String(p.name || ""), String(p.category || "").trim())).map(([c, list]) => <section key={c} className={styles.group}><h3><span>{c}</span><span>{list.length} <button type="button" className={styles.btn} onClick={() => void copyBlocks([[c, list]])}>📋 Copy</button></span></h3>
          {list.map((p) => <div key={p._id} className={styles.row}>
            <b>{p.name}<span className={styles.sub}>{[p.code ?? p.sku, p.brand].filter(Boolean).join(" · ")}</span></b>
            <span className={`${styles.chip} ${styles.open}`}>Stock 0</span>
            <button type="button" className={styles.btn} disabled={busy || inBook(p)} onClick={() => void post([{ name: String(p.name || "").toUpperCase(), category: categoryOf(String(p.name || ""), String(p.category || "").trim()), productId: String(p._id), qty: 1 }])}>{inBook(p) ? "✔ Order Book mein" : "📒 Order Book"}</button>
          </div>)}
        </section>))}

      {tab === "low" && <>
        <section className={styles.group}><h3><span>⚙ Aham item ka Min Stock set karein</span></h3>
          <div className={styles.row}><input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Product search (kam az kam 2 harf): e.g. A15 panel" style={{ minWidth: 260 }} /></div>
          {pickMatches.map((p) => <div key={p._id} className={styles.row}>
            <b>{p.name}<span className={styles.sub}>Stock {Number(p.stock || 0)}{Number(p.minStock || 0) > 0 ? ` · Min ${p.minStock}` : ""}</span></b>
            <input type="number" min="0" style={{ width: 70 }} placeholder="Min" value={minDraft[String(p._id)] ?? String(p.minStock || "")} onChange={(e) => setMinDraft((m) => ({ ...m, [String(p._id)]: e.target.value }))} />
            <button type="button" className={styles.btn} disabled={busy} onClick={() => void saveMin(p, Number(minDraft[String(p._id)] ?? p.minStock ?? 0) || 0)}>Min Stock save</button>
          </div>)}
        </section>
        {lowList.length === 0 ? <div className={styles.empty}>Koi aham item kam stock mein nahi. Upar se Min Stock set karein, jaise Oppo A15 panel = 3.</div>
          : group(lowList, (p) => categoryOf(String(p.name || ""), String(p.category || "").trim())).map(([c, list]) => <section key={c} className={styles.group}><h3><span>{c}</span><span>{list.length}</span></h3>
            {list.map((p) => { const id = String(p._id); const need = Math.max(1, Number(p.minStock || 0) - Number(p.stock || 0)); return <div key={id} className={styles.row}>
              <b>{p.name}<span className={styles.sub}>Stock {Number(p.stock || 0)} / Min {p.minStock}</span></b>
              <span className={`${styles.chip} ${styles.open}`}>Kam Stock</span>
              <input type="number" min="1" style={{ width: 70 }} value={qtyDraft[id] ?? String(need)} onChange={(e) => setQtyDraft((m) => ({ ...m, [id]: e.target.value }))} title="Kitna order karna hai" />
              <button type="button" className={styles.btn} disabled={busy || inBook(p)} onClick={() => void post([{ name: String(p.name || "").toUpperCase(), category: categoryOf(String(p.name || ""), String(p.category || "").trim()), productId: id, qty: Math.max(1, Math.floor(Number(qtyDraft[id] ?? need) || 1)) }])}>{inBook(p) ? "Order Book mein hai" : "Order lagao"}</button>
              <button type="button" className={styles.btn} disabled={busy} title="Min Stock hata dein" onClick={() => void saveMin(p, 0)}>✖</button>
            </div>; })}
          </section>)}
      </>}
    </div>
  </main>;
}
