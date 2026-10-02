"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import ReceivingSlip from "../ReceivingSlip";
import NotebookEntryForm, { type NotebookEntry } from "../NotebookEntryForm";
import NotebookVoucher from "../NotebookVoucher";
import styles from "../notebook.module.css";

const money = (value: number) => Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
const localDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function RepairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [repair, setRepair] = useState<any>(null);
  const [customerBalance, setCustomerBalance] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<any>({});
  const [deliveryRecipientType, setDeliveryRecipientType] = useState("CUSTOMER");
  const [deliveryRecipientName, setDeliveryRecipientName] = useState("");
  const [deliveryCnic, setDeliveryCnic] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [reminderType, setReminderType] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [repairResponse, reminderResponse] = await Promise.all([fetch(`/api/repairs/${encodeURIComponent(id)}`), fetch(`/api/repairs/${encodeURIComponent(id)}/reminders`)]);
      const record = await repairResponse.json();
      if (!repairResponse.ok) throw new Error(record.error || "Repair record could not be loaded.");
      setRepair(record);
      setReminders(reminderResponse.ok ? await reminderResponse.json() : []);
      if (record.customerId) {
        const summaryResponse = await fetch(`/api/customers/${record.customerId}/summary`);
        if (summaryResponse.ok) setCustomerBalance(Number((await summaryResponse.json()).balance || 0));
      } else {
        setCustomerBalance(0);
      }
    } catch (caught: any) {
      setError(caught.message || "Repair record could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id]);

  function beginEdit() {
    setEdit({
      model: repair.model, mobileType: repair.mobileType, fault: repair.fault, condition: repair.condition,
      accessories: repair.accessories || [], imei: repair.imei || "", devicePassword: repair.devicePassword || "",
      expectedReadyAt: localDateTime(repair.expectedReadyAt), totalBill: String(repair.totalBill ?? repair.agreedRate ?? 0),
      paymentReminderDate: repair.paymentReminderAt ? new Date(repair.paymentReminderAt).toISOString().slice(0, 10) : "",
      deliveryMode: repair.deliveryMode || "PICKUP", remarks: repair.remarks || "", shopkeeper: repair.shopkeeper || "",
    });
    setEditing(true);
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/repairs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...edit, expectedReadyAt: new Date(edit.expectedReadyAt).toISOString(), totalBill: Number(edit.totalBill) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Repair could not be updated.");
      setRepair(data);
      setEditing(false);
      await load();
    } catch (caught: any) { setError(caught.message || "Repair could not be updated."); }
    finally { setBusy(false); }
  }

  async function changeStatus(status: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/repairs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, deliveryRecipientType, deliveryRecipientName, deliveryCnic, deliveryPhone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Repair status could not be updated.");
      setRepair(data);
      await load();
    } catch (caught: any) { setError(caught.message || "Repair status could not be updated."); }
    finally { setBusy(false); }
  }

  function beginReminder(type: string) {
    const greeting = `Assalam-o-Alaikum ${repair.customerName},`;
    const messages: Record<string, string> = {
      PAYMENT_DUE: `${greeting}\nNew Arif Mobile ki taraf se aapka outstanding balance Rs. ${money(customerBalance)} hai.\nToken: ${repair.tokenNo}\nShukriya.`,
      REPAIR_READY: `Assalam-o-Alaikum ${repair.customerName},\nآپ کا موبائل تیار ہے۔\nToken: ${repair.tokenNo}\nNew Arif Mobile`,
      MOBILE_DELIVERY: `Assalam-o-Alaikum ${repair.customerName},\nآپ کے موبائل کی ڈلیوری کے لیے رابطہ کریں۔\nToken: ${repair.tokenNo}\nNew Arif Mobile`,
    };
    setReminderType(type);
    setReminderMessage(messages[type] || messages.REPAIR_READY);
  }

  async function openWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(reminderMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setReminderType("");
    const response = await fetch(`/api/repairs/${repair._id}/reminders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: reminderType, message: reminderMessage }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Reminder preparation could not be recorded."); return; }
    await load();
  }

  if (loading) return <main className={`shell ${styles.page} ${styles.repairDetailPage}`}><p>Loading repair...</p></main>;
  if (!repair) return <main className={`shell ${styles.page} ${styles.repairDetailPage}`}><Link href="/repairs">← Repairs</Link><p className={styles.notice}>{error || "Repair record not found."}</p></main>;

  return <main className={`shell ${styles.page} ${styles.repairDetailPage}`}>
    <nav className={`${styles.nav} ${styles.noPrint}`}><Link href="/repairs">← Repairs</Link>{repair.customerId && <Link href={`/customers/${repair.customerId}`}>Customer Profile</Link>}<Link href="/ledger">Customer Ledger</Link><Link href="/reminders">Reminder Inbox</Link></nav>
    {error && <p className={`${styles.notice} ${styles.noPrint}`} role="alert">{error}</p>}
    <header className={`${styles.header} ${styles.noPrint}`}>
      <div><h1>{repair.tokenNo}</h1><p>{new Date(repair.receivedAt).toLocaleString("en-PK")} · {repair.customerName} · {repair.model}</p></div>
      <div className={styles.actions}>
        <button className={styles.buttonSecondary} onClick={() => window.print()}>Print Customer Copy</button>
        <button className={styles.button} onClick={beginEdit}>Edit Repair</button>
        {repair.customerId && <Link className={styles.buttonSecondary} href={`/ledger?customer=${repair.customerId}`}>Receive Payment</Link>}
      </div>
    </header>

    {editing ? <form className={`${styles.panel} ${styles.repairForm} ${styles.noPrint}`} onSubmit={saveEdit}>
      <h2>Edit Repair</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>Mobile Model<input value={edit.model} onChange={(event) => setEdit({ ...edit, model: event.target.value })} required /></label>
        <label className={styles.field}>Mobile Type<select value={edit.mobileType} onChange={(event) => setEdit({ ...edit, mobileType: event.target.value })}>{["Android", "iPhone", "Keypad", "Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className={`${styles.field} ${styles.wide}`}>Fault / Problem<textarea value={edit.fault} onChange={(event) => setEdit({ ...edit, fault: event.target.value })} required /></label>
        <label className={`${styles.field} ${styles.wide}`}>Condition<textarea value={edit.condition} onChange={(event) => setEdit({ ...edit, condition: event.target.value })} /></label>
        <label className={styles.field}>Expected Ready<input type="datetime-local" value={edit.expectedReadyAt} onChange={(event) => setEdit({ ...edit, expectedReadyAt: event.target.value })} required /></label>
        <label className={styles.field}>Total Bill<input type="number" min="0" step="0.01" value={edit.totalBill} onChange={(event) => setEdit({ ...edit, totalBill: event.target.value })} required /></label>
        <label className={styles.field}>Payment Reminder<input type="date" value={edit.paymentReminderDate} onChange={(event) => setEdit({ ...edit, paymentReminderDate: event.target.value })} /></label>
        <label className={styles.field}>IMEI (internal)<input value={edit.imei} onChange={(event) => setEdit({ ...edit, imei: event.target.value })} /></label>
        <label className={styles.field}>Password (internal)<input type="password" autoComplete="new-password" value={edit.devicePassword} onChange={(event) => setEdit({ ...edit, devicePassword: event.target.value })} /></label>
        <label className={`${styles.field} ${styles.wide}`}>Remarks<textarea value={edit.remarks} onChange={(event) => setEdit({ ...edit, remarks: event.target.value })} /></label>
      </div>
      <div className={styles.actions}><button type="button" className={styles.buttonSecondary} onClick={() => setEditing(false)}>Cancel</button><button className={styles.button} disabled={busy}>Save Changes</button></div>
    </form> : <>
      <section className={`${styles.panel} ${styles.noPrint}`}>
        <div className={styles.balanceSummary}>
          <div><span className={styles.muted}>Repair Status</span><div><span className={styles.status} data-status={repair.status}>{repair.status}</span></div></div>
          <div><span className={styles.muted}>Payment Status</span><div><span className={styles.status} data-status={repair.paymentStatus}>{repair.paymentStatus === "PAID" ? "PAID" : "CREDIT / PAYMENT DUE"}</span></div></div>
          <div><span className={styles.muted}>{repair.customerId ? "Customer Outstanding" : "POS Customer Link"}</span><div className={styles.balanceValue}>{repair.customerId ? `Rs. ${money(customerBalance)}` : "Not linked"}</div></div>
        </div>
        <div className={styles.actions}>
          {repair.status === "RECEIVED" && <button className={styles.button} disabled={busy} onClick={() => void changeStatus("IN_REPAIR")}>Start Repair</button>}
          {repair.status === "IN_REPAIR" && <button className={styles.button} disabled={busy} onClick={() => void changeStatus("READY")}>Mark Ready</button>}
          {["RECEIVED", "IN_REPAIR", "READY"].includes(repair.status) && Number(repair.totalBill || 0) === 0 && Number(repair.paid || 0) === 0 && <button className={styles.buttonDanger} disabled={busy} onClick={() => void changeStatus("CANCELLED")}>Cancel Unbilled Repair</button>}
          {repair.status === "READY" && <button className={styles.buttonSecondary} onClick={() => beginReminder("REPAIR_READY")}>WhatsApp Reminder</button>}
          {repair.remaining > 0 && <button className={styles.buttonSecondary} onClick={() => beginReminder("PAYMENT_DUE")}>WhatsApp Payment Due</button>}
          {repair.status === "READY" && repair.deliveryMode === "DELIVERY" && <button className={styles.buttonSecondary} onClick={() => beginReminder("MOBILE_DELIVERY")}>WhatsApp Delivery</button>}
        </div>
      </section>

      <section className={`${styles.panel} ${styles.noPrint}`}>
        <h2>Repair Record</h2>
        <div className={styles.formGrid}>
          <div><b>Customer:</b> {repair.customerName} · {repair.customerPhone || "-"}</div>{repair.customerId && <div><b>POS Customer:</b> Linked</div>}
          <div><b>Model:</b> {repair.model} · {repair.mobileType}</div><div><b>Fault:</b> {repair.fault}</div><div><b>Condition:</b> {repair.condition || "-"}</div>
          <div><b>Accessories:</b> {(repair.accessories || []).join(", ") || "None"}</div><div><b>Expected Ready:</b> {new Date(repair.expectedReadyAt).toLocaleString("en-PK")}</div>
          <div><b>Total Bill:</b> Rs. {money(repair.totalBill ?? repair.agreedRate)}</div><div><b>Paid:</b> Rs. {money(repair.paid)}</div><div><b>Remaining:</b> Rs. {money(repair.remaining)}</div>
          <div><b>Payment Method:</b> {repair.paymentMethod}</div><div><b>Reminder Date:</b> {repair.paymentReminderAt ? new Date(repair.paymentReminderAt).toLocaleDateString("en-PK") : "-"}</div>
          <div><b>Delivery Plan:</b> {repair.deliveryMode}</div><div><b>Remarks:</b> {repair.remarks || "-"}</div>
        </div>
        <details className={styles.formSection}><summary>Internal security details</summary><div className={styles.formGrid}><div><b>IMEI:</b> {repair.imei || "-"}</div><div><b>Password:</b> {repair.devicePassword || "-"}</div></div></details>
      </section>

      <section className={`${styles.panel} ${styles.noPrint}`}>
        <h2>Delivery / Handover</h2>
        {repair.delivery ? <p>Delivered to {repair.delivery.recipientType === "CUSTOMER" ? "customer" : repair.delivery.name}{repair.delivery.phone ? ` · ${repair.delivery.phone}` : ""}{repair.delivery.cnic ? ` · CNIC ${repair.delivery.cnic}` : ""}</p> : <div className={styles.formGrid}>
          <label className={styles.field}>Recipient<select value={deliveryRecipientType} onChange={(event) => setDeliveryRecipientType(event.target.value)}><option value="CUSTOMER">Customer</option><option value="OTHER_PERSON">Other Person</option></select></label>
          {deliveryRecipientType === "OTHER_PERSON" && <><label className={styles.field}>Name<input value={deliveryRecipientName} onChange={(event) => setDeliveryRecipientName(event.target.value)} /></label><label className={styles.field}>CNIC<input value={deliveryCnic} onChange={(event) => setDeliveryCnic(event.target.value)} /></label><label className={styles.field}>Phone<input value={deliveryPhone} onChange={(event) => setDeliveryPhone(event.target.value)} /></label></>}
          {repair.status === "READY" && <button className={styles.button} disabled={busy} onClick={() => void changeStatus("DELIVERED")}>Deliver Mobile</button>}
        </div>}
      </section>

      <section className={`${styles.panel} ${styles.noPrint}`}><h2>Status History</h2><div className={styles.historyList}>{(repair.statusHistory || []).map((item: any, index: number) => <div className={styles.historyItem} key={`${item.status}-${index}`}><b>{item.status}</b> · {new Date(item.at).toLocaleString("en-PK")} · {item.user}</div>)}</div></section>
      <section className={`${styles.panel} ${styles.noPrint}`}><h2>Payment History</h2>{repair.paymentHistory?.length ? <div className={styles.historyList}>{repair.paymentHistory.map((item: any, index: number) => <div className={styles.historyItem} key={`${item.reference}-${index}`}><b>Rs. {money(item.amount)}</b> · {item.paymentMethod} · {item.type} · {new Date(item.at).toLocaleString("en-PK")}<br /><small>Reference: {item.reference || repair.tokenNo}</small></div>)}</div> : <p className={styles.muted}>No repair payments recorded.</p>}</section>
      <section className={`${styles.panel} ${styles.noPrint}`}><h2>Reminder History</h2>{reminders.length ? <div className={styles.historyList}>{reminders.map((item: any) => <div className={styles.historyItem} key={item._id}><b>{item.type}</b> · {item.method} · {item.action} · {new Date(item.createdAt).toLocaleString("en-PK")}<br /><small>Draft preparation recorded only. Sending is not verified.</small></div>)}</div> : <p className={styles.muted}>No reminders prepared.</p>}</section>
    </>}

    {!editing && <ReceivingSlip repair={repair} />}
    {reminderType && <div className={styles.reminderModal} role="presentation"><section className={styles.reminderDialog} role="dialog" aria-modal="true" aria-labelledby="reminder-title"><h2 id="reminder-title">Review WhatsApp message</h2><label className={styles.field}>Message<textarea value={reminderMessage} onChange={(event) => setReminderMessage(event.target.value)} rows={7} /></label><p className={styles.muted}>This prepares an editable WhatsApp draft. It will not send automatically, and the app cannot verify that it was opened or sent.</p><div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setReminderType("")}>Cancel</button><button className={styles.button} onClick={() => void openWhatsApp()}>Prepare WhatsApp Draft</button></div></section></div>}
  </main>;
}

function NotebookEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<NotebookEntry | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/notebook/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Notebook entry could not be loaded.");
        if (!active) return;
        setEntry(data.entry);
        setCanDelete(Boolean(data.permissions?.canDelete));
        setError("");
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Notebook entry could not be loaded.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function softDelete() {
    if (!entry?._id || !window.confirm(`Move Notebook entry ${entry.entryNo || ""} to deleted records?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/notebook/${encodeURIComponent(entry._id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Notebook entry could not be deleted.");
      router.push("/notebook");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notebook entry could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className={`shell ${styles.page} ${styles.notebookDetailPage}`}><p>Loading Notebook entry...</p></main>;
  if (!entry) return <main className={`shell ${styles.page} ${styles.notebookDetailPage}`}><Link href="/notebook">← Notebook</Link><p className={styles.notice}>{error || "Notebook entry not found."}</p></main>;

  return <main className={`shell ${styles.page} ${styles.notebookDetailPage}`}>
    <nav className={`${styles.nav} ${styles.noPrint}`}><Link href="/notebook">← Notebook</Link><Link href="/">Dashboard</Link></nav>
    {error && <p className={`${styles.notice} ${styles.noPrint}`} role="alert">{error}</p>}
    <header className={`${styles.header} ${styles.noPrint}`}>
      <div><h1>{entry.entryNo || "Notebook Entry"}</h1><p>{entry.customerName} · {entry.title}</p></div>
      <div className={styles.actions}>
        <button className={styles.buttonSecondary} onClick={() => window.print()}>Print Voucher</button>
        <button className={styles.button} onClick={() => setEditing(true)}>Edit Entry</button>
        {canDelete && <button className={styles.buttonDanger} disabled={busy} onClick={() => void softDelete()}>Delete Entry</button>}
      </div>
    </header>
    {editing
      ? <div className={styles.noPrint}><NotebookEntryForm entry={entry} onCancel={() => setEditing(false)} onSaved={(saved) => { setEntry(saved); setEditing(false); }} /></div>
      : <NotebookVoucher entry={entry} />}
  </main>;
}

export default function NotebookOrRepairDetailPage() {
  const pathname = usePathname();
  return pathname.startsWith("/repairs/") ? <RepairDetailPage /> : <NotebookEntryDetailPage />;
}