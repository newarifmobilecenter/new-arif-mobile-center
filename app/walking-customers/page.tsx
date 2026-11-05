"use client";
import { SHOP } from "@/lib/shop";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../components/formwin.module.css";

const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });
const day = (v: unknown) => { const d = v ? new Date(v as string) : null; return d && !isNaN(+d) ? d.toLocaleDateString("en-PK", { dateStyle: "medium" }) : "-"; };

export default function WalkingCustomers() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [onlyDue, setOnlyDue] = useState(true);
  const [open, setOpen] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try { const r = await fetch("/api/walking"); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Load nahi hua."); setList(Array.isArray(d) ? d : []); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  async function rename(w: any) {
    const name = window.prompt("Naam:", w.name); if (name === null) return;
    const phone = window.prompt("Phone:", w.phone || ""); if (phone === null) return;
    await fetch("/api/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "walkingCustomers", id: w._id, name: name.trim() || w.name, phone: phone.trim() }) });
    await load();
  }

  const rows = useMemo(() => { const s = q.trim().toLowerCase(); return list.filter((w) => (!onlyDue || w.balance > 0) && (!s || `${w.name} ${w.phone} ${w.code}`.toLowerCase().includes(s))); }, [list, q, onlyDue]);
  const due = list.filter((w) => w.balance > 0);

  return <main className={styles.win}>
    <div className={styles.titlebar}><span>▣ Walking Customers — {SHOP.name}</span><span><Link href="/">← Dashboard</Link><Link href="/vouchers?tab=walk">Walking Voucher</Link><Link href="/customers">Saved Customers</Link><Link href="/repairs">Repairs</Link></span></div>
    <section className={styles.body} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className={styles.card}>
        <h2>🚶 Walking Customer List <small style={{ color: "#94a3b8", fontSize: 13 }}>(jin ka paisa baqi hai — saved customers se alag)</small></h2>
        <div className={styles.stats}>
          <div className={styles.stat}><small>Baqi wale</small><b>{due.length}</b></div>
          <div className={styles.stat}><small>Total baqi</small><b>Rs. {money(due.reduce((a, w) => a + w.balance, 0))}</b></div>
          <div className={styles.stat}><small>Kul walking records</small><b>{list.length}</b></div>
        </div>
        <div className={styles.bar} style={{ marginTop: 0, marginBottom: 8 }}>
          <input className={styles.in} style={{ maxWidth: 320 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 naam / phone / code" />
          <label style={{ fontSize: 14 }}><input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} /> Sirf baqi wale</label>
          <button className={styles.alt} onClick={() => void load()}>⟳ Refresh</button>
          {loading && <span className={styles.hint}>load ho raha hai…</span>}{err && <span className={styles.msg}>{err}</span>}
        </div>
        <div className={styles.wrap} style={{ maxHeight: "64vh" }}><table className={styles.tbl}><thead><tr><th>ID</th><th>Naam</th><th>Phone</th><th>Pehli entry</th><th className={styles.num}>Kul bill</th><th className={styles.num}>Baqi</th><th>Action</th></tr></thead><tbody>
          {rows.map((w) => <Fragment key={w._id}>
            <tr><td>{w.code}</td><td>{w.name}</td><td>{w.phone || "-"}</td><td>{day(w.createdAt)}</td><td className={styles.num}>{money(w.totalBill)}</td>
              <td className={styles.num}><span className={`${styles.pill} ${w.balance > 0 ? styles.pDue : styles.pPaid}`}>Rs. {money(w.balance)}</span></td>
              <td><button className={styles.alt} onClick={() => setOpen(open === w._id ? "" : w._id)}>{open === w._id ? "Chhupayein" : "History"}</button> <button className={styles.alt} onClick={() => void rename(w)}>Edit</button> {w.balance > 0 && <Link className={styles.alt} style={{ textDecoration: "none", display: "inline-block" }} href={`/vouchers?tab=walk&walking=${w._id}`}>Wasooli Voucher</Link>}</td></tr>
            {open === w._id && <tr><td colSpan={7} style={{ background: "#0b1226" }}><table className={styles.tbl}><thead><tr><th>Type</th><th>Ref</th><th>Detail</th><th>Date</th><th className={styles.num}>Bill</th><th className={styles.num}>Paid</th><th className={styles.num}>Baqi</th></tr></thead><tbody>
              {w.rows.map((r: any, i: number) => <tr key={i}><td>{r.kind}</td><td>{r.ref}</td><td>{r.model || "-"}</td><td>{day(r.date)}</td><td className={styles.num}>{money(r.total)}</td><td className={styles.num}>{money(r.paid)}</td><td className={styles.num}>{money(r.remaining)}</td></tr>)}</tbody></table></td></tr>}
          </Fragment>)}
          {!rows.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: 18 }}>{onlyDue ? "Koi walking customer baqi nahi hai." : "Koi record nahi."}</td></tr>}</tbody></table></div>
      </div>
    </section>
  </main>;
}
