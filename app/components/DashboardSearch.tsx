"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Hit = { type: string; title: string; sub: string; href: string };

export default function DashboardSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setError(""); setBusy(false); return; }
    setBusy(true);
    const ctl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal, cache: "no-store" });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Search nahi hui.");
        setHits(Array.isArray(data) ? data : []); setError("");
      } catch (e: any) { if (e?.name !== "AbortError") { setError(e?.message || "Search nahi hui."); setHits([]); } }
      finally { if (!ctl.signal.aborted) setBusy(false); }
    }, 250);
    return () => { window.clearTimeout(t); ctl.abort(); };
  }, [q]);

  const groups = hits.reduce<Record<string, Hit[]>>((m, h) => { (m[h.type] ||= []).push(h); return m; }, {});
  const active = q.trim().length >= 2;

  return <section className="dashSearch" aria-label="Search">
    <input ref={ref} className="dashSearchInput" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search: product, customer, phone, invoice, repair slip / token, IMEI, voucher…   ( / dabayen )" autoComplete="off" />
    {active && <div className="dashSearchResults">
      {busy && <p className="dashSearchNote">Search ho rahi hai…</p>}
      {error && <p className="dashSearchNote" role="alert">{error}</p>}
      {!busy && !error && !hits.length && <p className="dashSearchNote">Kuch nahi mila.</p>}
      {Object.entries(groups).map(([type, list]) => <div key={type} className="dashSearchGroup">
        <h3>{type} ({list.length})</h3>
        {list.map((h, i) => <Link key={`${h.href}-${i}`} href={h.href} className="dashSearchItem"><b>{h.title}</b><span>{h.sub}</span></Link>)}
      </div>)}
    </div>}
  </section>;
}
