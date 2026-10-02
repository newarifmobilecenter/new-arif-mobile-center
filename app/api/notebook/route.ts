import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, describeMongoConnectionError } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";
import {
  ensureNotebookIndexes,
  generateEntryNo,
  normalizeNotebookEntry,
  NotebookValidationError,
} from "@/lib/notebook";

export const runtime = "nodejs";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
    const from = req.nextUrl.searchParams.get("from") || "";
    const to = req.nextUrl.searchParams.get("to") || "";
    const customerId = req.nextUrl.searchParams.get("customerId") || "";
    const status = (req.nextUrl.searchParams.get("status") || "").toUpperCase();
    const filter: Record<string, any> = { deletedAt: null, recordType: { $ne: "REPAIR" } };

    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { entryNo: pattern },
        { customerName: pattern },
        { phone: pattern },
        { title: pattern },
        { description: pattern },
        { remarks: pattern },
      ];
    }
    if (from) filter.date = { ...(filter.date || {}), $gte: from };
    if (to) filter.date = { ...(filter.date || {}), $lte: to };
    if (status) {
      if (!["PAID", "PARTIAL", "UNPAID"].includes(status)) {
        return NextResponse.json({ error: "Invalid Notebook payment status filter." }, { status: 400 });
      }
      filter.status = status;
    }
    if (customerId) {
      if (!ObjectId.isValid(customerId)) {
        return NextResponse.json({ error: "Invalid customer filter." }, { status: 400 });
      }
      filter.customerId = customerId;
    }

    const collection = await ensureNotebookIndexes();
    const entries = await collection.find(filter).sort({ date: -1, createdAt: -1 }).limit(1000).toArray();
    return NextResponse.json({
      entries: entries.map((entry: any) => ({ ...entry, _id: entry._id.toString() })),
      permissions: { canDelete: hasRole(session, "ADMIN") },
    });
  } catch (error: any) {
    const message = describeMongoConnectionError(error);
    return NextResponse.json({ error: `Unable to load Notebook. ${message}` }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  try {
    const body = await req.json();
    const normalized = normalizeNotebookEntry(body);
    if (normalized.customerId) {
      const customer = await (await db()).collection("customers").findOne(
        { _id: new ObjectId(normalized.customerId) },
        { projection: { _id: 1 } },
      );
      if (!customer) throw new NotebookValidationError("Selected customer was not found.");
    }

    const now = new Date();
    const document = {
      ...normalized,
      recordType: "NOTEBOOK",
      entryNo: generateEntryNo(normalized.date),
      createdAt: now,
      updatedAt: now,
      createdBy: session.u,
      updatedBy: session.u,
      deletedAt: null,
      deletedBy: null,
    };
    const result = await (await ensureNotebookIndexes()).insertOne(document);
    return NextResponse.json({
      ...document,
      _id: result.insertedId.toString(),
    }, { status: 201 });
  } catch (error: any) {
    const status = error instanceof NotebookValidationError ? 400 : error?.code === 11000 ? 409 : 500;
    return NextResponse.json({ error: error?.message || "Notebook entry could not be saved." }, { status });
  }
}

