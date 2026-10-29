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

  // Typing in a number box replaces its content (so "0" never gets stuck).
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLInputElement | null;
      if (el && el.tagName === "INPUT" && el.type === "number") { try { el.select(); } catch {} }
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  // Global shortcuts: Alt + letter.
  useEffect(() => {
    if (!session.authenticated) return;
    const routes: Record<string, string> = { KeyG: "/pos", KeyR: "/sales/returns", KeyP: "/purchases", KeyC: "/customers", KeyV: "/vouchers", KeyA: "/repairs/new", KeyD: "/daily-summary" };
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
      const to = routes[e.code];
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