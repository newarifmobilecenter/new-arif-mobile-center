const products = [
  ["📱", "iPhone X Display", "Premium Quality", "Rs. 8,500"],
  ["🔋", "Samsung Battery A12", "Original", "Rs. 2,500"],
  ["🔌", "Type-C Charging Port", "Universal", "Rs. 350"],
  ["📷", "Back Camera", "HD Quality", "Rs. 850"],
  ["📱", "Oppo A54 Display", "Original", "Rs. 2,800"],
  ["🔋", "iPhone Battery", "Original", "Rs. 1,450"],
];

export default function Home() {
  return (
    <main>
      <div style={{background:"#05070f",borderBottom:"1px solid #6b4b00",textAlign:"center",padding:"9px",color:"#fbbf24",fontWeight:800}}>
        إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ
      </div>

      <header style={{borderBottom:"1px solid rgba(255,255,255,.12)",background:"rgba(3,7,18,.96)"}}>
        <div className="container" style={{display:"flex",alignItems:"center",gap:25,padding:"15px 0"}}>
          <div style={{fontWeight:900,fontSize:25,lineHeight:1.05}}>
            <span style={{color:"#fff"}}>NEW </span><span style={{color:"#22d3ee"}}>ARIF</span><br/>
            <span style={{fontSize:17}}>MOBILE CENTER</span>
            <small style={{display:"block",color:"#aeb5cc",fontSize:10}}>Better Parts • Better Repairs • A Better You</small>
          </div>
          <nav className="navlinks" style={{display:"flex",gap:22,marginLeft:"auto",fontWeight:700}}>
            {["⌂ Home","🔧 Tools","📦 Parts","⚙ Repairing","ⓘ About Us","☎ Contact"].map(x=><a key={x} href="#">{x}</a>)}
          </nav>
          <a className="btn" style={{background:"linear-gradient(135deg,#16a34a,#059669)"}} href="https://wa.me/923290882200">WhatsApp</a>
        </div>
      </header>

      <section className="container" style={{padding:"30px 0"}}>
        <div className="glass hero" style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",overflow:"hidden"}}>
          <div style={{padding:"38px"}}>
            <div style={{color:"#ff38dc",fontWeight:900,letterSpacing:1}}>MOBILE PARTS & REPAIRING SOLUTIONS</div>
            <h1 style={{fontSize:"clamp(44px,7vw,82px)",lineHeight:.9,margin:"12px 0",fontWeight:950}}>NEW <span style={{color:"#ffd21f"}}>ARIF</span></h1>
            <h2 style={{fontSize:32,margin:"0 0 20px"}}>MOBILE CENTER</h2>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              <span className="badge">🛡 Quality Parts</span><span className="badge">🔧 Expert Repairing</span>
              <span className="badge">👍 Trusted Service</span><span className="badge">⚡ Fast Service</span>
            </div>
            <div style={{marginTop:20,padding:15,border:"1px solid rgba(130,80,255,.5)",borderRadius:12}}>
              📍 <b>Al Saif Plaza, Kamar Mushani, Mianwali</b><br/><span style={{color:"#aeb5cc"}}>Visit Our Shop for Best Quality & Best Prices</span>
            </div>
          </div>
          <div style={{minHeight:360,background:"radial-gradient(circle at 50% 50%,rgba(119,0,255,.45),transparent 35%),linear-gradient(135deg,#11152b,#02050c)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{textAlign:"center",fontSize:80}}>🔬📱</div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginTop:14}}>
          {[
            ["🛠","Universal Tool Finder"],["🛍","Mobile Parts"],["⚙","Expert Repairing"],["🚚","Fast Service"],["🏆","Trusted Shop"]
          ].map(([i,t])=><div className="glass" key={t} style={{padding:18,textAlign:"center"}}><div style={{fontSize:30}}>{i}</div><b>{t}</b><div style={{fontSize:12,color:"#aeb5cc",marginTop:5}}>Professional service</div></div>)}
        </div>

        <section className="glass" style={{marginTop:14,padding:22}}>
          <h2>🔎 UNIVERSAL TOOL FINDER</h2>
          <p style={{color:"#aeb5cc"}}>Search from 100+ professional mobile-repair tools.</p>
          <div style={{display:"flex",gap:8}}>
            <input placeholder="Search tool e.g. x650" style={{flex:1,padding:14,borderRadius:10,border:"1px solid #6d28ff",background:"#070b18",color:"#fff"}}/>
            <button className="btn">Search</button>
          </div>
          <div style={{marginTop:14,padding:14,borderRadius:10,background:"#11182d"}}>
            ⭐ <b>X650 BGA Reballing Stencil</b> — automatically highlighted
          </div>
        </section>

        <section className="glass" style={{marginTop:14,padding:20}}>
          <h2>📦 MOBILE PARTS & PRODUCTS</h2>
          <div className="grid-products">
            {products.map(([icon,name,desc,price])=><article className="product" key={name}>
              <div className="pic">{icon}</div>
              <div className="info"><b>{name}</b><div style={{color:"#aeb5cc",fontSize:12,margin:"5px 0"}}>{desc}</div><strong style={{color:"#ffd21f"}}>{price}</strong></div>
            </article>)}
          </div>
        </section>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginTop:14}}>
          <div className="glass" style={{padding:20}}><h2>📣 LATEST UPDATES & OFFERS</h2><p>⭐ Best Quality Parts at Affordable Prices</p><p>⭐ All Mobile Repairing Solutions</p><p>⭐ New Stock Added Daily</p></div>
          <div className="glass" style={{padding:20}}><h2>🏆 WHY CHOOSE US?</h2><p>✅ 100% Original & Best Quality Parts</p><p>✅ Professional & Experienced Team</p><p>✅ Affordable Prices</p><p>✅ Quick Turnaround</p></div>
          <div className="glass" style={{padding:20}}><h2>➕ ADD YOUR PRODUCT</h2><p style={{color:"#aeb5cc"}}>Want to add your product or post something new?</p><a className="btn" href="#">Add New Item</a></div>
        </div>
      </section>

      <footer style={{borderTop:"1px solid rgba(255,255,255,.12)",padding:"22px 0",background:"#03050c"}}>
        <div className="container" style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap",color:"#aeb5cc"}}>
          <span>📍 Al Saif Plaza, Kamar Mushani, Mianwali</span>
          <span>💬 0329 0882200</span>
          <span>🎵 @newarifmobilecenter</span>
          <span>© 2024 New Arif Mobile Center</span>
        </div>
      </footer>
    </main>
  );
}
