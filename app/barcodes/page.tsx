"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import JsBarcode from "jsbarcode";

type Preset = { id: string; label: string; w: number; h: number; cols: number; rows: number };
// A4 (210x297mm), 5mm margin: chhoti se bari labels
const PRESETS: Preset[] = [
  { id: "xs", label: "Bohat chhota 38×20 mm — 70 labels / page", w: 38, h: 20, cols: 5, rows: 14 },
  { id: "s", label: "Chhota 50×25 mm — 44 labels / page", w: 50, h: 25, cols: 4, rows: 11 },
  { id: "m", label: "Medium 66×34 mm — 24 labels / page", w: 66, h: 34, cols: 3, rows: 8 },
  { id: "l", label: "Bara 100×50 mm — 10 labels / page", w: 100, h: 50, cols: 2, rows: 5 },
];

const codeOf = (p: any) => String(p.barcode || p.code || p.sku || "").trim();
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });

// CODE128 ke bars ka SVG markup (viewBox mein) — cache ke saath
const barCache = new Map<string, { inner: string; w: number; h: number } | null>();
function barSvg(value: string) {
  if (barCache.has(value)) return barCache.get(value)!;
  let out: { inner: string; w: number; h: number } | null = null;
  try {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(el, value, { format: "CODE128", width: 2, height: 60, displayValue: false, marginTop: 0, marginBottom: 0, marginLeft: 12, marginRight: 12, background: "#ffffff", lineColor: "#000000" });
    const w = parseFloat(el.getAttribute("width") || "0"), h = parseFloat(el.getAttribute("height") || "0");
    if (w && h) out = { inner: el.innerHTML, w, h };
  } catch { /* ghalat code */ }
  barCache.set(value, out);
  return out;
}
const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

// Poora label ek SVG (mm units) — print mein size hamesha exact
function LabelSvg({ w, h, name, code, price }: { w: number; h: number; name: string; code: string; price: string }) {
  const pad = 1.2, fs = Math.max(1.6, h * 0.115);
  const nameLines = name ? 1 : 0;
  const nameH = name ? fs * 1.3 * nameLines : 0, codeH = fs * 1.25;
  const barTop = 0.8 + nameH + 0.3, barH = Math.max(3, h - barTop - codeH - 0.8);
  const bar = barSvg(code);
  const maxChars = Math.max(8, Math.floor((w - pad * 2) / (fs * 0.56)));
  const nm = name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
  const html = (bar ? `<svg x="${pad}" y="${barTop}" width="${w - pad * 2}" height="${barH}" viewBox="0 0 ${bar.w} ${bar.h}" preserveAspectRatio="none"><rect width="${bar.w}" height="${bar.h}" fill="#fff"/>${bar.inner}</svg>` : "")
    + (name ? `<text x="${w / 2}" y="${0.8 + fs}" font-size="${fs}" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif" fill="#000">${esc(nm)}</text>` : "")
    + `<text x="${w / 2}" y="${h - 0.9}" font-size="${fs * 0.95}" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif" fill="#000">${esc(code + price)}</text>`;
  return <svg width={`${w}mm`} height={`${h}mm`} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: `<rect x="0.1" y="0.1" width="${w - 0.2}" height="${h - 0.2}" fill="#fff" stroke="#999" stroke-width="0.15" stroke-dasharray="1 0.8"/>` + html }} />;
}

export default function BarcodesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [preset, setPreset] = useState("s");
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(false);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [all, setAll] = useState(1);

  useEffect(() => { fetch("/api/data?collection=products&limit=20000").then((r) => r.json()).then((rows) => setProducts(Array.isArray(rows) ? rows : [])).catch(() => {}); }, []);

  const cats = useMemo(() => Array.from(new Set(products.map((p) => String(p.category || "").trim()).filter(Boolean))).sort(), [products]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter((p) => (!cat || String(p.category || "") === cat) && (!n || [p.name, p.model, p.brand, p.category, p.code, p.sku, p.barcode].some((v) => String(v ?? "").toLowerCase().includes(n))));
  }, [products, q, cat]);
  const noCode = list.filter((p) => !codeOf(p)).length;
  const pr = PRESETS.find((x) => x.id === preset) || PRESETS[1];

  const labels = useMemo(() => {
    const out: any[] = [];
    for (const p of products) {
      const c = copies[String(p._id)] || 0; if (!c || !codeOf(p)) continue;
      for (let i = 0; i < Math.min(c, 500); i++) out.push(p);
    }
    return out;
  }, [products, copies]);
  const perPage = pr.cols * pr.rows;
  const pages = Math.ceil(labels.length / perPage);

  const setOne = (id: string, v: number) => setCopies((o) => ({ ...o, [id]: Math.max(0, Math.min(500, Math.floor(v) || 0)) }));
  const selectShown = (n: number) => setCopies((o) => { const x = { ...o }; for (const p of list) if (codeOf(p)) x[String(p._id)] = n; return x; });

  return <main style={{ padding: 12, maxWidth: 1200, margin: "0 auto" }}>
    <style>{`
      .bcSheet{background:#fff;color:#000;margin:0 auto 14px;box-shadow:0 2px 10px rgba(0,0,0,.35);zoom:.55}
      .bcLabel{box-sizing:border-box;border:.15mm dashed #999;overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:.8mm 1.2mm;background:#fff;color:#000;font-family:Arial,sans-serif}
      .bcName{font-weight:700;line-height:1.05;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-align:center}
      .bcCode{text-align:center;font-weight:700;line-height:1;letter-spacing:.2mm}
      @media print{
        @page{size:A4;margin:5mm}
        body *{visibility:hidden !important}
        .bcPrintArea,.bcPrintArea *{visibility:visible !important}
        .bcPrintArea{position:absolute;left:0;top:0}
        .bcSheet{zoom:1;box-shadow:none;margin:0;break-after:page;page-break-after:always}
        .bcSheet:last-child{break-after:auto;page-break-after:auto}
      }
    `}</style>
    <div className="bcNoPrint">
      <p><Link href="/">← Dashboard</Link></p>
      <h1>🏷 Barcode Labels (A4 par print)</h1>
      <p style={{ fontSize: 13 }}>Products chunein, kitne labels chahiye likhein, size chunein, phir Print dabayein. Print mein <b>Scale: 100% / Actual size</b> rakhein (Fit to page nahi). Kaat kar product par laga lein.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
        <input className="input" placeholder="Product search" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 180 }} />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Sab categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select className="input" value={preset} onChange={(e) => setPreset(e.target.value)}>{PRESETS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        <label><input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} /> Naam</label>
        <label><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Price</label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "8px 0" }}>
        <label>Har product ke labels: <input className="input" type="number" min={1} max={500} value={all} onChange={(e) => setAll(Math.max(1, Number(e.target.value) || 1))} style={{ width: 70 }} /></label>
        <button type="button" className="btn" onClick={() => selectShown(all)}>✔ Jo list mein hain sab chunein ({list.filter((p) => codeOf(p)).length})</button>
        <button type="button" className="btn" onClick={() => setCopies({})}>✕ Sab hatayein</button>
        <button type="button" className="btn green" disabled={!labels.length} onClick={() => window.print()}>🖨 Print ({labels.length} labels, {pages} page)</button>
      </div>
      {noCode > 0 && <p style={{ fontSize: 12, color: "#fbbf24" }}>⚠ {noCode} product(s) ka barcode/code nahi likha, un ke label nahi ban sakte. Product page mein code likh dein.</p>}
      <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid rgba(128,128,128,.4)", borderRadius: 8 }}>
        <table style={{ width: "100%", fontSize: 13 }}><thead><tr><th align="left">Code</th><th align="left">Product</th><th align="left">Category</th><th>Labels</th></tr></thead>
          <tbody>{list.slice(0, 400).map((p) => { const id = String(p._id); const c = codeOf(p); return <tr key={id} style={c ? undefined : { opacity: .5 }}>
            <td>{c || "—"}</td><td>{p.name || p.model}</td><td>{p.category}</td>
            <td align="center"><input className="input" type="number" min={0} max={500} disabled={!c} value={copies[id] || ""} placeholder="0" onChange={(e) => setOne(id, Number(e.target.value))} style={{ width: 70 }} /></td></tr>; })}</tbody></table>
        {list.length > 400 && <p style={{ padding: 6, fontSize: 12 }}>Pehle 400 dikha rahe hain, search se chhota karein.</p>}
      </div>
    </div>

    <div className="bcPrintArea" style={{ marginTop: 14 }}>
      {Array.from({ length: pages }).map((_, pg) => <div key={pg} className="bcSheet" style={{ width: `${pr.cols * pr.w}mm`, height: `${pr.rows * pr.h}mm`, display: "grid", gridTemplateColumns: `repeat(${pr.cols}, ${pr.w}mm)`, gridAutoRows: `${pr.h}mm` }}>
        {labels.slice(pg * perPage, (pg + 1) * perPage).map((p, i) => {
          return <LabelSvg key={i} w={pr.w} h={pr.h} name={showName ? String(p.name || p.model || "") : ""} code={codeOf(p)} price={showPrice ? `  Rs.${money(p.price)}` : ""} />;
        })}
      </div>)}
    </div>
  </main>;
}
