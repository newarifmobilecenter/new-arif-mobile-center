"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./purchases.module.css";

type PurchaseLine = { productId: string; name: string; model?: string; qty: number; costPrice: number };
const money = (n: number) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
export default function Purchases() {
  const [products, setProducts] = useState<any[]>([]), [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplier, setSupplier] = useState(""), [search, setSearch] = useState(""), [lines, setLines] = useState<PurchaseLine[]>([]);
  const [invoice, setInvoice] = useState(""), [payment, setPayment] = useState("Cash"), [paid, setPaid] = useState("");
  const [tcs, setTcs] = useState("0"), [bilty, setBilty] = useState("0"), [freight, setFreight] = useState("0"), [other, setOther] = useState("0");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { Promise.all(["products", "suppliers"].map(c => fetch("/api/data?collection=" + c + "&limit=5000").then(r => r.json()).then((d:any)=>Array.isArray(d)?d:[]))).then(([p,s])=>{setProducts(p);setSuppliers(s)}); }, []);
  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.qty * line.costPrice, 0), [lines]);
  const total = subtotal + Number(tcs || 0) + Number(bilty || 0) + Number(freight || 0) + Number(other || 0);
  const remaining = Math.max(0, total - Number(paid || 0));
  const shown = products.filter(p => `${p.name || ""} ${p.model || ""} ${p.sku || ""} ${p.code || ""} ${p.barcode || ""} ${p.brand || ""}`.toLowerCase().includes(search.toLowerCase())).slice(0, 12);
  function add(product: any) {
    setLines(current => { const found=current.find(line=>line.productId===product._id); return found?current.map(line=>line.productId===product._id?{...line,qty:line.qty+1}:line):[...current,{productId:product._id,name:product.name||product.model||"Product",model:product.model,qty:1,costPrice:Number(product.costPrice||0)}]; });
    setSearch(""); requestAnimationFrame(()=>searchRef.current?.focus());
  }
  async function save() {
    if (!supplier || !lines.length) { setMessage("Supplier aur kam az kam aik product select karein."); return; }
    if (Number(paid || 0) > total) { setMessage("Paid amount purchase total se zyada nahi ho sakta."); return; }
    setBusy(true); setMessage(""); const ref=invoice.trim()||`PUR-${Date.now()}`;
    try {
      const response=await fetch("/api/purchases/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({supplierId:supplier,invoiceNo:ref,items:lines,subtotal,tcs:Number(tcs||0),bilty:Number(bilty||0),freight:Number(freight||0),otherExpense:Number(other||0),total,paid:Number(paid||0),paymentMethod:payment})});
      const result=await response.json(); if(!response.ok)throw new Error(result.error||"Purchase save nahi hui.");
      setMessage(`Purchase ${ref} save ho gayi; stock bhi update hua.`); setLines([]); setInvoice(""); setPaid("");
      const rows=await fetch("/api/data?collection=products&limit=5000").then(r=>r.json()); setProducts(Array.isArray(rows)?rows:[]);
    } catch(error:any){setMessage(error?.message||"Purchase save nahi hui.");} finally{setBusy(false);}
  }
  return <main className={styles.page}>
    <header className={styles.top}><Link href="/">← Dashboard</Link><h1>Purchase</h1><nav><Link href="/purchases/history">Purchase History</Link><Link href="/purchases/returns">Purchase Return</Link><Link href="/suppliers">Suppliers</Link></nav></header>
    <section className={styles.headerGrid}><label>Supplier<select value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Select Supplier</option>{suppliers.map(x=><option key={x._id} value={x._id}>{x.name} {x.phone?`— ${x.phone}`:""}</option>)}</select></label><label>Supplier Invoice<input value={invoice} onChange={e=>setInvoice(e.target.value)} placeholder="Bill / Invoice No" /></label><label>Payment Method<select value={payment} onChange={e=>setPayment(e.target.value)}>{["Cash","JazzCash","Easypaisa","Raast","NayaPay","UBL","Other Bank","Credit"].map(x=><option key={x}>{x}</option>)}</select></label></section>
    <section className={styles.panel}><h2>Add Products</h2><input ref={searchRef} className={styles.search} value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(shown[0])add(shown[0]);}}} placeholder="Search code, name, model, SKU or barcode; press Enter to add" />{search&&<div className={styles.results}>{shown.map(p=><button type="button" key={p._id} onClick={()=>add(p)}><b>{p.code||p.sku||""} {p.name||p.model}</b><span>{p.brand||""} · Stock {p.stock||0} · Current cost Rs. {money(p.costPrice)}</span></button>)}</div>}</section>
    <section className={styles.panel}><h2>Purchase Lines <span>({lines.length})</span></h2><div className={styles.tableScroll}><table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Purchase Cost</th><th>Line Total</th><th></th></tr></thead><tbody>{lines.map((line,index)=><tr key={line.productId}><td>{index+1}</td><td><b>{line.name}</b><small>{line.model||""}</small></td><td><input aria-label="Quantity" type="number" min="1" value={line.qty} onChange={e=>setLines(current=>current.map(x=>x.productId===line.productId?{...x,qty:Math.max(1,Number(e.target.value)||1)}:x))}/></td><td><input aria-label="Purchase cost" type="number" min="0" value={line.costPrice} onChange={e=>setLines(current=>current.map(x=>x.productId===line.productId?{...x,costPrice:Number(e.target.value)||0}:x))}/></td><td>Rs. {money(line.qty*line.costPrice)}</td><td><button type="button" className={styles.remove} onClick={()=>setLines(current=>current.filter(x=>x.productId!==line.productId))}>Remove</button></td></tr>)}{!lines.length&&<tr><td colSpan={6} className={styles.empty}>Search and add products to start a purchase.</td></tr>}</tbody></table></div></section>
    <section className={styles.panel}><h2>Charges & Payment</h2><div className={styles.amountGrid}><label>TCS / Tax<input type="number" min="0" value={tcs} onChange={e=>setTcs(e.target.value)} /></label><label>Bilty / Transport<input type="number" min="0" value={bilty} onChange={e=>setBilty(e.target.value)} /></label><label>Freight<input type="number" min="0" value={freight} onChange={e=>setFreight(e.target.value)} /></label><label>Other Expense<input type="number" min="0" value={other} onChange={e=>setOther(e.target.value)} /></label><label>Paid Now<input type="number" min="0" value={paid} onChange={e=>setPaid(e.target.value)} /></label><label>Balance Due<input value={`Rs. ${money(remaining)}`} readOnly /></label></div><div className={styles.summary}><span>Subtotal <b>Rs. {money(subtotal)}</b></span><span>Purchase Total <b>Rs. {money(total)}</b></span></div><button type="button" disabled={busy} className={styles.save} onClick={()=>void save()}>{busy?"Saving…":"Save Purchase & Update Stock"}</button>{message&&<p role="status">{message}</p>}</section>
  </main>;
}
