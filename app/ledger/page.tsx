"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LedgerContent() {
  const q = useSearchParams();
  const [sales, setS] = useState<any[]>([]);
  const [purchases, setP] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/data?collection=sales").then(r => r.json()),
      fetch("/api/data?collection=purchases").then(r => r.json())
    ]).then(([a, b]) => {
      setS(a);
      setP(b);
    });
  }, []);

  return (
    <main className="shell">
      <div className="nav">
        <Link href="/">? Dashboard</Link>
        <Link href="/customers">Customers</Link>
        <Link href="/suppliers">Suppliers</Link>
      </div>

      <h1>?? Ledger</h1>

      <div className="panel">
        <h2>Sales / Customer Ledger</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {sales
              .filter(x => !q.get("customer") || x.customerId === q.get("customer"))
              .map(x => (
                <tr key={x._id}>
                  <td>{x.invoiceNo}</td>
                  <td>{x.customerId || x.cashRef || "Cash"}</td>
                  <td>Rs. {x.total}</td>
                  <td>Rs. {x.paid}</td>
                  <td>Rs. {x.remaining}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Supplier Purchases</h2>
        <table className="table">
          <tbody>
            {purchases
              .filter(x => !q.get("supplier") || x.supplierId === q.get("supplier"))
              .map(x => (
                <tr key={x._id}>
                  <td>{x.supplierId}</td>
                  <td>Rs. {x.total}</td>
                  <td>Paid Rs. {x.paid}</td>
                  <td>Due Rs. {x.remaining}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function Ledger() {
  return (
    <Suspense fallback={<main className="shell"><h1>Loading Ledger...</h1></main>}>
      <LedgerContent />
    </Suspense>
  );
}
