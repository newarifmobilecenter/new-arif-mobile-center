import { NextResponse } from "next/server"; import { db } from "@/lib/mongodb";
export async function GET(){ const d=await db(); await d.command({ping:1}); return NextResponse.json({ok:true}); }