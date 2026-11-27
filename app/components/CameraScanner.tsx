"use client";

import { useEffect, useRef, useState } from "react";

/** Laptop/phone camera se barcode scan. Har naya code onScan ko milta hai; window band hone tak chalta rahta hai. */
export default function CameraScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const last = useRef({ code: "", at: 0 });
  const cb = useRef(onScan); cb.current = onScan;
  const [err, setErr] = useState("");
  const [shown, setShown] = useState("");

  useEffect(() => {
    let stop: (() => void) | null = null; let dead = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Ye browser camera support nahi karta (https zaroori hai).");
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const ctl = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (res) => {
          if (!res) return;
          const code = res.getText().trim(); const now = Date.now();
          if (!code || (code === last.current.code && now - last.current.at < 2500)) return;
          last.current = { code, at: now };
          setShown(code); cb.current(code);
          try { const A = (window as any).AudioContext || (window as any).webkitAudioContext; const c = new A(); const o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 1100; o.start(); o.stop(c.currentTime + 0.12); setTimeout(() => c.close?.(), 400); } catch {}
        });
        if (dead) ctl.stop(); else stop = () => ctl.stop();
      } catch (e: any) {
        const n = String(e?.name || "");
        setErr(n === "NotAllowedError" ? "Camera ki ijazat nahi mili. Browser ke address bar mein camera allow karein." : n === "NotFoundError" ? "Is computer par camera nahi mila." : (e?.message || "Camera shuru nahi hua."));
      }
    })();
    return () => { dead = true; stop?.(); };
  }, []);

  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.75)", display: "grid", placeItems: "center", padding: 12 }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: "#0b1f33", color: "#fff", borderRadius: 14, padding: 12, width: "min(92vw, 520px)", border: "2px solid #38bdf8" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <b>📷 Camera se barcode scan</b>
        <button type="button" onClick={onClose} style={{ background: "#38bdf8", color: "#06263f", border: 0, borderRadius: 8, padding: "6px 12px", fontWeight: 800 }}>✕ Band</button>
      </div>
      {err ? <p style={{ color: "#fca5a5" }}>{err}</p> : <>
        <div style={{ position: "relative" }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", borderRadius: 10, background: "#000", aspectRatio: "4/3", objectFit: "cover" }} />
          <div style={{ position: "absolute", left: "10%", right: "10%", top: "42%", height: "16%", border: "2px solid #38bdf8", borderRadius: 8, pointerEvents: "none" }} />
        </div>
        <p style={{ fontSize: 13, margin: "8px 0 0" }}>Barcode ko lal/neeli patti ke andar, saaf roshni mein, 10-20 cm door rakhein.</p>
        {shown && <p style={{ margin: "4px 0 0", fontWeight: 800 }}>Aakhri scan: {shown}</p>}
      </>}
    </div>
  </div>;
}
