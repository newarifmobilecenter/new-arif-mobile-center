import { randomBytes } from "node:crypto";
import { db } from "@/lib/mongodb";

export const NOTEBOOK_COLLECTION = "notebookEntries";
export const NOTEBOOK_PAYMENT_METHODS = ["Cash", "JazzCash", "Easypaisa", "Raast", "NayaPay", "Bank", "Other"] as const;

export class NotebookValidationError extends Error {}

export async function ensureNotebookIndexes() {
  const collection = (await db()).collection(NOTEBOOK_COLLECTION);
  await Promise.all([
    collection.createIndex({ entryNo: 1 }, { unique: true, name: "notebook_entry_no_unique" }),
    collection.createIndex({ date: -1 }, { name: "notebook_date_desc" }),
    collection.createIndex({ customerId: 1, date: -1 }, { name: "notebook_customer_date" }),
    collection.createIndex({ deletedAt: 1 }, { name: "notebook_deleted_at" }),
  ]);
  return collection;
}

export function generateEntryNo(date: string) {
  return `NB-${date.replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function requiredText(value: unknown, label: string, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text) throw new NotebookValidationError(`${label} is required.`);
  if (text.length > maxLength) throw new NotebookValidationError(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

function optionalText(value: unknown, label: string, maxLength: number) {
  const text = String(value ?? "").trim();
  if (text.length > maxLength) throw new NotebookValidationError(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

function validDate(value: unknown) {
  const date = String(value ?? "").trim();
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new NotebookValidationError("Enter a valid entry date.");
  }
  return date;
}

function money(value: unknown, label: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000_000) {
    throw new NotebookValidationError(`${label} must be a valid non-negative amount.`);
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function normalizeNotebookEntry(input: any, options: { preserveEntryNo?: boolean } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new NotebookValidationError("Invalid Notebook entry.");
  const date = validDate(input.date);
  const customerId = String(input.customerId ?? "").trim() || null;
  if (customerId && !/^[a-f\d]{24}$/i.test(customerId)) throw new NotebookValidationError("Select a valid customer.");

  const customerName = requiredText(input.customerName, "Customer", 120);
  const phone = optionalText(input.phone, "Phone", 32);
  const title = requiredText(input.title, "Title / Subject", 160);
  const description = optionalText(input.description, "Description / Notes", 5000);
  const remarks = optionalText(input.remarks, "Remarks", 1500);
  const amount = money(input.amount, "Amount");
  const paid = money(input.paid, "Paid");
  if (paid > amount) throw new NotebookValidationError("Paid cannot exceed Amount.");

  const paymentMethod = String(input.paymentMethod ?? "Cash").trim();
  if (!(NOTEBOOK_PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
    throw new NotebookValidationError("Select a valid payment method.");
  }
  const remaining = Math.round((amount - paid + Number.EPSILON) * 100) / 100;
  const status = paid === 0 && amount > 0 ? "UNPAID" : paid < amount ? "PARTIAL" : "PAID";
  const entryNo = options.preserveEntryNo ? String(input.entryNo ?? "").trim() : undefined;
  if (options.preserveEntryNo && !/^NB-\d{8}-[A-F\d]{8}$/i.test(entryNo || "")) {
    throw new NotebookValidationError("Backup contains an invalid Notebook entry number.");
  }

  return {
    ...(entryNo ? { entryNo } : {}), date, customerId, customerName, phone, title, description,
    amount, paid, remaining, paymentMethod, status, remarks,
  };
}