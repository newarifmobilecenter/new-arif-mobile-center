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

  const nodes: [number, number][] = [[120,140],[360,140],[360,300],[620,300],[620,90],[900,90],[900,260],[1180,260],[1180,120],[1450,120],[200,720],[200,560],[480,560],[480,820],[760,820],[760,640],[1040,640],[1040,840],[1320,840],[1320,600],[1560,600]];
  const lines = [[[0,140],[120,140],[360,140],[360,300],[620,300],[620,90],[900,90],[900,260],[1180,260],[1180,120],[1450,120],[1600,120]],[[0,720],[200,720],[200,560],[480,560],[480,820],[760,820],[760,640],[1040,640],[1040,840],[1320,840],[1320,600],[1600,600]]];
  const glow = "drop-shadow(0 0 6px rgba(34,211,238,.9))";
  return (
    <main className="loginWall">
      <svg className="loginArt" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="lgA" cx="22%" cy="25%" r="55%"><stop offset="0" stopColor="#0e4a7a" stopOpacity=".75"/><stop offset="1" stopColor="#05070f" stopOpacity="0"/></radialGradient>
          <radialGradient id="lgB" cx="85%" cy="80%" r="50%"><stop offset="0" stopColor="#1d3fa8" stopOpacity=".7"/><stop offset="1" stopColor="#05070f" stopOpacity="0"/></radialGradient>
          <linearGradient id="lgPhone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".9"/><stop offset="1" stopColor="#3b82f6" stopOpacity=".35"/></linearGradient>
        </defs>
        <rect width="1600" height="900" fill="#05070f"/>
        <rect width="1600" height="900" fill="url(#lgA)"/>
        <rect width="1600" height="900" fill="url(#lgB)"/>
        <g stroke="#1e3a5f" strokeOpacity=".35" strokeWidth="1">
          {Array.from({ length: 33 }, (_, k) => <line key={"v"+k} x1={k*50} y1="0" x2={k*50} y2="900"/>)}
          {Array.from({ length: 19 }, (_, k) => <line key={"h"+k} x1="0" y1={k*50} x2="1600" y2={k*50}/>)}
        </g>
        <g fill="none" stroke="#22d3ee" strokeOpacity=".55" strokeWidth="2" style={{ filter: glow }}>
          {lines.map((l, k) => <polyline key={k} points={l.map(pt => pt.join(",")).join(" ")}/>)}
        </g>
        <g fill="#05070f" stroke="#22d3ee" strokeWidth="2" style={{ filter: glow }}>
          {nodes.map(([x, y], k) => <circle key={k} cx={x} cy={y} r="6"/>)}
        </g>
        <g fill="none" stroke="url(#lgPhone)" strokeWidth="3" style={{ filter: glow }}>
          <g transform="translate(1180 420) rotate(12)"><rect width="190" height="360" rx="30"/><rect x="14" y="40" width="162" height="280" rx="8" strokeOpacity=".6"/><circle cx="95" cy="18" r="5"/><line x1="70" y1="344" x2="120" y2="344"/></g>
          <g transform="translate(150 330) rotate(-14) scale(.85)"><rect width="190" height="360" rx="30"/><rect x="14" y="40" width="162" height="280" rx="8" strokeOpacity=".6"/><circle cx="95" cy="18" r="5"/><line x1="70" y1="344" x2="120" y2="344"/></g>
          <g transform="translate(1040 120) rotate(-8) scale(.55)" strokeOpacity=".6"><rect width="190" height="360" rx="30"/><rect x="14" y="40" width="162" height="280" rx="8"/></g>
        </g>
        <g fill="none" stroke="#38bdf8" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" style={{ filter: glow }}>
          <g transform="translate(1390 110)"><circle cx="0" cy="0" r="26"/><circle cx="0" cy="0" r="9"/>{Array.from({ length: 8 }, (_, k) => <line key={k} x1="0" y1="-26" x2="0" y2="-38" transform={`rotate(${k*45})`}/>)}</g>
          <g transform="translate(330 760)"><circle cx="0" cy="0" r="20"/><circle cx="0" cy="0" r="7"/>{Array.from({ length: 8 }, (_, k) => <line key={k} x1="0" y1="-20" x2="0" y2="-30" transform={`rotate(${k*45})`}/>)}</g>
        </g>
      </svg>
      <div className="loginBrand"><b>NEW ARIF MOBILE CENTER</b><span>Mobile Parts • Repairing • Accessories</span></div>
      <form id="login-form" className="loginCard" onSubmit={submit}>
        <h1>NEW ARIF MOBILE</h1>
        <p>Authorized staff login</p>
        <label>Username</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <p className="loginError">{error}</p>}
        <button disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
