import { NextResponse } from "next/server";
import { db } from "@/lib/mongodb";

export const dynamic = 'force-dynamic';

const collections = ["products", "customers", "sales", "purchases", "transactions", "expenses", "salaries", "stockMovements"];

export async function GET() {
  const d = await db();
  const out: any = {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: {},
  };
  for (const c of collections)
    out.collections[c] = await d.collection(c).find({}).toArray();
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="new-arif-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
