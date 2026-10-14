"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

export default function Stock(){
  const[p,setP]=useState<any[]>([]),[product,setProduct]=useState(""),[qty,setQty]=useState("1"),
  [type,setType]=useState("IN"),[reason,setReason]=useState("Adjustment"),[msg,setMsg]=useState("");

  const load=()=>fetch("/api/data?collection=products").then(r=>r.json()).then((d:any)=>Array.isArray(d)?d:[]).then(x=>setP(Array.isArray(x)?x:[]));
  useEffect(()=>{void load()},[]);

  async function move(){
    setMsg("");
    const pr=p.find(x=>x._id===product);
    if(!pr)return setMsg("Product select karein.");
    const q=Number(qty);
    if(!Number.isInteger(q)||q<=0)return setMsg("Quantity positive whole number honi chahiye.");
    if(["OUT","DAMAGE","EXPIRED"].includes(type)&&q>Number(pr.stock||0))
      return setMsg(`Insufficient stock. Available: ${Number(pr.stock||0)}.`);
    const r=await fetch("/api/stock/move",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({productId:product,type,qty:q,reason})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return setMsg(data.error||"Stock movement failed.");
    setMsg(`Stock updated. New stock: ${data.stock}`);
    setQty("1"); await load();
  }

  return <main className="shell">
    <div className="nav"><Link href="/">← Dashboard</Link><Link href="/admin">Products</Link><Link href="/purchases">Purchases</Link></div>
    <h1>📊 Inventory / Stock</h1>
    <div className="panel"><div className="grid">
      <select className="input" value={product} onChange={e=>setProduct(e.target.value)}>
        <option value="">Product</option>{p.map(x=><option key={x._id} value={x._id}>{x.name} / {x.model} — Stock: {x.stock||0}</option>)}
      </select>
      <select className="input" value={type} onChange={e=>setType(e.target.value)}>
        <option value="IN">Stock In</option><option value="OUT">Stock Out</option><option value="DAMAGE">Damaged</option><option value="EXPIRED">Expired</option>
      </select>
      <input className="input" type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)} placeholder="Quantity"/>
      <input className="input" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason"/>
    </div><button className="btn green" onClick={move}>Save Stock Movement</button>{msg&&<p>{msg}</p>}</div>
    <div className="panel"><h2>Current Stock</h2><div className="grid">{p.map(x=><div className="card" key={x._id}><h2>{x.name}</h2><p>{x.model}</p><div className="total">{x.stock||0}</div></div>)}</div></div>
  </main>
}
