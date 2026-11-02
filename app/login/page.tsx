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
      <div className="glassBrand"><b>NEW ARIF MOBILE CENTER</b><span>Mobile Repairing POS • Mobile Parts</span></div>
      <div className="glassTile gT1" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="4" width="20" height="40" rx="4"/><rect x="17.5" y="9" width="13" height="26" rx="1.5" strokeOpacity=".6"/><line x1="21" y1="40" x2="27" y2="40"/></svg><small>Mobiles</small></div>
      <div className="glassTile gT2" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M30 6a10 10 0 0 0-9 13L7 33a4 4 0 0 0 6 6l14-14a10 10 0 0 0 13-9l-6 5-5-1-1-5z"/></svg><small>Repairing</small></div>
      <div className="glassTile gT3" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="14" width="32" height="20" rx="4"/><line x1="42" y1="21" x2="42" y2="27"/><path d="M22 18l-5 8h6l-3 6" /></svg><small>Batteries</small></div>
      <div className="glassTile gT4" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="13" y="13" width="22" height="22" rx="3"/><rect x="19" y="19" width="10" height="10" rx="1.5"/><path d="M18 13V7M24 13V7M30 13V7M18 41v-6M24 41v-6M30 41v-6M13 18H7M13 24H7M13 30H7M41 18h-6M41 24h-6M41 30h-6"/></svg><small>Parts / IC</small></div>
      <div className="glassTile gT5" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="9" width="38" height="25" rx="3"/><path d="M15 41h18M24 34v7"/><path d="M13 22l4-5 5 7 4-4 6 6" strokeOpacity=".7"/></svg><small>Displays</small></div>
      <form id="login-form" className="glassCard" onSubmit={submit}>
        <div className="glassLogo" aria-hidden="true">NA</div>
        <h1>Mobile Repairing POS</h1>
        <p>Mobile parts • Repairing • Sale — staff login</p>
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
