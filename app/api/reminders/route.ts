import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureRepairIndexes } from "@/lib/repairs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const windowType = String(request.nextUrl.searchParams.get("window") || "TODAY").toUpperCase();
    const customDate = String(request.nextUrl.searchParams.get("date") || "");
    if (!["TODAY", "TOMORROW", "THREE_DAYS", "ONE_WEEK", "CUSTOM"].includes(windowType)) {
      return NextResponse.json({ error: "Invalid reminder window." }, { status: 400 });
    }
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(today);
    const end = new Date(today);
    if (windowType === "TOMORROW") { start.setUTCDate(start.getUTCDate() + 1); end.setTime(start.getTime()); }
    if (windowType === "THREE_DAYS") end.setUTCDate(end.getUTCDate() + 2);
    if (windowType === "ONE_WEEK") end.setUTCDate(end.getUTCDate() + 6);
    if (windowType === "CUSTOM") {
      const parsed = new Date(`${customDate}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(customDate) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== customDate) {
        return NextResponse.json({ error: "Enter a valid custom reminder date." }, { status: 400 });
      }
      start.setTime(parsed.getTime()); end.setTime(parsed.getTime());
    }
    end.setUTCHours(23, 59, 59, 999);
    const repairs = await (await ensureRepairIndexes()).find({
      recordType: "REPAIR",
      deletedAt: null,
      status: { $ne: "CANCELLED" },
    }).project({ tokenNo: 1, customerId: 1, customerName: 1, customerPhone: 1, model: 1, status: 1, remaining: 1, paymentReminderAt: 1, deliveryMode: 1, expectedReadyAt: 1 }).sort({ receivedAt: -1 }).limit(1000).toArray();

    const groups = {
      paymentDue: repairs.filter((repair) => {
        if (Number(repair.remaining || 0) <= 0) return false;
        const due = new Date(repair.paymentReminderAt || repair.receivedAt);
        return !Number.isNaN(due.getTime()) && due >= start && due <= end;
      }),
      repairReady: repairs.filter((repair) => repair.status === "READY"),
      mobileDelivery: repairs.filter((repair) => repair.status === "READY" && repair.deliveryMode === "DELIVERY"),
    };
    const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100).toLowerCase();
    const matches = (row: any) => !q || `${row.tokenNo} ${row.customerName} ${row.customerPhone} ${row.model}`.toLowerCase().includes(q);
    const present = (rows: any[]) => rows.filter(matches).map((row) => ({ ...row, _id: row._id.toString() }));
    return NextResponse.json({
      paymentDue: present(groups.paymentDue),
      repairReady: present(groups.repairReady),
      mobileDelivery: present(groups.mobileDelivery),
      counts: { paymentDue: groups.paymentDue.length, repairReady: groups.repairReady.length, mobileDelivery: groups.mobileDelivery.length },
      window: windowType,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Reminder inbox could not be loaded." }, { status: 500 });
  }
}
