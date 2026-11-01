// Single source of truth for keyboard shortcuts (used by AuthNavigation and the Settings page).
export const ALT_ROUTES: { code: string; key: string; to: string; label: string }[] = [
  { code: "KeyG", key: "G", to: "/pos", label: "New Sale (POS)" },
  { code: "KeyR", key: "R", to: "/sales/returns", label: "Sale Return" },
  { code: "KeyP", key: "P", to: "/purchases", label: "Purchase" },
  { code: "KeyC", key: "C", to: "/customers", label: "Customers" },
  { code: "KeyV", key: "V", to: "/vouchers", label: "Vouchers" },
  { code: "KeyA", key: "A", to: "/repairs/new", label: "Repair Receiving Slip" },
  { code: "KeyD", key: "D", to: "/daily-summary", label: "Daily Summary" },
  { code: "KeyO", key: "O", to: "/orders", label: "Order Book" },
];
export const OTHER_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Enter", label: "Next field" },
  { keys: "↑ / ↓", label: "Same column, row above / below (tables)" },
  { keys: "Ctrl + S", label: "Save (in forms)" },
];
