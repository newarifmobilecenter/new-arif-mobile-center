import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession, hasRole } from "@/lib/auth";
import {
  ensureNotebookIndexes,
  normalizeNotebookEntry,
  NotebookValidationError,
} from "@/lib/notebook";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !hasRole(session, "ADMIN")) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await req.json();
    if (!Array.isArray(body.entries) || body.entries.length > 2000) {
      return NextResponse.json({ error: "Provide up to 2,000 Notebook entries to restore." }, { status: 400 });
    }

    const collection = await ensureNotebookIndexes();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let index = 0; index < body.entries.length; index += 1) {
      const source = body.entries[index];
      try {
        if (source?.recordType === "REPAIR") throw new NotebookValidationError("Repair records must be restored through the repair restore endpoint.");
        const normalized = normalizeNotebookEntry(source, { preserveEntryNo: true });
        const id = ObjectId.isValid(String(source._id || "")) ? new ObjectId(source._id) : new ObjectId();
        const createdAt = source.createdAt ? new Date(source.createdAt) : new Date();
        const updatedAt = source.updatedAt ? new Date(source.updatedAt) : createdAt;
        if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) {
          throw new NotebookValidationError("Backup contains an invalid audit date.");
        }
        const deletedAt = source.deletedAt ? new Date(source.deletedAt) : null;
        if (deletedAt && Number.isNaN(deletedAt.getTime())) {
          throw new NotebookValidationError("Backup contains an invalid deletion date.");
        }

        await collection.insertOne({
          _id: id,
          ...normalized,
          createdAt,
          updatedAt,
          createdBy: String(source.createdBy || "backup").slice(0, 120),
          updatedBy: String(source.updatedBy || source.createdBy || "backup").slice(0, 120),
          deletedAt,
          deletedBy: deletedAt ? String(source.deletedBy || "backup").slice(0, 120) : null,
          restoredAt: new Date(),
          restoredBy: session.u,
        });
        imported += 1;
      } catch (error: any) {
        if (error?.code === 11000) {
          skipped += 1;
          continue;
        }
        skipped += 1;
        errors.push(`Entry ${index + 1}: ${error?.message || "Invalid entry."}`);
      }
    }

    return NextResponse.json({ ok: errors.length === 0, imported, skipped, errors: errors.slice(0, 50) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Notebook restore failed." }, { status: 400 });
  }
}
