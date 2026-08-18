'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const loadCustomers = () =>
    fetch('/api/data?collection=customers')
      .then((r) => r.json())
      .then(setCustomers);

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function addCustomer() {
    if (!name) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection: 'customers', name, phone }),
    });
    setName('');
    setPhone('');
    void loadCustomers();
  }

  return (
    <main className="shell">
      <div className="nav">
        <Link href="/">← Home</Link>
        <Link href="/pos">New Sale</Link>
      </div>

      <h1>👥 Customers & Ledger</h1>

      <div className="panel">
        <div className="row">
          <input
            className="input col"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer Name"
          />
          <input
            className="input col"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile"
          />
          <button className="btn green" onClick={addCustomer}>
            Save Customer
          </button>
        </div>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer._id}>
                <td>{customer.name}</td>
                <td>{customer.phone}</td>
                <td>{customer._id.slice(-6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
