import Link from "next/link";
import RepairReminderSummary from "./components/RepairReminderSummary";

const menuLinks = [
  ["File", "/backup"], ["Sale", "/pos"], ["Purchase", "/purchases"],
  ["Reports", "/reports"], ["Expense", "/expenses"], ["Accounts", "/accounts"],
  ["Bank", "/accounts"], ["Cheque System", "/vouchers"], ["Slips", "/notebook"],
];

const shortcuts = [
  ["🛒", "Sale", "/pos"], ["🧾", "Purchase", "/purchases"],
  ["🧮", "Vouchers", "/vouchers"], ["📒", "Cash Book", "/ledger"],
  ["📦", "Inventory", "/stock"], ["🤝", "Supplier", "/suppliers"],
  ["👤", "Customer", "/customers"], ["📊", "Report", "/reports"],
];

const groups = [
  {title:"Sales", icon:"🛒", items:[
    ["POS / New Sale","Search products, add items, select customer and take payment","/pos"],
    ["Sales History","Find, modify, reverse or print sale invoices","/sales"],
    ["Sale Returns","Return items and adjust stock or customer balance","/sales/returns"],
    ["Quotations","Create a quotation and convert it to a sale later","/quotations"],
  ]},
  {title:"Purchasing", icon:"🧾", items:[
    ["Purchase Invoice","Record items, supplier, cost and delivery charges","/purchases"],
    ["Purchase History","Find, modify, reverse or print purchases","/purchases/history"],
    ["Purchase Returns","Return purchased stock and update supplier balance","/purchases/returns"],
  ]},
  {title:"Inventory", icon:"📦", items:[
    ["Products","Add and manage products, SKU, cost and retail price","/admin"],
    ["Stock Dashboard","View current quantities and stock value","/stock"],
    ["Stock In / Out","Record manual stock movements and adjustments","/stock"],
    ["Damaged / Expired","Record a stock adjustment with its reason","/stock"],
  ]},
  {title:"People & Ledgers", icon:"👥", items:[
    ["Customers","Customer accounts, balances and invoices","/customers"],
    ["Customer Ledger","Review customer transactions and balances","/ledger"],
    ["Mobile Repair Receiving","Receive phones, update repairs and payments","/repairs"],
    ["Notebook / Slips","Notes, amounts and printable vouchers","/notebook"],
    ["Suppliers","Supplier accounts and balances","/suppliers"],
    ["Supplier Ledger","Supplier transaction history","/ledger?type=supplier"],
  ]},
  {title:"Accounts & Banking", icon:"💳", items:[
    ["Accounts Dashboard","Cash, mobile wallets and bank balances","/accounts"],
    ["Cash / Bank Vouchers","Receive or pay cash and bank vouchers","/vouchers"],
    ["Cash Book","Review ledger entries","/ledger"],
    ["Expenses","Record and review shop expenses","/expenses"],
    ["Salaries","Employees and salary payments","/salaries"],
  ]},
  {title:"Reports", icon:"📊", items:[
    ["Daily Summary","Sales, purchases, accounts and expenses","/reports"],
    ["Sales / Profit Reports","Review sales and profit by date or item","/reports"],
    ["Stock Reports","Stock balance and movement","/stock"],
    ["Account Reports","Money in and out by account","/accounts"],
  ]},
  {title:"Tools & Documents", icon:"🧰", items:[
    ["Invoices & Warranty","Open invoices and warranty records","/invoices"],
    ["Finder Tool","Find supported phone tools and parts","/tools"],
    ["Backup & Restore","Download or restore a database backup","/backup"],
    ["Settings","Manage app settings","/settings"],
  ]},
];

export default function Home(){
 return <main className="shell dashboardHome">
  <section className="hero dashboardHero"><div><div className="eyebrow">NEW ARIF MOBILE CENTER</div><h1>Business Dashboard</h1><p className="muted">Sales, stock, repairs and accounts at a glance</p></div><div className="icon">📱</div></section>
  <nav className="dashboardMenu" aria-label="Main menu">{menuLinks.map(([label,href])=><Link href={href} key={label}>{label}</Link>)}</nav>
  <section className="dashboardShortcuts" aria-label="Quick shortcuts">{shortcuts.map(([icon,label,href])=><Link href={href} className="dashboardShortcut" key={label}><span className="shortcutIcon" aria-hidden="true">{icon}</span><span>{label}</span></Link>)}</section>
  <div className="dashboardGroups">{groups.map(g=><section className="panel" key={g.title}><h2>{g.icon} {g.title}</h2><div className="grid">{g.items.map(([title,desc,href])=><Link href={href} className="card" key={title}><h3>{title}</h3><p className="muted">{desc}</p><span className="go">Open →</span></Link>)}{g.title==="People & Ledgers"&&<RepairReminderSummary/>}</div></section>)}</div>
 </main>
}
