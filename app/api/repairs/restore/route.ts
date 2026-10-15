import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession, hasRole } from "@/lib/auth";
import { db } from "@/lib/mongodb";
import { ensureRepairIndexes, normalizeRepairInput, REPAIR_COUNTER_COLLECTION, REPAIR_REMINDER_COLLECTION, REPAIR_TOKEN_COUNTER_ID, RepairValidationError } from "@/lib/repairs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasRole(session, "ADMIN")) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await request.json();
    if (!Array.isArray(body.repairs) || body.repairs.length > 5000 || !Array.isArray(body.reminders || []) || (body.reminders || []).length > 10000) {
      return NextResponse.json({ error: "Backup must contain valid repair and reminder lists." }, { status: 400 });
    }

    const d = await db();
    const repairsCollection = await ensureRepairIndexes();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    let highestToken = Number.isSafeInteger(Number(body.counterValue)) && Number(body.counterValue) >= 1007 ? Number(body.counterValue) : 1007;
    let highestCToken = 999;

    for (let index = 0; index < body.repairs.length; index += 1) {
      const source = body.repairs[index];
      try {
        const normalized = normalizeRepairInput({
          ...source,
          totalBill: source.totalBill ?? source.agreedRate ?? 0,
          receivedAt: source.receivedAt || source.createdAt,
        }, { allowUnlinked: true, legacyBackup: true });
        const tokenNo = String(source.tokenNo || "").trim();
        if (!/^[PC]\d{1,12}$/i.test(tokenNo)) throw new RepairValidationError("Backup contains an invalid repair token.");
        const tokenValue = Number(tokenNo.slice(1));
        if (!Number.isSafeInteger(tokenValue)) throw new RepairValidationError("Backup contains an invalid repair token.");
        const id = ObjectId.isValid(String(source._id || "")) ? new ObjectId(source._id) : new ObjectId();
        const createdAt = source.createdAt ? new Date(source.createdAt) : normalized.receivedAt;
        const updatedAt = source.updatedAt ? new Date(source.updatedAt) : createdAt;
        const deletedAt = source.deletedAt ? new Date(source.deletedAt) : null;
        if ([createdAt, updatedAt, ...(deletedAt ? [deletedAt] : [])].some((date) => Number.isNaN(date.getTime()))) {
          throw new RepairValidationError("Backup contains an invalid audit date.");
        }
        const paymentHistory = Array.isArray(source.paymentHistory)
          ? source.paymentHistory.filter((item: any) => Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0).map((item: any) => ({
            amount: Math.min(Number(item.amount), normalized.totalBill),
            paymentMethod: String(item.paymentMethod || normalized.paymentMethod),
            type: String(item.type || "RESTORED_PAYMENT").slice(0, 40),
            reference: String(item.reference || tokenNo).slice(0, 120),
            at: Number.isNaN(new Date(item.at || createdAt).getTime()) ? createdAt : new Date(item.at || createdAt),
            user: String(item.user || "backup").slice(0, 120),
          }))
          : [];
        const document = {
          _id: id,
          ...normalized,
          tokenNo,
          entryNo: tokenNo,
          paymentHistory,
          statusHistory: Array.isArray(source.statusHistory) ? source.statusHistory.slice(-100) : [{ status: normalized.status, at: normalized.receivedAt, user: "backup" }],
          shopkeeper: String(source.shopkeeper || source.createdBy || "").slice(0, 120),
          shopName: String(source.shopName || "NEW ARIF MOBILE").slice(0, 120),
          shopPhone: String(source.shopPhone || "").slice(0, 40),
          shopAddress: String(source.shopAddress || "Al saif plaza kamar mushani, mianwali").slice(0, 240),
          createdAt,
          updatedAt,
          createdBy: String(source.createdBy || "backup").slice(0, 120),
          updatedBy: String(source.updatedBy || source.createdBy || "backup").slice(0, 120),
          deletedAt,
          deletedBy: deletedAt ? String(source.deletedBy || "backup").slice(0, 120) : null,
          restoredAt: new Date(),
          restoredBy: session.u,
        };
        await repairsCollection.insertOne(document);
        imported += 1;
        if (tokenNo[0].toUpperCase() === "C") highestCToken = Math.max(highestCToken, tokenValue);
        else highestToken = Math.max(highestToken, tokenValue);
      } catch (error: any) {
        skipped += 1;
        if (error?.code !== 11000) errors.push(`Repair ${index + 1}: ${error?.message || "Invalid repair."}`);
      }
    }

    const counterCollection = d.collection<{ _id: string; value: number }>(REPAIR_COUNTER_COLLECTION);
    try {
      await counterCollection.updateOne({ _id: "mobile-repair-token" }, { $max: { value: highestToken } }, { upsert: true });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      await counterCollection.updateOne({ _id: "mobile-repair-token" }, { $max: { value: highestToken } });
    }
    try {
      await counterCollection.updateOne({ _id: REPAIR_TOKEN_COUNTER_ID }, { $max: { value: highestCToken } }, { upsert: true });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      await counterCollection.updateOne({ _id: REPAIR_TOKEN_COUNTER_ID }, { $max: { value: highestCToken } });
    }

    let remindersImported = 0;
    let remindersSkipped = 0;
    const repairIds = new Set((await repairsCollection.find({ recordType: "REPAIR" }, { projection: { _id: 1 } }).toArray()).map((repair) => repair._id.toString()));
    const reminderRows = body.reminders || [];
    for (const source of reminderRows) {
      const repairId = String(source.repairId || "");
      const customerId = String(source.customerId || "");
      const message = String(source.message || "").trim();
      const date = new Date(source.createdAt || source.openedAt || Date.now());
      if ((!repairIds.has(repairId) && !ObjectId.isValid(customerId)) || !message || message.length > 2000 || Number.isNaN(date.getTime())) {
        remindersSkipped += 1;
        continue;
      }
      const allowedType = ["PAYMENT_DUE", "REPAIR_READY", "MOBILE_DELIVERY"].includes(String(source.type).toUpperCase()) ? String(source.type).toUpperCase() : "PAYMENT_DUE";
      try {
        await d.collection(REPAIR_REMINDER_COLLECTION).insertOne({
          _id: ObjectId.isValid(String(source._id || "")) ? new ObjectId(source._id) : new ObjectId(),
          repairId: repairIds.has(repairId) ? repairId : null,
          customerId: ObjectId.isValid(customerId) ? customerId : null,
          customerName: String(source.customerName || "").slice(0, 120),
          tokenNo: String(source.tokenNo || "").slice(0, 40),
          type: allowedType,
          method: "WhatsApp",
          action: "PREPARED",
          message,
          preparedAt: date,
          preparedBy: String(source.preparedBy || source.openedBy || "backup").slice(0, 120),
          createdAt: date,
          restoredAt: new Date(),
          restoredBy: session.u,
        });
        remindersImported += 1;
      } catch (error: any) {
        if (error?.code === 11000) remindersSkipped += 1;
        else throw error;
      }
    }

    return NextResponse.json({ ok: errors.length === 0, imported, skipped, remindersImported, remindersSkipped, errors: errors.slice(0, 50) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Repair restore failed." }, { status: 400 });
  }
}
