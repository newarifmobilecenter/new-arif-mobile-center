# Sale/Stock/Payment Atomic Transaction Fix

The POS now uses `/api/sales/create` so sale creation, stock OUT movements, and payment transaction are committed together in a MongoDB transaction. If any critical step fails, the transaction is aborted.

Sale returns use the same transaction approach for stock IN, return record, sale balance/refund update, and refund transaction.

**Requirement:** MongoDB transactions require a replica set or sharded cluster. MongoDB Atlas supports this. If running a standalone local MongoDB server, configure a replica set before using these endpoints.
