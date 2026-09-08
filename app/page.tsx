import Link from "next/link";

const groups = [
  {title:"Sales", icon:"🛒", items:[
    ["POS / New Sale","Search A12 → choose any item, add multiple lines/quantities, customer/pickup, payment, invoice","/pos"],
    ["Sales History","Sale invoices, modify/reverse/print and sale/return summary","/sales"],
    ["Sale Returns","Return items, restore stock and adjust customer/account","/sales/returns"],
    ["Quotations","Create quotation without changing stock; convert to sale later","/quotations"],
  ]},
  {title:"Purchasing", icon:"🧾", items:[
    ["Purchase Invoice","Line-by-line multi-item purchase with supplier, cost, TCS/Bilty/freight","/purchases"],
    ["Purchase History","Purchase list, modify/reverse/print","/purchases/history"],
    ["Purchase Returns","Return purchased stock and supplier balance","/purchases/returns"],
  ]},
  {title:"Inventory", icon:"📦", items:[
    ["Products","Add/edit/delete products, SKU/part number, cost, retail, warranty","/admin"],
    ["Stock Dashboard","Current quantity and stock value","/stock"],
    ["Stock In / Out","Manual stock movement","/stock"],
    ["Damaged / Expired","Adjustment with reason and audit trail","/stock"],
  ]},
  {title:"People & Ledgers", icon:"👥", items:[
    ["Customers","Customer accounts, balances, invoices","/customers"],
    ["Customer Ledger","Customer transaction history","/ledger"],
    ["Suppliers","Supplier accounts and balances","/suppliers"],
    ["Supplier Ledger","Supplier transaction history","/ledger?type=supplier"],
  ]},
  {title:"Accounts", icon:"💳", items:[
    ["Accounts Dashboard","Cash, JazzCash, Easypaisa, Raast, NayaPay, UBL, banks","/accounts"],
    ["Vouchers","Cash/Bank receive & pay vouchers","/vouchers"],
    ["Expenses","Expense entry and history","/expenses"],
    ["Salaries","Employees, monthly salary and payments","/salaries"],
  ]},
  {title:"Reports", icon:"📊", items:[
    ["Daily Summary","Sales, purchases, cash, banks, receivable/payable, expenses","/reports"],
    ["Sales / Profit Reports","Item, category, invoice, customer and date-wise","/reports"],
    ["Stock Reports","Stock balance, movement, audit and dead stock","/stock"],
    ["Account Reports","Account-wise money in/out","/accounts"],
  ]},
  {title:"Documents & Tools", icon:"🧰", items:[
    ["Invoices & Warranty","Thermal 58/80mm, PDF, warranty lookup","/invoices"],
    ["Universal Finder","Category-first Finder Tool","/tools"],
    ["Backup & Restore","Download/restore database JSON backup","/backup"],
  ]},
];

export default function Home(){
 return <main className="shell">
  <section className="hero"><div><div className="eyebrow">NEW ARIF MOBILE CENTER</div><h1>Business Management System</h1><p className="muted">POS • Purchase • Inventory • Accounts • Ledger • Reports • Finder</p></div><div className="icon">📱</div></section>
  <div className="dashboardGroups">{groups.map(g=><section className="panel" key={g.title}><h2>{g.icon} {g.title}</h2><div className="grid">{g.items.map(([title,desc,href])=><Link href={href} className="card" key={title}><h3>{title}</h3><p className="muted">{desc}</p><span className="go">Open →</span></Link>)}</div></section>)}</div>
 </main>
}