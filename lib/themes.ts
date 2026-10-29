// Colour themes: applied on <html data-theme="..."> (screen only). "blue" is the normal look.
export const THEMES = [
  { id: "blue", label: "Blue (default)", swatch: "#22d3ee" },
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
  { id: "purple", label: "Purple", swatch: "#a855f7" },
  { id: "sunset", label: "Sunset", swatch: "#f97316" },
  { id: "rose", label: "Rose", swatch: "#f43f5e" },
  { id: "light", label: "Light", swatch: "#e5e7eb" },
] as const;

const KEY = "na-theme";

export function getTheme(): string {
  try { const t = localStorage.getItem(KEY); return THEMES.some(x => x.id === t) ? (t as string) : "blue"; } catch { return "blue"; }
}

export function setTheme(id: string) {
  try { localStorage.setItem(KEY, id); } catch {}
  document.documentElement.setAttribute("data-theme", id);
}

// Runs before first paint (inline script in layout) to avoid a flash of the wrong theme.
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
