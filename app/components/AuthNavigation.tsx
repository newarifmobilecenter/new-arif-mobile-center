"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SessionState = { authenticated: boolean; username?: string; role?: string };

export default function AuthNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({ authenticated: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) {
        setSession({ authenticated: false });
        return;
      }
      setSession(await response.json());
    } catch {
      setSession({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    void refreshSession();
    const interval = window.setInterval(() => void refreshSession(), 60_000);
    const onFocus = () => void refreshSession();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshSession]);

  // Global shortcuts. Ctrl+C / Ctrl+V / Ctrl+P / Ctrl+A are needed by the browser (copy, paste, print, select all),
  // so those four use Alt instead.
  useEffect(() => {
    if (!session.authenticated) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey) return;
      const k = e.key.toLowerCase();
      const ctrl = (e.ctrlKey || e.metaKey) && !e.altKey;
      const alt = e.altKey && !e.ctrlKey && !e.metaKey;
      let to = "";
      if (ctrl && k === "g") to = "/pos";
      else if (ctrl && k === "r") to = "/sales/returns";
      else if (alt && k === "p") to = "/purchases";
      else if (alt && k === "c") to = "/customers";
      else if (alt && k === "v") to = "/vouchers";
      else if (alt && k === "a") to = "/repairs/new";
      if (!to) return;
      e.preventDefault();
      if (pathname !== to) router.push(to);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session.authenticated, pathname, router]);

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout could not be completed.");
      setSession({ authenticated: false });
      router.replace("/login");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Logout could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return <header className="appAuthBar no-print">
    <div className="appAuthInner">
      <Link className="appAuthBrand" href={session.authenticated ? "/" : "/login"}>NEW ARIF MOBILE CENTER</Link>
      <div className="appAuthActions">
        {session.authenticated && session.username && <span className="appAuthUser">{session.username}</span>}
        {session.authenticated
          ? <button className="appAuthButton" type="button" onClick={() => void logout()} disabled={busy}>{busy ? "Signing out..." : "Logout"}</button>
          : pathname === "/login"
            ? <button className="appAuthButton" type="submit" form="login-form">Login</button>
            : <Link className="appAuthButton" href={`/login?next=${encodeURIComponent(`${pathname || "/"}`)}`}>Login</Link>}
      </div>
    </div>
    {error && <span className="appAuthError" role="alert">{error}</span>}
  </header>;
}