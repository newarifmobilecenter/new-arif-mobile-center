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
