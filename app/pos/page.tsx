"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import styles from "./pos.module.css";

type Product = any;
type Customer = any;
type SaleItem = { productId: string | null; name: string; qty: number; price: number; barcode?: string; remarks?: string; stock?: number; isMisc?: boolean };
type HeldBill = { id: string; invoiceNo: string; createdAt: string; customerId: string; customerName: string; items: SaleItem[]; cashRef: string };

function money(value: number) { return Number(value || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function nextInvoice() { return `INV-${Date.now()}`; }

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [cashRef, setCashRef] = useState("");
  const [custRef, setCustRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [salesman, setSalesman] = useState("admin");
  const [saleType, setSaleType] = useState("CASH");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNo, setInvoiceNo] = useState(nextInvoice);
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pay, setPay] = useState("Cash");
  const [paid, setPaid] = useState("");
  const [freight, setFreight] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");
  const [taxPct, setTaxPct] = useState("0");
  const [level, setLevel] = useState("0");
  const [showHeld, setShowHeld] = useState(false);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [done, setDone] = useState<any>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [p, c, s] = await Promise.all([
      fetch("/api/data?collection=products").then(r => r.json()),
      fetch("/api/data?collection=customers").then(r => r.json()),
      fetch("/api/data?collection=sales").then(r => r.json()).catch(() => []),
    ]);
    setProducts(Array.isArray(p) ? p : []); setCustomers(Array.isArray(c) ? c : []); setSales(Array.isArray(s) ? s : []);
  };

  useEffect(() => { void load(); try { const raw = localStorage.getItem("new-arif-held-bills"); if (raw) setHeldBills(JSON.parse(raw)); } catch {} }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0), [items]);
  const discountAmount = useMemo(() => subtotal * Number(discountPct || 0) / 100, [subtotal, discountPct]);
  const taxable = Math.max(0, subtotal - discountAmount + Number(freight || 0));
  const salesTaxValue = useMemo(() => taxable * Number(taxPct || 0) / 100, [taxable, taxPct]);
  const netTotal = Math.max(0, taxable + salesTaxValue);
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const paidAmount = Number(paid || 0);
  const remaining = Math.max(0, netTotal - paidAmount);
  const selectedCustomer = customers.find(c => c._id === customer);
  const currentBalance = useMemo(() => !customer ? 0 : sales.filter(s => String(s.customerId || "") === String(customer)).reduce((sum, s) => sum + Number(s.remaining || 0), 0), [customer, sales]);

  function priceForProduct(p: Product) {
    if (level === "1") return Number(p.wholesalePrice ?? p.wholesale ?? p.price ?? 0);
    if (level === "2") return Number(p.retailPrice ?? p.salePrice ?? p.price ?? 0);
    return Number(p.price ?? p.salePrice ?? p.retailPrice ?? 0);
  }
  function addProduct(p: Product) {
    const existing = items.find(item => item.productId === p._id);
    if (existing) setItems(old => old.map(item => item.productId === p._id ? { ...item, qty: Math.min(item.qty + 1, Math.max(1, Number(p.stock || 1))) } : item));
    else setItems(old => [...old, { productId: p._id, name: p.name || p.model || p.sku || "Product", qty: 1, price: priceForProduct(p), barcode: p.barcode || p.sku || "", stock: Number(p.stock || 0) }]);
    setSearch(""); setSearchOpen(false); setBarcode(""); barcodeRef.current?.focus();
  }
  function scanBarcode() {
    const value = barcode.trim().toLowerCase(); if (!value) return;
    const product = products.find(p => [p.barcode, p.sku, p.code, p.model, p.name].filter(Boolean).some((x: any) => String(x).toLowerCase() === value));
    if (product && Number(product.stock || 0) > 0) { addProduct(product); return; }
    setSearch(barcode); setSearchOpen(true);
  }
  function resetSale() {
    setItems([]); setCustomer(""); setCashRef(""); setCustRef(""); setRemarks(""); setSaleType("CASH"); setDate(new Date().toISOString().slice(0, 10)); setInvoiceNo(nextInvoice()); setBarcode(""); setSearch(""); setSearchOpen(false); setPaid(""); setFreight("0"); setDiscountPct("0"); setTaxPct("0"); setLevel("0"); setDone(null); setTimeout(() => barcodeRef.current?.focus(), 50);
  }
  function holdBill() {
    if (!items.length) return alert("Hold karne ke liye item add karein.");
    const bill: HeldBill = { id: `${Date.now()}`, invoiceNo, createdAt: new Date().toISOString(), customerId: customer, customerName: selectedCustomer?.name || "CASH SALES", items, cashRef };
    const next = [bill, ...heldBills]; setHeldBills(next); localStorage.setItem("new-arif-held-bills", JSON.stringify(next)); resetSale(); setShowHeld(true);
  }
  function resumeBill(bill: HeldBill) { setInvoiceNo(bill.invoiceNo); setCustomer(bill.customerId || ""); setCashRef(bill.cashRef || ""); setItems(bill.items || []); const next = heldBills.filter(x => x.id !== bill.id); setHeldBills(next); localStorage.setItem("new-arif-held-bills", JSON.stringify(next)); setShowHeld(false); }
  function addMiscItem() { const name = window.prompt("Misc Item name:"); if (!name) return; const price = Number(window.prompt("Rate:", "0") || 0); if (!price) return; setItems(old => [...old, { productId: null, name, qty: 1, price, isMisc: true, barcode: "" }]); }

  async function complete() {
    if (!items.length) return alert("Item select karein.");
    if (saleType === "CREDIT" && !customer) return alert("Credit Sale ke liye Customer select karein.");
    if (saleType === "CASH" && !customer && !cashRef) setCashRef("WALKING CUSTOMER");
    const sale = { invoiceNo, saleType: customer ? "customer" : "cash", type: saleType, customerId: customer || null, cashRef: cashRef || (customer ? null : "WALKING CUSTOMER"), custRef: custRef || null, remarks: remarks || null, salesman, date, items, subtotal, freight: Number(freight || 0), discountPct: Number(discountPct || 0), discountAmount, salesTaxPct: Number(taxPct || 0), salesTaxValue, grandTotal: subtotal, total: netTotal, netTotal, paid: paidAmount, remaining, paymentMethod: pay, status: remaining > 0 ? "credit" : "paid", createdAt: new Date().toISOString() };
    const response = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "sales", ...sale }) });
    const saved = await response.json(); if (!response.ok) return alert(saved.error || "Sale failed");
    for (const item of items) {
      if (!item.productId) continue;
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "stockMovements", type: "OUT", productId: item.productId, qty: item.qty, ref: invoiceNo, reason: "Sale", createdAt: new Date().toISOString() }) });
      const p = products.find(x => x._id === item.productId);
      if (p) await fetch("/api/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "products", id: p._id, stock: Math.max(0, Number(p.stock || 0) - item.qty) }) });
    }
    if (paidAmount > 0) await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "transactions", type: "IN", account: pay, amount: paidAmount, ref: invoiceNo, note: "Sale", createdAt: new Date().toISOString() }) });
    setDone(saved); await load();
  }

  function makePdf(sale: any = done) {
    const doc = new jsPDF(); let y = 16; const m = 12;
    doc.setFontSize(16); doc.text("NEW ARIF MOBILE CENTER", m, y); y += 8;
    doc.setFontSize(10); doc.text(`SALE INVOICE  |  ${sale?.invoiceNo || invoiceNo}`, m, y); y += 6;
    doc.text(`Date: ${sale?.date || date}`, m, y); y += 6; doc.text(`Customer: ${selectedCustomer?.name || sale?.customerName || sale?.cashRef || "CASH SALES"}`, m, y); y += 8;
    doc.line(m, y, 198, y); y += 6; doc.setFontSize(9);
    doc.text("Product", m, y); doc.text("Qty", 115, y); doc.text("Rate", 140, y); doc.text("Total", 175, y); y += 5;
    const list = Array.isArray(sale?.items) ? sale.items : items;
    for (const item of list) { if (y > 275) { doc.addPage(); y = 16; } const qty = Number(item.qty || 0), price = Number(item.price || 0); doc.text(String(item.name || "Product").slice(0, 48), m, y); doc.text(String(qty), 115, y); doc.text(price.toFixed(2), 140, y); doc.text((qty * price).toFixed(2), 175, y); y += 5; }
    y += 3; doc.line(m, y, 198, y); y += 7; doc.text(`Grand Total: Rs. ${Number(sale?.grandTotal ?? subtotal).toFixed(2)}`, m, y); y += 5; doc.text(`Discount: Rs. ${Number(sale?.discountAmount ?? discountAmount).toFixed(2)}`, m, y); y += 5; doc.text(`Sales Tax: Rs. ${Number(sale?.salesTaxValue ?? salesTaxValue).toFixed(2)}`, m, y); y += 5; doc.text(`Net Total: Rs. ${Number(sale?.total ?? netTotal).toFixed(2)}`, m, y); y += 5; doc.text(`Paid: Rs. ${Number(sale?.paid ?? paidAmount).toFixed(2)}`, m, y); y += 5; doc.text(`Remaining: Rs. ${Number(sale?.remaining ?? remaining).toFixed(2)}`, m, y); y += 8; doc.text("Thank you for shopping with NEW ARIF MOBILE CENTER", m, y);
    return doc;
  }
  function downloadPdf() { if (!done && !items.length) return alert("Pehle sale/item add karein."); setPdfBusy(true); try { makePdf(done || { invoiceNo, date, items, grandTotal: subtotal, discountAmount, salesTaxValue, total: netTotal, paid: paidAmount, remaining }).save(`Invoice-${done?.invoiceNo || invoiceNo}.pdf`); } finally { setPdfBusy(false); } }
  async function whatsappPdf() {
    if (!done && !items.length) return alert("Pehle sale/item add karein."); setPdfBusy(true);
    try {
      const sale = done || { invoiceNo, date, items, grandTotal: subtotal, discountAmount, salesTaxValue, total: netTotal, paid: paidAmount, remaining };
      const doc = makePdf(sale); const blob = doc.output("blob"); const file = new File([blob], `Invoice-${sale.invoiceNo || invoiceNo}.pdf`, { type: "application/pdf" });
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ title: `Invoice ${sale.invoiceNo || invoiceNo}`, text: "NEW ARIF MOBILE CENTER Invoice", files: [file] }); return; }
      doc.save(file.name); window.open(`https://wa.me/?text=${encodeURIComponent(`NEW ARIF MOBILE CENTER\nInvoice: ${sale.invoiceNo || invoiceNo}\nTotal: Rs. ${Number(sale.total || netTotal).toFixed(2)}\nPDF download ho gayi hai, WhatsApp mein attach karein.`)}`, "_blank");
    } catch (e: any) { if (e?.name !== "AbortError") alert("PDF share nahi ho saki. PDF download karke WhatsApp mein attach karein."); } finally { setPdfBusy(false); }
  }

  if (done) return <main className="shell"><div className={styles.saleWindow}><div className={styles.resultBar}><Link href="/pos">← New Record</Link><button onClick={() => window.print()}>Print Record</button><button onClick={downloadPdf}>PDF</button><button className={styles.whatsapp} onClick={whatsappPdf}>WhatsApp PDF</button></div><div className={styles.receipt}><h2>NEW ARIF MOBILE CENTER</h2><h3>SALE INVOICE</h3><p>Invoice: {done.invoiceNo}</p><p>Date: {done.date || new Date(done.createdAt).toLocaleDateString()}</p><p>Customer: {selectedCustomer?.name || done.cashRef || "WALKING CUSTOMER"}</p><hr/>{done.items?.map((i: SaleItem, n: number) => <div key={n}>{i.name} × {i.qty} — Rs. {money(i.price * i.qty)}</div>)}<hr/><b>Net Total: Rs. {money(done.total)}</b><br/>Paid: Rs. {money(done.paid)}<br/>Remaining: Rs. {money(done.remaining)}</div></div></main>;

  const visibleProducts = products.filter(p => Number(p.stock || 0) > 0 && `${p.name || ""} ${p.model || ""} ${p.sku || ""} ${p.barcode || ""} ${p.code || ""}`.toLowerCase().includes(search.toLowerCase())).slice(0, 15);
  return <main className="shell"><div className={styles.saleWindow}>
    <header className={styles.topBar}><Link href="/">← Dashboard</Link><button onClick={() => { setSearch(""); setSearchOpen(true); productInputRef.current?.focus(); }}>🔎 Show All</button><button onClick={resetSale}>➕ New Record</button><button onClick={() => window.print()}>🖨 Print Record</button><button onClick={() => { setSaleType("CREDIT"); document.getElementById("customer")?.focus(); }}>👤 Credit Customer</button><button onClick={() => { setSaleType("CASH"); setCustomer(""); setCashRef("WALKING CUSTOMER"); }}>👤 Walking Customer</button><Link href="/admin">📦 New Item</Link></header>
    <div className={styles.secondBar}><Link href="/ledger">Customer Ledger</Link><Link href="/customers">Customer List</Link><Link href="/suppliers">Supplier List</Link><Link href="/sales">Today List</Link><button onClick={() => { setSearch(""); setSearchOpen(true); productInputRef.current?.focus(); }}>🔎 Item Search</button><button onClick={() => setShowHeld(x => !x)}>👁 Hold / Hide / Show</button><button onClick={() => { setCustomer(""); setSaleType("CASH"); setCashRef("WALKING CUSTOMER"); }}>👥 Cash Customer List</button></div>
    <section className={styles.invoiceHeader}><div className={styles.leftFields}><label>Inv No:<input value={invoiceNo} readOnly/></label><label>Customer:<select id="customer" value={customer} onChange={e => { setCustomer(e.target.value); if (e.target.value) setSaleType("CREDIT"); }}><option value="">CASH SALES</option>{customers.map(c => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>)}</select></label><label>Current Balance:<input value={`Rs. ${money(currentBalance)}`} readOnly/></label><label>Cust Ref:<input value={custRef} onChange={e => setCustRef(e.target.value)}/></label><label>Remarks:<input value={remarks} onChange={e => setRemarks(e.target.value)}/></label></div><div className={styles.rightFields}><label>Date:<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Type:<select value={saleType} onChange={e => setSaleType(e.target.value)}><option>CASH</option><option>CREDIT</option><option>RETURN</option></select></label><label>Salesman:<input value={salesman} onChange={e => setSalesman(e.target.value)}/></label><div className={styles.actionRow}><button onClick={() => window.location.href="/quotations"}>Quotations</button><button onClick={addMiscItem}>Misc Items</button><button className={styles.danger} onClick={holdBill}>Hold Bill</button></div></div></section>
    <section className={styles.barcodeRow}><b>Barcode ──&gt;</b><input ref={barcodeRef} value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); scanBarcode(); } }} placeholder="Scan / enter barcode"/><button onClick={() => { setSearch(barcode); setSearchOpen(true); }}>🔎</button></section>
    {showHeld && <section className={styles.heldPanel}><b>Held Bills</b>{heldBills.length === 0 ? <span>No held bills</span> : heldBills.map(bill => <div key={bill.id} className={styles.heldRow}><span>{bill.invoiceNo} — {bill.customerName} — {bill.items.length} item(s)</span><button onClick={() => resumeBill(bill)}>Resume</button><button onClick={() => { const n=heldBills.filter(x=>x.id!==bill.id); setHeldBills(n); localStorage.setItem("new-arif-held-bills", JSON.stringify(n)); }}>Delete</button></div>)}</section>}
    <section className={styles.tableWrap}><table><thead><tr><th></th><th>S#</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Total</th><th>Del</th><th>New</th><th>Remarks</th><th>Barcode</th></tr></thead><tbody>{items.map((item,index)=><tr key={`${item.productId || "misc"}-${index}`}><td>✎</td><td>{index+1}</td><td><input ref={index===items.length-1 ? productInputRef : undefined} className={styles.productCell} value={item.name} onChange={e => { const v=e.target.value; setItems(old=>old.map((x,i)=>i===index?{...x,name:v}:x)); setSearch(v); setSearchOpen(true); }}/></td><td><input type="number" min="1" value={item.qty} onChange={e=>setItems(old=>old.map((x,i)=>i===index?{...x,qty:Math.max(1,Number(e.target.value||1))}:x))}/></td><td><input type="number" value={item.price} onChange={e=>setItems(old=>old.map((x,i)=>i===index?{...x,price:Number(e.target.value||0)}:x))}/></td><td>0</td><td>Rs. {money(item.qty*item.price)}</td><td><button className={styles.deleteBtn} onClick={()=>setItems(old=>old.filter((_,i)=>i!==index))}>✕</button></td><td><button onClick={()=>barcodeRef.current?.focus()}>＋</button></td><td><input value={item.remarks||""} onChange={e=>setItems(old=>old.map((x,i)=>i===index?{...x,remarks:e.target.value}:x))}/></td><td>{item.barcode||"-"}</td></tr>)}{!items.length && <tr><td colSpan={11} className={styles.empty}>New sale — barcode scan karein ya Product Name par click karke search karein.</td></tr>}</tbody></table>
      {searchOpen && <div className={styles.searchPopup}><div className={styles.searchHead}><input ref={productInputRef} autoFocus value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setSearchOpen(false); if(e.key==="Enter" && visibleProducts[0]) addProduct(visibleProducts[0]);}} placeholder="Search item (name / code / brand)..."/><button onClick={()=>setSearchOpen(false)}>✕</button></div><div className={styles.popupTable}><table><thead><tr><th>Code</th><th>Product Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Stock</th></tr></thead><tbody>{visibleProducts.map(p=><tr key={p._id} onClick={()=>addProduct(p)}><td>{p.code||p.sku||"-"}</td><td>{p.name||p.model||"-"}</td><td>{p.category||"-"}</td><td>{p.brand||p.make||"-"}</td><td>{money(priceForProduct(p))}</td><td>{Number(p.stock||0).toFixed(3)}</td></tr>)}{!visibleProducts.length&&<tr><td colSpan={6}>No matching stock item</td></tr>}</tbody></table></div><small>Enter = Add Item &nbsp; ↑↓ = Navigate &nbsp; Esc = Close</small></div>}
    </section>
    <section className={styles.bottomArea}><div className={styles.statusBox}><span>Status: <b>{items.length?"READY":"NEW"}</b></span><label>T.Qty:<input value={totalQty} readOnly/></label><label>Level:<select value={level} onChange={e=>setLevel(e.target.value)}><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></label></div><div className={styles.calcGrid}><label>Grand Total<input value={money(subtotal)} readOnly/></label><label>Freight<input type="number" value={freight} onChange={e=>setFreight(e.target.value)}/></label><label>Sales Tax Value<input className={styles.yellow} value={money(salesTaxValue)} readOnly/></label><label>Disc (%)<input type="number" value={discountPct} onChange={e=>setDiscountPct(e.target.value)}/></label><label>Disc Amt<input value={money(discountAmount)} readOnly/></label><label>Sales Tax %<input type="number" value={taxPct} onChange={e=>setTaxPct(e.target.value)}/></label><label>Net Total<input className={styles.netInput} value={money(netTotal)} readOnly/></label><label>Cash Rec:<input type="number" value={paid} onChange={e=>setPaid(e.target.value)}/></label></div><div className={styles.printBox}><b>Print / Export</b><div><button onClick={()=>window.print()}>🖨 Thermal</button><button onClick={()=>window.print()}>📄 A4 Print</button><button onClick={()=>window.print()}>📄 A5 Print</button><button onClick={downloadPdf} disabled={pdfBusy}>📕 PDF</button><button className={styles.whatsapp} onClick={whatsappPdf} disabled={pdfBusy}>🟢 WhatsApp PDF</button></div></div></section>
    <footer className={styles.footerBar}><button className={styles.saveBtn} onClick={complete}>💾 Save Sale</button><select value={pay} onChange={e=>setPay(e.target.value)}><option>Cash</option><option>JazzCash</option><option>Easypaisa</option><option>Raast</option><option>NayaPay</option><option>UBL</option><option>Other Bank</option></select><span>Ready</span><span>Items: {products.length}</span><span>Stock Management System</span><span>NEW ARIF MOBILE CENTER</span></footer>
  </div></main>;
}
