import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { ensureRepairIndexes } from "@/lib/repairs";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  if (!(await getSession())) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid repair ID." }, { status: 400 });
  try {
    const entry = await (await ensureRepairIndexes()).findOne({
      _id: new ObjectId(id),
      recordType: "REPAIR",
      deletedAt: null,
    });
    if (!entry) return NextResponse.json({ error: "Repair record not found." }, { status: 404 });
    return NextResponse.json({ ...entry, _id: entry._id.toString(), sensitiveFieldsAuthorized: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Repair could not be loaded." }, { status: 500 });
  }
}
