import { NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const collections = [
  "products",
  "customers",
  "sales",
  "purchases",
  "transactions",
  "expenses",
  "salaries",
  "stockMovements",
  "suppliers",
  "invoices",
  "warranties",
  "settings",
  "backupLogs",
  "quotations",
  "employees",
  "auditLogs",
  "returns",
  "repairs",
  "notebookEntries",
  "repairCounters",
  "repairReminders",
];

export async function GET() {
  // Full database export: administrators only. Middleware only proves "logged in";
  // it cannot tell ADMIN from STAFF, so the role check has to happen here.
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (!hasRole(session, "ADMIN")) {
    return NextResponse.json(
      { error: "Admin access required. Backup sirf admin export kar sakta hai." },
      { status: 403 }
    );
  }

  try {
    const d = await db();
    const out: any = {
      version: 2,
      exportedAt: new Date().toISOString(),
      exportedBy: session.u,
      collections: {},
    };

    const existing = new Set(
      (await d.listCollections({}, { nameOnly: true }).toArray()).map((x) => x.name)
    );

    for (const c of collections) {
      out.collections[c] = existing.has(c)
        ? await d.collection(c).find({}).toArray()
        : [];
    }

    await d.collection("backupLogs").insertOne({
      type: "EXPORT",
      by: session.u,
      role: session.r,
      createdAt: new Date(),
    });

    return new NextResponse(JSON.stringify(out, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="new-arif-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Backup failed" },
      { status: 500 }
    );
  }
}
