import ShopLogoText from "@/app/components/ShopLogoText";
import { SHOP } from "@/lib/shop";
import styles from "./brand.module.css";

export default function BrandBanner({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <header className={styles.banner}>
    <div className={styles.logo}><b><ShopLogoText /></b></div>
    <div className={styles.brand}>
      <div className={styles.name}>{SHOP.nameUpper}</div>
      <div className={styles.sub}>MOBILE &amp; REPAIRING · SALES | REPAIRING | ACCESSORIES | SOFTWARE</div>
      <div className={styles.addr}>{SHOP.address} · {SHOP.phones.join(" | ")}</div>
    </div>
    <div className={styles.doc}><div className={styles.docTitle}>{title}</div>{subtitle && <div className={styles.docSub}>{subtitle}</div>}{right}</div>
  </header>;
}
