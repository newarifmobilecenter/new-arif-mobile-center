"use client";

import { SHOP } from "@/lib/shop";
import { ALT_ROUTES, OTHER_SHORTCUTS } from "@/lib/shortcuts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AUTO_RULES_TYPE, AutoRule, DEFAULT_RULES, ruleMatches, BRAND_RULES_TYPE, BrandRule, matchBrandRule } from "@/lib/autoRules";
import { THEMES, getTheme, setTheme } from "@/lib/themes";

const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : []));
const blankRule = (): AutoRule => ({ id: `r-${Date.now()}`, keywords: "", category: "", brand: "", brandType: "Parts", productGroup: "Mobile Parts", itemType: "Part" });

export default function Settings() {
  const [s, setS] = useState<any>({ shopName: SHOP.nameUpper, address: "", phone: "", defaultWarranty: 7, currency: "PKR" });
  const [msg, setMsg] = useState("");
  const [theme, setThemeState] = useState("blue");
  const [rules, setRules] = useState<AutoRule[]>(DEFAULT_RULES);
  const [ruleId, setRuleId] = useState("");
  const [ruleMsg, setRuleMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [newCat, setNewCat] = useState<string[]>([]);
  const [testName, setTestName] = useState("");
  const [brandRules, setBrandRules] = useState<BrandRule[]>([]);
  const [brandRuleId, setBrandRuleId] = useState("");
  const [brandNames, setBrandNames] = useState<string[]>([]);
  const [brandMsg, setBrandMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [brandTest, setBrandTest] = useState("");
  const [newBrandIds, setNewBrandIds] = useState<string[]>([]);
  const hitIdx = testName.trim() ? rules.findIndex(r => ruleMatches(r, testName)) : -1;

  useEffect(() => {
    setThemeState(getTheme());
    fetch("/api/data?collection=settings&limit=10").then(arr).then(x => { if (x[0]) setS(x[0]); }).catch(() => {});
    fetch("/api/data?collection=productOptions&limit=5000", { cache: "no-store" }).then(arr).then(o => {
      const saved = o.find((x: any) => x.type === AUTO_RULES_TYPE);
      if (saved) { setRuleId(String(saved._id)); if (Array.isArray(saved.rules) && saved.rules.length) setRules(saved.rules); }
      const bs = o.find((x: any) => x.type === BRAND_RULES_TYPE);
      if (bs) { setBrandRuleId(String(bs._id)); if (Array.isArray(bs.rules)) setBrandRules(bs.rules); }
      setBrandNames(o.filter((x: any) => x.type === "brand").map((x: any) => String(x.name || "").trim()).filter(Boolean));
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

  async function saveBrandRules() {
    try {
      const clean = brandRules.map(r => ({ ...r, brand: r.brand.trim(), keywords: r.keywords.trim() })).filter(r => r.brand);
      const payload = { collection: "productOptions", type: BRAND_RULES_TYPE, name: "Brand select rules", rules: clean };
      const r = await fetch("/api/data", { method: brandRuleId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brandRuleId ? { ...payload, id: brandRuleId } : payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua");
      if (!brandRuleId && d._id) setBrandRuleId(String(d._id));
      // Naya brand Make / Brand ki list mein bhi shamil karein (sab categories ke liye), taake dropdown mein nazar aaye.
      const have = new Set(brandNames.map(b => b.toLowerCase()));
      const added: string[] = [];
      for (const br of clean) {
        if (have.has(br.brand.toLowerCase())) continue;
        const x = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "productOptions", type: "brand", name: br.brand, category: "" }) });
        if (x.ok) { added.push(br.brand); have.add(br.brand.toLowerCase()); }
      }
      if (added.length) setBrandNames(cur => [...cur, ...added]);
      setBrandRules(clean);
      setBrandMsg({ text: "Brand selection save ho gayi. Add Product page refresh karein.", ok: true });
    } catch (e: any) { setBrandMsg({ text: e?.message || "Save nahi hua.", ok: false }); }
  }
  const updBrand = (id: string, patch: Partial<BrandRule>) => setBrandRules(cur => cur.map(r => r.id === id ? { ...r, ...patch } : r));
  const brandHit = brandTest.trim() ? matchBrandRule(brandTest, brandRules) : "";

  const upd = (id: string, patch: Partial<AutoRule>) => setRules(cur => cur.map(r => r.id === id ? { ...r, ...patch } : r));
  const move = (i: number, d: number) => setRules(cur => { const j = i + d; if (j < 0 || j >= cur.length) return cur; const n = [...cur]; [n[i], n[j]] = [n[j], n[i]]; return n; });

  return <main className="shell">
    <div className="nav"><Link href="/">← Dashboard</Link><Link href="/backup">Backup</Link></div>
    <h1>⚙️ Settings</h1>

    <div className="panel"><h2>⌨️ Keyboard Shortcuts</h2>
      <table style={{ width: "100%", maxWidth: 520 }}><tbody>
        {ALT_ROUTES.map((r) => <tr key={r.code}><td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}><b>Alt + {r.key}</b></td><td style={{ padding: "4px 8px" }}>{r.label}</td></tr>)}
        {OTHER_SHORTCUTS.map((r) => <tr key={r.keys}><td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}><b>{r.keys}</b></td><td style={{ padding: "4px 8px" }}>{r.label}</td></tr>)}
      </tbody></table>
    </div>

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
      <p style={{ color: "#fbbf24", fontSize: 13 }}>Nayi rule <b>sab se upar</b> lagti hai, kyunke upar wali rule pehle check hoti hai. Agar kisi naam par galat category aaye (jaise "panel frame" par Displays), to apni rule ko ↑ se upar kar dein.</p>
      <div style={{ display: "grid", gap: 6, margin: "8px 0 12px" }}>
        <label style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>🔎 Test: product ka naam likh kar dekhein kaun si rule lagegi
          <input className="input" style={{ marginTop: 4, width: "100%", boxSizing: "border-box", minHeight: 42, fontSize: 16 }} value={testName} onChange={e => setTestName(e.target.value)} placeholder="jaise: Samsung A50 panel frame" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
        {testName.trim() && <div style={{ fontWeight: 700, color: hitIdx >= 0 ? "#4ade80" : "#f87171" }}>{hitIdx >= 0 ? `Rule ${hitIdx + 1} lagegi → Category: ${rules[hitIdx].category || "(khali)"}${rules[hitIdx].keywords ? `  (keywords: ${rules[hitIdx].keywords})` : ""}` : "Koi rule match nahi hui — category khud chunni paregi."}</div>}
      </div>
      <div className="ruleList">
        {rules.map((r, i) => {
          const catOptions = Array.from(new Set([...DEFAULT_RULES.map(x => x.category), ...rules.map(x => x.category), ...cats])).filter(Boolean);
          const custom = !!r.category && !catOptions.includes(r.category) || newCat.includes(r.id);
          return <div className="ruleCard" key={r.id}>
            <div className="ruleHead"><b>Rule {i + 1}</b>
              <span><button type="button" aria-label="Upar" onClick={() => move(i, -1)}>↑</button><button type="button" aria-label="Neeche" onClick={() => move(i, 1)}>↓</button><button type="button" aria-label="Delete" onClick={() => setRules(cur => cur.filter(x => x.id !== r.id))}>🗑</button></span></div>
            <label>Keywords<input className="input" value={r.keywords} onChange={e => upd(r.id, { keywords: e.target.value })} placeholder="jaise: incell,tft" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
            <label>Category
              <select className="input" value={custom ? "__new__" : r.category} onChange={e => {
                if (e.target.value === "__new__") { setNewCat(c => [...c, r.id]); upd(r.id, { category: "" }); }
                else { setNewCat(c => c.filter(x => x !== r.id)); upd(r.id, { category: e.target.value }); }
              }}>
                <option value="">— Category chunein —</option>
                {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">➕ Nayi category likhein…</option>
              </select>
              {custom && <input className="input" style={{ marginTop: 6 }} value={r.category} onChange={e => upd(r.id, { category: e.target.value })} placeholder="Nayi category ka naam" />}
            </label>
            <label>Brand (optional)<input className="input" value={r.brand} onChange={e => upd(r.id, { brand: e.target.value })} /></label>
            <label>Brand Type<input className="input" value={r.brandType} onChange={e => upd(r.id, { brandType: e.target.value })} /></label>
            <label>Product Group<input className="input" value={r.productGroup} onChange={e => upd(r.id, { productGroup: e.target.value })} /></label>
            <label>Item Type<input className="input" value={r.itemType} onChange={e => upd(r.id, { itemType: e.target.value })} /></label>
          </div>;
        })}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button className="btn" type="button" onClick={() => { setRules(cur => [blankRule(), ...cur]); window.scrollTo?.({ top: 0 }); setTimeout(() => document.querySelector<HTMLElement>(".ruleCard input")?.focus(), 50); }}>＋ Nayi Rule (sab se upar)</button>
        <button className="btn green" type="button" onClick={() => void saveRules(rules)}>Save Rules</button>
        <button className="btn" type="button" onClick={() => { if (window.confirm("Sab rules default par wapas ho jayengi. Save Rules dabane tak change nahi hota. Theek hai?")) setRules(DEFAULT_RULES.map(r => ({ ...r }))); }}>Default par wapas</button>
      </div>
      {ruleMsg && <p role="status" style={{ color: ruleMsg.ok ? "#4ade80" : "#f87171", fontWeight: 700 }}>{ruleMsg.text}</p>}
    </div>

    <div className="panel"><h2>🏷️ Brand Selection (Add Product)</h2>
      <p style={{ color: "#94a3b8", fontSize: 13 }}>Product ke naam mein yeh lafz likhein to Make / Brand khud select ho. Brand ka apna naam khud keyword hai (jaise Huawei likhne se Huawei). Extra lafz comma (,) se alag karein, jaise: y9, nova, mate.</p>
      <label style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>🔎 Test: product ka naam likhein
        <input className="input" style={{ marginTop: 4, width: "100%", boxSizing: "border-box", minHeight: 42, fontSize: 16 }} value={brandTest} onChange={e => setBrandTest(e.target.value)} placeholder="jaise: huawei y9 panel" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
      {brandTest.trim() && <div style={{ fontWeight: 700, color: brandHit ? "#4ade80" : "#f87171" }}>{brandHit ? `Brand select hoga → ${brandHit}` : "Is naam par koi brand rule nahi lagi (purani auto detection chalegi)."}</div>}
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        {brandRules.map(r => <div key={r.id} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(() => {
            const list = Array.from(new Set([...brandNames, ...brandRules.map(x => x.brand.trim())].filter(Boolean))).sort((a, b) => a.localeCompare(b));
            const isNew = newBrandIds.includes(r.id) || (!!r.brand && !list.some(b => b.toLowerCase() === r.brand.trim().toLowerCase()));
            return <div style={{ flex: "1 1 200px", display: "grid", gap: 6 }}>
              <select className="input" value={isNew ? "__new__" : (list.find(b => b.toLowerCase() === r.brand.trim().toLowerCase()) || "")} onChange={e => {
                if (e.target.value === "__new__") { setNewBrandIds(c => [...c, r.id]); updBrand(r.id, { brand: "" }); }
                else { setNewBrandIds(c => c.filter(x => x !== r.id)); updBrand(r.id, { brand: e.target.value }); }
              }}>
                <option value="">— Brand chunein —</option>
                {list.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="__new__">➕ Naya brand banayein…</option>
              </select>
              {isNew && <input className="input" value={r.brand} onChange={e => updBrand(r.id, { brand: e.target.value })} placeholder="Naye brand ka naam (jaise Huawei)" autoFocus />}
            </div>;
          })()}
          <input className="input" style={{ flex: "2 1 240px" }} value={r.keywords} onChange={e => updBrand(r.id, { keywords: e.target.value })} placeholder="Extra keywords (optional): y9, nova" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <button className="btn" type="button" onClick={() => setBrandRules(cur => cur.filter(x => x.id !== r.id))}>🗑</button>
        </div>)}
        {!brandRules.length && <p style={{ color: "#94a3b8", fontSize: 13 }}>Abhi koi manual brand nahi hai. ➕ dabayein.</p>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button className="btn" type="button" onClick={() => { const id = `b-${Date.now()}`; setNewBrandIds(c => [...c, id]); setBrandRules(cur => [...cur, { id, brand: "", keywords: "" }]); }}>➕ Naya Brand</button>
        <button className="btn green" type="button" onClick={() => void saveBrandRules()}>Save Brands</button>
      </div>
      {brandMsg && <p role="status" style={{ color: brandMsg.ok ? "#4ade80" : "#f87171", fontWeight: 700 }}>{brandMsg.text}</p>}
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
