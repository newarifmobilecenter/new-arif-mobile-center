import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";

export const REPAIR_COLLECTION = "notebookEntries";
export const REPAIR_COUNTER_COLLECTION = "repairCounters";
export const REPAIR_REMINDER_COLLECTION = "repairReminders";

export const REPAIR_STATES = ["RECEIVED", "IN_REPAIR", "READY", "DELIVERED", "CANCELLED"] as const;
export const MOBILE_TYPES = ["Android", "iPhone", "Keypad", "Other"] as const;
export const REPAIR_ACCESSORIES = ["SIM", "Memory Card", "Simtray", "Battery", "Other"] as const;
export const REPAIR_PAYMENT_METHODS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "Bank", "Other"] as const;
export const REMINDER_TYPES = ["PAYMENT_DUE", "REPAIR_READY", "MOBILE_DELIVERY"] as const;

export class RepairValidationError extends Error {}

export async function ensureRepairIndexes() {
  const d = await db();
  const repairs = d.collection(REPAIR_COLLECTION);
  await Promise.all([
    repairs.createIndex(
      { tokenNo: 1 },
      {
        unique: true,
        name: "repair_token_unique",
        partialFilterExpression: { recordType: "REPAIR", tokenNo: { $type: "string" } },
      },
    ),
    repairs.createIndex({ recordType: 1, customerId: 1, receivedAt: -1 }, { name: "repair_customer_received" }),
    repairs.createIndex({ recordType: 1, customerPhone: 1 }, { name: "repair_phone" }),
    repairs.createIndex({ recordType: 1, imei: 1 }, { name: "repair_imei" }),
    repairs.createIndex({ recordType: 1, receivedAt: -1 }, { name: "repair_received_desc" }),
    repairs.createIndex({ recordType: 1, status: 1, paymentStatus: 1 }, { name: "repair_status_payment" }),
    repairs.createIndex({ recordType: 1, model: 1 }, { name: "repair_model" }),
    repairs.createIndex({ recordType: 1, deletedAt: 1 }, { name: "repair_deleted_at" }),
    d.collection(REPAIR_REMINDER_COLLECTION).createIndex({ repairId: 1, createdAt: -1 }, { name: "repair_reminders_history" }),
    d.collection(REPAIR_REMINDER_COLLECTION).createIndex({ customerId: 1, createdAt: -1 }, { name: "repair_reminders_customer" }),
  ]);
  return repairs;
}

function text(value: unknown, label: string, maxLength: number, required = false) {
  const result = String(value ?? "").trim();
  if (required && !result) throw new RepairValidationError(`${label} is required.`);
  if (result.length > maxLength) throw new RepairValidationError(`${label} must be ${maxLength} characters or fewer.`);
  return result;
}

export function amount(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || result > 1_000_000_000_000) {
    throw new RepairValidationError(`${label} must be a valid non-negative amount.`);
  }
  return Math.round((result + Number.EPSILON) * 100) / 100;
}

export function calculateRepairPayment(totalBillValue: unknown, paidValue: unknown) {
  const totalBill = amount(totalBillValue, "Total Bill");
  const paid = amount(paidValue, "Paid");
  if (paid > totalBill) throw new RepairValidationError("Paid cannot exceed Total Bill.");
  const remaining = Math.round((totalBill - paid + Number.EPSILON) * 100) / 100;
  return { totalBill, agreedRate: totalBill, paid, remaining, paymentStatus: remaining > 0 ? "PAYMENT_DUE" : "PAID" };
}

function validDate(value: unknown, label: string) {
  const parsed = new Date(String(value ?? ""));
  if (!value || Number.isNaN(parsed.getTime())) throw new RepairValidationError(`${label} must be a valid date and time.`);
  return parsed;
}

export function normalizeRepairInput(input: any, options: { creating?: boolean; allowUnlinked?: boolean; legacyBackup?: boolean } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RepairValidationError("Invalid repair record.");
  const customerIdValue = String(input.customerId ?? "").trim();
  if (customerIdValue && !ObjectId.isValid(customerIdValue)) throw new RepairValidationError("Select an existing customer.");
  if (!customerIdValue && !options.allowUnlinked) throw new RepairValidationError("Select an existing customer.");
  const customerId = customerIdValue || null;

  const mobileType = String(input.mobileType || "Android").trim();
  if (!(MOBILE_TYPES as readonly string[]).includes(mobileType)) throw new RepairValidationError("Select a valid mobile type.");
  const accessories: string[] = Array.isArray(input.accessories) ? Array.from(new Set<string>((input.accessories as unknown[]).map((item) => String(item)))) : [];
  if (accessories.some((item: string) => !(REPAIR_ACCESSORIES as readonly string[]).includes(item))) {
    throw new RepairValidationError("Select valid received accessories.");
  }
  const paymentMethod = String(input.paymentMethod || "Cash").trim();
  if (!(REPAIR_PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
    throw new RepairValidationError("Select a valid payment method.");
  }

  const receivedAt = options.creating ? new Date() : validDate(input.receivedAt || (options.legacyBackup ? input.createdAt : null), "Received time");
  let expectedReadyAt = input.expectedReadyAt
    ? validDate(input.expectedReadyAt, "Expected ready time")
    : options.legacyBackup && Number.isFinite(Number(input.expectedHours))
      ? new Date(receivedAt.getTime() + Number(input.expectedHours) * 60 * 60 * 1000)
      : new Date(receivedAt.getTime() + 3 * 60 * 60 * 1000);
  if (options.creating && expectedReadyAt < receivedAt && receivedAt.getTime() - expectedReadyAt.getTime() <= 5 * 60 * 1000) {
    expectedReadyAt = new Date(receivedAt.getTime() + 3 * 60 * 60 * 1000);
  }
  if (expectedReadyAt < receivedAt) throw new RepairValidationError("Expected ready time cannot be before the received time.");

  const bill = calculateRepairPayment(input.totalBill ?? input.agreedRate ?? 0, input.paid ?? 0);
  const sourceStatus = String(input.status || "RECEIVED").toUpperCase();
  const status = options.creating ? "RECEIVED" : options.legacyBackup && sourceStatus === "PENDING" ? "RECEIVED" : sourceStatus;
  if (!(REPAIR_STATES as readonly string[]).includes(status)) throw new RepairValidationError("Select a valid repair status.");

  const reminderDateValue = String(input.paymentReminderDate || "").trim();
  let paymentReminderAt: Date | null = null;
  let storedReminderDate = "";
  if (input.paymentReminderAt) {
    const storedDate = new Date(input.paymentReminderAt);
    if (Number.isNaN(storedDate.getTime())) throw new RepairValidationError("Payment reminder date is invalid.");
    storedReminderDate = storedDate.toISOString().slice(0, 10);
  }
  const effectiveReminderDate = Object.prototype.hasOwnProperty.call(input, "paymentReminderDate")
    ? reminderDateValue
    : storedReminderDate || (options.creating && bill.remaining > 0 ? receivedAt.toISOString().slice(0, 10) : "");
  if (effectiveReminderDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveReminderDate)) throw new RepairValidationError("Payment reminder date is invalid.");
    paymentReminderAt = new Date(`${effectiveReminderDate}T00:00:00.000Z`);
    if (Number.isNaN(paymentReminderAt.getTime()) || paymentReminderAt.toISOString().slice(0, 10) !== effectiveReminderDate) {
      throw new RepairValidationError("Payment reminder date is invalid.");
    }
  }
  const deliveryMode = String(input.deliveryMode || "PICKUP").toUpperCase();
  if (!["PICKUP", "DELIVERY"].includes(deliveryMode)) throw new RepairValidationError("Select a valid delivery plan.");

  return {
    recordType: "REPAIR",
    customerId,
    customerName: text(input.customerName, "Customer name", 120, true),
    customerPhone: text(input.customerPhone, "Customer phone", 32),
    model: text(input.model, "Mobile model", 120, true),
    mobileType,
    fault: text(input.fault, "Fault / problem", 2000, true),
    condition: text(input.condition, "Condition", 1000),
    accessories,
    imei: text(input.imei, "IMEI", 40),
    devicePassword: text(input.devicePassword, "Password/security information", 160),
    ...bill,
    paymentMethod,
    status,
    paymentReminderAt,
    expectedReadyAt,
    receivedAt,
    shopkeeper: text(input.shopkeeper, "Shopkeeper", 120),
    shopPhone: text(input.shopPhone, "Shop phone", 40),
    shopAddress: text(input.shopAddress, "Shop address", 240),
    remarks: text(input.remarks, "Remarks", 1500),
    deliveryMode,
    delivery: input.delivery && typeof input.delivery === "object" ? input.delivery : null,
  };
}

export async function generateRepairToken() {
  const d = await db();
  const repairs = await ensureRepairIndexes();
  const counters = d.collection<{ _id: string; value: number }>(REPAIR_COUNTER_COLLECTION);
  const counterId = "mobile-repair-token";
  if (!(await counters.findOne({ _id: counterId }))) {
    const storedTokens = await repairs.find(
      { recordType: "REPAIR", tokenNo: { $regex: /^P\d+$/i } },
      { projection: { tokenNo: 1 } },
    ).toArray();
    const highestStored = storedTokens.reduce((highest, row) => {
      const parsed = Number(String(row.tokenNo).slice(1));
      return Number.isSafeInteger(parsed) ? Math.max(highest, parsed) : highest;
    }, 1007);
    try {
      await counters.updateOne({ _id: counterId }, { $max: { value: highestStored } }, { upsert: true });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }
  }
  const counter = await counters.findOneAndUpdate(
    { _id: counterId },
    { $inc: { value: 1 } },
    { returnDocument: "after" },
  );
  if (!counter || !Number.isSafeInteger(counter.value)) throw new Error("Repair token sequence could not be advanced.");
  return `P${counter.value}`;
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toRepairListItem(repair: any) {
  const { imei, devicePassword, ...safe } = repair;
  return { ...safe, _id: String(repair._id) };
}

export function getRepairShopkeepers() {
  const names = [String(process.env.ADMIN_USERNAME || "").trim()];
  try {
    const staff = JSON.parse(process.env.STAFF_USERS_JSON || "[]");
    if (Array.isArray(staff)) for (const user of staff) if (user?.username) names.push(String(user.username).trim());
  } catch {}
  return [...new Set(names.filter(Boolean))];
}
