"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  BadgeCheck,
  Boxes,
  ExternalLink,
  Facebook,
  FileText,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Search,
  Settings2,
  Smartphone,
  Sparkles,
  Store,
  Wrench,
  X,
} from "lucide-react";

type Tool = { id: number; code: string; note?: string };
type Product = {
  id: number;
  name: string;
  category: string;
  stock: number;
  price: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
};

const tools: Tool[] = [
  { id: 1, code: "x627 x6680" },
  { id: 2, code: "yo3 yo4 yo5 y06" },
  { id: 3, code: "x650 x660 670" },
  { id: 4, code: "9a 9c 9d" },
  { id: 5, code: "x6511 x6512 x688" },
  { id: 6, code: "A5s a3s A5 2020" },
  { id: 7, code: "x680 x6720 x6531" },
  { id: 8, code: "Add your tool codes here" },
  { id: 9, code: "Add your tool codes here" },
  // Add 100+ options in the same format: { id: 10, code: "..." }
];

const initialProducts: Product[] = [
  { id: 1, name: "Charging Flex / Connector", category: "Mobile Parts", stock: 9, price: "Ask on WhatsApp", status: "In Stock" },
  { id: 2, name: "LCD / Display", category: "Displays", stock: 4, price: "Ask on WhatsApp", status: "In Stock" },
  { id: 3, name: "Battery", category: "Batteries", stock: 1, price: "Ask on WhatsApp", status: "Low Stock" },
  { id: 4, name: "Universal Repair Tool", category: "Tools", stock: 0, price: "Ask on WhatsApp", status: "Out of Stock" },
];

const waNumber = "923290882200";
const waLink = `https://wa.me/${waNumber}`;

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-cyan-300/25 px-1 text-cyan-100">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [adminOpen, setAdminOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [newPost, setNewPost] = useState("");
  const toolRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const saved = localStorage.getItem("new-arif-products");
    if (saved) setProducts(JSON.parse(saved));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<number>();
    return new Set(tools.filter(t => t.code.toLowerCase().includes(q)).map(t => t.id));
  }, [query]);

  useEffect(() => {
    if (matches.size) {
      const first = [...matches][0];
      setTimeout(() => toolRefs.current[first]?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  }, [matches]);

  function saveProducts(next: Product[]) {
    setProducts(next);
    localStorage.setItem("new-arif-products", JSON.stringify(next));
  }

  function unlock() {
    // Demo lock only. For a real deployed admin area, use Clerk/server-side auth.
    if (password === "1234") setUnlocked(true);
    else alert("Wrong password. Demo password: 1234");
  }

  function addProduct() {
    const p: Product = {
      id: Date.now(),
      name: "New Mobile Part",
      category: "Mobile Parts",
      stock: 1,
      price: "Ask on WhatsApp",
      status: "In Stock",
    };
    saveProducts([p, ...products]);
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <a href="#" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-400 text-slate-950">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="font-black tracking-wide">NEW ARIF</div>
              <div className="text-xs text-slate-400">MOBILE CENTER</div>
            </div>
          </a>
          <nav className="hidden gap-5 text-sm text-slate-300 md:flex">
            <a href="#tools" className="hover:text-white">Universal Finder</a>
            <a href="#shop" className="hover:text-white">Parts</a>
            <a href="#posts" className="hover:text-white">Posts</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </nav>
          <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-sm font-bold text-slate-950">
            <MessageCircle size={17} /> WhatsApp
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-10 md:px-6 md:pt-16">
        <div className="glass glow relative overflow-hidden rounded-[2rem] p-7 md:p-12">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
                <BadgeCheck size={14} /> Mobile Parts • Repairing • Universal Tools
              </div>
              <h1 className="text-4xl font-black leading-tight md:text-6xl">
                NEW ARIF <span className="text-cyan-300">MOBILE CENTER</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Mobile repairing aur mobile parts ke liye professional center. Universal Tool Finder se model/code seconds mein find karein.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#tools" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-950">
                  <Search size={18} /> Tool Finder
                </a>
                <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold">
                  <MessageCircle size={18} /> WhatsApp: 0329-0882200
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-6 text-center">
              <div className="text-sm text-slate-400">Qurani Ayat</div>
              <div className="mt-4 text-2xl font-semibold leading-loose text-amber-200" dir="rtl">
                إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ
              </div>
              <div className="mt-2 text-sm text-slate-500">ہم تیری ہی عبادت کرتے ہیں اور تجھ ہی سے مدد مانگتے ہیں</div>
            </div>
          </div>
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-cyan-300"><Settings2 size={16}/> UNIVERSAL TOOL FINDER</div>
            <h2 className="text-3xl font-black md:text-4xl">Code search karein</h2>
            <p className="mt-2 text-slate-400">Kisi bhi code ka ek hissa likhein — matching option automatically highlight aur screen us tak scroll karegi.</p>
          </div>
          <div className="text-sm text-slate-500">{tools.length}+ options loaded</div>
        </div>

        <div className="glass rounded-3xl p-4 md:p-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 py-4 pl-12 pr-12 text-lg outline-none transition focus:border-cyan-300/50"
              placeholder="Example: x650, A5, 6511..."
              aria-label="Search universal tool codes"
            />
            {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X size={18}/></button>}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map(tool => {
              const matched = matches.has(tool.id);
              return (
                <div
                  key={tool.id}
                  ref={el => { toolRefs.current[tool.id] = el; }}
                  className={`rounded-2xl border p-4 transition ${matched ? "tool-match border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-white/[.025]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-sm font-black text-cyan-200">{tool.id}</span>
                    {matched && <span className="rounded-full bg-cyan-300/15 px-2.5 py-1 text-xs font-bold text-cyan-200">MATCH</span>}
                  </div>
                  <div className="mt-4 font-bold tracking-wide">{highlight(tool.code, query)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 md:px-6">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-300"><Package size={16}/> MOBILE PARTS & STOCK</div>
          <h2 className="text-3xl font-black md:text-4xl">Samaan / Items</h2>
          <p className="mt-2 text-slate-400">Item ki quantity aur status show karein: 1 item, 4 items, 5 items, 9 items, etc.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map(p => (
            <article key={p.id} className="glass rounded-3xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5"><Boxes size={21}/></div>
                <span className={`badge rounded-full px-2.5 py-1 text-xs font-bold ${p.status === "In Stock" ? "bg-emerald-300/10 text-emerald-300" : p.status === "Low Stock" ? "bg-amber-300/10 text-amber-300" : "bg-rose-300/10 text-rose-300"}`}>{p.status}</span>
              </div>
              <h3 className="font-black">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.category}</p>
              <div className="mt-5 flex items-end justify-between">
                <div><div className="text-2xl font-black">{p.stock}</div><div className="text-xs text-slate-500">quantity</div></div>
                <div className="text-right text-sm text-slate-400">{p.price}</div>
              </div>
              <a href={`${waLink}?text=${encodeURIComponent(`Salam, mujhe ${p.name} chahiye.`)}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-bold hover:bg-white/10">
                <MessageCircle size={16}/> WhatsApp par poochhein
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="posts" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 md:px-6">
        <div className="glass rounded-3xl p-6 md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-amber-300"><FileText size={16}/> POSTS</div>
              <h2 className="text-3xl font-black">Latest updates</h2>
              <p className="mt-2 text-slate-400">Yahan new stock, repairing updates aur offers post kiye ja sakte hain.</p>
            </div>
            <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-bold">
              <MessageCircle size={17}/> Post ke bare mein WhatsApp
            </a>
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/25 p-8 text-center">
            <Sparkles className="mx-auto text-amber-300" size={30}/>
            <p className="mt-3 font-bold">“New stock / repairing update yahan show hogi.”</p>
            <p className="mt-1 text-sm text-slate-500">Admin panel se post system ko database ke sath connect kiya ja sakta hai.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 md:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="glass rounded-3xl p-6">
            <Store className="text-cyan-300" />
            <h3 className="mt-4 text-xl font-black">NEW ARIF MOBILE CENTER</h3>
            <p className="mt-2 text-slate-400">Mobile Parts & Repairing</p>
          </div>
          <div className="glass rounded-3xl p-6">
            <MapPin className="text-emerald-300" />
            <h3 className="mt-4 text-xl font-black">Location</h3>
            <p className="mt-2 text-slate-400">Al Saif Plaza, Kamar Mushani, Mianwali</p>
          </div>
          <div className="glass rounded-3xl p-6">
            <Wrench className="text-amber-300" />
            <h3 className="mt-4 text-xl font-black">Services</h3>
            <p className="mt-2 text-slate-400">Mobile repairing, parts & universal tool finder</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#25d366] px-5 py-3 font-black text-slate-950"><MessageCircle size={18}/> WhatsApp 0329-0882200</a>
          <a href="https://www.tiktok.com/@newarifmobilecenter" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold"><ExternalLink size={18}/> TikTok</a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 px-4 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
        <div>© {new Date().getFullYear()} NEW ARIF MOBILE CENTER</div>
        <button onClick={() => setAdminOpen(true)} className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 hover:bg-white/5 hover:text-slate-300"><Lock size={14}/> Admin</button>
      </footer>

      {adminOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-xl rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Admin / Content Manager</h2>
              <button onClick={() => setAdminOpen(false)}><X/></button>
            </div>
            {!unlocked ? (
              <div className="mt-6">
                <p className="text-sm text-slate-400">Demo lock enabled. Production mein server-side authentication lagani hogi.</p>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Admin password" className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 outline-none focus:border-cyan-300/50"/>
                <button onClick={unlock} className="mt-3 w-full rounded-xl bg-cyan-300 py-3 font-black text-slate-950">Unlock</button>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div>
                  <div className="mb-3 font-bold">Add product</div>
                  <button onClick={addProduct} className="rounded-xl bg-emerald-300 px-4 py-3 font-black text-slate-950">+ Add demo item</button>
                </div>
                <div>
                  <div className="mb-3 font-bold">Post draft</div>
                  <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Example: New Samsung LCD stock available..." className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/50 p-4 outline-none focus:border-cyan-300/50"/>
                  <button onClick={() => { alert("Post draft saved locally for demo."); setNewPost(""); }} className="mt-3 rounded-xl bg-white px-4 py-3 font-black text-slate-950">Save post</button>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">
                  Important: browser/localStorage admin lock is not secure for a real shop website. For deployment, connect Clerk + MongoDB and protect admin actions on the server.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}