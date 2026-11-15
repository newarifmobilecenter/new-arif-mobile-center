// Shared profit maths for Daily Summary and Reports.
export type CostMap = Map<string, number>;
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export function costMapOf(products: any[]): CostMap {
  return new Map(products.map((p) => [String(p._id), n(p.costPrice)]));
}

// Cost saved on the sale item wins; if it was 0/missing (old sales, cost set later) use the product's current cost.
export function unitCost(item: any, costs: CostMap): number {
  const snap = n(item?.costPrice);
  if (snap > 0) return snap;
  return n(costs.get(String(item?.productId || "")));
}

export type SaleLine = { name: string; category: string; qty: number; revenue: number; cost: number; profit: number; productId: string; item: any };

// Splits the bill's real net (after bill discount, before sales tax) over its lines so lines add up to the invoice.
export function saleLines(sale: any, costs: CostMap, catOf: (item: any) => string): SaleLine[] {
  const items: any[] = Array.isArray(sale?.items) ? sale.items : [];
  const raw = items.map((i) => n(i.total ?? n(i.qty) * n(i.price)));
  const normalSum = items.reduce((t, i, k) => t + (i.repairBill !== undefined ? 0 : raw[k]), 0);
  const repairSum = items.reduce((t, i, k) => t + (i.repairBill !== undefined ? raw[k] : 0), 0);
  const net = n(sale?.total) - n(sale?.salesTaxValue);
  const f = normalSum > 0 ? Math.max(0, net - repairSum) / normalSum : 1;
  return items.flatMap((i, k) => {
    // Repair line jis mein parts ke rate likhe hain: har part alag (apni category/cost), baqi "Repair Fee".
    const pp: any[] = Array.isArray(i.parts) ? i.parts.filter((x: any) => n(x.price) > 0) : [];
    if (i.repairBill !== undefined && n(i.repairBill) > 0 && pp.length) {
      const partLines = pp.map((x: any) => {
        const revenue = n(x.price) * Math.max(1, n(x.qty)); const cost = n(x.cost) * Math.max(1, n(x.qty));
        return { name: String(x.name || "Part"), category: catOf({ productId: x.productId, name: x.name }), qty: Math.max(1, n(x.qty)), revenue, cost, profit: revenue - cost, productId: String(x.productId || ""), item: i };
      });
      const fee = Math.max(0, n(i.repairBill) - partLines.reduce((a, l) => a + l.revenue, 0));
      return [...partLines, { name: `Repair Fee · ${String(i.name || "")}`, category: "Repair", qty: 1, revenue: fee, cost: 0, profit: fee, productId: "", item: i }];
    }
    const isRepair = i.repairBill !== undefined && n(i.repairBill) > 0;
    const revenue = isRepair ? n(i.repairBill) : raw[k] * f;
    const cost = isRepair ? n(i.costPrice) : unitCost(i, costs) * n(i.qty);
    return [{ name: String(i.name || "Item"), category: catOf(i), qty: n(i.qty), revenue, cost, profit: revenue - cost, productId: String(i.productId || ""), item: i }];
  });
}

// Profit lost on a sale return: refunded sale value minus the cost of the goods that came back.
export function returnProfitLoss(ret: any, costs: CostMap): number {
  return n(ret?.amount) - unitCostById(ret?.productId, costs) * n(ret?.qty);
}
const unitCostById = (id: unknown, costs: CostMap) => n(costs.get(String(id || "")));
