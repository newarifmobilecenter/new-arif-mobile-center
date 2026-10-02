# New Arif Mobile Center — V10 Fix Pass

Applied to the original V9 master project.

## Fixes
- Role-gated generic data writes for admin-only collections.
- Repair creation now validates paid <= agreed rate.
- Repair creation saves repair + advance payment in one MongoDB transaction.
- Repair PATCH no longer permits direct paid changes; customer payments must use the ledger payment endpoint.
- Repair agreed-rate edits cannot go below already-paid amount.
- Other-person repair delivery requires collector CNIC + phone.
- POS item search now supports real ArrowUp/ArrowDown selection and Enter-to-add.

## Database safety
No existing MongoDB data was deleted or migrated by this pass.

## Verification limitation
A full production Next.js build requires dependency installation and a configured environment. Run `npm ci` and `npm run build` locally/CI with the required environment variables before deployment.
