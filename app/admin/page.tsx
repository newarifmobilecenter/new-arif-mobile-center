"use client";

import { useEffect, useState } from "react";

const categories = [
  "Displays / LCD",
  "Batteries",
  "Charging Ports",
  "Speakers / Mic",
  "Cameras",
  "Buttons / Flex",
  "Body / Housing",
  "Repairing Parts",
  "Tools",
  "Other Parts",
];

const brands = [
  "Infinix",
  "Tecno",
  "Itel",
  "Vivo",
  "Oppo",
  "Realme",
  "OnePlus",
  "Samsung",
  "iPhone",
  "Universal",
];

type Product = {
  id: number;
  name: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  price: string | number;
  stock: number;
  _id?: string;
};

const defaultProducts: Product[] = [
  {
    id: 1,
    name: "iPhone X Display",
    category: "Displays / LCD",
    brand: "iPhone",
    model: "iPhone X",
    description: "Premium Quality",
    price: "8500",
    stock: 1,
  },
  {
    id: 2,
    name: "Samsung A12 Battery",
    category: "Batteries",
    brand: "Samsung",
    model: "A12",
    description: "Original",
    price: "2500",
    stock: 4,
  },
];

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>(defaultProducts);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Displays / LCD");
  const [brand, setBrand] = useState("Infinix");
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/data?collection=products");
      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        setProducts(defaultProducts);
        return;
      }

      setProducts(
        data.map((product: any) => ({
          ...product,
          id: Number(product.id ?? product._id ?? Date.now()),
          price: String(product.price ?? "0"),
          stock: Number(product.stock ?? 0),
        }))
      );
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  useEffect(() => {
  const fetchData = async () => {
    await loadProducts();
  };
  fetchData();
}, []);

  async function addProduct() {
    if (!name || !model || !price) {
      alert("Product name, model aur price zaroor likhein.");
      return;
    }

    const newProduct: Product = {
      id: Date.now(),
      name,
      category,
      brand,
      model,
      description,
      price,
      stock: Number(stock),
    };

    try {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: "products",
          ...newProduct,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      const savedProduct = await response.json();
      setProducts((current) => [
        {
          ...newProduct,
          id: Number(savedProduct.id ?? savedProduct._id ?? newProduct.id),
        },
        ...current,
      ]);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Product save nahi hua. Dubara try karo.");
      return;
    }

    setName("");
    setModel("");
    setDescription("");
    setPrice("");
    setStock("1");
  }

  function deleteProduct(id: number) {
    setProducts((current) => current.filter((product) => product.id !== id));
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
      <div style={{ maxWidth: 1150, margin: "auto" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900 }}>
          🔐 NEW ARIF MOBILE CENTER
        </h1>

        <p style={{ color: "#aeb5cc" }}>
          Admin Panel — Product Management
        </p>

        {/* ADD PRODUCT */}
        <section style={cardStyle}>
          <h2>➕ Add New Product</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              marginTop: 18,
            }}
          >
            {/* Product Name */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product Name"
              style={inputStyle}
            />

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            {/* Brand */}
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              style={inputStyle}
            >
              {brands.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            {/* Model */}
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model e.g. A12 / X650"
              style={inputStyle}
            />

            {/* Price */}
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price e.g. 2800"
              type="number"
              style={inputStyle}
            />

            {/* Stock */}
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Stock Quantity"
              type="number"
              min="0"
              style={inputStyle}
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description e.g. Original / Premium Quality"
              style={{
                ...inputStyle,
                minHeight: 90,
                gridColumn: "1 / -1",
              }}
            />

            <button onClick={addProduct} style={buttonStyle}>
              ➕ Save Product
            </button>
          </div>
        </section>

        {/* PRODUCTS */}
        <section style={cardStyle}>
          <h2>📦 All Products</h2>

          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {products.map((product) => (
              <article
                key={product.id}
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "#11182d",
                  border: "1px solid #26304a",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 15,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 20,
                      }}
                    >
                      📱 {product.name}
                    </h3>

                    <div
                      style={{
                        color: "#aeb5cc",
                        marginTop: 7,
                      }}
                    >
                      Category: <b>{product.category}</b>
                    </div>

                    <div
                      style={{
                        color: "#aeb5cc",
                        marginTop: 4,
                      }}
                    >
                      Brand: <b>{product.brand}</b> — Model:{" "}
                      <b>{product.model}</b>
                    </div>

                    <div
                      style={{
                        color: "#aeb5cc",
                        marginTop: 4,
                      }}
                    >
                      {product.description}
                    </div>

                    <div
                      style={{
                        color: "#ffd21f",
                        fontWeight: 900,
                        fontSize: 18,
                        marginTop: 9,
                      }}
                    >
                      Rs. {product.price}
                    </div>

                    <div style={{ marginTop: 7 }}>
                      {product.stock > 0 ? (
                        <span style={{ color: "#22c55e" }}>
                          🟢 In Stock — {product.stock} item
                          {product.stock === 1 ? "" : "s"}
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
                    style={deleteButtonStyle}
                  >
                    🗑 Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <a href="/" style={backLinkStyle}>
          ← Back to Website
        </a>
      </div>
    </main>
  );
}

const cardStyle = {
  marginTop: 25,
  padding: 25,
  borderRadius: 16,
  background: "#0b1020",
  border: "1px solid #26304a",
};

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
  padding: "14px 18px",
  borderRadius: 10,
  border: 0,
  background: "#16a34a",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const deleteButtonStyle = {
  background: "#dc2626",
  color: "#fff",
  border: 0,
  padding: "10px 15px",
  borderRadius: 8,
  cursor: "pointer",
  height: "fit-content",
};

const backLinkStyle = {
  display: "inline-block",
  marginTop: 25,
  color: "#22d3ee",
};