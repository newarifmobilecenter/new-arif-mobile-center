import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is missing");
const globalForMongo = globalThis as unknown as { mongo?: {client:MongoClient; promise:Promise<MongoClient>} };
const client = globalForMongo.mongo?.client ?? new MongoClient(uri);
const promise = globalForMongo.mongo?.promise ?? client.connect();
if (process.env.NODE_ENV !== "production") globalForMongo.mongo = {client,promise};
export async function db(){ return (await promise).db(process.env.MONGODB_DB || "new_arif_mobile_center"); }
