"use client";

import { useState } from "react";

const defaultProducts = [
  {
    id: 1,
    name: "iPhone X Display",
    description: "Premium Quality",
    price: "8500",
    stock: 1,
  },
  {
    id: 2,
    name: "Samsung Battery A12",
    description: "Original",
    price: "2500",
    stock: 4,
  },
];

export default function AdminPage() {
  const [products, setProducts] = useState(defaultProducts);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");

  function addProduct() {
    if (!name || !price) {
      alert("Product name aur price zaroor likhein.");
      return;
    }

    const newProduct = {
      id: Date.now(),
      name,
      description,
      price,
      stock: Number(stock),
    };

    setProducts([...products, newProduct]);

    setName("");
    setDescription("");
    setPrice("");
    setStock("1");
  }

  function deleteProduct(id: number) {
    setProducts(products.filter((product) => product.id !== id));
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05070f",
        color: "#fff",
        padding: "30px 20px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "auto" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900 }}>
          🔐 NEW ARIF MOBILE CENTER
        </h1>

        <p style={{ color: "#aeb5cc" }}>
          Admin Panel — Products & Stock Management
        </p>

        <section
          style={{
            marginTop: 25,
            padding: 25,
            borderRadius: 16,
            background: "#0b1020",
            border: "1px solid #26304a",
          }}
        >
          <h2>➕ Add New Product</h2>

          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 15,
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              style={inputStyle}
            />

            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description e.g. Original / Premium Quality"
              style={inputStyle}
            />

            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price e.g. 2500"
              style={inputStyle}
            />

            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              type="number"
              min="0"
              placeholder="Stock quantity"
              style={inputStyle}
            />

            <button onClick={addProduct} style={buttonStyle}>
              ➕ Add Product
            </button>
          </div>
        </section>

        <section
          style={{
            marginTop: 25,
            padding: 25,
            borderRadius: 16,
            background: "#0b1020",
            border: "1px solid #26304a",
          }}
        >
          <h2>📦 Products</h2>

          <div style={{ display: "grid", gap: 12, marginTop: 15 }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  padding: 18,
                  borderRadius: 12,
                  background: "#11182d",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 15,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <b style={{ fontSize: 18 }}>{product.name}</b>

                  <div
                    style={{
                      color: "#aeb5cc",
                      marginTop: 5,
                    }}
                  >
                    {product.description}
                  </div>

                  <div
                    style={{
                      color: "#ffd21f",
                      marginTop: 7,
                      fontWeight: 800,
                    }}
                  >
                    Rs. {product.price}
                  </div>

                  <div style={{ marginTop: 5 }}>
                    {product.stock > 0 ? (
                      <span style={{ color: "#22c55e" }}>
                        🟢 In Stock — {product.stock}
                      </span>
                    ) : (
                      <span style={{ color: "#ef4444" }}>
                        🔴 Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteProduct(product.id)}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: 0,
                    padding: "10px 15px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  🗑 Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: 25,
            color: "#22d3ee",
          }}
        >
          ← Back to Website
        </a>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#070b18",
  color: "#fff",
  outline: "none",
  boxSizing: "border-box" as const,
};

const buttonStyle = {
  padding: "13px 18px",
  borderRadius: 10,
  border: 0,
  background: "#16a34a",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};