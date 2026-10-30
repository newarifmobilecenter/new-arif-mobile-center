import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSession, hasRole } from "@/lib/auth";
import { clearOrdersForPurchase } from "@/lib/orderBookServer";

const allowed = ["products","productOptions","customers","sales","purchases","transactions","expenses","salaries","stockMovements","suppliers","invoices","warranties","settings","backupLogs","quotations","employees","auditLogs","returns"];
const oid = (id:string) => ObjectId.isValid(id) ? new ObjectId(id) : null;
const adminOnly = new Set(["settings","employees","auditLogs","backupLogs","salaries"]);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error:"Login required."}, {status:401});
  try {
    const c = req.nextUrl.searchParams.get("collection") || "products";
    if (!allowed.includes(c)) return NextResponse.json({error:"Invalid collection"}, {status:400});
    const d = await db();
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 1000), 5000);
    const filter: Record<string, unknown> = c === "sales" && req.nextUrl.searchParams.get("includeCancelled") !== "1" ? { status: { $ne: "cancelled" } } : {};
    const rows = await d.collection(c).find(filter).sort({createdAt:-1}).limit(limit).toArray();
    return NextResponse.json(rows.map(x=>({...x,_id:x._id.toString()})));
  } catch(e:any) { return NextResponse.json({error:e?.message||"Database error"}, {status:500}); }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error:"Login required."}, {status:401});
  try {
    const body = await req.json();
    const {collection, ...doc} = body;
    if (!allowed.includes(collection)) return NextResponse.json({error:"Invalid collection"}, {status:400});
    if (adminOnly.has(collection) && !hasRole(session, "ADMIN")) return NextResponse.json({error:"Admin access required."},{status:403});
    const d = await db();
    doc.createdAt = new Date();
    doc.updatedAt = new Date();
    const r = await d.collection(collection).insertOne(doc);
    if (collection === "products" && Number(doc.stock || doc.openingQty || 0) > 0) { try { await clearOrdersForPurchase(d, [{ productId: r.insertedId.toString(), name: String(doc.name || "") }], "New product"); } catch {} }
    return NextResponse.json({_id:r.insertedId.toString(), ...doc}, {status:201});
  } catch(e:any) { return NextResponse.json({error:e?.message||"Database error"}, {status:500}); }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({error:"Login required."}, {status:401});
  try {
    const body = await req.json();
    const {collection, id, ...changes} = body;
    const _id = oid(id);
    if (!allowed.includes(collection) || !_id) return NextResponse.json({error:"Invalid collection/id"}, {status:400});
    if (adminOnly.has(collection) && !hasRole(session, "ADMIN")) return NextResponse.json({error:"Admin access required."},{status:403});
    delete changes._id; changes.updatedAt = new Date();
    const d = await db();
    const r = await d.collection(collection).findOneAndUpdate({_id}, {$set:changes}, {returnDocument:"after"});
    if (!r) return NextResponse.json({error:"Not found"}, {status:404});
    return NextResponse.json({...r,_id:r._id.toString()});
  } catch(e:any) { return NextResponse.json({error:e?.message||"Database error"}, {status:500}); }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.r !== "ADMIN") return NextResponse.json({error:"Admin access required."},{status:403});
    const collection=req.nextUrl.searchParams.get("collection")||"";
    const _id=oid(req.nextUrl.searchParams.get("id")||"");
    if (!allowed.includes(collection) || !_id) return NextResponse.json({error:"Invalid collection/id"}, {status:400});
    const d=await db(); const r=await d.collection(collection).deleteOne({_id});
    return NextResponse.json({ok:r.deletedCount===1});
  } catch(e:any) { return NextResponse.json({error:e?.message||"Database error"}, {status:500}); }
}
