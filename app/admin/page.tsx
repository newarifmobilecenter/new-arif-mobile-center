"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./admin.module.css";

const cats = ["Displays / LCD", "Batteries", "Charging Ports", "Speakers / Mic", "Cameras", "Buttons / Flex", "Body / Housing", "Repairing Parts", "Tools", "Other Parts"];
const brands = ["Infinix", "Tecno", "Itel", "Vivo", "Oppo", "Realme", "OnePlus", "Samsung", "iPhone", "Universal", "Other"];
const baseOptions: Record<string, string[]> = {
  category: cats, brand: brands, brandType: ["Phone", "Parts", "Accessories", "Other"],
  bin: ["Main Bin", "Rack A", "Rack B", "Store"], itemType: ["Part", "Accessory", "Phone", "Service", "Tool", "Other"],
  productGroup: ["Mobile Parts", "Accessories", "Phones", "Tools", "Services"], uom: ["PCS", "SET", "BOX", "PAIR", "KG", "OTHER"],
};
const tabs = ["New Product", "Opening", "Multi Supplier", "Product List", "Price Level"] as const;
type Tab = (typeof tabs)[number];

type Form = {
  code: string; barcode: string; name: string; brand: string; brandType: string;
  bin: string; category: string; itemType: string; productGroup: string; uom: string;
  costPrice: string; price: string; wholesale: string;
  branch: string; openingQty: string; description: string; sku: string; warrantyDays: string;
};

const blank: Form = {
  code: "", barcode: "", name: "", brand: "", brandType: "", bin: "", category: cats[0],
  itemType: "Part", productGroup: "", uom: "PCS", costPrice: "0",
  price: "0", wholesale: "0", branch: "Main Branch",
  openingQty: "0", description: "", sku: "", warrantyDays: "0",
};

const categoryRules: [string, RegExp][] = [
  ["Charging Ports", /charging|charger|\bport\b|\bpcb\b|\bboard\b/i],
  ["Batteries", /batter/i],
  ["Displays / LCD", /panel|\blcd\b|display|screen|touch|\bfolder\b/i],
  ["Speakers / Mic", /speaker|\bmic\b|microphone|ringer|buzzer/i],
  ["Cameras", /camera/i],
  ["Buttons / Flex", /button|\bflex\b|power key|volume/i],
  ["Body / Housing", /\bbody\b|housing|back cover|\bframe\b|\bpanel back\b/i],
  ["Tools", /\btool|screwdriver|soldering|\bkit\b/i],
];
const brandAliases: [string, RegExp][] = [["iPhone", /\b(iphone|apple)\b/i]];

function detectCategory(name: string) {
  for (const [category, rx] of categoryRules) if (rx.test(name)) return category;
  return "";
}
function detectBrand(name: string, brandList: string[]) {
  for (const [brand, rx] of brandAliases) if (rx.test(name)) return brand;
  const sorted = [...brandList].filter(b => b && !/^(other|universal)$/i.test(b)).sort((a, b) => b.length - a.length);
  for (const b of sorted) {
    const esc = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(name)) return b;
  }
  return "";
}

function num(v: string) { return Number(v || 0); }

function Field({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return <label className={`${styles.field} ${className}`}><span>{label}</span><input value={value} type={type} onChange={e => onChange(e.target.value)} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className={styles.field}><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}><option value="">Select {label}</option>{options.map(x => <option key={x} value={x}>{x}</option>)}</select></label>;
}

function SelectWithN({ label, value, options, onChange, onAdd }: { label: string; value: string; options: string[]; onChange: (value: string) => void; onAdd: () => void }) {
  return <div className={styles.selectRow}><Select label={label} value={value} options={options} onChange={onChange}/><button type="button" className={styles.nBtn} aria-label={`Add ${label}`} onClick={onAdd}>N</button></div>;
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("New Product");
  const [products, setProducts] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [brandManagerOpen, setBrandManagerOpen] = useState(false);
  const [brandManagerTab, setBrandManagerTab] = useState<"new" | "list">("new");
  // Fields the user changed by hand are not auto-filled again from the product name.
  const touched = useRef<Record<string, boolean>>({});
  const [brandDraft, setBrandDraft] = useState("");
  const [brandCategory, setBrandCategory] = useState(cats[0]);

  const load = async () => {
    const [p, o] = await Promise.all([
      fetch("/api/data?collection=products").then(r => r.json()),
      fetch("/api/data?collection=productOptions").then(r => r.ok ? r.json() : []),
    ]);
    setProducts(Array.isArray(p) ? p : []);
    setOptions(Array.isArray(o) ? o : []);
    const existingCodes = (Array.isArray(p) ? p : []).map((product: any) => String(product.code ?? product.sku ?? "").trim()).filter((code: string) => /^\d+$/.test(code)).map(Number);
    const suggestedCode = String(Math.max(0, ...existingCodes) + 1).padStart(4, "0");
    setForm(current => current.code ? current : { ...current, code: suggestedCode, barcode: suggestedCode });
    return Array.isArray(p) ? p : [];
  };
  useEffect(() => { void load(); }, []);

  const choices = (type: string, category = form.category) => Array.from(new Set([
    ...(baseOptions[type] || []),
    ...options.filter(option => option.type === type && (!option.category || option.category === category)).map(option => String(option.name || "").trim()).filter(Boolean),
    ...products.filter(product => product[type] && (!category || type === "category" || product.category === category)).map(product => String(product[type]).trim()).filter(Boolean),
  ]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => [p.name, p.model, p.brand, p.category, p.sku, p.code, p.barcode].some(v => String(v ?? "").toLowerCase().includes(q)));
  }, [products, search]);

  const set = (k: keyof Form, v: string) => {
    touched.current[k] = true;
    if (k === "category") { touched.current.brandType = true; touched.current.productGroup = true; touched.current.itemType = true; }
    setForm(f => ({ ...f, [k]: v, ...(k === "category" ? { brand: touched.current.brand ? f.brand : "", brandType: "" } : {}) }));
  };

  function changeName(value: string) {
    setForm(current => {
      const next: Form = { ...current, name: value };
      const t = touched.current;
      const brandList = Array.from(new Set([...baseOptions.brand, ...options.filter(o => o.type === "brand").map(o => String(o.name || "").trim()), ...products.map(pr => String(pr.brand || "").trim())].filter(Boolean)));
      if (!t.brand) { const b = detectBrand(value, brandList); if (b) next.brand = b; }
      if (!t.category) {
        const c = detectCategory(value);
        if (c) {
          next.category = c;
          if (!t.brandType) next.brandType = c === "Tools" ? "Other" : "Parts";
          if (!t.productGroup) next.productGroup = c === "Tools" ? "Tools" : "Mobile Parts";
          if (!t.itemType) next.itemType = c === "Tools" ? "Tool" : "Part";
        }
      }
      return next;
    });
  }

  async function addOption(type: string, label: string) {
    if (type === "brand") {
      setBrandDraft("");
      setBrandCategory(form.category);
      setBrandManagerTab("new");
      setBrandManagerOpen(true);
      return;
    }
    const name = window.prompt(`Naya ${label} name likhein:`)?.trim();
    if (!name) return;
    const category = type === "category" ? "" : form.category;
    if (choices(type, category).some(value => value.toLowerCase() === name.toLowerCase())) {
      window.alert(`${label} pehle se list mein mojood hai.`);
      return;
    }
    const response = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "productOptions", type, name, category }) });
    if (!response.ok) { window.alert(`${label} save nahi hua.`); return; }
    await load();
    if (type === "category") setForm(f => ({ ...f, category: name, brand: "", brandType: "" }));
    else if (type === "brand") setForm(f => ({ ...f, brand: name }));
    else if (type === "brandType") setForm(f => ({ ...f, brandType: name }));
    else setForm(f => ({ ...f, [type]: name }));
  }

  async function saveBrand() {
    const name = brandDraft.trim();
    if (!name) { window.alert("Brand ka naam likhein."); return; }
    const exists = options.some(option => option.type === "brand" && option.category === brandCategory && String(option.name || "").trim().toLowerCase() === name.toLowerCase());
    if (exists) { window.alert("Yeh brand is category mein pehle se mojood hai."); return; }
    const response = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "productOptions", type: "brand", name, category: brandCategory }) });
    if (!response.ok) { window.alert("Brand save nahi hua."); return; }
    await load();
    setForm(f => ({ ...f, category: brandCategory, brand: name }));
    setBrandManagerOpen(false);
  }

  function chooseBrand(name: string, category: string) {
    setForm(f => ({ ...f, category, brand: name }));
    setBrandManagerOpen(false);
  }

  function updateField(k: keyof Form, value: string) {
    setForm(current => ({ ...current, [k]: value, ...(k === "code" && current.barcode === current.code ? { barcode: value } : {}) }));
  }

  function newProduct(list: any[] = products) {
    setSelectedId("");
    touched.current = {};
    const numericCodes = list.map(p => String(p.code ?? p.sku ?? "").trim()).filter(code => /^\d+$/.test(code)).map(Number);
    const nextCode = String(Math.max(0, ...numericCodes) + 1).padStart(4, "0");
    setForm({ ...blank, code: nextCode, barcode: nextCode });
    setTab("New Product");
  }

  function loadProduct(p: any) {
    setSelectedId(String(p._id || ""));
    touched.current = { brand: true, category: true, brandType: true, productGroup: true, itemType: true };
    setForm({ ...blank, ...p, code: String(p.code ?? p.sku ?? ""), barcode: String(p.barcode ?? p.code ?? ""), name: String(p.name ?? ""), brand: String(p.brand ?? ""), brandType: String(p.brandType ?? ""), bin: String(p.bin ?? ""), category: String(p.category ?? cats[0]), itemType: String(p.itemType ?? "Part"), productGroup: String(p.productGroup ?? ""), uom: String(p.uom ?? "PCS"), costPrice: String(p.costPrice ?? "0"), price: String(p.price ?? "0"), wholesale: String(p.wholesale ?? p.wholesalePrice ?? "0"), branch: String(p.branch ?? "Main Branch"), openingQty: String(p.openingQty ?? p.stock ?? "0"), description: String(p.description ?? ""), sku: String(p.sku ?? ""), warrantyDays: String(p.warrantyDays ?? "0") });
    setTab("New Product");
  }

  async function save() {
    if (!form.name.trim() || !form.price.trim()) return alert("Product Name aur Retail Price zaroor likhein.");
    const duplicate = !selectedId && products.some(p => String(p.name || "").trim().toLowerCase() === form.name.trim().toLowerCase() && String(p.category || "").toLowerCase() === form.category.toLowerCase() && String(p.brandType || "").toLowerCase() === form.brandType.toLowerCase() && String(p.brand || "").toLowerCase() === form.brand.toLowerCase());
    if (duplicate && !window.confirm("Yeh product pehle se save hai. Kya aap phir bhi duplicate product save karna chahte hain?")) return;
    setBusy(true);
    try {
      const payload = {
        collection: "products", ...(selectedId ? { id: selectedId } : {}),
        code: form.code, barcode: form.barcode, name: form.name, brand: form.brand, brandType: form.brandType,
        bin: form.bin, category: form.category, itemType: form.itemType, productGroup: form.productGroup, uom: form.uom,
        costPrice: num(form.costPrice), price: num(form.price), wholesale: num(form.wholesale),
        branch: form.branch, openingQty: num(form.openingQty), stock: num(form.openingQty), description: form.description, sku: form.sku || form.code, warrantyDays: num(form.warrantyDays)
      };
      const r = await fetch("/api/data", { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error();
      const fresh = await load();
      alert(selectedId ? "Product updated successfully" : "Product saved successfully");
      newProduct(fresh);
    } catch { alert("Product save nahi hua."); } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Product delete karein? Historical sales remain rahengi.")) return;
    await fetch(`/api/data?collection=products&id=${id}`, { method: "DELETE" });
    await load();
  }

  return <main className={styles.page}>
    <header className={styles.titlebar}><div>▣ <b>New Item - New Arif Mobile Center</b></div><div className={styles.user}>Product Management</div></header>
    <nav className={styles.tabs}>{tabs.map(t => <button key={t} className={tab === t ? styles.activeTab : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>

    {tab === "New Product" && <>
      <section className={styles.heading}><h1>▣ Product Definition</h1><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></section>
      <section className={styles.formPanel}>
        <div className={styles.left}>
          <Field label="Code" value={form.code} onChange={v => updateField("code", v)} />
          <Field label="Barcode" value={form.barcode} onChange={v => updateField("barcode", v)} />
          <Field label="Product Name" value={form.name} onChange={changeName} />
          <SelectWithN label="Make / Brand" value={form.brand} options={choices("brand")} onChange={v => set("brand", v)} onAdd={() => void addOption("brand", "Make / Brand")}/>
          <SelectWithN label="Category" value={form.category} options={choices("category", "")} onChange={v => set("category", v)} onAdd={() => void addOption("category", "Category")}/>
          <SelectWithN label="Brand Type" value={form.brandType} options={choices("brandType")} onChange={v => set("brandType", v)} onAdd={() => void addOption("brandType", "Brand Type")}/>
          <SelectWithN label="Bin Location" value={form.bin} options={choices("bin")} onChange={v => set("bin", v)} onAdd={() => void addOption("bin", "Bin Location")}/>
          <SelectWithN label="Item Type" value={form.itemType} options={choices("itemType")} onChange={v => set("itemType", v)} onAdd={() => void addOption("itemType", "Item Type")}/>
          <SelectWithN label="Product Group" value={form.productGroup} options={choices("productGroup")} onChange={v => set("productGroup", v)} onAdd={() => void addOption("productGroup", "Product Group")}/>
          <SelectWithN label="UOM" value={form.uom} options={choices("uom")} onChange={v => set("uom", v)} onAdd={() => void addOption("uom", "UOM")}/>
        </div>
        <div className={styles.right}>
          <div className={styles.two}><Field label="Cost" value={form.costPrice} onChange={v => updateField("costPrice", v)} type="number"/><Field label="Retail" value={form.price} onChange={v => updateField("price", v)} type="number"/></div>
          <Field label="W.Rate" value={form.wholesale} onChange={v => updateField("wholesale", v)} type="number"/>
          <div className={styles.branchBox}><Field label="Branch Code" value={form.branch} onChange={v => updateField("branch", v)}/><Field label="Open Qty" value={form.openingQty} onChange={v => updateField("openingQty", v)} type="number"/></div>
          <Field label="SKU / Part No" value={form.sku} onChange={v => updateField("sku", v)} />
          <Field label="Warranty Days" value={form.warrantyDays} onChange={v => updateField("warrantyDays", v)} type="number" />
        </div>
      </section>
      <section className={styles.actions}><button className={styles.save} onClick={save} disabled={busy}>▣ {busy ? "Saving..." : "Save"}</button><button className={styles.edit} onClick={() => selectedId ? save() : alert("Product List se product select karein.")}>✎ Edit</button><button className={styles.newBtn} onClick={() => newProduct()}>＋ New</button><Link href="/" className={styles.back}>← Dashboard</Link></section>
    </>}

    {tab === "Product List" && <section className={styles.listPanel}><div className={styles.listTop}><h2>Product List ({filtered.length})</h2><input placeholder="Search name / code / brand / barcode..." value={search} onChange={e => setSearch(e.target.value)}/><button onClick={() => newProduct()}>＋ New Product</button></div><div className={styles.tableWrap}><table><thead><tr><th>Code</th><th>Barcode</th><th>Product Name</th><th>Category</th><th>Brand Type</th><th>Brand</th><th>Retail</th><th>W.Rate</th><th>Stock</th><th>Action</th></tr></thead><tbody>{filtered.map(p => <tr key={p._id}><td>{p.code ?? p.sku ?? "-"}</td><td>{p.barcode ?? "-"}</td><td>{p.name}</td><td>{p.category ?? "-"}</td><td>{p.brandType ?? "-"}</td><td>{p.brand ?? "-"}</td><td>{p.price ?? 0}</td><td>{p.wholesale ?? 0}</td><td>{p.stock ?? 0}</td><td><button onClick={() => loadProduct(p)}>Edit</button><button onClick={() => del(String(p._id))}>Delete</button></td></tr>)}</tbody></table></div></section>}

    {tab === "Opening" && <section className={styles.simplePanel}><h2>Opening Stock</h2><p className={styles.muted}>Product select karein aur opening quantity set karein.</p><div className={styles.openGrid}>{products.slice(0, 30).map(p => <div className={styles.openCard} key={p._id}><b>{p.name}</b><span>{p.brand} • {p.model}</span><label>Opening Qty<input type="number" defaultValue={p.stock ?? 0} onBlur={async e => { const q = Number(e.target.value || 0); await fetch("/api/data", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({collection:"products",id:String(p._id),openingQty:q,stock:q})}); }}/></label></div>)}</div></section>}

    {tab === "Multi Supplier" && <section className={styles.simplePanel}><h2>Multi Supplier</h2><p className={styles.muted}>Supplier details product ke saath maintain karne ke liye.</p><div className={styles.supplierGrid}><input placeholder="Supplier Name"/><input placeholder="Supplier Code"/><input placeholder="Purchase Rate" type="number"/><input placeholder="Supplier Item Code"/><button className={styles.save}>＋ Add Supplier</button></div></section>}

    {tab === "Price Level" && <section className={styles.simplePanel}><h2>Price Level</h2><p className={styles.muted}>Retail aur wholesale ke saath additional sale levels set karein.</p><div className={styles.levelGrid}>{["Level 0", "Level 1", "Level 2", "Level 3"].map((x,i) => <div className={styles.levelCard} key={x}><b>{x}</b><input placeholder="Price" type="number"/><input placeholder="Discount %" type="number" defaultValue={i === 0 ? 0 : ""}/></div>)}</div></section>}
    {brandManagerOpen && <div className={styles.brandModalBackdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setBrandManagerOpen(false); }}><section className={styles.brandModal} role="dialog" aria-modal="true" aria-labelledby="brand-manager-title"><header className={styles.brandModalHeader}><h2 id="brand-manager-title">Brand Management</h2><button type="button" onClick={() => setBrandManagerOpen(false)} aria-label="Close">×</button></header><nav className={styles.brandModalTabs}><button type="button" className={brandManagerTab === "new" ? styles.brandModalTabActive : ""} onClick={() => setBrandManagerTab("new")}>1. Enter New Brand</button><button type="button" className={brandManagerTab === "list" ? styles.brandModalTabActive : ""} onClick={() => setBrandManagerTab("list")}>2. Category List</button></nav>{brandManagerTab === "new" ? <div className={styles.brandModalContent}><label className={styles.brandModalField}><span>Category</span><select value={brandCategory} onChange={event => setBrandCategory(event.target.value)}>{choices("category", "").map(category => <option key={category} value={category}>{category}</option>)}</select></label><label className={styles.brandModalField}><span>Brand Name</span><input autoFocus value={brandDraft} onChange={event => setBrandDraft(event.target.value)} placeholder="Enter brand name" /></label><footer className={styles.brandModalActions}><button type="button" onClick={() => setBrandManagerOpen(false)}>Cancel</button><button type="button" className={styles.brandModalSave} onClick={() => void saveBrand()}>Save Brand</button></footer></div> : <div className={styles.brandModalContent}><div className={styles.brandCategoryList}>{choices("category", "").map(category => { const categoryBrands = Array.from(new Set([...options.filter(option => option.type === "brand" && option.category === category).map(option => String(option.name || "").trim()), ...products.filter(product => product.category === category && product.brand).map(product => String(product.brand).trim())].filter(Boolean))).sort((a, b) => a.localeCompare(b)); return <section className={styles.brandCategoryGroup} key={category}><h3>{category}</h3>{categoryBrands.length ? <div className={styles.brandChips}>{categoryBrands.map(name => <button type="button" key={name} onClick={() => chooseBrand(name, category)}>{name}</button>)}</div> : <p>No saved brands</p>}</section>; })}</div></div>}</section></div>}
  </main>;
}
