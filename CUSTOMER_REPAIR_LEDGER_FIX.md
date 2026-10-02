# V9 Customer Ledger + Repair Integration

- Customer ledger now combines outstanding POS sales and repair balances.
- Customer payments allocate oldest outstanding sales first, then repair balances.
- Payments are recorded in transactions with customerId.
- Repair receiving records support token, customer, phone, model, type, fault, condition, accessories, optional IMEI/internal password, agreed rate, paid and remaining.
- Repair slip hides IMEI and password from print.
- Repair has PENDING/READY/DELIVERED states and a 3-hour expected-ready time.
- Delivery supports customer or another collector with name/CNIC/phone.
- Existing MongoDB records are not deleted.
- Generic data API GET/POST/PATCH now requires an authenticated session.
