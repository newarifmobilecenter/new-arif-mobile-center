"use client";
import { SHOP } from "@/lib/shop";
import { useBill } from "@/lib/useBill";
import { logoLinesOf } from "@/lib/billSettings";

// Logo box ka text: Settings mein likha (jaise AML), warna dukaan ke naam ke lafz.
export default function ShopLogoText() {
  const lines = logoLinesOf(useBill(), SHOP.logoLines);
  return <>{lines.map((l, i) => <span key={i}>{i > 0 ? <br /> : null}{l}</span>)}</>;
}
