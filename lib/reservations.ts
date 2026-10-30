import { db } from "@/lib/mongodb";
import { REPAIR_COLLECTION } from "@/lib/repairs";

// Parts that are promised to a repair (stock is NOT reduced until the repair is billed in New Sale).
//  SOFT = repair received / in repair  -> warning, sale still possible
//  HARD = repair READY or DELIVERED (not billed yet) -> part is fitted, cannot be sold
export type Hold = { repairId: string; token: string; model: string; customerName: string; qty: number; state: "SOFT" | "HARD"; name: string };

export async function getHolds(excludeRepairId = ""): Promise<Record<string, Hold[]>> {
  const d = await db();
  const rows = await d.collection(REPAIR_COLLECTION)
    .find({ recordType: "REPAIR", deletedAt: null, status: { $in: ["RECEIVED", "IN_REPAIR", "READY", "DELIVERED"] }, billedSaleId: { $in: [null] }, "parts.0": { $exists: true } })
    .project({ tokenNo: 1, model: 1, customerName: 1, status: 1, parts: 1 })
    .toArray();
  const out: Record<string, Hold[]> = {};
  for (const r of rows) {
    const id = String(r._id);
    if (excludeRepairId && id === excludeRepairId) continue;
    const state: "SOFT" | "HARD" = r.status === "READY" || r.status === "DELIVERED" ? "HARD" : "SOFT";
    for (const p of r.parts || []) {
      const pid = String(p.productId || "");
      if (!pid) continue;
      (out[pid] ||= []).push({ repairId: id, token: String(r.tokenNo || ""), model: String(r.model || ""), customerName: String(r.customerName || ""), qty: Number(p.qty || 1), state, name: String(p.name || "") });
    }
  }
  return out;
}

export const holdText = (h: Hold) => `${h.token} (${h.customerName || h.model})`;
