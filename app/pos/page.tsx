'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Product = {
  _id: string;
  name: string;
  model: string;
  price: number;
  stock: number;
};

type Customer = {
  _id: string;
  name: string;
  phone?: string;
};

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState('');
  const [cashRef, setCashRef] = useState('');
  const [pickup, setPickup] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [pay, setPay] = useState('Cash');
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    void Promise.all([
      fetch('/api/data?collection=products').then((r) => r.json()),
      fetch('/api/data?collection=customers').then((r) => r.json()),
    ]).then(([p, c]) => {
      setProducts(p);
      setCustomers(c);
    });
  }, []);

  const add = (p: Product) => {
    if (p.stock < 1) return;
    setItems((x) => {
      const found = x.find((i) => i.productId === p._id);
      return found
        ? x.map((i) =>
            i.productId === p._id ? { ...i, qty: i.qty + 1 } : i
          )
        : [
            ...x,
            { productId: p._id, name: p.name, price: p.price, qty: 1 },
          ];
    });
  };

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  async function complete() {
    if (!items.length) return alert('Item select karein');
    if (!customer && !cashRef)
      return alert('Customer select karein ya Cash Sale Ref likhein');

    const sale = {
      saleType: customer ? 'customer' : 'cash',
      customerId: customer || null,
      cashRef: cashRef || null,
      pickupBy: pickup || null,
      items,
      total,
      paymentMethod: pay,
      status: 'paid',
      invoiceNo: 'INV-' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    const r = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection: 'sales', ...sale }),
    });
    const s = await r.json();
    setDone(s);

    for (const i of items) {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: 'stockMovements',
          type: 'OUT',
          productId: i.productId,
          qty: i.qty,
          ref: s.invoiceNo,
        }),
      });
    }
  }

  if (done)
    return (
      <main className="shell">
        <div className="no-print nav">
          <Link href="/">← Home</Link>
          <button className="btn" onClick={() => print()}>
            🖨 Print Thermal
          </button>
          <button
            className="btn green"
            onClick={() => {
              navigator.clipboard?.writeText(
                location.origin + '/invoice/' + done._id
              );
              location.href =
                'https://wa.me/?text=' +
                encodeURIComponent(
                  'Invoice ' +
                    done.invoiceNo +
                    ' — ' +
                    location.origin +
                    '/invoice/' +
                    done._id
                );
            }}
          >
            WhatsApp
          </button>
          <Link className="btn" href="/pos">
            New Sale
          </Link>
        </div>
        <div className="panel receipt">
          <h2 style={{ textAlign: 'center' }}>NEW ARIF MOBILE CENTER</h2>
          <div className="line" />
          <b>Invoice:</b> {done.invoiceNo}
          <br />
          <b>Date:</b> {new Date(done.createdAt).toLocaleString()}
          <br />
          {done.saleType === 'cash' ? (
            <>
              <b>Cash Sale Ref:</b> {done.cashRef}
            </>
          ) : (
            <>
              <b>Customer:</b>{' '}
              {customers.find((c) => c._id === done.customerId)?.name ||
                'Customer'}
              <br />
            </>
          )}
          <b>Pickup By:</b> {done.pickupBy || 'Customer'}
          <div className="line" />
          {done.items.map((i: any) => (
            <div key={i.productId}>
              {i.name} × {i.qty} — Rs. {i.price * i.qty}
            </div>
          ))}
          <div className="line" />
          <b>TOTAL: Rs. {done.total}</b>
          <br />
          <b>PAYMENT: {done.paymentMethod}</b>
          <div className="line" />
          <b>Warranty:</b> As per shop warranty policy.
          <br />
          <small>Receipt required for warranty claim.</small>
        </div>
      </main>
    );

  return (
    <main className="shell">
      <div className="nav">
        <Link href="/">← Home</Link>
        <Link href="/admin">Products</Link>
      </div>

      <h1>🛒 New Sale</h1>

      <div className="panel">
        <div className="row">
          <div className="col">
            <label>Saved Customer</label>
            <select
              className="input"
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setCashRef('');
              }}
            >
              <option value="">— Cash Sale —</option>
              {customers.map((c) => (
                <option value={c._id} key={c._id}>
                  {c.name} {c.phone || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="col">
            <label>Cash Sale Ref</label>
            <input
              className="input"
              value={cashRef}
              onChange={(e) => {
                setCashRef(e.target.value);
                if (e.target.value) setCustomer('');
              }}
              placeholder="AHSAN"
            />
          </div>

          <div className="col">
            <label>Pickup By (optional)</label>
            <input
              className="input"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="IRFAN"
            />
          </div>

          <div className="col">
            <label>Payment</label>
            <select
              className="input"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
            >
              {[
                'Cash',
                'JazzCash',
                'Easypaisa',
                'Raast',
                'NayaPay',
                'UBL Bank',
                'Other Bank',
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="panel">
        <input
          className="input"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid">
          {products
            .filter((p) =>
              (p.name + ' ' + p.model)
                .toLowerCase()
                .includes(search.toLowerCase())
            )
            .map((p) => (
              <button
                className="card"
                style={{ textAlign: 'left', color: 'white' }}
                key={p._id}
                onClick={() => add(p)}
              >
                <b>{p.name}</b>
                <p className="muted">
                  {p.model} • Stock {p.stock}
                </p>
                <span>Rs. {p.price}</span>
              </button>
            ))}
        </div>
      </div>

      <div className="panel">
        <h2>Cart</h2>
        {items.map((i) => (
          <div className="row" key={i.productId}>
            <div className="col">
              {i.name} × {i.qty}
            </div>
            <div>Rs. {i.price * i.qty}</div>
          </div>
        ))}
        <hr />
        <div className="total">Total: Rs. {total}</div>
        <button className="btn green" onClick={complete}>
          Complete Sale & Invoice
        </button>
      </div>
    </main>
  );
}
