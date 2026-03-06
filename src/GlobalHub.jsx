import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBALHUB — Full App  (Light / Professional Blue theme)
   Landing → Sign In/Up → Dashboard  (Globalize · Analytics · CMS)
   ═══════════════════════════════════════════════════════════════════════════ */

const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
  `}</style>
);

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const C = {
  bg:           "#F0F4F8",
  surface:      "#FFFFFF",
  card:         "#FFFFFF",
  sidebar:      "#1A2B4A",
  sidebarHover: "#243660",
  sidebarActive:"#2F4A82",
  primary:      "#2563EB",
  primaryDk:    "#1D4ED8",
  primaryLt:    "#EFF6FF",
  primaryMid:   "#BFDBFE",
  green:        "#10B981",
  greenLt:      "#D1FAE5",
  amber:        "#F59E0B",
  amberLt:      "#FEF3C7",
  coral:        "#EF4444",
  coralLt:      "#FEE2E2",
  purple:       "#7C3AED",
  purpleLt:     "#EDE9FE",
  teal:         "#0891B2",
  text:         "#0F172A",
  textSub:      "#475569",
  textMuted:    "#94A3B8",
  navText:      "#CBD5E1",
  navMuted:     "#64748B",
  border:       "#E2E8F0",
  borderMd:     "#CBD5E1",
  fH: "'Plus Jakarta Sans', system-ui, sans-serif",
  fB: "'Inter', system-ui, sans-serif",
  fM: "'Courier New', monospace",
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── Data ───────────────────────────────────────────────────────────────────── */
const MARKETS = [
  { code:"FR", name:"France",       flag:"🇫🇷", lang:"French",     lc:"fr", engine:"Google"   },
  { code:"DE", name:"Germany",      flag:"🇩🇪", lang:"German",     lc:"de", engine:"Google"   },
  { code:"ES", name:"Spain",        flag:"🇪🇸", lang:"Spanish",    lc:"es", engine:"Google"   },
  { code:"MX", name:"Mexico",       flag:"🇲🇽", lang:"Spanish",    lc:"es", engine:"Google"   },
  { code:"BR", name:"Brazil",       flag:"🇧🇷", lang:"Portuguese", lc:"pt", engine:"Google"   },
  { code:"JP", name:"Japan",        flag:"🇯🇵", lang:"Japanese",   lc:"ja", engine:"Yahoo JP" },
  { code:"CN", name:"China",        flag:"🇨🇳", lang:"Chinese",    lc:"zh", engine:"Baidu"    },
  { code:"KR", name:"South Korea",  flag:"🇰🇷", lang:"Korean",     lc:"ko", engine:"Naver"    },
  { code:"IN", name:"India",        flag:"🇮🇳", lang:"Hindi",      lc:"hi", engine:"Google"   },
  { code:"SA", name:"Saudi Arabia", flag:"🇸🇦", lang:"Arabic",     lc:"ar", engine:"Google"   },
  { code:"IT", name:"Italy",        flag:"🇮🇹", lang:"Italian",    lc:"it", engine:"Google"   },
  { code:"RU", name:"Russia",       flag:"🇷🇺", lang:"Russian",    lc:"ru", engine:"Yandex"   },
];

const CMS_PLATFORMS = [
  { id:"wordpress",  name:"WordPress",  icon:"W",  color:"#3858E9", desc:"Self-hosted or WordPress.com",    urlPattern:"/{lang}/{slug}",            auth:"Application Password",  authPH:"username:xxxx xxxx xxxx",  fields:[{key:"siteUrl",     label:"Site URL",      ph:"https://yourblog.com"}],             category:"Blog"      },
  { id:"ghost",      name:"Ghost",      icon:"G",  color:"#15171A", desc:"Ghost Pro or self-hosted",         urlPattern:"/{lang}/{slug}",            auth:"Admin API Key",         authPH:"64f8a1b2:7890abcdef…",     fields:[{key:"siteUrl",     label:"Site URL",      ph:"https://site.ghost.io"}],            category:"Blog"      },
  { id:"webflow",    name:"Webflow",    icon:"W",  color:"#4353FF", desc:"Webflow CMS Collections",          urlPattern:"/{lang}/{slug}",            auth:"Site API Token",        authPH:"xxxxxxxx-xxxx-xxxx-xxxx",  fields:[{key:"siteUrl",     label:"Site URL",      ph:"https://site.webflow.io"},{key:"collectionId",label:"Collection ID",ph:"64f8a1b2…"}], category:"No-code"   },
  { id:"contentful", name:"Contentful", icon:"C",  color:"#2478CC", desc:"Headless CMS · Content API",       urlPattern:"/{lang}/{slug}",            auth:"Content Mgmt Token",    authPH:"CFPAT-xxxxxxxxxxxxxxxx",   fields:[{key:"spaceId",     label:"Space ID",      ph:"xxxxxxxxxx"},{key:"environment",label:"Environment",ph:"master"}], category:"Headless"  },
  { id:"sanity",     name:"Sanity",     icon:"S",  color:"#F03E2F", desc:"Real-time content platform",       urlPattern:"/{lang}/{slug}",            auth:"API Token",             authPH:"skxxxxxxxxxxxxxxxx",       fields:[{key:"projectId",   label:"Project ID",    ph:"abc12345"},{key:"dataset",label:"Dataset",ph:"production"}], category:"Headless"  },
  { id:"github",     name:"GitHub",     icon:"GH", color:"#24292F", desc:"Git-based · MDX / Markdown",       urlPattern:"/{lang}/{slug}.md",         auth:"Personal Access Token", authPH:"ghp_xxxxxxxxxxxxxxxx",     fields:[{key:"repo",        label:"Repository",    ph:"owner/repo"},{key:"branch",label:"Branch",ph:"main"},{key:"contentPath",label:"Content Path",ph:"content/posts"}], category:"Git"       },
  { id:"shopify",    name:"Shopify",    icon:"S",  color:"#96BF48", desc:"Shopify Blogs & Articles",         urlPattern:"/{lang}/blogs/news/{slug}", auth:"Admin API Access Token",authPH:"shpat_xxxxxxxxxxxxxxxx",   fields:[{key:"storeDomain", label:"Store Domain",  ph:"store.myshopify.com"},{key:"blogId",label:"Blog ID",ph:"1234567890"}], category:"eCommerce" },
];

const CAT_COLORS = { Blog:"#2563EB", "No-code":"#7C3AED", Headless:"#F59E0B", Git:"#475569", eCommerce:"#10B981" };

/* ── Shared primitives ──────────────────────────────────────────────────────── */
function Badge({ children, color = C.primary, small }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding: small?"1px 8px":"3px 10px", borderRadius:999, fontSize: small?10:11, fontFamily:C.fH, fontWeight:700, background:`${color}15`, color, border:`1px solid ${color}25` }}>
      {children}
    </span>
  );
}

function Spinner({ size = 18, color = C.primary }) {
  return <span style={{ display:"inline-block", width:size, height:size, border:`2.5px solid ${color}25`, borderTopColor:color, borderRadius:"50%", animation:"gh-spin 0.7s linear infinite", flexShrink:0 }} />;
}

function ProgressBar({ value, color = C.primary, h = 6 }) {
  return (
    <div style={{ height:h, background:C.border, borderRadius:h, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(value,100)}%`, background:color, borderRadius:h, transition:"width 0.45s ease" }} />
    </div>
  );
}

function ShadowCard({ children, style, onClick, hoverable }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hoverable && setHov(true)}
      onMouseLeave={() => hoverable && setHov(false)}
      style={{ background:C.card, borderRadius:14, border:`1px solid ${hov?C.borderMd:C.border}`, boxShadow: hov?"0 8px 28px rgba(37,99,235,0.10)":"0 1px 6px rgba(0,0,0,0.06)", transition:"all 0.2s", transform: hov?"translateY(-2px)":"none", cursor: onClick?"pointer":"default", overflow:"hidden", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant="primary", disabled, full, small, style:s }) {
  const [hov, setHov] = useState(false);
  const vs = {
    primary: { bg:C.primary,    fg:"#fff",      border:"none",                     hbg:C.primaryDk },
    outline: { bg:"transparent",fg:C.primary,   border:`1.5px solid ${C.primary}`, hbg:C.primaryLt },
    ghost:   { bg:"transparent",fg:C.textSub,   border:`1px solid ${C.border}`,    hbg:C.bg        },
    danger:  { bg:C.coralLt,    fg:C.coral,     border:`1px solid ${C.coral}40`,   hbg:"#FECACA"   },
    white:   { bg:"#fff",       fg:C.primary,   border:"none",                     hbg:C.primaryLt },
    nav:     { bg:C.primary,    fg:"#fff",       border:"none",                     hbg:C.primaryDk },
  };
  const v = vs[variant]||vs.primary;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:small?"7px 16px":"10px 22px", borderRadius:9, border:v.border||"none", background:disabled?C.border:(hov?v.hbg:v.bg), color:disabled?C.textMuted:v.fg, fontFamily:C.fH, fontSize:small?12:13, fontWeight:700, cursor:disabled?"not-allowed":"pointer", letterSpacing:"0.01em", whiteSpace:"nowrap", width:full?"100%":"auto", transition:"background 0.15s, transform 0.1s", transform:hov&&!disabled?"translateY(-1px)":"none", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, ...s }}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type="text", mono, autoFocus }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:12, fontFamily:C.fH, color:C.textSub, fontWeight:600 }}>{label}</label>}
      <input autoFocus={autoFocus} type={type} value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.value)}
        style={{ padding:"11px 14px", background:focus?"#fff":C.bg, border:`1.5px solid ${focus?C.primary:C.border}`, borderRadius:9, color:C.text, fontFamily:mono?C.fM:C.fB, fontSize:13, outline:"none", transition:"border-color 0.2s, background 0.2s", width:"100%", boxShadow:focus?`0 0 0 3px ${C.primaryMid}40`:"none" }}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
function LandingPage({ onSignIn, onSignUp }) {
  const [urlDemo, setUrlDemo] = useState("");
  const [hovFeat, setHovFeat] = useState(null);
  const [hovStep, setHovStep] = useState(null);

  const steps = [
    { n:"1.", icon:"📄", title:"Upload Your Article",  desc:"Add your content URL to get started." },
    { n:"2.", icon:"🌍", title:"Select Countries",      desc:"Choose target regions & markets."     },
    { n:"3.", icon:"🚀", title:"Go Global",             desc:"Publish & track international traffic." },
  ];

  const features = [
    { icon:"🔍", title:"Smart Scraping",        desc:"Mozilla Readability extracts clean article text and metadata from any URL.",              color:C.primary },
    { icon:"🌐", title:"Cultural Translation",  desc:"Claude AI adapts content per market — tone, idioms, local context, not word-for-word.", color:C.green   },
    { icon:"📈", title:"SEO Automation",        desc:"Localized titles, meta, keywords, slugs and hreflang tags generated per locale.",        color:C.amber   },
    { icon:"⚡", title:"7 CMS Connectors",      desc:"WordPress, Ghost, Webflow, Contentful, Sanity, GitHub & Shopify.",                       color:C.purple  },
    { icon:"📊", title:"Global Analytics",      desc:"Track views, clicks and CTR by country and language from one unified dashboard.",        color:C.coral   },
    { icon:"🔗", title:"Clean Subfolder URLs",  desc:"/fr/article · /de/article — Google-compliant hreflang structure.",                      color:C.teal    },
  ];

  const cmsLogos = ["WordPress","Ghost","Webflow","Contentful","Sanity","GitHub","Shopify"];

  return (
    <div style={{ background:"#F8FAFC", minHeight:"100vh", fontFamily:C.fB, overflowX:"hidden" }}>

      {/* ── NAV ── */}
      <nav style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, height:64, display:"flex", alignItems:"center", padding:"0 48px", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:"auto" }}>
          <div style={{ width:36, height:36, background:`linear-gradient(135deg,${C.primary},#3B82F6)`, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>🌐</div>
          <span style={{ fontFamily:C.fH, fontSize:20, fontWeight:800, color:C.text }}>GlobalHub</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {["Features ▾","Pricing","Blog"].map(l=>(
            <button key={l} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:C.fB, fontSize:14, color:C.textSub, padding:"8px 14px", borderRadius:7, fontWeight:500, transition:"color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.color=C.text}
              onMouseLeave={e=>e.currentTarget.style.color=C.textSub}
            >{l}</button>
          ))}
          <div style={{ width:1, height:22, background:C.border, margin:"0 8px" }}/>
          <Btn onClick={onSignIn} variant="ghost" small>Login</Btn>
          <Btn onClick={onSignUp} small style={{ marginLeft:4, padding:"8px 24px", background:C.primary, borderRadius:8 }}>Get Started</Btn>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background:`linear-gradient(180deg, #1a2d54 0%, #1e3f7a 45%, #2060c8 100%)`, padding:"86px 48px 80px", position:"relative", overflow:"hidden", minHeight:420, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {/* World map dot pattern overlay */}
        <div style={{ position:"absolute", inset:0, opacity:0.18 }}>
          <svg width="100%" height="100%" viewBox="0 0 1400 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            {/* Continent silhouettes as abstract blob shapes */}
            <ellipse cx="220" cy="200" rx="160" ry="120" fill="white" opacity="0.5"/>
            <ellipse cx="220" cy="320" rx="80"  ry="60"  fill="white" opacity="0.4"/>
            <ellipse cx="520" cy="170" rx="200" ry="100" fill="white" opacity="0.5"/>
            <ellipse cx="600" cy="310" rx="120" ry="90"  fill="white" opacity="0.35"/>
            <ellipse cx="820" cy="180" rx="130" ry="85"  fill="white" opacity="0.5"/>
            <ellipse cx="900" cy="320" rx="90"  ry="70"  fill="white" opacity="0.4"/>
            <ellipse cx="1100" cy="200" rx="110" ry="130" fill="white" opacity="0.45"/>
            <ellipse cx="1250" cy="260" rx="80"  ry="100" fill="white" opacity="0.4"/>
            {/* Grid lines */}
            {[100,200,300,400].map(y=><line key={y} x1="0" y1={y} x2="1400" y2={y} stroke="white" strokeWidth="0.5" opacity="0.15"/>)}
            {[0,140,280,420,560,700,840,980,1120,1260,1400].map(x=><line key={x} x1={x} y1="0" x2={x} y2="500" stroke="white" strokeWidth="0.5" opacity="0.15"/>)}
            {/* Highlight dots for cities */}
            {[[220,190],[520,160],[820,175],[1100,195],[580,300],[900,310]].map(([cx,cy],i)=>(
              <circle key={i} cx={cx} cy={cy} r="4" fill="#60A5FA" opacity="0.9"/>
            ))}
          </svg>
        </div>

        <div style={{ maxWidth:680, textAlign:"center", position:"relative", zIndex:2 }}>
          <h1 style={{ fontFamily:C.fH, fontSize:"clamp(34px,5vw,58px)", fontWeight:800, color:"#fff", lineHeight:1.1, margin:"0 0 18px", letterSpacing:"-0.02em" }}>
            Publish Once.<br/>Rank Worldwide.
          </h1>
          <p style={{ fontSize:18, color:"rgba(255,255,255,0.78)", lineHeight:1.65, maxWidth:500, margin:"0 auto 40px", fontWeight:400 }}>
            Paste any article URL. GlobalHub translates, localizes SEO,  &amp; and publishes optimized pages to your CMS in multiple languages.
          </p>

          {/* URL input bar — matching the design exactly */}
          <div style={{ display:"flex", background:"#fff", borderRadius:10, boxShadow:"0 8px 40px rgba(0,0,0,0.28)", overflow:"hidden", maxWidth:560, margin:"0 auto" }}>
            <input value={urlDemo} onChange={e=>setUrlDemo(e.target.value)}
              placeholder="Enter your article URL"
              style={{ flex:1, padding:"16px 20px", border:"none", outline:"none", fontFamily:C.fB, fontSize:14, color:C.text, background:"transparent" }}
            />
            <button onClick={onSignUp}
              style={{ padding:"16px 26px", background:C.primary, color:"#fff", border:"none", cursor:"pointer", fontFamily:C.fH, fontSize:14, fontWeight:700, whiteSpace:"nowrap", transition:"background 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.primaryDk}
              onMouseLeave={e=>e.currentTarget.style.background=C.primary}
            >Translate &amp; Publish</button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background:"#fff", padding:"70px 48px 60px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:40, textAlign:"center" }}>
          {steps.map((s,i)=>(
            <div key={s.n} onMouseEnter={()=>setHovStep(i)} onMouseLeave={()=>setHovStep(null)}
              style={{ transition:"transform 0.2s", transform:hovStep===i?"translateY(-4px)":"none" }}>
              <div style={{ fontFamily:C.fH, fontSize:18, fontWeight:800, color:C.primary, marginBottom:16 }}>
                {s.n} {s.title}
              </div>
              <div style={{ width:90, height:90, background:C.primaryLt, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", fontSize:38, boxShadow:`0 4px 16px ${C.primaryMid}60` }}>
                {s.icon}
              </div>
              <div style={{ fontFamily:C.fB, fontSize:13, color:C.textSub, lineHeight:1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── YOUR GLOBAL REACH ── */}
      <section style={{ background:"#F8FAFC", padding:"60px 48px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <h2 style={{ fontFamily:C.fH, fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, color:C.text, textAlign:"center", margin:"0 0 44px" }}>Your Global Reach, Simplified</h2>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:24 }}>
            {/* Left: translation cards + metrics */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {[
                  { flag:"🇩🇪", country:"German Version",    bg:"#1A2B4A", title:"Beste KI-Tools für Startups",              sub:"Ranking der besten KI-Tools 2025" },
                  { flag:"🇧🇷", country:"Brazilian Version",  bg:"#10B981", title:"Melhores Ferramentas de IA para Startups",  sub:"Ranking das melhores ferramentas" },
                ].map(d=>(
                  <ShadowCard key={d.country}>
                    <div style={{ background:d.bg, padding:"10px 16px", display:"flex", alignItems:"center", gap:9 }}>
                      <span style={{ fontSize:18 }}>{d.flag}</span>
                      <span style={{ fontFamily:C.fH, fontSize:12, fontWeight:700, color:"#fff" }}>{d.country}</span>
                    </div>
                    <div style={{ padding:"16px 18px" }}>
                      <div style={{ fontFamily:C.fH, fontSize:14, fontWeight:700, color:C.text, marginBottom:8 }}>{d.title}</div>
                      <div style={{ height:4, background:C.border, borderRadius:4, marginBottom:5 }}/>
                      <div style={{ height:4, background:C.border, borderRadius:4, width:"65%" }}/>
                    </div>
                  </ShadowCard>
                ))}
              </div>

              {/* Stats bar */}
              <ShadowCard style={{ padding:"20px 28px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-around" }}>
                  {[{flag:"🇩🇪",bold:"1.5k",label:"Visitors"},{flag:"🇧🇷",bold:"+320",label:"Leads"},{flag:"🇫🇷",bold:"12",label:"Countries"}].map(m=>(
                    <div key={m.label} style={{ display:"flex", alignItems:"center", gap:9 }}>
                      <span style={{ fontSize:24 }}>{m.flag}</span>
                      <span style={{ fontFamily:C.fH, fontSize:17, fontWeight:800, color:C.text }}>{m.bold}</span>
                      <span style={{ fontFamily:C.fB, fontSize:13, color:C.textSub }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </ShadowCard>
            </div>

            {/* Right: traffic overview */}
            <ShadowCard style={{ padding:"22px 22px" }}>
              <div style={{ fontFamily:C.fH, fontSize:16, fontWeight:800, color:C.text, marginBottom:20 }}>Traffic Overview</div>
              {[{flag:"🇩🇪",country:"Germany",views:"4.2K Views",pct:85},{flag:"🇧🇷",country:"Brazil",views:"3.8K Views",pct:72},{flag:"🇫🇷",country:"France",views:"2.1K Views",pct:52}].map(m=>(
                <div key={m.country} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:17 }}>{m.flag}</span>
                    <span style={{ fontFamily:C.fH, fontSize:13, fontWeight:600, color:C.text, flex:1 }}>{m.country}:</span>
                    <span style={{ fontFamily:C.fH, fontSize:13, fontWeight:700, color:C.primary }}>{m.views}</span>
                  </div>
                  <ProgressBar value={m.pct} h={5}/>
                </div>
              ))}
              <div style={{ marginTop:20, paddingTop:18, borderTop:`1px solid ${C.border}` }}>
                <div style={{ fontFamily:C.fH, fontSize:12, fontWeight:700, color:C.text, marginBottom:4 }}>Top Keyword:</div>
                <div style={{ fontFamily:C.fB, fontSize:13, color:C.textSub, marginBottom:14 }}>"AI Tools for Startups"</div>
                {/* Mini line chart */}
                <div style={{ height:50, display:"flex", alignItems:"flex-end", gap:3 }}>
                  {[18,28,22,38,32,44,52,60,55,70].map((h,i)=>(
                    <div key={i} style={{ flex:1, borderRadius:"2px 2px 0 0", background:i===9?C.primary:`${C.primary}40`, height:`${h}%`, transition:"background 0.2s" }}/>
                  ))}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                  {["Jan","Feb","Mar","Apr"].map(m=>(
                    <span key={m} style={{ fontFamily:C.fB, fontSize:9, color:C.textMuted }}>{m}</span>
                  ))}
                </div>
              </div>
            </ShadowCard>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section style={{ background:"#fff", padding:"70px 48px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ display:"inline-block", padding:"5px 16px", borderRadius:999, background:C.primaryLt, color:C.primary, fontFamily:C.fH, fontSize:12, fontWeight:700, marginBottom:14 }}>Features</div>
            <h2 style={{ fontFamily:C.fH, fontSize:"clamp(24px,3.5vw,38px)", fontWeight:800, color:C.text, margin:"0 0 12px" }}>Everything you need to go global</h2>
            <p style={{ fontFamily:C.fB, fontSize:15, color:C.textSub }}>One platform. Every language. Every CMS.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {features.map((f,i)=>(
              <div key={f.title} onMouseEnter={()=>setHovFeat(i)} onMouseLeave={()=>setHovFeat(null)}
                style={{ padding:"28px 24px", borderRadius:14, border:`1.5px solid ${hovFeat===i?f.color+"50":C.border}`, background:hovFeat===i?`${f.color}06`:"#fff", transition:"all 0.2s", transform:hovFeat===i?"translateY(-3px)":"none", boxShadow:hovFeat===i?`0 8px 24px ${f.color}15`:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ width:50, height:50, borderRadius:12, background:`${f.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:16 }}>{f.icon}</div>
                <div style={{ fontFamily:C.fH, fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>{f.title}</div>
                <div style={{ fontFamily:C.fB, fontSize:13, color:C.textSub, lineHeight:1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CMS LOGOS STRIP ── */}
      <section style={{ background:"#F8FAFC", borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"26px 48px" }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
          <span style={{ fontFamily:C.fH, fontSize:11, color:C.textMuted, fontWeight:700, marginRight:12, letterSpacing:"0.08em", textTransform:"uppercase" }}>Publishes to</span>
          {cmsLogos.map(l=>(
            <div key={l} style={{ padding:"8px 20px", borderRadius:9, background:"#fff", border:`1px solid ${C.border}`, fontFamily:C.fH, fontSize:13, color:C.textSub, fontWeight:600, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>{l}</div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background:"#fff", padding:"80px 48px", textAlign:"center" }}>
        <div style={{ maxWidth:560, margin:"0 auto" }}>
          <h2 style={{ fontFamily:C.fH, fontSize:"clamp(26px,4vw,42px)", fontWeight:800, color:C.text, margin:"0 0 16px", lineHeight:1.15 }}>
            Boost Your Global Presence Today
          </h2>
          <p style={{ fontFamily:C.fB, fontSize:15, color:C.textSub, marginBottom:36, lineHeight:1.7 }}>
            Free to start. No credit card required. 10 articles/month on the Free plan.
          </p>
          <button onClick={onSignUp}
            style={{ padding:"17px 56px", borderRadius:10, background:C.primary, color:"#fff", border:"none", fontFamily:C.fH, fontSize:16, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 20px ${C.primary}40`, transition:"all 0.2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background=C.primaryDk; e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=C.primary; e.currentTarget.style.transform="translateY(0)"; }}
          >Get Started Now</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:C.sidebar, padding:"28px 48px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, background:C.primary, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🌐</div>
          <span style={{ fontFamily:C.fH, fontSize:15, fontWeight:700, color:"#fff" }}>GlobalHub</span>
        </div>
        <div style={{ display:"flex", gap:24 }}>
          {["Privacy","Terms","Docs","Contact"].map(l=>(
            <span key={l} style={{ fontFamily:C.fB, fontSize:12, color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>{l}</span>
          ))}
        </div>
        <div style={{ fontFamily:C.fB, fontSize:11, color:"rgba(255,255,255,0.3)" }}>© 2025 GlobalHub · Built with Claude AI</div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   AUTH PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
function AuthPage({ mode, onAuth, onSwitch, onBack }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const isSignUp = mode === "signup";

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && !name)) { setError("Please fill in all fields."); return; }
    setError(""); setLoading(true);
    await sleep(900 + Math.random() * 400);
    setLoading(false);
    onAuth({ name: name || email.split("@")[0], email });
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", fontFamily:C.fB }}>
      {/* Left blue panel */}
      <div style={{ flex:1, background:`linear-gradient(160deg,#1A2B4A 0%,#1e3f7a 50%,${C.primary} 100%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.10 }}>
          <svg width="100%" height="100%" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
            {[100,200,300,400,500,600,700].map(y=><line key={y} x1="0" y1={y} x2="600" y2={y} stroke="white" strokeWidth="0.8"/>)}
            {[0,100,200,300,400,500,600].map(x=><line key={x} x1={x} y1="0" x2={x} y2="800" stroke="white" strokeWidth="0.8"/>)}
          </svg>
        </div>
        <div style={{ position:"relative", zIndex:1, textAlign:"center", maxWidth:380 }}>
          <div style={{ fontSize:52, marginBottom:20 }}>🌐</div>
          <div style={{ fontFamily:C.fH, fontSize:30, fontWeight:800, color:"#fff", marginBottom:14, lineHeight:1.15 }}>Reach every corner<br/>of the world</div>
          <div style={{ fontFamily:C.fB, fontSize:14, color:"rgba(255,255,255,0.65)", lineHeight:1.7, marginBottom:36 }}>
            Paste a URL. Get 12 fully localized, SEO-optimized pages published to your CMS in under 30 seconds.
          </div>
          {[
            { flag:"🇩🇪", title:"Beste KI-Tools für Startups",          lang:"German"     },
            { flag:"🇧🇷", title:"Melhores Ferramentas de IA",           lang:"Portuguese" },
            { flag:"🇫🇷", title:"Meilleurs Outils IA pour Startups",   lang:"French"     },
          ].map(d=>(
            <div key={d.lang} style={{ background:"rgba(255,255,255,0.09)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:11, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, textAlign:"left", marginBottom:10 }}>
              <span style={{ fontSize:22 }}>{d.flag}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:C.fH, fontSize:13, fontWeight:600, color:"#fff" }}>{d.title}</div>
                <div style={{ fontFamily:C.fB, fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{d.lang} · SEO optimized</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right white form */}
      <div style={{ width:460, background:"#fff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 48px", boxShadow:"-4px 0 24px rgba(0,0,0,0.06)" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontFamily:C.fB, fontSize:12, marginBottom:36, padding:0, alignSelf:"flex-start" }}>← Back to home</button>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
          <div style={{ width:36, height:36, background:C.primary, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🌐</div>
          <span style={{ fontFamily:C.fH, fontSize:20, fontWeight:800, color:C.text }}>GlobalHub</span>
        </div>
        <div style={{ width:"100%" }}>
          <h1 style={{ fontFamily:C.fH, fontSize:26, fontWeight:800, color:C.text, margin:"0 0 6px" }}>{isSignUp?"Create your account":"Welcome back"}</h1>
          <p style={{ fontFamily:C.fB, fontSize:14, color:C.textSub, marginBottom:26 }}>{isSignUp?"Start globalizing your content today.":"Sign in to your GlobalHub workspace."}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {isSignUp && <Field label="Full name" value={name} onChange={setName} placeholder="Jane Smith" autoFocus/>}
            <Field label="Email address" value={email} onChange={setEmail} placeholder="you@company.com" type="email" autoFocus={!isSignUp}/>
            <Field label="Password" value={password} onChange={setPassword} placeholder={isSignUp?"Create a strong password":"Your password"} type="password"/>
          </div>
          {error && <div style={{ marginTop:12, padding:"10px 14px", background:C.coralLt, border:`1px solid ${C.coral}40`, borderRadius:8, fontFamily:C.fB, fontSize:13, color:C.coral }}>{error}</div>}
          <Btn onClick={handleSubmit} disabled={loading} full style={{ marginTop:22, padding:"14px 0", fontSize:14 }}>
            {loading?"…":isSignUp?"Create account →":"Sign in →"}
          </Btn>
          <div style={{ margin:"20px 0", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, height:1, background:C.border }}/>
            <span style={{ fontFamily:C.fB, fontSize:12, color:C.textMuted }}>or continue with</span>
            <div style={{ flex:1, height:1, background:C.border }}/>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {[{label:"Google",icon:"G"},{label:"GitHub",icon:"⬡"}].map(s=>(
              <button key={s.label} onClick={()=>onAuth({name:"Demo User",email:"demo@globalhub.io"})}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px 0", borderRadius:9, background:"#fff", border:`1.5px solid ${C.border}`, fontFamily:C.fH, fontSize:13, fontWeight:600, color:C.text, cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                onMouseLeave={e=>e.currentTarget.style.background="#fff"}
              ><span style={{ fontWeight:800 }}>{s.icon}</span>{s.label}</button>
            ))}
          </div>
          <p style={{ textAlign:"center", fontFamily:C.fB, fontSize:13, color:C.textSub, marginTop:22 }}>
            {isSignUp?"Already have an account? ":"Don't have an account? "}
            <button onClick={onSwitch} style={{ background:"none", border:"none", cursor:"pointer", color:C.primary, fontFamily:C.fH, fontSize:13, fontWeight:700, padding:0 }}>
              {isSignUp?"Sign in":"Sign up free"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SIDEBAR
   ══════════════════════════════════════════════════════════════════════════════ */
const NAV = [
  { id:"globalize", icon:"🌐", label:"Globalize",  sub:"Scrape · Translate · SEO" },
  { id:"analytics", icon:"📊", label:"Analytics",  sub:"Performance by region"    },
  { id:"cms",       icon:"⚡", label:"CMS",         sub:"Publish to 7 platforms"   },
];

function Sidebar({ active, setActive, user, articleCount, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <aside style={{ width:240, minHeight:"100vh", flexShrink:0, background:C.sidebar, display:"flex", flexDirection:"column", boxShadow:"2px 0 12px rgba(0,0,0,0.18)" }}>
      <div style={{ padding:"22px 20px 18px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, background:C.primary, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🌐</div>
          <div>
            <div style={{ fontFamily:C.fH, fontSize:16, fontWeight:800, color:"#fff" }}>GlobalHub</div>
            <div style={{ fontFamily:C.fB, fontSize:10, color:C.navMuted, marginTop:1 }}>Content Platform</div>
          </div>
        </div>
      </div>

      <nav style={{ padding:"14px 10px", flex:1 }}>
        <div style={{ fontFamily:C.fH, fontSize:10, color:C.navMuted, letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 12px 10px", fontWeight:700 }}>Workspace</div>
        {NAV.map(item=>{
          const on = active===item.id;
          return (
            <button key={item.id} onClick={()=>setActive(item.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:on?C.sidebarActive:"transparent", marginBottom:2, transition:"background 0.15s", textAlign:"left" }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background=C.sidebarHover; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="transparent"; }}
            >
              <span style={{ fontSize:16, width:22, textAlign:"center" }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily:C.fH, fontSize:13, fontWeight:on?700:500, color:on?"#fff":C.navText }}>{item.label}</div>
                <div style={{ fontFamily:C.fB, fontSize:9, color:C.navMuted, marginTop:1 }}>{item.sub}</div>
              </div>
              {on && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:"#34D399", boxShadow:"0 0 6px #34D399" }}/>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:"0 12px 14px" }}>
        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:11, padding:"14px", marginBottom:10 }}>
          <div style={{ fontFamily:C.fH, fontSize:10, color:C.navMuted, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:700, marginBottom:8 }}>Articles This Month</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:8 }}>
            <span style={{ fontFamily:C.fH, fontSize:24, fontWeight:800, color:"#fff" }}>{articleCount}</span>
            <span style={{ fontFamily:C.fB, fontSize:11, color:C.navMuted }}>/10 free</span>
          </div>
          <ProgressBar value={(articleCount/10)*100} h={4}/>
          <button style={{ marginTop:10, width:"100%", padding:"7px 0", borderRadius:7, background:C.primary, border:"none", color:"#fff", fontFamily:C.fH, fontSize:11, fontWeight:700, cursor:"pointer" }}>Upgrade Plan ↑</button>
        </div>

        <div style={{ position:"relative" }}>
          <button onClick={()=>setMenuOpen(p=>!p)} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"9px 12px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:10, cursor:"pointer", textAlign:"left" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.10)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
          >
            <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${C.primary},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:C.fH, fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>{user.name.charAt(0).toUpperCase()}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:C.fH, fontSize:12, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</div>
              <div style={{ fontFamily:C.fB, fontSize:10, color:C.navMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
            </div>
            <span style={{ color:C.navMuted, fontSize:10 }}>⌄</span>
          </button>
          {menuOpen && (
            <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, right:0, background:"#1E3055", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, overflow:"hidden", zIndex:200 }}>
              {["Account settings","Upgrade plan"].map(item=>(
                <button key={item} onClick={()=>setMenuOpen(false)} style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", cursor:"pointer", fontFamily:C.fH, fontSize:12, color:C.navText, textAlign:"left" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}
                >{item}</button>
              ))}
              <div style={{ height:1, background:"rgba(255,255,255,0.08)" }}/>
              <button onClick={onSignOut} style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", cursor:"pointer", fontFamily:C.fH, fontSize:12, color:"#F87171", textAlign:"left" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.background="none"}
              >→ Sign out</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   DASHBOARD TOPBAR
   ══════════════════════════════════════════════════════════════════════════════ */
function TopBar({ title, subtitle, right }) {
  return (
    <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, padding:"16px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
      <div>
        <h1 style={{ fontFamily:C.fH, fontSize:20, fontWeight:800, color:C.text, margin:0 }}>{title}</h1>
        {subtitle && <div style={{ fontFamily:C.fB, fontSize:12, color:C.textSub, marginTop:2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   GLOBALIZE VIEW
   ══════════════════════════════════════════════════════════════════════════════ */
const PIPE = [
  {label:"Extracting article"},{label:"Translating content"},
  {label:"Generating SEO"},{label:"Building pages"},{label:"Complete"},
];

function StepDot({ n, active, done }) {
  return (
    <div style={{ width:26,height:26,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontFamily:C.fH,fontWeight:700,background:done?C.primary:active?C.primaryLt:C.border,color:done?"#fff":active?C.primary:C.textMuted,border:`2px solid ${done?C.primary:active?C.primary:C.border}`,transition:"all 0.2s" }}>
      {done?"✓":n}
    </div>
  );
}

function GlobalizeView({ onArticleAdded }) {
  const [url, setUrl]           = useState("");
  const [selected, setSelected] = useState([]);
  const [phase, setPhase]       = useState("idle");
  const [pipeStep, setPipeStep] = useState(0);
  const [logs, setLogs]         = useState([]);
  const [results, setResults]   = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied]     = useState(null);
  const logRef                  = useRef(null);

  const addLog = (msg, type="muted") => setLogs(p=>[...p,{msg,type}]);
  const toggle = code => setSelected(p=>p.includes(code)?p.filter(c=>c!==code):[...p,code]);
  const copy   = (text,key) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1600); };
  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[logs]);

  const runPipeline = async () => {
    if(!url||!selected.length) return;
    setPhase("running"); setLogs([]); setResults([]); setPipeStep(0);
    const markets = MARKETS.filter(m=>selected.includes(m.code));
    const domain  = (()=>{ try{return new URL(url).hostname.replace("www.","")}catch{return "source.com"} })();
    addLog(`Connecting to ${domain}…`,"accent"); setPipeStep(0); await sleep(600);
    addLog(`200 OK · Readability extracted · ${Math.floor(Math.random()*600+900)} words`); await sleep(300);
    setPipeStep(1); addLog(`Starting AI pipeline — ${markets.length} markets…`,"accent");
    const generated = [];
    try {
      addLog(`Calling Claude API…`);
      const prompt = `You are GlobalHub's localization AI. Given article URL: ${url}
Generate localized content for: ${markets.map(m=>`${m.flag} ${m.name} (${m.lang})`).join(", ")}
Return a JSON array, one object per market:
- countryCode (2-letter ISO)
- localizedTitle (culturally adapted, native feel, target language)
- seoTitle (50-60 chars, SEO-optimized, target language)
- metaDescription (140-160 chars, compelling, target language)
- keywords (array of 5 target-language keywords)
- slug (latin chars, 3-6 words, hyphens)
- excerpt (1-2 sentences target language)
- culturalNote (one specific cultural adaptation insight)
Return ONLY valid JSON array. No markdown.`;
      const res  = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3000,messages:[{role:"user",content:prompt}]})});
      const data = await res.json();
      const raw  = data.content?.map(b=>b.text||"").join("")||"";
      let aiArr = [];
      try{aiArr=JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{}
      for(const m of markets){
        setPipeStep(1); addLog(`${m.flag} ${m.name} — ${m.lang}…`,"text"); await sleep(160);
        const ai=aiArr.find(r=>r.countryCode===m.code)||{};
        const lt=ai.localizedTitle||`Article for ${m.name}`;
        const st=ai.seoTitle||lt.slice(0,60);
        const md=ai.metaDescription||`Adapted content for ${m.name}.`;
        const kws=Array.isArray(ai.keywords)?ai.keywords:[m.lang,"guide",domain];
        const sl=ai.slug||`${domain.split(".")[0]}-${m.lc}`;
        const ex=ai.excerpt||md;
        const cn=ai.culturalNote||`Adapted for ${m.name} audience`;
        addLog(`  ✓ "${st.slice(0,52)}…"`,"success");
        setPipeStep(2); await sleep(100); addLog(`  ✓ ${kws.length} keywords · /${m.lc}/${sl}`);
        setPipeStep(3); await sleep(80);  addLog(`  ✓ HTML + hreflang ${m.lc}-${m.code} + Schema.org`);
        generated.push({market:m,localizedTitle:lt,seoTitle:st,metaDescription:md,keywords:kws,slug:`/${m.lc}/${sl}`,excerpt:ex,culturalNote:cn,wordCount:Math.floor(Math.random()*400+900),readingTime:Math.floor(Math.random()*3+4),seoScore:Math.floor(Math.random()*12+85),hreflang:`${m.lc}-${m.code}`});
      }
    } catch {
      addLog(`Using offline pipeline`,"warn");
      for(const m of markets){
        generated.push({market:m,localizedTitle:`Article — ${m.name}`,seoTitle:`${domain} | ${m.name} 2024`,metaDescription:`Content adapted for ${m.name}.`,keywords:[m.lang,domain,m.name,"guide","2024"],slug:`/${m.lc}/${domain.split(".")[0]}`,excerpt:`Discover this for ${m.name}.`,culturalNote:`Adapted for ${m.name} market`,wordCount:Math.floor(Math.random()*400+900),readingTime:Math.floor(Math.random()*3+4),seoScore:Math.floor(Math.random()*12+85),hreflang:`${m.lc}-${m.code}`});
        await sleep(80);
      }
    }
    setPipeStep(4); addLog(`Done — ${generated.length} pages ready · Avg SEO: ${Math.round(generated.reduce((s,r)=>s+r.seoScore,0)/generated.length)}`,"success");
    setResults(generated); setPhase("done"); onArticleAdded();
  };

  const logColors={accent:C.primary,success:C.green,warn:C.amber,text:C.text,muted:C.textMuted};
  const reset = ()=>{setPhase("idle");setResults([]);setLogs([]);setUrl("");setSelected([]);};

  return (
    <div style={{flex:1,overflowY:"auto",background:C.bg,display:"flex",flexDirection:"column"}}>
      <TopBar title="Globalize Article" subtitle="Scrape → AI Translate → SEO → Publish"
        right={phase==="done"?<Btn onClick={reset} variant="outline" small>← New Article</Btn>:null}/>
      <div style={{padding:"24px 32px"}}>

        {/* Pipeline stepper */}
        {phase!=="idle"&&(
          <ShadowCard style={{padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:0,flexWrap:"wrap"}}>
            {PIPE.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,background:i===pipeStep&&phase==="running"?C.primaryLt:"transparent"}}>
                <StepDot n={i+1} active={i===pipeStep&&phase==="running"} done={i<pipeStep||phase==="done"}/>
                <span style={{fontFamily:C.fH,fontSize:11,fontWeight:600,color:i<=pipeStep||phase==="done"?C.text:C.textMuted,whiteSpace:"nowrap"}}>{s}</span>
                {i===pipeStep&&phase==="running"&&<Spinner size={11}/>}
              </div>
            ))}
          </ShadowCard>
        )}

        {/* IDLE */}
        {phase==="idle"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:860}}>
            <ShadowCard style={{padding:"22px 26px"}}>
              <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Article URL</div>
              <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                <div style={{flex:1}}><Field value={url} onChange={setUrl} placeholder="https://techcrunch.com/2024/article-title/" autoFocus/></div>
              </div>
              {url&&(()=>{try{return new URL(url).hostname}catch{return null}})()&&(
                <div style={{marginTop:8,display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>
                  <span style={{fontFamily:C.fH,fontSize:11,fontWeight:600,color:C.green}}>{(()=>{try{return new URL(url).hostname}catch{return ""}})()}</span>
                </div>
              )}
            </ShadowCard>

            <ShadowCard style={{padding:"22px 26px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:C.text}}>Target Markets <span style={{color:C.textMuted,fontWeight:500,fontSize:12}}>— {selected.length} selected</span></div>
                <div style={{display:"flex",gap:6}}>
                  <Btn onClick={()=>setSelected(MARKETS.map(m=>m.code))} variant="ghost" small>All</Btn>
                  <Btn onClick={()=>setSelected([])} variant="ghost" small>None</Btn>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {MARKETS.map(m=>{
                  const on=selected.includes(m.code);
                  return(
                    <button key={m.code} onClick={()=>toggle(m.code)} style={{padding:"10px 10px",borderRadius:10,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8,transition:"all 0.15s",border:`1.5px solid ${on?C.primary:C.border}`,background:on?C.primaryLt:"#fff",boxShadow:on?`0 0 0 3px ${C.primaryMid}30`:"none"}}>
                      <span style={{fontSize:20}}>{m.flag}</span>
                      <div style={{minWidth:0}}>
                        <div style={{fontFamily:C.fH,fontSize:11,fontWeight:700,color:on?C.primary:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                        <div style={{fontFamily:C.fB,fontSize:9,color:C.textMuted}}>{m.engine}</div>
                      </div>
                      {on&&<span style={{marginLeft:"auto",color:C.primary,fontSize:13}}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </ShadowCard>

            <Btn onClick={runPipeline} disabled={!url||!selected.length} style={{alignSelf:"flex-start",padding:"13px 36px",fontSize:14,borderRadius:11}}>
              🌐 Globalize Article →
            </Btn>
          </div>
        )}

        {/* RUNNING */}
        {phase==="running"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:16,maxWidth:900}}>
            <ShadowCard style={{padding:"18px 22px"}}>
              <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Pipeline Log</div>
              <div ref={logRef} style={{height:340,overflowY:"auto",fontFamily:C.fM,fontSize:12,lineHeight:1.9,background:C.bg,borderRadius:9,padding:"12px 14px"}}>
                {logs.map((l,i)=><div key={i} style={{color:logColors[l.type]||C.textMuted}}>{l.msg}</div>)}
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><Spinner size={12}/><span style={{color:C.primary,fontFamily:C.fH,fontSize:11}}>Claude is thinking…</span></div>
              </div>
            </ShadowCard>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontFamily:C.fH,fontSize:12,fontWeight:700,color:C.textSub,marginBottom:4}}>Processing Markets</div>
              {MARKETS.filter(m=>selected.includes(m.code)).map((m,i)=>{
                const done=i*3<Math.max(0,(pipeStep-1)*4);
                return(
                  <div key={m.code} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 13px",borderRadius:10,background:"#fff",border:`1.5px solid ${done?C.primary+"40":C.border}`,transition:"all 0.3s",boxShadow:done?`0 0 0 3px ${C.primaryMid}20`:"none"}}>
                    <span style={{fontSize:18}}>{m.flag}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:C.fH,fontSize:12,fontWeight:600,color:C.text}}>{m.name}</div>
                      <div style={{fontFamily:C.fB,fontSize:9,color:C.textMuted}}>{m.lang}</div>
                    </div>
                    {done?<span style={{color:C.green,fontSize:15}}>✓</span>:<Spinner size={12} color={C.primary}/>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DONE */}
        {phase==="done"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:920}}>
            {/* Summary */}
            <div style={{background:C.primaryLt,border:`1.5px solid ${C.primaryMid}`,borderRadius:12,padding:"14px 22px",display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
              <div style={{fontFamily:C.fH,fontSize:16,fontWeight:800,color:C.primary}}>{results.length} pages generated</div>
              <div style={{width:1,height:24,background:C.primaryMid}}/>
              <span style={{fontFamily:C.fH,fontSize:13,fontWeight:600,color:C.primary}}>{results.reduce((s,r)=>s+r.wordCount,0).toLocaleString()} words translated</span>
              <span style={{fontFamily:C.fH,fontSize:13,fontWeight:600,color:C.primary}}>Avg SEO: {Math.round(results.reduce((s,r)=>s+r.seoScore,0)/results.length)}</span>
              <div style={{marginLeft:"auto",display:"flex",gap:7}}>
                <Badge color={C.primary}>{results.length+1} hreflang tags</Badge>
                <Badge color={C.green}>Schema.org ✓</Badge>
              </div>
            </div>

            {results.map((r,i)=>{
              const open=expanded===i;
              return(
                <ShadowCard key={i} style={{border:`1.5px solid ${open?C.primary+"50":C.border}`,animation:`ghFadeUp 0.3s ease ${i*0.04}s both`}}>
                  <div onClick={()=>setExpanded(open?null:i)} style={{padding:"16px 22px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                    <span style={{fontSize:28}}>{r.market.flag}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontFamily:C.fH,fontSize:14,fontWeight:700,color:C.text}}>{r.market.name}</span>
                        <Badge color={C.primary} small>{r.market.lang}</Badge>
                        <Badge color={C.purple} small>{r.market.engine}</Badge>
                      </div>
                      <div style={{fontFamily:C.fB,fontSize:12,color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:500}}>{r.seoTitle}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:20}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontFamily:C.fH,fontSize:22,fontWeight:800,color:r.seoScore>=90?C.green:r.seoScore>=80?C.amber:C.coral}}>{r.seoScore}</div>
                        <div style={{fontFamily:C.fB,fontSize:9,color:C.textMuted}}>SEO</div>
                      </div>
                      <div style={{fontFamily:C.fB,fontSize:11,color:C.textMuted,textAlign:"right"}}>{r.wordCount.toLocaleString()} words<br/>{r.readingTime} min read</div>
                      <div style={{color:C.textMuted,fontSize:16,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>⌄</div>
                    </div>
                  </div>

                  {open&&(
                    <div style={{borderTop:`1px solid ${C.border}`,padding:"20px 22px",background:C.bg}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                        {[{label:"Localized Title",value:r.localizedTitle,len:r.localizedTitle.length,max:60},{label:"Meta Description",value:r.metaDescription,len:r.metaDescription.length,max:160}].map(f=>(
                          <ShadowCard key={f.label} style={{padding:"14px 16px"}}>
                            <div style={{fontFamily:C.fH,fontSize:10,fontWeight:700,color:C.primary,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{f.label}</div>
                            <div style={{fontFamily:C.fB,fontSize:13,color:C.text,lineHeight:1.5,marginBottom:6}}>{f.value}</div>
                            <div style={{fontFamily:C.fH,fontSize:10,fontWeight:600,color:f.len>f.max?C.amber:C.green}}>{f.len}/{f.max} chars</div>
                          </ShadowCard>
                        ))}
                        <ShadowCard style={{padding:"14px 16px"}}>
                          <div style={{fontFamily:C.fH,fontSize:10,fontWeight:700,color:C.primary,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Keywords</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                            {r.keywords.map(k=><span key={k} style={{padding:"3px 10px",borderRadius:999,background:C.primaryLt,fontFamily:C.fH,fontSize:11,fontWeight:600,color:C.primary}}>{k}</span>)}
                          </div>
                        </ShadowCard>
                        <ShadowCard style={{padding:"14px 16px",background:C.amberLt,border:`1px solid ${C.amber}30`}}>
                          <div style={{fontFamily:C.fH,fontSize:10,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Cultural Adaptation</div>
                          <div style={{fontFamily:C.fB,fontSize:12,color:C.text,lineHeight:1.5}}>{r.culturalNote}</div>
                        </ShadowCard>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                        {[{label:"Localized URL",value:r.slug,key:`slug-${i}`},{label:"Hreflang Tag",value:`hreflang="${r.hreflang}"`,key:`hl-${i}`}].map(f=>(
                          <div key={f.key} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",borderRadius:9,padding:"11px 14px",border:`1px solid ${C.border}`}}>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:C.fH,fontSize:9,fontWeight:700,color:C.textMuted,textTransform:"uppercase",marginBottom:3}}>{f.label}</div>
                              <div style={{fontFamily:C.fM,fontSize:12,color:C.primary}}>{f.value}</div>
                            </div>
                            <Btn onClick={()=>copy(f.value,f.key)} variant="ghost" small>{copied===f.key?"✓":"Copy"}</Btn>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn small>↓ Download HTML</Btn>
                        <Btn variant="outline" small>Export JSON</Btn>
                      </div>
                    </div>
                  )}
                </ShadowCard>
              );
            })}

            <ShadowCard style={{padding:"18px 22px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:C.text}}>Complete Hreflang Block</div>
                <Btn onClick={()=>copy(results.map(r=>`<link rel="alternate" hreflang="${r.hreflang}" href="https://example.com${r.slug}" />`).join("\n")+'\n<link rel="alternate" hreflang="x-default" href="https://example.com/en/original" />',"all-hl")} variant="outline" small>
                  {copied==="all-hl"?"✓ Copied!":"Copy All"}
                </Btn>
              </div>
              <pre style={{background:C.bg,borderRadius:9,padding:"14px 16px",fontFamily:C.fM,fontSize:11,color:C.textSub,overflow:"auto",lineHeight:1.9,margin:0}}>
{results.map(r=>`<link rel="alternate" hreflang="${r.hreflang}" href="https://example.com${r.slug}" />`).join("\n")}
{'\n<link rel="alternate" hreflang="x-default" href="https://example.com/en/original" />'}
              </pre>
            </ShadowCard>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ANALYTICS VIEW
   ══════════════════════════════════════════════════════════════════════════════ */
const ANA = {
  weekly:[{d:"Mon",v:38200,c:6100},{d:"Tue",v:41500,c:6800},{d:"Wed",v:44100,c:7400},{d:"Thu",v:39800,c:6500},{d:"Fri",v:43200,c:7200},{d:"Sat",v:35100,c:5600},{d:"Sun",v:31200,c:4900}],
  markets:[
    {code:"FR",name:"France",     flag:"🇫🇷",views:74200,clicks:14100,ctr:19.0,trend:+18,color:C.primary},
    {code:"DE",name:"Germany",    flag:"🇩🇪",views:52800,clicks:9200, ctr:17.4,trend:+12,color:C.teal},
    {code:"MX",name:"Mexico",     flag:"🇲🇽",views:41300,clicks:6800, ctr:16.5,trend:+34,color:C.amber},
    {code:"BR",name:"Brazil",     flag:"🇧🇷",views:38100,clicks:5900, ctr:15.5,trend:+28,color:C.green},
    {code:"JP",name:"Japan",      flag:"🇯🇵",views:31500,clicks:4400, ctr:14.0,trend:-3, color:"#EC4899"},
    {code:"ES",name:"Spain",      flag:"🇪🇸",views:24600,clicks:3700, ctr:15.0,trend:+9, color:C.purple},
    {code:"KR",name:"S. Korea",   flag:"🇰🇷",views:18900,clicks:2600, ctr:13.8,trend:+41,color:"#F97316"},
    {code:"IT",name:"Italy",      flag:"🇮🇹",views:14200,clicks:1980, ctr:13.9,trend:+7, color:"#14B8A6"},
  ],
  langs:[
    {lang:"French",    articles:24,clicks:14100,ctr:19.0},
    {lang:"German",    articles:19,clicks:9200, ctr:17.4},
    {lang:"Spanish",   articles:31,clicks:12500,ctr:16.8},
    {lang:"Portuguese",articles:16,clicks:5900, ctr:15.5},
    {lang:"Japanese",  articles:11,clicks:4400, ctr:14.0},
    {lang:"Korean",    articles:8, clicks:2600, ctr:13.8},
  ],
};

function AnalyticsView() {
  const [metric, setMetric] = useState("views");
  const [hov, setHov]       = useState(null);
  const maxV=Math.max(...ANA.weekly.map(w=>w.v));
  const maxC=Math.max(...ANA.weekly.map(w=>w.c));
  const maxL=Math.max(...ANA.langs.map(l=>l.clicks));
  const lc=[C.primary,C.teal,C.amber,C.green,"#EC4899",C.purple];

  const kpis=[
    {label:"Total Views",  value:"284,729",    trend:"+23.4%", icon:"👁",  color:C.primary},
    {label:"Total Clicks", value:"47,382",     trend:"+11.2%", icon:"🖱",  color:C.green},
    {label:"Avg. CTR",     value:"16.6%",      trend:"+2.1%",  icon:"📈", color:C.amber},
    {label:"Top Market",   value:"France 🇫🇷",  trend:"19% CTR",icon:"🏆", color:C.purple},
  ];

  return (
    <div style={{flex:1,overflowY:"auto",background:C.bg,display:"flex",flexDirection:"column"}}>
      <TopBar title="Global Analytics" subtitle="Performance across all markets"
        right={
          <div style={{display:"flex",gap:5}}>
            {["7d","30d","90d"].map((p,i)=><Btn key={p} variant={i===1?"primary":"ghost"} small>{p}</Btn>)}
          </div>
        }/>
      <div style={{padding:"24px 32px"}}>

        {/* KPI cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
          {kpis.map((k,i)=>(
            <ShadowCard key={k.label} hoverable style={{padding:"20px 22px",animation:`ghFadeUp 0.4s ease ${i*0.07}s both`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontFamily:C.fH,fontSize:12,fontWeight:600,color:C.textSub}}>{k.label}</span>
                <div style={{width:38,height:38,borderRadius:10,background:`${k.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{k.icon}</div>
              </div>
              <div style={{fontFamily:C.fH,fontSize:26,fontWeight:800,color:C.text,marginBottom:6}}>{k.value}</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontFamily:C.fH,fontSize:11,fontWeight:700,color:C.green}}>↑ {k.trend}</span>
                <span style={{fontFamily:C.fB,fontSize:11,color:C.textMuted}}>vs last period</span>
              </div>
            </ShadowCard>
          ))}
        </div>

        {/* Charts */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16,marginBottom:16}}>
          <ShadowCard style={{padding:"20px 24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <div>
                <div style={{fontFamily:C.fH,fontSize:15,fontWeight:700,color:C.text}}>Weekly Activity</div>
                <div style={{fontFamily:C.fB,fontSize:11,color:C.textSub,marginTop:2}}>Last 7 days</div>
              </div>
              <div style={{display:"flex",gap:5}}>
                {["views","clicks"].map(m=><Btn key={m} onClick={()=>setMetric(m)} variant={metric===m?"primary":"ghost"} small>{m}</Btn>)}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,height:160,position:"relative"}}>
              {[0,25,50,75,100].map(p=><div key={p} style={{position:"absolute",left:0,right:0,bottom:`${p}%`,height:1,background:C.border}}/>)}
              {ANA.weekly.map((w,i)=>{
                const val=metric==="views"?w.v:w.c;
                const max=metric==="views"?maxV:maxC;
                const h=(val/max)*160;
                const isH=hov===i;
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end",gap:4,position:"relative"}}>
                    {isH&&<div style={{position:"absolute",bottom:h+10,background:"#1E293B",borderRadius:7,padding:"5px 10px",fontFamily:C.fH,fontSize:11,color:"#fff",whiteSpace:"nowrap",zIndex:10,pointerEvents:"none"}}>
                      <div style={{color:"#94A3B8",fontSize:9}}>{w.d}</div>
                      <div style={{fontWeight:700}}>{val.toLocaleString()}</div>
                    </div>}
                    <div onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
                      style={{width:"100%",height:h,background:isH?C.primaryDk:C.primary,borderRadius:"5px 5px 0 0",cursor:"pointer",transition:"background 0.15s"}}/>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              {ANA.weekly.map(w=><div key={w.d} style={{flex:1,textAlign:"center",fontFamily:C.fB,fontSize:10,color:C.textMuted}}>{w.d}</div>)}
            </div>
          </ShadowCard>

          <ShadowCard style={{padding:"20px 22px"}}>
            <div style={{fontFamily:C.fH,fontSize:15,fontWeight:700,color:C.text,marginBottom:16}}>Views by Country</div>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {ANA.markets.map(m=>(
                <div key={m.code} style={{padding:"7px 10px",borderRadius:8,background:C.bg,transition:"background 0.15s",cursor:"default"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.border}
                  onMouseLeave={e=>e.currentTarget.style.background=C.bg}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                    <span style={{fontSize:14}}>{m.flag}</span>
                    <span style={{fontFamily:C.fH,fontSize:11,fontWeight:600,color:C.text,flex:1}}>{m.name}</span>
                    <span style={{fontFamily:C.fH,fontSize:11,fontWeight:700,color:C.textSub}}>{m.views.toLocaleString()}</span>
                    <span style={{fontFamily:C.fH,fontSize:10,fontWeight:700,color:m.trend>=0?C.green:C.coral}}>{m.trend>=0?"↑":"↓"}{Math.abs(m.trend)}%</span>
                  </div>
                  <ProgressBar value={(m.views/ANA.markets[0].views)*100} color={m.color} h={4}/>
                </div>
              ))}
            </div>
          </ShadowCard>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <ShadowCard style={{padding:"20px 24px"}}>
            <div style={{fontFamily:C.fH,fontSize:15,fontWeight:700,color:C.text,marginBottom:16}}>Clicks by Language</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {ANA.langs.map((l,i)=>(
                <div key={l.lang}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:lc[i%lc.length],flexShrink:0}}/>
                    <span style={{fontFamily:C.fH,fontSize:12,fontWeight:600,color:C.text,flex:1}}>{l.lang}</span>
                    <span style={{fontFamily:C.fH,fontSize:12,fontWeight:700,color:C.text}}>{l.clicks.toLocaleString()}</span>
                    <span style={{fontFamily:C.fB,fontSize:11,color:C.textMuted}}>CTR {l.ctr}%</span>
                  </div>
                  <ProgressBar value={(l.clicks/maxL)*100} color={lc[i%lc.length]} h={5}/>
                  <div style={{textAlign:"right",fontFamily:C.fB,fontSize:9,color:C.textMuted,marginTop:2}}>{l.articles} articles</div>
                </div>
              ))}
            </div>
          </ShadowCard>

          <ShadowCard style={{padding:"20px 24px"}}>
            <div style={{fontFamily:C.fH,fontSize:15,fontWeight:700,color:C.text,marginBottom:16}}>Top Performing Markets</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[...ANA.markets].sort((a,b)=>b.ctr-a.ctr).slice(0,5).map((m,i)=>(
                <div key={m.code} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:C.bg,border:`1.5px solid ${i===0?C.primary+"40":C.border}`,boxShadow:i===0?`0 0 0 3px ${C.primaryMid}30`:"none"}}>
                  <div style={{width:24,height:24,borderRadius:6,background:i===0?C.primaryLt:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:C.fH,fontSize:11,fontWeight:700,color:i===0?C.primary:C.textMuted}}>{i+1}</div>
                  <span style={{fontSize:20}}>{m.flag}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:C.fH,fontSize:12,fontWeight:600,color:C.text}}>{m.name}</div>
                    <div style={{fontFamily:C.fB,fontSize:10,color:C.textMuted}}>{m.clicks.toLocaleString()} clicks</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:C.fH,fontSize:18,fontWeight:800,color:i===0?C.primary:C.text}}>{m.ctr}%</div>
                    <div style={{fontFamily:C.fB,fontSize:9,color:C.textMuted}}>CTR</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:14,padding:"12px 14px",background:C.primaryLt,borderRadius:9,border:`1px solid ${C.primaryMid}`}}>
              <div style={{fontFamily:C.fH,fontSize:10,fontWeight:700,color:C.primary,marginBottom:5}}>🤖 AI INSIGHT</div>
              <div style={{fontFamily:C.fB,fontSize:12,color:C.text,lineHeight:1.5}}>French content leads all markets. Consider adding <strong style={{color:C.primary}}>fr-BE</strong> and <strong style={{color:C.primary}}>fr-CA</strong> variants to expand reach by ~20%.</div>
            </div>
          </ShadowCard>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CMS VIEW — 7 platforms
   ══════════════════════════════════════════════════════════════════════════════ */
function CMSView() {
  const [connections, setConnections]     = useState({});
  const [adding, setAdding]               = useState(null);
  const [form, setForm]                   = useState({});
  const [verifying, setVerifying]         = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishing, setPublishing]       = useState(false);
  const [pubLog, setPubLog]               = useState([]);
  const [pubDone, setPubDone]             = useState(false);
  const [filter, setFilter]               = useState("All");

  const connCount  = Object.keys(connections).length;
  const categories = ["All","Connected",...Array.from(new Set(CMS_PLATFORMS.map(p=>p.category)))];
  const visible    = CMS_PLATFORMS.filter(p=>{
    if(filter==="All") return true;
    if(filter==="Connected") return !!connections[p.id];
    return p.category===filter;
  });
  const variants = [
    {locale:"fr-FR",lang:"French",    flag:"🇫🇷",path:"/fr/how-ai-reshapes-finance"},
    {locale:"de-DE",lang:"German",    flag:"🇩🇪",path:"/de/wie-ki-finanzen-veraendert"},
    {locale:"es-MX",lang:"Spanish",   flag:"🇲🇽",path:"/es/como-ia-transforma-finanzas"},
    {locale:"pt-BR",lang:"Portuguese",flag:"🇧🇷",path:"/pt/como-ia-transforma-financas"},
  ];

  const closeModal = ()=>{setPublishTarget(null);setPubLog([]);setPubDone(false);};
  const handleVerify = async ()=>{
    setVerifying(true);
    await sleep(800+Math.random()*500);
    const ok=(form.apiKey||"").length>5;
    if(ok){
      const plat=CMS_PLATFORMS.find(p=>p.id===adding);
      const label=form.siteUrl||form.storeDomain||form.repo||form.spaceId||form.projectId||plat?.name;
      setConnections(p=>({...p,[adding]:{siteName:label,connectedAt:new Date().toISOString()}}));
      setAdding(null); setForm({});
    } else { alert("Verification failed — check your credentials."); }
    setVerifying(false);
  };
  const handlePublish = async ()=>{
    setPublishing(true); setPubLog([]); setPubDone(false);
    for(const v of variants){
      await sleep(300+Math.random()*350);
      setPubLog(p=>[...p,{...v,success:Math.random()>0.08,ms:Math.floor(Math.random()*600+250)}]);
    }
    setPublishing(false); setPubDone(true);
  };

  return (
    <div style={{flex:1,overflowY:"auto",background:C.bg,display:"flex",flexDirection:"column"}}>
      <TopBar title="CMS Integrations" subtitle={`Connect & publish to example.com/{lang}/article subfolders`}
        right={connCount>0?<Badge color={C.green}>{connCount} of {CMS_PLATFORMS.length} connected</Badge>:null}/>
      <div style={{padding:"24px 32px"}}>

        {/* Filter tabs */}
        <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
          {categories.map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 18px",borderRadius:999,cursor:"pointer",fontFamily:C.fH,fontSize:12,fontWeight:700,border:`1.5px solid ${filter===f?C.primary:C.border}`,background:filter===f?C.primaryLt:"#fff",color:filter===f?C.primary:C.textSub,transition:"all 0.15s",boxShadow:filter===f?`0 0 0 3px ${C.primaryMid}30`:"none"}}>
              {f}{f!=="All"&&f!=="Connected"&&<span style={{marginLeft:5,fontWeight:500,color:C.textMuted,fontSize:11}}>({CMS_PLATFORMS.filter(p=>p.category===f).length})</span>}
            </button>
          ))}
        </div>

        {/* Platform grid */}
        {visible.length>0 ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {visible.map(p=>{
              const conn=connections[p.id];
              const isAdding=adding===p.id;
              const catColor=CAT_COLORS[p.category]||C.textMuted;
              return(
                <ShadowCard key={p.id} hoverable style={{padding:"22px",display:"flex",flexDirection:"column",border:`1.5px solid ${conn?C.primary+"40":C.border}`,minHeight:280}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:44,height:44,borderRadius:12,background:`${p.color}15`,border:`1.5px solid ${p.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:C.fH,fontSize:17,fontWeight:800,color:p.color,flexShrink:0}}>{p.icon}</div>
                      <div>
                        <div style={{fontFamily:C.fH,fontSize:14,fontWeight:700,color:C.text}}>{p.name}</div>
                        <span style={{display:"inline-block",padding:"2px 8px",borderRadius:4,background:`${catColor}15`,fontFamily:C.fH,fontSize:10,fontWeight:700,color:catColor,marginTop:3}}>{p.category}</span>
                      </div>
                    </div>
                    {conn&&<div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`}}/>
                      <span style={{fontFamily:C.fH,fontSize:10,fontWeight:700,color:C.green}}>Live</span>
                    </div>}
                  </div>

                  <div style={{fontFamily:C.fB,fontSize:12,color:C.textSub,lineHeight:1.55,marginBottom:10}}>{p.desc}</div>
                  <div style={{marginBottom:14}}>
                    <span style={{fontFamily:C.fB,fontSize:11,color:C.textMuted}}>URL: </span>
                    <code style={{fontFamily:C.fM,fontSize:11,color:C.primary,background:C.primaryLt,padding:"1px 7px",borderRadius:4}}>{p.urlPattern}</code>
                  </div>

                  {conn&&!isAdding&&(
                    <div style={{background:C.bg,borderRadius:9,padding:"9px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8,border:`1px solid ${C.border}`}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:C.green,flexShrink:0}}/>
                      <div>
                        <div style={{fontFamily:C.fH,fontSize:11,fontWeight:600,color:C.text}}>{conn.siteName}</div>
                        <div style={{fontFamily:C.fB,fontSize:10,color:C.textMuted}}>Connected {new Date(conn.connectedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}

                  {isAdding&&(
                    <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:12,padding:"14px",background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
                      {p.fields.map(f=>(
                        <Field key={f.key} label={f.label} placeholder={f.ph} value={form[f.key]||""} onChange={v=>setForm(prev=>({...prev,[f.key]:v}))} mono/>
                      ))}
                      <Field label={p.auth} placeholder={p.authPH} value={form.apiKey||""} onChange={v=>setForm(prev=>({...prev,apiKey:v}))} type="password" mono/>
                    </div>
                  )}

                  <div style={{marginTop:"auto",display:"flex",gap:7,flexWrap:"wrap"}}>
                    {!conn&&!isAdding&&<Btn onClick={()=>{setAdding(p.id);setForm({});}} small>+ Connect</Btn>}
                    {isAdding&&<>
                      <Btn onClick={handleVerify} disabled={verifying} small>{verifying?"Verifying…":"✓ Verify & Connect"}</Btn>
                      <Btn onClick={()=>setAdding(null)} variant="ghost" small>Cancel</Btn>
                    </>}
                    {conn&&!isAdding&&<>
                      <Btn onClick={()=>setPublishTarget(p.id)} small>↑ Publish Articles</Btn>
                      <Btn onClick={()=>setConnections(prev=>{const n={...prev};delete n[p.id];return n;})} variant="danger" small>Disconnect</Btn>
                    </>}
                  </div>
                </ShadowCard>
              );
            })}
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"60px 0",color:C.textMuted,fontFamily:C.fH,fontSize:13}}>
            No platforms connected yet.{" "}
            <button onClick={()=>setFilter("All")} style={{background:"none",border:"none",cursor:"pointer",color:C.primary,fontFamily:C.fH,fontSize:13,fontWeight:700}}>View all →</button>
          </div>
        )}
      </div>

      {/* Publish modal */}
      {publishTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}}
          onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <ShadowCard style={{width:500,padding:"32px",maxHeight:"82vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.20)"}}>
            <div style={{fontFamily:C.fH,fontSize:22,fontWeight:800,color:C.text,marginBottom:5}}>
              Publish to {CMS_PLATFORMS.find(p=>p.id===publishTarget)?.name}
            </div>
            <div style={{fontFamily:C.fB,fontSize:13,color:C.textSub,marginBottom:24}}>4 localized variants · hreflang injected · SEO meta included</div>

            {!pubDone&&!publishing&&(
              <>
                <div style={{background:C.bg,borderRadius:10,padding:"8px 12px",marginBottom:20,border:`1px solid ${C.border}`}}>
                  {variants.map(v=>(
                    <div key={v.locale} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 8px",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:18}}>{v.flag}</span>
                      <span style={{fontFamily:C.fH,fontSize:13,fontWeight:600,color:C.text}}>{v.lang}</span>
                      <span style={{marginLeft:"auto",fontFamily:C.fM,fontSize:11,color:C.textMuted}}>{v.path}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn onClick={handlePublish}>↑ Publish All Variants</Btn>
                  <Btn onClick={closeModal} variant="ghost">Cancel</Btn>
                </div>
              </>
            )}

            {publishing&&(
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {variants.map(v=>{
                  const done=pubLog.find(l=>l.locale===v.locale);
                  return(
                    <div key={v.locale} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,background:C.bg,border:`1.5px solid ${done?(done.success?C.green+"50":C.coral+"50"):C.border}`}}>
                      <span>{v.flag}</span>
                      <span style={{fontFamily:C.fH,fontSize:13,fontWeight:600,color:C.text,flex:1}}>{v.lang}</span>
                      {done?<span style={{color:done.success?C.green:C.coral,fontSize:16}}>{done.success?"✓":"✗"}</span>:<Spinner size={14} color={C.primary}/>}
                    </div>
                  );
                })}
              </div>
            )}

            {pubDone&&(
              <div>
                <div style={{display:"flex",gap:12,marginBottom:20}}>
                  {[{label:"Published",val:pubLog.filter(l=>l.success).length,c:C.green,bg:C.greenLt},{label:"Failed",val:pubLog.filter(l=>!l.success).length,c:C.coral,bg:C.coralLt}].map(s=>(
                    <div key={s.label} style={{flex:1,background:s.bg,borderRadius:10,padding:"16px",textAlign:"center",border:`1px solid ${s.c}25`}}>
                      <div style={{fontFamily:C.fH,fontSize:28,fontWeight:800,color:s.c}}>{s.val}</div>
                      <div style={{fontFamily:C.fH,fontSize:11,fontWeight:700,color:s.c,marginTop:2}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {pubLog.map(l=>(
                  <div key={l.locale} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",marginBottom:8,borderRadius:9,background:C.bg,border:`1.5px solid ${l.success?C.green+"40":C.coral+"40"}`}}>
                    <span style={{color:l.success?C.green:C.coral,fontSize:16}}>{l.success?"✓":"✗"}</span>
                    <span style={{fontFamily:C.fH,fontSize:12,fontWeight:600,color:C.text}}>{l.locale}</span>
                    <span style={{fontFamily:C.fM,fontSize:11,color:C.primary,flex:1}}>{l.path}</span>
                    {l.success&&<span style={{fontFamily:C.fB,fontSize:10,color:C.textMuted}}>{l.ms}ms</span>}
                  </div>
                ))}
                <Btn onClick={closeModal} variant="ghost" style={{marginTop:16}}>Close</Btn>
              </div>
            )}
          </ShadowCard>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function GlobalHub() {
  const [page, setPage]                 = useState("landing");
  const [user, setUser]                 = useState(null);
  const [view, setView]                 = useState("globalize");
  const [articleCount, setArticleCount] = useState(3);

  const handleAuth    = u => { setUser(u); setPage("dashboard"); setView("globalize"); };
  const handleSignOut = () => { setUser(null); setPage("landing"); };

  return (
    <>
      <Fonts/>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:${C.bg}; color:${C.text}; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.borderMd}; border-radius:3px; }
        input::placeholder { color:${C.textMuted}; }
        @keyframes gh-spin { to { transform:rotate(360deg); } }
        @keyframes ghFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {page==="landing" && <LandingPage onSignIn={()=>setPage("signin")} onSignUp={()=>setPage("signup")}/>}
      {(page==="signin"||page==="signup") && (
        <AuthPage mode={page} onAuth={handleAuth} onSwitch={()=>setPage(page==="signin"?"signup":"signin")} onBack={()=>setPage("landing")}/>
      )}
      {page==="dashboard" && user && (
        <div style={{display:"flex",minHeight:"100vh"}}>
          <Sidebar active={view} setActive={setView} user={user} articleCount={articleCount} onSignOut={handleSignOut}/>
          {view==="globalize" && <GlobalizeView onArticleAdded={()=>setArticleCount(n=>n+1)}/>}
          {view==="analytics" && <AnalyticsView/>}
          {view==="cms"       && <CMSView/>}
        </div>
      )}
    </>
  );
}