import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/mongodb";
import { ensureRepairIndexes, REMINDER_TYPES, REPAIR_REMINDER_COLLECTION } from "@/lib/repairs";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  if (!(await getSession())) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid repair ID." }, { status: 400 });
  try {
    const entries = await (await db()).collection(REPAIR_REMINDER_COLLECTION)
      .find({ repairId: id }).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json(entries.map((entry) => ({ ...entry, _id: entry._id.toString() })));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Reminder history could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid repair ID." }, { status: 400 });

  try {
    const body = await request.json();
    const type = String(body.type || "").toUpperCase();
    if (!(REMINDER_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ error: "Select a valid reminder type." }, { status: 400 });
    }
    const message = String(body.message || "").trim();
    if (!message || message.length > 2000) return NextResponse.json({ error: "Reminder message is required and must be 2,000 characters or fewer." }, { status: 400 });

    const d = await db();
    const repair = await (await ensureRepairIndexes()).findOne({ _id: new ObjectId(id), recordType: "REPAIR", deletedAt: null });
    if (!repair) return NextResponse.json({ error: "Repair record not found." }, { status: 404 });
    if (type === "PAYMENT_DUE" && Number(repair.remaining || 0) <= 0) return NextResponse.json({ error: "This repair has no payment due." }, { status: 409 });
    if ((type === "REPAIR_READY" || type === "MOBILE_DELIVERY") && repair.status !== "READY") return NextResponse.json({ error: "This reminder is available when the repair is ready." }, { status: 409 });
    const now = new Date();
    const result = await d.collection(REPAIR_REMINDER_COLLECTION).insertOne({
      repairId: id,
      tokenNo: repair.tokenNo,
      customerId: repair.customerId,
      customerName: repair.customerName,
      type,
      method: "WhatsApp",
      action: "PREPARED",
      message,
      preparedAt: now,
      preparedBy: session.u,
      createdAt: now,
    });
    return NextResponse.json({ ok: true, action: "PREPARED", sent: false, _id: result.insertedId.toString() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Reminder could not be recorded." }, { status: 500 });
  }
}
