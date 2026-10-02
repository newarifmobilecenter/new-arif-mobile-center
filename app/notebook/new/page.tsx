import Link from "next/link";
import NotebookEntryForm from "../NotebookEntryForm";
import styles from "../notebook.module.css";

export default async function NewNotebookEntry({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId = "" } = await searchParams;
  return <main className={`shell ${styles.page}`}>
    <nav className={`${styles.nav} ${styles.noPrint}`}><Link href="/notebook">← Notebook</Link><Link href="/">Dashboard</Link></nav>
    <header className={`${styles.header} ${styles.noPrint}`}><div><h1>Add Notebook Entry</h1><p>Independent entry and voucher</p></div></header>
    <NotebookEntryForm initialCustomerId={customerId} />
  </main>;
}