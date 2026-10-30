"use client";

import { useEffect, useRef, useState } from "react";
import type { ToastDetail, ToastKind } from "@/lib/toast";

type Toast = { id: number; message: string; title: string; kind: ToastKind };
const ICON: Record<ToastKind, string> = { warning: "⚠", danger: "⛔", success: "✔", info: "ℹ" };
const TITLE: Record<ToastKind, string> = { warning: "Warning", danger: "Dhyan dein", success: "Done", info: "Info" };
const LIFE = 4500;

// Guess the look of a plain alert("...") message.
function guess(message: string): ToastKind {
  const m = message.toLowerCase();
  if (/stock zero|zero hai|nahi (hua|mila|hui|ho)|failed|error|cannot|invalid|galat/.test(m)) return "danger";
  if (/success|save ho gaya|ho gaya|updated|saved|done/.test(m)) return "success";
  if (/zaroor|select karein|likhein|chunein|please|required|pehle/.test(m)) return "warning";
  return "info";
}

export default function Toaster() {
  const [list, setList] = useState<Toast[]>([]);
  const seq = useRef(1);

  useEffect(() => {
    const push = (d: ToastDetail) => {
      const kind = d.kind || guess(d.message);
      const id = seq.current++;
      setList(cur => [...cur.slice(-2), { id, message: d.message, title: d.title || TITLE[kind], kind }]);
      window.setTimeout(() => setList(cur => cur.filter(t => t.id !== id)), LIFE);
    };
    const onToast = (e: Event) => push((e as CustomEvent<ToastDetail>).detail);
    const nativeAlert = window.alert;
    window.alert = (msg?: unknown) => push({ message: String(msg ?? "") });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setList([]); };
    window.addEventListener("na-toast", onToast);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("na-toast", onToast); window.removeEventListener("keydown", onKey); window.alert = nativeAlert; };
  }, []);

  if (!list.length) return null;
  return <div className="toastStack no-print" role="alert" aria-live="assertive">
    {list.map(t => <div key={t.id} className={`toastCard toast_${t.kind}`} onClick={() => setList(cur => cur.filter(x => x.id !== t.id))}>
      <span className="toastIcon" aria-hidden="true">{ICON[t.kind]}</span>
      <span className="toastBody"><b>{t.title}</b><span>{t.message}</span></span>
      <button type="button" className="toastClose" aria-label="Close">×</button>
      <i className="toastTimer" style={{ animationDuration: `${LIFE}ms` }} />
    </div>)}
  </div>;
}
