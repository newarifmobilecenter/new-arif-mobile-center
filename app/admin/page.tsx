"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./admin.module.css";

const cats = ["Displays / LCD", "Batteries", "Charging Ports", "Speakers / Mic", "Cameras", "Buttons / Flex", "Body / Housing", "Repairing Parts", "Tools", "Other Parts"];
const brands = ["Infinix", "Tecno", "Itel", "Vivo", "Oppo", "Realme", "OnePlus", "Samsung", "iPhone", "Universal", "Other"];
const tabs = ["New Product", "Opening", "Multi Supplier", "Product List", "Price Level"] as const;
type Tab = (typeof tabs)[number];

type Form = {
  code: string; barcode: string; detail: string; name: string; brand: string; model: string;
  bin: string; category: string; itemType: string; productGroup: string; uom: string;
  taxCode: string; saleTax: string; packQty: string; costPrice: string; price: string;
  wholesale: string; discount: string; margin: string; minLevel: string; maxLevel: string;
  branch: string; openingQty: string; description: string; sku: string; warrantyDays: string;
};

const blank: Form = {
  code: "", barcode: "", detail: "", name: "", brand: brands[0], model: "", bin: "", category: cats[0],
  itemType: "Part", productGroup: "", uom: "PCS", taxCode: "", saleTax: "0", packQty: "1", costPrice: "0",
  price: "0", wholesale: "0", discount: "0", margin: "0", minLevel: "0", maxLevel: "0", branch: "Main Branch",
  openingQty: "0", description: "", sku: "", warrantyDays: "0",
};

function num(v: string) { return Number(v || 0); }

export default function Admin() {
  const [tab, setTab] = useState<Tab>("New Product");
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => fetch("/api/data?collection=products").then(r => r.json()).then((d:any)=>Array.isArray(d)?d:[]).then(x => setProducts(Array.isArray(x) ? x : []));
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => [p.name, p.model, p.brand, p.category, p.sku, p.code, p.barcode].some(v => String(v ?? "").toLowerCase().includes(q)));
  }, [products, search]);

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));

  function newProduct() {
    setSelectedId("");
    setForm({ ...blank, code: String(Math.max(0, ...products.map(p => Number(p.code) || 0)) + 1), barcode: String(Math.max(0, ...products.map(p => Number(p.barcode) || 0)) + 1) });
    setTab("New Product");
  }

  function loadProduct(p: any) {
    setSelectedId(String(p._id || ""));
    setForm({ ...blank, ...p, code: String(p.code ?? p.sku ?? ""), barcode: String(p.barcode ?? ""), detail: String(p.detail ?? ""), name: String(p.name ?? ""), brand: String(p.brand ?? brands[0]), model: String(p.model ?? ""), bin: String(p.bin ?? ""), category: String(p.category ?? cats[0]), itemType: String(p.itemType ?? "Part"), productGroup: String(p.productGroup ?? ""), uom: String(p.uom ?? "PCS"), taxCode: String(p.taxCode ?? ""), saleTax: String(p.saleTax ?? p.tax ?? "0"), packQty: String(p.packQty ?? "1"), costPrice: String(p.costPrice ?? "0"), price: String(p.price ?? "0"), wholesale: String(p.wholesale ?? p.wholesalePrice ?? "0"), discount: String(p.discount ?? "0"), margin: String(p.margin ?? "0"), minLevel: String(p.minLevel ?? "0"), maxLevel: String(p.maxLevel ?? "0"), branch: String(p.branch ?? "Main Branch"), openingQty: String(p.openingQty ?? p.stock ?? "0"), description: String(p.description ?? ""), sku: String(p.sku ?? ""), warrantyDays: String(p.warrantyDays ?? "0") });
    setTab("New Product");
  }

  async function save() {
    if (!form.name.trim() || !form.model.trim() || !form.price.trim()) return alert("Product Name, Design/Model aur Retail Price zaroor likhein.");
    setBusy(true);
    try {
      const payload = {
        collection: "products", ...(selectedId ? { id: selectedId } : {}),
        code: form.code, barcode: form.barcode, detail: form.detail, name: form.name, brand: form.brand, model: form.model,
        bin: form.bin, category: form.category, itemType: form.itemType, productGroup: form.productGroup, uom: form.uom,
        taxCode: form.taxCode, saleTax: num(form.saleTax), packQty: num(form.packQty), costPrice: num(form.costPrice), price: num(form.price),
        wholesale: num(form.wholesale), discount: num(form.discount), margin: num(form.margin), minLevel: num(form.minLevel), maxLevel: num(form.maxLevel),
        branch: form.branch, openingQty: num(form.openingQty), stock: num(form.openingQty), description: form.description, sku: form.sku || form.code, warrantyDays: num(form.warrantyDays)
      };
      const r = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
    <label className={`${styles.field} ${className}`}><span>{label}</span><input value={form[k]} type={type} onChange={e => set(k, e.target.value)} /></label>
  );
  const Select = ({ label, k, options }: { label: string; k: keyof Form; options: string[] }) => (
    <label className={styles.field}><span>{label}</span><select value={form[k]} onChange={e => set(k, e.target.value)}>{options.map(x => <option key={x}>{x}</option>)}</select></label>
  );

  return <main className={styles.page}>
    <header className={styles.titlebar}><div>▣ <b>New Item - New Arif Mobile Center</b></div><div className={styles.user}>Product Management</div></header>
    <nav className={styles.tabs}>{tabs.map(t => <button key={t} className={tab === t ? styles.activeTab : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>

    {tab === "New Product" && <>
      <section className={styles.heading}><h1>▣ Product Definition</h1><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></section>
      <section className={styles.formPanel}>
        <div className={styles.left}>
          <Field label="Code" k="code" />
          <Field label="Barcode" k="barcode" />
          <div className={styles.detailRow}><Field label="Urdu Detail" k="detail"/><button type="button" className={styles.smallBtn}>اردو تفصیل</button></div>
          <Field label="Product Name" k="name" />
          <Field label="Make / Brand" k="brand" />
          <Field label="Design / Model" k="model" />
          <div className={styles.selectRow}><Select label="Bin Location" k="bin" options={["", "Main Bin", "Rack A", "Rack B", "Store"]}/><button className={styles.nBtn}>N</button></div>
          <div className={styles.selectRow}><Select label="Category" k="category" options={cats}/><button className={styles.nBtn}>N</button></div>
          <div className={styles.selectRow}><Select label="Item Type" k="itemType" options={["Part", "Accessory", "Phone", "Service", "Tool", "Other"]}/><button className={styles.nBtn}>N</button></div>
          <div className={styles.selectRow}><Select label="Product Group" k="productGroup" options={["", "Mobile Parts", "Accessories", "Phones", "Tools", "Services"]}/><button className={styles.nBtn}>N</button></div>
          <div className={styles.selectRow}><Select label="UOM" k="uom" options={["PCS", "SET", "BOX", "PAIR", "KG", "OTHER"]}/><button className={styles.nBtn}>N</button></div>
        </div>
        <div className={styles.right}>
          <div className={styles.imageBox}>Product Image / Notes</div>
          <div className={styles.two}><Select label="Tax Code" k="taxCode" options={["", "GST", "EXEMPT", "ZERO"]}/><Field label="Sale Tax %" k="saleTax" type="number"/></div>
          <div className={styles.two}><Field label="Pack Qty" k="packQty" type="number"/><Field label="Disc (%)" k="discount" type="number"/></div>
          <div className={styles.two}><Field label="Cost" k="costPrice" type="number"/><Field label="Retail" k="price" type="number"/></div>
          <div className={styles.two}><Field label="W.Rate" k="wholesale" type="number"/><Field label="Margin %" k="margin" type="number"/></div>
          <div className={styles.two}><Field label="Min R Level" k="minLevel" type="number"/><Field label="Max R Level" k="maxLevel" type="number"/></div>
          <div className={styles.branchBox}><Field label="Branch Code" k="branch"/><Field label="Open Qty" k="openingQty" type="number"/></div>
          <Field label="SKU / Part No" k="sku" />
          <Field label="Warranty Days" k="warrantyDays" type="number" />
        </div>
      </section>
      <section className={styles.actions}><button className={styles.save} onClick={save} disabled={busy}>▣ {busy ? "Saving..." : "Save"}</button><button className={styles.edit} onClick={() => selectedId ? save() : alert("Product List se product select karein.")}>✎ Edit</button><button className={styles.newBtn} onClick={newProduct}>＋ New</button><Link href="/" className={styles.back}>← Dashboard</Link></section>
    </>}

    {tab === "Product List" && <section className={styles.listPanel}><div className={styles.listTop}><h2>Product List ({filtered.length})</h2><input placeholder="Search name / code / brand / model..." value={search} onChange={e => setSearch(e.target.value)}/><button onClick={newProduct}>＋ New Product</button></div><div className={styles.tableWrap}><table><thead><tr><th>Code</th><th>Product Name</th><th>Category</th><th>Brand</th><th>Model</th><th>Retail</th><th>W.Rate</th><th>Stock</th><th>Action</th></tr></thead><tbody>{filtered.map(p => <tr key={p._id}><td>{p.code ?? p.sku ?? "-"}</td><td>{p.name}</td><td>{p.category ?? "-"}</td><td>{p.brand ?? "-"}</td><td>{p.model ?? "-"}</td><td>{p.price ?? 0}</td><td>{p.wholesale ?? 0}</td><td>{p.stock ?? 0}</td><td><button onClick={() => loadProduct(p)}>Edit</button><button onClick={() => del(String(p._id))}>Delete</button></td></tr>)}</tbody></table></div></section>}

    {tab === "Opening" && <section className={styles.simplePanel}><h2>Opening Stock</h2><p className={styles.muted}>Product select karein aur opening quantity set karein.</p><div className={styles.openGrid}>{products.slice(0, 30).map(p => <div className={styles.openCard} key={p._id}><b>{p.name}</b><span>{p.brand} • {p.model}</span><label>Opening Qty<input type="number" defaultValue={p.stock ?? 0} onBlur={async e => { const q = Number(e.target.value || 0); await fetch("/api/data", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({collection:"products",id:String(p._id),openingQty:q,stock:q})}); }}/></label></div>)}</div></section>}

    {tab === "Multi Supplier" && <section className={styles.simplePanel}><h2>Multi Supplier</h2><p className={styles.muted}>Supplier details product ke saath maintain karne ke liye.</p><div className={styles.supplierGrid}><input placeholder="Supplier Name"/><input placeholder="Supplier Code"/><input placeholder="Purchase Rate" type="number"/><input placeholder="Supplier Item Code"/><button className={styles.save}>＋ Add Supplier</button></div></section>}

    {tab === "Price Level" && <section className={styles.simplePanel}><h2>Price Level</h2><p className={styles.muted}>Retail aur wholesale ke saath additional sale levels set karein.</p><div className={styles.levelGrid}>{["Level 0", "Level 1", "Level 2", "Level 3"].map((x,i) => <div className={styles.levelCard} key={x}><b>{x}</b><input placeholder="Price" type="number"/><input placeholder="Discount %" type="number" defaultValue={i === 0 ? 0 : ""}/></div>)}</div></section>}
  </main>;
}
