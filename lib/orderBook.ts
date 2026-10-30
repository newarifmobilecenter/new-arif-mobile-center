// Order Book helpers: turn a repair's fault text into the parts it needs, and match them to stock products.
import { applyRules, DEFAULT_RULES } from "@/lib/autoRules";

const ALIAS: RegExp[] = [
  /^(panel|lcd|display|screen|touch|folder|led|incell|tft|oled)$/,
  /^(ch|chb|charging|charger|port|pcb|board)$/,
  /^(batter|battery|batteries|batry)$/,
];
const STOP = new Set(["problem", "issue", "change", "replace", "replacement", "wala", "wali", "ka", "ki", "ke", "ko", "hai", "ha", "work", "kharab", "ni", "nahi", "the", "of", "new", "ok"]);
const BRANDS = new Set(["vivo", "oppo", "samsung", "infinix", "tecno", "itel", "realme", "oneplus", "iphone", "apple", "xiaomi", "redmi", "mi", "huawei", "nokia", "honor", "motorola", "lava", "qmobile", "voice"]);

export const tokens = (s: string) => String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function splitFault(fault: string): string[] {
  const seen = new Set<string>();
  return String(fault || "").split(/[+,;\n&]|\b(?:and|aur)\b/i).map((x) => x.trim()).filter((x) => {
    const k = x.toLowerCase();
    if (x.length < 3 || seen.has(k) || !tokens(x).some((t) => !STOP.has(t))) return false;
    seen.add(k); return true;
  });
}

function tokMatches(textTokens: string[], tok: string) {
  const g = ALIAS.find((r) => r.test(tok));
  if (g) return textTokens.some((t) => g.test(t));
  return textTokens.some((t) => t === tok || (tok.length >= 3 && t.startsWith(tok)));
}

/** Does a product name cover every word of a wanted part (brand words are optional)? */
export function nameCovers(productText: string, wanted: string) {
  const text = tokens(productText);
  const need = tokens(wanted).filter((t) => !STOP.has(t) && !BRANDS.has(t));
  return need.length > 0 && need.every((t) => tokMatches(text, t));
}

export type Need = { piece: string; name: string; category: string; product: any | null; available: number; needOrder: boolean };

export function categoryOf(name: string, fallback = "") {
  const t = String(name || "");
  if (/back\s*ring|camera\s*ring/i.test(t)) return "Back Ring";
  if (/\bchb\b|\bch\b|charging\s*strip|\bstrip\b/i.test(t)) return "CHB Strip";
  return applyRules(t, DEFAULT_RULES)?.category || fallback || "Other";
}

export function analyzeFault(products: any[], holds: Record<string, any[]>, model: string, fault: string): Need[] {
  const modelKeys = tokens(model).filter((t) => /\d/.test(t));
  const keys = modelKeys.length ? modelKeys : tokens(model).filter((t) => t.length >= 2 && !BRANDS.has(t));
  if (!keys.length) return [];
  return splitFault(fault).map((piece) => {
    const name = `${model} ${piece}`.trim().toUpperCase();
    const hits = products.filter((p) => {
      const text = `${p.name || ""} ${p.model || ""} ${p.brand || ""}`;
      const tk = tokens(text);
      return keys.every((k) => tk.includes(k)) && nameCovers(`${p.name || ""} ${p.model || ""}`, piece);
    });
    const avail = (p: any) => Number(p.stock || 0) - (holds[String(p._id)] || []).reduce((n, h) => n + Number(h.qty || 0), 0);
    const best = [...hits].sort((a, b) => avail(b) - avail(a))[0] || null;
    const available = best ? avail(best) : 0;
    return { piece, name, category: categoryOf(piece, best?.category), product: best, available, needOrder: !best || available < 1 };
  });
}
