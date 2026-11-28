"use client";
// TEMP-RATELIST: rate list import (CSV) / saaf karna. Kaam khatam hone par ye file hata dein.
import { useEffect, useState } from "react";

function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((x) => x.trim())) out.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some((x) => x.trim())) out.push(row);
  return out;
}

export default function RateListImport() {
  const [count, setCount] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const refresh = () => fetch("/api/rate-list?q=").then((r) => r.json()).then((d) => setCount(Number(d.count ?? 0))).catch(() => {});
  useEffect(() => { void refresh(); }, []);
  async function onFile(f: File | undefined) {
    if (!f) return;
    setMsg("Import ho raha hai...");
    const rows = parseCsv((await f.text()).replace(/^﻿/, "")).slice(1).map((c) => ({ company: c[0], model: c[1], part: c[2], cost: Number(String(c[3] ?? "").replace(/,/g, "")) }));
    const r = await fetch("/api/rate-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows, replace: true }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? `✔ ${d.imported} lines import ho gayin.` : `❌ ${d.error || "Import nahi hua."}`); void refresh();
  }
  async function clear() {
    if (!window.confirm("Poori rate list hata dein? (Products par koi asar nahi hoga)")) return;
    const r = await fetch("/api/rate-list", { method: "DELETE" }); setMsg(r.ok ? "Rate list saaf ho gayi." : "Saaf nahi hui."); void refresh();
  }
  return <div className="panel"><h2>💡 Rate List (temporary)</h2>
    <p style={{ fontSize: 13 }}>Naya product likhte waqt naam ke neeche purani Excel list ki cost nazar aati hai. File CSV honi chahiye: <b>Company, Model, Part, Cost</b> (pehli line heading). Dobara import karein to purani list badal jati hai. Sirf Admin ko nazar aati hai.</p>
    <p>Abhi list mein: <b>{count ?? "…"}</b> lines</p>
    <input type="file" accept=".csv,text/csv" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
    <div style={{ marginTop: 10 }}><button type="button" className="btn" onClick={() => void clear()}>🗑 Rate list saaf karein</button></div>
    {msg && <p role="status" style={{ fontWeight: 700 }}>{msg}</p>}
  </div>;
}
