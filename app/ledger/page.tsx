"use client";
import {Suspense,useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";

const money=(n:number)=>Number(n||0).toLocaleString("en-PK",{maximumFractionDigits:2});
function LedgerContent(){
 const q=useSearchParams(), customerId=q.get("customer")||"";
 const [sales,setSales]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]),[repairs,setRepairs]=useState<any[]>([]);
 const [amount,setAmount]=useState(""),[method,setMethod]=useState("Cash"),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const load=()=>Promise.all([
   fetch("/api/data?collection=sales&limit=5000").then(r=>r.json()),
   fetch("/api/data?collection=customers&limit=5000").then(r=>r.json()),
   fetch("/api/repairs").then(r=>r.json())
 ]).then(([s,c,r])=>{setSales(Array.isArray(s)?s:[]);setCustomers(Array.isArray(c)?c:[]);setRepairs(Array.isArray(r)?r:[])});
 useEffect(()=>{void load()},[]);
 const customer=customers.find(c=>String(c._id)===customerId);
 const rows=useMemo(()=>sales.filter(s=>!customerId||String(s.customerId||"")===customerId),[sales,customerId]);
 const repairRows=repairs.filter(r=>!customerId||String(r.customerId||"")===customerId); const balance=rows.reduce((a,s)=>a+Number(s.remaining||0),0)+repairRows.reduce((a,r)=>a+Number(r.remaining||0),0);
 async function receive(){
   const n=Number(amount);
   if(!customerId)return alert("Select a customer first.");
   if(!Number.isFinite(n)||n<=0)return alert("Enter a valid payment.");
   if(n>balance+0.000001)return alert(`Maximum outstanding balance is Rs. ${money(balance)}.`);
   setBusy(true);setMsg("");
   try{
    const r=await fetch("/api/customers/payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId,amount:n,paymentMethod:method})});
    const d=await r.json(); if(!r.ok)throw new Error(d.error||"Payment failed");
    setAmount("");setMsg(`Payment received: Rs. ${money(d.applied)}. Remaining balance updated.`);
    await load();
   }catch(e:any){setMsg(e.message)}finally{setBusy(false)}
 }
 return <main className="shell">
  <div className="nav"><Link href="/">← Dashboard</Link><Link href="/customers">Customers</Link><Link href="/pos">POS</Link><Link href="/repairs">Repairs</Link></div>
  <h1>Customer Ledger</h1>
  {customerId&&customer&&<div className="panel">
   <h2>{customer.name}</h2><p className="muted">{customer.phone||"No phone"}</p>
   <h2>Outstanding: <b>Rs. {money(balance)}</b></h2>
   {balance>0&&<div className="grid">
    <input className="input" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Payment amount"/>
    <select className="input" value={method} onChange={e=>setMethod(e.target.value)}>{["Cash","JazzCash","Easypaisa","Raast","NayaPay","Bank","Other"].map(x=><option key={x}>{x}</option>)}</select>
    <button className="btn green" disabled={busy} onClick={receive}>{busy?"Saving...":"Receive Payment"}</button>
   </div>}
   {msg&&<p>{msg}</p>}
  </div>}
  <div className="panel"><h2>Sales / Customer Ledger</h2><table className="table"><thead><tr><th>Date</th><th>Invoice</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
   <tbody>{rows.map(x=><tr key={"s-"+x._id}><td>{x.createdAt?new Date(x.createdAt).toLocaleString():"-"}</td><td>{x.invoiceNo||"-"}</td><td>Rs. {money(x.total)}</td><td>Rs. {money(x.paid)}</td><td>Rs. {money(x.remaining)}</td><td>{Number(x.remaining)>0?"🔴 Due":"🟢 Paid"}</td></tr>)}{repairRows.map(x=><tr key={"r-"+x._id}><td>{x.createdAt?new Date(x.createdAt).toLocaleString():"-"}</td><td>{x.tokenNo} (Repair)</td><td>Rs. {money(x.agreedRate)}</td><td>Rs. {money(x.paid)}</td><td>Rs. {money(x.remaining)}</td><td>{Number(x.remaining)>0?"🔴 Due":"🟢 Paid"}</td></tr>)}</tbody></table></div>
 </main>
}
export default function Ledger(){return <Suspense fallback={<main className="shell"><h1>Loading Ledger...</h1></main>}><LedgerContent/></Suspense>}
