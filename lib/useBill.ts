"use client";
import { useEffect, useState } from "react";
import { cachedBill, loadBill, normalizeBill, type BillSettings } from "./billSettings";

/** Bill/slip/auto-rate settings: pehle mehfooz copy, phir server se taaza. */
export function useBill(): BillSettings {
  const [b, setB] = useState<BillSettings>(() => normalizeBill({}));
  useEffect(() => { setB(cachedBill()); loadBill().then(setB).catch(() => {}); }, []);
  return b;
}
