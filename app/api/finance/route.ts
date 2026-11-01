import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db, client } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";
import { nextNumber } from "@/lib/counters";
import { createVoucher, customerBalance, walkingBalance } from "@/lib/vouchers";
import { REPAIR_COLLECTION } from "@/lib/repairs";

const ACCOUNTS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "UBL", "Bank", "Other Bank", "Other"];
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : NaN; };
const txt = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Date chosen on the form -> a timestamp. Today keeps the current time; other days use noon Pakistan time.
function stamp(date: unknown) {
  const d = txt(date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date();
  const pk = new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
  return d === pk ? new Date() : new Date(`${d}T12:00:00+05:00`);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return fail("Login required.", 401);
  try {
    const b = await req.json();
    const kind = txt(b.kind, 30);
    const d = await db();
    const account = ACCOUNTS.includes(txt(b.account)) ? txt(b.account) : "Cash";
    const at = stamp(b.date);

    if (kind === "expense") {
      const amount = num(b.amount), title = txt(b.title), category = txt(b.category, 60) || "Other";
      if (!(amount > 0)) return fail("Kharche ki amount likhein.");
      if (!title) return fail("Kharche ki detail (kis cheez ka) likhein.");
      const expenseNo = await nextNumber(d, "expense");
      const doc = { expenseNo, title, category, amount, account, party: txt(b.party, 100), ref: txt(b.ref, 60), note: txt(b.note, 300), createdAt: at, updatedAt: new Date(), createdBy: user.u };
      const s = client.startSession();
      try {
        await s.withTransaction(async () => {
          await d.collection("expenses").insertOne({ ...doc }, { session: s });
          await d.collection("transactions").insertOne({ type: "OUT", account, amount, party: doc.party || category, ref: expenseNo, note: `Expense: ${title}`, voucherType: "EXPENSE", user: user.u, createdAt: at }, { session: s });
        });
      } finally { await s.endSession(); }
      return NextResponse.json({ ok: true, expenseNo });
    }

    if (kind === "salary" || kind === "salaryPay") {
      if (!hasRole(user, "ADMIN")) return fail("Salary sirf admin save kar sakta hai.", 403);
      if (kind === "salary") {
        const employee = txt(b.employee, 100), month = txt(b.month, 7);
        const base = num(b.baseSalary), bonus = num(b.bonus || 0), deduction = num(b.deduction || 0), advance = num(b.advance || 0), paid = num(b.paid || 0);
        if (!employee) return fail("Employee ka naam likhein.");
        if (!/^\d{4}-\d{2}$/.test(month)) return fail("Month sahi select karein.");
        if (![base, bonus, deduction, advance, paid].every(Number.isFinite) || [base, bonus, deduction, advance, paid].some((x) => x < 0)) return fail("Amounts sahi likhein.");
        const net = Math.max(0, base + bonus - deduction - advance);
        if (!(net > 0)) return fail("Net salary zero hai.");
        if (paid > net + 0.0001) return fail(`Ada ki gayi raqam net salary (Rs. ${net}) se zyada nahi ho sakti.`);
        const salaryNo = await nextNumber(d, "salary");
        const remaining = Math.round((net - paid) * 100) / 100;
        const doc = { salaryNo, employee, month, baseSalary: base, bonus, deduction, advance, net, paid, remaining, amount: paid, account, note: txt(b.note, 300), status: remaining <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid", createdAt: at, updatedAt: new Date(), createdBy: user.u };
        const s = client.startSession();
        try {
          await s.withTransaction(async () => {
            await d.collection("salaries").insertOne({ ...doc }, { session: s });
            if (paid > 0) await d.collection("transactions").insertOne({ type: "OUT", account, amount: paid, party: employee, ref: salaryNo, note: `Salary ${employee} ${month}`, voucherType: "SALARY", user: user.u, createdAt: at }, { session: s });
          });
        } finally { await s.endSession(); }
        return NextResponse.json({ ok: true, salaryNo, net, remaining });
      }
      const id = txt(b.id, 40), amount = num(b.amount);
      if (!ObjectId.isValid(id) || !(amount > 0)) return fail("Salary aur amount sahi likhein.");
      const s = client.startSession();
      try {
        await s.withTransaction(async () => {
          const row = await d.collection("salaries").findOne({ _id: new ObjectId(id) }, { session: s });
          if (!row) throw new Error("Salary record nahi mila.");
          const due = Number(row.remaining || 0);
          if (amount > due + 0.0001) throw new Error(`Is salary ka baqi Rs. ${due} hai.`);
          const paid = Number(row.paid || 0) + amount, remaining = Math.round((due - amount) * 100) / 100;
          const hist = [...(Array.isArray(row.history) ? row.history : []), { amount, account, at, user: user.u }];
          await d.collection("salaries").updateOne({ _id: row._id }, { $set: { paid, amount: paid, remaining, status: remaining <= 0 ? "paid" : "partial", history: hist, updatedAt: new Date() } }, { session: s });
          await d.collection("transactions").insertOne({ type: "OUT", account, amount, party: row.employee, ref: row.salaryNo || "", note: `Salary ${row.employee} ${row.month}`, voucherType: "SALARY", user: user.u, createdAt: at }, { session: s });
        });
      } catch (e: any) { return fail(e?.message || "Salary save nahi hui."); } finally { await s.endSession(); }
      return NextResponse.json({ ok: true });
    }

    if (kind === "oldBalance") {
      const partyType = txt(b.partyType, 10) === "supplier" ? "supplier" : "customer";
      const amount = num(b.amount);
      if (!(amount > 0)) return fail("Purane baqi ki amount likhein.");
      const invoiceNo = await nextNumber(d, "oldBalance");
      const base = { kind: "OLD_BALANCE", isOpening: true, invoiceNo, items: [], subtotal: amount, total: amount, paid: 0, remaining: amount, status: "credit", note: txt(b.note, 300) || "Purana baqi", createdAt: at, updatedAt: new Date(), createdBy: user.u };
      if (partyType === "customer") {
        let customerId = txt(b.id, 40), name = "";
        if (customerId) {
          if (!ObjectId.isValid(customerId)) return fail("Customer sahi select karein.");
          const c = await d.collection("customers").findOne({ _id: new ObjectId(customerId) });
          if (!c) return fail("Customer nahi mila.", 404);
          name = String(c.name || "");
        } else {
          name = txt(b.name, 100);
          if (!name) return fail("Customer select karein ya naya naam likhein.");
          const r = await d.collection("customers").insertOne({ name, phone: txt(b.phone, 30), phoneNo: txt(b.phone, 30), mobile: txt(b.phone, 30), createdAt: new Date(), updatedAt: new Date() });
          customerId = r.insertedId.toString();
        }
        const prev = await customerBalance(d, customerId);
        await d.collection("sales").insertOne({ ...base, customerId, cashRef: name });
        const voucher = await createVoucher(d, { kind: "OLD_BALANCE_CUSTOMER", partyType: "customer", partyId: customerId, partyName: name, phone: txt(b.phone, 30), amount, note: base.note, prevBalance: prev, newBalance: prev + amount, user: user.u, createdAt: at });
        return NextResponse.json({ ok: true, invoiceNo, customerId, name, voucher });
      }
      const supplierId = txt(b.id, 40);
      if (!ObjectId.isValid(supplierId)) return fail("Supplier select karein.");
      const sp = await d.collection("suppliers").findOne({ _id: new ObjectId(supplierId) });
      if (!sp) return fail("Supplier nahi mila.", 404);
      const prevRows = await d.collection("purchases").find({ supplierId, remaining: { $gt: 0 } }).toArray();
      const prev = prevRows.reduce((a: number, x: any) => a + Number(x.remaining || 0), 0);
      await d.collection("purchases").insertOne({ ...base, supplierId, supplierName: String(sp.name || "") });
      const voucher = await createVoucher(d, { kind: "OLD_BALANCE_SUPPLIER", partyType: "supplier", partyId: supplierId, partyName: String(sp.name || ""), phone: String(sp.phone || ""), amount, note: base.note, prevBalance: prev, newBalance: prev + amount, user: user.u, createdAt: at });
      return NextResponse.json({ ok: true, invoiceNo, name: sp.name, voucher });
    }

    if (kind === "supplierPayment") {
      const byCustomer = !!txt(b.customerId, 40);
      const supplierId = txt(byCustomer ? b.customerId : b.supplierId, 40), amount = num(b.amount);
      if (!ObjectId.isValid(supplierId) || !(amount > 0)) return fail("Party aur amount sahi likhein.");
      const sp = await d.collection(byCustomer ? "customers" : "suppliers").findOne({ _id: new ObjectId(supplierId) });
      if (!sp) return fail("Supplier nahi mila.", 404);
      let applied = 0, left = amount, prev = 0; let voucher: any = null;
      const s = client.startSession();
      try {
        await s.withTransaction(async () => {
          applied = 0; left = amount;
          const rows = await d.collection("purchases").find(byCustomer ? { kind: "LOCAL", customerId: supplierId, remaining: { $gt: 0 } } : { supplierId, remaining: { $gt: 0 } }, { session: s }).sort({ createdAt: 1 }).toArray();
          prev = rows.reduce((a: number, x: any) => a + Number(x.remaining || 0), 0);
          for (const p of rows) {
            if (left <= 0) break;
            const due = Number(p.remaining || 0), use = Math.min(due, left);
            const r = await d.collection("purchases").updateOne({ _id: p._id, remaining: { $gte: use } }, { $inc: { paid: use }, $set: { remaining: Math.round((due - use) * 100) / 100, status: due - use > 0 ? "credit" : "paid", updatedAt: new Date() } }, { session: s });
            if (r.modifiedCount !== 1) throw new Error("Payment conflict, dobara try karein.");
            applied += use; left -= use;
          }
          if (applied <= 0) throw new Error("Is supplier ka koi baqi nahi hai.");
          voucher = await createVoucher(d, { kind: byCustomer ? "PARTY_PAY" : "SUPPLIER_PAY", partyType: byCustomer ? "customer" : "supplier", partyId: supplierId, partyName: String(sp.name || ""), phone: String(sp.phone || sp.phoneNo || ""), amount: applied, account, note: txt(b.ref, 60), prevBalance: prev, newBalance: prev - applied, user: user.u, createdAt: at }, s);
          await d.collection("transactions").insertOne({ type: "OUT", account, amount: applied, ...(byCustomer ? { customerId: supplierId } : { supplierId }), party: sp.name || "", ref: txt(b.ref, 60) || null, note: byCustomer ? "Local purchase payment" : "Supplier payment", voucherType: "PAY", user: user.u, createdAt: at }, { session: s });
        });
      } catch (e: any) { return fail(e?.message || "Payment save nahi hui."); } finally { await s.endSession(); }
      return NextResponse.json({ ok: true, applied, unapplied: left, voucher });
    }

    if (kind === "walkingPayment") {
      const walkingId = txt(b.walkingId, 40), amount = num(b.amount);
      if (!ObjectId.isValid(walkingId) || !(amount > 0)) return fail("Walking customer aur amount sahi likhein.");
      const w = await d.collection("walkingCustomers").findOne({ _id: new ObjectId(walkingId) });
      if (!w) return fail("Walking customer nahi mila.", 404);
      let applied = 0, left = amount, prev = 0; let voucher: any = null;
      const s = client.startSession();
      try {
        await s.withTransaction(async () => {
          applied = 0; left = amount;
          prev = await walkingBalance(d, walkingId, s);
          if (amount > prev + 0.0001) throw new Error(`Is walking customer ka baqi sirf Rs. ${prev} hai.`);
          const sales = await d.collection("sales").find({ walkingId, status: { $ne: "cancelled" }, remaining: { $gt: 0 } }, { session: s }).sort({ createdAt: 1 }).toArray();
          for (const sale of sales) {
            if (left <= 0) break;
            const due = Number(sale.remaining || 0), use = Math.min(due, left);
            const r = await d.collection("sales").updateOne({ _id: sale._id, remaining: { $gte: use } }, { $inc: { paid: use }, $set: { remaining: Math.round((due - use) * 100) / 100, status: due - use > 0 ? "credit" : "paid", updatedAt: new Date() } }, { session: s });
            if (r.modifiedCount !== 1) throw new Error("Payment conflict, dobara try karein.");
            applied += use; left -= use;
          }
          const reps = await d.collection(REPAIR_COLLECTION).find({ recordType: "REPAIR", deletedAt: null, walkingId, remaining: { $gt: 0 } }, { session: s }).sort({ receivedAt: 1, createdAt: 1 }).toArray();
          for (const rp of reps) {
            if (left <= 0) break;
            const due = Number(rp.remaining || 0), use = Math.min(due, left), remaining = Math.round((due - use) * 100) / 100;
            const hist = [...(rp.paymentHistory || []), { amount: use, paymentMethod: account === "Bank" ? "Bank" : account, type: "CUSTOMER_PAYMENT", reference: txt(b.ref, 60) || null, at: new Date(), user: user.u }];
            const r = await d.collection(REPAIR_COLLECTION).updateOne({ _id: rp._id, remaining: { $gte: use } }, { $inc: { paid: use }, $set: { remaining, paymentStatus: remaining > 0 ? "PAYMENT_DUE" : "PAID", paymentHistory: hist, updatedAt: new Date(), updatedBy: user.u } }, { session: s });
            if (r.modifiedCount !== 1) throw new Error("Payment conflict, dobara try karein.");
            applied += use; left -= use;
          }
          if (applied <= 0) throw new Error("Is walking customer ka koi baqi nahi hai.");
          voucher = await createVoucher(d, { kind: "WALKING_RECEIVE", partyType: "walking", partyId: walkingId, partyName: String(w.name || ""), phone: String(w.phone || ""), amount: applied, account, note: txt(b.ref, 60), prevBalance: prev, newBalance: prev - applied, user: user.u, createdAt: at }, s);
          await d.collection("transactions").insertOne({ type: "IN", account, amount: applied, walkingId, party: String(w.name || ""), ref: voucher.voucherNo, note: "Walking customer payment", voucherType: "WALKING_RECEIVE", user: user.u, createdAt: at }, { session: s });
        });
      } catch (e: any) { return fail(e?.message || "Payment save nahi hui."); } finally { await s.endSession(); }
      return NextResponse.json({ ok: true, applied, voucher });
    }

    if (kind === "general") {
      const type = txt(b.type, 3) === "OUT" ? "OUT" : "IN", amount = num(b.amount), party = txt(b.party, 100);
      if (!(amount > 0)) return fail("Amount likhein.");
      if (!party) return fail("Party ka naam likhein.");
      const s = client.startSession(); let voucher: any = null;
      try {
        await s.withTransaction(async () => {
          voucher = await createVoucher(d, { kind: type === "IN" ? "RECEIVE" : "PAY", partyType: "other", partyName: party, amount, account, note: txt(b.note, 300), user: user.u, createdAt: at }, s);
          await d.collection("transactions").insertOne({ type, account, amount, party, ref: voucher.voucherNo, note: txt(b.note, 300), voucherType: type === "IN" ? "RECEIVE" : "PAY", user: user.u, createdAt: at }, { session: s });
        });
      } finally { await s.endSession(); }
      return NextResponse.json({ ok: true, voucher });
    }

    return fail("Unknown request.");
  } catch (e: any) {
    return fail(e?.message || "Save nahi hua.", 500);
  }
}
