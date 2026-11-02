export const BATTERY = /batter|batt\b|bttry/i;
export const PANEL = /panel|lcd|display|screen|touch|tft|incell|folder|oled|led org/i;

export function itemCategory(i: any): string {
  const c = String(i?.category || "").trim();
  if (c) return c;
  const n = String(i?.name || "");
  if (/^repair\b/i.test(n)) return "Repair";
  if (BATTERY.test(n)) return "Battery";
  if (PANEL.test(n)) return "Display / Panel";
  return "Other";
}

export function groupItems(items: any[]) {
  const groups = new Map<string, any[]>();
  for (const i of items) { const c = itemCategory(i); groups.set(c, [...(groups.get(c) || []), i]); }
  return [...groups.entries()];
}

export function warrantyFlags(items: any[]) {
  return {
    battery: items.some((i) => BATTERY.test(itemCategory(i)) || BATTERY.test(String(i.name || ""))),
    panel: items.some((i) => PANEL.test(itemCategory(i)) || PANEL.test(String(i.name || ""))),
  };
}

// Some products carry a very long "fits these models" list in their name. On a receipt keep it to ~2 lines:
// first model, "+N models", and a hard cut.
export function shortItemName(name: unknown, max = 42): string {
  const full = String(name || "").trim();
  const segs = full.split(/\s*\/\s*/).filter(Boolean);
  let out = segs[0] || full;
  if (segs.length > 1) out += ` +${segs.length - 1} models`;
  return out.length > max ? out.slice(0, max - 1).trimEnd() + "…" : out;
}
