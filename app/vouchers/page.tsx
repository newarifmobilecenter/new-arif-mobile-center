"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";
import { printVoucher, voucherBody, VOUCHER_CSS } from "../../lib/voucherPrint";

const ACCOUNTS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Bank", "Other"];
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const localDay = (v: unknown) => { const d = v ? new Date(v as string) : null; if (!d || isNaN(+d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const today = () => localDay(new Date());
const TABS = [["due", "Customer se Wasooli"], ["walk", "Walking Customer"], ["gen", "Receive / Pay"], ["owner", "Owner Cash Out"], ["pay", "Supplier / Party ko Payment"], ["old", "Purana Baqi (Old Pending)"]] as const;
type Tab = (typeof TABS)[number][0];
const KIND_NAME: Record<string, string> = { CUSTOMER_RECEIVE: "Customer Wasooli", WALKING_RECEIVE: "Walking Customer", RECEIVE: "Receive", PAY: "Pay", OWNER_PAY: "Owner Cash Out", SUPPLIER_PAY: "Supplier Payment", PARTY_PAY: "Party Payment", OLD_BALANCE_CUSTOMER: "Purana Baqi (Customer)", OLD_BALANCE_SUPPLIER: "Purana Baqi (Supplier)" };

export default function Vouchers() {
  const [tab, setTab] = useState<Tab>("due");
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [walking, setWalking] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [account, setAccount] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState("");
  const [walkId, setWalkId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [genType, setGenType] = useState<"IN" | "OUT">("IN");
  const [partyKind, setPartyKind] = useState<"supplier" | "customer">("supplier");
  const [partyId, setPartyId] = useState("");
  const [oldKind, setOldKind] = useState<"customer" | "supplier">("customer");
  const [oldId, setOldId] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const [last, setLast] = useState<any>(null);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const load = async () => {
    const [v, c, s, p, r, sp, w] = await Promise.all([
      fetch("/api/data?collection=vouchers&limit=300").then(arr), fetch("/api/data?collection=customers&limit=5000").then(arr),
      fetch("/api/data?collection=sales&limit=5000").then(arr), fetch("/api/data?collection=purchases&limit=5000").then(arr),
      fetch("/api/repairs?status=PAYMENT_DUE").then(arr).catch(() => []), fetch("/api/data?collection=suppliers&limit=5000").then(arr), fetch("/api/walking").then(arr),
    ]);
    setVouchers(v); setCustomers(c); setSales(s); setPurchases(p); setRepairs(r); setSuppliers(sp); setWalking(w);
  };
  useEffect(() => {
    void load();
    try {
      const q = new URLSearchParams(window.location.search);
      const t = q.get("tab") as Tab; if (TABS.some(([k]) => k === t)) setTab(t);
      if (q.get("walking")) setWalkId(q.get("walking") || "");
      if (q.get("customer")) setCustomerId(q.get("customer") || "");
      const ap = window.localStorage.getItem("voucherAutoPrint"); if (ap !== null) setAutoPrint(ap === "1");
    } catch {}
  }, []);
  useEffect(() => { setMsg(null); }, [tab]);

  const dues = useMemo(() => customers.map((c) => ({ ...c, due: sales.filter((x) => String(x.customerId || "") === String(c._id)).reduce((a, x) => a + Number(x.remaining || 0), 0) + repairs.filter((x) => String(x.customerId || "") === String(c._id)).reduce((a, x) => a + Number(x.remaining || 0), 0) })).filter((c) => c.due > 0), [customers, sales, repairs]);
  const walkDue = useMemo(() => walking.filter((w) => Number(w.balance) > 0), [walking]);
  const supDue = useMemo(() => suppliers.map((s) => ({ ...s, due: purchases.filter((p) => String(p.supplierId || "") === String(s._id)).reduce((a, p) => a + Number(p.remaining || 0), 0) })).filter((s) => s.due > 0), [suppliers, purchases]);
  const custPayable = useMemo(() => customers.map((c) => ({ ...c, due: purchases.filter((p) => p.kind === "LOCAL" && String(p.customerId || "") === String(c._id)).reduce((a, p) => a + Number(p.remaining || 0), 0) })).filter((c) => c.due > 0), [customers, purchases]);
  const oldEntries = useMemo(() => [...sales, ...purchases].filter((x) => x.isOpening).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [sales, purchases]);

  const amt = Number(amount);
  const selDue = dues.find((c) => String(c._id) === customerId);
  const selWalk = walkDue.find((w) => String(w._id) === walkId);
  const partyList = partyKind === "supplier" ? supDue : custPayable;
  const selParty = partyList.find((x) => String(x._id) === partyId);

  async function post(url: string, body: any) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua.");
      const v = d.voucher; setLast(v);
      setMsg({ t: `Voucher ${v?.voucherNo || ""} save ho gaya.`, ok: true });
      setAmount(""); setNote(""); setName(""); setPhone("");
      await load();
      if (v && autoPrint) printVoucher(v);
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }
  const bad = (t: string) => setMsg({ t, ok: false });

  function save() {
    if (!(amt > 0)) return bad("Amount likhein.");
    if (tab === "due") {
      if (!selDue) return bad("Baqi wala customer chunein.");
      if (amt > selDue.due + 0.00001) return bad(`Is customer ka total baqi Rs. ${money(selDue.due)} hai.`);
      return void post("/api/customers/payment", { customerId, amount: amt, paymentMethod: account === "Bank" ? "Bank" : account, ref: note });
    }
    if (tab === "walk") {
      if (!selWalk) return bad("Baqi wala walking customer chunein.");
      if (amt > selWalk.balance + 0.00001) return bad(`Is walking customer ka baqi Rs. ${money(selWalk.balance)} hai.`);
      return void post("/api/finance", { kind: "walkingPayment", walkingId: walkId, amount: amt, account, ref: note, date });
    }
    if (tab === "owner") return void post("/api/finance", { kind: "ownerCashOut", party: name.trim() || "Owner", amount: amt, account, note, date });
    if (tab === "gen") {
      if (!name.trim()) return bad("Party ka naam likhein.");
      return void post("/api/finance", { kind: "general", type: genType, party: name, amount: amt, account, note, date });
    }
    if (tab === "pay") {
      if (!selParty) return bad("Party chunein.");
      if (amt > selParty.due + 0.00001) return bad(`Is party ka baqi Rs. ${money(selParty.due)} hai.`);
      return void post("/api/finance", { kind: "supplierPayment", ...(partyKind === "supplier" ? { supplierId: partyId } : { customerId: partyId }), amount: amt, account, ref: note, date });
    }
    if (oldKind === "customer" && !oldId && !name.trim()) return bad("Customer chunein ya naya naam likhein.");
    if (oldKind === "supplier" && !oldId) return bad("Supplier chunein.");
    return void post("/api/finance", { kind: "oldBalance", partyType: oldKind, id: oldId, name, phone, amount: amt, date, note });
  }

  const showAccount = tab !== "old";
  const sel = (v: string, set: (x: string) => void, ph: string, opts: any[], fmt: (x: any) => string, key = "_id") => <select className={styles.in} value={v} onChange={(e) => set(e.target.value)}><option value="">{ph}</option>{opts.map((x) => <option key={x[key]} value={x[key]}>{fmt(x)}</option>)}</select>;
  return <main className={styles.win}>
    <style>{`.vprev{background:#fff;border-radius:8px;padding:6px;overflow:auto;max-height:60vh}${VOUCHER_CSS}`}</style>
    <div className={styles.titlebar}><span>▣ Voucher — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/walking-customers">Walking Customers</Link><Link href="/ledger">Customer Ledger</Link><Link href="/accounts">Bank Ledger</Link></span></div>
    <nav className={styles.tabs}>{TABS.map(([k, l]) => <button key={k} className={`${styles.tab} ${tab === k ? styles.tabOn : ""}`} onClick={() => setTab(k)}>{l}</button>)}</nav>
    <section className={styles.body}>
      <div className={styles.card}>
        {tab === "due" && <><h2>Saved Customer se Wasooli</h2>
          <label className={styles.row}><span>Customer:</span>{sel(customerId, setCustomerId, "Baqi wala customer chunein", dues, (c) => `${c.name} · Rs. ${money(c.due)}`)}</label>
          {selDue && <p className={styles.hint}>Pichla baqi (sale + repair + purana): <b>Rs. {money(selDue.due)}</b>. Raqam sab se purane baqi par adjust hoti hai.</p>}</>}
        {tab === "walk" && <><h2>Walking Customer Voucher</h2>
          <p className={styles.hint}>Sirf wohi walking customer yahan aate hain jin ka paisa baqi hai (jo repair ya sale ka paisa de kar nahi gaye). Pura record <Link href="/walking-customers" style={{ color: "#22d3ee" }}>Walking Customers</Link> list mein hai.</p>
          <label className={styles.row}><span>Customer:</span>{sel(walkId, setWalkId, "Baqi wala walking customer", walkDue, (w) => `${w.code} · ${w.name}${w.phone ? " · " + w.phone : ""} · Rs. ${money(w.balance)}`)}</label>
          {selWalk && <p className={styles.hint}>Pichla baqi: <b>Rs. {money(selWalk.balance)}</b> ({selWalk.rows.filter((r: any) => r.remaining > 0).map((r: any) => r.ref).join(", ")})</p>}
          {!walkDue.length && <p className={styles.hint}>Abhi koi walking customer baqi nahi hai.</p>}</>}
        {tab === "owner" && <><h2>Owner Cash Out</h2>
          <p className={styles.hint}>Dukaan se owner ne jo paisa nikala wo yahan likhein. Ye kharcha nahi hai, profit kam nahi hota; sirf us account ka paisa ghatta hai.</p>
          <label className={styles.row}><span>Owner ka naam:</span><input className={styles.in} value={name} onChange={(e) => setName(e.target.value)} placeholder="Owner" /></label></>}
        {tab === "gen" && <><h2>Receive / Pay Voucher</h2>
          <div className={styles.row}><span>Type:</span><select className={styles.in} value={genType} onChange={(e) => setGenType(e.target.value as any)}><option value="IN">Receive (paisa aaya)</option><option value="OUT">Pay (paisa gaya)</option></select></div>
          <label className={styles.row}><span>Party:</span><input className={styles.in} value={name} onChange={(e) => setName(e.target.value)} placeholder="kis se / kis ko" /></label></>}
        {tab === "pay" && <><h2>Supplier / Party ko Payment</h2>
          <div className={styles.row}><span>Party type:</span><select className={styles.in} value={partyKind} onChange={(e) => { setPartyKind(e.target.value as any); setPartyId(""); }}><option value="supplier">Supplier (purchase ka baqi)</option><option value="customer">Customer (Local Purchase ka baqi)</option></select></div>
          <label className={styles.row}><span>Party:</span>{sel(partyId, setPartyId, "Jis ko dene hain chunein", partyList, (x) => `${x.name} · Rs. ${money(x.due)}`)}</label>
          {!partyList.length && <p className={styles.hint}>Abhi kisi ka baqi nahi hai.</p>}</>}
        {tab === "old" && <><h2>Purana Baqi Darj Karein</h2>
          <p className={styles.hint}>Software se pehle ka purana hisaab (register wala) yahan daalein. Phir wasooli / payment ke tab se adjust karein. Ye sale/profit mein nahi ginta.</p>
          <div className={styles.row}><span>Kis ka:</span><select className={styles.in} value={oldKind} onChange={(e) => { setOldKind(e.target.value as any); setOldId(""); }}><option value="customer">Customer ne dene hain (hume milne hain)</option><option value="supplier">Supplier ko dene hain</option></select></div>
          <label className={styles.row}><span>{oldKind === "customer" ? "Customer:" : "Supplier:"}</span>{sel(oldId, setOldId, oldKind === "customer" ? "— naya customer (neeche naam likhein) —" : "Supplier chunein", oldKind === "customer" ? customers : suppliers, (x) => `${x.name}${x.phone ? " · " + x.phone : ""}`)}</label>
          {oldKind === "customer" && !oldId && <><label className={styles.row}><span>Naya naam:</span><input className={styles.in} value={name} onChange={(e) => setName(e.target.value)} /></label><label className={styles.row}><span>Phone:</span><input className={styles.in} value={phone} onChange={(e) => setPhone(e.target.value)} /></label></>}</>}
        {(tab === "old" || tab === "pay" || tab === "walk" || tab === "gen" || tab === "owner") && <label className={styles.row}><span>Date:</span><input className={styles.in} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>}
        <label className={styles.row}><span>Amount:</span><input className={styles.in} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        {showAccount && <label className={styles.row}><span>Account:</span><select className={styles.in} value={account} onChange={(e) => setAccount(e.target.value)}>{ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></label>}
        <label className={styles.row}><span>Detail:</span><input className={styles.in} value={note} onChange={(e) => setNote(e.target.value)} placeholder="reference / narration" /></label>
        <label className={styles.row} style={{ gridTemplateColumns: "1fr" }}><span><input type="checkbox" checked={autoPrint} onChange={(e) => { setAutoPrint(e.target.checked); try { window.localStorage.setItem("voucherAutoPrint", e.target.checked ? "1" : "0"); } catch {} }} /> Save ke baad voucher khud print karein</span></label>
        <div className={styles.bar}><button className={styles.save} disabled={busy} onClick={save}>{busy ? "Saving…" : "💾 Save Voucher"}</button>{msg && <span className={`${styles.msg} ${msg.ok ? styles.ok : ""}`} role="status">{msg.t}</span>}</div>
      </div>
      <div className={styles.card}>
        {last && <><h2>Voucher {last.voucherNo} <button className={styles.alt} onClick={() => printVoucher(last)}>🖨 Print</button></h2><div className="vprev" dangerouslySetInnerHTML={{ __html: voucherBody(last) }} /></>}
        {tab === "old" && <><h2>Purane baqi ki entries</h2><div className={styles.wrap} style={{ maxHeight: "20vh", marginBottom: 8 }}><table className={styles.tbl}><thead><tr><th>Date</th><th>No</th><th>Party</th><th className={styles.num}>Amount</th><th className={styles.num}>Baqi</th></tr></thead><tbody>
          {oldEntries.map((x) => <tr key={x._id}><td>{localDay(x.createdAt)}</td><td>{x.invoiceNo}</td><td>{x.cashRef || x.supplierName}{x.supplierId ? " (supplier)" : ""}</td><td className={styles.num}>{money(x.total)}</td><td className={styles.num}>{money(x.remaining)}</td></tr>)}{!oldEntries.length && <tr><td colSpan={5} style={{ color: "#94a3b8", textAlign: "center" }}>Abhi koi purani entry nahi.</td></tr>}</tbody></table></div></>}
        <h2>Recent Vouchers</h2>
        <div className={styles.wrap} style={{ maxHeight: last ? "26vh" : "62vh" }}><table className={styles.tbl}><thead><tr><th>Date</th><th>No</th><th>Type</th><th>Party</th><th className={styles.num}>Amount</th><th className={styles.num}>Pichla</th><th className={styles.num}>Maujooda</th><th></th></tr></thead><tbody>
          {vouchers.slice(0, 100).map((r) => <tr key={r._id}><td>{localDay(r.createdAt)}</td><td>{r.voucherNo}</td><td>{KIND_NAME[r.kind] || r.kind}</td><td>{r.partyName || "-"}</td><td className={styles.num}>{money(r.amount)}</td><td className={styles.num}>{r.prevBalance == null ? "-" : money(r.prevBalance)}</td><td className={styles.num}>{r.newBalance == null ? "-" : money(r.newBalance)}</td><td><button className={styles.alt} onClick={() => { setLast(r); printVoucher(r); }}>🖨</button></td></tr>)}
          {!vouchers.length && <tr><td colSpan={8} style={{ color: "#94a3b8", textAlign: "center", padding: 14 }}>Abhi koi voucher nahi (naye vouchers yahan aayenge).</td></tr>}</tbody></table></div>
      </div>
    </section>
  </main>;
}
