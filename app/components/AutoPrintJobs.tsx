"use client";

import { useEffect } from "react";

/** Owner ke PC par (Settings mein Auto Print on ho to): staff ki banayi repair slip ka print dialog khud khol deta hai. */
export default function AutoPrintJobs() {
  useEffect(() => {
    let alive = true, busy = false;
    const tick = async () => {
      if (busy || !alive) return;
      try { if (localStorage.getItem("na-autoprint") !== "1") return; } catch { return; }
      if (document.visibilityState === "hidden") return;
      busy = true;
      try {
        const r = await fetch("/api/print-jobs", { cache: "no-store" });
        if (!r.ok) return;
        const jobs = await r.json();
        for (const j of Array.isArray(jobs) ? jobs : []) {
          const c = await fetch("/api/print-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: j.id }) });
          const ok = c.ok && (await c.json()).claimed;
          if (!ok || !alive) continue;
          // Wahi page jo "Receive Mobile" ke baad khulta hai: ?print=1 par customer copy khud print karta hai.
          const f = document.createElement("iframe");
          f.src = `/notebook/${j.repairId}?print=1`;
          f.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;height:1100px;border:0";
          document.body.appendChild(f);
          window.setTimeout(() => f.remove(), 90000);
          await new Promise((res) => window.setTimeout(res, 6000)); // agle job se pehle dialog ko jagah
        }
      } catch { /* best effort */ } finally { busy = false; }
    };
    const id = window.setInterval(() => void tick(), 8000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);
  return null;
}
