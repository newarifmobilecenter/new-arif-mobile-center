import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/mongodb";
import { REPAIR_REMINDER_COLLECTION } from "@/lib/repairs";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid customer ID." }, { status: 400 });
  try {
    const body = await request.json();
    const message = String(body.message || "").trim();
    if (String(body.type || "").toUpperCase() !== "PAYMENT_DUE" || !message || message.length > 2000) {
      return NextResponse.json({ error: "A valid payment reminder message is required." }, { status: 400 });
    }
    const d = await db();
    const customer = await d.collection("customers").findOne({ _id: new ObjectId(id) });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    const [sales, repairs] = await Promise.all([
      d.collection("sales").find({ customerId: id, status: { $ne: "cancelled" }, remaining: { $gt: 0 } }).project({ remaining: 1 }).toArray(),
      d.collection("notebookEntries").find({ recordType: "REPAIR", deletedAt: null, customerId: id, remaining: { $gt: 0 } }).project({ remaining: 1 }).toArray(),
    ]);
    const balance = [...sales, ...repairs].reduce((sum, record) => sum + Number(record.remaining || 0), 0);
    if (balance <= 0) return NextResponse.json({ error: "This customer has no outstanding balance." }, { status: 409 });
    const now = new Date();
    const result = await d.collection(REPAIR_REMINDER_COLLECTION).insertOne({
      repairId: null,
      customerId: id,
      customerName: String(customer.name || ""),
      type: "PAYMENT_DUE",
      method: "WhatsApp",
      action: "PREPARED",
      message,
      preparedAt: now,
      preparedBy: session.u,
      createdAt: now,
    });
    return NextResponse.json({ ok: true, action: "PREPARED", sent: false, _id: result.insertedId.toString() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Reminder preparation could not be recorded." }, { status: 500 });
  }
}
