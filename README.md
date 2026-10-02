# New Arif Mobile Center — POS foundation

This version adds MongoDB-backed collections, POS sales, cash-sale reference, saved customers, pickup-by, products/stock foundation, accounts, purchases/report sections, category-first Finder, invoice/thermal print CSS, and JSON backup.

## Setup
1. Copy `.env.example` to `.env.local`.
2. Add your MongoDB Atlas connection string.
3. `npm install`
4. `npm run dev`

Never commit `.env.local`.

## Important
The browser print dialog is used for thermal printing. Select the connected 58mm/80mm thermal printer. PDF can be saved from the same print dialog. Direct WhatsApp file attachment requires browser/device sharing support; the current POS provides a WhatsApp invoice link fallback.


## New Arif Mobile Center – expanded shop system

This version adds the connected shop-management modules:
Dashboard, POS/New Sale, Sales, Purchases (including TCS/Bilty), Products, Inventory/Stock
In/Out/Damaged/Expired, Customers, Suppliers, Accounts (Cash/JazzCash/Easypaisa/Raast/NayaPay/UBL),
Expenses, Salaries, Ledger, Reports, Invoices/Warranty, Backup & Restore, and category-first Universal Finder.

### Environment
Set `MONGODB_URI` in local `.env.local` and in Vercel Project Settings. Optional `MONGODB_DB`
defaults to `new_arif_mobile_center`.

### Invoice/PDF/WhatsApp
Invoice pages provide Print / Save PDF through the browser print dialog and a WhatsApp/share action.
On supported phones, the native share sheet can share the invoice link/text; WhatsApp attachment of a
generated PDF is constrained by browser/WhatsApp web APIs, so Print/Save PDF remains the reliable PDF path.

### Backup
`/backup` downloads a complete JSON export and can import a JSON backup. For automatic third-party
cloud copies, a Google Drive/OneDrive account/API authorization is still required; free provider quotas
apply.
