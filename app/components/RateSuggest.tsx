"use client";
// TEMP-RATELIST: product name likhte waqt purani rate list ki matching lines. Kaam khatam hone par ye file hata dein.
import { useEffect, useState } from "react";

export type RateRow = { company: string; model: string; part: string; cost: number };

export default function RateSuggest({ query, onPick }: { query: string; onPick: (r: RateRow) => void }) {
  const [rows, setRows] = useState<RateRow[]>([]);
  const [off, setOff] = useState(false);
  useEffect(() => { setOff(false); }, [query]);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setRows([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/rate-list?q=${encodeURIComponent(q)}`).then((r) => r.ok ? r.json() : { rows: [] }).then((d) => setRows(Array.isArray(d.rows) ? d.rows : [])).catch(() => setRows([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);
  if (off || !rows.length) return null;
  return <div style={{ border: "1px solid rgba(128,128,128,.5)", borderRadius: 8, padding: 6, margin: "4px 0", maxHeight: 220, overflow: "auto", fontSize: 13 }}>
    <div style={{ display: "flex", justifyContent: "space-between", opacity: .8, marginBottom: 4 }}><b>💡 Purani rate list</b><button type="button" onClick={() => setOff(true)} style={{ all: "unset", cursor: "pointer" }}>✕</button></div>
    {rows.map((r, i) => <button key={i} type="button" onClick={() => onPick(r)} style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 8, textAlign: "left", padding: "5px 6px", cursor: "pointer", background: "transparent", color: "inherit", border: 0, borderTop: i ? "1px solid rgba(128,128,128,.25)" : 0 }}>
      <span>{r.company} {r.model} <b>{r.part}</b></span><b>{r.cost}</b>
    </button>)}
  </div>;
}
