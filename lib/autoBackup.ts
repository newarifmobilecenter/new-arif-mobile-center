// Dukaan ke computer par har ghante backup file ko ek folder mein update karta hai (Chrome / Edge, File System Access API).
const DB = "na-autobackup", STORE = "kv", KEY = "dir";
const LAST = "na-autobackup-last", ERR = "na-autobackup-err", ON = "na-autobackup-on";
export const EVERY_MS = 60 * 60 * 1000;
export const LATEST_FILE = "NewArif-Backup-LATEST.json";
const KEEP_WEEKLY = 8;

export const supported = () => typeof window !== "undefined" && typeof (window as any).showDirectoryPicker === "function";
const idb = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function kvGet(): Promise<any> { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction(STORE).objectStore(STORE).get(KEY); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); }
async function kvSet(v: any) { const d = await idb(); return new Promise<void>((res, rej) => { const t = d.transaction(STORE, "readwrite"); if (v) t.objectStore(STORE).put(v, KEY); else t.objectStore(STORE).delete(KEY); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
const ls = (k: string, v?: string | null) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} return null; };
const notify = () => { try { window.dispatchEvent(new Event("autobackup:changed")); } catch {} };

export type BackupStatus = { enabled: boolean; folder: string; last: number; error: string; permission: "granted" | "prompt" | "denied" | "none" };
export async function status(): Promise<BackupStatus> {
  const enabled = ls(ON) === "1"; let folder = "", permission: BackupStatus["permission"] = "none";
  try { const h = await kvGet(); if (h) { folder = h.name || ""; permission = await h.queryPermission({ mode: "readwrite" }); } } catch {}
  return { enabled, folder, last: Number(ls(LAST) || 0), error: ls(ERR) || "", permission };
}
export async function chooseFolder() {
  const h = await (window as any).showDirectoryPicker({ mode: "readwrite", id: "na-backup" });
  await kvSet(h); ls(ON, "1"); ls(ERR, null); notify();
  return runNow();
}
export async function disable() { ls(ON, "0"); notify(); }
export async function allow() { const h = await kvGet(); if (!h) throw new Error("Pehle folder chunein."); const p = await h.requestPermission({ mode: "readwrite" }); if (p !== "granted") throw new Error("Folder ki ijazat nahi mili."); ls(ON, "1"); return runNow(); }

const weekKey = (d = new Date()) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${String(Math.ceil(((+t - +y0) / 86400000 + 1) / 7)).padStart(2, "0")}`; };

let running = false;
export async function runNow(): Promise<{ ok: boolean; error?: string }> {
  if (running) return { ok: false, error: "Backup pehle se chal raha hai." };
  running = true;
  try {
    const h = await kvGet(); if (!h) throw new Error("Backup folder chuna nahi gaya.");
    if ((await h.queryPermission({ mode: "readwrite" })) !== "granted") throw new Error("Folder ki ijazat dobara chahiye (button dabayein).");
    const res = await fetch("/api/backup", { cache: "no-store" });
    if (!res.ok) { let m = ""; try { m = (await res.json()).error; } catch {} throw new Error(m || `Backup server se nahi aaya (${res.status}).`); }
    const blob = await res.blob();
    if (blob.size < 50) throw new Error("Backup file khali aayi.");
    const write = async (name: string) => { const f = await h.getFileHandle(name, { create: true }); const w = await f.createWritable(); await w.write(blob); await w.close(); };
    await write(LATEST_FILE);
    const wk = `NewArif-Backup-${weekKey()}.json`;
    let exists = true; try { await h.getFileHandle(wk); } catch { exists = false; }
    if (!exists) {
      await write(wk);
      const weeklies: string[] = []; for await (const [n] of h.entries()) if (/^NewArif-Backup-\d{4}-W\d{2}\.json$/.test(n)) weeklies.push(n);
      weeklies.sort(); while (weeklies.length > KEEP_WEEKLY) { try { await h.removeEntry(weeklies.shift()!); } catch {} }
    }
    ls(LAST, String(Date.now())); ls(ERR, null); notify();
    return { ok: true };
  } catch (e: any) { const m = e?.message || "Backup nahi ho saka."; ls(ERR, m); notify(); return { ok: false, error: m }; }
  finally { running = false; }
}
export const due = () => Date.now() - Number(ls(LAST) || 0) >= EVERY_MS;
export const isOn = () => ls(ON) === "1";
