import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";
import { ensureNotebookIndexes, normalizeNotebookEntry, NotebookValidationError } from "@/lib/notebook";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function findEntry(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const collection = await ensureNotebookIndexes();
  return collection.findOne({ _id: new ObjectId(id), deletedAt: null, recordType: { $ne: "REPAIR" } });
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await context.params;
  try {
    const entry = await findEntry(id);
    if (!entry) return NextResponse.json({ error: "Notebook entry not found." }, { status: 404 });
    return NextResponse.json({
      entry: { ...entry, _id: entry._id.toString() },
      permissions: { canDelete: hasRole(session, "ADMIN") },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Notebook entry could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Notebook entry ID." }, { status: 400 });

  try {
    const body = await req.json();
    const collection = await ensureNotebookIndexes();
    const _id = new ObjectId(id);
    const current = await collection.findOne({ _id, deletedAt: null, recordType: { $ne: "REPAIR" } });
    if (!current) return NextResponse.json({ error: "Notebook entry not found." }, { status: 404 });
    const merged = { ...current, ...body };

    if (Object.prototype.hasOwnProperty.call(body, "customerId")) {
      const customerId = String(body.customerId ?? "").trim();
      merged.customerId = customerId || null;
    }
    const normalized = normalizeNotebookEntry(merged);
    if (Object.prototype.hasOwnProperty.call(body, "customerId") && normalized.customerId) {
      const customer = await (await db()).collection("customers").findOne({ _id: new ObjectId(normalized.customerId) });
      if (!customer) throw new NotebookValidationError("Selected customer was not found.");
    }

    const result = await collection.findOneAndUpdate(
      { _id, deletedAt: null, recordType: { $ne: "REPAIR" } },
      { $set: { ...normalized, updatedAt: new Date(), updatedBy: session.u } },
      { returnDocument: "after" },
    );
    if (!result) return NextResponse.json({ error: "Notebook entry not found." }, { status: 404 });
    return NextResponse.json({ ...result, _id: result._id.toString() });
  } catch (error: any) {
    const status = error instanceof NotebookValidationError ? 400 : 500;
    return NextResponse.json({ error: error?.message || "Notebook entry could not be updated." }, { status });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session || !hasRole(session, "ADMIN")) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid Notebook entry ID." }, { status: 400 });

  try {
    const collection = await ensureNotebookIndexes();
    const result = await collection.updateOne(
      { _id: new ObjectId(id), deletedAt: null, recordType: { $ne: "REPAIR" } },
      { $set: { deletedAt: new Date(), deletedBy: session.u, updatedAt: new Date(), updatedBy: session.u } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Notebook entry not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Notebook entry could not be deleted." }, { status: 500 });
  }
}

