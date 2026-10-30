import { NextRequest, NextResponse } from "next/server";
import { db, client } from "@/lib/mongodb";
import { getSession, hasRole } from "@/lib/auth";
import { ObjectId } from "mongodb";
import {
  calculateRepairPayment,
  advanceRepairTokenCounter,
  escapeRegex,
  ensureRepairIndexes,
  generateRepairToken,
  getRepairShopkeepers,
  normalizeRepairInput,
  normalizeRepairToken,
  RepairValidationError,
  REPAIR_STATES,
  toRepairListItem,
} from "@/lib/repairs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error:"Login required."},{status:401});
  try {
    const d=await db();
    const q=(req.nextUrl.searchParams.get("q")||"").trim().slice(0,100);
    const customerId=(req.nextUrl.searchParams.get("customerId")||"").trim();
    const status=(req.nextUrl.searchParams.get("status")||"").trim().toUpperCase();
    const from=(req.nextUrl.searchParams.get("from")||"").trim();
    const to=(req.nextUrl.searchParams.get("to")||"").trim();
    if(customerId&&!ObjectId.isValid(customerId))return NextResponse.json({error:"Invalid customer filter."},{status:400});
    if(status&&status!=="PAYMENT_DUE"&&!((REPAIR_STATES as readonly string[]).includes(status)))return NextResponse.json({error:"Invalid repair status filter."},{status:400});
    const dateFilter:any={};
    if(from){const parsed=new Date(`${from}T00:00:00.000Z`);if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==from)return NextResponse.json({error:"Invalid start date."},{status:400});dateFilter.$gte=parsed;}
    if(to){const parsed=new Date(`${to}T23:59:59.999Z`);if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==to)return NextResponse.json({error:"Invalid end date."},{status:400});dateFilter.$lte=parsed;}
    const filter:any={recordType:"REPAIR",deletedAt:null};
    if(q){const pattern=new RegExp(escapeRegex(q),"i");filter.$or=[{tokenNo:pattern},{customerName:pattern},{customerPhone:pattern},{model:pattern},{imei:pattern}];}
    if(customerId)filter.customerId=customerId;
    if(req.nextUrl.searchParams.get("unbilled")==="1")filter.billedSaleId={$in:[null]};
    if(status==="PAYMENT_DUE")filter.remaining={$gt:0};else if(status)filter.status=status;
    if(Object.keys(dateFilter).length)filter.receivedAt=dateFilter;
    const rows=await (await ensureRepairIndexes()).find(filter).sort({receivedAt:-1,createdAt:-1}).limit(5000).toArray();
    return NextResponse.json(rows.map(toRepairListItem));
  } catch(e:any){return NextResponse.json({error:e?.message||"Database error"},{status:500});}
}
export async function POST(req: NextRequest){
  const session=await getSession();
  if(!session) return NextResponse.json({error:"Login required."},{status:401});
  try{
    const b=await req.json();
    if(!b||typeof b!=="object"||Array.isArray(b))return NextResponse.json({error:"Invalid repair request."},{status:400});
    const customerId=String(b.customerId||"").trim();
    const d=await db();
    let customer: any = null;
    if(customerId){
      if(!ObjectId.isValid(customerId))return NextResponse.json({error:"Select a valid existing customer or leave the link empty."},{status:400});
      customer=await d.collection("customers").findOne({_id:new ObjectId(customerId)});
      if(!customer)return NextResponse.json({error:"Selected customer was not found."},{status:400});
    }
    const normalized=normalizeRepairInput({
      ...b,
      customerId:customerId||null,
      customerName:String(b.customerName||customer?.name||""),
      customerPhone:String(b.customerPhone||customer?.phone||""),
    },{creating:true,allowUnlinked:true});
    const shopkeepers=getRepairShopkeepers();
    const shopkeeper=normalized.shopkeeper||session.u;
    if(!shopkeepers.includes(shopkeeper))return NextResponse.json({error:"Select an authorized shopkeeper."},{status:400});
    const settings=await d.collection("settings").findOne({});
    const requestedToken=normalizeRepairToken(b.tokenNo);
    const token=requestedToken||await generateRepairToken();
    if(requestedToken)await advanceRepairTokenCounter(requestedToken);
    const now=new Date();
    const doc={
      ...normalized,
      shopkeeper,
      shopName:String(settings?.shopName||"NEW ARIF MOBILE"),
      shopPhone:String(settings?.phone||""),
      shopAddress:String(settings?.address||"Al saif plaza kamar mushani, mianwali"),
      tokenNo:token,
      entryNo:token,
      expectedHours:Math.max(0,(normalized.expectedReadyAt.getTime()-normalized.receivedAt.getTime())/3600000),
      paymentHistory:normalized.paid>0?[{amount:normalized.paid,paymentMethod:normalized.paymentMethod,type:"ADVANCE",reference:token,at:now,user:session.u}]:[],
      statusHistory:[{status:"RECEIVED",at:now,user:session.u}],
      createdBy:session.u,createdAt:now,updatedAt:now,deletedAt:null,deletedBy:null,
    };
    const collection=await ensureRepairIndexes();
    const s=client.startSession();
    let savedId:ObjectId|undefined;
    try{
      await s.withTransaction(async()=>{
        const result=await collection.insertOne(doc,{session:s});
        savedId=result.insertedId;
        if(doc.customerId&&doc.paid>0){
          await d.collection("transactions").insertOne({
            type:"IN",account:doc.paymentMethod,amount:doc.paid,customerId:doc.customerId,
            ref:token,repairId:String(result.insertedId),note:"Repair advance payment",user:session.u,createdAt:now,
          },{session:s});
        }
      },{readConcern:{level:"snapshot"},writeConcern:{w:"majority"}});
    }finally{await s.endSession();}
    if(!savedId)throw new Error("Repair transaction completed without an inserted record.");
    const saved=await collection.findOne({_id:savedId});
    return NextResponse.json(saved?{...saved,_id:saved._id.toString()}:null,{status:201});
  }catch(e:any){
    const status=e instanceof RepairValidationError?400:e?.code===11000?409:500;
    const message=e?.code===11000?"That receiving serial number is already in use. Choose another serial number.":e?.message||"Repair could not be saved.";
    return NextResponse.json({error:message},{status});
  }
}
export async function PATCH(req:NextRequest){
  const session=await getSession();
  if(!session) return NextResponse.json({error:"Login required."},{status:401});
  try{
    const b=await req.json();
    if(!b||typeof b!=="object"||Array.isArray(b))return NextResponse.json({error:"Invalid repair update."},{status:400});
    const id=String(b.id||"");
    if(!ObjectId.isValid(id)) return NextResponse.json({error:"Invalid repair id."},{status:400});
    const d=await db();
    const collection=await ensureRepairIndexes();
    const _id=new ObjectId(id);
    const current=await collection.findOne({_id,recordType:"REPAIR",deletedAt:null});
    if(!current)return NextResponse.json({error:"Repair not found."},{status:404});
    if(b.paid!==undefined||b.remaining!==undefined||b.paymentStatus!==undefined)
      return NextResponse.json({error:"Repair payments must be recorded through Customer Payment."},{status:400});
    const allowed=new Set(["parts","status","expectedReadyAt","paymentReminderDate","totalBill","agreedRate","model","mobileType","fault","condition","accessories","imei","devicePassword","shopkeeper","remarks","deliveryMode"]);
    const changes:Record<string,any>={};
    for(const [key,value] of Object.entries(b))if(allowed.has(key))changes[key]=value;
    if(Object.keys(changes).length===0)return NextResponse.json({error:"No editable repair fields were provided."},{status:400});
    const nextStatus=String(changes.status??current.status).toUpperCase();
    if(!(REPAIR_STATES as readonly string[]).includes(nextStatus))return NextResponse.json({error:"Invalid repair status."},{status:400});
    const allowedTransitions:Record<string,string[]>={RECEIVED:["RECEIVED","IN_REPAIR","CANCELLED"],IN_REPAIR:["IN_REPAIR","READY","CANCELLED"],READY:["READY","IN_REPAIR","DELIVERED","CANCELLED"],DELIVERED:["DELIVERED"],CANCELLED:["CANCELLED"]};
    if(!allowedTransitions[current.status||"RECEIVED"]?.includes(nextStatus))return NextResponse.json({error:`Repair cannot move from ${current.status} to ${nextStatus}.`},{status:409});
    const nextTotal=changes.totalBill??changes.agreedRate??current.totalBill??current.agreedRate??0;
    const totals=calculateRepairPayment(nextTotal,current.paid||0);
    if(nextStatus==="CANCELLED"&&(totals.totalBill>0||Number(current.paid||0)>0))return NextResponse.json({error:"A billed or paid repair cannot be cancelled; resolve its bill through the existing payment workflow first."},{status:409});
    const currentReminderDate=current.paymentReminderAt?new Date(current.paymentReminderAt).toISOString().slice(0,10):"";
    const normalized=normalizeRepairInput({
      ...current,
      ...changes,
      status:nextStatus,
      totalBill:totals.totalBill,
      paid:current.paid||0,
      receivedAt:current.receivedAt,
      expectedReadyAt:changes.expectedReadyAt??current.expectedReadyAt,
      paymentReminderDate:changes.paymentReminderDate??currentReminderDate,
    },{creating:false,allowUnlinked:true});
    if(changes.shopkeeper!==undefined&&!getRepairShopkeepers().includes(normalized.shopkeeper))return NextResponse.json({error:"Select an authorized shopkeeper."},{status:400});
    let delivery=current.delivery||null;
    if(nextStatus==="DELIVERED"&&current.status!=="DELIVERED"){
      const recipientType=String(b.deliveryRecipientType||"").toUpperCase();
      if(recipientType==="OTHER_PERSON"){
        const name=String(b.deliveryRecipientName||"").trim(),cnic=String(b.deliveryCnic||"").trim(),phone=String(b.deliveryPhone||"").trim();
        if(!name||!cnic||!phone)return NextResponse.json({error:"Other-person delivery requires name, CNIC, and phone."},{status:400});
        delivery={recipientType,name,cnic,phone,deliveredAt:new Date(),deliveredBy:session.u};
      }else if(recipientType==="CUSTOMER")delivery={recipientType,name:current.customerName,phone:current.customerPhone,deliveredAt:new Date(),deliveredBy:session.u};
      else return NextResponse.json({error:"Choose customer or other-person delivery."},{status:400});
      changes.deliveredAt=delivery.deliveredAt;
      changes.pickupBy=delivery.name;
      changes.pickupCnic=delivery.cnic||"";
      changes.pickupPhone=delivery.phone||"";
    }
    const now=new Date();
    const update:Record<string,any>={
      model:normalized.model,mobileType:normalized.mobileType,fault:normalized.fault,condition:normalized.condition,accessories:normalized.accessories,
      imei:normalized.imei,devicePassword:normalized.devicePassword,totalBill:normalized.totalBill,agreedRate:normalized.totalBill,
      remaining:normalized.remaining,paymentStatus:normalized.paymentStatus,expectedReadyAt:normalized.expectedReadyAt,
      expectedHours:Math.max(0,(normalized.expectedReadyAt.getTime()-new Date(current.receivedAt).getTime())/3600000),
      paymentReminderAt:normalized.paymentReminderAt,shopkeeper:normalized.shopkeeper,remarks:normalized.remarks,deliveryMode:normalized.deliveryMode,
      parts:normalized.parts,
      status:nextStatus,delivery,statusHistory:[...(current.statusHistory||[]),...(nextStatus!==current.status?[{status:nextStatus,at:now,user:session.u}]:[])],updatedAt:now,updatedBy:session.u,
    };
    if(nextStatus==="READY"&&current.status!=="READY")update.readyAt=now;
    const r=await collection.findOneAndUpdate({_id,recordType:"REPAIR",deletedAt:null},{$set:update},{returnDocument:"after"});
    if(!r)return NextResponse.json({error:"Repair not found."},{status:404});
    return NextResponse.json({...r,_id:r._id.toString()});
  }catch(e:any){const status=e instanceof RepairValidationError?400:500;return NextResponse.json({error:e?.message||"Repair update failed."},{status});}
}
