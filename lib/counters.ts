import type { ClientSession, Db } from "mongodb";

export const NUMBER_KINDS = {
  sale: "S",
  purchase: "P",
  saleReturn: "R",
  purchaseReturn: "PR",
} as const;
export type NumberKind = keyof typeof NUMBER_KINDS;

export const formatNumber = (kind: NumberKind, seq: number) => `${NUMBER_KINDS[kind]}${String(seq).padStart(3, "0")}`;

// Sequential document numbers: S001, P001, R001 ...
export async function nextNumber(d: Db, kind: NumberKind, session?: ClientSession) {
  const row: any = await d.collection("docCounters").findOneAndUpdate(
    { _id: kind as any },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", ...(session ? { session } : {}) }
  );
  const doc = row && "value" in row ? row.value : row;
  return formatNumber(kind, Number(doc?.seq || 1));
}

// The number the next document will get (does not reserve it).
export async function peekNumber(d: Db, kind: NumberKind) {
  const doc: any = await d.collection("docCounters").findOne({ _id: kind as any });
  return formatNumber(kind, Number(doc?.seq || 0) + 1);
}
