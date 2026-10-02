 "use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Login failed");
      const requestedNext = new URLSearchParams(window.location.search).get("next") || "/";
      const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\")
        ? requestedNext
        : "/";
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:24, background:"#f5f7fb" }}>
      <form id="login-form" onSubmit={submit} style={{ width:"100%", maxWidth:420, background:"#fff", padding:28, borderRadius:16, boxShadow:"0 8px 30px rgba(0,0,0,.08)" }}>
        <h1 style={{ margin:"0 0 6px", fontSize:24, fontWeight:800 }}>NEW ARIF MOBILE</h1>
        <p style={{ margin:"0 0 22px", color:"#667085" }}>Authorized staff login</p>
        <label style={{display:"block",fontWeight:700,marginBottom:6}}>Username</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required style={{width:"100%",padding:"11px 12px",border:"1px solid #d0d5dd",borderRadius:9,marginBottom:14}} />
        <label style={{display:"block",fontWeight:700,marginBottom:6}}>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required style={{width:"100%",padding:"11px 12px",border:"1px solid #d0d5dd",borderRadius:9}} />
        {error && <p style={{color:"#b42318",fontSize:14,margin:"12px 0"}}>{error}</p>}
        <button disabled={loading} style={{width:"100%",marginTop:18,padding:"12px",border:0,borderRadius:9,background:"#111827",color:"#fff",fontWeight:800,cursor:"pointer"}}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
