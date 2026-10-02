import { QRCodeSVG } from "qrcode.react";
import styles from "./notebook.module.css";

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

const accessoryOptions = ["SIM", "Memory Card", "Simtray", "Battery", "Other"];
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
  const receivedAccessories = new Set(repair.accessories || []);

  return <article className={styles.receivingSlip} aria-label="Customer copy mobile receiving slip">
    <header className={styles.receivingHeader}>
      <div className={styles.receivingBrand}>
        <div className={styles.receivingBrandName}>NEW ARIF MOBILE</div>
        <div className={styles.receivingBrandSubtitle}>MOBILE &amp; REPAIRING</div>
        <div className={styles.receivingServices}>SALES <i /> REPAIRING <i /> ACCESSORIES <i /> SOFTWARE</div>
        <div className={styles.receivingTagline}>“Your Phone Our Care”</div>
      </div>
      <div className={styles.brandLogos} aria-label="Mobile brands">
        {["SAMSUNG", "OPPO", "vivo", "TECNO", "Infinix", "Xiaomi"].map((brand) => <span key={brand}>{brand}</span>)}
      </div>
      <div className={styles.receivingTitle}>MOBILE RECEIVING SLIP</div>
    </header>
    <div className={styles.receivingTokenRow}>
      <div className={styles.receivingToken}>
        <span>Token No.</span>
        <strong>{repair.tokenNo}</strong>
      </div>
      <div className={styles.receivingQr} aria-label={`QR code for token ${repair.tokenNo}`}>
        <QRCodeSVG value={repair.tokenNo} size={88} level="M" marginSize={1} />
        <span>SCAN TOKEN</span>
      </div>
    </div>

    <section className={styles.receivingDates} aria-label="Receiving date and time">
      <div><b>Date</b><span>{datePart(repair.receivedAt)}</span></div>
      <div><b>Time</b><span>{timePart(repair.receivedAt)}</span></div>
    </section>

    <section className={styles.receivingCustomer}>
      <div className={styles.receivingSectionTitle}>CUSTOMER INFORMATION</div>
      <div className={styles.receivingCustomerGrid}>
        <div><b>Customer Name</b><span>{repair.customerName || "-"}</span></div>
        <div><b>Customer Phone</b><span>{repair.customerPhone || "-"}</span></div>
      </div>
    </section>

    <section className={styles.receivingDeviceSection}>
      <div className={styles.receivingDeviceDetails}>
        <div className={styles.receivingSectionTitle}>MOBILE DETAILS</div>
        <div className={styles.receivingFieldBox}><b>Mobile Model</b><span>{repair.model || "-"}</span></div>
        <div className={styles.receivingFieldBox}>
          <b>Mobile Type</b>
          <div className={styles.mobileTypeOptions}>
            {mobileTypes.map((type) => <span className={repair.mobileType === type ? styles.mobileTypeSelected : ""} key={type}>{repair.mobileType === type ? "✓ " : "□ "}{type}</span>)}
            {!mobileTypes.includes(repair.mobileType) && <span className={styles.mobileTypeSelected}>✓ {repair.mobileType}</span>}
          </div>
        </div>
      </div>
    </section>

    <section className={styles.receivingProblemGrid}>
      <div className={styles.receivingTextBox}><b>Fault / Problem</b><span>{repair.fault || "-"}</span></div>
      <div className={styles.receivingTextBox}><b>Condition</b><span>{repair.condition || "-"}</span></div>
    </section>

    <section className={styles.receivingAccessories}>
      <div className={styles.receivingSectionTitle}>ACCESSORIES RECEIVED</div>
      <div className={styles.accessoryOptions}>
        {accessoryOptions.map((item) => <span key={item}><i>{receivedAccessories.has(item) ? "✓" : ""}</i>{item}</span>)}
      </div>
    </section>

    <section className={styles.receivingReady}>
      <b>EXPECTED READY TIME</b>
      <strong>{dateTime(repair.expectedReadyAt)}</strong>
    </section>

    <section className={styles.receivingConfirmation}>
      <div className={styles.customerCopy}>CUSTOMER COPY</div>
      <p>This slip confirms that the mobile listed above has been received by New Arif Mobile for repair.</p>
      <div className={styles.receivingSignature}>Customer Signature <span /></div>
    </section>

    <footer className={styles.receivingFooter}>
      <div className={styles.receivingShop}>
        <div><b>Shop Address</b><span>{repair.shopAddress || "Al saif plaza kamar mushani, mianwali"}</span></div>
        <div><b>Shop Phone</b><span>0326-0882200<br />0329-0882200</span></div>
        <div><b>Shopkeeper</b><span>{repair.shopkeeper || "-"}</span></div>
      </div>
      <div className={styles.receivingFooterNote}>Thank you for choosing NEW ARIF MOBILE <span>·</span> “Your Phone Our Care”</div>
    </footer>
  </article>;
}