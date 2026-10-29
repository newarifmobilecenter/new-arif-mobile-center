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

export function detectBrand(name: string, brandList: string[]) {
  if (/\b(iphone|apple)\b/i.test(name)) return "iPhone";
  const sorted = [...brandList].filter(b => b && !/^(other|universal)$/i.test(b)).sort((a, b) => b.length - a.length);
  for (const b of sorted) {
    const esc = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(name)) return b;
  }
  return "";
}

export const AUTO_RULES_TYPE = "autoRules";
