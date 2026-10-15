"use client";

import { useState } from "react";
import Link from "next/link";
import RepairReminderSummary from "./components/RepairReminderSummary";

const categories = [
  { id:"file", title:"File", icon:"📁", items:[
    ["1. Add Product","Naya product aur uski details darj karein","/admin"],
    ["2. Add Customer","Customer ka naam aur contact add karein","/customers"],
    ["3. Change Product Cost","Product ki cost aur retail price update karein","/admin"],
    ["Backup & Restore","Business data ka backup lein ya restore karein","/backup"],
    ["Settings","App ki settings dekhein","/settings"],
  ]},
  { id:"sale", title:"Sale", icon:"🛒", items:[
    ["1. New Sale","POS par nayi sale banayein","/pos"],
    ["2. Sales Report","Sales aur profit ka khulasa","/reports"],
    ["3. Sales Report by Date","Date range ke mutabiq sale dekhein","/reports"],
    ["4. Sales Report by Category","Category wise sale report","/reports"],
    ["5. Mobile Repair Report","Repair records aur status dekhein","/repairs"],
    ["6. Customer Sales Report","Customer ki sales aur balance dekhein","/sales"],
    ["Sales History","Purani sales, invoice aur payment dekhein","/sales"],
    ["Sale Return","Returned items aur refund record karein","/sales/returns"],
    ["Quotations","Estimate banayein aur baad mein sale karein","/quotations"],
  ]},
  { id:"purchase", title:"Purchase", icon:"🧾", items:[
    ["New Purchase","Supplier se aayi stock entry karein","/purchases"],
    ["Purchase History","Purani purchase aur payments dekhein","/purchases/history"],
    ["Purchase Return","Supplier ko stock wapas record karein","/purchases/returns"],
    ["Purchase Summary","Purchase totals aur payable dekhein","/reports"],
  ]},
  { id:"inventory", title:"Inventory", icon:"📦", items:[
    ["Product List","Products, SKU aur prices manage karein","/admin"],
    ["Stock Dashboard","Current stock aur stock value dekhein","/stock"],
    ["Stock In / Out","Stock ki manual movement record karein","/stock"],
    ["Damaged / Expired Stock","Reason ke saath stock adjustment karein","/stock"],
    ["Stock Movement Report","Stock ki aamad-o-raft dekhein","/stock"],
  ]},
  { id:"customer", title:"Customer", icon:"👤", items:[
    ["Add / Find Customer","Customer record add ya search karein","/customers"],
    ["Customer Ledger","Customer ka hisaab aur baki dekhein","/ledger"],
    ["Customer Sales","Customer ki invoices dekhein","/sales"],
    ["Receive Customer Payment","Customer payment aur balance record karein","/ledger"],
  ]},
  { id:"supplier", title:"Supplier", icon:"🤝", items:[
    ["Supplier List","Supplier add karein aur account dekhein","/suppliers"],
    ["Supplier Ledger","Supplier ka hisaab aur baki dekhein","/ledger?type=supplier"],
    ["Purchase from Supplier","Nayi supplier purchase record karein","/purchases"],
    ["Supplier Payment","Vouchers mein supplier payment record karein","/vouchers"],
  ]},
  { id:"reports", title:"Reports", icon:"📊", items:[
    ["Daily Summary","Sale, purchase, cash aur expense ka summary","/reports"],
    ["Date Wise Report","Apni date range select karke totals dekhein","/reports"],
    ["Category / Item Sales","Sales aur profit reports","/reports"],
    ["Customer / Supplier Balances","Ledgers aur baqi raqam","/ledger"],
    ["Stock & Account Reports","Stock movement aur account totals","/stock"],
  ]},
  { id:"expense", title:"Expense", icon:"💸", items:[
    ["Add Expense","Naya kharcha aur category record karein","/expenses"],
    ["Expense History","Shop ke purane kharche dekhein","/expenses"],
    ["Expense Report","Date-wise kharchon ka summary","/reports"],
    ["Salary Payments","Employees ki salary record karein","/salaries"],
  ]},
  { id:"accounts", title:"Accounts", icon:"💳", items:[
    ["Accounts Dashboard","Cash aur digital account balances","/accounts"],
    ["Cash Receive / Pay Voucher","Cash transaction ya voucher banayein","/vouchers"],
    ["Cash Book","Cash aur ledger entries dekhein","/ledger"],
    ["Expenses","Shop ke kharche dekhein","/expenses"],
  ]},
  { id:"bank", title:"Bank", icon:"🏦", items:[
    ["Bank Balances","Bank aur wallet balances dekhein","/accounts"],
    ["Bank Receive / Pay Voucher","Bank transaction record karein","/vouchers"],
    ["Account Transactions","Account wise in/out history","/accounts"],
    ["Bank Summary","Reports mein account totals dekhein","/reports"],
  ]},
  { id:"cheque", title:"Cheque System", icon:"🧾", items:[
    ["Cheque / Bank Vouchers","Voucher mein bank transaction aur reference darj karein","/vouchers"],
    ["Bank Account Ledger","Bank account ka in/out hisaab","/accounts"],
    ["Cheque Payment Summary","Bank payments aur account totals","/reports"],
  ]},
  { id:"slips", title:"Slips", icon:"🖨️", items:[
    ["Repair Receiving Slip","Customer phone receiving slip kholen","/repairs"],
    ["Sale Invoice","Sale invoice aur print options","/invoices"],
    ["Notebook / Payment Vouchers","Notebook entries aur printable vouchers","/notebook"],
  ]},
  { id:"more", title:"More", icon:"🧰", items:[
    ["Invoices & Warranty","Invoices aur warranty records","/invoices"],
    ["Finder Tool","Phone tools aur supported parts dhoondein","/tools"],
    ["Salaries","Employees aur salary payments","/salaries"],
    ["Backup & Restore","Business data backup manage karein","/backup"],
  ]},
] as const;

const shortcuts = [
  ["🛒", "Sale", "/pos"], ["🧾", "Purchase", "/purchases"],
  ["🧮", "Vouchers", "/vouchers"], ["📒", "Cash Book", "/ledger"],
  ["📦", "Inventory", "/stock"], ["🤝", "Supplier", "/suppliers"],
  ["👤", "Customer", "/customers"], ["📊", "Report", "/reports"],
] as const;

export default function Home(){
 const [activeCategory, setActiveCategory] = useState<string | null>(null);
 const selected = categories.find(category => category.id === activeCategory);

 return <main className="shell dashboardHome">
  <section className="hero dashboardHero"><div><div className="eyebrow">NEW ARIF MOBILE CENTER</div><h1>Business Dashboard</h1><p className="muted">Kaam ki category chunein, phir uska option kholen</p></div><div className="icon">📱</div></section>
  <nav className="dashboardMenu" aria-label="Main menu">{categories.map(category=><button type="button" key={category.id} className={activeCategory===category.id?"dashboardMenuButton active":"dashboardMenuButton"} aria-expanded={activeCategory===category.id} aria-controls="dashboardCategoryPanel" onClick={()=>setActiveCategory(activeCategory===category.id?null:category.id)}><span aria-hidden="true">{category.icon}</span>{category.title}</button>)}</nav>
  <section className="dashboardShortcuts" aria-label="Quick shortcuts">{shortcuts.map(([icon,label,href])=><Link href={href} className="dashboardShortcut" key={label}><span className="shortcutIcon" aria-hidden="true">{icon}</span><span>{label}</span></Link>)}</section>
  {selected&&<section className="panel dashboardCategoryPanel" id="dashboardCategoryPanel"><div className="dashboardCategoryHeading"><h2>{selected.icon} {selected.title}</h2><button type="button" className="dashboardClose" onClick={()=>setActiveCategory(null)} aria-label="Close menu">×</button></div><div className="dashboardActionGrid">{selected.items.map(([title,description,href])=><Link href={href} className="dashboardAction" key={title}><span className="dashboardActionTitle">{title}</span><span className="muted">{description}</span><span className="go">Open →</span></Link>)}</div>{selected.id==="slips"&&<RepairReminderSummary/>}</section>}
  {!selected&&<p className="dashboardHint">Upar se category chunein ya foran kaam ke liye shortcut par click karein.</p>}
 </main>
}
