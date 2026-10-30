import type { ClientSession, Db } from "mongodb";
import { nameCovers } from "@/lib/orderBook";

export const ORDER_COLLECTION = "orderBook";

/** Called after a purchase: every open order the bought products cover is marked RECEIVED (removed from the Order Book). */
export async function clearOrdersForPurchase(d: Db, bought: { productId: string; name: string }[], invoiceNo: string, session?: ClientSession) {
  const col = d.collection(ORDER_COLLECTION);
  const open = await col.find({ status: { $in: ["OPEN", "ORDERED"] } }, { session }).toArray();
  for (const o of open) {
    const hit = bought.some((b) => (o.productId && String(o.productId) === b.productId) || (!o.productId && nameCovers(b.name, String(o.name || ""))));
    if (hit) await col.updateOne({ _id: o._id }, { $set: { status: "RECEIVED", receivedAt: new Date(), receivedInvoice: invoiceNo, updatedAt: new Date() } }, { session });
  }
}
