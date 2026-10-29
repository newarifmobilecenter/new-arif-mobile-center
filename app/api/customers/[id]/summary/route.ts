import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/mongodb";
import { ensureRepairIndexes, REPAIR_REMINDER_COLLECTION, toRepairListItem } from "@/lib/repairs";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  if (!(await getSession())) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid customer ID." }, { status: 400 });
  try {
    const d = await db();
    const customer = await d.collection("customers").findOne({ _id: new ObjectId(id) });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    const [sales, repairs, transactions, reminders] = await Promise.all([
      d.collection("sales").find({ customerId: id, status: { $ne: "cancelled" } }).sort({ createdAt: -1 }).limit(5000).toArray(),
      (await ensureRepairIndexes()).find({ recordType: "REPAIR", deletedAt: null, customerId: id }).sort({ receivedAt: -1 }).limit(5000).toArray(),
      d.collection("transactions").find({ customerId: id }).sort({ createdAt: -1 }).limit(500).toArray(),
      d.collection(REPAIR_REMINDER_COLLECTION).find({ customerId: id }).sort({ createdAt: -1 }).limit(100).toArray(),
    ]);
    const currentRepairs = repairs.filter((repair) => !["DELIVERED", "CANCELLED"].includes(repair.status));
    const oldRepairs = repairs.filter((repair) => ["DELIVERED", "CANCELLED"].includes(repair.status));
    const balance = sales.reduce((sum, sale) => sum + Number(sale.remaining || 0), 0) + repairs.reduce((sum, repair) => sum + Number(repair.remaining || 0), 0);
    return NextResponse.json({
      customer: { ...customer, _id: customer._id.toString() },
      balance,
      sales: sales.map((sale) => ({ _id: sale._id.toString(), invoiceNo: sale.invoiceNo, createdAt: sale.createdAt, total: sale.total, paid: sale.paid, remaining: sale.remaining, status: sale.status })),
      currentRepairs: currentRepairs.map(toRepairListItem),
      oldRepairs: oldRepairs.map(toRepairListItem),
      payments: transactions.map((transaction) => ({ ...transaction, _id: transaction._id.toString() })),
      reminders: reminders.map((reminder) => ({ ...reminder, _id: reminder._id.toString() })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Customer history could not be loaded." }, { status: 500 });
  }
}
