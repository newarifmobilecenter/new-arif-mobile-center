# Inventory & Returns Fix

- Stock OUT/DAMAGE/EXPIRED now validates available stock server-side.
- Stock IN/OUT movements are written through `/api/stock/move`.
- Sale returns use `/api/sales/return`.
- A returned item cannot exceed the quantity sold minus previous returns.
- Returned stock is restored.
- Paid sale returns reduce the recorded paid/refunded amount and create a refund transaction.
- Unpaid sale returns reduce outstanding balance.
- Existing MongoDB records are not deleted by these changes.
