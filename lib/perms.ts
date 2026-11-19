// Staff ke access ki list. Admin ko hamesha sab kuch milta hai. (Edge + server dono mein chalta hai: koi node import nahi.)
export type PermKey =
  | "sale" | "repair_add" | "repair_view" | "repair_manage" | "sale_history" | "sale_modify" | "sale_cancel" | "sale_return"
  | "customers" | "ledger" | "vouchers" | "purchases" | "purchase_modify" | "products" | "orders" | "reports" | "finance";

export const PERMS: { key: PermKey; label: string; hint: string; def: boolean }[] = [
  { key: "sale", label: "New Sale (bill banana)", hint: "POS, invoice print, naya customer/item sale ke andar", def: true },
  { key: "repair_add", label: "Naya Repair add karna", hint: "Mobile receive karke repair slip banana", def: true },
  { key: "repair_view", label: "Repairs / Notebook dekhna", hint: "Repair ki list aur tafseel", def: true },
  { key: "repair_manage", label: "Repair edit / status / return / delete", hint: "Repair mein tabdeeli", def: false },
  { key: "sale_history", label: "Purane Sales / Invoices ki list", hint: "Sales aur Invoices page", def: false },
  { key: "sale_modify", label: "Sale Modify", hint: "Bani hui bill badalna", def: false },
  { key: "sale_cancel", label: "Sale Cancel", hint: "Bill cancel karna", def: false },
  { key: "sale_return", label: "Sale Return", hint: "Customer wapsi", def: false },
  { key: "customers", label: "Customers page", hint: "Customer list / edit", def: false },
  { key: "ledger", label: "Customer Ledger", hint: "Hisaab ki statement", def: false },
  { key: "vouchers", label: "Vouchers / Wasooli", hint: "Payment lena / dena", def: false },
  { key: "purchases", label: "Purchase / Suppliers", hint: "Purchase, local purchase, suppliers", def: false },
  { key: "purchase_modify", label: "Purchase Modify / Return", hint: "Bani hui purchase badalna", def: false },
  { key: "products", label: "Products / Stock / Item edit", hint: "Product form, stock, cost", def: false },
  { key: "orders", label: "Order Book", hint: "Order lagana / dekhna", def: false },
  { key: "reports", label: "Reports / Daily Summary", hint: "Profit aur reports", def: false },
  { key: "finance", label: "Expenses / Accounts / Salaries", hint: "Kharcha aur bank", def: false },
];

export const DEFAULT_STAFF_PERMS: PermKey[] = PERMS.filter((p) => p.def).map((p) => p.key);
export const ALL_PERM_KEYS: PermKey[] = PERMS.map((p) => p.key);
export const cleanPerms = (v: unknown): PermKey[] => Array.isArray(v) ? ALL_PERM_KEYS.filter((k) => v.includes(k)) : DEFAULT_STAFF_PERMS;

type S = { r: "ADMIN" | "STAFF"; p?: string[] } | null;
export const can = (s: S, ...keys: PermKey[]) => !!s && (s.r === "ADMIN" || keys.some((k) => (s.p ?? DEFAULT_STAFF_PERMS).includes(k)));

// Page rules (lambi prefix pehle). "*" = sab ko ijazat, "admin" = sirf Admin.
const PAGE_RULES: [string, PermKey[] | "*" | "admin"][] = [
  ["/login", "*"], ["/settings", "admin"], ["/backup", "admin"], ["/admin", ["products"]], ["/tools", "admin"],
  ["/pos", ["sale"]], ["/quotations", ["sale"]], ["/walking-customers", ["sale", "customers"]], ["/invoice/", ["sale", "sale_history"]], ["/invoices", ["sale_history"]],
  ["/sales/returns", ["sale_return"]], ["/sales", ["sale_history"]],
  ["/repairs/new", ["repair_add"]], ["/notebook/new", ["repair_add"]], ["/repairs", ["repair_view", "repair_add", "repair_manage"]], ["/notebook", ["repair_view", "repair_add", "repair_manage"]],
  ["/customers", ["customers"]], ["/ledger", ["ledger"]], ["/vouchers", ["vouchers"]], ["/reminders", ["repair_view", "customers"]],
  ["/purchases", ["purchases"]], ["/local-purchase", ["purchases"]], ["/suppliers", ["purchases"]],
  ["/stock", ["products"]], ["/product-cost", ["products"]], ["/orders", ["orders"]],
  ["/reports", ["reports"]], ["/daily-summary", ["reports"]], ["/expenses", ["finance"]], ["/accounts", ["finance"]], ["/salaries", ["finance"]],
];
export function pageAllowed(s: S, path: string): boolean {
  if (!s) return false; if (s.r === "ADMIN" || path === "/") return true;
  const rule = PAGE_RULES.find(([p]) => path === p || path.startsWith(p.endsWith("/") ? p : p + "/"));
  if (!rule) return false;
  return rule[1] === "*" ? true : rule[1] === "admin" ? false : can(s, ...rule[1]);
}

// API rules: [prefix, method ("*" = sab), perms]
const API_RULES: [string, string, PermKey[] | "*" | "admin"][] = [
  ["/api/auth/", "*", "*"], ["/api/health", "*", "*"], ["/api/data", "*", "*"], ["/api/search", "*", "*"], ["/api/counters", "*", "*"], ["/api/account", "*", "*"],
  ["/api/users", "*", "admin"], ["/api/backup", "*", "admin"], ["/api/categories", "*", "admin"],
  ["/api/sales/create", "*", ["sale"]], ["/api/sales/modify", "*", ["sale_modify"]], ["/api/sales/cancel", "*", ["sale_cancel"]],
  ["/api/sales/return", "*", ["sale_return"]], ["/api/sales/return-customer", "*", ["sale_return"]],
  ["/api/repairs/payment", "POST", ["repair_add", "repair_manage"]], ["/api/repairs/return", "*", ["repair_manage"]], ["/api/repairs/restore", "*", ["repair_manage"]], ["/api/repairs/meta", "*", "*"],
  ["/api/repairs", "GET", ["repair_view", "repair_add", "repair_manage", "sale"]], ["/api/repairs", "POST", ["repair_add"]], ["/api/repairs", "*", ["repair_manage"]],
  ["/api/notebook", "GET", ["repair_view", "repair_add", "repair_manage"]], ["/api/notebook", "POST", ["repair_add"]], ["/api/notebook", "*", ["repair_manage"]],
  ["/api/purchases/update", "*", ["purchase_modify"]], ["/api/purchases/return", "*", ["purchase_modify"]], ["/api/purchases", "*", ["purchases"]],
  ["/api/customers/payment", "*", ["vouchers"]], ["/api/customers", "*", ["customers", "ledger", "vouchers", "sale", "repair_view"]],
  ["/api/accounts", "*", ["finance", "vouchers"]], ["/api/finance", "*", ["finance", "vouchers"]],
  ["/api/orders", "POST", ["orders", "products", "repair_add"]], ["/api/orders", "*", ["orders", "products"]], ["/api/stock", "*", ["products"]],
  ["/api/walking", "*", ["sale", "customers"]], ["/api/reservations", "*", ["sale"]], ["/api/reminders", "*", ["repair_view", "customers", "repair_manage"]],
];
export function apiAllowed(s: S, path: string, method: string): boolean {
  if (!s) return false; if (s.r === "ADMIN") return true;
  const rule = API_RULES.find(([p, m]) => (path === p || path.startsWith(p.endsWith("/") ? p : p + "/")) && (m === "*" || m === method.toUpperCase()));
  if (!rule) return false;
  return rule[2] === "*" ? true : rule[2] === "admin" ? false : can(s, ...rule[2]);
}
