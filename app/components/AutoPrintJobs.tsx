"use client";

import { useEffect, useRef, useState } from "react";

type Job = { id: string; repairId: string; tokenNo: string; by: string };

function beep() {
  try {
    const A = (window as any).AudioContext || (window as any).webkitAudioContext; if (!A) return;
    const c = new A(); const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.15;
    o.start(); o.stop(c.currentTime + 0.25); setTimeout(() => c.close?.(), 600);
  } catch { /* sound best effort */ }
}

/** Owner ke PC par (Settings > Auto Print on ho to): staff ne repair slip banayi to notification aata hai, ek click se print khulta hai. */
export default function AutoPrintJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try { if (localStorage.getItem("na-autoprint") !== "1") { if (alive) setJobs([]); return; } } catch { return; }
      try {
        const r = await fetch("/api/print-jobs", { cache: "no-store" });
        if (!r.ok || !alive) return;
        const list: Job[] = await r.json();
        if (!Array.isArray(list)) return;
        if (list.some((j) => !seen.current.has(j.id))) beep();
        list.forEach((j) => seen.current.add(j.id));
        setJobs(list);
      } catch { /* agli bar dobara */ }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 8000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  async function act(j: Job, doPrint: boolean) {
    // Pehle claim: sirf ek PC print kare. Print dabane par naya tab (user click se, isliye browser rokta nahi) ?print=1 se khud print dialog kholta hai.
    let ok = false;
    try { const c = await fetch("/api/print-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: j.id }) }); ok = c.ok && (await c.json()).claimed; } catch {}
    setJobs((old) => old.filter((x) => x.id !== j.id));
    if (doPrint) { if (ok) window.open(`/repairs/${j.repairId}?print=1`, "_blank"); else window.alert("Ye slip pehle hi print / hata di gayi."); }
  }

  if (!jobs.length) return null;
  return <div role="alert" style={{ position: "fixed", right: 12, bottom: 56, zIndex: 9999, display: "grid", gap: 8, maxWidth: 340 }}>
    {jobs.map((j) => <div key={j.id} style={{ background: "#0b3b66", color: "#fff", border: "2px solid #38bdf8", borderRadius: 12, padding: "10px 12px", boxShadow: "0 6px 24px rgba(0,0,0,.45)" }}>
      <div style={{ fontWeight: 800 }}>🖨 Nayi repair slip: {j.tokenNo}</div>
      <div style={{ fontSize: 13, opacity: .9 }}>{j.by} ne banayi</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => void act(j, true)} style={{ flex: 1, background: "#38bdf8", color: "#06263f", border: 0, borderRadius: 8, padding: "8px", fontWeight: 800 }}>🖨 Print</button>
        <button type="button" onClick={() => void act(j, false)} style={{ background: "transparent", color: "#fff", border: "1px solid #7aa7c7", borderRadius: 8, padding: "8px 12px" }}>✕</button>
      </div>
    </div>)}
  </div>;
}
