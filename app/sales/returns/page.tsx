"use client";
import {useEffect,useMemo,useState} from "react";import Link from "next/link";
export default function SaleReturns(){const[sales,setSales]=useState<any[]>([]),[invoice,setInvoice]=useState(""),[qty,setQty]=useState("1"),[reason,setReason]=useState("Customer Return"),[msg,setMsg]=useState("");
const load=()=>fetch("/api/data?collection=sales&limit=5000").then(r=>r.json()).then((d:any)=>Array.isArray(d)?d:[]).then(x=>setSales(Array.isArray(x)?x:[]));useEffect(()=>{void load()},[]);
const sale=sales.find(x=>x.invoiceNo===invoice);const available=sale?.items||[];const [itemIndex,setItemIndex]=useState(0);const item=available[itemIndex];
async function submit(){
  if(!sale||!item)return setMsg("Invoice aur item select karein");
  const q=Math.max(1,Number(qty));
  if(!Number.isInteger(q)||q<=0)return setMsg("Return quantity positive whole number honi chahiye");
  const r=await fetch("/api/sales/return",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({saleId:sale._id,productId:item.productId,qty:q,reason})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)return setMsg(data.error||"Return save nahi hua");
  setMsg(`Return save ho gaya. Refund: Rs. ${Number(data.refundAmount||0).toFixed(2)}. Remaining: Rs. ${Number(data.remaining||0).toFixed(2)}`);
  setQty("1");void load();
}
return <main className="shell"><div className="nav"><Link href="/">← Dashboard</Link><Link href="/sales">Sales</Link><Link href="/pos">New Sale</Link></div><h1>↩️ Sale Return</h1><div className="panel"><div className="grid"><input className="input" value={invoice} onChange={e=>setInvoice(e.target.value)} placeholder="Invoice No e.g. INV-..."/><select className="input" value={itemIndex} onChange={e=>setItemIndex(Number(e.target.value))}>{available.map((x:any,i:number)=><option value={i} key={i}>{x.name} × {x.qty} — Rs. {x.price}</option>)}</select><input className="input" type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}/><input className="input" value={reason} onChange={e=>setReason(e.target.value)}/></div><button className="btn red" onClick={submit}>Process Return</button>{msg&&<p>{msg}</p>}</div><div className="panel"><h2>Recent Sale Returns</h2><table className="table"><thead><tr><th>Invoice</th><th>Item</th><th>Qty</th><th>Amount</th><th>Date</th></tr></thead><tbody>{sales.length===0?<tr><td colSpan={5}>No sales found</td></tr>:<tr><td colSpan={5}>Return history is stored in Returns collection and can be backed up.</td></tr>}</tbody></table></div></main>}
