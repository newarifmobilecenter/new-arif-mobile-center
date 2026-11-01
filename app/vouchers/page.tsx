"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";

const ACCOUNTS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Bank", "Other"];
const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : [])).catch(() => []);
const localDay = (v: unknown) => { const d = v ? new Date(v as string) : null; if (!d || isNaN(+d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const today = () => localDay(new Date());
const TABS = [["due", "Customer se Wasooli"], ["walk", "Walking Customer"], ["gen", "Receive / Pay"], ["pay", "Supplier / Party ko Payment"], ["old", "Purana Baqi (Old Pending)"]] as const;
type Tab = (typeof TABS)[number][0];

export default function Vouchers() {
  const [tab, setTab] = useState<Tab>("due");
  const [tx, setTx] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [account, setAccount] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState("");
  const [walkType, setWalkType] = useState<"IN" | "OUT">("IN");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [genType, setGenType] = useState<"IN" | "OUT">("IN");
  const [partyKind, setPartyKind] = useState<"supplier" | "customer">("supplier");
  const [partyId, setPartyId] = useState("");
  const [oldKind, setOldKind] = useState<"customer" | "supplier">("customer");
  const [oldId, setOldId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const load = async () => {
    const [t, c, s, p, r, sp] = await Promise.all([
      fetch("/api/data?collection=transactions&limit=300").then(arr), fetch("/api/data?collection=customers&limit=5000").then(arr),
      fetch("/api/data?collection=sales&limit=5000").then(arr), fetch("/api/data?collection=purchases&limit=5000").then(arr),
      fetch("/api/repairs?status=PAYMENT_DUE").then(arr).catch(() => []), fetch("/api/data?collection=suppliers&limit=5000").then(arr),
    ]);
    setTx(t); setCustomers(c); setSales(s); setPurchases(p); setRepairs(r); setSuppliers(sp);
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { setMsg(null); }, [tab]);

  const dues = useMemo(() => customers.map((c) => ({ ...c, due: sales.filter((x) => String(x.customerId || "") === String(c._id)).reduce((a, x) => a + Number(x.remaining || 0), 0) + repairs.filter((x) => String(x.customerId || "") === String(c._id)).reduce((a, x) => a + Number(x.remaining || 0), 0) })).filter((c) => c.due > 0), [customers, sales, repairs]);
  const supDue = useMemo(() => suppliers.map((s) => ({ ...s, due: purchases.filter((p) => String(p.supplierId || "") === String(s._id)).reduce((a, p) => a + Number(p.remaining || 0), 0) })).filter((s) => s.due > 0), [suppliers, purchases]);
  const custPayable = useMemo(() => customers.map((c) => ({ ...c, due: purchases.filter((p) => p.kind === "LOCAL" && String(p.customerId || "") === String(c._id)).reduce((a, p) => a + Number(p.remaining || 0), 0) })).filter((c) => c.due > 0), [customers, purchases]);
  const oldEntries = useMemo(() => [...sales, ...purchases].filter((x) => x.isOpening).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [sales, purchases]);

  const amt = Number(amount);
  const selDue = dues.find((c) => String(c._id) === customerId);
  const partyList = partyKind === "supplier" ? supDue : custPayable;
  const selParty = partyList.find((x) => String(x._id) === partyId);

  async function post(url: string, body: any, okText: (d: any) => string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua.");
      setMsg({ t: okText(d), ok: true }); setAmount(""); setNote(""); setName(""); setPhone("");
      await load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }
  const bad = (t: string) => { setMsg({ t, ok: false }); };

  function save() {
    if (!(amt > 0)) return bad("Amount likhein.");
    if (tab === "due") {
      if (!selDue) return bad("Due wala customer chunein.");
      if (amt > selDue.due + 0.00001) return bad(`Is customer ka total baqi Rs. ${money(selDue.due)} hai.`);
      return void post("/api/customers/payment", { customerId, amount: amt, paymentMethod: account === "Bank" ? "Bank" : account, ref: note }, (d) => `Rs. ${money(d.applied)} wasool aur pending mein adjust ho gaye.`);
    }
    if (tab === "walk") {
      const party = name.trim() || "Walking Customer";
      return void post("/api/data", { collection: "transactions", account, type: walkType, amount: amt, party, phone: phone.trim(), note: note.trim(), voucherType: walkType === "IN" ? "WALKING_RECEIVE" : "WALKING_PAY", createdAt: new Date().toISOString() }, () => `Walking customer voucher save ho gaya (${walkType === "IN" ? "wasooli" : "ada"}).`);
    }
    if (tab === "gen") {
      if (!name.trim()) return bad("Party ka naam likhein.");
      return void post("/api/data", { collection: "transactions", account, type: genType, amount: amt, party: name.trim(), note: note.trim(), voucherType: genType === "IN" ? "RECEIVE" : "PAY", createdAt: new Date().toISOString() }, () => "Voucher save ho gaya.");
    }
    if (tab === "pay") {
      if (!selParty) return bad("Party chunein.");
      if (amt > selParty.due + 0.00001) return bad(`Is party ka baqi Rs. ${money(selParty.due)} hai.`);
      return void post("/api/finance", { kind: "supplierPayment", ...(partyKind === "supplier" ? { supplierId: partyId } : { customerId: partyId }), amount: amt, account, ref: note, date }, (d) => `Rs. ${money(d.applied)} ada ho gaye aur baqi mein adjust ho gaye.`);
    }
    if (oldKind === "customer" && !oldId && !name.trim()) return bad("Customer chunein ya naya naam likhein.");
    if (oldKind === "supplier" && !oldId) return bad("Supplier chunein.");
    return void post("/api/finance", { kind: "oldBalance", partyType: oldKind, id: oldId, name, phone, amount: amt, date, note }, (d) => `${d.name} ka purana baqi Rs. ${money(amt)} darj ho gaya (${d.invoiceNo}). Ab wasooli/ada ke tab se adjust ho sakta hai.`);
  }

  const showAccount = tab !== "old";
  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Vouchers — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/local-purchase">Local Purchase</Link><Link href="/ledger">Customer Ledger</Link><Link href="/expenses">Expenses</Link></span></div>
    <nav className={styles.tabs}>{TABS.map(([k, l]) => <button key={k} className={`${styles.tab} ${tab === k ? styles.tabOn : ""}`} onClick={() => setTab(k)}>{l}</button>)}</nav>
    <section className={styles.body}>
      <div className={styles.card}>
        {tab === "due" && <><h2>Customer se Pending Wasooli</h2>
          <label className={styles.row}><span>Customer:</span><select className={styles.in} value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Baqi wala customer chunein</option>{dues.map((c) => <option key={c._id} value={c._id}>{c.name} · Rs. {money(c.due)}</option>)}</select></label>
          {selDue && <p className={styles.hint}>Total baqi (sale + repair + purana): <b>Rs. {money(selDue.due)}</b>. Payment sab se purane baqi par adjust hoti hai.</p>}</>}
        {tab === "walk" && <><h2>Walking Customer Voucher</h2>
          <div className={styles.row}><span>Type:</span><select className={styles.in} value={walkType} onChange={(e) => setWalkType(e.target.value as any)}><option value="IN">Receive (paisa liye)</option><option value="OUT">Pay (paisa diye / wapas)</option></select></div>
          <label className={styles.row}><span>Naam:</span><input className={styles.in} value={name} onChange={(e) => setName(e.target.value)} placeholder="Walking Customer (khali chhor sakte hain)" /></label>
          <label className={styles.row}><span>Phone:</span><input className={styles.in} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="optional" /></label></>}
        {tab === "gen" && <><h2>Receive / Pay Voucher</h2>
          <div className={styles.row}><span>Type:</span><select className={styles.in} value={genType} onChange={(e) => setGenType(e.target.value as any)}><option value="IN">Receive (paisa aaya)</option><option value="OUT">Pay (paisa gaya)</option></select></div>
          <label className={styles.row}><span>Party:</span><input className={styles.in} value={name} onChange={(e) => setName(e.target.value)} placeholder="kis se / kis ko" /></label></>}
        {tab === "pay" && <><h2>Supplier / Party ko Payment</h2>
          <div className={styles.row}><span>Party type:</span><select className={styles.in} value={partyKind} onChange={(e) => { setPartyKind(e.target.value as any); setPartyId(""); }}><option value="supplier">Supplier (purchase ka baqi)</option><option value="customer">Customer (Local Purchase ka baqi)</option></select></div>
          <label className={styles.row}><span>Party:</span><select className={styles.in} value={partyId} onChange={(e) => setPartyId(e.target.value)}><option value="">Jis ko dene hain chunein</option>{partyList.map((x) => <option key={x._id} value={x._id}>{x.name} · Rs. {money(x.due)}</option>)}</select></label>
          {!partyList.length && <p className={styles.hint}>Abhi kisi ka baqi nahi hai.</p>}</>}
        {tab === "old" && <><h2>Purana Baqi Darj Karein</h2>
          <p className={styles.hint}>Software se pehle ka purana hisaab (register wala) yahan daalein. Phir "Customer se Wasooli" ya "Party ko Payment" se jab paisa aaye/jaye adjust karein. Ye sale/profit mein nahi ginta.</p>
          <div className={styles.row}><span>Kis ka:</span><select className={styles.in} value={oldKind} onChange={(e) => { setOldKind(e.target.value as any); setOldId(""); }}><option value="customer">Customer ne dene hain (hume milne hain)</option><option value="supplier">Supplier ko dene hain (humne dene hain)</option></select></div>
          <label className={styles.row}><span>{oldKind === "customer" ? "Customer:" : "Supplier:"}</span><select className={styles.in} value={oldId} onChange={(e) => setOldId(e.target.value)}><option value="">{oldKind === "customer" ? "— naya customer (neeche naam likhein) —" : "Supplier chunein"}</option>{(oldKind === "customer" ? customers : suppliers).map((x) => <option key={x._id} value={x._id}>{x.name}{x.phone ? ` · ${x.phone}` : ""}</option>)}</select></label>
          {oldKind === "customer" && !oldId && <><label className={styles.row}><span>Naya naam:</span><input className={styles.in} value={name} onChange={(e) => setName(e.target.value)} /></label><label className={styles.row}><span>Phone:</span><input className={styles.in} value={phone} onChange={(e) => setPhone(e.target.value)} /></label></>}
          <label className={styles.row}><span>Tareekh:</span><input className={styles.in} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></>}
        {tab === "pay" && <label className={styles.row}><span>Date:</span><input className={styles.in} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>}
        <label className={styles.row}><span>Amount:</span><input className={styles.in} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        {showAccount && <label className={styles.row}><span>Account:</span><select className={styles.in} value={account} onChange={(e) => setAccount(e.target.value)}>{ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></label>}
        <label className={styles.row}><span>{tab === "old" ? "Detail:" : "Narration:"}</span><input className={styles.in} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tab === "old" ? "jaise: purana udhaar register se" : "reference / note"} /></label>
        <div className={styles.bar}><button className={styles.save} disabled={busy} onClick={save}>{busy ? "Saving…" : tab === "due" ? "Receive & Adjust" : tab === "old" ? "Purana Baqi Save" : "Save Voucher"}</button>{msg && <span className={`${styles.msg} ${msg.ok ? styles.ok : ""}`} role="status">{msg.t}</span>}</div>
      </div>
      <div className={styles.card}>
        {tab === "old" && <><h2>Purane baqi ki entries</h2><div className={styles.wrap} style={{ maxHeight: "24vh", marginBottom: 8 }}><table className={styles.tbl}><thead><tr><th>Date</th><th>No</th><th>Party</th><th className={styles.num}>Amount</th><th className={styles.num}>Baqi</th></tr></thead><tbody>
          {oldEntries.map((x) => <tr key={x._id}><td>{localDay(x.createdAt)}</td><td>{x.invoiceNo}</td><td>{x.cashRef || x.supplierName}{x.supplierId ? " (supplier)" : ""}</td><td className={styles.num}>{money(x.total)}</td><td className={styles.num}>{money(x.remaining)}</td></tr>)}{!oldEntries.length && <tr><td colSpan={5} style={{ color: "#94a3b8", textAlign: "center" }}>Abhi koi purani entry nahi.</td></tr>}</tbody></table></div></>}
        <h2>Recent Vouchers</h2>
        <div className={styles.wrap}><table className={styles.tbl}><thead><tr><th>Date</th><th>Type</th><th>Party</th><th>Account</th><th>Detail</th><th className={styles.num}>Amount</th></tr></thead><tbody>
          {tx.slice(0, 80).map((r) => <tr key={r._id}><td>{localDay(r.createdAt)}</td><td>{r.note === "Customer balance payment" ? "Customer Wasooli" : r.voucherType === "WALKING_RECEIVE" ? "Walking Receive" : r.voucherType === "WALKING_PAY" ? "Walking Pay" : r.voucherType === "EXPENSE" ? "Expense" : r.voucherType === "SALARY" ? "Salary" : r.type === "IN" ? "Receive" : "Pay"}</td><td>{r.party || "-"}</td><td>{r.account || "Cash"}</td><td>{r.note || r.ref || "-"}</td><td className={`${styles.num}`} style={{ color: r.type === "IN" ? "#4ade80" : "#f87171" }}>{r.type === "IN" ? "+" : "−"}{money(r.amount)}</td></tr>)}
          {!tx.length && <tr><td colSpan={6} style={{ color: "#94a3b8", textAlign: "center" }}>Koi voucher nahi.</td></tr>}</tbody></table></div>
      </div>
    </section>
  </main>;
}
