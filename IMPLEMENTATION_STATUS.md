# New Arif Mobile Center — V3 scope

This build keeps the existing dark/modern website design and adds the requested business-management navigation.

## Included
- POS with product/model/SKU search and multiple cart lines
- Customer/Cash Sale + Pickup By
- Invoice + thermal/PDF browser print flow + WhatsApp link
- Products and stock
- Multi-line Purchase Invoice with TCS/Bilty/Freight/Other Expense
- Customers, suppliers, ledgers
- Cash/JazzCash/Easypaisa/Raast/NayaPay/UBL/other accounts
- Receive/Pay vouchers
- Expenses and salaries pages
- Sales/purchase/profit/account reports
- Category-first Universal Finder
- Quotations
- Backup & Restore JSON
- Sale return starter flow
- Purchase return navigation

## Important
The database remains MongoDB. Set `MONGODB_URI` in Vercel Production/Preview. Do not paste passwords into source code.

## Deployment
1. Push this folder to GitHub.
2. In Vercel, add `MONGODB_URI` and optionally `MONGODB_DB`.
3. Redeploy.
4. Open `/` for the dashboard.

## Next hardening before real shop use
- MongoDB transactions for sale/purchase/return atomicity.
- Authentication/roles (admin/cashier).
- Exact item-level returns.
- Automated cloud backups via a provider/API; free provider quotas vary.
- Printer-specific raw ESC/POS support if browser print is not sufficient.
