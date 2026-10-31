"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "../customers/customers.module.css";

const money = (n: number) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const OPT_FIELDS = ["type", "terms", "city", "area"] as const;
const BASE: Record<string, string[]> = { type: ["Wholesaler", "Distributor", "Importer", "Local Market", "Online"], terms: ["Cash", "Credit 7 days", "Credit 15 days", "Credit 30 days"], city: [], area: [] };

type F = {
  code: string; name: string; company: string; contactPerson: string; phoneNo: string; whatsapp: string; email: string;
  type: string; terms: string; creditLimit: string; cnic: string; ntn: string; city: string; area: string;
  address: string; bankName: string; accountNo: string; remarks: string;
};
const blank: F = { code: "", name: "", company: "", contactPerson: "", phoneNo: "", whatsapp: "", email: "", type: "", terms: "", creditLimit: "0", cnic: "", ntn: "", city: "", area: "", address: "", bankName: "", accountNo: "", remarks: "" };
const t = (v: unknown) => String(v ?? "");
const nextCode = (list: any[]) => "S" + String(Math.max(0, ...list.map(c => t(c.code).trim()).filter(c => /^S\d+$/i.test(c)).map(c => Number(c.slice(1)))) + 1).padStart(3, "0");

export default function Suppliers() {
  const [tab, setTab] = useState<"new" | "list">("new");
  const [sup, setSup] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
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
    const [s, p, o] = await Promise.all([
      fetch("/api/data?collection=suppliers").then(arr),
      fetch("/api/data?collection=purchases&limit=5000").then(arr).catch(() => []),
      fetch("/api/data?collection=productOptions").then(arr).catch(() => []),
    ]);
    setSup(s); setPurchases(p); setOpts(o);
    setF(cur => (cur.code || editId ? cur : { ...cur, code: nextCode(s) }));
    return s;
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof F, v: string) => setF(cur => ({ ...cur, [k]: v }));
  const choices = (k: string) => Array.from(new Set([...(BASE[k] || []), ...opts.filter(o => o.type === `supp_${k}`).map(o => t(o.name).trim()), ...sup.map(c => t(c[k]).trim())].filter(Boolean)));

  async function addOption(k: (typeof OPT_FIELDS)[number]) {
    const name = (window.prompt(`Naya ${k} likhein:`) || "").trim();
    if (!name) return;
    if (!choices(k).some(x => x.toLowerCase() === name.toLowerCase())) {
      const r = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "productOptions", type: `supp_${k}`, name }) });
      if (!r.ok) { setMsg({ text: "Option save nahi hua.", ok: false }); return; }
      setOpts(o => [...o, { type: `supp_${k}`, name }]);
    }
    set(k, name);
  }

  function reset(list: any[] = sup) {
    setEditId(""); setFind(""); setF({ ...blank, code: nextCode(list) }); setMsg(null);
    setTab("new"); window.setTimeout(() => nameRef.current?.focus(), 0);
  }

  function edit(c: any) {
    setEditId(String(c._id)); setTab("new"); setMsg(null);
    setF({
      ...blank, code: t(c.code), name: t(c.name), company: t(c.company), contactPerson: t(c.contactPerson), phoneNo: t(c.phoneNo || c.phone), whatsapp: t(c.whatsapp), email: t(c.email),
      type: t(c.type), terms: t(c.terms), creditLimit: t(c.creditLimit ?? "0"), cnic: t(c.cnic), ntn: t(c.ntn), city: t(c.city), area: t(c.area),
      address: t(c.address), bankName: t(c.bankName), accountNo: t(c.accountNo), remarks: t(c.remarks),
    });
  }

  const matches = useMemo(() => {
    const q = find.trim().toLowerCase();
    if (q.length < 2) return [];
    return sup.filter(c => [c.name, c.company, c.phone, c.phoneNo, c.code].some(v => t(v).toLowerCase().includes(q))).slice(0, 6);
  }, [find, sup]);

  async function save() {
    if (busy) return;
    if (!f.name.trim()) { setMsg({ text: "Supplier ka naam zaroori hai.", ok: false }); nameRef.current?.focus(); return; }
    const dup = !editId && sup.some(c => t(c.name).trim().toLowerCase() === f.name.trim().toLowerCase());
    if (dup && !window.confirm("Is naam ka supplier pehle se maujood hai. Phir bhi save karein?")) return;
    setBusy(true);
    try {
      const doc = {
        code: f.code, name: f.name.trim(), company: f.company.trim(), contactPerson: f.contactPerson.trim(),
        phone: f.phoneNo.trim(), phoneNo: f.phoneNo.trim(), whatsapp: f.whatsapp.trim(), email: f.email.trim(),
        type: f.type, terms: f.terms, creditLimit: Number(f.creditLimit || 0), cnic: f.cnic.trim(), ntn: f.ntn.trim(),
        city: f.city, area: f.area, address: f.address.trim(), bankName: f.bankName.trim(), accountNo: f.accountNo.trim(), remarks: f.remarks.trim(),
      };
      const r = await fetch("/api/data", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "suppliers", ...(editId ? { id: editId } : {}), ...doc }) });
      if (!r.ok) throw new Error();
      const fresh = await load();
      reset(fresh);
      setMsg({ text: editId ? "Supplier update ho gaya." : "Supplier save ho gaya.", ok: true });
    } catch { setMsg({ text: "Supplier save nahi hua.", ok: false }); } finally { setBusy(false); }
  }

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") { e.preventDefault(); void saveRef.current(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const payable = (id: string) => purchases.filter(p => String(p.supplierId || "") === id).reduce((a, p) => a + Number(p.remaining || 0), 0);

  const listRows = useMemo(() => {
    const q = listQ.trim().toLowerCase();
    return q ? sup.filter(c => [c.name, c.company, c.phone, c.phoneNo, c.code, c.city, c.area, c.address].some(v => t(v).toLowerCase().includes(q))) : sup;
  }, [sup, listQ]);

  const txt = (k: keyof F) => <input className={styles.in} value={f[k]} onChange={e => set(k, e.target.value)} />;
  const pick = (k: (typeof OPT_FIELDS)[number]) => <div className={styles.with}>
    <select className={styles.in} value={f[k]} onChange={e => set(k, e.target.value)}><option value=""></option>{choices(k).map(o => <option key={o} value={o}>{o}</option>)}</select>
    <button type="button" className={styles.nbtn} onClick={() => void addOption(k)} title="Naya add karein">N</button>
  </div>;

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Supplier — New Arif Mobile Center</span><span><Link href="/">← Dashboard</Link><Link href="/purchases">Purchases</Link><Link href="/ledger">Ledger</Link></span></div>
    <nav className={styles.tabs}>
      <button className={`${styles.tab} ${tab === "new" ? styles.tabActive : ""}`} onClick={() => setTab("new")}>New Supplier</button>
      <button className={`${styles.tab} ${tab === "list" ? styles.tabActive : ""}`} onClick={() => setTab("list")}>Supplier List ({sup.length})</button>
    </nav>

    {tab === "new" && <section className={styles.body}>
      <div className={styles.head}><h1>Accounts Payable (Supplier){editId ? " — Edit" : ""}</h1><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
      <div className={styles.panel}>
        <div className={styles.col}>
          <label className={styles.row}><span>Code:</span><input className={`${styles.in} ${styles.code}`} value={f.code} onChange={e => set("code", e.target.value)} /></label>
          <label className={styles.row}><span>Search:</span><span style={{ position: "relative" }}>
            <input className={`${styles.in} ${styles.search}`} value={find} onChange={e => setFind(e.target.value)} placeholder="naam / company / phone" />
            {matches.length > 0 && <span style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 5, background: "#0f172a", border: "1px solid #22d3ee" }}>
              {matches.map(c => <button type="button" key={c._id} onClick={() => { edit(c); setFind(""); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 8px", border: 0, background: "#0f172a", color: "#e5e7eb", cursor: "pointer" }}>{c.name} · {t(c.phoneNo || c.phone) || "-"}</button>)}
            </span>}
          </span></label>
          <label className={styles.row}><span>Name:</span><input ref={nameRef} className={styles.in} value={f.name} onChange={e => set("name", e.target.value)} /></label>
          <label className={styles.row}><span>Company:</span>{txt("company")}</label>
          <label className={styles.row}><span>Contact Person:</span>{txt("contactPerson")}</label>
          <label className={styles.row}><span>Phone No:</span>{txt("phoneNo")}</label>
          <label className={styles.row}><span>WhatsApp:</span>{txt("whatsapp")}</label>
          <label className={styles.row}><span>Email:</span>{txt("email")}</label>
          <div className={styles.row}><span>Type:</span>{pick("type")}</div>
        </div>
        <div className={styles.col}>
          <div className={styles.row}><span>Terms:</span>{pick("terms")}</div>
          <label className={styles.row}><span>Credit Limit:</span><input className={styles.in} type="number" value={f.creditLimit} onChange={e => set("creditLimit", e.target.value)} /></label>
          <label className={styles.row}><span>CNIC:</span>{txt("cnic")}</label>
          <label className={styles.row}><span>NTN:</span>{txt("ntn")}</label>
          <div className={styles.row}><span>City:</span>{pick("city")}</div>
          <div className={styles.row}><span>Area:</span>{pick("area")}</div>
          <label className={styles.row}><span>Address:</span><textarea className={`${styles.in} ${styles.area}`} value={f.address} onChange={e => set("address", e.target.value)} /></label>
          <label className={styles.row}><span>Bank Name:</span>{txt("bankName")}</label>
          <label className={styles.row}><span>Account No:</span>{txt("accountNo")}</label>
          <label className={styles.row}><span>Remarks:</span>{txt("remarks")}</label>
        </div>
      </div>
      <div className={styles.bar}>
        <button className={`${styles.ico} ${styles.save}`} onClick={() => void save()} disabled={busy} title="Save (Ctrl+S)">💾</button>
        <button className={`${styles.ico} ${styles.edit}`} onClick={() => (editId ? void save() : setMsg({ text: "Edit ke liye Search se ya Supplier List se supplier chunein.", ok: false }))} title="Edit / Update">✎</button>
        {msg && <span className={`${styles.msg} ${msg.ok ? styles.ok : ""}`} role="status">{msg.text}</span>}
      </div>
    </section>}

    {tab === "list" && <section className={styles.list}>
      <div className={styles.banner}>
        <div><div className={styles.bannerTitle}>🚚 Supplier List</div><div className={styles.bannerSub}>NEW ARIF MOBILE CENTER · Kamar Mushani</div></div>
        <div className={styles.chips}>
          <span className={styles.chip}><small>Suppliers</small><b>{sup.length}</b></span>
          <span className={styles.chip}><small>Dene wale</small><b>{sup.filter(c => payable(String(c._id)) > 0).length}</b></span>
          <span className={styles.chip}><small>Total payable</small><b>Rs. {money(sup.reduce((a, c) => a + payable(String(c._id)), 0))}</b></span>
        </div>
      </div>
      <div className={styles.listTop}><input className={styles.in} style={{ maxWidth: 360 }} value={listQ} onChange={e => setListQ(e.target.value)} placeholder="🔍 Search naam / company / phone / city" /><span className={styles.count}>{listRows.length} dikhaye ja rahe hain</span><button className={styles.nbtn} style={{ padding: "0 14px" }} onClick={() => reset()}>Naya Supplier</button></div>
      <div className={styles.tblWrap}>
        <table className={styles.tbl}><thead><tr><th>Code</th><th>Supplier</th><th>Company</th><th>Phone</th><th>City / Area</th><th>Payable</th><th>Action</th></tr></thead>
          <tbody>{listRows.map(c => { const b = payable(String(c._id)); return <tr key={c._id}>
            <td>{t(c.code) || "-"}</td>
            <td><span className={styles.avatar}>{(t(c.name).trim()[0] || "?").toUpperCase()}</span>{c.name}</td>
            <td>{t(c.company) || "-"}</td>
            <td>{t(c.phoneNo || c.phone) || "-"}</td><td>{[c.city, c.area].filter(Boolean).join(" / ") || "-"}</td>
            <td><span className={b > 0 ? styles.debtPill : styles.clearPill}>Rs. {money(b)}</span></td>
            <td><button onClick={() => edit(c)}>Edit</button><Link href={"/ledger?supplier=" + c._id}>Ledger</Link></td>
          </tr>; })}</tbody></table>
      </div>
    </section>}
  </main>;
}
