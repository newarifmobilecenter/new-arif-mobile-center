"use client";

import { useEffect, useMemo, useState } from "react";
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

function num(v: string) { return Number(v || 0); }

export default function Admin() {
  const [tab, setTab] = useState<Tab>("New Product");
  const [products, setProducts] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, o] = await Promise.all([
      fetch("/api/data?collection=products").then(r => r.json()),
      fetch("/api/data?collection=productOptions").then(r => r.ok ? r.json() : []),
    ]);
    setProducts(Array.isArray(p) ? p : []);
    setOptions(Array.isArray(o) ? o : []);
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

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v, ...(k === "category" ? { brand: "", brandType: "" } : {}) }));

  async function addOption(type: string, label: string) {
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

  function updateField(k: keyof Form, value: string) {
    setForm(current => ({ ...current, [k]: value, ...(k === "code" && current.barcode === current.code ? { barcode: value } : {}) }));
  }

  function newProduct() {
    setSelectedId("");
    const nextCode = String(Math.max(0, ...products.map(p => Number(p.code) || 0)) + 1);
    setForm({ ...blank, code: nextCode, barcode: nextCode });
    setTab("New Product");
  }

  function loadProduct(p: any) {
    setSelectedId(String(p._id || ""));
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
      await load();
      alert(selectedId ? "Product updated successfully" : "Product saved successfully");
      newProduct();
    } catch { alert("Product save nahi hua."); } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Product delete karein? Historical sales remain rahengi.")) return;
    await fetch(`/api/data?collection=products&id=${id}`, { method: "DELETE" });
    await load();
  }

  const Field = ({ label, k, type = "text", className = "" }: { label: string; k: keyof Form; type?: string; className?: string }) => (
    <label className={`${styles.field} ${className}`}><span>{label}</span><input value={form[k]} type={type} onChange={e => updateField(k, e.target.value)} /></label>
  );
  const Select = ({ label, k, options }: { label: string; k: keyof Form; options: string[] }) => <label className={styles.field}><span>{label}</span><select value={form[k]} onChange={e => set(k, e.target.value)}><option value="">Select {label}</option>{options.map(x => <option key={x} value={x}>{x}</option>)}</select></label>;
  const SelectWithN = ({ label, k, type, options }: { label: string; k: keyof Form; type: string; options: string[] }) => <div className={styles.selectRow}><Select label={label} k={k} options={options}/><button type="button" className={styles.nBtn} aria-label={`Add ${label}`} onClick={() => void addOption(type, label)}>N</button></div>;

  return <main className={styles.page}>
    <header className={styles.titlebar}><div>▣ <b>New Item - New Arif Mobile Center</b></div><div className={styles.user}>Product Management</div></header>
    <nav className={styles.tabs}>{tabs.map(t => <button key={t} className={tab === t ? styles.activeTab : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>

    {tab === "New Product" && <>
      <section className={styles.heading}><h1>▣ Product Definition</h1><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></section>
      <section className={styles.formPanel}>
        <div className={styles.left}>
          <Field label="Code" k="code" />
          <Field label="Barcode" k="barcode" />
          <Field label="Product Name" k="name" />
          <SelectWithN label="Make / Brand" k="brand" type="brand" options={choices("brand")}/>
          <SelectWithN label="Category" k="category" type="category" options={choices("category", "")}/>
          <SelectWithN label="Brand Type" k="brandType" type="brandType" options={choices("brandType")}/>
          <SelectWithN label="Bin Location" k="bin" type="bin" options={choices("bin")}/>
          <SelectWithN label="Item Type" k="itemType" type="itemType" options={choices("itemType")}/>
          <SelectWithN label="Product Group" k="productGroup" type="productGroup" options={choices("productGroup")}/>
          <SelectWithN label="UOM" k="uom" type="uom" options={choices("uom")}/>
        </div>
        <div className={styles.right}>
          <div className={styles.two}><Field label="Cost" k="costPrice" type="number"/><Field label="Retail" k="price" type="number"/></div>
          <Field label="W.Rate" k="wholesale" type="number"/>
          <div className={styles.branchBox}><Field label="Branch Code" k="branch"/><Field label="Open Qty" k="openingQty" type="number"/></div>
          <Field label="SKU / Part No" k="sku" />
          <Field label="Warranty Days" k="warrantyDays" type="number" />
        </div>
      </section>
      <section className={styles.actions}><button className={styles.save} onClick={save} disabled={busy}>▣ {busy ? "Saving..." : "Save"}</button><button className={styles.edit} onClick={() => selectedId ? save() : alert("Product List se product select karein.")}>✎ Edit</button><button className={styles.newBtn} onClick={newProduct}>＋ New</button><Link href="/" className={styles.back}>← Dashboard</Link></section>
    </>}

    {tab === "Product List" && <section className={styles.listPanel}><div className={styles.listTop}><h2>Product List ({filtered.length})</h2><input placeholder="Search name / code / brand / barcode..." value={search} onChange={e => setSearch(e.target.value)}/><button onClick={newProduct}>＋ New Product</button></div><div className={styles.tableWrap}><table><thead><tr><th>Code</th><th>Barcode</th><th>Product Name</th><th>Category</th><th>Brand Type</th><th>Brand</th><th>Retail</th><th>W.Rate</th><th>Stock</th><th>Action</th></tr></thead><tbody>{filtered.map(p => <tr key={p._id}><td>{p.code ?? p.sku ?? "-"}</td><td>{p.barcode ?? "-"}</td><td>{p.name}</td><td>{p.category ?? "-"}</td><td>{p.brandType ?? "-"}</td><td>{p.brand ?? "-"}</td><td>{p.price ?? 0}</td><td>{p.wholesale ?? 0}</td><td>{p.stock ?? 0}</td><td><button onClick={() => loadProduct(p)}>Edit</button><button onClick={() => del(String(p._id))}>Delete</button></td></tr>)}</tbody></table></div></section>}

    {tab === "Opening" && <section className={styles.simplePanel}><h2>Opening Stock</h2><p className={styles.muted}>Product select karein aur opening quantity set karein.</p><div className={styles.openGrid}>{products.slice(0, 30).map(p => <div className={styles.openCard} key={p._id}><b>{p.name}</b><span>{p.brand} • {p.model}</span><label>Opening Qty<input type="number" defaultValue={p.stock ?? 0} onBlur={async e => { const q = Number(e.target.value || 0); await fetch("/api/data", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({collection:"products",id:String(p._id),openingQty:q,stock:q})}); }}/></label></div>)}</div></section>}

    {tab === "Multi Supplier" && <section className={styles.simplePanel}><h2>Multi Supplier</h2><p className={styles.muted}>Supplier details product ke saath maintain karne ke liye.</p><div className={styles.supplierGrid}><input placeholder="Supplier Name"/><input placeholder="Supplier Code"/><input placeholder="Purchase Rate" type="number"/><input placeholder="Supplier Item Code"/><button className={styles.save}>＋ Add Supplier</button></div></section>}

    {tab === "Price Level" && <section className={styles.simplePanel}><h2>Price Level</h2><p className={styles.muted}>Retail aur wholesale ke saath additional sale levels set karein.</p><div className={styles.levelGrid}>{["Level 0", "Level 1", "Level 2", "Level 3"].map((x,i) => <div className={styles.levelCard} key={x}><b>{x}</b><input placeholder="Price" type="number"/><input placeholder="Discount %" type="number" defaultValue={i === 0 ? 0 : ""}/></div>)}</div></section>}
  </main>;
}
