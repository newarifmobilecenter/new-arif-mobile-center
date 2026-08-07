// components/Header.jsx
const navItems = ["Home", "Tools", "Parts", "Repairing", "About Us", "Contact"];

export function Header() {
  return (
    <header className="border-b border-white/10 bg-slate-950/95 sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">
            NEW <span className="text-cyan-400">ARIF</span>
          </h1>
          <span className="text-sm font-semibold tracking-wide text-slate-300 block">
            MOBILE CENTER
          </span>
          <small className="text-[10px] text-slate-400 block">
            Better Parts • Better Repairs • A Better You
          </small>
        </div>

        <nav className="hidden md:flex gap-6 text-sm font-bold text-slate-200">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-cyan-400 transition-colors">
              {item}
            </a>
          ))}
        </nav>

        <a
          href="https://wa.me/923290882200"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2 px-5 rounded-lg transition-all"
        >
          WhatsApp
        </a>
      </div>
    </header>
  );
}

// data/products.js
export const products = [
  { id: 1, icon: "📱", name: "iPhone X Display", desc: "Premium Quality", price: "Rs. 4,500" },
  { id: 2, icon: "🔋", name: "Samsung Battery", desc: "Original", price: "Rs. 1,250" },
  { id: 3, icon: "🔌", name: "Type-C Charging Port", desc: "Universal", price: "Rs. 350" },
  { id: 4, icon: "📷", name: "Back Camera", desc: "HD Quality", price: "Rs. 850" },
  { id: 5, icon: "📱", name: "Oppo A54 Display", desc: "Original", price: "Rs. 2,800" },
  { id: 6, icon: "🔋", name: "iPhone Battery", desc: "Original", price: "Rs. 1,450" },
];

// app/page.jsx
import { Header } from "@/components/Header";
import { products } from "@/data/products";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Quranic Banner */}
      <div className="bg-[#05070f] border-b border-amber-900/60 text-center py-2 text-amber-400 font-bold text-lg">
        إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ
      </div>

      <Header />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="md:col-span-7 p-8 flex flex-col justify-center">
            <span className="text-pink-500 font-black tracking-widest text-xs uppercase mb-2">
              Mobile Parts & Repairing Solutions
            </span>
            <h2 className="text-5xl lg:text-7xl font-black leading-none mb-2">
              NEW <span className="text-amber-400">ARIF</span>
            </h2>
            <h3 className="text-2xl font-bold text-slate-300 mb-6">MOBILE CENTER</h3>

            <div className="flex flex-wrap gap-2 mb-6">
              {["🛡 Quality Parts", "🔧 Expert Repairing", "👍 Trusted Service", "⚡ Fast Service"].map((badge) => (
                <span key={badge} className="bg-slate-800 border border-slate-700 text-xs px-3 py-1.5 rounded-full font-medium">
                  {badge}
                </span>
              ))}
            </div>

            <div className="p-4 border border-purple-500/40 rounded-xl bg-purple-950/20">
              <p className="font-semibold text-white">📍 Al Saif Plaza, Kamar Mushani, Mianwali</p>
              <p className="text-slate-400 text-sm">Visit Our Shop for Best Quality & Best Prices</p>
            </div>
          </div>

          <div className="md:col-span-5 min-h-[300px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-slate-950 flex items-center justify-center">
            <span className="text-8xl select-none" role="img" aria-label="repair tool">
              🔬📱
            </span>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ["🛠", "Universal Tool Finder"],
            ["🛍", "Mobile Parts"],
            ["⚙", "Expert Repairing"],
            ["🚚", "Fast Service"],
            ["🏆", "Trusted Shop"],
          ].map(([icon, label]) => (
            <div key={label} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-3xl mb-2">{icon}</div>
              <strong className="block text-sm text-slate-200">{label}</strong>
              <span className="text-xs text-slate-400">Professional service</span>
            </div>
          ))}
        </section>

        {/* Search Tool Section */}
        <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-1">🔎 UNIVERSAL TOOL FINDER</h2>
          <p className="text-slate-400 text-sm mb-4">Search from 100+ professional mobile-repair tools.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search tool e.g. x650"
              className="flex-1 px-4 py-3 rounded-lg border border-purple-600/60 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-colors">
              Search
            </button>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-slate-800/80 text-sm text-slate-300">
            ⭐ <strong className="text-white">X650 BGA Reballing Stencil</strong> — automatically highlighted
          </div>
        </section>

        {/* Products Grid */}
        <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-6">📦 MOBILE PARTS & PRODUCTS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((item) => (
              <article key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex gap-4 items-center">
                <div className="text-4xl bg-slate-900 p-3 rounded-lg">{item.icon}</div>
                <div>
                  <h3 className="font-bold text-white">{item.name}</h3>
                  <p className="text-slate-400 text-xs my-1">{item.desc}</p>
                  <strong className="text-amber-400 font-extrabold">{item.price}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Informational Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-2">
            <h3 className="text-lg font-bold text-white mb-4">📣 LATEST UPDATES & OFFERS</h3>
            <p className="text-sm text-slate-300">⭐ Best Quality Parts at Affordable Prices</p>
            <p className="text-sm text-slate-300">⭐ All Mobile Repairing Solutions</p>
            <p className="text-sm text-slate-300">⭐ New Stock Added Daily</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-2">
            <h3 className="text-lg font-bold text-white mb-4">🏆 WHY CHOOSE US?</h3>
            <p className="text-sm text-slate-300">✅ 100% Original & Best Quality Parts</p>
            <p className="text-sm text-slate-300">✅ Professional & Experienced Team</p>
            <p className="text-sm text-slate-300">✅ Affordable Prices</p>
            <p className="text-sm text-slate-300">✅ Quick Turnaround</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">➕ ADD YOUR PRODUCT</h3>
              <p className="text-sm text-slate-400 mb-4">Want to add your product or post something new?</p>
            </div>
            <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors">
              Add New Item
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 bg-slate-950 mt-12 text-slate-400 text-sm">
        <div className="container mx-auto px-4 flex flex-wrap justify-between items-center gap-4">
          <span>📍 Al Saif Plaza, Kamar Mushani, Mianwali</span>
          <span>💬 0329 0882200</span>
          <span>🎵 @newarifmobilecenter</span>
          <span>© 2026 New Arif Mobile Center</span>
        </div>
      </footer>
    </main>
  );
}
