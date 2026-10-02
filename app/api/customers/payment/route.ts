import {NextRequest,NextResponse} from "next/server";
import {db,client} from "@/lib/mongodb";
import {getSession} from "@/lib/auth";
import {ObjectId} from "mongodb";
import {REPAIR_COLLECTION,REPAIR_PAYMENT_METHODS} from "@/lib/repairs";

export async function POST(req:NextRequest){
 const session=await getSession(); if(!session)return NextResponse.json({error:"Login required."},{status:401});
 try{
  const b=await req.json(); const customerId=String(b.customerId||""), amount=Number(b.amount),paymentMethod=String(b.paymentMethod||"Cash");
  if(!ObjectId.isValid(customerId)||!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Valid customer and payment amount are required."},{status:400});
  if(!(REPAIR_PAYMENT_METHODS as readonly string[]).includes(paymentMethod))return NextResponse.json({error:"Select a valid payment method."},{status:400});
  const d=await db(), sales=d.collection("sales"), repairs=d.collection(REPAIR_COLLECTION), tx=d.collection("transactions");
  const s=client.startSession(); let applied=0, left=amount;
  try{
   await s.withTransaction(async()=>{
    const credits=await sales.find({customerId,remaining:{$gt:0}}).sort({createdAt:1}).toArray();
    for(const sale of credits){
      if(left<=0)break; const due=Number(sale.remaining||0), use=Math.min(due,left); if(use<=0)continue;
      const r=await sales.updateOne({_id:sale._id,remaining:{$gte:use}},{$inc:{paid:use},$set:{remaining:due-use,status:due-use>0?"credit":"paid",updatedAt:new Date()}},{session:s});
      if(r.modifiedCount!==1)throw new Error("Payment allocation conflict; please retry.");
      applied+=use;left-=use;
    }
    const repairCredits=await repairs.find({recordType:"REPAIR",deletedAt:null,customerId,remaining:{$gt:0}}).sort({receivedAt:1,createdAt:1}).toArray();
    for(const repair of repairCredits){
      if(left<=0)break; const due=Number(repair.remaining||0),use=Math.min(due,left); if(use<=0)continue;
      const remaining=Math.round((due-use+Number.EPSILON)*100)/100,paidAt=new Date();
      const paymentHistory=[...(repair.paymentHistory||[]),{amount:use,paymentMethod,type:"CUSTOMER_PAYMENT",reference:b.ref||null,at:paidAt,user:session.u}];
      const r=await repairs.updateOne({_id:repair._id,recordType:"REPAIR",deletedAt:null,remaining:{$gte:use}},{$inc:{paid:use},$set:{remaining,paymentStatus:remaining>0?"PAYMENT_DUE":"PAID",paymentHistory,updatedAt:paidAt,updatedBy:session.u}},{session:s});
      if(r.modifiedCount!==1)throw new Error("Repair payment allocation conflict; please retry.");
      applied+=use;left-=use;
    }
    if(applied<=0)throw new Error("Customer has no outstanding balance.");
    await tx.insertOne({type:"IN",account:paymentMethod,amount:applied,customerId,ref:b.ref||null,note:"Customer balance payment",user:session.u,createdAt:new Date()},{session:s});
   });
  }finally{await s.endSession();}
  return NextResponse.json({ok:true,applied,unapplied:left});
 }catch(e:any){return NextResponse.json({error:e?.message||"Payment failed."},{status:400});}
}
