import type { ClientSession, Db } from "mongodb";
import { ObjectId } from "mongodb";
import { nextNumber } from "./counters";
import { REPAIR_COLLECTION } from "./repairs";

export type VoucherKind = "CUSTOMER_RECEIVE" | "WALKING_RECEIVE" | "SUPPLIER_PAY" | "PARTY_PAY" | "RECEIVE" | "PAY" | "OWNER_PAY" | "OLD_BALANCE_CUSTOMER" | "OLD_BALANCE_SUPPLIER";

export async function createVoucher(d: Db, v: { kind: VoucherKind; partyType: string; partyId?: string; partyName: string; phone?: string; amount: number; account?: string; note?: string; prevBalance?: number | null; newBalance?: number | null; user: string; createdAt?: Date }, session?: ClientSession) {
  const voucherNo = await nextNumber(d, "voucher", session);
  const doc = { voucherNo, ...v, account: v.account || "", note: v.note || "", prevBalance: v.prevBalance ?? null, newBalance: v.newBalance ?? null, createdAt: v.createdAt || new Date() };
  const r = await d.collection("vouchers").insertOne(doc, session ? { session } : undefined);
  return { ...doc, _id: r.insertedId.toString() };
}

// What a saved customer owes right now: unpaid sales + unpaid repairs.
export async function customerBalance(d: Db, customerId: string, session?: ClientSession) {
  const o = session ? { session } : undefined;
  // customerId kahin string aur kahin ObjectId ke tor par save ho sakta hai; dono match karein (Customers page jaisa hisab).
  const ids: any[] = [customerId];
  try { if (ObjectId.isValid(customerId)) ids.push(new ObjectId(customerId)); } catch {}
  const sales = await d.collection("sales").find({ customerId: { $in: ids }, status: { $ne: "cancelled" } }, o).toArray();
  const reps = await d.collection(REPAIR_COLLECTION).find({ recordType: "REPAIR", deletedAt: null, customerId: { $in: ids } }, o).toArray();
  // Local purchase: customer se maal liya, jo paisa humein dena baqi hai wo minus (-) mein jata hai.
  const local = await d.collection("purchases").find({ kind: "LOCAL", customerId: { $in: ids }, remaining: { $gt: 0 } }, o).toArray();
  return sales.reduce((a, x) => a + Number(x.remaining || 0), 0) + reps.reduce((a, x) => a + Number(x.remaining || 0), 0) - local.reduce((a, x) => a + Number(x.remaining || 0), 0);
}

export async function walkingBalance(d: Db, walkingId: string, session?: ClientSession) {
  const o = session ? { session } : undefined;
  const sales = await d.collection("sales").find({ walkingId, status: { $ne: "cancelled" }, remaining: { $gt: 0 } }, o).toArray();
  const reps = await d.collection(REPAIR_COLLECTION).find({ recordType: "REPAIR", deletedAt: null, walkingId, remaining: { $gt: 0 } }, o).toArray();
  return sales.reduce((a, x) => a + Number(x.remaining || 0), 0) + reps.reduce((a, x) => a + Number(x.remaining || 0), 0);
}

// Every unlinked (walking) repair that still owes money gets a walking-customer id (matched by phone, else by name).
export async function backfillWalking(d: Db, user = "system") {
  const reps = d.collection(REPAIR_COLLECTION), wc = d.collection("walkingCustomers");
  const pending = await reps.find({ recordType: "REPAIR", deletedAt: null, customerId: null, remaining: { $gt: 0 }, walkingId: { $in: [null, undefined, ""] } }).toArray();
  for (const r of pending) {
    const phone = String(r.customerPhone || "").replace(/\s+/g, ""), name = String(r.customerName || "Walking Customer").trim();
    let w = phone ? await wc.findOne({ phone }) : await wc.findOne({ name, phone: "" });
    if (!w) {
      const code = await nextNumber(d, "walking");
      const ins = await wc.insertOne({ code, name, phone, createdAt: new Date(), createdBy: user });
      w = { _id: ins.insertedId, code, name, phone } as any;
    }
    await reps.updateOne({ _id: r._id }, { $set: { walkingId: String(w!._id) } });
  }
}
