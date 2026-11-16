"use client";
import { useCallback, useEffect, useState } from "react";
import { PERMS, DEFAULT_STAFF_PERMS, type PermKey } from "@/lib/perms";

type U = { id: string; username: string; role: "ADMIN" | "STAFF"; perms: PermKey[]; active: boolean; source: "db" | "env" };
const box: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 6, margin: "8px 0" };
const call = async (url: string, method: string, body?: unknown) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error || "Nahi hua.");
  return d;
};

function PermGrid({ value, onChange }: { value: PermKey[]; onChange: (v: PermKey[]) => void }) {
  return <div style={box}>{PERMS.map((p) => <label key={p.key} title={p.hint} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
    <input type="checkbox" style={{ marginTop: 3 }} checked={value.includes(p.key)} onChange={(e) => onChange(e.target.checked ? [...value, p.key] : value.filter((k) => k !== p.key))} />
    <span><b>{p.label}</b><br /><small style={{ opacity: .7 }}>{p.hint}</small></span>
  </label>)}</div>;
}

export default function UsersPanel() {
  const [users, setUsers] = useState<U[]>([]);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [draft, setDraft] = useState<Record<string, { perms: PermKey[]; pw: string; name: string }>>({});
  const [nu, setNu] = useState({ username: "", password: "", perms: DEFAULT_STAFF_PERMS as PermKey[] });
  const [me, setMe] = useState({ cur: "", name: "", pw: "" });
  const say = (t: string, ok = true) => setMsg({ t, ok });
  const load = useCallback(async () => {
    try { const l: U[] = await call("/api/users", "GET"); setUsers(l); setDraft(Object.fromEntries(l.map((u) => [u.id, { perms: u.perms, pw: "", name: u.username }]))); } catch (e: any) { say(e.message, false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); say(ok); await load(); } catch (e: any) { say(e.message, false); } };
  const set = (id: string, patch: Partial<{ perms: PermKey[]; pw: string; name: string }>) => setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  return <>
    <div className="panel"><h2>🔑 Mera Account (username / password badlein)</h2>
      <p style={{ opacity: .8, fontSize: 13 }}>Purana password dena zaroori hai. Sirf jo badalna ho wohi likhein.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" type="password" placeholder="Purana password" value={me.cur} onChange={(e) => setMe({ ...me, cur: e.target.value })} />
        <input className="input" placeholder="Naya username (optional)" value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} />
        <input className="input" type="password" placeholder="Naya password (optional)" value={me.pw} onChange={(e) => setMe({ ...me, pw: e.target.value })} />
        <button className="btn" onClick={() => void run(async () => { await call("/api/account", "PATCH", { currentPassword: me.cur, newUsername: me.name, newPassword: me.pw }); setMe({ cur: "", name: "", pw: "" }); }, "Account update ho gaya. Ab naye naam / password se login karein.")}>Save Account</button>
      </div>
    </div>
    <div className="panel"><h2>👥 Users aur Permissions</h2>
      <p style={{ opacity: .8, fontSize: 13 }}>Admin ko hamesha sab kuch milta hai. Staff ko sirf wohi milta hai jo yahan tick ho. <b>Permission ki tabdeeli us user ke agle login par lagti hai</b> (agar wo abhi login hai to Logout karke dobara login karwayein).</p>
      {msg && <p role="status" style={{ color: msg.ok ? "#4ade80" : "#f87171", fontWeight: 700 }}>{msg.t}</p>}
      {users.map((u) => { const d = draft[u.id]; if (!d) return null; return <div key={u.id} style={{ border: "1px solid #2a3a66", borderRadius: 10, padding: 12, marginBottom: 12, opacity: u.active ? 1 : .6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ fontSize: 16 }}>{u.username}</b>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: u.role === "ADMIN" ? "#b45309" : "#1d4ed8" }}>{u.role === "ADMIN" ? "ADMIN (sab access)" : "STAFF"}</span>
          {!u.active && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#7f1d1d" }}>BAND</span>}
          <span style={{ flex: 1 }} />
          <input className="input" style={{ width: 170 }} value={d.name} onChange={(e) => set(u.id, { name: e.target.value })} title="Username" />
          <button className="btn" onClick={() => void run(() => call("/api/users", "PATCH", { id: u.id, username: d.name }), "Username badal gaya.")}>Rename</button>
          <input className="input" style={{ width: 170 }} type="text" placeholder="Naya password" value={d.pw} onChange={(e) => set(u.id, { pw: e.target.value })} />
          <button className="btn" onClick={() => void run(async () => { await call("/api/users", "PATCH", { id: u.id, password: d.pw }); set(u.id, { pw: "" }); }, "Password badal gaya.")}>Password Set</button>
        </div>
        {u.role === "STAFF" && <>
          <PermGrid value={d.perms} onChange={(v) => set(u.id, { perms: v })} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => void run(() => call("/api/users", "PATCH", { id: u.id, perms: d.perms }), "Permissions save ho gayin.")}>💾 Save Permissions</button>
            <button className="btn" onClick={() => set(u.id, { perms: DEFAULT_STAFF_PERMS })}>Sirf Sale + Repair add</button>
            <button className="btn" onClick={() => void run(() => call("/api/users", "PATCH", { id: u.id, active: !u.active }), u.active ? "User band kar diya." : "User chalu kar diya.")}>{u.active ? "⛔ Band karein" : "✅ Chalu karein"}</button>
            <button className="btn" onClick={() => { if (confirm(`"${u.username}" ko delete karna hai?`)) void run(() => call(`/api/users?id=${encodeURIComponent(u.id)}`, "DELETE"), "User delete ho gaya."); }}>🗑 Delete</button>
          </div>
        </>}
        {u.source === "env" && <small style={{ opacity: .6 }}>Ye user Vercel settings se aaya hai. Pehli tabdeeli save karte hi website ke andar manage hone lagta hai.</small>}
      </div>; })}
      <h3 style={{ marginTop: 18 }}>➕ Naya Staff User</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" placeholder="Username" value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} />
        <input className="input" placeholder="Password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
      </div>
      <PermGrid value={nu.perms} onChange={(v) => setNu({ ...nu, perms: v })} />
      <button className="btn" onClick={() => void run(async () => { await call("/api/users", "POST", nu); setNu({ username: "", password: "", perms: DEFAULT_STAFF_PERMS }); }, "Naya user ban gaya.")}>Create User</button>
    </div>
  </>;
}
