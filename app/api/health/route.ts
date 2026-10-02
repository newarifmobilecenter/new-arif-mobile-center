import { NextResponse } from "next/server";
import { db, describeMongoConnectionError } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
	try {
		const database = await db();
		await database.command({ ping: 1 });
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{ ok: false, error: describeMongoConnectionError(error) },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}