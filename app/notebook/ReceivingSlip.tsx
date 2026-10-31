import { QRCodeSVG } from "qrcode.react";
import styles from "./notebook.module.css";
import { SHOPKEEPER_OPTIONS, SHOP_PHONES } from "../../lib/shopOptions";

type RepairSlipData = {
  tokenNo: string;
  receivedAt: string | Date;
  customerName: string;
  customerPhone: string;
  model: string;
  mobileType: string;
  fault: string;
  condition: string;
  accessories?: string[];
  expectedReadyAt: string | Date;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopkeeper?: string;
};

const accessoryOptions = ["SIM", "Memory Card", "Simtray", "Battery"];
const mobileTypes = ["Keypad", "Android", "iPhone"];

function dateTime(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

function datePart(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-PK", { dateStyle: "medium" });
}

function timePart(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

export default function ReceivingSlip({ repair }: { repair: RepairSlipData }) {
  const received = new Set(repair.accessories || []);
  const otherAccessories = (repair.accessories || []).filter((item) => !accessoryOptions.includes(item) && item !== "Other");
  const hasOtherAcc = received.has("Other") || otherAccessories.length > 0;
  const keeper = (repair.shopkeeper || "").trim();
  const keeperOther = keeper && !SHOPKEEPER_OPTIONS.includes(keeper) ? keeper : "";
  const phone = repair.shopPhone && SHOP_PHONES.includes(repair.shopPhone) ? repair.shopPhone : repair.shopPhone || SHOP_PHONES[0];
  const box = (on: boolean) => <i className={styles.rsBox}>{on ? "✓" : ""}</i>;

  return <article className={styles.receivingSlip} aria-label="Customer copy mobile receiving slip">
    <header className={styles.rsHead}>
      <div className={styles.rsLogo}><b>NEW<br />ARIF<br />MOBILE</b></div>
      <div className={styles.rsBrand}>
        <div className={styles.rsName}>NEW ARIF MOBILE</div>
        <div className={styles.rsSub}>MOBILE &amp; REPAIRING</div>
        <div className={styles.rsServices}>SALES | REPAIRING | ACCESSORIES | SOFTWARE</div>
        <div className={styles.rsTag}>Your Phone Our Care</div>
      </div>
      <div className={styles.rsAll}>ALL BRANDS<br />ALL MODELS<br />ALL SOLUTIONS</div>
    </header>
    <div className={styles.rsBrands}>{["iPhone", "SAMSUNG", "xiaomi", "oppo", "vivo", "realme", "TECNO", "Infinix"].map((b) => <span key={b}>{b}</span>)}</div>
    <div className={`${styles.rsTitle} ${styles.rsDark}`}>MOBILE RECEIVING SLIP</div>

    <div className={styles.rsTokenRow}>
      <span className={styles.rsTokenLabel}>Token No:</span>
      <strong className={styles.rsToken}>{repair.tokenNo}</strong>
      <div className={styles.rsDate}><div>Date: {datePart(repair.receivedAt)}</div><div>Time: {timePart(repair.receivedAt)}</div></div>
      <div className={styles.rsQr}><QRCodeSVG value={repair.tokenNo} size={88} level="M" marginSize={0} /><span>{repair.tokenNo}</span></div>
    </div>

    <div className={styles.rsInfo}>
      <dl>
        <div><dt>Customer Name</dt><dd>{repair.customerName || "-"}</dd></div>
        <div><dt>Customer Phone</dt><dd>{repair.customerPhone || "-"}</dd></div>
        <div><dt>Mobile Model</dt><dd>{repair.model || "-"}</dd></div>
        <div><dt>Mobile Type</dt><dd className={styles.rsTypes}>{mobileTypes.map((t) => <span key={t}>{box(repair.mobileType === t)} {t}</span>)}{repair.mobileType && !mobileTypes.includes(repair.mobileType) && <span>{box(true)} {repair.mobileType}</span>}</dd></div>
        <div><dt>Fault / Problem</dt><dd>{repair.fault || "-"}</dd></div>
        <div><dt>Condition</dt><dd>{repair.condition || "-"}</dd></div>
      </dl>
      <div className={`${styles.rsPhone} ${styles.rsDark}`}><b>{(repair.model || "").split(" ")[0]}</b><span>{(repair.model || "").split(" ").slice(1).join(" ")}</span></div>
    </div>

    <div className={styles.rsAcc}>
      <b>Accessories Received:</b>
      <div>
        {accessoryOptions.map((item) => <span key={item}>{box(received.has(item))} {item}</span>)}
        <span>{box(hasOtherAcc)} Other: <u>{otherAccessories.join(", ")}</u></span>
      </div>
    </div>

    <div className={styles.rsReadyRow}>
      <div className={styles.rsReady}>
        <b>Expected Ready Time</b>
        <strong className={styles.rsDark}>{dateTime(repair.expectedReadyAt)}</strong>
      </div>
      <div className={styles.rsConfirm}>
        <p>This slip confirms that the above mobile has been received by New Arif Mobile for repair.</p>
        <em>Thank You!</em>
      </div>
    </div>

    <div className={`${styles.rsCopy} ${styles.rsDark}`}>--- CUSTOMER COPY ---</div>

    <div className={styles.rsShop}>
      <div className={styles.rsAddr}>
        <b>Shop Address:</b>
        <strong>New Arif Mobile</strong>
        <span>{repair.shopAddress || "Al saif plaza kamar mushani, mianwali"}</span>
        <div className={styles.rsPhoneRow}><b>Shop Phone:</b><strong>{phone}</strong></div>
      </div>
      <div className={styles.rsKeeper}>
        <b>Shopkeeper:</b>
        {SHOPKEEPER_OPTIONS.map((name) => <span key={name}>{box(keeper === name)} {name}</span>)}
        <span>{box(!!keeperOther)} Other: <u>{keeperOther}</u></span>
      </div>
    </div>
    <div className={styles.rsFoot}>Quality Service | Happy Customers</div>
  </article>;
}
