"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { id: string; name: string; code: string; stock: number };

/** Dashboard par: minus stock wale products (zero stock par sale hue) — purchase add karte hi khud hat jate hain. */
export default function NegativeStockPanel({ show }: { show: boolean }) {
  const [list, setList] = useState<Item[]>([]);
  useEffect(() => {
    if (!show) return;
    let alive = true;
    const load = () => fetch("/api/stock/negative", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d?.items) setList(d.items); }).catch(() => {});
    void load();
    const id = window.setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; window.clearInterval(id); };
  }, [show]);
  if (!show || !list.length) return null;
  return <section role="alert" style={{ background: "#7f1d1d", color: "#fff", borderRadius: 12, padding: "12px 14px", margin: "10px 0" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <b>⚠ {list.length} product(s) sold with zero stock — add a Purchase to clear the negative stock</b>
      <Link href="/purchases" style={{ background: "#fff", color: "#7f1d1d", padding: "6px 12px", borderRadius: 8, fontWeight: 700 }}>🧾 New Purchase</Link>
    </div>
    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
      {list.slice(0, 30).map((x) => <span key={x.id} style={{ background: "rgba(255,255,255,.16)", borderRadius: 999, padding: "3px 10px", fontSize: 13 }}>{x.name} <b>({x.stock})</b></span>)}
      {list.length > 30 && <span>… +{list.length - 30} more</span>}
    </div>
  </section>;
}
