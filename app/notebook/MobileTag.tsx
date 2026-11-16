import styles from "./notebook.module.css";

/** Chhota tag jo mobile par chipkane ke liye (receiving slip ke baad dusre page par print hota hai). */
export default function MobileTag({ repair }: { repair: { tokenNo: string; customerName?: string; fault?: string; accessories?: string[] } }) {
  const has = new Set((repair.accessories || []).map((a) => a.toLowerCase()));
  const box = (label: string, on: boolean) => <div className={styles.mtBoxRow}><span>{label}</span><i className={styles.mtBox}>{on && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5l5.5 5.5L20.5 5.5" fill="none" stroke="#000" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</i></div>;
  return <article className={styles.mobileTag} aria-label="Mobile tag small label">
    <div className={styles.mtText}>
      <div className={styles.mtShop}>NEW ARIF MOBILE</div>
      <div className={styles.mtToken}>Token no. <b>{repair.tokenNo}</b></div>
      <div className={styles.mtLine}>Name. <b>{repair.customerName || "-"}</b></div>
      <div className={`${styles.mtLine} ${styles.mtFault}`}>F. <b>{repair.fault || "-"}</b></div>
    </div>
    <div className={styles.mtBoxes}>{box("Simtray", has.has("simtray"))}{box("SIM", has.has("sim"))}{box("Battery", has.has("battery"))}</div>
  </article>;
}
