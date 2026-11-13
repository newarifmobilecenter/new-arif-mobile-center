// Auto-fill rules for Add Product: words typed in the product name -> category / brand type / group / item type (/ brand).
export type AutoRule = {
  id: string;
  /** Comma separated alternatives. Inside one alternative use + for "all of these words" (e.g. panel+org). */
  keywords: string;
  category: string;
  brand: string;
  brandType: string;
  productGroup: string;
  itemType: string;
};

const parts = (category: string, keywords: string, extra: Partial<AutoRule> = {}): AutoRule => ({
  id: `d-${category}`, keywords, category, brand: "", brandType: "Parts", productGroup: "Mobile Parts", itemType: "Part", ...extra,
});

export const DEFAULT_RULES: AutoRule[] = [
  parts("Charging Ports", "charging,charger,port,pcb,board"),
  parts("Batteries", "batter"),
  parts("Displays OLED", "oled,amoled"),
  parts("Displays / INCELL / TFT", "incell,tft"),
  parts("Displays LED ORG", "led+org,panel+org,lcd+org,display+org,screen+org,touch+org,panel+original,lcd+original,display+original"),
  parts("Displays / LCD", "panel,lcd,display,screen,touch,folder"),
  parts("Speakers / Mic", "speaker,mic,microphone,ringer,buzzer"),
  parts("Cameras", "camera"),
  parts("Buttons / Flex", "button,flex,power key,volume"),
  parts("Body / Housing", "body,housing,back cover,frame"),
  parts("Tools", "tool,screwdriver,soldering,kit", { brandType: "Other", productGroup: "Tools", itemType: "Tool" }),
];

const tokens = (name: string) => name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function wordHit(kw: string, name: string, toks: string[]) {
  const k = kw.trim().toLowerCase();
  if (!k) return false;
  if (/\s/.test(k)) return name.toLowerCase().includes(k);
  return toks.some(t => t.startsWith(k));
}

export function ruleMatches(rule: AutoRule, name: string) {
  const toks = tokens(name);
  return rule.keywords.split(",").some(group => { const need = group.split("+").map(s => s.trim()).filter(Boolean); return need.length > 0 && need.every(k => wordHit(k, name, toks)); });
}

/** First matching rule wins. Empty fields in the rule are left untouched. */
export function applyRules(name: string, rules: AutoRule[]) {
  return rules.find(r => ruleMatches(r, name)) || null;
}

// Aam mobile brands: agar list mein na bhi hon to naam se pehchan liye jate hain.
export const KNOWN_BRANDS = ["Nokia", "Huawei", "Xiaomi", "Redmi", "Poco", "Honor", "Motorola", "Sony", "LG", "HTC", "Lenovo", "Asus", "Google", "Alcatel", "ZTE", "QMobile", "Realme", "Nothing", "Tecno", "Infinix", "Itel", "Vivo", "Oppo", "OnePlus", "Samsung", "Meizu", "Micromax", "Gionee", "Blackview", "Ulefone", "Doogee", "Oukitel", "Cubot", "Hotwav", "G'Five", "Voice", "Haier", "TCL", "Sparx", "Rivo", "Jazz", "Dany", "Maxfone"];

export function detectBrand(name: string, brandList: string[]) {
  if (/\b(iphone|apple)\b/i.test(name)) return "iPhone";
  const sorted = [...brandList, ...KNOWN_BRANDS.filter(k => !brandList.some(b => b.toLowerCase() === k.toLowerCase()))].filter(b => b && !/^(other|universal)$/i.test(b)).sort((a, b) => b.length - a.length);
  for (const b of sorted) {
    const esc = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(name)) return b;
  }
  return "";
}

export const AUTO_RULES_TYPE = "autoRules";

// Brand Selection (Settings): product name mein keyword aaye to Make / Brand khud select ho.
export type BrandRule = { id: string; brand: string; keywords: string };
export const BRAND_RULES_TYPE = "brandRules";

/** First brand rule whose brand name or any keyword appears as a word (prefix) in the product name. */
export function matchBrandRule(name: string, rules: BrandRule[]) {
  const toks = tokens(name);
  for (const r of rules) {
    const brand = String(r.brand || "").trim();
    if (!brand) continue;
    const kws = [brand, ...String(r.keywords || "").split(",")].map(k => k.trim().toLowerCase()).filter(Boolean);
    if (kws.some(k => (/\s/.test(k) ? name.toLowerCase().includes(k) : toks.some(t => t === k || (k.length >= 4 && t.startsWith(k)))))) return brand;
  }
  return "";
}

export const DEFAULT_BRANDS = ["Infinix", "Tecno", "Itel", "Vivo", "Oppo", "Realme", "OnePlus", "Samsung", "iPhone"];

/** Naye default rules (jaise Displays OLED) jo purani saved rules mein nahi hoti: saved list mein sab se pehle jod dete hain, agar us category ki rule pehle se na ho. */
export const NEW_DEFAULT_RULE_IDS = ["d-Displays OLED"];
export function withNewDefaults(saved: AutoRule[]) {
  const have = new Set(saved.map(r => String(r.category || "").toLowerCase()));
  const add = DEFAULT_RULES.filter(r => NEW_DEFAULT_RULE_IDS.includes(r.id) && !have.has(r.category.toLowerCase()));
  return [...add, ...saved];
}
