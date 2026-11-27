import { NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Slip/auto-rate ki settings (har login user ko, kyunke bill staff bhi chhapta hai). */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const doc: any = await (await db()).collection("settings").findOne({});
    return NextResponse.json({ billLogo: doc?.billLogo ?? "", warranties: doc?.warranties, rateRetail: doc?.rateRetail, rateWholesale: doc?.rateWholesale, rateRules: doc?.rateRules ?? [] });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Load nahi hua." }, { status: 500 }); }
}
