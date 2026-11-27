// Bill / slip aur auto-rate ki settings (Settings page se badalti hain, database ke "settings" document mein save hoti hain).
export type Warranty = { name: string; keys: string; text: string };
export type RateRule = { category: string; retail: number; wholesale: number };
export type BillSettings = { logoText: string; warranties: Warranty[]; rateRetail: number; rateWholesale: number; rateRules: RateRule[] };

export const DEFAULT_WARRANTIES: Warranty[] = [
  { name: "Battery", keys: "batter, bttry", text: "Battery: Sirf battery ki timing (backup) ki 7 din ki warranty hai. Toot phoot, pani ya ghalat istemal par warranty nahi." },
  { name: "Panel / Display", keys: "panel, lcd, display, screen, touch, tft, incell, folder, oled", text: "Panel / Display: koi warranty ya guarantee nahi. Check karke lein." },
];

const num = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export function normalizeBill(raw: any): BillSettings {
  const w = Array.isArray(raw?.warranties) ? raw.warranties : null;
  const warranties = (w ?? DEFAULT_WARRANTIES).slice(0, 30).map((x: any) => ({ name: str(x?.name, 60), keys: str(x?.keys, 300), text: str(x?.text, 400) })).filter((x: Warranty) => x.name || x.text);
  const rules = (Array.isArray(raw?.rateRules) ? raw.rateRules : []).slice(0, 300).map((x: any) => ({ category: str(x?.category, 80), retail: num(x?.retail, 2), wholesale: num(x?.wholesale, 1.5) })).filter((x: RateRule) => x.category);
  return { logoText: str(raw?.billLogo, 40), warranties, rateRetail: num(raw?.rateRetail, 2), rateWholesale: num(raw?.rateWholesale, 1.5), rateRules: rules };
}

/** Naye product ki pehli purchase par cost se retail / wholesale (category ki apni setting ho to wo, warna default). */
export function calcRates(cost: number, category: string, b: BillSettings): { retail: string; wholesale: string } {
  if (!(cost > 0)) return { retail: "", wholesale: "" };
  const r = b.rateRules.find((x) => x.category.toLowerCase() === String(category || "").trim().toLowerCase());
  const rm = r ? r.retail : b.rateRetail, wm = r ? r.wholesale : b.rateWholesale;
  return { retail: String(Math.round(cost * rm)), wholesale: String(Math.round(cost * wm)) };
}

/** Logo box ke lines: settings mein likha text (jaise AML), warna dukaan ke naam se. */
export function logoLinesOf(b: BillSettings, fallback: string[]): string[] {
  const t = b.logoText.trim();
  return t ? t.toUpperCase().split(/\s+/).slice(0, 3) : fallback;
}

/** Bill ke items se kaun si warranty likhni hai. */
export function warrantiesFor(items: any[], b: BillSettings): Warranty[] {
  const hay = items.map((i) => `${String(i?.category || "")} ${String(i?.name || "")}`.toLowerCase());
  return b.warranties.filter((w) => {
    const keys = w.keys.split(",").map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 2);
    return w.text && keys.some((k) => hay.some((h) => h.includes(k)));
  });
}

const KEY = "na-bill-settings";
let mem: BillSettings | null = null;
export function cachedBill(): BillSettings {
  if (mem) return mem;
  try { if (typeof window !== "undefined") { const r = window.localStorage.getItem(KEY); if (r) { mem = normalizeBill(JSON.parse(r)); return mem; } } } catch { /* storage band ho sakta hai */ }
  return normalizeBill({});
}
export async function loadBill(): Promise<BillSettings> {
  const r = await fetch("/api/bill-settings", { cache: "no-store" });
  if (!r.ok) throw new Error("bill settings");
  const raw = await r.json();
  mem = normalizeBill(raw);
  try { window.localStorage.setItem(KEY, JSON.stringify(raw)); } catch { /* ok */ }
  return mem;
}
