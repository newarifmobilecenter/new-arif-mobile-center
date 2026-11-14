import ShopLogoText from "@/app/components/ShopLogoText";
import { SHOP } from "@/lib/shop";
import styles from "./saleReceipt.module.css";
import { billPhones } from "../../lib/shopOptions";
import { BATTERY, PANEL, itemCategory, shortItemName } from "../../lib/saleReceiptUtil";

const money = (n: unknown) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

export default function SaleReceipt({ sale, customerName, customerPhone, thermal = true, temporary = false }: { sale: any; customerName?: string; customerPhone?: string; thermal?: boolean; temporary?: boolean }) {
  const items: any[] = Array.isArray(sale?.items) ? sale.items : [];
  const groups = new Map<string, any[]>();
  for (const i of items) { const c = itemCategory(i); groups.set(c, [...(groups.get(c) || []), i]); }
  const hasBattery = items.some((i) => BATTERY.test(itemCategory(i)) || BATTERY.test(String(i.name || "")));
  const hasPanel = items.some((i) => PANEL.test(itemCategory(i)) || PANEL.test(String(i.name || "")));
  const when = sale?.createdAt ? new Date(sale.createdAt) : new Date();
  const date = sale?.date || when.toLocaleDateString("en-PK", { dateStyle: "medium" });
  const time = when.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  const qtyTotal = items.reduce((n, i) => n + Number(i.qty || 0), 0);

  return <div className={`receipt ${styles.rc} ${thermal ? styles.thermal : ""}`}>
    <div className={styles.head}>
      <div className={styles.logo}><b><ShopLogoText /></b></div>
      <div className={styles.brand}>
        <div className={styles.name}>{SHOP.shortUpper}</div>
        <div className={styles.sub}>MOBILE &amp; REPAIRING</div>
        <div className={styles.svc}>SALES | REPAIRING | ACCESSORIES | SOFTWARE</div>
      </div>
    </div>
    <div className={styles.tag}>Your Phone Our Care</div>
    <div className={`${styles.title} ${styles.dark}`}>{temporary ? "TEMPORARY BILL" : "SALE INVOICE"}</div>
    {temporary && <div style={{ textAlign: "center", fontWeight: 800, fontSize: 11, margin: "2px 0" }}>Ye invoice nahi hai — sirf check karne ke liye</div>}

    <div className={styles.meta}>
      {!temporary && <div><span>Invoice No</span><b className={styles.inv}>{sale?.invoiceNo || "-"}</b></div>}
      <div><span>Date</span><b>{date}</b></div>
      <div><span>Time</span><b>{time}</b></div>
      <div><span>Customer</span><b>{customerName || sale?.cashRef || "WALKING CUSTOMER"}</b></div>
      {customerPhone ? <div><span>Phone</span><b>{customerPhone}</b></div> : null}
      {sale?.paymentMethod ? <div><span>Payment</span><b>{sale.paymentMethod}</b></div> : null}
    </div>

    <table className={styles.tbl}>
      <thead className={styles.dark}><tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      {[...groups.entries()].map(([cat, list]) => <tbody key={cat}>
        <tr className={styles.cat}><td colSpan={5}>{cat.toUpperCase()}</td></tr>
        {list.map((i, k) => <tr key={`${cat}-${k}`}>
          <td>{k + 1}</td><td className={styles.nm}>{shortItemName(i.name)}{Array.isArray(i.parts) ? i.parts.map((x: any, n: number) => <small key={n}>- {String(x.name || "")} x{x.qty}</small>) : null}{i.imei || i.serial ? <small>IMEI/Serial: {i.imei || i.serial}</small> : null}</td>
          <td>{i.qty}</td><td>{money(i.price)}</td><td>{money(i.total ?? Number(i.price || 0) * Number(i.qty || 0))}</td>
        </tr>)}
      </tbody>)}
    </table>

    <div className={styles.totals}>
      <div><span>Total Items</span><b>{qtyTotal}</b></div>
      {Number(sale?.grandTotal) > 0 && Number(sale?.grandTotal) !== Number(sale?.total) ? <div><span>Gross</span><b>Rs. {money(sale.grandTotal)}</b></div> : null}
      {Number(sale?.discountAmount) > 0 ? <div><span>Discount</span><b>- Rs. {money(sale.discountAmount)}</b></div> : null}
      {Number(sale?.salesTaxValue) > 0 ? <div><span>Sales Tax</span><b>Rs. {money(sale.salesTaxValue)}</b></div> : null}
      <div className={styles.net}><span>NET TOTAL</span><b>Rs. {money(sale?.total)}</b></div>
      <div><span>Paid</span><b>Rs. {money(sale?.paid)}</b></div>
      <div className={Number(sale?.remaining) > 0 ? styles.due : ""}><span>Remaining</span><b>Rs. {money(sale?.remaining)}</b></div>
      {sale?.prevBalance != null && <>
        <div><span>Previous Balance</span><b>Rs. {money(sale.prevBalance)}</b></div>
        <div><span>Cash Received</span><b>Rs. {money(sale?.paid)}</b></div>
        <div className={styles.net}><span>CURRENT BALANCE</span><b>Rs. {money(Number(sale.prevBalance) + Number(sale?.remaining || 0))}</b></div>
      </>}
    </div>

    {(hasBattery || hasPanel) && <div className={styles.warr}>
      <b>WARRANTY</b>
      {hasBattery && <p>Battery: Sirf battery ki timing (backup) ki <strong>7 din</strong> ki warranty hai. Toot phoot, pani ya ghalat istemal par warranty nahi.</p>}
      {hasPanel && <p>Panel / Display: <strong>koi warranty ya guarantee nahi.</strong> Check karke lein.</p>}
    </div>}

    <div className={`${styles.copy} ${styles.dark}`}>{temporary ? "--- TEMPORARY / NOT SAVED ---" : "--- CUSTOMER COPY ---"}</div>
    <div className={styles.shop}>
      <b>{SHOP.short}</b>
      <span>{SHOP.address}</span>
      <span>{billPhones(sale?.priceLevel)}</span>
    </div>
    <div className={styles.foot}>Bill dikhaye baghair warranty nahi. Shukriya! | Quality Service | Happy Customers</div>
  </div>;
}
