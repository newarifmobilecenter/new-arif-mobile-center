"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export type SSOption = string | { value: string; label: string };

/** Select jaisa dikhta hai, magar khulne par search box bhi hota hai (type karke filter, ya list se click). */
export default function SearchSelect({ value, onChange, options, emptyLabel, className, style, disabled, id }: {
  value: string; onChange: (v: string) => void; options: SSOption[]; emptyLabel?: string; className?: string; style?: CSSProperties; disabled?: boolean; id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  const list = useMemo(() => {
    const all = options.map((o) => typeof o === "string" ? { value: o, label: o } : o);
    return emptyLabel !== undefined ? [{ value: "", label: emptyLabel }, ...all] : all;
  }, [options, emptyLabel]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? list.filter((o) => o.label.toLowerCase().includes(n)) : list;
  }, [list, q]);
  const current = list.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  useEffect(() => { if (open) { setQ(""); setHi(0); setTimeout(() => inp.current?.focus(), 0); } }, [open]);
  useEffect(() => { setHi(0); }, [q]);

  const pick = (v: string) => { onChange(v); setOpen(false); };
  return <div ref={box} style={{ position: "relative", display: "inline-block", minWidth: 0, ...(style?.flex ? { flex: style.flex } : {}), width: style?.width }}>
    <select id={id} className={className} disabled={disabled} style={{ ...style, width: "100%" }} value={value} onChange={() => {}}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) setOpen((o) => !o); }}
      onKeyDown={(e) => { if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); setOpen(true); } }}>
      <option value={value}>{current?.label ?? (value || emptyLabel || "")}</option>
    </select>
    {open && <div style={{ position: "absolute", zIndex: 1000, top: "100%", left: 0, minWidth: "100%", width: "max-content", maxWidth: 420, marginTop: 2, background: "#0b1430", color: "#e5ecff", border: "1px solid #3b82f6", borderRadius: 8, boxShadow: "0 12px 30px rgba(0,0,0,.55)" }}>
      <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search…" autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); }
          else if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(shown.length - 1, h + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === "Enter") { e.preventDefault(); if (shown[hi]) pick(shown[hi].value); }
        }}
        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", background: "#050a1c", color: "#e5ecff", border: 0, borderBottom: "1px solid #1e2a4a", borderRadius: "8px 8px 0 0", outline: "none", font: "inherit" }} />
      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {shown.length === 0 && <div style={{ padding: "8px 10px", opacity: .7 }}>Kuch nahi mila</div>}
        {shown.map((o, i) => <div key={o.value + i} onMouseDown={(e) => { e.preventDefault(); pick(o.value); }} onMouseEnter={() => setHi(i)}
          style={{ padding: "7px 10px", cursor: "pointer", background: i === hi ? "#1d4ed8" : o.value === value ? "#13224a" : "transparent", whiteSpace: "normal" }}>{o.label}</div>)}
      </div>
    </div>}
  </div>;
}
