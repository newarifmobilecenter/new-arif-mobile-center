"use client";

import { useState } from "react";
import styles from "./pos.module.css";
import { notify } from "@/lib/toast";

const money = (v: number) => Number(v || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

// Small box in New Sale: repairs that are Ready / Delivered and not billed yet.
export default function RepairBox({ repairs, inCart, onAdd, onChanged }: { repairs: any[]; inCart: Set<string>; onAdd: (r: any) => void; onChanged: () => void | Promise<void> }) {
  const [edit, setEdit] = useState<any | null>(null);
  const [bill, setBill] = useState("");
  const [fee, setFee] = useState("0");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function open(r: any) {
    setEdit(r); setBill(String(Number(r.totalBill || 0))); setFee("0"); setNote(String(r.remarks || ""));
  }
  async function save() {
    if (!edit || busy) return;
    const total = Number(bill || 0) + Number(fee || 0);
    if (!Number.isFinite(total) || total < 0) { notify("Bill ka amount theek likhein.", { kind: "warning" }); return; }
    if (total < Number(edit.paid || 0)) { notify(`Bill advance (Rs. ${money(edit.paid)}) se kam nahi ho sakta.`, { kind: "warning" }); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/repairs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit._id, totalBill: total, remarks: note }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save nahi hua.");
      notify(`${edit.tokenNo} update ho gaya.`, { kind: "success" });
      setEdit(null);
      await onChanged();
    } catch (e: any) { notify(e?.message || "Save nahi hua.", { kind: "danger" }); } finally { setBusy(false); }
  }

  return <div className={styles.repairBox}>
    <div className={styles.repairBoxHead}>🔧 Repair Ready to Sale <b>({repairs.length})</b></div>
    <div className={styles.repairGrid}>
      {repairs.length === 0 && <span className={styles.repairEmpty}>Koi ready repair nahi</span>}
      {repairs.map((r) => {
        const baqi = Math.max(0, Number(r.totalBill || 0) - Number(r.paid || 0));
        const added = inCart.has(String(r._id));
        return <div key={r._id} className={`${styles.repairCard} ${r.status === "DELIVERED" ? styles.repairDelivered : styles.repairReady}`} title={`${r.customerName || ""} · ${r.model || ""}\n${(r.parts || []).map((p: any) => p.name).join(", ")}`}>
          <span className={styles.repairTxt}><b>{r.tokenNo}</b> {r.model}<small>{r.status === "DELIVERED" ? "Delivered" : "Ready"} · Rs. {money(baqi)}</small></span>
          <button type="button" disabled={added} onClick={() => onAdd(r)} title="Sale mein add karein">{added ? "✔" : "＋"}</button>
          <button type="button" onClick={() => open(r)} title="Edit (kaam / fitting fee)">✎</button>
        </div>;
      })}
    </div>
    {edit && <div className={styles.repairModalBg} onMouseDown={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
      <div className={styles.repairModal} data-no-nav="1">
        <h3>{edit.tokenNo} — {edit.model}</h3>
        <p>{edit.customerName} {edit.customerPhone ? `· ${edit.customerPhone}` : ""}<br />Fault: {edit.fault}{(edit.parts || []).length ? <><br />Parts: {(edit.parts || []).map((p: any) => p.name).join(", ")}</> : null}</p>
        <label>Total Bill (Rs.)<input type="number" value={bill} onChange={(e) => setBill(e.target.value)} /></label>
        <label>＋ Fitting / Extra fee (Rs.)<input type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></label>
        <label>Kaam ka note<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. panel + charging strip change, fitting" /></label>
        <p>Advance mila: Rs. {money(edit.paid)} · Naya baqi: <b>Rs. {money(Math.max(0, Number(bill || 0) + Number(fee || 0) - Number(edit.paid || 0)))}</b></p>
        <div className={styles.repairModalBtns}><button type="button" onClick={() => setEdit(null)}>Cancel</button><button type="button" className={styles.repairSave} disabled={busy} onClick={() => void save()}>Save</button></div>
      </div>
    </div>}
  </div>;
}
