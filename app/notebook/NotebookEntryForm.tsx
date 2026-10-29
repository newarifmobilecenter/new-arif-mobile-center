"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./notebook.module.css";
import NumInput from "../components/NumInput";

export type NotebookEntry = {
  _id?: string;
  entryNo?: string;
  date: string;
  customerId?: string | null;
  customerName: string;
  phone: string;
  title: string;
  description: string;
  amount: number;
  paid: number;
  remaining: number;
  paymentMethod: string;
  status: "PAID" | "PARTIAL" | "UNPAID";
  remarks: string;
};

type EntryFields = Omit<NotebookEntry, "_id" | "entryNo" | "remaining" | "status">;
type Customer = { _id: string; name: string; phone?: string };
type Props = {
  entry?: NotebookEntry;
  initialCustomerId?: string;
  onSaved?: (entry: NotebookEntry) => void;
  onCancel?: () => void;
};

const paymentMethods = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "Bank", "Other"];

function today() {
  const current = new Date();
  return new Date(current.getTime() - current.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function amountText(value: number) {
  return Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
}

function initialFields(entry?: NotebookEntry, initialCustomerId = ""): EntryFields {
  return {
    date: entry?.date || today(),
    customerId: entry?.customerId || initialCustomerId || null,
    customerName: entry?.customerName || "",
    phone: entry?.phone || "",
    title: entry?.title || "",
    description: entry?.description || "",
    amount: entry?.amount ?? 0,
    paid: entry?.paid ?? 0,
    paymentMethod: entry?.paymentMethod || "Cash",
    remarks: entry?.remarks || "",
  };
}

export default function NotebookEntryForm({ entry, initialCustomerId = "", onSaved, onCancel }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<EntryFields>(() => initialFields(entry, initialCustomerId));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remainingPreview = Math.max(0, Number(form.amount || 0) - Number(form.paid || 0));

  useEffect(() => {
    fetch("/api/data?collection=customers&limit=5000")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    if (entry || !initialCustomerId || !customers.length) return;
    const selected = customers.find((customer) => customer._id === initialCustomerId);
    if (!selected) return;
    setForm((current) => ({
      ...current,
      customerId: selected._id,
      customerName: selected.name || current.customerName,
      phone: selected.phone || current.phone,
    }));
  }, [customers, entry, initialCustomerId]);

  function update<K extends keyof EntryFields>(key: K, value: EntryFields[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectCustomer(id: string) {
    const selected = customers.find((customer) => customer._id === id);
    setForm((current) => ({
      ...current,
      customerId: selected?._id || null,
      customerName: selected?.name || current.customerName,
      phone: selected?.phone || current.phone,
    }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const url = entry?._id ? `/api/notebook/${encodeURIComponent(entry._id)}` : "/api/notebook";
      const response = await fetch(url, {
        method: entry?._id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Notebook entry could not be saved.");
      const saved = (data.entry || data) as NotebookEntry;
      if (onSaved) onSaved(saved);
      else if (saved._id) router.push(`/notebook/${encodeURIComponent(saved._id)}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notebook entry could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <form className={`${styles.panel} ${styles.repairForm}`} onSubmit={save}>
    <section className={styles.formSection}>
      <h2>Customer</h2>
      <div className={styles.formGrid}>
        <label className={`${styles.field} ${styles.wide}`}>Select Existing Customer (optional)
          <select value={form.customerId || ""} onChange={(event) => selectCustomer(event.target.value)}>
            <option value="">No existing customer</option>
            {customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ""}</option>)}
          </select>
        </label>
        <p className={`${styles.muted} ${styles.wide}`}>Or enter customer manually</p>
        <label className={styles.field}>Name<input value={form.customerName} onChange={(event) => update("customerName", event.target.value)} maxLength={120} required /></label>
        <label className={styles.field}>Phone<input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} maxLength={32} /></label>
      </div>
    </section>

    <section className={styles.formSection}>
      <h2>Entry Details</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>Date<input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required /></label>
        <label className={styles.field}>Subject / Title<input value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={160} required /></label>
        <label className={`${styles.field} ${styles.wide}`}>Description / Details<textarea value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={5000} rows={4} /></label>
      </div>
    </section>

    <section className={styles.formSection}>
      <h2>Payment</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>Amount<NumInput min="0" max="1000000000000" step="0.01" value={form.amount} onValue={(v) => update("amount", v)} required /></label>
        <label className={styles.field}>Paid<NumInput min="0" max="1000000000000" step="0.01" value={form.paid} onValue={(v) => update("paid", v)} required /></label>
        <div className={styles.field}>Remaining (calculated)<span className={styles.readonly}>Rs. {amountText(remainingPreview)}</span></div>
        <label className={styles.field}>Payment Method<select value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
        <label className={`${styles.field} ${styles.wide}`}>Remarks<textarea value={form.remarks} onChange={(event) => update("remarks", event.target.value)} maxLength={1500} rows={3} /></label>
      </div>
    </section>

    {error && <p className={styles.notice} role="alert">{error}</p>}
    <div className={styles.toolbar}>
      {onCancel && <button className={styles.buttonSecondary} type="button" onClick={onCancel}>Cancel</button>}
      <button className={styles.button} type="submit" disabled={busy}>{busy ? "Saving..." : entry ? "Save Changes" : "Save Entry"}</button>
    </div>
  </form>;
}