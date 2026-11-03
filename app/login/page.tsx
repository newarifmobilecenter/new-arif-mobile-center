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
      <svg className="shopArt" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="sa-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#020617"/><stop offset=".55" stopColor="#071a45"/><stop offset="1" stopColor="#0b3a8f"/></linearGradient>
          <radialGradient id="sa-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#7cc4ff" stopOpacity=".8"/><stop offset=".45" stopColor="#1d4ed8" stopOpacity=".35"/><stop offset="1" stopColor="#0b3a8f" stopOpacity="0"/></radialGradient>
          <linearGradient id="sa-layer" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bcd8ff" stopOpacity=".5"/><stop offset="1" stopColor="#1d4ed8" stopOpacity=".18"/></linearGradient>
          <filter id="sa-blur"><feGaussianBlur stdDeviation="18"/></filter>
        </defs>
        <rect width="1600" height="900" fill="url(#sa-bg)"/>
        <ellipse cx="520" cy="470" rx="420" ry="300" fill="url(#sa-glow)" filter="url(#sa-blur)"/>
        <text x="40" y="330" fill="#fff" opacity=".06" fontFamily="Arial Black,Arial,sans-serif" fontWeight="900" fontSize="250" letterSpacing="14">SAMSUNG</text>
        <g stroke="#38bdf8" strokeOpacity=".2" fill="none"><path d="M0 110H320V240H560"/><path d="M1080 90H1380V210H1600"/><path d="M1000 800H1260V660H1600"/><circle cx="560" cy="240" r="6"/><circle cx="1380" cy="210" r="6"/></g>
        {/* exploded phone: screen / battery / logic board */}
        <g transform="translate(230 250) scale(.92) skewX(-10)" stroke="#bfe3ff" strokeOpacity=".75" strokeWidth="2.5" strokeLinejoin="round">
          <g transform="translate(0 0)"><rect width="240" height="470" rx="34" fill="url(#sa-layer)"/><rect x="14" y="18" width="212" height="434" rx="22" fill="none" strokeOpacity=".5"/><circle cx="120" cy="40" r="7" fill="#e0f2fe" fillOpacity=".7"/></g>
          <g transform="translate(70 -40)"><rect width="240" height="470" rx="34" fill="url(#sa-layer)" fillOpacity=".7"/><rect x="40" y="90" width="160" height="210" rx="14" fill="#0b3a8f" fillOpacity=".5"/><path d="M130 140l-28 52h34l-18 56" fill="none" stroke="#7dd3fc" strokeWidth="5" strokeLinecap="round"/></g>
          <g transform="translate(140 -80)"><rect width="240" height="470" rx="34" fill="url(#sa-layer)" fillOpacity=".5"/><rect x="26" y="40" width="90" height="70" rx="8" fill="#0e3a6b" fillOpacity=".8"/><rect x="132" y="40" width="82" height="130" rx="8" fill="#102a55" fillOpacity=".8"/><rect x="26" y="130" width="90" height="170" rx="8" fill="#0a2a5c" fillOpacity=".8"/><circle cx="160" cy="230" r="26" fill="none"/><circle cx="160" cy="230" r="10" fill="#22d3ee" fillOpacity=".8"/></g>
        </g>
        {/* tools */}
        <g stroke="#cfe6ff" strokeLinecap="round" opacity=".9" transform="translate(0 -70)">
          <line x1="160" y1="720" x2="470" y2="650" strokeWidth="9"/><line x1="470" y1="650" x2="520" y2="640" strokeWidth="4"/><rect x="120" y="716" width="80" height="26" rx="12" transform="rotate(-12 160 729)" fill="#0b3a8f" stroke="#7dd3fc" strokeWidth="2"/>
          <line x1="640" y1="740" x2="860" y2="690" strokeWidth="7" stroke="#7dd3fc"/>
        </g>
        <line x1="0" y1="790" x2="1600" y2="790" stroke="#60a5fa" strokeOpacity=".45" strokeWidth="2"/>
      </svg>
      <div className="glassBrand"><b>NEW ARIF MOBILE CENTER</b><span>Mobile Repairing POS • Mobile Parts</span></div>
      <div className="shopBrands" aria-label="Brands we repair and supply"><span className="sbMain">SAMSUNG</span><span className="sbLine">Specialist Repair &amp; Parts</span><span className="sbSep" /><span>OPPO</span><span>VIVO</span><span>XIAOMI</span></div>
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
