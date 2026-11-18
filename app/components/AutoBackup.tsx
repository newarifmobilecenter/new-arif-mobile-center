"use client";

import { useEffect, useState } from "react";
import { allow, due, isOn, runNow, status, supported } from "@/lib/autoBackup";

/** Har page par chalta hai (sirf Admin): har ghante backup ko folder mein update karta hai. */
export default function AutoBackup() {
  const [admin, setAdmin] = useState(false);
  const [need, setNeed] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json()).then((x) => { if (alive && x?.role === "ADMIN") setAdmin(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!admin || !supported()) return;
    const tick = async () => {
      if (!isOn()) { setNeed(false); return; }
      const s = await status();
      if (s.permission !== "granted") { setNeed(true); return; }
      setNeed(false);
      if (due()) await runNow();
    };
    void tick();
    const id = window.setInterval(tick, 60000);
    const on = () => void tick();
    window.addEventListener("autobackup:changed", on);
    return () => { window.clearInterval(id); window.removeEventListener("autobackup:changed", on); };
  }, [admin]);

  if (!admin || !need) return null;
  return <button type="button" className="no-print" onClick={async () => { try { const r = await allow(); if (r.ok) { setNeed(false); setMsg(""); } else setMsg(r.error || ""); } catch (e: any) { setMsg(e?.message || "Nahi hua"); } }}
    style={{ position: "fixed", left: 10, bottom: 10, zIndex: 60, padding: "8px 12px", borderRadius: 10, border: "1px solid #f59e0b", background: "#fef3c7", color: "#92400e", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
    ⚠ Auto Backup ruka hai — yahan dabayein{msg ? ` (${msg})` : ""}
  </button>;
}
