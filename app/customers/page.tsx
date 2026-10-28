"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./customers.module.css";

const money = (n: number) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const OPT_FIELDS = ["type", "terms", "salesman", "area", "city", "country"] as const;
const BASE: Record<string, string[]> = { type: ["Retail", "Wholesale", "Shopkeeper", "Walk-in"], terms: ["Cash", "Credit"], salesman: [], area: [], city: [], country: ["Pakistan"], branch: ["Main Branch"] };

type F = {
  code: string; name: string; mobile: string; phoneNo: string; email: string; type: string; terms: string;
  discount: string; priceLevel: string; creditLimit: string; creditDays: string;
  branch: string; salesman: string; cnic: string; fax: string; area: string; city: string; country: string;
  address1: string; address2: string; remarks: string;
};
const blank: F = { code: "", name: "", mobile: "", phoneNo: "", email: "", type: "", terms: "", discount: "0", priceLevel: "0", creditLimit: "0", creditDays: "0", branch: "Main Branch", salesman: "", cnic: "", fax: "", area: "", city: "", country: "", address1: "", address2: "", remarks: "" };
const t = (v: unknown) => String(v ?? "");
const nextCode = (list: any[]) => String(Math.max(0, ...list.map(c => String(c.code ?? "").trim()).filter(c => /^\d+$/.test(c)).map(Number)) + 1).padStart(4, "0");

export default function Customers() {
  const [tab, setTab] = useState<"new" | "list">("new");
  const [cust, setCust] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [opts, setOpts] = useState<any[]>([]);
  const [f, setF] = useState<F>(blank);
  const [editId, setEditId] = useState("");
  const [find, setFind] = useState("");
  const [listQ, setListQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const arr = (r: Response) => r.json().then((d: any) => (Array.isArray(d) ? d : []));
    const [c, s, r, o] = await Promise.all([
      fetch("/api/data?collection=customers").then(arr),
      fetch("/api/data?collection=sales&limit=5000").then(arr),
      fetch("/api/repairs").then(arr).catch(() => []),
      fetch("/api/data?collection=productOptions").then(arr).catch(() => []),
    ]);
    setCust(c); setSales(s); setRepairs(r); setOpts(o);
    setF(cur => (cur.code || editId ? cur : { ...cur, code: nextCode(c) }));
    return c;
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof F, v: string) => setF(cur => ({ ...cur, [k]: v }));
  const choices = (k: string) => Array.from(new Set([...(BASE[k] || []), ...opts.filter(o => o.type === `cust_${k}`).map(o => t(o.name).trim()), ...cust.map(c => t(c[k]).trim())].filter(Boolean)));

  async function addOption(k: (typeof OPT_FIELDS)[number]) {
    const name = (window.prompt(`Naya ${k} likhein:`) || "").trim();
    if (!name) return;
    if (!choices(k).some(x => x.toLowerCase() === name.toLowerCase())) {
      const r = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "productOptions", type: `cust_${k}`, name }) });
      if (!r.ok) { setMsg({ text: "Option save nahi hua.", ok: false }); return; }
      setOpts(o => [...o, { type: `cust_${k}`, name }]);
    }
    set(k, name);
  }

  function reset(list: any[] = cust) {
    setEditId(""); setFind(""); setF({ ...blank, code: nextCode(list) }); setMsg(null);
    setTab("new"); window.setTimeout(() => nameRef.current?.focus(), 0);
  }

  function edit(c: any) {
    setEditId(String(c._id)); setTab("new"); setMsg(null);
    setF({
      ...blank, code: t(c.code), name: t(c.name), mobile: t(c.mobile ?? c.phone), phoneNo: t(c.phoneNo), email: t(c.email), type: t(c.type), terms: t(c.terms),
      discount: t(c.discount ?? "0"), priceLevel: t(c.priceLevel ?? "0"), creditLimit: t(c.creditLimit ?? "0"), creditDays: t(c.creditDays ?? "0"),
      branch: t(c.branch || "Main Branch"), salesman: t(c.salesman), cnic: t(c.cnic), fax: t(c.fax), area: t(c.area), city: t(c.city), country: t(c.country),
      address1: t(c.address1 ?? c.address), address2: t(c.address2), remarks: t(c.remarks ?? c.notes),
    });
  }

  const matches = useMemo(() => {
    const q = find.trim().toLowerCase();
    if (q.length < 2) return [];
    return cust.filter(c => [c.name, c.phone, c.mobile, c.phoneNo, c.code, c.cnic].some(v => t(v).toLowerCase().includes(q))).slice(0, 6);
  }, [find, cust]);

  async function save() {
    if (busy) return;
    if (!f.name.trim()) { setMsg({ text: "Name zaroori hai.", ok: false }); nameRef.current?.focus(); return; }
    const dup = !editId && f.mobile.trim() && cust.some(c => t(c.mobile ?? c.phone).trim() === f.mobile.trim());
    if (dup && !window.confirm("Ye mobile number pehle se kisi customer ka hai. Phir bhi save karein?")) return;
    setBusy(true);
    try {
      const doc = {
        code: f.code, name: f.name.trim(), phone: f.mobile.trim(), mobile: f.mobile.trim(), phoneNo: f.phoneNo.trim(), email: f.email.trim(), type: f.type, terms: f.terms,
        discount: Number(f.discount || 0), priceLevel: Number(f.priceLevel || 0), creditLimit: Number(f.creditLimit || 0), creditDays: Number(f.creditDays || 0),
        branch: f.branch, salesman: f.salesman, cnic: f.cnic.trim(), fax: f.fax.trim(), area: f.area, city: f.city, country: f.country,
        address: [f.address1.trim(), f.address2.trim()].filter(Boolean).join(", "), address1: f.address1.trim(), address2: f.address2.trim(), notes: f.remarks.trim(), remarks: f.remarks.trim(),
      };
      const r = await fetch("/api/data", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "customers", ...(editId ? { id: editId } : {}), ...doc }) });
      if (!r.ok) throw new Error();
      const fresh = await load();
      reset(fresh);
      setMsg({ text: editId ? "Customer update ho gaya." : "Customer save ho gaya.", ok: true });
    } catch { setMsg({ text: "Customer save nahi hua.", ok: false }); } finally { setBusy(false); }
  }

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); void saveRef.current(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const balance = (id: string) =>
    sales.filter(s => String(s.customerId || "") === id).reduce((a, s) => a + Number(s.remaining || 0), 0) +
    repairs.filter(r => String(r.customerId || "") === id).reduce((a, r) => a + Number(r.remaining || 0), 0);

  const listRows = useMemo(() => {
    const q = listQ.trim().toLowerCase();
    return q ? cust.filter(c => [c.name, c.phone, c.mobile, c.phoneNo, c.code, c.city, c.area, c.address].some(v => t(v).toLowerCase().includes(q))) : cust;
  }, [cust, listQ]);

  const txt = (k: keyof F, extra = "") => <input className={`${styles.in} ${extra}`} value={f[k]} onChange={e => set(k, e.target.value)} />;
  const num = (k: keyof F) => <input className={styles.in} type="number" value={f[k]} onChange={e => set(k, e.target.value)} />;
  const pick = (k: (typeof OPT_FIELDS)[number], withN = true) => <div className={withN ? styles.with : ""}>
    <select className={styles.in} value={f[k]} onChange={e => set(k, e.target.value)}><option value=""></option>{choices(k).map(o => <option key={o} value={o}>{o}</option>)}</select>
    {withN && <button type="button" className={styles.nbtn} onClick={() => void addOption(k)} title="Naya add karein">N</button>}
  </div>;

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Customer — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/pos">POS</Link><Link href="/ledger">Ledger</Link><Link href="/repairs">Repairs</Link></span></div>
    <nav className={styles.tabs}>
      <button className={`${styles.tab} ${tab === "new" ? styles.tabActive : ""}`} onClick={() => setTab("new")}>New Customer</button>
      <button className={`${styles.tab} ${tab === "list" ? styles.tabActive : ""}`} onClick={() => setTab("list")}>Customer List ({cust.length})</button>
    </nav>

    {tab === "new" && <section className={styles.body}>
      <div className={styles.head}><h1>Accounts Receivable (Customer){editId ? " — Edit" : ""}</h1><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
      <div className={styles.panel}>
        <div className={styles.col}>
          <label className={styles.row}><span>Code:</span><input className={`${styles.in} ${styles.code}`} value={f.code} onChange={e => set("code", e.target.value)} /></label>
          <label className={styles.row}><span>Search:</span><span style={{ position: "relative" }}>
            <input className={`${styles.in} ${styles.search}`} value={find} onChange={e => setFind(e.target.value)} placeholder="naam / mobile / code" />
            {matches.length > 0 && <span style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 5, background: "#fff", border: "1px solid #888", boxShadow: "0 4px 10px rgba(0,0,0,.25)" }}>
              {matches.map(c => <button type="button" key={c._id} onClick={() => { edit(c); setFind(""); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 8px", border: 0, background: "#fff", color: "#111", cursor: "pointer" }}>{c.name} · {t(c.mobile ?? c.phone) || "-"}</button>)}
            </span>}
          </span></label>
          <label className={styles.row}><span>Name:</span><input ref={nameRef} className={styles.in} value={f.name} onChange={e => set("name", e.target.value)} /></label>
          <label className={styles.row}><span>Mobile:</span>{txt("mobile")}</label>
          <label className={styles.row}><span>Phone No:</span>{txt("phoneNo")}</label>
          <label className={styles.row}><span>Email:</span>{txt("email")}</label>
          <div className={styles.row}><span>Type:</span>{pick("type")}</div>
          <div className={styles.row}><span>Terms:</span>{pick("terms", false)}</div>
          <div className={styles.pair3}><span>Disc (%):</span>{num("discount")}<span>P. Level:</span>{num("priceLevel")}</div>
          <div className={styles.pair3}><span>Credit Limit:</span>{num("creditLimit")}<span>Cr. Days:</span>{num("creditDays")}</div>
        </div>
        <div className={styles.col}>
          <div className={styles.row}><span>Branch code:</span><select className={`${styles.in} ${styles.code}`} value={f.branch} onChange={e => set("branch", e.target.value)}>{choices("branch").map(o => <option key={o}>{o}</option>)}</select></div>
          <div className={styles.row}><span>Salesman:</span>{pick("salesman", false)}</div>
          <label className={styles.row}><span>CNIC:</span>{txt("cnic")}</label>
          <label className={styles.row}><span>Fax No:</span>{txt("fax")}</label>
          <div className={styles.row}><span>Area:</span>{pick("area")}</div>
          <div className={styles.row}><span>City:</span>{pick("city")}</div>
          <div className={styles.row}><span>Country:</span>{pick("country")}</div>
          <label className={styles.row}><span>Address1:</span><textarea className={`${styles.in} ${styles.area}`} value={f.address1} onChange={e => set("address1", e.target.value)} /></label>
          <label className={styles.row}><span>Address2:</span><textarea className={`${styles.in} ${styles.area}`} value={f.address2} onChange={e => set("address2", e.target.value)} /></label>
          <label className={styles.row}><span>Remarks:</span>{txt("remarks")}</label>
        </div>
      </div>
      <div className={styles.bar}>
        <button className={`${styles.ico} ${styles.save}`} onClick={() => void save()} disabled={busy} title="Save (Ctrl+S)">💾</button>
        <button className={`${styles.ico} ${styles.edit}`} onClick={() => (editId ? void save() : setMsg({ text: "Edit ke liye Search se ya Customer List se customer chunein.", ok: false }))} title="Edit / Update">✎</button>
        <button className={`${styles.ico} ${styles.new}`} onClick={() => reset()} title="New">＋</button>
        {msg && <span className={`${styles.msg} ${msg.ok ? styles.ok : ""}`} role="status">{msg.text}</span>}
      </div>
    </section>}

    {tab === "list" && <section className={styles.list}>
      <div className={styles.listTop}><h2>Customer List ({listRows.length})</h2><input className={styles.in} style={{ maxWidth: 320 }} value={listQ} onChange={e => setListQ(e.target.value)} placeholder="Search naam / mobile / code / city" /><button className={styles.nbtn} style={{ padding: "0 12px" }} onClick={() => reset()}>＋ New Customer</button></div>
      <div style={{ overflow: "auto" }}>
        <table className={styles.tbl}><thead><tr><th>Code</th><th>Name</th><th>Mobile</th><th>City / Area</th><th>Type</th><th>Balance</th><th>Action</th></tr></thead>
          <tbody>{listRows.map(c => { const b = balance(String(c._id)); return <tr key={c._id}>
            <td>{t(c.code) || "-"}</td><td><Link href={`/customers/${c._id}`}>{c.name}</Link></td><td>{t(c.mobile ?? c.phone) || "-"}</td><td>{[c.city, c.area].filter(Boolean).join(" / ") || "-"}</td><td>{t(c.type) || "-"}</td>
            <td className={b > 0 ? styles.debt : styles.clear}>Rs. {money(b)}</td>
            <td><button onClick={() => edit(c)}>Edit</button><Link href={`/customers/${c._id}`}>History</Link> · <Link href={`/repairs/new?customerId=${c._id}`}>New Repair</Link></td>
          </tr>; })}</tbody></table>
      </div>
    </section>}
  </main>;
}
