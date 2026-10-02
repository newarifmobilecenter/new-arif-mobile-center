"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function RepairReminderSummary() {
  const [counts, setCounts] = useState({ paymentDue: 0, repairReady: 0, mobileDelivery: 0 });
  useEffect(() => {
    fetch("/api/reminders").then((response) => response.json()).then((data) => {
      if (data.counts) setCounts(data.counts);
    }).catch(() => {});
  }, []);
  const total = counts.paymentDue + counts.repairReady + counts.mobileDelivery;
  return <Link href="/reminders" className="card">
    <h3>Repair Reminder Inbox</h3>
    <p className="muted">{total} pending · {counts.paymentDue} payment due · {counts.repairReady} ready · {counts.mobileDelivery} delivery</p>
    <span className="go">Open →</span>
  </Link>;
}
