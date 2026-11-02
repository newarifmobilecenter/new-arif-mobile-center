 "use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

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
    <main className="glassWall">
      <div className="glassOrb gOrb1" aria-hidden="true" />
      <div className="glassOrb gOrb2" aria-hidden="true" />
      <div className="glassOrb gOrb3" aria-hidden="true" />
      <div className="glassOrb gOrb4" aria-hidden="true" />
      <div className="glassBrand"><b>NEW ARIF MOBILE CENTER</b><span>Mobile Parts • Repairing • Accessories</span></div>
      <form id="login-form" className="glassCard" onSubmit={submit}>
        <div className="glassLogo" aria-hidden="true">NA</div>
        <h1>Welcome back</h1>
        <p>Authorized staff login</p>
        <label htmlFor="lg-user">Username</label>
        <input id="lg-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Username" required />
        <label htmlFor="lg-pass">Password</label>
        <div className="glassPass">
          <input id="lg-pass" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Password" required />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
        </div>
        {error && <p className="glassError">{error}</p>}
        <button className="glassBtn" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
