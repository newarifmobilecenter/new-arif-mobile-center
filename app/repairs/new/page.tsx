import Link from "next/link";
import RepairForm from "../../notebook/RepairForm";
import styles from "../../notebook/notebook.module.css";

export default async function NewRepair({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId = "" } = await searchParams;
  return <main className={`shell ${styles.page}`}>
    <nav className={`${styles.nav} ${styles.noPrint}`}><Link href="/repairs">← Repairs</Link><Link href="/">Dashboard</Link></nav>
    <header className={`${styles.header} ${styles.noPrint}`}><div><h1>New Mobile Repair</h1><p>Mobile receiving slip and repair intake</p></div></header>
    <RepairForm initialCustomerId={customerId} />
  </main>;
}