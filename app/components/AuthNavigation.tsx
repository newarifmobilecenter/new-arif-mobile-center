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
    const routes: Record<string, string> = { KeyG: "/pos", KeyR: "/sales/returns", KeyP: "/purchases", KeyC: "/customers", KeyV: "/vouchers", KeyA: "/repairs/new", KeyD: "/daily-summary", KeyO: "/orders" };
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

  // Keyboard flow on every page: Enter = next field, Arrow Up/Down = same column in the row above/below (tables).
  useEffect(() => {
    const FOCUS = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const visible = (el: HTMLElement) => el.offsetParent !== null || el === document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      if (!t || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (t.closest("[data-no-nav]") || (t.closest("form") && !t.closest("main"))) return;
      const input = t as HTMLInputElement;
      if (e.key === "Enter") {
        if (t.tagName === "TEXTAREA" || t.closest("form#login-form")) return;
        if (["checkbox", "radio", "button", "submit"].includes(input.type)) return;
        const scope = (t.closest("main") || document.body) as HTMLElement;
        const list = Array.from(scope.querySelectorAll<HTMLElement>(FOCUS)).filter(visible);
        const i = list.indexOf(t);
        const next = list[i + 1];
        if (next) { e.preventDefault(); next.focus(); if (next instanceof HTMLInputElement && next.type !== "date") next.select?.(); }
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && t.tagName === "INPUT" && input.type !== "number") {
        const cell = t.closest("td");
        const row = cell?.parentElement as HTMLTableRowElement | null;
        if (!cell || !row) return;
        const col = Array.from(row.children).indexOf(cell);
        const other = (e.key === "ArrowDown" ? row.nextElementSibling : row.previousElementSibling) as HTMLTableRowElement | null;
        const target = other?.children[col]?.querySelector<HTMLElement>(FOCUS);
        if (target) { e.preventDefault(); target.focus(); if (target instanceof HTMLInputElement) target.select(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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