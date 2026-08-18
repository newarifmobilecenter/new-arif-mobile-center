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
