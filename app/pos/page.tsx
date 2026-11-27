"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SearchSelect from "@/app/components/SearchSelect";
import ShareBtns from "@/app/components/ShareBtns";
import { useThermalFit } from "@/lib/thermalFit";
import Link from "next/link";
import SaleReceipt from "../components/SaleReceipt";
import CameraScanner from "../components/CameraScanner";
import styles from "./pos.module.css";
import { notify } from "@/lib/toast";
import NumInput from "../components/NumInput";
import RepairBox from "./RepairBox";

type Product = any;
type Customer = any;
type SaleItem = {
  productId: string | null;
  name: string;
  qty: number;
  price: number;
  total?: number;
  barcode?: string;
  remarks?: string;
  discountPct?: number;
  stock?: number;
  isMisc?: boolean;
  repairId?: string;
  parts?: { name: string; qty: number; cost: number; price?: number; productId?: string; extra?: boolean }[];
  itemPrice?: number; repairFee?: number; repairName?: string; repairPhone?: string;
  category?: string;
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

async function fetchNextInvoice(): Promise<string> {
  try {
    const r = await fetch("/api/counters?type=sale", { cache: "no-store" });
    const d = await r.json();
    return r.ok && d.next ? String(d.next) : "";
  } catch { return ""; }
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [repairRecords, setRepairRecords] = useState<any[]>([]);
  const [localBuys, setLocalBuys] = useState<any[]>([]);
  const [readyRepairs, setReadyRepairs] = useState<any[]>([]);
  const [holds, setHolds] = useState<Record<string, any[]>>({});
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [cashRef, setCashRef] = useState("");
  const [custRef, setCustRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [salesman, setSalesman] = useState("admin");
  const [saleType, setSaleType] = useState("CASH");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNo, setInvoiceNo] = useState("");
  const [hlp, setHlp] = useState(0);
  const [printSize, setPrintSize] = useState("");
  const [editId, setEditId] = useState("");
  const editLoaded = useRef(false);
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
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
  // Sawal wala dialog (Yes/No jaise options) — promise ke zariye jawab milta hai.
  const [dlg, setDlg] = useState<null | { title: string; text?: string; options: { label: string; cls?: string }[]; resolve: (i: number) => void }>(null);
  const askChoice = (title: string, options: { label: string; cls?: string }[], text?: string) => new Promise<number>(resolve => setDlg({ title, text, options, resolve }));
  const dlgEl = dlg ? (
    <div className={`no-print ${styles.dlgBack}`} role="dialog" aria-modal="true">
      <div className={styles.dlgBox}>
        <h3>{dlg.title}</h3>
        {dlg.text && <p>{dlg.text}</p>}
        <div className={styles.dlgBtns}>
          {dlg.options.map((o, i) => <button key={o.label} autoFocus={i === 0} className={`btn ${o.cls || ""}`} type="button" onClick={() => { const r = dlg.resolve; setDlg(null); r(i); }}>{o.label}</button>)}
        </div>
      </div>
    </div>
  ) : null;
  const [preview, setPreview] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const cutoff = Date.now() - 45 * 86400000;
    const readyList = (x: any) => Array.isArray(x) ? x.filter((r: any) => ((r.parts || []).length > 0 || Number(r.remaining || 0) > 0) && new Date(r.updatedAt || r.receivedAt || 0).getTime() >= cutoff) : [];
    fetch("/api/reservations").then((r) => r.json()).then((d: any) => setHolds(d && !d.error ? d : {})).catch(() => {});
    Promise.all([
      fetch("/api/repairs?status=READY&unbilled=1").then((r) => r.json()).catch(() => []),
      fetch("/api/repairs?status=DELIVERED&unbilled=1").then((r) => r.json()).catch(() => []),
    ]).then(([a, b]) => setReadyRepairs([...readyList(a), ...readyList(b)].sort((x: any, y: any) => String(y.updatedAt || "").localeCompare(String(x.updatedAt || ""))))).catch(() => {});
    const [p, c, s, r, lb] = await Promise.all([
      fetch("/api/data?collection=products", { cache: "no-store" }).then((r) => r.json()).then((d:any)=>Array.isArray(d)?d:[]),
      fetch("/api/data?collection=customers", { cache: "no-store" }).then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) { setLoadError(d?.error || "Customers load nahi ho sakay."); return []; }
        setLoadError("");
        return Array.isArray(d) ? d : [];
      }).catch(() => { setLoadError("Customers load nahi ho sakay (network)."); return []; }),
      fetch("/api/data?collection=sales").then((r) => r.json()).then((d:any)=>Array.isArray(d)?d:[]).catch(() => []),
      fetch("/api/repairs?status=PAYMENT_DUE").then((r) => r.json()).then((d:any)=>Array.isArray(d)?d:[]).catch(() => []),
      fetch("/api/data?collection=purchases&limit=5000").then((r) => r.json()).then((d:any)=>Array.isArray(d)?d.filter((x:any)=>x.kind==="LOCAL"):[]).catch(() => []),
    ]);
    setProducts(Array.isArray(p) ? p : []);
    setCustomers(Array.isArray(c) ? c : []);
    setSales(Array.isArray(s) ? s : []);
    setRepairRecords(Array.isArray(r) ? r : []);
    setLocalBuys(lb);
  };

  // New Item / New Customer dusre tab mein save ho to is tab par wapas aate hi lists khud refresh ho jayen (bill nahi bigarta).
  useEffect(() => {
    let last = 0;
    const refresh = () => { if (document.visibilityState === "hidden" || Date.now() - last < 1500) return; last = Date.now(); void load(); };
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
    void fetchNextInvoice().then((n) => setInvoiceNo((cur) => cur || n));
    try {
      const raw = localStorage.getItem("new-arif-held-bills");
      if (raw) setHeldBills(JSON.parse(raw));
    } catch {}
  }, []);

  function applySale(sale: any) {
    setEditId(String(sale._id));
    setInvoiceNo(String(sale.invoiceNo || ""));
    setItems(Array.isArray(sale.items) ? sale.items.map((i: any) => ({ ...i })) : []);
    setCustomer(String(sale.customerId || ""));
    setCashRef(String(sale.cashRef || ""));
    setCustRef(String(sale.custRef || ""));
    setRemarks(String(sale.remarks || ""));
    setSalesman(String(sale.salesman || "admin"));
    setSaleType(String(sale.type || "CASH"));
    if (sale.date) setDate(String(sale.date).slice(0, 10));
    setPay(String(sale.paymentMethod || "Cash"));
    setPaid(String(sale.paid ?? ""));
    setFreight(String(sale.freight ?? 0));
    setDiscountPct(String(sale.discountPct ?? 0));
    setTaxPct(String(sale.salesTaxPct ?? 0));
  }
  const [findInv, setFindInv] = useState("");
  useEffect(() => { try { const inv = new URLSearchParams(window.location.search).get("inv"); if (inv) { setFindInv(inv); void loadSaleByNo(inv); } } catch {} }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function loadSaleByNo(forced?: string) {
    const raw = (forced || findInv).trim();
    const digits = raw.replace(/\D/g, "");
    if (!raw) return alert("Invoice number likhein, jaise S009.");
    try {
      const all: any[] = await fetch("/api/data?collection=sales&limit=5000", { cache: "no-store" }).then((r) => r.json());
      const re = digits ? new RegExp(`^S0*${Number(digits)}$`, "i") : null;
      const sale = (Array.isArray(all) ? all : []).find((x: any) => (String(x.invoiceNo || "").toUpperCase() === raw.toUpperCase() || (re && re.test(String(x.invoiceNo || "")))) && x.status !== "cancelled");
      if (!sale) return alert(`Invoice ${raw.toUpperCase()} nahi mili ya cancel ho chuki hai.`);
      if (sale.kind === "OLD_BALANCE" || sale.type === "OLD_BALANCE") return alert("Ye purana balance entry hai, modify nahi ho sakti.");
      applySale(sale); setFindInv("");
    } catch { alert("Invoice load nahi hui."); }
  }

  // Modify an existing invoice: /pos?edit=<saleId>
  useEffect(() => {
    if (editLoaded.current || !sales.length) return;
    const id = new URLSearchParams(window.location.search).get("edit");
    if (!id) { editLoaded.current = true; return; }
    const sale = sales.find((x: any) => String(x._id) === id);
    editLoaded.current = true;
    if (!sale) { alert("Ye invoice nahi mili ya cancel ho chuki hai."); return; }
    applySale(sale);
  }, [sales]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    [items]
  );
  const lineDiscountAmount = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.price * Number(item.discountPct || 0) / 100, 0), [items]);
  const discountAmount = useMemo(
    () => lineDiscountAmount + ((Math.max(0, subtotal - lineDiscountAmount) * Number(discountPct || 0)) / 100),
    [subtotal, discountPct, lineDiscountAmount]
  );
  const taxable = Math.max(0, subtotal - discountAmount + Number(freight || 0));
  const salesTaxValue = useMemo(
    () => (taxable * Number(taxPct || 0)) / 100,
    [taxable, taxPct]
  );
  const netTotal = Math.max(0, taxable + salesTaxValue);
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const paidAmount = saleType === "CASH" ? netTotal : Number(paid || 0);
  const remaining = Math.max(0, netTotal - paidAmount);

  const [partQ, setPartQ] = useState<{ idx: number; q: string } | null>(null);
  const [costIdx, setCostIdx] = useState<number | null>(null);
  const costItem = useMemo(() => {
    const row: any = items[costIdx !== null && costIdx < items.length ? costIdx : items.length - 1];
    if (!row) return null;
    const prod: any = products.find((p: any) => String(p._id) === String(row.productId));
    if (row.repairId && Array.isArray(row.parts)) {
      const total = row.parts.reduce((a: number, x: any) => a + Number(x.cost || 0) * Number(x.qty || 1), 0);
      return { name: `${String(row.name || "")} (parts cost)`, cost: total, qty: 1 };
    }
    const cost = Number(prod?.costPrice ?? row.costPrice ?? 0);
    return { name: String(row.name || ""), cost, qty: Number(row.qty || 1) };
  }, [items, costIdx, products]);
  const selectedCustomer = customers.find((c) => c._id === customer);
  const [custQ, setCustQ] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [custHl, setCustHl] = useState(0);
  const custMatches = useMemo(() => {
    const tokens = custQ.toLowerCase().split(/\s+/).filter(Boolean);
    const list = tokens.length ? customers.filter((c) => { const text = `${c.name || ""} ${c.phone || ""} ${c.phoneNo || ""} ${c.mobile || ""} ${c.code || ""} ${c.city || ""}`.toLowerCase(); return tokens.every((t) => text.includes(t)); }) : customers;
    return list.slice(0, 50);
  }, [customers, custQ]);
  function pickCustomer(id: string) {
    changeCustomer(id); if (id) setSaleType("CREDIT");
    setCustOpen(false); setCustQ("");
    (document.getElementById("customer") as HTMLInputElement | null)?.blur();
  }
  // Har customer ka balance (list mein dikhane ke liye): sale baqi + repair baqi - local purchase dena baqi
  const balById = useMemo(() => {
    const m = new Map<string, number>();
    const add = (id: unknown, v: number) => { const k = String(id || ""); if (k) m.set(k, (m.get(k) || 0) + v); };
    for (const x of sales) add(x.customerId, Number(x.remaining || 0));
    for (const x of repairRecords) add(x.customerId, Number(x.remaining || 0));
    for (const x of localBuys) add(x.customerId, -Number(x.remaining || 0));
    return m;
  }, [sales, repairRecords, localBuys]);
  const balTxt = (id: unknown) => { const b = balById.get(String(id || "")) || 0; return `${b < 0 ? "-" : ""}Rs. ${money(Math.abs(b))}`; };
  const currentBalance = useMemo(() => {
    if (!customer) return 0;
    const customerSales = sales.filter((s) => String(s.customerId || "") === String(customer));
    const saleDue = customerSales.reduce((sum, s) => sum + Number(s.remaining || 0), 0);
    const repairDue = repairRecords.filter((r) => String(r.customerId || "") === String(customer)).reduce((sum, r) => sum + Number(r.remaining || 0), 0);
    const localDue = localBuys.filter((x: any) => String(x.customerId || "") === String(customer)).reduce((sum: number, x: any) => sum + Number(x.remaining || 0), 0);
    return saleDue + repairDue - localDue;
  }, [customer, sales, repairRecords, localBuys]);

  function lastSaleForProduct(productId: string, customerOverride = customer) {
    if (!customerOverride || !productId) return null;
    const customerSales = sales.filter((row) => String(row.customerId || "") === String(customerOverride)).sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
    for (const sale of customerSales) {
      const sold = (sale.items || []).find((entry: any) => String(entry.productId || "") === String(productId));
      if (sold) return { price: Number(sold.price || 0), date: sale.date || sale.createdAt };
    }
    return null;
  }

  function priceForProduct(p: Product, selectedLevel = level, customerOverride = customer) {
    if (selectedLevel === "cost") return Number(p.costPrice ?? 0);
    if (selectedLevel === "last") return lastSaleForProduct(String(p._id), customerOverride)?.price ?? Number(p.price ?? p.salePrice ?? 0);
    if (selectedLevel === "1") return Number(p.wholesalePrice ?? p.wholesale ?? p.price ?? 0);
    if (selectedLevel === "2") return Number(p.retailPrice ?? p.salePrice ?? p.price ?? 0);
    return Number(p.price ?? p.salePrice ?? p.retailPrice ?? 0);
  }

  function changeLevel(nextLevel: string) {
    setLevel(nextLevel);
    setItems(current => current.map(item => {
      const product = products.find(p => String(p._id) === String(item.productId));
      return product ? { ...item, price: priceForProduct(product, nextLevel) } : item;
    }));
  }

  function changeCustomer(nextCustomer: string) {
    setCustomer(nextCustomer);
    // Wholesale customers automatically get the wholesale rate (Level 1); anyone else goes back to retail.
    const cust = customers.find((c) => String(c._id) === String(nextCustomer));
    const wholesale = /wholesale/i.test(String(cust?.type || ""));
    if (level === "0" && wholesale) changeLevel("1");
    else if (level === "1" && !wholesale) changeLevel("0");
    if (level === "last") setItems(current => current.map(item => {
      const product = products.find(p => String(p._id) === String(item.productId));
      return product ? { ...item, price: priceForProduct(product, "last", nextCustomer) } : item;
    }));
  }

  function formatDate(value: any) {
    if (!value) return "";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString();
  }

  // Stock zero / kam ho to bhi sale ho sakti hai (stock minus mein jata hai, purchase par khud theek). Pehle English warning.
  const confirmNegative = (p: Product, extra = 1): boolean => {
    const stock = Number(p.stock || 0);
    const inCart = items.filter((i) => i.productId === p._id).reduce((n, i) => n + Number(i.qty || 0), 0);
    const after = stock - inCart - extra;
    if (after >= 0) return true;
    const nm = p.name || p.model || "This product";
    return window.confirm(`"${nm}" is out of stock (available: ${Math.max(0, stock - inCart)}).\n\nDo you want to sell it anyway?\nStock will show ${after} until you add a Purchase for it.`);
  };
  function addProduct(p: Product, forceNewLine = false) {
    const existing = items.find((item) => item.productId === p._id);
    if (existing && !forceNewLine) {
      setItems((old) =>
        old.map((item) =>
          item.productId === p._id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );
    } else {
      setItems((old) => [
        ...old,
        {
          productId: p._id,
          category: String(p.category || ""),
          name: p.name || p.model || p.sku || "Product",
          qty: 1,
          price: priceForProduct(p),
          barcode: p.barcode || p.sku || "",
          stock: Number(p.stock || 0),
          discountPct: 0,
        },
      ]);
    }
    setSearch("");
    setSearchOpen(true);
    setShowAllProducts(false);
    setBarcode("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function scanBarcode(code?: string) {
    const value = (code ?? barcode).trim().toLowerCase();
    if (!value) return;
    const product = products.find((p) =>
      [p.barcode, p.sku, p.code, p.model, p.name]
        .filter(Boolean)
        .some((x: any) => String(x).toLowerCase() === value)
    );
    if (product) {
      if (holdGuard(product) && confirmNegative(product)) addProduct(product);
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
    setEditId("");
    setInvoiceNo("");
    void fetchNextInvoice().then(setInvoiceNo);
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

  function showTemporaryBill() {
    if (!items.length) return alert("Pehle item select karein.");
    setPreview({
      saleType: customer ? "customer" : "cash", priceLevel: level, type: saleType, cashRef: cashRef || (customer ? null : "WALKING CUSTOMER"), date,
      items: items.map((i) => ({ ...i, total: Number(i.qty || 0) * Number(i.price || 0) * (1 - Number(i.discountPct || 0) / 100) })),
      subtotal, discountAmount, salesTaxValue, grandTotal: subtotal, total: netTotal, netTotal, paid: paidAmount, remaining, paymentMethod: pay, createdAt: new Date().toISOString(),
      ...(customer ? { prevBalance: currentBalance } : {}),
    });
  }
  const savingRef = useRef(false);
  async function complete() {
    if (savingRef.current) return;
    savingRef.current = true;
    try { await completeInner(); } finally { savingRef.current = false; }
  }
  async function completeInner() {
    if (!items.length) return alert("Item select karein.");
    if (saleType === "RETURN") return alert("Process returns from the Sale Returns page.");
    if (saleType === "CREDIT" && !customer) return alert("Credit Sale ke liye Customer select karein.");
    if (saleType === "CASH" && !customer && !cashRef) setCashRef("WALKING CUSTOMER");

    // Repair ka bill ho to pooch lein: customer ne payment kar di ya baqi hai.
    let forcePaid: boolean | null = null;
    let custId: string = customer;
    if (items.some((it: any) => it.repairId)) {
      const a = await askChoice("Repair ki payment?", [{ label: "✅ Payment mil gayi (Paid)", cls: "green" }, { label: "⏳ Remaining / Baqi" }], "Customer ne repair ki payment kar di hai ya baqi hai?");
      forcePaid = a === 0;
      // Walking customer: khata/customer nahi banta. Baqi sirf Notebook > Repair Khata mein dikhta hai.
      if (!forcePaid && !custId) notify("Walking customer: baqi Notebook > Repair Khata mein dikhega (customer nahi banega).", { kind: "success" });
    }
    // Remaining chunne par: agar Cash Rec poora bill hai (galti se Paid hua tha) to 0 maane, warna jo likha hai wohi (partial).
    const paidNow = forcePaid === true ? netTotal : forcePaid === false ? (Number(paid || 0) >= netTotal ? 0 : Number(paid || 0)) : paidAmount;
    const remainingNow = Math.max(0, netTotal - paidNow);

    const sale = {
      invoiceNo,
      saleType: custId ? "customer" : "cash",
      priceLevel: level,
      type: forcePaid === false ? "CREDIT" : saleType,
      customerId: custId || null,
      cashRef: cashRef || (custId ? null : "WALKING CUSTOMER"),
      custRef: custRef || null,
      remarks: remarks || null,
      salesman,
      date,
      items,
      subtotal,
      freight: Number(freight || 0),
      discountPct: Number(discountPct || 0),
      discountAmount,
      lineDiscountAmount,
      salesTaxPct: Number(taxPct || 0),
      salesTaxValue,
      grandTotal: subtotal,
      total: netTotal,
      netTotal,
      paid: paidNow,
      remaining: remainingNow,
      paymentMethod: pay,
      status: remainingNow > 0 ? "credit" : "paid",
      createdAt: new Date().toISOString(),
    };

    const response = await fetch(editId ? "/api/sales/modify" : "/api/sales/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editId ? { ...sale, saleId: editId } : sale),
    });
    const saved = await response.json();
    if (!response.ok) return alert(saved.error || "Sale failed");

    let doPrint = !!printSize;
    if (!printSize) {
      const pr = await askChoice("Invoice print karna hai?", [{ label: "Yes (Print)", cls: "green" }, { label: "No" }], "Do You Want To Print Invoice?");
      if (pr === 0) { doPrint = true; setPrintSize("thermal"); }
    }
    setDone(editId ? { ...sale, ...saved, invoiceNo: saved.invoiceNo || sale.invoiceNo } : { ...sale, ...saved });
    await load();
    if (doPrint) await new Promise<void>(res => { const f = () => { window.removeEventListener("afterprint", f); res(); }; window.addEventListener("afterprint", f); window.setTimeout(f, 120000); });
    const nw = await askChoice("Naya invoice banana hai?", [{ label: "Yes (New Invoice)", cls: "green" }, { label: "No" }], "Do You Want To Make New Invoice?");
    if (nw === 0) window.location.assign("/pos");
  }

  const completeRef = useRef(complete); completeRef.current = complete;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); void completeRef.current(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useThermalFit(".receipt", "saleReceiptPage", 72, !!(done || preview) && printSize !== "a4" && printSize !== "a5");
  useEffect(() => { if (done && printSize) { const t = window.setTimeout(() => window.print(), 400); return () => window.clearTimeout(t); } }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return (
      <main className="shell">
        {dlgEl}
        {printSize === "a4" && <style>{`@media print{@page{size:A4;margin:12mm}.receipt{width:100%!important;max-width:none!important}}`}</style>}
        {printSize === "a5" && <style>{`@media print{@page{size:A5;margin:10mm}.receipt{width:100%!important;max-width:none!important}}`}</style>}
        <div className="nav no-print">
          <Link href="/">← Dashboard</Link>
          <button className="btn" onClick={() => window.print()}>🖨 Print Record</button>
          <ShareBtns target=".receipt" name={`Invoice-${done.invoiceNo || "sale"}`} className="btn" white={false} />
          <Link className="btn" href={`/invoice/${done._id}`}>Invoice Details</Link>
          <Link className="btn green" href="/pos">New Record</Link>
        </div>
        <SaleReceipt sale={done} customerName={selectedCustomer?.name} customerPhone={selectedCustomer?.phone} thermal={printSize !== "a4" && printSize !== "a5"} />
      </main>
    );
  }

  if (preview) {
    return (
      <main className="shell">
        <div className="nav no-print">
          <button className="btn" onClick={() => setPreview(null)}>← Wapis Sale</button>
          <button className="btn" onClick={() => window.print()}>🖨 Thermal Print</button>
          <button className="btn green" onClick={() => { setPreview(null); void complete(); }}>✅ Confirm &amp; Save Sale</button>
        </div>
        <SaleReceipt sale={preview} customerName={selectedCustomer?.name} customerPhone={selectedCustomer?.phone} thermal temporary />
      </main>
    );
  }

  const visibleProducts = products.filter((p) => {
    const text = `${p.name || ""} ${p.model || ""} ${p.sku || ""} ${p.barcode || ""} ${p.code || ""} ${p.brand || ""}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (!categoryFilter || p.category === categoryFilter) && (!brandTypeFilter || p.brandType === brandTypeFilter);
  });
  // Parts promised to repairs: HARD (fitted on Ready/Delivered mobile) cannot be sold; SOFT (repair in progress) asks first.
  const holdGuard = (p: Product): boolean => {
    const hs = holds[String(p._id)] || [];
    if (!hs.length) return true;
    const stock = Number(p.stock || 0);
    const inCartQty = items.filter((i) => i.productId === p._id).reduce((n, i) => n + Number(i.qty || 0), 0);
    const hard = hs.filter((h) => h.state === "HARD");
    const soft = hs.filter((h) => h.state === "SOFT");
    const hardQty = hard.reduce((n, h) => n + Number(h.qty || 0), 0);
    const softQty = soft.reduce((n, h) => n + Number(h.qty || 0), 0);
    const who = (list: any[]) => list.map((h) => `${h.token} (${h.customerName || h.model})`).join(", ");
    if (stock - hardQty - inCartQty < 1) {
      notify(`${p.name || p.model}: ${who(hard)} pe lagi hui hai. Is ka bill New Sale ke Repair box se hoga, alag sale nahi ho sakti.`, { title: "Part mobile pe lagi hui hai", kind: "danger" });
      return false;
    }
    if (softQty > 0 && stock - hardQty - softQty - inCartQty < 1) {
      return window.confirm(`${p.name || p.model}: stock ${stock} hai, lekin ${who(soft)} repair mein lagana hai.\n\nPhir bhi sale karein?`);
    }
    return true;
  };
  // Repair line ka total = parts ke rate + repair fee. keepTotal: total wahi rakho (fee baqi raqam utha le).
  const rebuildRepair = (x: SaleItem, parts: any[], opts: { keepTotal?: boolean; fee?: number } = {}): SaleItem => {
    const sum = parts.reduce((a, q) => a + Number(q.price || 0) * Number(q.qty || 1), 0);
    const fee = opts.fee !== undefined ? Math.max(0, opts.fee) : opts.keepTotal ? Math.max(0, Number(x.price || 0) - sum) : Number(x.repairFee || 0);
    return { ...x, parts, itemPrice: sum, repairFee: fee, price: sum + fee };
  };
  const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
  const findCustomerByRepair = (name: unknown, phone: unknown) => {
    const d = digits(phone);
    if (d.length >= 7) return customers.find((c: any) => [c.phoneNo, c.phone, c.mobile].some((x) => digits(x) === d));
    return undefined;
  };
  const addRepairToSale = (r: any) => {
    if (items.some((i) => i.repairId === String(r._id))) return;
    const baqi = Math.max(0, Number(r.totalBill || 0) - Number(r.paid || 0));
    // Repair mein lage har product ko alag line mein (naam, qty, cost) rakhein.
    const parts = (r.parts || []).filter((x: any) => x && x.name).map((x: any) => {
      const prod: any = products.find((p: any) => String(p._id) === String(x.productId));
      return { name: String(x.name), qty: Math.max(1, Number(x.qty || 1)), cost: Number(prod?.costPrice || 0), price: Number(prod?.price ?? prod?.salePrice ?? prod?.retailPrice ?? 0), ...(prod ? { productId: String(prod._id) } : {}) };
    });
    const sum0 = parts.reduce((a: number, q: any) => a + q.price * q.qty, 0);
    // Bill hamesha repair ka BAQI (total - advance) hota hai. Parts ki retail qeemat zyada bhi ho to bill us se barha nahi sakte (advance dobara gina jata).
    const base = baqi < sum0 ? { price: baqi, itemPrice: baqi, repairFee: 0 } : { price: baqi, itemPrice: sum0, repairFee: baqi - sum0 };
    setItems((old) => [...old, { productId: null, name: `Repair ${r.tokenNo} · ${r.model}`, parts, ...base, repairName: String(r.customerName || ""), repairPhone: String(r.customerPhone || ""), qty: 1, category: "Repair", isMisc: true, barcode: r.tokenNo, remarks: [r.fault, r.remarks].filter(Boolean).join(" · ").slice(0, 120), repairId: String(r._id) }]);
    if (r.customerId && !customer) { changeCustomer(String(r.customerId)); }
    else if (!r.customerId && !customer) { const f = findCustomerByRepair(r.customerName, r.customerPhone); if (f) changeCustomer(String(f._id)); }
    notify(`${r.tokenNo} sale mein add ho gayi (baqi Rs. ${money(baqi)}).`, { kind: "success" });
  };
  const pickProduct = (p: Product) => {
    if (!holdGuard(p)) return;
    if (!confirmNegative(p)) return;
     const at = items.length; addProduct(p, true); setHlp(0); setSearch(""); window.setTimeout(() => (document.querySelector(`[data-qrow="${at}"]`) as HTMLElement | null)?.focus(), 40); };
  const productCategories = Array.from(new Set(products.map((p) => String(p.category || "").trim()).filter(Boolean))).sort();
  const brandTypes = Array.from(new Set(products.filter((p) => !categoryFilter || p.category === categoryFilter).map((p) => String(p.brandType || "").trim()).filter(Boolean))).sort();

  return (
    <main className="shell">
      {dlgEl}
      <div className={styles.saleWindow}>
        <header className={styles.topBar}>
          <Link href="/" className={styles.toolLink}>← Dashboard</Link>
          <button onClick={() => { setSearch(""); setSearchOpen(true); setShowAllProducts(true); searchRef.current?.focus(); }}>Show All</button>
          <button onClick={resetSale}>New Record</button>
          <button onClick={showTemporaryBill}>Print Record</button>
          <button onClick={() => { setSaleType("CREDIT"); setTimeout(() => document.getElementById("customer")?.focus(), 50); }}>Credit Customer</button>
          <button onClick={() => { setSaleType("CASH"); setCustomer(""); setCashRef("WALKING CUSTOMER"); }}>Walking Customer</button>
          <Link href="/customers" target="arifNewParty" rel="noopener" className={styles.toolLink}>👤 Add Customer</Link>
          <Link href="/admin" target="arifNewItem" rel="noopener" className={styles.toolLink}>📦 New Product</Link>
          <Link href="/product-cost" className={styles.toolLink}>Change Product Cost</Link>
          <Link href="/vouchers" className={styles.toolLink}>Vouchers / Collect Due</Link>
          <Link href="/purchases" className={styles.toolLink}>Purchase</Link>
          <Link href="/sales/returns" className={styles.toolLink}>Sale Return</Link>
        </header>

        <div className={styles.secondBar}>
          <Link href="/ledger">Customer Ledger</Link>
          <Link href="/customers" target="arifNewParty" rel="noopener">Customer List</Link>
          <Link href="/suppliers" target="arifNewParty" rel="noopener">Supplier List</Link>
          <Link href="/sales">Today List</Link>
          <button onClick={() => { barcodeRef.current?.focus(); setSearch(""); }}>Item Search</button>
          <button onClick={() => setShowHeld((x) => !x)}>Hold / Hide / Show</button>
          <button onClick={() => { setCustomer(""); setSaleType("CASH"); setCashRef("WALKING CUSTOMER"); }}>Cash Customer List</button>
        </div>

        <section className={styles.invoiceHeader}>
          <div className={styles.leftFields}>
            <label>Inv No:<input value={invoiceNo} readOnly /></label>
            {!editId && <label className={styles.modBox}>✎ Sale Modify:<input value={findInv} placeholder="Old Invoice No (S009)" onChange={(e) => setFindInv(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void loadSaleByNo(); } }} /><button type="button" onClick={() => void loadSaleByNo()}>Load</button></label>}
            {editId && <div role="status" style={{ color: "#fbbf24", fontWeight: 700 }}>✎ Modify mode: {invoiceNo} — <a href="/pos" style={{ color: "#22d3ee" }}>edit cancel</a></div>}
            {loadError && <div role="alert" style={{ color: "#ef4444", fontWeight: 700 }}>⚠ {loadError}</div>}
            <label className={`${styles.wide} ${styles.custBox}`}>Customer:
              <input id="customer" autoComplete="off" value={custOpen ? custQ : (selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.phone ? ` — ${selectedCustomer.phone}` : ""} — ${balTxt(selectedCustomer._id)}` : "CASH SALES")}
                placeholder="Naam / phone likh kar search karein"
                onFocus={(e) => { setCustQ(""); setCustOpen(true); setCustHl(0); e.currentTarget.select(); }}
                onBlur={() => window.setTimeout(() => setCustOpen(false), 160)}
                onChange={(e) => { setCustQ(e.target.value); setCustOpen(true); setCustHl(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setCustHl((h) => Math.min(custMatches.length, h + 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setCustHl((h) => Math.max(0, h - 1)); }
                  else if (e.key === "Enter") { e.preventDefault(); pickCustomer(custHl === 0 ? "" : String(custMatches[custHl - 1]?._id || "")); }
                  else if (e.key === "Escape") setCustOpen(false);
                }} />
              {custOpen && <div className={styles.custList} role="listbox">
                <button type="button" className={`${styles.custOpt} ${custHl === 0 ? styles.custOn : ""}`} onMouseDown={(e) => { e.preventDefault(); pickCustomer(""); }}>CASH SALES</button>
                {custMatches.map((c, i) => <button type="button" key={c._id} className={`${styles.custOpt} ${custHl === i + 1 ? styles.custOn : ""}`} onMouseDown={(e) => { e.preventDefault(); pickCustomer(String(c._id)); }}>{c.name}{c.phone ? ` — ${c.phone}` : ""} — {balTxt(c._id)}</button>)}
                {!custMatches.length && custQ.trim() && <div className={styles.custNone}>Koi customer nahi mila</div>}
              </div>}
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
        <RepairBox repairs={readyRepairs} inCart={new Set(items.map((i) => String(i.repairId || "")).filter(Boolean))} onAdd={addRepairToSale} onChanged={load} />
        </section>

        <section className={styles.barcodeRow}>
          <b>Barcode ──&gt; <button type="button" title="Camera se scan" onClick={() => setCamOpen(true)} style={{ padding: "4px 8px" }}>📷</button> {camOpen && <CameraScanner onScan={(c) => scanBarcode(c)} onClose={() => setCamOpen(false)} />}</b>
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
            <label>Category<SearchSelect value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setBrandTypeFilter(""); }} emptyLabel="All Categories" options={productCategories} /></label>
            <label>Brand Type<SearchSelect value={brandTypeFilter} onChange={setBrandTypeFilter} emptyLabel="All Brand Types" options={brandTypes} /></label>
          </div>
        </section>

        <div className={styles.splitWrap}>
        <section className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>S#</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Total</th><th>Del</th><th>New</th><th>Remarks</th><th>Barcode</th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.productId || "misc"}-${index}`} onFocusCapture={() => setCostIdx(index)} onClick={() => setCostIdx(index)}>
                  <td>{index + 1}</td>
                  <td><b className={styles.nmEll} title={item.name}>{item.name}</b>{item.repairId && <div style={{ margin: "4px 0" }}>
                    <input placeholder="➕ Repair mein lagi cheez add karein (panel, flex…)" value={partQ?.idx === index ? partQ.q : ""} onChange={(e) => setPartQ({ idx: index, q: e.target.value })} style={{ width: "100%", fontSize: 12 }} />
                    {partQ?.idx === index && partQ.q.trim().length >= 2 && products.filter((p: any) => `${p.name || p.model} ${p.code ?? p.sku ?? ""}`.toLowerCase().includes(partQ.q.trim().toLowerCase())).slice(0, 6).map((p: any) => <div key={p._id} style={{ fontSize: 12, padding: "3px 6px", cursor: "pointer", background: "#14203d" }} onClick={() => {
                      if (Number(p.stock || 0) <= 0 && !window.confirm(`"${p.name || p.model}" is out of stock.\n\nDo you want to use it anyway? Stock will go negative until you add a Purchase.`)) return;
                      setItems((old) => old.map((x, i) => i === index ? rebuildRepair(x, [...(x.parts || []), { name: String(p.name || p.model), qty: 1, cost: Number(p.costPrice || 0), price: Number(p.price ?? p.salePrice ?? p.retailPrice ?? 0), productId: String(p._id), extra: true }], { keepTotal: true }) : x));
                      setPartQ(null);
                    }}>{p.name || p.model} <span style={{ color: "#9fb3d9" }}>· stock {Number(p.stock || 0)}</span></div>)}
                  </div>}{item.repairId && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "4px 0", padding: "4px 6px", border: "1px dashed #4b5d8a", borderRadius: 8, fontSize: 12 }} title="Internal only - receipt par nahi chhapta"><span>🔒 Item Price</span>{(item.parts || []).length > 0 ? <b>Rs. {money(Number(item.itemPrice || 0))}</b> : <span style={{ width: 90, display: "inline-block" }}><NumInput value={item.itemPrice || 0} onValue={(v) => setItems((old) => old.map((x, i) => i === index ? { ...x, itemPrice: v, price: v + Number(x.repairFee || 0) } : x))} /></span>}<span>+ Repair Fee</span><span style={{ width: 90, display: "inline-block" }}><NumInput value={item.repairFee || 0} onValue={(v) => setItems((old) => old.map((x, i) => i === index ? { ...x, repairFee: v, price: Number(x.itemPrice || 0) + v } : x))} /></span><span>= Rs. {money(Number(item.itemPrice || 0) + Number(item.repairFee || 0))}</span><small style={{ color: "#9fb3d9" }}>(customer ko show nahi hota)</small></div>}{Array.isArray((item as any).parts) && (item as any).parts.map((x: any, i: number) => <div key={i} style={{ fontSize: 12, color: "#9fb3d9" }}>↳ {x.name} × {x.qty}{x.extra && <button type="button" title="Hata dein" style={{ marginLeft: 6 }} onClick={() => setItems((old) => old.map((it, k) => k === index ? rebuildRepair(it, (it.parts || []).filter((_: any, j: number) => j !== i), { keepTotal: true }) : it))}>✖</button>}{Number(x.cost) > 0 ? ` · cost Rs. ${money(Number(x.cost) * Number(x.qty))}` : ""}{item.repairId && <span style={{ marginLeft: 8 }}>· Rate Rs. <span style={{ width: 80, display: "inline-block" }}><NumInput value={Number(x.price || 0)} onValue={(v) => setItems((old) => old.map((it, k) => k === index ? rebuildRepair(it, (it.parts || []).map((q: any, j: number) => j === i ? { ...q, price: v } : q)) : it))} /></span></span>}</div>)}</td>
                  <td><NumInput data-qrow={index} min="1" value={item.qty} emptyValue={1} onValue={(v) => { const q = Math.max(1, v); const it = items[index]; const pr = it?.productId ? products.find((x: any) => String(x._id) === String(it.productId)) : null; if (pr && q > Number(it.qty || 0)) { const others = items.reduce((n, x, i) => i !== index && x.productId === it.productId ? n + Number(x.qty || 0) : n, 0); if (Number(pr.stock || 0) - others - q < 0 && Number(pr.stock || 0) - others - Number(it.qty || 0) >= 0) notify(`"${it.name}": quantity is more than stock (${Number(pr.stock || 0)}). Stock will go negative.`, { title: "Out of stock", kind: "warning" }); } setItems((old) => old.map((x, i) => i === index ? { ...x, qty: q } : x)); }} /></td>
                  <td><NumInput value={item.price} onValue={(v) => setItems((old) => old.map((x, i) => i === index ? { ...x, price: v } : x))} /></td>
                  <td><NumInput onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); searchRef.current?.focus(); } }} aria-label={`${item.name} discount percent`} min="0" max="100" value={item.discountPct || 0} onValue={(v) => setItems(old => old.map((x,i)=>i===index?{...x,discountPct:Math.min(100,Math.max(0,v))}:x))}/></td>
                  <td>Rs. {money(item.qty * item.price * (1 - Number(item.discountPct || 0) / 100))}</td>
                  <td><button className={styles.deleteBtn} onClick={() => setItems((old) => old.filter((_, i) => i !== index))}>Delete</button></td>
                  <td><button type="button" title="Nayi line" onClick={() => { setSearch(""); requestAnimationFrame(() => searchRef.current?.focus()); }}>＋</button></td>
                  <td><input value={item.remarks || ""} onChange={(e) => setItems((old) => old.map((x, i) => i === index ? { ...x, remarks: e.target.value } : x))} /></td>
                  <td>{item.barcode || "-"}</td>
                </tr>
              ))}
              <tr className={styles.entryRow}><td>{items.length + 1}</td><td><input ref={searchRef} className={styles.entryInput} data-sn="1" value={search} onFocus={() => { setSearchOpen(true); setHlp(0); }} onBlur={() => setSearchOpen(false)} onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); setShowAllProducts(false); setHlp(0); }} onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); setHlp(h => Math.min(visibleProducts.length - 1, h + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHlp(h => Math.max(0, h - 1)); } else if (e.key === "Escape") { setSearchOpen(false); } else if (e.key === "Enter") { e.preventDefault(); const match = visibleProducts[hlp] || visibleProducts[0]; if (match) pickProduct(match); else if (barcode.trim()) scanBarcode(); } }} placeholder="product naam / code likhein ya yahan click karein" /></td><td></td><td></td><td></td><td></td><td></td><td><button type="button" title="Nayi line" onClick={() => searchRef.current?.focus()}>＋</button></td><td></td><td></td></tr>
            </tbody>
          </table>
        </section>
        {searchOpen && <aside className={styles.pickerPane}>
          <table><thead><tr><th>Code</th><th>Product Name</th><th>Category</th><th>Brand</th><th>Stock</th><th>Rate</th><th>Cost</th><th>Last Level</th></tr></thead>
            <tbody>{visibleProducts.slice(0, 80).map((p, pi) => { const last = lastSaleForProduct(String(p._id)); const zero = Number(p.stock || 0) <= 0; return <tr key={p._id} ref={pi === hlp ? (el => el?.scrollIntoView({ block: "nearest" })) : undefined} className={`${styles.pickRow} ${zero ? styles.zeroRow : ""} ${pi === hlp ? styles.pickOn : ""}`} onMouseDown={e => { e.preventDefault(); pickProduct(p); }}>
              <td>{p.code ?? p.sku ?? ""}</td><td><span className={styles.nmEll} title={String(p.name || p.model || "")}>{p.name || p.model}</span>{zero ? " ⚠ STOCK ZERO" : ""}{(holds[String(p._id)] || []).map((h: any) => <span key={h.repairId} className={h.state === "HARD" ? styles.tagHard : styles.tagSoft}> {h.state === "HARD" ? "🔒" : "🔧"} {h.token}</span>)}</td><td>{p.category}</td><td>{p.brand}</td><td>{Number(p.stock || 0)}</td><td>{money(priceForProduct(p))}</td><td>{money(Number(p.costPrice || 0))}</td><td>{last ? `${money(last.price)} ${formatDate(last.date)}` : "—"}</td></tr>; })}
              {!visibleProducts.length && <tr><td colSpan={8}>Koi product nahi mila.</td></tr>}</tbody></table>
        </aside>}
        </div>

        <section className={styles.bottomArea}>
          <div className={styles.statusBox}><i>Status:</i><strong>{items.length ? " READY" : " NEW"}</strong><span>T.Qty: <b>{totalQty}</b></span><span className={styles.costBox}>Cost: <b>{costItem ? `Rs. ${money(costItem.cost)}` : "—"}</b>{costItem ? <small title={costItem.name}> {String(costItem.name).length > 24 ? `${String(costItem.name).slice(0, 24)}…` : costItem.name}{costItem.qty > 1 ? ` · ${costItem.qty} × = Rs. ${money(costItem.cost * costItem.qty)}` : ""}</small> : null}</span><span>Price: {level === "cost" ? "Purchase Cost" : level === "last" ? "Customer Last Level" : `Level ${level}`}</span></div>
          <div className={styles.calcGrid}>
            <label>Grand Total<input value={money(subtotal)} readOnly /></label>
            <label>Freight<input type="number" value={freight} onChange={(e) => setFreight(e.target.value)} /></label>
            <label>Sales Tax Value<input value={money(salesTaxValue)} readOnly /></label>
            <label>Disc (%)<input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></label>
            <label>Disc Amt<input value={money(discountAmount)} readOnly /></label>
            <label>Sales Tax %<input type="number" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} /></label>
            <label>Net Total<input className={styles.netInput} value={money(netTotal)} readOnly /></label>
            <label>Cash Rec:<input type="number" value={saleType === "CASH" ? String(Math.round(netTotal * 100) / 100) : paid} readOnly={saleType === "CASH"} title={saleType === "CASH" ? "CASH sale: poora paisa mil gaya" : ""} onChange={(e) => setPaid(e.target.value)} /></label>
            <label>Remaining<input value={money(remaining)} readOnly /></label>
            <label>Level / Price Level<select value={level} onChange={(e) => changeLevel(e.target.value)}><option value="0">Level 0 · Retail</option><option value="1">Level 1 · Wholesale</option><option value="2">Level 2 · Retail Price</option><option value="cost">Level 3 · Purchase Cost</option><option value="last">Last Level · This Customer</option></select></label>
          </div>
        </section>

        <footer className={styles.footerBar}>
          <button onClick={complete} className={styles.saveBtn}>💾 Save Sale</button>
          <select value={pay} onChange={(e) => setPay(e.target.value)}><option>Cash</option><option>JazzCash</option><option>Easypaisa</option><option>Raast</option><option>NayaPay</option><option>UBL</option><option>Other Bank</option></select>
          <button onClick={showTemporaryBill}>🧾 Temporary Bill (Thermal)</button>
          <fieldset className={styles.printSel}><legend>Print after save</legend>{[["A4", "a4"], ["A5", "a5"], ["Thermal", "thermal"]].map(([label, v]) => <label key={v}><input type="checkbox" checked={printSize === v} onChange={e => setPrintSize(e.target.checked ? v : "")} /> {label}</label>)}</fieldset>
          <span className={styles.hint}>Ctrl+S = Save · Enter = agla field · ↑↓ = product chunein</span>
        </footer>
      </div>
    </main>
  );
}
