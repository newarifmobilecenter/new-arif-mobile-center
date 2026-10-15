"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./notebook.module.css";

const accessories = ["SIM", "Memory Card", "Simtray", "Battery", "Other"];
const mobileTypes = ["Android", "iPhone", "Keypad", "Other"];
const paymentMethods = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "Bank", "Other"];
const pad = (value: number) => String(value).padStart(2, "0");
const localDateTime = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

type Customer = { _id: string; name: string; phone?: string };
type ShopInfo = { shopkeeper: string; shopName: string; address: string; phone: string; shopkeepers: string[] };

export default function RepairForm({ initialCustomerId = "" }: { initialCustomerId?: string }) {
  const router = useRouter();
  const now = new Date();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shop, setShop] = useState<ShopInfo>({ shopkeeper: "", shopName: "NEW ARIF MOBILE", address: "Al saif plaza kamar mushani, mianwali", phone: "", shopkeepers: [] });
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const customerDetailsTouched = useRef(false);
  const readyTimeTouched = useRef(false);
  const [model, setModel] = useState("");
  const [tokenNo, setTokenNo] = useState("C1000");
  const [mobileType, setMobileType] = useState("Android");
  const [fault, setFault] = useState("");
  const [condition, setCondition] = useState("");
  const [receivedAccessories, setReceivedAccessories] = useState<string[]>([]);
  const [imei, setImei] = useState("");
  const [devicePassword, setDevicePassword] = useState("");
  const [expectedReadyAt, setExpectedReadyAt] = useState(() => localDateTime(new Date(now.getTime() + 3 * 60 * 60 * 1000)));
  const [totalBill, setTotalBill] = useState("0");
  const [paid, setPaid] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [reminderPreset, setReminderPreset] = useState("TODAY");
  const [customReminderDate, setCustomReminderDate] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("PICKUP");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remaining = Math.max(0, Number(totalBill || 0) - Number(paid || 0));
  const paymentStatus = remaining > 0 ? "PAYMENT_DUE" : "PAID";

  useEffect(() => {
    Promise.all([
      fetch("/api/data?collection=customers&limit=5000").then((response) => response.json()),
      fetch("/api/repairs/meta").then((response) => response.json()),
    ]).then(([customerData, shopData]) => {
      setCustomers(Array.isArray(customerData) ? customerData : []);
      if (shopData && !shopData.error) {
        setShop((current) => ({ ...current, ...shopData }));
        if (shopData.nextToken) setTokenNo(String(shopData.nextToken));
      }
    }).catch(() => setError("Customer or shop information could not be loaded."));
  }, []);

  useEffect(() => {
    if (!initialCustomerId || customers.length === 0 || customerDetailsTouched.current) return;
    selectCustomer(initialCustomerId);
  }, [initialCustomerId, customers]);

  function selectCustomer(id: string) {
    const selected = customers.find((customer) => customer._id === id);
    setCustomerId(selected?._id || "");
    if (selected) {
      setCustomerName(selected.name || "");
      setCustomerPhone(selected.phone || "");
    }
  }

  function reminderDate() {
    const date = new Date();
    if (reminderPreset === "TOMORROW") date.setDate(date.getDate() + 1);
    if (reminderPreset === "THREE_DAYS") date.setDate(date.getDate() + 3);
    if (reminderPreset === "ONE_WEEK") date.setDate(date.getDate() + 7);
    if (reminderPreset === "CUSTOM") return customReminderDate;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    // If the form stayed open, an untouched default ready time becomes stale; refresh it to "now + 3 hours".
    const readyValue = readyTimeTouched.current ? expectedReadyAt : localDateTime(new Date(Date.now() + 3 * 60 * 60 * 1000));
    if (!readyTimeTouched.current) setExpectedReadyAt(readyValue);
    if (new Date(readyValue).getTime() < Date.now()) {
      setError("Expected ready time guzar chuka hai. Aage ki date/time chunein.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null, customerName, customerPhone, tokenNo, model, mobileType, fault, condition,
          accessories: receivedAccessories, imei, devicePassword,
          expectedReadyAt: new Date(readyValue).toISOString(), totalBill: Number(totalBill), paid: Number(paid),
          paymentMethod, paymentReminderDate: remaining > 0 ? reminderDate() : "", deliveryMode,
          remarks, shopkeeper: shop.shopkeeper, shopPhone: shop.phone, shopAddress: shop.address,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Repair could not be received.");
      router.push(`/repairs/${data._id}`);
    } catch (caught: any) {
      setError(caught.message || "Repair could not be received.");
    } finally {
      setBusy(false);
    }
  }

  return <form className={`${styles.panel} ${styles.repairForm}`} onSubmit={save}>
    <section className={styles.formSection}>
      <h2>Customer</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>Customer Name<input value={customerName} onChange={(event) => { customerDetailsTouched.current = true; setCustomerName(event.target.value); }} maxLength={120} required /></label>
        <label className={styles.field}>Customer Phone / Number<input type="tel" value={customerPhone} onChange={(event) => { customerDetailsTouched.current = true; setCustomerPhone(event.target.value); }} maxLength={32} /></label>
        <label className={`${styles.field} ${styles.wide}`}>Link Existing Customer (optional)<select value={customerId} onChange={(event) => selectCustomer(event.target.value)}>
          <option value="">Do not link a POS customer</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ""}</option>)}
        </select></label>
      </div>
    </section>

    <section className={styles.formSection}>
      <h2>Mobile</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>Receiving Serial No.<input value={tokenNo} onChange={(event) => setTokenNo(event.target.value.toUpperCase())} maxLength={13} pattern="C[0-9]{1,12}" title="Use C followed by 1 to 12 digits, e.g. C1000." placeholder="C1000" required /></label>
        <label className={styles.field}>Mobile Model<input value={model} onChange={(event) => setModel(event.target.value)} maxLength={120} required /></label>
        <label className={styles.field}>Mobile Type<select value={mobileType} onChange={(event) => setMobileType(event.target.value)}>{mobileTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      </div>
    </section>

    <section className={styles.formSection}>
      <h2>Problem &amp; Condition</h2>
      <div className={styles.formGrid}>
        <label className={`${styles.field} ${styles.wide}`}>Fault / Problem<textarea value={fault} onChange={(event) => setFault(event.target.value)} maxLength={2000} required /></label>
        <label className={`${styles.field} ${styles.wide}`}>Condition<textarea value={condition} onChange={(event) => setCondition(event.target.value)} maxLength={1000} /></label>
      </div>
      <fieldset className={styles.accessoryFieldset}><legend>Accessories received</legend>{accessories.map((item) => <label key={item}><input type="checkbox" checked={receivedAccessories.includes(item)} onChange={(event) => setReceivedAccessories((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} /> {item}</label>)}</fieldset>
    </section>

    <details className={styles.formSection}>
      <summary>Security / Internal (staff only)</summary>
      <div className={styles.formGrid}>
        <label className={styles.field}>IMEI<input value={imei} onChange={(event) => setImei(event.target.value)} maxLength={40} autoComplete="off" /></label>
        <label className={styles.field}>Password / Security information<input type="password" value={devicePassword} onChange={(event) => setDevicePassword(event.target.value)} maxLength={160} autoComplete="new-password" /></label>
      </div>
    </details>

    <section className={styles.formSection}>
      <h2>Expected Ready</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>Expected ready time<input type="datetime-local" value={expectedReadyAt} onChange={(event) => { readyTimeTouched.current = true; setExpectedReadyAt(event.target.value); }} required /></label>
        <label className={styles.field}>Payment reminder
          <select value={reminderPreset} onChange={(event) => setReminderPreset(event.target.value)}>
            <option value="TODAY">Today</option><option value="TOMORROW">Tomorrow</option><option value="THREE_DAYS">3 Days</option><option value="ONE_WEEK">1 Week</option><option value="CUSTOM">Custom Date</option>
          </select>
        </label>
        {reminderPreset === "CUSTOM" && <label className={styles.field}>Custom reminder date<input type="date" value={customReminderDate} onChange={(event) => setCustomReminderDate(event.target.value)} required /></label>}
      </div>
    </section>

    <section className={styles.formSection}>
      <h2>Billing</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>Total Bill<input type="number" min="0" max="1000000000000" step="0.01" value={totalBill} onChange={(event) => setTotalBill(event.target.value)} required /></label>
        <label className={styles.field}>Paid<input type="number" min="0" max="1000000000000" step="0.01" value={paid} onChange={(event) => setPaid(event.target.value)} required /></label>
        <div className={styles.field}>Remaining<span className={styles.readonly}>Rs. {remaining.toLocaleString("en-PK", { maximumFractionDigits: 2 })}</span></div>
        <label className={styles.field}>Payment Method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
        <div className={styles.field}>Payment Status<span className={styles.readonly}><span className={styles.status} data-status={paymentStatus}>{paymentStatus === "PAID" ? "PAID" : "CREDIT / PAYMENT DUE"}</span></span></div>
      </div>
    </section>

    <section className={styles.formSection}>
      <h2>Delivery</h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>Handover plan<select value={deliveryMode} onChange={(event) => setDeliveryMode(event.target.value)}><option value="PICKUP">Customer pickup</option><option value="DELIVERY">Mobile delivery</option></select></label>
        <label className={styles.field}>Shopkeeper<select value={shop.shopkeeper} onChange={(event) => setShop((current) => ({ ...current, shopkeeper: event.target.value }))}><option value="">Select shopkeeper</option>{shop.shopkeepers.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className={`${styles.field} ${styles.wide}`}>Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={1500} /></label>
      </div>
      <p className={styles.muted}>Shop details: {shop.address || "Al saif plaza kamar mushani, mianwali"}{shop.phone ? ` · ${shop.phone}` : " · No shop phone configured"}</p>
    </section>

    {error && <p className={styles.notice} role="alert">{error}</p>}
    <div className={styles.toolbar}>
      <span className={styles.muted}>Repair receiving does not change stock. An advance is added to the customer account only when linked; later linked-customer payments use Customer Payment.</span>
      <button className={styles.button} type="submit" disabled={busy}>{busy ? "Receiving..." : "Receive Mobile"}</button>
    </div>
  </form>;
}
