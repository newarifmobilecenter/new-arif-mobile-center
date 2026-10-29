"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AUTO_RULES_TYPE, AutoRule, DEFAULT_RULES } from "@/lib/autoRules";
import { THEMES, getTheme, setTheme } from "@/lib/themes";

const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : []));
const blankRule = (): AutoRule => ({ id: `r-${Date.now()}`, keywords: "", category: "", brand: "", brandType: "Parts", productGroup: "Mobile Parts", itemType: "Part" });
const box = { width: "100%", padding: "6px 8px" } as const;

export default function Settings() {
  const [s, setS] = useState<any>({ shopName: "NEW ARIF MOBILE CENTER", address: "", phone: "", defaultWarranty: 7, currency: "PKR" });
  const [msg, setMsg] = useState("");
  const [theme, setThemeState] = useState("blue");
  const [rules, setRules] = useState<AutoRule[]>(DEFAULT_RULES);
  const [ruleId, setRuleId] = useState("");
  const [ruleMsg, setRuleMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cats, setCats] = useState<string[]>([]);

  useEffect(() => {
    setThemeState(getTheme());
    fetch("/api/data?collection=settings&limit=10").then(arr).then(x => { if (x[0]) setS(x[0]); }).catch(() => {});
    fetch("/api/data?collection=productOptions&limit=5000").then(arr).then(o => {
      const saved = o.find((x: any) => x.type === AUTO_RULES_TYPE);
      if (saved) { setRuleId(String(saved._id)); if (Array.isArray(saved.rules) && saved.rules.length) setRules(saved.rules); }
      setCats(Array.from(new Set(o.filter((x: any) => x.type === "category").map((x: any) => String(x.name || "")))).filter(Boolean) as string[]);
    }).catch(() => {});
  }, []);

  async function save() {
    const all = await fetch("/api/data?collection=settings&limit=10").then(arr);
    const body = { collection: "settings", ...s };
    if (all[0]) await fetch("/api/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: all[0]._id }) });
    else await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMsg("Settings save ho gayi.");
  }

  async function saveRules(list: AutoRule[]) {
    try {
      const clean = list.filter(r => r.keywords.trim());
      const payload = { collection: "productOptions", type: AUTO_RULES_TYPE, name: "Auto select rules", rules: clean };
      const r = await fetch("/api/data", { method: ruleId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ruleId ? { ...payload, id: ruleId } : payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua");
      if (!ruleId && d._id) setRuleId(String(d._id));
      setRules(clean.length ? clean : DEFAULT_RULES);
      setRuleMsg({ text: "Auto-select rules save ho gaye. Add Product page refresh karein.", ok: true });
    } catch (e: any) { setRuleMsg({ text: e?.message || "Rules save nahi hue.", ok: false }); }
  }

  const upd = (id: string, patch: Partial<AutoRule>) => setRules(cur => cur.map(r => r.id === id ? { ...r, ...patch } : r));
  const move = (i: number, d: number) => setRules(cur => { const j = i + d; if (j < 0 || j >= cur.length) return cur; const n = [...cur]; [n[i], n[j]] = [n[j], n[i]]; return n; });

  return <main className="shell">
    <div className="nav"><Link href="/">← Dashboard</Link><Link href="/backup">Backup</Link></div>
    <h1>⚙️ Settings</h1>

    <div className="panel"><h2>🎨 Theme</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {THEMES.map(t => <button key={t.id} type="button" onClick={() => { setTheme(t.id); setThemeState(t.id); }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: theme === t.id ? "2px solid #22d3ee" : "1px solid #334155", background: "#0f172a", color: "#e5e7eb" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: t.swatch, border: "1px solid #fff4" }} />{t.label}{theme === t.id ? " ✓" : ""}
        </button>)}
      </div>
      <p style={{ color: "#94a3b8", fontSize: 13 }}>Theme sirf is computer/browser par lagti hai. Print par asar nahi hota.</p>
    </div>

    <div className="panel"><h2>🏷️ Auto Select Rules (Add Product)</h2>
      <p style={{ color: "#94a3b8", fontSize: 13 }}>Product Name mein jo lafz likhein, us se Category waghera khud select hon. Keywords comma (,) se alag karein. Do lafz ek saath chahiye hon to + lagayein, jaise <b>panel+org</b>. Upar wali rule pehle check hoti hai. Khali (blank) field ko chhua nahi jata. Brand khali ho to naam se (Samsung, Vivo…) khud pehchana jata hai.</p>
      <div style={{ overflow: "auto" }}>
        <table className="table"><thead><tr><th>#</th><th>Keywords</th><th>Category</th><th>Brand (optional)</th><th>Brand Type</th><th>Product Group</th><th>Item Type</th><th></th></tr></thead>
          <tbody>{rules.map((r, i) => <tr key={r.id}>
            <td>{i + 1}</td>
            <td><input className="input" style={box} value={r.keywords} onChange={e => upd(r.id, { keywords: e.target.value })} placeholder="incell,tft" /></td>
            <td><input className="input" style={box} list="catlist" value={r.category} onChange={e => upd(r.id, { category: e.target.value })} /></td>
            <td><input className="input" style={box} value={r.brand} onChange={e => upd(r.id, { brand: e.target.value })} /></td>
            <td><input className="input" style={box} value={r.brandType} onChange={e => upd(r.id, { brandType: e.target.value })} /></td>
            <td><input className="input" style={box} value={r.productGroup} onChange={e => upd(r.id, { productGroup: e.target.value })} /></td>
            <td><input className="input" style={box} value={r.itemType} onChange={e => upd(r.id, { itemType: e.target.value })} /></td>
            <td style={{ whiteSpace: "nowrap" }}><button type="button" onClick={() => move(i, -1)}>↑</button><button type="button" onClick={() => move(i, 1)}>↓</button><button type="button" onClick={() => setRules(cur => cur.filter(x => x.id !== r.id))}>🗑</button></td>
          </tr>)}</tbody></table>
      </div>
      <datalist id="catlist">{Array.from(new Set([...rules.map(r => r.category), ...cats])).filter(Boolean).map(c => <option key={c} value={c} />)}</datalist>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button className="btn" type="button" onClick={() => setRules(cur => [...cur, blankRule()])}>＋ Nayi Rule</button>
        <button className="btn green" type="button" onClick={() => void saveRules(rules)}>Save Rules</button>
        <button className="btn" type="button" onClick={() => { if (window.confirm("Sab rules default par wapas ho jayengi. Save Rules dabane tak change nahi hota. Theek hai?")) setRules(DEFAULT_RULES.map(r => ({ ...r }))); }}>Default par wapas</button>
      </div>
      {ruleMsg && <p role="status" style={{ color: ruleMsg.ok ? "#4ade80" : "#f87171", fontWeight: 700 }}>{ruleMsg.text}</p>}
    </div>

    <div className="panel"><h2>🏪 Shop</h2>
      <div className="grid">
        <input className="input" value={s.shopName ?? ""} onChange={e => setS({ ...s, shopName: e.target.value })} placeholder="Shop Name" />
        <input className="input" value={s.address ?? ""} onChange={e => setS({ ...s, address: e.target.value })} placeholder="Shop Address" />
        <input className="input" value={s.phone ?? ""} onChange={e => setS({ ...s, phone: e.target.value })} placeholder="Shop Phone" />
        <input className="input" type="number" value={s.defaultWarranty ?? 0} onChange={e => setS({ ...s, defaultWarranty: Number(e.target.value) })} placeholder="Default Warranty Days" />
        <input className="input" value={s.currency ?? ""} onChange={e => setS({ ...s, currency: e.target.value })} placeholder="Currency" />
      </div>
      <button className="btn green" onClick={() => void save()}>Save Settings</button>{msg && <p>{msg}</p>}
    </div>
  </main>;
}
