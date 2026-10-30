"use client";

import { useEffect, useState } from "react";
import styles from "./notebook.module.css";
import { suggestParts } from "@/lib/partMatch";
import { notify } from "@/lib/toast";

type Part = { productId: string; name: string; qty: number };

// Parts promised to one repair: shows reserved / fitted state and lets staff add or remove parts.
export default function RepairParts({ repair, onSaved }: { repair: any; onSaved: () => void | Promise<void> }) {
  const [products, setProducts] = useState<any[]>([]);
  const [holds, setHolds] = useState<Record<string, any[]>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const parts: Part[] = Array.isArray(repair.parts) ? repair.parts : [];
  const billed = Boolean(repair.billedSaleId);
  const locked = repair.status === "READY" || repair.status === "DELIVERED";
  const editable = !billed && ["RECEIVED", "IN_REPAIR", "READY"].includes(repair.status);

  useEffect(() => {
    fetch("/api/data?collection=products&limit=5000").then((r) => r.json()).then((d) => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`/api/reservations?exclude=${encodeURIComponent(repair._id)}`).then((r) => r.json()).then((d) => setHolds(d && !d.error ? d : {})).catch(() => {});
  }, [repair._id, repair.parts]);

  const stockOf = (id: string) => Number(products.find((p) => String(p._id) === id)?.stock || 0);
  const othersOf = (id: string) => (holds[id] || []).reduce((n, h) => n + Number(h.qty || 0), 0);
  const have = new Set(parts.map((p) => p.productId));
  const suggestions = suggestParts(products, repair.model || "", repair.fault || "").filter((p) => !have.has(String(p._id)));
  const matches = q.trim().length >= 2 ? products.filter((p) => !have.has(String(p._id)) && `${p.name || ""} ${p.code || ""} ${p.barcode || ""}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];

  async function save(next: Part[]) {
    setBusy(true);
    try {
      const r = await fetch("/api/repairs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: repair._id, parts: next }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Parts save nahi hue.");
      await onSaved();
    } catch (e: any) { notify(e?.message || "Parts save nahi hue.", { kind: "danger" }); } finally { setBusy(false); }
  }
  function add(p: any) {
    const av = Number(p.stock || 0) - othersOf(String(p._id));
    if (av < 1) notify(`${p.name}: available 0 hai${(holds[String(p._id)] || []).length ? `, ${(holds[String(p._id)] || []).map((h) => h.token).join(", ")} ke liye reserved` : ""}.`, { title: "Part available nahi", kind: "warning" });
    setQ("");
    void save([...parts, { productId: String(p._id), name: String(p.name || ""), qty: 1 }]);
  }

  return <section className={`${styles.panel} ${styles.noPrint}`}>
    <h2>Parts / Stock</h2>
    {billed && <p style={{ color: "#4ade80" }}>✔ Bill ho chuki hai{repair.billedInvoiceNo ? `: ${repair.billedInvoiceNo}` : ""} — parts stock se kat chuke hain.</p>}
    {!billed && locked && <p style={{ color: "#fbbf24" }}>🔒 Parts is mobile par lag chuke hain ({repair.status}). New Sale mein bill karte hi stock se katenge; tab tak koi aur sale nahi kar sakta.</p>}
    {!billed && !locked && parts.length > 0 && <p className={styles.muted}>Parts reserve hain. Mark Ready karte hi ye lock ho jayenge.</p>}
    {parts.length === 0 && <p className={styles.muted}>Is repair ke liye koi part reserve nahi.</p>}
    {parts.map((p) => { const left = stockOf(p.productId) - othersOf(p.productId); return <div key={p.productId} style={{ display: "flex", gap: 10, alignItems: "center", padding: "4px 0" }}>
      <b>{p.name}</b><span className={styles.muted}>× {p.qty}</span>
      <span style={{ color: left >= p.qty ? "#4ade80" : "#f87171" }}>Stock {stockOf(p.productId)}{othersOf(p.productId) ? ` (doosri repairs: ${othersOf(p.productId)})` : ""}</span>
      {editable && <button type="button" className={styles.buttonSecondary} disabled={busy} onClick={() => void save(parts.filter((x) => x.productId !== p.productId))}>Hatayen</button>}
    </div>; })}
    {editable && suggestions.length > 0 && <div style={{ marginTop: 6 }}><span className={styles.muted}>Suggestions: </span>{suggestions.map((p) => <button type="button" key={p._id} className={styles.buttonSecondary} style={{ margin: "2px 4px 2px 0" }} disabled={busy} onClick={() => add(p)}>＋ {p.name} ({Number(p.stock || 0) - othersOf(String(p._id))})</button>)}</div>}
    {editable && <div style={{ marginTop: 6 }}><input data-no-nav="1" placeholder="Part dhoondein (naam / code)…" value={q} onChange={(e) => setQ(e.target.value)} />
      {matches.map((p) => <button type="button" key={p._id} className={styles.buttonSecondary} style={{ display: "block", margin: "2px 0" }} onClick={() => add(p)}>＋ {p.name} · Stock {Number(p.stock || 0)}</button>)}</div>}
  </section>;
}
