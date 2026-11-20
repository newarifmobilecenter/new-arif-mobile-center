"use client";

import { useEffect } from "react";
import { notify } from "@/lib/toast";
import { pageAllowed } from "@/lib/perms";

const KEY = "na-negstock-remind";
const EVERY = 2 * 60 * 60 * 1000; // har 2 ghantay

/** Har page par: jo products stock zero par sale hue (stock minus) un ki purchase ki yaad-dahani, har 2 ghantay. */
export default function NegativeStockReminder() {
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        let last = 0; try { last = Number(localStorage.getItem(KEY) || 0); } catch {}
        if (Date.now() - last < EVERY) return;
        if (document.visibilityState === "hidden") return;
        const sr = await fetch("/api/auth/session", { cache: "no-store" });
        const sess = sr.ok ? await sr.json() : null;
        if (!alive || !sess?.authenticated) return;
        if (!pageAllowed({ r: sess.role, p: Array.isArray(sess.perms) ? sess.perms : undefined }, "/purchases")) return;
        const r = await fetch("/api/stock/negative", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!alive || !d?.count) return;
        try { localStorage.setItem(KEY, String(Date.now())); } catch {}
        const names = (d.items as any[]).slice(0, 4).map((x) => `${x.name} (${x.stock})`).join(", ");
        notify(`${d.count} product(s) were sold with zero stock. Please add a Purchase so the stock is corrected: ${names}${d.count > 4 ? " …" : ""}`, { title: "⚠ Negative stock — add Purchase", kind: "danger" });
      } catch { /* reminder best effort */ }
    };
    const t = window.setTimeout(() => void check(), 4000);
    const id = window.setInterval(() => void check(), 10 * 60 * 1000);
    return () => { alive = false; window.clearTimeout(t); window.clearInterval(id); };
  }, []);
  return null;
}
