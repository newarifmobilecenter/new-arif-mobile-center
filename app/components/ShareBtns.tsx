"use client";
import { useState } from "react";
import { shareLive } from "@/lib/shareSlip";
import { notify } from "@/lib/toast";

/** Print button ke saath: 📲 WhatsApp aur 🖼 PNG. target = us hisse ka CSS selector jo print hota hai. */
export default function ShareBtns({ target, name, text, className, white = true, width }: { target: string; name: string; text?: string; className?: string; white?: boolean; width?: number }) {
  const [busy, setBusy] = useState(false);
  const run = async (mode: "png" | "whatsapp") => {
    setBusy(true);
    try { await shareLive(document.querySelector(target) as HTMLElement | null, mode, name, text || name, { white, width }); }
    catch (e: any) { notify(e?.message || "Image nahi ban saki. Dobara koshish karein.", { kind: "danger" }); }
    finally { setBusy(false); }
  };
  return <>
    <button type="button" className={className} disabled={busy} onClick={() => void run("whatsapp")}>📲 WhatsApp</button>
    <button type="button" className={className} disabled={busy} onClick={() => void run("png")}>🖼 PNG</button>
  </>;
}
