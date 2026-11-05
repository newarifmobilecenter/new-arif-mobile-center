import { SHOP } from "@/lib/shop";

// The short shop name split over up to 3 lines, for the small logo box.
export default function ShopLogoText() {
  return <>{SHOP.logoLines.map((l, i) => <span key={i}>{i > 0 ? <br /> : null}{l}</span>)}</>;
}
