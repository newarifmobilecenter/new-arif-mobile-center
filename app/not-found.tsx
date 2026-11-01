import Link from "next/link";

export default function NotFound() {
  return <main className="shell" style={{ textAlign: "center", paddingTop: 80 }}>
    <h1>404 — Page nahi mila</h1>
    <p>Ye page maujood nahi hai.</p>
    <Link href="/">← Dashboard</Link>
  </main>;
}
