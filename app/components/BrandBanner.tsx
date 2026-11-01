import styles from "./brand.module.css";

export default function BrandBanner({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <header className={styles.banner}>
    <div className={styles.logo}><b>NEW<br />ARIF<br />MOBILE</b></div>
    <div className={styles.brand}>
      <div className={styles.name}>NEW ARIF MOBILE CENTER</div>
      <div className={styles.sub}>MOBILE &amp; REPAIRING · SALES | REPAIRING | ACCESSORIES | SOFTWARE</div>
      <div className={styles.addr}>Al saif plaza kamar mushani, mianwali · 03060882200 | 03260882200 | 03290882200</div>
    </div>
    <div className={styles.doc}><div className={styles.docTitle}>{title}</div>{subtitle && <div className={styles.docSub}>{subtitle}</div>}{right}</div>
  </header>;
}
