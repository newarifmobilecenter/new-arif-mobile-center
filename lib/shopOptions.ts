import { SHOP } from "./shop";

export const SHOPKEEPER_OPTIONS = SHOP.shopkeepers;
export const SHOP_PHONES = SHOP.phones;
export const SHOP_KEEPERS = SHOP.keepers;

// Bill par kaun sa number chhapega: Level 1 (Wholesale) aur Level 3 (Purchase Cost) = wholesale number,
// Level 0 (Retail) aur Level 2 (Retail Price) = retail number. Purani bills (level save nahi) pehle jaisi rahengi.
export function billPhones(priceLevel?: string | number | null): string {
  const l = priceLevel === undefined || priceLevel === null ? "" : String(priceLevel);
  if (l === "1" || l === "cost" || l === "3") return SHOP.phoneWholesale;
  if (l === "0" || l === "2" || l === "last") return SHOP.phoneRetail;
  return SHOP.phones.join(" | ");
}
