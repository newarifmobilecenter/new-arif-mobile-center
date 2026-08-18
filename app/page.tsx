export default function Home() {
  return (
    <main className="shell">
      <div className="nav">
        <a href="/">NEW ARIF MOBILE CENTER</a>
      </div>

      <h1>📱 Welcome</h1>

      <section
        className="glass"
        style={{
          marginTop: 14,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 28 }}>💰</div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              Point of Sale
            </h2>

            <div
              style={{
                color: "#aeb5cc",
                fontSize: 12,
                marginTop: 3,
              }}
            >
              Create sales and invoices
            </div>
          </div>

          <a
            href="/pos"
            className="btn"
            style={{
              background: "linear-gradient(135deg,#059669,#10b981)",
              textDecoration: "none",
            }}
          >
            Start Sale →
          </a>
        </div>
      </section>

      <section
        className="glass"
        style={{
          marginTop: 14,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 28 }}>🔧</div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              Universal Tool Finder
            </h2>

            <div
              style={{
                color: "#aeb5cc",
                fontSize: 12,
                marginTop: 3,
              }}
            >
              Search mobile model / code
            </div>
          </div>

          <a
            href="/tools"
            className="btn"
            style={{
              background: "linear-gradient(135deg,#6d28d9,#2563eb)",
              textDecoration: "none",
            }}
          >
            Open Finder →
          </a>
        </div>
      </section>

      <section
        className="glass"
        style={{
          marginTop: 14,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 28 }}>🛠️</div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              Admin Panel
            </h2>

            <div
              style={{
                color: "#aeb5cc",
                fontSize: 12,
                marginTop: 3,
              }}
            >
              Manage products and inventory
            </div>
          </div>

          <a
            href="/admin"
            className="btn"
            style={{
              background: "linear-gradient(135deg,#dc2626,#ef4444)",
              textDecoration: "none",
            }}
          >
            Admin →
          </a>
        </div>
      </section>
    </main>
  );
}