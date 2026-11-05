// Business details. Set these in Vercel > Settings > Environment Variables, then Redeploy.
// (NEXT_PUBLIC_* values are baked in at build time.)
//   NEXT_PUBLIC_SHOP_NAME         full name         e.g. Ali Mobile Center
//   NEXT_PUBLIC_SHOP_SHORT_NAME   (optional) shorter name for receipts/slips, defaults to the full name
//   NEXT_PUBLIC_SHOP_ADDRESS      e.g. Shop 5, Main Bazaar, Lahore
//   NEXT_PUBLIC_SHOP_CITY         (optional) defaults to the last part of the address
//   NEXT_PUBLIC_SHOP_PHONES       e.g. 03001234567, 03111234567   (comma separated, shown on bills/slips)
//   NEXT_PUBLIC_SHOPKEEPERS       e.g. Ali, Ahmed, Bilal           (comma separated, repair slip choices)
const g = (f: () => string | undefined) => { try { return (f() || "").trim(); } catch { return ""; } };
const list = (s: string, fallback: string[]) => { const a = s.split(/[,|]/).map((x) => x.trim()).filter(Boolean); return a.length ? a : fallback; };

const name = g(() => process.env.NEXT_PUBLIC_SHOP_NAME) || "Your Business Name";
const short = g(() => process.env.NEXT_PUBLIC_SHOP_SHORT_NAME) || name;
const address = g(() => process.env.NEXT_PUBLIC_SHOP_ADDRESS) || "Your Shop Address, City";
const city = g(() => process.env.NEXT_PUBLIC_SHOP_CITY) || (address.split(",").pop() || "").trim() || address;
const phones = list(g(() => process.env.NEXT_PUBLIC_SHOP_PHONES), ["03000000001", "03000000002", "03000000003"]);
const shopkeepers = list(g(() => process.env.NEXT_PUBLIC_SHOPKEEPERS), ["Owner", "Staff 1", "Staff 2"]);

// Software support number: fixed in the code on purpose, NOT configurable from environment variables.
export const HELPLINE = "03290882200";

const words = short.toUpperCase().split(/\s+/).filter(Boolean);
// up to 3 short lines for the logo box on slips
const logoLines = words.length <= 3 ? words : [words[0], words.slice(1, -1).join(" "), words[words.length - 1]];
const initials = name.toUpperCase().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "POS";
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pos";

export const SHOP = { name, nameUpper: name.toUpperCase(), short, shortUpper: short.toUpperCase(), address, city, phones, shopkeepers, logoLines, initials, slug, helpline: HELPLINE };
