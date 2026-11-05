import { SHOP } from "@/lib/shop";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/mongodb";
import { getNextRepairTokenPreview, getRepairShopkeepers } from "@/lib/repairs";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const settings = await (await db()).collection("settings").findOne({});
    const nextToken = await getNextRepairTokenPreview();
    return NextResponse.json({
      shopkeeper: session.u,
      nextToken,
      shopName: String(settings?.shopName || SHOP.shortUpper),
      address: String(settings?.address || SHOP.address),
      phone: String(settings?.phone || ""),
      shopkeepers: getRepairShopkeepers(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Shop information could not be loaded." }, { status: 500 });
  }
}
