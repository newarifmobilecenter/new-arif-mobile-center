import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is missing");
const globalForMongo = globalThis as unknown as { mongo?: {client:MongoClient; promise:Promise<MongoClient>} };
const client = globalForMongo.mongo?.client ?? new MongoClient(uri);
const promise = globalForMongo.mongo?.promise ?? client.connect();
if (process.env.NODE_ENV !== "production") globalForMongo.mongo = {client,promise};
export { client };
export async function db(){ return (await promise).db(process.env.MONGODB_DB || "new_arif_mobile_center"); }

export function describeMongoConnectionError(error: unknown) {
	const details = error as { code?: string | number; message?: string; name?: string };
	const code = String(details?.code || "");
	const message = String(details?.message || "");
	if (code === "ETIMEOUT" || /ETIMEOUT|timed out/i.test(message)) return "Database connection timed out.";
	if (code === "ENOTFOUND" || code === "EAI_AGAIN" || /queryTxt|querySrv/i.test(message)) return "Database DNS lookup failed.";
	if (code === "18" || /AuthenticationFailed|authentication failed/i.test(message)) return "Database authentication failed.";
	if (/MongoServerSelectionError|MongoNetworkError/i.test(details?.name || "")) return "Could not connect to MongoDB.";
	return "Database connection failed.";
}
