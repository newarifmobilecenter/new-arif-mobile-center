"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./pos.module.css";

type Product = any;
type Customer = any;
type SaleItem = {
  productId: string | null;
  name: string;
  qty: number;
  price: number;
  barcode?: string;
  remarks?: string;
  stock?: number;
  isMisc?: boolean;
};

type HeldBill = {
  id: string;
  invoiceNo: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  cashRef: string;
};

function money(value: number) {
  return Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function nextInvoice() {
  return `INV-${Date.now()}`;
}

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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandTypeFilter, setBrandTypeFilter] = useState("");
  const [pay, setPay] = useState("Cash");
  const [paid, setPaid] = useState("");
  const [freight, setFreight] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");
  const [taxPct, setTaxPct] = useState("0");
  const [level, setLevel] = useState("0");
  const [showHeld, setShowHeld] = useState(false);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [done, setDone] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [p, c, s] = await Promise.all([
      fetch("/api/data?collection=products").then((r) => r.json()).then((d:any)=>Array.isArray(d)?d:[]),
      fetch("/api/data?collection=customers").then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) { setLoadError(d?.error || "Customers load nahi ho sakay."); return []; }
        setLoadError("");
        return Array.isArray(d) ? d : [];
      }).catch(() => { setLoadError("Customers load nahi ho sakay (network)."); return []; }),
      fetch("/api/data?collection=sales").then((r) => r.json()).then((d:any)=>Array.isArray(d)?d:[]).catch(() => []),
    ]);
    setProducts(Array.isArray(p) ? p : []);
    setCustomers(Array.isArray(c) ? c : []);
    setSales(Array.isArray(s) ? s : []);
  };

  useEffect(() => {
    void load();
    try {
      const raw = localStorage.getItem("new-arif-held-bills");
      if (raw) setHeldBills(JSON.parse(raw));
    } catch {}
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    [items]
  );
  const discountAmount = useMemo(
    () => (subtotal * Number(discountPct || 0)) / 100,
    [subtotal, discountPct]
  );
  const taxable = Math.max(0, subtotal - discountAmount + Number(freight || 0));
  const salesTaxValue = useMemo(
    () => (taxable * Number(taxPct || 0)) / 100,
    [taxable, taxPct]
  );
  const netTotal = Math.max(0, taxable + salesTaxValue);
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const paidAmount = Number(paid || 0);
  const remaining = Math.max(0, netTotal - paidAmount);

  const selectedCustomer = customers.find((c) => c._id === customer);
  const currentBalance = useMemo(() => {
    if (!customer) return 0;
    const customerSales = sales.filter((s) => String(s.customerId || "") === String(customer));
    return customerSales.reduce((sum, s) => sum + Number(s.remaining || 0), 0);
  }, [customer, sales]);

  function priceForProduct(p: Product) {
    if (level === "1") return Number(p.wholesalePrice ?? p.wholesale ?? p.price ?? 0);
    if (level === "2") return Number(p.retailPrice ?? p.salePrice ?? p.price ?? 0);
    return Number(p.price ?? p.salePrice ?? p.retailPrice ?? 0);
  }

  function addProduct(p: Product) {
    const existing = items.find((item) => item.productId === p._id);
    if (existing) {
      setItems((old) =>
        old.map((item) =>
          item.productId === p._id
            ? { ...item, qty: Math.min(item.qty + 1, Math.max(1, Number(p.stock || 1))) }
            : item
        )
      );
    } else {
      setItems((old) => [
        ...old,
        {
          productId: p._id,
          name: p.name || p.model || p.sku || "Product",
          qty: 1,
          price: priceForProduct(p),
          barcode: p.barcode || p.sku || "",
          stock: Number(p.stock || 0),
        },
      ]);
    }
    setSearch("");
    setBarcode("");
    barcodeRef.current?.focus();
  }

  function scanBarcode() {
    const value = barcode.trim().toLowerCase();
    if (!value) return;
    const product = products.find((p) =>
      [p.barcode, p.sku, p.code, p.model, p.name]
        .filter(Boolean)
        .some((x: any) => String(x).toLowerCase() === value)
    );
    if (product && Number(product.stock || 0) > 0) {
      addProduct(product);
      return;
    }
    setSearch(barcode);
  }

  function resetSale() {
    setItems([]);
    setCustomer("");
    setCashRef("");
    setCustRef("");
    setRemarks("");
    setSaleType("CASH");
    setDate(new Date().toISOString().slice(0, 10));
    setInvoiceNo(nextInvoice());
    setBarcode("");
    setSearch("");
    setPaid("");
    setFreight("0");
    setDiscountPct("0");
    setTaxPct("0");
    setLevel("0");
    setDone(null);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }

  function holdBill() {
    if (!items.length) return alert("Hold karne ke liye item add karein.");
    const bill: HeldBill = {
      id: `${Date.now()}`,
      invoiceNo,
      createdAt: new Date().toISOString(),
      customerId: customer,
      customerName: selectedCustomer?.name || "CASH SALES",
      items,
      cashRef,
    };
    const next = [bill, ...heldBills];
    setHeldBills(next);
    localStorage.setItem("new-arif-held-bills", JSON.stringify(next));
    resetSale();
    setShowHeld(true);
  }

  function resumeBill(bill: HeldBill) {
    setInvoiceNo(bill.invoiceNo);
    setCustomer(bill.customerId || "");
    setCashRef(bill.cashRef || "");
    setItems(bill.items || []);
    const next = heldBills.filter((x) => x.id !== bill.id);
    setHeldBills(next);
    localStorage.setItem("new-arif-held-bills", JSON.stringify(next));
    setShowHeld(false);
  }

  function addMiscItem() {
    const name = window.prompt("Misc Item name:");
    if (!name) return;
    const price = Number(window.prompt("Rate:", "0") || 0);
    if (!price) return;
    setItems((old) => [
      ...old,
      { productId: null, name, qty: 1, price, isMisc: true, barcode: "" },
    ]);
  }

  async function complete() {
    if (!items.length) return alert("Item select karein.");
    if (saleType === "RETURN") return alert("Process returns from the Sale Returns page.");
    if (saleType === "CREDIT" && !customer) return alert("Credit Sale ke liye Customer select karein.");
    if (saleType === "CASH" && !customer && !cashRef) setCashRef("WALKING CUSTOMER");

    const sale = {
      invoiceNo,
      saleType: customer ? "customer" : "cash",
      type: saleType,
      customerId: customer || null,
      cashRef: cashRef || (customer ? null : "WALKING CUSTOMER"),
      custRef: custRef || null,
      remarks: remarks || null,
      salesman,
      date,
      items,
      subtotal,
      freight: Number(freight || 0),
      discountPct: Number(discountPct || 0),
      discountAmount,
      salesTaxPct: Number(taxPct || 0),
      salesTaxValue,
      grandTotal: subtotal,
      total: netTotal,
      netTotal,
      paid: paidAmount,
      remaining,
      paymentMethod: pay,
      status: remaining > 0 ? "credit" : "paid",
      createdAt: new Date().toISOString(),
    };

    const response = await fetch("/api/sales/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
    const saved = await response.json();
    if (!response.ok) return alert(saved.error || "Sale failed");

    setDone(saved);
    await load();
  }

  if (done) {
    return (
      <main className="shell">
        <div className="nav no-print">
          <Link href="/">← Dashboard</Link>
          <button className="btn" onClick={() => window.print()}>🖨 Print Record</button>
          <Link className="btn" href={`/invoice/${done._id}`}>Invoice Details</Link>
          <Link className="btn green" href="/pos">New Record</Link>
        </div>
        <div className="panel receipt">
          <h2 style={{ textAlign: "center" }}>NEW ARIF MOBILE CENTER</h2>
          <h3 style={{ textAlign: "center" }}>SALE INVOICE</h3>
          <div className="line" />
          <b>Invoice:</b> {done.invoiceNo}<br />
          <b>Date:</b> {done.date || new Date(done.createdAt).toLocaleDateString()}<br />
          <b>Customer:</b> {selectedCustomer?.name || done.cashRef || "WALKING CUSTOMER"}<br />
          <div className="line" />
          {done.items.map((i: SaleItem, index: number) => (
            <div key={`${i.productId || "misc"}-${index}`}>{i.name} × {i.qty} — Rs. {money(i.price * i.qty)}</div>
          ))}
          <div className="line" />
          <b>Grand Total:</b> Rs. {money(done.grandTotal || 0)}<br />
          <b>Discount:</b> Rs. {money(done.discountAmount || 0)}<br />
          <b>Sales Tax:</b> Rs. {money(done.salesTaxValue || 0)}<br />
          <b>Net Total:</b> Rs. {money(done.total || 0)}<br />
          <b>Paid:</b> Rs. {money(done.paid || 0)}<br />
          <b>Remaining:</b> Rs. {money(done.remaining || 0)}
        </div>
      </main>
    );
  }

  const visibleProducts = products.filter((p) => {
    const text = `${p.name || ""} ${p.model || ""} ${p.sku || ""} ${p.barcode || ""}`.toLowerCase();
    return Number(p.stock || 0) > 0 && text.includes(search.toLowerCase()) && (!categoryFilter || p.category === categoryFilter) && (!brandTypeFilter || p.brandType === brandTypeFilter);
  });
  const productCategories = Array.from(new Set(products.map((p) => String(p.category || "").trim()).filter(Boolean))).sort();
  const brandTypes = Array.from(new Set(products.filter((p) => !categoryFilter || p.category === categoryFilter).map((p) => String(p.brandType || "").trim()).filter(Boolean))).sort();

  return (
    <main className="shell">
      <div className={styles.saleWindow}>
        <header className={styles.topBar}>
          <Link href="/" className={styles.toolLink}>← Dashboard</Link>
          <button onClick={() => setSearch("")}>Show All</button>
          <button onClick={resetSale}>New Record</button>
          <button onClick={() => window.print()}>Print Record</button>
          <button onClick={() => { setSaleType("CREDIT"); setTimeout(() => document.getElementById("customer")?.focus(), 50); }}>Credit Customer</button>
          <button onClick={() => { setSaleType("CASH"); setCustomer(""); setCashRef("WALKING CUSTOMER"); }}>Walking Customer</button>
          <Link href="/admin" className={styles.toolLink}>New Item</Link>
        </header>

        <div className={styles.secondBar}>
          <Link href="/ledger">Customer Ledger</Link>
          <Link href="/customers">Customer List</Link>
          <Link href="/suppliers">Supplier List</Link>
          <Link href="/sales">Today List</Link>
          <button onClick={() => { barcodeRef.current?.focus(); setSearch(""); }}>Item Search</button>
          <button onClick={() => setShowHeld((x) => !x)}>Hold / Hide / Show</button>
          <button onClick={() => { setCustomer(""); setSaleType("CASH"); setCashRef("WALKING CUSTOMER"); }}>Cash Customer List</button>
        </div>

        <section className={styles.invoiceHeader}>
          <div className={styles.leftFields}>
            <label>Inv No:<input value={invoiceNo} readOnly /></label>
            {loadError && <div role="alert" style={{ color: "#ef4444", fontWeight: 700 }}>⚠ {loadError}</div>}
            <label className={styles.wide}>Customer:
              <select id="customer" value={customer} onChange={(e) => { setCustomer(e.target.value); if (e.target.value) setSaleType("CREDIT"); }}>
                <option value="">CASH SALES</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name} {c.phone ? `— ${c.phone}` : ""}</option>)}
              </select>
            </label>
            <label>Current Balance:<input value={`Rs. ${money(currentBalance)}`} readOnly /></label>
            <label>Cust Ref:<input value={custRef} onChange={(e) => setCustRef(e.target.value)} /></label>
            <label>Remarks:<input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label>
          </div>

          <div className={styles.rightFields}>
            <label>Date:<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Type:
              <select value={saleType} onChange={(e) => setSaleType(e.target.value)}>
                <option>CASH</option><option>CREDIT</option><option>RETURN</option>
              </select>
            </label>
            <label>Salesman:<input value={salesman} onChange={(e) => setSalesman(e.target.value)} /></label>
            <div className={styles.actionRow}>
              <button onClick={() => window.location.href = "/quotations"}>Quotations</button>
              <button onClick={addMiscItem}>Misc Items</button>
              <button className={styles.danger} onClick={holdBill}>Hold Bill</button>
            </div>
          </div>
        </section>

        <section className={styles.barcodeRow}>
          <b>Barcode ──&gt;</b>
          <input
            ref={barcodeRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); scanBarcode(); } }}
            placeholder="Scan / enter barcode"
          />
          <span>Date</span><input value={date} readOnly />
        </section>

        {showHeld && (
          <section className={styles.heldPanel}>
            <b>Held Bills</b>
            {heldBills.length === 0 ? <span>No held bills</span> : heldBills.map((bill) => (
              <div key={bill.id} className={styles.heldRow}>
                <span>{bill.invoiceNo} — {bill.customerName} — {bill.items.length} item(s)</span>
                <button onClick={() => resumeBill(bill)}>Resume</button>
                <button onClick={() => { const n = heldBills.filter((x) => x.id !== bill.id); setHeldBills(n); localStorage.setItem("new-arif-held-bills", JSON.stringify(n)); }}>Delete</button>
              </div>
            ))}
          </section>
        )}

        <section className={styles.productSearch}>
          <div className={styles.productFilters}>
            <label>Category<select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setBrandTypeFilter(""); }}><option value="">All Categories</option>{productCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Brand Type<select value={brandTypeFilter} onChange={(e) => setBrandTypeFilter(e.target.value)}><option value="">All Brand Types</option>{brandTypes.map((brandType) => <option key={brandType} value={brandType}>{brandType}</option>)}</select></label>
          </div>
          <input className={styles.searchInput} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Product / Model / SKU / Barcode..." />
          <div className={styles.productStrip}>
            {visibleProducts.slice(0, 12).map((p) => (
              <button key={p._id} className={styles.productButton} onClick={() => addProduct(p)}>
                <strong>{p.name || p.model}</strong>
                <span>{p.model || p.sku || ""}</span>
                <small>Stock {p.stock} · Rs. {money(priceForProduct(p))}</small>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>S#</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Total</th><th>Del</th><th>New</th><th>Remarks</th><th>Barcode</th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.productId || "misc"}-${index}`}>
                  <td>{index + 1}</td>
                  <td><b>{item.name}</b></td>
                  <td><input type="number" min="1" value={item.qty} onChange={(e) => setItems((old) => old.map((x, i) => i === index ? { ...x, qty: Math.max(1, Number(e.target.value || 1)) } : x))} /></td>
                  <td><input type="number" value={item.price} onChange={(e) => setItems((old) => old.map((x, i) => i === index ? { ...x, price: Number(e.target.value || 0) } : x))} /></td>
                  <td>0</td>
                  <td>Rs. {money(item.qty * item.price)}</td>
                  <td><button className={styles.deleteBtn} onClick={() => setItems((old) => old.filter((_, i) => i !== index))}>Delete</button></td>
                  <td><button onClick={() => barcodeRef.current?.focus()}>New</button></td>
                  <td><input value={item.remarks || ""} onChange={(e) => setItems((old) => old.map((x, i) => i === index ? { ...x, remarks: e.target.value } : x))} /></td>
                  <td>{item.barcode || "-"}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={10} className={styles.empty}>No items added. Scan a barcode or search/select a product above.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className={styles.bottomArea}>
          <div className={styles.statusBox}><i>Status:</i><strong>{items.length ? " READY" : " NEW"}</strong><span>T.Qty: <b>{totalQty}</b></span><span>Level: {level}</span></div>
          <div className={styles.calcGrid}>
            <label>Grand Total<input value={money(subtotal)} readOnly /></label>
            <label>Freight<input type="number" value={freight} onChange={(e) => setFreight(e.target.value)} /></label>
            <label>Sales Tax Value<input value={money(salesTaxValue)} readOnly /></label>
            <label>Disc (%)<input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></label>
            <label>Disc Amt<input value={money(discountAmount)} readOnly /></label>
            <label>Sales Tax %<input type="number" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} /></label>
            <label>Net Total<input className={styles.netInput} value={money(netTotal)} readOnly /></label>
            <label>Cash Rec:<input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} /></label>
            <label>Remaining<input value={money(remaining)} readOnly /></label>
            <label>Level / Price Level<select value={level} onChange={(e) => setLevel(e.target.value)}><option value="0">Level 0</option><option value="1">Level 1</option><option value="2">Level 2</option></select></label>
          </div>
        </section>

        <footer className={styles.footerBar}>
          <button onClick={complete} className={styles.saveBtn}>💾 Save Sale</button>
          <select value={pay} onChange={(e) => setPay(e.target.value)}><option>Cash</option><option>JazzCash</option><option>Easypaisa</option><option>Raast</option><option>NayaPay</option><option>UBL</option><option>Other Bank</option></select>
          <button onClick={() => window.print()}>Thermal Print</button>
        </footer>
      </div>
    </main>
  );
}
