import crypto from "crypto";
import { ObjectId } from "mongodb";
import { db } from "./mongodb";
import { cleanPerms, DEFAULT_STAFF_PERMS, type PermKey } from "./perms";

export type Role = "ADMIN" | "STAFF";
type EnvUser = { username: string; password: string; role: Role };
export type PublicUser = { id: string; username: string; role: Role; perms: PermKey[]; active: boolean; source: "db" | "env" };

export function envUsers(): EnvUser[] {
  const adminUser = (process.env.ADMIN_USERNAME || "").trim();
  const adminPass = (process.env.ADMIN_PASSWORD || "").trim();
  const list: EnvUser[] = [];
  if (adminUser && adminPass) list.push({ username: adminUser, password: adminPass, role: "ADMIN" });
  try {
    const staff = JSON.parse(process.env.STAFF_USERS_JSON || "[]");
    if (Array.isArray(staff)) for (const u of staff) if (u?.username && u?.password) list.push({ username: String(u.username).trim(), password: String(u.password).trim(), role: "STAFF" });
  } catch (e) { console.error("STAFF_USERS_JSON is not valid JSON:", e); }
  return list;
}

const hashPw = (pw: string, salt: string) => crypto.scryptSync(pw, salt, 32).toString("hex");
const newSalt = () => crypto.randomBytes(16).toString("hex");
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const col = async () => (await db()).collection("users");

export async function authenticate(username: string, password: string): Promise<{ username: string; role: Role; perms: PermKey[] } | null> {
  const u = String(username || "").trim(), pw = String(password || "").trim();
  let docs: any[] = [];
  try { docs = await (await col()).find({}).toArray(); } catch (e) { console.error("users collection read failed:", e); }
  const hit = docs.find((d) => d.active !== false && d.username === u && same(hashPw(pw, d.salt), d.hash));
  if (hit) return { username: hit.username, role: hit.role, perms: cleanPerms(hit.perms) };
  const migrated = new Set(docs.map((d) => d.envName).filter(Boolean));
  const recovery = (process.env.ADMIN_RECOVERY || "").trim() === "1";
  const env = envUsers().find((e) => e.username === u && e.password === pw && (!migrated.has(e.username) || (recovery && e.role === "ADMIN")));
  return env ? { username: env.username, role: env.role, perms: DEFAULT_STAFF_PERMS } : null;
}

export async function listUsers(): Promise<PublicUser[]> {
  let docs: any[] = [];
  try { docs = await (await col()).find({}).sort({ createdAt: 1 }).toArray(); } catch {}
  const migrated = new Set(docs.map((d) => d.envName).filter(Boolean));
  const out: PublicUser[] = docs.map((d) => ({ id: String(d._id), username: d.username, role: d.role, perms: cleanPerms(d.perms), active: d.active !== false, source: "db" }));
  for (const e of envUsers()) if (!migrated.has(e.username)) out.push({ id: `env:${e.username}`, username: e.username, role: e.role, perms: DEFAULT_STAFF_PERMS, active: true, source: "env" });
  return out;
}

const usernameTaken = async (name: string, exceptId?: string) => {
  const docs = await (await col()).find({ username: name }).toArray();
  if (docs.some((d) => String(d._id) !== exceptId)) return true;
  const migrated = new Set((await (await col()).find({ envName: { $exists: true } }).toArray()).map((d) => d.envName));
  return envUsers().some((e) => e.username === name && !migrated.has(e.username) && `env:${e.username}` !== exceptId);
};

export async function createStaff(username: string, password: string, perms: unknown) {
  const name = String(username || "").trim(), pw = String(password || "").trim();
  if (name.length < 3) throw new Error("Username kam az kam 3 harf ka ho.");
  if (pw.length < 4) throw new Error("Password kam az kam 4 harf ka ho.");
  if (await usernameTaken(name)) throw new Error("Ye username pehle se maujood hai.");
  const salt = newSalt();
  const r = await (await col()).insertOne({ username: name, role: "STAFF", salt, hash: hashPw(pw, salt), perms: cleanPerms(perms), active: true, createdAt: new Date(), updatedAt: new Date() });
  return String(r.insertedId);
}

/** id = DB _id ya "env:<name>" (env user pehli tabdeeli par DB mein aa jata hai). */
export async function updateUser(id: string, ch: { username?: string; password?: string; perms?: unknown; active?: boolean }, actingUser?: string) {
  const c = await col();
  let doc: any = null;
  if (id.startsWith("env:")) {
    const name = id.slice(4);
    doc = await c.findOne({ envName: name });
    if (!doc) {
      const e = envUsers().find((x) => x.username === name);
      if (!e) throw new Error("User nahi mila.");
      const salt = newSalt();
      const ins = await c.insertOne({ username: e.username, envName: e.username, role: e.role, salt, hash: hashPw(e.password, salt), perms: DEFAULT_STAFF_PERMS, active: true, createdAt: new Date(), updatedAt: new Date() });
      doc = await c.findOne({ _id: ins.insertedId });
    }
  } else if (ObjectId.isValid(id)) doc = await c.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error("User nahi mila.");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (ch.username !== undefined) {
    const name = String(ch.username).trim();
    if (name.length < 3) throw new Error("Username kam az kam 3 harf ka ho.");
    if (name !== doc.username && await usernameTaken(name, String(doc._id))) throw new Error("Ye username pehle se maujood hai.");
    set.username = name;
  }
  if (ch.password !== undefined && String(ch.password).trim() !== "") {
    const pw = String(ch.password).trim();
    if (pw.length < 4) throw new Error("Password kam az kam 4 harf ka ho.");
    const salt = newSalt(); set.salt = salt; set.hash = hashPw(pw, salt);
  }
  if (ch.perms !== undefined && doc.role === "STAFF") set.perms = cleanPerms(ch.perms);
  if (ch.active !== undefined) {
    if (!ch.active) {
      if (doc.role === "ADMIN") throw new Error("Admin ko band nahi kar sakte.");
      if (actingUser && actingUser === doc.username) throw new Error("Aap khud ko band nahi kar sakte.");
    }
    set.active = !!ch.active;
  }
  await c.updateOne({ _id: doc._id }, { $set: set });
  const fresh = await c.findOne({ _id: doc._id });
  return { username: String(fresh!.username), role: fresh!.role as Role, perms: cleanPerms(fresh!.perms), id: String(doc._id) };
}

export async function deleteStaff(id: string) {
  const c = await col();
  if (id.startsWith("env:")) { await updateUser(id, { active: false }); return; }
  if (!ObjectId.isValid(id)) throw new Error("User nahi mila.");
  const doc = await c.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error("User nahi mila.");
  if (doc.role === "ADMIN") throw new Error("Admin ko delete nahi kar sakte.");
  // env se aaya hua user delete karne par dobara env se login na ho: sirf band (inactive) kar dete hain.
  if (doc.envName) { await c.updateOne({ _id: doc._id }, { $set: { active: false, updatedAt: new Date() } }); return; }
  await c.deleteOne({ _id: doc._id });
}
