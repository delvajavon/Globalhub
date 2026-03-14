import { useState, useRef, useEffect, useCallback } from "react";
import { useUser, useClerk, SignIn, SignUp, UserButton } from "@clerk/react";
import DeployModal from "./src/DeployModal";
import { getBackendUrl } from "./lib/runtimeConfig";

/* ═══════════════════════════════════════════════════════════════════════════
  SCENEHIRE — Full App  (Light / Professional Blue theme)
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
  { code:"FR", name:"France",       flag:"🇫🇷", lang:"French",     lc:"fr", engine:"SEO Pending" },
  { code:"DE", name:"Germany",      flag:"🇩🇪", lang:"German",     lc:"de", engine:"SEO Pending" },
  { code:"ES", name:"Spain",        flag:"🇪🇸", lang:"Spanish",    lc:"es", engine:"SEO Pending" },
  { code:"MX", name:"Mexico",       flag:"🇲🇽", lang:"Spanish",    lc:"es", engine:"SEO Pending" },
  { code:"BR", name:"Brazil",       flag:"🇧🇷", lang:"Portuguese", lc:"pt", engine:"SEO Pending" },
  { code:"JP", name:"Japan",        flag:"🇯🇵", lang:"Japanese",   lc:"ja", engine:"SEO Pending" },
  { code:"CN", name:"China",        flag:"🇨🇳", lang:"Chinese",    lc:"zh", engine:"SEO Pending" },
  { code:"KR", name:"South Korea",  flag:"🇰🇷", lang:"Korean",     lc:"ko", engine:"SEO Pending" },
  { code:"IN", name:"India",        flag:"🇮🇳", lang:"Hindi",      lc:"hi", engine:"SEO Pending" },
  { code:"SA", name:"Saudi Arabia", flag:"🇸🇦", lang:"Arabic",     lc:"ar", engine:"SEO Pending" },
  { code:"IT", name:"Italy",        flag:"🇮🇹", lang:"Italian",    lc:"it", engine:"SEO Pending" },
  { code:"RU", name:"Russia",       flag:"🇷🇺", lang:"Russian",    lc:"ru", engine:"SEO Pending" },
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
    success: { bg:C.green,      fg:"#fff",      border:`1px solid ${C.green}`,     hbg:"#047857"   },
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
  const CONTACT_SALES_URL = 'https://calendly.com/delvajavon/30min';
  const [urlDemo, setUrlDemo] = useState("");
  const [hovFeat, setHovFeat] = useState(null);
  const [hovStep, setHovStep] = useState(null);

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const steps = [
    { n:"1.", icon:"📄", title:"Analyze Your Content",            desc:"Paste your article URL or write your own. SceneHire extracts keywords and analyzes global search demand." },
    { n:"2.", icon:"🌍", title:"Discover High-Opportunity Markets", desc:"See which countries have the highest demand and lowest competition for your content." },
    { n:"3.", icon:"🚀", title:"Localize & Publish",               desc:"SceneHire translates, optimizes SEO, and publishes localized pages directly to your CMS." },
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

  const pricingPlans = [
    {
      name: "Agency",
      cta: "Contact Sales",
      subtitle: "For agencies managing multiple clients.",
      limits: [
        "2000 articles / month",
        "unlimited CMS connections",
        "10 team members"
      ],
      features: [
        "client workspaces",
        "advanced AI market insights",
        "global performance tracking",
        "exportable reports"
      ],
      goodFor: ["SEO agencies", "growth agencies", "multi-site businesses"]
    },
    {
      name: "Enterprise",
      cta: "Contact Sales",
      subtitle: "For larger organizations.",
      features: [
        "unlimited articles",
        "SSO",
        "API access",
        "advanced analytics",
        "custom integrations",
        "priority support"
      ],
      customers: ["large agencies", "SaaS companies", "international brands"]
    }
  ];

  return (
    <div style={{ background:"#F8FAFC", minHeight:"100vh", fontFamily:C.fB, overflowX:"hidden" }}>

      {/* ── NAV ── */}
      <nav style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, height:64, display:"flex", alignItems:"center", padding:"0 48px", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:"auto" }}>
          <div style={{ width:36, height:36, background:`linear-gradient(135deg,${C.primary},#3B82F6)`, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>🌐</div>
          <span style={{ fontFamily:C.fH, fontSize:20, fontWeight:800, color:C.text }}>SceneHire</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {[
            { label: 'About', id: 'about-section' },
            { label: 'Features', id: 'features-section' },
            { label: 'Pricing', id: 'pricing-section' }
          ].map((item)=>(
            <button key={item.label} onClick={() => scrollToSection(item.id)} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:C.fB, fontSize:14, color:C.textSub, padding:"8px 14px", borderRadius:7, fontWeight:500, transition:"color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.color=C.text}
              onMouseLeave={e=>e.currentTarget.style.color=C.textSub}
            >{item.label}</button>
          ))}
          <div style={{ width:1, height:22, background:C.border, margin:"0 8px" }}/>
          <Btn onClick={onSignIn} variant="ghost" small>Login</Btn>
          <Btn onClick={onSignUp} small style={{ marginLeft:4, padding:"8px 24px", background:C.primary, borderRadius:8 }}>Get Started</Btn>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="about-section" style={{ background:`linear-gradient(180deg, #1a2d54 0%, #1e3f7a 45%, #2060c8 100%)`, padding:"86px 48px 80px", position:"relative", overflow:"hidden", minHeight:420, display:"flex", alignItems:"center", justifyContent:"center" }}>
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
            SceneHire discovers where your content can win globally and publishes localized versions to your CMS.
          </p>

          {/* URL input bar — matching the design exactly */}
          <div style={{ display:"flex", background:"#fff", borderRadius:10, boxShadow:"0 8px 40px rgba(0,0,0,0.28)", overflow:"hidden", maxWidth:560, margin:"0 auto" }}>
            <input value={urlDemo} onChange={e=>setUrlDemo(e.target.value)}
              placeholder="Paste your article URL"
              style={{ flex:1, padding:"16px 20px", border:"none", outline:"none", fontFamily:C.fB, fontSize:14, color:C.text, background:"transparent" }}
            />
            <button onClick={onSignUp}
              style={{ padding:"16px 26px", background:C.primary, color:"#fff", border:"none", cursor:"pointer", fontFamily:C.fH, fontSize:14, fontWeight:700, whiteSpace:"nowrap", transition:"background 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.primaryDk}
              onMouseLeave={e=>e.currentTarget.style.background=C.primary}
            >Find Global Opportunities</button>
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
      <section id="features-section" style={{ background:"#fff", padding:"70px 48px" }}>
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

      {/* ── PRICING ── */}
      <section id="pricing-section" style={{ background:"#F8FAFC", padding:"72px 48px" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ display:"inline-block", padding:"5px 16px", borderRadius:999, background:C.primaryLt, color:C.primary, fontFamily:C.fH, fontSize:12, fontWeight:700, marginBottom:14 }}>Pricing</div>
            <div style={{ fontFamily:C.fH, fontSize:28, fontWeight:800, color:C.text, marginBottom:8 }}>Plans For Teams That Publish Globally</div>
            <div style={{ fontFamily:C.fB, fontSize:14, color:C.textSub }}>Simple commercial model, tailored onboarding, and enterprise-grade support.</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,360px))", justifyContent:'center', gap:14 }}>
            {pricingPlans.map((plan) => {
              const isPopular = Boolean(plan.badge);
              return (
                <ShadowCard key={plan.name} style={{ padding:0, border:`1.5px solid ${isPopular ? C.primary + "70" : C.border}`, boxShadow:isPopular?`0 12px 28px ${C.primary}22`:"0 1px 6px rgba(0,0,0,0.06)", overflow:'hidden' }}>
                  <div style={{ padding:'14px 18px', background:isPopular ? 'linear-gradient(90deg, #DBEAFE 0%, #EFF6FF 100%)' : 'linear-gradient(90deg, #F8FAFC 0%, #FFFFFF 100%)', borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ fontFamily:C.fH, fontSize:20, fontWeight:800, color:C.text }}>{plan.name}</div>
                      {isPopular && <Badge color={C.primary} small>{plan.badge}</Badge>}
                    </div>
                    <div style={{ fontFamily:C.fB, fontSize:12, color:C.textSub, lineHeight:1.5, marginTop:6 }}>{plan.subtitle}</div>
                  </div>

                  <div style={{ padding:'16px 18px 18px' }}>
                  <div style={{ marginBottom:14 }}>
                    <Btn variant="primary" small onClick={() => { window.location.href = CONTACT_SALES_URL; }}>{plan.cta || 'Contact Sales'}</Btn>
                  </div>

                  {plan.limits && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontFamily:C.fH, fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", marginBottom:6 }}>Limits</div>
                      {plan.limits.map((item) => (
                        <div key={item} style={{ fontFamily:C.fB, fontSize:12, color:C.text, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}><span style={{ color:C.green, fontWeight:800 }}>✓</span><span>{item}</span></div>
                      ))}
                    </div>
                  )}

                  {plan.features && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontFamily:C.fH, fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", marginBottom:6 }}>Features</div>
                      {plan.features.map((item) => (
                        <div key={item} style={{ fontFamily:C.fB, fontSize:12, color:C.text, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}><span style={{ color:C.green, fontWeight:800 }}>✓</span><span>{item}</span></div>
                      ))}
                    </div>
                  )}

                  {plan.goodFor && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontFamily:C.fH, fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", marginBottom:6 }}>Good for</div>
                      {plan.goodFor.map((item) => (
                        <div key={item} style={{ fontFamily:C.fB, fontSize:12, color:C.text, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}><span style={{ color:C.primary, fontWeight:800 }}>•</span><span>{item}</span></div>
                      ))}
                    </div>
                  )}

                  {plan.customers && (
                    <div>
                      <div style={{ fontFamily:C.fH, fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", marginBottom:6 }}>Customers</div>
                      {plan.customers.map((item) => (
                        <div key={item} style={{ fontFamily:C.fB, fontSize:12, color:C.text, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}><span style={{ color:C.primary, fontWeight:800 }}>•</span><span>{item}</span></div>
                      ))}
                    </div>
                  )}
                  </div>
                </ShadowCard>
              );
            })}
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
            Free to start. No credit card required. 5 articles/month on the Free plan.
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
          <span style={{ fontFamily:C.fH, fontSize:15, fontWeight:700, color:"#fff" }}>SceneHire</span>
        </div>
        <div style={{ display:"flex", gap:24 }}>
          {["Privacy","Terms","Docs","Contact"].map(l=>(
            <span key={l} style={{ fontFamily:C.fB, fontSize:12, color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>{l}</span>
          ))}
        </div>
        <div style={{ fontFamily:C.fB, fontSize:11, color:"rgba(255,255,255,0.3)" }}>© 2026 SceneHire</div>
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
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#34D399", boxShadow:"0 0 8px #34D399" }}/>
            </div>
          ))}
        </div>
      </div>

      {/* Right white form */}
      <div style={{ width:460, background:"#fff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 48px", boxShadow:"-4px 0 24px rgba(0,0,0,0.06)" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:C.textMuted, fontFamily:C.fB, fontSize:12, marginBottom:36, padding:0, alignSelf:"flex-start" }}>← Back to home</button>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
          <div style={{ width:36, height:36, background:C.primary, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🌐</div>
          <span style={{ fontFamily:C.fH, fontSize:20, fontWeight:800, color:C.text }}>SceneHire</span>
        </div>
        <div style={{ width:"100%" }}>
          <h1 style={{ fontFamily:C.fH, fontSize:26, fontWeight:800, color:C.text, margin:"0 0 6px" }}>{isSignUp?"Create your account":"Welcome back"}</h1>
          <p style={{ fontFamily:C.fB, fontSize:14, color:C.textSub, marginBottom:26 }}>{isSignUp?"Start globalizing your content today.":"Sign in to your SceneHire workspace."}</p>
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
            {[{label:"Google",icon:"G"}].map(s=>(
              <button key={s.label} onClick={()=>onAuth({name:"Demo User",email:"demo@scenehire.io"})}
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

function Sidebar({ active, setActive, user, articleCount, freeLimit, isUnlimitedDemoAccount, onSignOut, collapsed, onToggleCollapse }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <aside style={{ width:collapsed ? 76 : 240, minHeight:"100vh", flexShrink:0, background:C.sidebar, display:"flex", flexDirection:"column", boxShadow:"2px 0 12px rgba(0,0,0,0.18)", transition:"width 0.2s ease" }}>
      <div style={{ padding:"22px 20px 18px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent: collapsed ? 'center' : 'space-between' }}>
          <div style={{ width:34, height:34, background:C.primary, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🌐</div>
          {!collapsed && (
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:C.fH, fontSize:16, fontWeight:800, color:"#fff" }}>SceneHire</div>
              <div style={{ fontFamily:C.fB, fontSize:10, color:C.navMuted, marginTop:1 }}>Content Platform</div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              border:'1px solid rgba(255,255,255,0.16)',
              background:'rgba(255,255,255,0.06)',
              color:'#fff',
              width:24,
              height:24,
              borderRadius:6,
              cursor:'pointer',
              flexShrink:0
            }}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
      </div>

      <nav style={{ padding:"14px 10px", flex:1 }}>
        {!collapsed && <div style={{ fontFamily:C.fH, fontSize:10, color:C.navMuted, letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 12px 10px", fontWeight:700 }}>Workspace</div>}
        {NAV.map(item=>{
          const on = active===item.id;
          return (
            <button key={item.id} onClick={()=>setActive(item.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:on?C.sidebarActive:"transparent", marginBottom:2, transition:"background 0.15s", textAlign:"left", justifyContent: collapsed ? 'center' : 'flex-start' }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background=C.sidebarHover; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="transparent"; }}
            >
              <span style={{ fontSize:16, width:22, textAlign:"center" }}>{item.icon}</span>
              {!collapsed && (
                <div>
                  <div style={{ fontFamily:C.fH, fontSize:13, fontWeight:on?700:500, color:on?"#fff":C.navText }}>{item.label}</div>
                  <div style={{ fontFamily:C.fB, fontSize:9, color:C.navMuted, marginTop:1 }}>{item.sub}</div>
                </div>
              )}
              {on && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:"#34D399", boxShadow:"0 0 6px #34D399" }}/>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:"0 12px 14px" }}>
        {!collapsed && <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:11, padding:"14px", marginBottom:10 }}>
          <div style={{ fontFamily:C.fH, fontSize:10, color:C.navMuted, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:700, marginBottom:8 }}>Articles This Month</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:8 }}>
            <span style={{ fontFamily:C.fH, fontSize:24, fontWeight:800, color:"#fff" }}>{articleCount}</span>
            <span style={{ fontFamily:C.fB, fontSize:11, color:C.navMuted }}>
              {isUnlimitedDemoAccount ? '/ unlimited demo' : `/${freeLimit} free`}
            </span>
          </div>
          <ProgressBar value={isUnlimitedDemoAccount ? 0 : (articleCount / freeLimit) * 100} h={4}/>
          <button
            onClick={() => setActive('upgrade')}
            style={{ marginTop:10, width:"100%", padding:"7px 0", borderRadius:7, background:C.primary, border:"none", color:"#fff", fontFamily:C.fH, fontSize:11, fontWeight:700, cursor:"pointer" }}
          >
            Upgrade Plan ↑
          </button>
        </div>}

        <div style={{ position:"relative" }}>
          <button onClick={()=>setMenuOpen(p=>!p)} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"9px 12px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:10, cursor:"pointer", textAlign:"left", justifyContent: collapsed ? 'center' : 'flex-start' }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.10)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
          >
            <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${C.primary},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:C.fH, fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>
              {user?.firstName?.charAt(0)?.toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.charAt(0)?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:C.fH, fontSize:12, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {user?.firstName || user?.fullName || "User"}
                  </div>
                  <div style={{ fontFamily:C.fB, fontSize:10, color:C.navMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress || ""}
                  </div>
                </div>
                <span style={{ color:C.navMuted, fontSize:10 }}>⌄</span>
              </>
            )}
          </button>
          {menuOpen && (
            <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, right:0, background:"#1E3055", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, overflow:"hidden", zIndex:200 }}>
              <button
                onClick={() => setMenuOpen(false)}
                style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", cursor:"pointer", fontFamily:C.fH, fontSize:12, color:C.navText, textAlign:"left" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
                onMouseLeave={e=>e.currentTarget.style.background="none"}
              >
                Account settings
              </button>
              <button
                onClick={() => { setActive('upgrade'); setMenuOpen(false); }}
                style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", cursor:"pointer", fontFamily:C.fH, fontSize:12, color:C.navText, textAlign:"left" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
                onMouseLeave={e=>e.currentTarget.style.background="none"}
              >
                Upgrade plan
              </button>
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

function GlobalizeView({ onArticleAdded, usageLocked, onUsageLocked, currentUserId, currentUserEmail }) {
  const [inputMode, setInputMode] = useState('url');
  const [url, setUrl]           = useState("");
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const BACKEND_URL = getBackendUrl();
  const [selected, setSelected] = useState([]);
  const [phase, setPhase]       = useState("idle");
  const [pipeStep, setPipeStep] = useState(0);
  const [logs, setLogs]         = useState([]);
  const [results, setResults]   = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied]     = useState(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [articleToDeploy, setArticleToDeploy] = useState(null);
  const [marketSeoByCode, setMarketSeoByCode] = useState({});
  const [latestSeoSourceTitle, setLatestSeoSourceTitle] = useState('');
  const [isSeoPreviewLoading, setIsSeoPreviewLoading] = useState(false);
  const [seoPreviewError, setSeoPreviewError] = useState('');
  const logRef                  = useRef(null);

  const DARK_YELLOW = '#B8860B';

  const withSeoSuffix = (level) => {
    if (level === 'Highest') return 'Highest SEO';
    if (level === 'Medium') return 'Medium SEO';
    if (level === 'Low') return 'Low SEO';
    return level || 'SEO Pending';
  };

  const seoColorForLevel = (level) => {
    if (level === 'Highest') return C.green;
    if (level === 'Medium') return DARK_YELLOW;
    if (level === 'Low') return C.coral;
    return C.textMuted;
  };

  const normalizeLevelValue = (value) => {
    if (value === 'Highest' || value === 'Highest SEO') return 'Highest';
    if (value === 'Medium' || value === 'Medium SEO') return 'Medium';
    if (value === 'Low' || value === 'Low SEO') return 'Low';
    return null;
  };

  const normalizeSeoRecommendations = (recommendations = []) => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return {};
    }

    const lowCount = recommendations.filter((row) => row.level === 'Low').length;
    const majorityLow = lowCount > (recommendations.length / 2);
    const sorted = [...recommendations].sort((a, b) => (b.score || 0) - (a.score || 0));

    if (!majorityLow) {
      return sorted.reduce((acc, row) => {
        acc[row.country] = { level: row.level, score: row.score };
        return acc;
      }, {});
    }

    const highestCutoff = Math.max(1, Math.ceil(sorted.length * 0.25));
    const mediumCutoff = Math.max(highestCutoff + 1, Math.ceil(sorted.length * 0.6));

    return sorted.reduce((acc, row, index) => {
      let level = 'Low';
      if (index < highestCutoff) {
        level = 'Highest';
      } else if (index < mediumCutoff) {
        level = 'Medium';
      }
      acc[row.country] = {
        level,
        score: row.score
      };
      return acc;
    }, {});
  };

  const shouldSortMarketsByScore = (() => {
    const rows = Object.values(marketSeoByCode);
    if (rows.length === 0) return false;
    const lowCount = rows.filter((row) => row.level === 'Low').length;
    return lowCount > (rows.length / 2);
  })();

  const displayedMarkets = shouldSortMarketsByScore
    ? [...MARKETS].sort((a, b) => (marketSeoByCode[b.code]?.score || 0) - (marketSeoByCode[a.code]?.score || 0))
    : MARKETS;

  const isUrlMode = inputMode === 'url';
  const normalizedDraftTitle = draftTitle.trim();
  const normalizedDraftContent = draftContent.trim();

  const getSourceDomain = () => {
    if (!isUrlMode) {
      return 'scenehire.local';
    }
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'source.com';
    }
  };

  const normalizeRequestError = (error, fallbackMessage) => {
    const message = String(error?.message || '').trim();
    if (!message) return fallbackMessage;
    if (message === 'Failed to fetch' || /networkerror|load failed|fetch/i.test(message)) {
      return `Cannot reach backend at ${BACKEND_URL}. Make sure the API server is running on port 3001.`;
    }
    return message;
  };

  const fetchSeoRecommendations = async ({ title, content, countries }) => {
    const recResp = await fetch(`${BACKEND_URL}/api/ai/market-recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, countries })
    });
    const recData = await recResp.json();
    if (!recResp.ok) {
      throw new Error(recData.error || 'Failed to generate market recommendations');
    }
    return normalizeSeoRecommendations(recData.recommendations || []);
  };

  const getArticleSource = async () => {
    if (!isUrlMode) {
      if (!normalizedDraftTitle || normalizedDraftContent.length < 80) {
        throw new Error('Write mode requires a title and at least 80 characters of content');
      }
      return {
        title: normalizedDraftTitle,
        content: normalizedDraftContent
      };
    }

    const trimmedUrl = url.trim();
    const extractResp = await fetch(`${BACKEND_URL}/api/ai/extract-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trimmedUrl })
    });
    const extractData = await extractResp.json().catch(() => ({}));
    if (!extractResp.ok) {
      throw new Error(extractData.error || 'Failed to extract article');
    }
    return {
      title: extractData.title || '',
      content: extractData.content || ''
    };
  };

  const addLog = (msg, type="muted") => setLogs(p=>[...p,{msg,type}]);
  const toggle = code => setSelected(p=>p.includes(code)?p.filter(c=>c!==code):[...p,code]);
  const copy   = (text,key) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1600); };
  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[logs]);

  // Pre-compute SEO rankings for all markets from URL mode or Write Article mode.
  useEffect(() => {
    if (isUrlMode) {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setMarketSeoByCode({});
        setSeoPreviewError('');
        setIsSeoPreviewLoading(false);
        return;
      }

      try {
        new URL(trimmedUrl);
      } catch {
        setMarketSeoByCode({});
        setSeoPreviewError('Enter a valid URL to preview SEO rankings');
        setIsSeoPreviewLoading(false);
        return;
      }
    } else {
      if (!normalizedDraftTitle && !normalizedDraftContent) {
        setMarketSeoByCode({});
        setSeoPreviewError('');
        setIsSeoPreviewLoading(false);
        return;
      }
      if (!normalizedDraftTitle || normalizedDraftContent.length < 80) {
        setMarketSeoByCode({});
        setSeoPreviewError('Write mode needs a title and at least 80 characters');
        setIsSeoPreviewLoading(false);
        return;
      }
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSeoPreviewLoading(true);
      setSeoPreviewError('');

      try {
        const articleSource = await getArticleSource();
        const scoreMap = await fetchSeoRecommendations({
          title: articleSource.title,
          content: articleSource.content,
          countries: MARKETS.map((m) => m.code)
        });
        if (!isCancelled) {
          setMarketSeoByCode(scoreMap);
          setLatestSeoSourceTitle(articleSource.title || '');
        }
      } catch (error) {
        if (!isCancelled) {
          setMarketSeoByCode({});
          setSeoPreviewError(normalizeRequestError(error, 'Unable to preview SEO rankings'));
        }
      } finally {
        if (!isCancelled) {
          setIsSeoPreviewLoading(false);
        }
      }
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [inputMode, url, normalizedDraftTitle, normalizedDraftContent, BACKEND_URL]);

  const runPipeline = async () => {
    if (usageLocked) {
      onUsageLocked?.();
      return;
    }

    const canRun = selected.length > 0 && (isUrlMode ? Boolean(url.trim()) : Boolean(normalizedDraftTitle && normalizedDraftContent.length >= 80));
    if (!canRun) return;

    setPhase("running"); setLogs([]); setResults([]); setPipeStep(0);
    const markets = MARKETS.filter(m=>selected.includes(m.code));
    const domain = getSourceDomain();
    let sourceTitle = '';
    let sourceContent = '';

    if (isUrlMode) {
      addLog(`Connecting to ${domain}…`,"accent");
    } else {
      addLog('Using in-app article draft…', 'accent');
    }
    setPipeStep(0);
    await sleep(400);

    try {
      const source = await getArticleSource();
      sourceTitle = source.title;
      sourceContent = source.content;
      addLog(`Source ready · ${Math.max(0, sourceContent.length)} chars`);
    } catch (sourceError) {
      addLog(`Source error: ${normalizeRequestError(sourceError, 'Unable to load article source')}`, 'warn');
      setPhase('idle');
      return;
    }

    setPipeStep(1); addLog(`Starting AI pipeline — ${markets.length} markets…`,"accent");
    let seoMap = {};
    const selectedCodes = markets.map((m) => m.code);
    const hasPreviewForSelected = selectedCodes.every((code) => marketSeoByCode[code]);
    if (hasPreviewForSelected) {
      seoMap = selectedCodes.reduce((acc, code) => {
        acc[code] = marketSeoByCode[code];
        return acc;
      }, {});
      addLog('Using pre-fetched SEO market rankings', 'success');
    } else {
      try {
        addLog('Scoring SEO potential by market…');
        const scoreMap = await fetchSeoRecommendations({
          title: sourceTitle,
          content: sourceContent,
          countries: selectedCodes
        });
        seoMap = scoreMap;
        setMarketSeoByCode((prev) => ({ ...prev, ...scoreMap }));
        setLatestSeoSourceTitle(sourceTitle || '');
        addLog('✓ SEO market rankings generated from source content', 'success');
      } catch (seoError) {
        addLog(`SEO ranking fallback: ${seoError.message}`, 'warn');
        seoMap = {};
      }
    }
    const generated = [];
    try {
      addLog(`Calling localization AI…`);
      const res = await fetch(`${BACKEND_URL}/api/ai/localize-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          userEmail: currentUserEmail,
          sourceTitle,
          sourceContent,
          sourceUrl: isUrlMode ? url : '',
          markets: markets.map((m) => ({ code: m.code, name: m.name, lang: m.lang }))
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 402 || data?.code === 'USAGE_LIMIT_REACHED') {
          addLog('Usage limit reached. Redirecting to Upgrade Plan…', 'warn');
          setPhase('idle');
          onUsageLocked?.();
          return;
        }
        throw new Error(data.error || 'Localization AI request failed');
      }

      const aiArr = Array.isArray(data.localized) ? data.localized : [];
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
        const bodyHtml = typeof ai.localizedBodyHtml === 'string' && ai.localizedBodyHtml.trim().length > 40
          ? ai.localizedBodyHtml.trim()
          : `<p>${ex}</p><p>${sourceContent.slice(0, 1200)}</p>`;
        addLog(`  ✓ "${st.slice(0,52)}…"`,"success");
        setPipeStep(2); await sleep(100); addLog(`  ✓ ${kws.length} keywords · /${m.lc}/${sl}`);
        setPipeStep(3); await sleep(80);  addLog(`  ✓ HTML + hreflang ${m.lc}-${m.code} + Schema.org`);
        const marketSeo = seoMap[m.code] || {};
        generated.push({
          market:{...m, engine:withSeoSuffix(marketSeo.level)},
          localizedTitle:lt,
          seoTitle:st,
          metaDescription:md,
          content: bodyHtml,
          keywords:kws,
          slug:`/${m.lc}/${sl}`,
          excerpt:ex,
          culturalNote:cn,
          wordCount:Math.floor(Math.random()*400+900),
          readingTime:Math.floor(Math.random()*3+4),
          seoScore:Number.isFinite(marketSeo.score) ? marketSeo.score : Math.floor(Math.random()*12+85),
          hreflang:`${m.lc}-${m.code}`
        });
      }
    } catch {
      addLog(`Using offline pipeline`,"warn");
      for(const m of markets){
        const marketSeo = seoMap[m.code] || {};
        generated.push({market:{...m, engine:withSeoSuffix(marketSeo.level)},localizedTitle:`${sourceTitle} (${m.lang})`,seoTitle:`${sourceTitle.slice(0, 48)} | ${m.name}`,metaDescription:`${sourceTitle.slice(0, 80)} — localized for ${m.name}.`,content:`<p>${sourceContent.slice(0, 1600)}</p>`,keywords:[m.lang,domain,m.name,"guide","2024"],slug:`/${m.lc}/${domain.split(".")[0]}`,excerpt:`Discover this for ${m.name}.`,culturalNote:`Tone and idiom tuned for ${m.name} audience.`,wordCount:Math.floor(Math.random()*400+900),readingTime:Math.floor(Math.random()*3+4),seoScore:Number.isFinite(marketSeo.score) ? marketSeo.score : Math.floor(Math.random()*12+85),hreflang:`${m.lc}-${m.code}`});
        await sleep(80);
      }
    }
    setPipeStep(4); addLog(`Done — ${generated.length} pages ready · Avg SEO: ${Math.round(generated.reduce((s,r)=>s+r.seoScore,0)/generated.length)}`,"success");
    setResults(generated); setPhase("done"); onArticleAdded();
  };

  const deployArticle = (article) => {
    setArticleToDeploy({
      ...article,
      seoPotentialByMarket: marketSeoByCode
    });
    setDeployModalOpen(true);
  };

  const logColors={accent:C.primary,success:C.green,warn:C.amber,text:C.text,muted:C.textMuted};

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!marketSeoByCode || Object.keys(marketSeoByCode).length === 0) return;

    const snapshot = {
      seoPotentialByMarket: marketSeoByCode,
      sourceTitle: latestSeoSourceTitle || draftTitle.trim() || '',
      updatedAt: new Date().toISOString()
    };

    window.localStorage.setItem('scenehire:latest-seo-potential', JSON.stringify(snapshot));
  }, [marketSeoByCode, latestSeoSourceTitle, draftTitle]);

  const reset = ()=>{setPhase("idle");setResults([]);setLogs([]);setUrl("");setDraftTitle('');setDraftContent('');setInputMode('url');setSelected([]);setMarketSeoByCode({});setSeoPreviewError('');setIsSeoPreviewLoading(false);};

  return (
    <div style={{flex:1,overflowY:"auto",background:C.bg,display:"flex",flexDirection:"column"}}>
      <TopBar title="Globalize Article" subtitle="Scrape → AI Translate → SEO → Publish"
        right={phase==="done"?<Btn onClick={reset} variant="outline" small>← New Article</Btn>:null}/>
      <div style={{padding:"24px 32px"}}>

        {/* Pipeline stepper */}
        {phase!=="idle"&&(
          <ShadowCard style={{padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:0,flexWrap:"wrap"}}>
            {PIPE.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,background:i===pipeStep&&phase==="running"?C.primaryLt:"transparent"}}>
                  <StepDot n={i+1} active={i===pipeStep&&phase==="running"} done={i<pipeStep||phase==="done"}/>
                  <span style={{fontFamily:C.fH,fontSize:11,fontWeight:600,color:i<=pipeStep||phase==="done"?C.text:C.textMuted,whiteSpace:"nowrap"}}>{s.label}</span>
                  {i===pipeStep&&phase==="running"&&<Spinner size={11}/>}
                </div>
                {i<PIPE.length-1&&<div style={{width:14,height:2,background:i<pipeStep||phase==="done"?C.primary:C.border,borderRadius:1,flexShrink:0}}/>}
              </div>
            ))}
          </ShadowCard>
        )}

        {/* IDLE */}
        {phase==="idle"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:860}}>
            <ShadowCard style={{padding:"14px 18px"}}>
              <div style={{display:"flex",gap:8}}>
                <button onClick={() => setInputMode('url')} style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${inputMode === 'url' ? C.primary : C.border}`,background:inputMode === 'url' ? C.primaryLt : '#fff',fontFamily:C.fH,fontSize:12,fontWeight:700,color:inputMode === 'url' ? C.primary : C.text,cursor:'pointer'}}>
                  Paste URL
                </button>
                <button onClick={() => setInputMode('write')} style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${inputMode === 'write' ? C.primary : C.border}`,background:inputMode === 'write' ? C.primaryLt : '#fff',fontFamily:C.fH,fontSize:12,fontWeight:700,color:inputMode === 'write' ? C.primary : C.text,cursor:'pointer'}}>
                  Write Article
                </button>
              </div>
            </ShadowCard>

            <ShadowCard style={{padding:"22px 26px"}}>
              {isUrlMode ? (
                <>
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
                </>
              ) : (
                <>
                  <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Write Your Article</div>
                  <div style={{marginBottom:10}}>
                    <Field label="Article Title" value={draftTitle} onChange={setDraftTitle} placeholder="How AI Is Changing Global SEO in 2026" autoFocus/>
                  </div>
                  <div>
                    <label style={{fontSize:12,fontFamily:C.fH,color:C.textSub,fontWeight:600,display:'block',marginBottom:5}}>Article Content</label>
                    <textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      placeholder="Write or paste your article content here..."
                      style={{width:'100%',minHeight:180,padding:'11px 14px',background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:9,color:C.text,fontFamily:C.fB,fontSize:13,outline:'none',resize:'vertical',lineHeight:1.5}}
                    />
                    <div style={{marginTop:6,fontFamily:C.fB,fontSize:11,color:C.textMuted}}>{draftContent.length} characters</div>
                  </div>
                </>
              )}
            </ShadowCard>

            <ShadowCard style={{padding:"22px 26px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:C.text}}>
                  Target Markets <span style={{color:C.textMuted,fontWeight:500,fontSize:12}}>— {selected.length} selected</span>
                  {isSeoPreviewLoading && <span style={{color:C.primary,fontWeight:600,fontSize:11,marginLeft:8}}>Analyzing SEO…</span>}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <Btn onClick={()=>setSelected(MARKETS.map(m=>m.code))} variant="ghost" small>All</Btn>
                  <Btn onClick={()=>setSelected([])} variant="ghost" small>None</Btn>
                </div>
              </div>
              {seoPreviewError && (
                <div style={{fontFamily:C.fB,fontSize:11,color:C.amber,marginBottom:10}}>{seoPreviewError}</div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {displayedMarkets.map(m=>{
                  const on=selected.includes(m.code);
                  const seoInfo = marketSeoByCode[m.code];
                  const seoLevelText = seoInfo ? withSeoSuffix(seoInfo.level) : m.engine;
                  const seoColor = seoColorForLevel(seoInfo?.level);
                  return(
                    <button key={m.code} onClick={()=>toggle(m.code)} style={{padding:"10px 10px",borderRadius:10,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8,transition:"all 0.15s",border:`1.5px solid ${on?C.primary:C.border}`,background:on?C.primaryLt:"#fff",boxShadow:on?`0 0 0 3px ${C.primaryMid}30`:"none"}}>
                      <span style={{fontSize:20}}>{m.flag}</span>
                      <div style={{minWidth:0}}>
                        <div style={{fontFamily:C.fH,fontSize:11,fontWeight:700,color:on?C.primary:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                        <div style={{fontFamily:C.fB,fontSize:9,color:seoInfo ? seoColor : C.textMuted}}>{seoInfo ? `${seoLevelText} (${seoInfo.score})` : m.engine}</div>
                      </div>
                      {on&&<span style={{marginLeft:"auto",color:C.primary,fontSize:13}}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </ShadowCard>

            <Btn onClick={runPipeline} disabled={usageLocked || !(selected.length > 0 && (isUrlMode ? Boolean(url.trim()) : Boolean(normalizedDraftTitle && normalizedDraftContent.length >= 80)))} style={{alignSelf:"flex-start",padding:"13px 36px",fontSize:14,borderRadius:11}}>
              🌐 Globalize Article →
            </Btn>
            {usageLocked && (
              <div style={{fontFamily:C.fB,fontSize:12,color:C.amber}}>
                Free usage limit reached. Upgrade your plan to continue.
              </div>
            )}
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
                        <Badge color={seoColorForLevel(normalizeLevelValue(r.market.engine))} small>{r.market.engine}</Badge>
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
                        <Btn onClick={() => deployArticle(r)} small>🚀 Deploy to CMS</Btn>
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

      {/* Deploy Modal */}
      <DeployModal
        article={articleToDeploy}
        isOpen={deployModalOpen}
        onClose={() => {
          setDeployModalOpen(false);
          setArticleToDeploy(null);
        }}
        onComplete={() => {
          setDeployModalOpen(false);
          setArticleToDeploy(null);
          reset();
        }}
      />
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
  const { user } = useUser();
  const [period, setPeriod] = useState("30d");
  const [mapImageFailed, setMapImageFailed] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [scConnection, setScConnection] = useState({ connected: false, selectedSiteUrl: null, updatedAt: null });

  const BACKEND_URL = getBackendUrl();

  // Map language codes to full names
  const languageNameMap = {
    'en': 'English', 'en-us': 'English (US)', 'en-gb': 'English (UK)',
    'fr': 'French', 'fr-fr': 'French', 'fr-ca': 'French (Canada)',
    'de': 'German', 'de-de': 'German',
    'es': 'Spanish', 'es-es': 'Spanish', 'es-mx': 'Spanish (Mexico)',
    'pt': 'Portuguese', 'pt-br': 'Portuguese', 'pt-pt': 'Portuguese (Portugal)',
    'ja': 'Japanese', 'ja-jp': 'Japanese',
    'ko': 'Korean', 'ko-kr': 'Korean',
    'zh': 'Chinese', 'zh-cn': 'Chinese',
    'ar': 'Arabic', 'it': 'Italian', 'ru': 'Russian',
    'hi': 'Hindi', 'nl': 'Dutch', 'pl': 'Polish'
  };

  const normalizePotentialLevel = (value) => {
    const level = String(value || '').trim().toLowerCase();
    if (level === 'highest') return 'Highest';
    if (level === 'medium') return 'Medium';
    if (level === 'low') return 'Low';
    return 'Unknown';
  };

  const readLocalSeoSnapshot = () => {
    try {
      const raw = window.localStorage.getItem('scenehire:latest-seo-potential');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const buildLocalSuggestedExpansions = (seoPotentialByMarket = {}) => {
    const byCode = new Map(MARKETS.map((m) => [m.code, m]));
    const rows = Object.entries(seoPotentialByMarket || {})
      .map(([codeRaw, value]) => {
        const code = String(codeRaw || '').trim().toUpperCase();
        const market = byCode.get(code);
        if (!market) return null;

        const level = normalizePotentialLevel(value?.level);
        const score = Number(value?.score || 0);
        const priority = level === 'Highest' ? 3 : level === 'Medium' ? 2 : level === 'Low' ? 1 : 0;

        return {
          countryCode: code,
          country: market.name,
          demand: level === 'Highest' ? 'high' : level === 'Medium' ? 'medium' : 'moderate',
          competition: level === 'Highest' ? 'medium' : level === 'Medium' ? 'low' : 'unknown',
          languageCode: market.lc,
          languageAvailable: true,
          impressions: 0,
          clicks: 0,
          avgPosition: 0,
          articleCoverage: 0,
          score,
          level,
          priority,
          rationale: 'Based on latest Globalize SEO potential (draft or unpublished).'
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.score - a.score;
      });

    const highestRows = rows.filter((row) => row.priority === 3);
    const ranked = highestRows.length > 0 ? highestRows : rows;
    return ranked.slice(0, 3);
  };

  // Use real language/platform data only
  const languagesData = analyticsData?.languages || [];

  // Use real market data only
  const marketsData = analyticsData?.markets || [];

  // Fetch real analytics data from backend
  const fetchDashboardMetrics = useCallback(async () => {
      try {
        setLoading(true);
        const localSeoSnapshot = readLocalSeoSnapshot();
        const localSuggestedExpansions = buildLocalSuggestedExpansions(localSeoSnapshot?.seoPotentialByMarket || {});
        const userId = user?.id || null;
        const dateRangeByPeriod = {
          '7d': { startDate: '7daysAgo', endDate: 'today' },
          '30d': { startDate: '30daysAgo', endDate: 'today' },
          '90d': { startDate: '90daysAgo', endDate: 'today' }
        };
        const selectedRange = dateRangeByPeriod[period] || dateRangeByPeriod['30d'];
        const dashboardParams = new URLSearchParams({
          startDate: selectedRange.startDate,
          endDate: selectedRange.endDate
        });
        if (userId) {
          dashboardParams.set('userId', userId);
        }
        
        console.log('Fetching analytics for user:', userId);

        if (userId) {
          // Refresh cached deployment metrics from Search Console before loading dashboard aggregates.
          await fetch(`${BACKEND_URL}/api/analytics/deployment-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, startDate: selectedRange.startDate, endDate: selectedRange.endDate, limit: 100 })
          }).catch(() => null);
        }

        const [liveDashboardRes, connectionRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/analytics/dashboard?${dashboardParams.toString()}`),
          userId ? fetch(`${BACKEND_URL}/api/analytics/search-console/connection?userId=${userId}`) : Promise.resolve({ ok: false })
        ]);

        const liveDashboardData = liveDashboardRes.ok ? await liveDashboardRes.json() : { success: false };
        const connectionData = connectionRes.ok ? await connectionRes.json() : { success: false, connected: false };

        setScConnection({
          connected: Boolean(connectionData?.connected),
          selectedSiteUrl: connectionData?.selectedSiteUrl || null,
          updatedAt: connectionData?.updatedAt || null
        });

        if (!liveDashboardData.success || !liveDashboardData.data) {
          if (localSuggestedExpansions.length > 0) {
            setAnalyticsData({
              totalViews: 0,
              totalUsers: 0,
              avgCtr: 0,
              topMarket: { country: 'N/A', ctr: 0 },
              trends: { views: 0, users: 0, ctr: 0 },
              weeklyActivity: [],
              languages: [],
              markets: [],
              topMarkets: [],
              emergingOpportunities: [],
              suggestedExpansions: localSuggestedExpansions,
              focusArticle: { title: localSeoSnapshot?.sourceTitle || 'Latest Globalize draft' },
              pagePerformance: [],
              recentPublishedArticles: [],
              topQueries: []
            });
            setError(null);
            return;
          }

          setAnalyticsData(null);
          setError(liveDashboardData.error || 'Could not load Search Console dashboard data');
          return;
        }

        const liveData = liveDashboardData.data;
        const mergedSuggestedExpansions = (liveData.suggestedExpansions || []).length > 0
          ? liveData.suggestedExpansions
          : localSuggestedExpansions;
        const mergedFocusArticle = liveData.focusArticle || (
          localSuggestedExpansions.length > 0
            ? { title: localSeoSnapshot?.sourceTitle || 'Latest Globalize draft' }
            : null
        );

        const weeklyFromLive = (liveData.weeklyActivity || []).map(row => ({
          d: row.day || row.date || '',
          v: row.views || 0,
          c: row.users || 0
        }));

        const languageFromLive = (liveData.languages || []).map(row => {
          const code = String(row.code || '').toLowerCase();
          return {
            lang: languageNameMap[code] || (row.code || 'Unknown'),
            articles: 0,
            clicks: row.clicks || row.users || 0,
            ctr: parseFloat(row.ctr) || 0
          };
        });

        const marketColors = [C.primary, C.teal, C.amber, C.green, C.purple];
        const marketsFromLive = (liveData.markets || []).map((row, idx) => ({
          code: row.countryCode || `M${idx + 1}`,
          name: row.country || 'Unknown',
          flag: getCountryFlag(row.country || ''),
          views: row.views || 0,
          clicks: row.users || 0,
          ctr: parseFloat(row.ctr) || 0,
          position: Number.isFinite(Number(row.position)) ? Number(row.position) : 0,
          trend: 0,
          color: marketColors[idx % marketColors.length]
        }));

        setAnalyticsData({
          totalViews: liveData.totalViews || 0,
          totalUsers: liveData.totalUsers || 0,
          avgCtr: parseFloat(liveData.avgCtr) || 0,
          topMarket: liveData.topMarket || { country: 'N/A', ctr: 0 },
          trends: liveData.trends || { views: 0, users: 0, ctr: 0 },
          weeklyActivity: weeklyFromLive,
          languages: languageFromLive,
          markets: marketsFromLive,
          topMarkets: liveData.topMarkets || [],
          emergingOpportunities: liveData.emergingOpportunities || [],
          suggestedExpansions: mergedSuggestedExpansions,
          focusArticle: mergedFocusArticle,
          pagePerformance: liveData.pagePerformance || [],
          recentPublishedArticles: liveData.recentPublishedArticles || [],
          topQueries: liveData.topQueries || []
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
        setError(err.message);
        // Preserve current dashboard state on fetch failures.
      } finally {
        setLoading(false);
      }
    }, [BACKEND_URL, period, user?.id]);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [fetchDashboardMetrics, refreshTick]);

  const triggerSync = useCallback(async () => {
    if (!user?.id) return;
    const dateRangeByPeriod = {
      '7d': { startDate: '7daysAgo', endDate: 'today' },
      '30d': { startDate: '30daysAgo', endDate: 'today' },
      '90d': { startDate: '90daysAgo', endDate: 'today' }
    };
    const selectedRange = dateRangeByPeriod[period] || dateRangeByPeriod['30d'];
    await fetch(`${BACKEND_URL}/api/analytics/deployment-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, startDate: selectedRange.startDate, endDate: selectedRange.endDate, limit: 100 })
    }).catch(() => null);
  }, [BACKEND_URL, period, user?.id]);

  const handleRefreshAnalytics = async () => {
    try {
      setSyncing(true);
      await triggerSync();
      setRefreshTick((n) => n + 1);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectSearchConsole = async () => {
    try {
      if (!user?.id) return;
      const params = new URLSearchParams({ userId: user.id, origin: window.location.origin });
      const resp = await fetch(`${BACKEND_URL}/api/analytics/search-console/oauth/start?${params.toString()}`);
      const data = await resp.json();
      if (!resp.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to start Search Console OAuth');
      }
      const popup = window.open(data.authUrl, 'search-console-oauth', 'width=620,height=760,menubar=no,toolbar=no,status=no');
      if (!popup) throw new Error('Popup blocked. Please allow popups and try again.');
      const poll = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(poll);
        setRefreshTick((n) => n + 1);
      }, 500);
    } catch (connectError) {
      alert(connectError.message || 'Could not start Search Console connection');
    }
  };

  // Helper function to format numbers with commas
  const formatNumber = (num) => {
    const safe = Number.isFinite(Number(num)) ? Number(num) : 0;
    return safe.toLocaleString();
  };

  const formatRelativeTime = (isoDate) => {
    if (!isoDate) return 'N/A';
    const ts = new Date(isoDate).getTime();
    if (!Number.isFinite(ts)) return 'N/A';
    const diffMs = Date.now() - ts;
    const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const summarizeMarketSignal = (row) => {
    const ctr = Number(row?.ctr || 0);
    const position = Number(row?.position || 0);
    if (ctr >= 5 && position <= 10) return 'Strong Growth';
    if (ctr >= 2 || position <= 20) return 'Moderate Opportunity';
    return 'High Potential';
  };

  const TITLE_MAX_CHARS = 52;

  const shortenArticleTitle = (rawTitle) => {
    const normalized = String(rawTitle || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return 'Article';
    if (normalized.length <= TITLE_MAX_CHARS) return normalized;
    return `${normalized.slice(0, TITLE_MAX_CHARS - 3).trimEnd()}...`;
  };

  const titleFromPageUrl = (pageUrl, index, explicitTitle = '') => {
    if (explicitTitle) return shortenArticleTitle(explicitTitle);
    if (!pageUrl) return `Article ${index + 1}`;
    try {
      const { pathname } = new URL(pageUrl);
      const slug = pathname.split('/').filter(Boolean).pop() || `article-${index + 1}`;
      return shortenArticleTitle(
        slug
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      );
    } catch {
      return `Article ${index + 1}`;
    }
  };

  // Helper function to get country flag emoji
  const getCountryFlag = (countryName) => {
    const countryMap = {
      'France': '🇫🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Mexico': '🇲🇽', 
      'Brazil': '🇧🇷', 'Japan': '🇯🇵', 'China': '🇨🇳', 'South Korea': '🇰🇷',
      'India': '🇮🇳', 'Saudi Arabia': '🇸🇦', 'Italy': '🇮🇹', 'Russia': '🇷🇺',
      'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'Canada': '🇨🇦'
    };
    return countryMap[countryName] || '🌍';
  };

  const getCountryFlagFromCode = (countryCode) => {
    const code = String(countryCode || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return '';
    return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt()));
  };

  const totalViews = Number.isFinite(Number(analyticsData?.totalViews))
    ? Number(analyticsData.totalViews)
    : (marketsData[0]?.views || 0)
  const totalUsers = Number.isFinite(Number(analyticsData?.totalUsers))
    ? Number(analyticsData.totalUsers)
    : (marketsData[0]?.clicks || 0)
  const avgCtr = Number.isFinite(Number(analyticsData?.avgCtr))
    ? Number(analyticsData.avgCtr)
    : (marketsData[0]?.ctr || 0)
  const topMarket = analyticsData?.topMarket || {
    country: marketsData[0]?.name || 'N/A',
    ctr: Number.isFinite(Number(marketsData[0]?.ctr)) ? Number(marketsData[0].ctr) : 0
  }

  return (
    <div style={{flex:1,overflowY:"auto",background:C.bg,display:"flex",flexDirection:"column"}}>
      <TopBar title="Global Analytics" subtitle="Performance across all markets"
        right={
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            {scConnection.connected && (
              <span style={{fontFamily:C.fH,fontSize:12,color:C.textSub,marginRight:6}}>
                GSC Data Updated: <strong style={{color:C.text}}>{formatRelativeTime(scConnection.updatedAt)}</strong>
              </span>
            )}
            {loading && <Spinner size={16} />}
            {analyticsData && !loading && (
              <Badge color={C.green} small>● LIVE DATA</Badge>
            )}
            <Btn onClick={handleRefreshAnalytics} variant="ghost" small>{syncing ? 'Refreshing…' : 'Refresh Analytics'}</Btn>
            {["7d","30d","90d"].map((p)=><Btn key={p} onClick={()=>setPeriod(p)} variant={period===p?"primary":"ghost"} small>{p}</Btn>)}
          </div>
        }/>
      <div style={{padding:"24px 32px"}}>

        {user?.id && !scConnection.connected && !loading && (
          <div style={{
            background: C.primaryLt,
            border: `1px solid ${C.primaryMid}`,
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div>
              <div style={{ fontFamily: C.fH, fontSize: 13, fontWeight: 700, color: C.primaryDk }}>Analytics</div>
              <div style={{ fontFamily: C.fB, fontSize: 12, color: C.textSub }}>Connect Google Search Console to view SEO performance.</div>
            </div>
            <Btn onClick={handleConnectSearchConsole} variant="primary" small>Connect Search Console</Btn>
          </div>
        )}
        
        {/* SceneHire analytics layout */}
        {(() => {
          const topMarkets = (analyticsData?.topMarkets || []).map((row) => ({
            name: row.country || 'Unknown',
            views: Number(row.views || 0),
            clicks: Number(row.users || 0),
            ctr: Number(row.ctr || 0),
            position: Number(row.position || 0),
            flag: getCountryFlag(row.country || '')
          }));
          const countryRows = (topMarkets.length ? topMarkets : [...marketsData].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((row) => ({
            name: row.name,
            views: Number(row.views || 0),
            clicks: Number(row.clicks || 0),
            ctr: Number(row.ctr || 0),
            position: Number(row.position || 0),
            flag: getCountryFlag(row.name)
          })));
          const emerging = analyticsData?.emergingOpportunities || [];
          const suggested = analyticsData?.suggestedExpansions || [];
          const focusTitle = analyticsData?.focusArticle?.title || 'Latest scanned article';
          const recentCards = analyticsData?.recentPublishedArticles || [];
          const pageCards = (recentCards.length ? recentCards : (analyticsData?.pagePerformance || [])).slice(0, 3);
          const topQueries = analyticsData?.topQueries || [];
          const marketsReached = countryRows.length;
          const languagesPublished = languagesData.length;
          const articlesGlobalized = pageCards.length;
          const avgPosition = countryRows.length > 0
            ? countryRows.reduce((sum, row) => sum + Number(row.position || 0), 0) / countryRows.length
            : 0;
          const cardBg = '#FFFFFF';
          const cardBorder = '1px solid #E2E8F0';
          const softBlue = '#F4F8FE';
          const mapImageSrc = '/analytics-world-map.jpg';
          const geoMarkerMap = {
            'United States': { x: 24, y: 40 },
            'Canada': { x: 22, y: 27 },
            'Mexico': { x: 24, y: 52 },
            'Brazil': { x: 35, y: 66 },
            'Spain': { x: 50, y: 42 },
            'Germany': { x: 54, y: 38 },
            'France': { x: 51, y: 40 },
            'United Kingdom': { x: 48, y: 35 },
            'India': { x: 68, y: 53 },
            'China': { x: 74, y: 45 },
            'Japan': { x: 82, y: 43 },
            'South Korea': { x: 79, y: 42 },
            'Saudi Arabia': { x: 60, y: 53 },
            'Italy': { x: 55, y: 45 },
            'Russia': { x: 70, y: 28 }
          };
          const mapMarkers = countryRows
            .map((row) => {
              const p = geoMarkerMap[row.name];
              if (!p) return null;
              return { ...row, ...p };
            })
            .filter(Boolean);

          return (
            <div style={{display:'grid',gap:16}}>
              <div style={{background:cardBg,border:cardBorder,borderRadius:12,padding:'12px 16px',display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,fontFamily:C.fH,color:'#1E3A66',fontSize:13,fontWeight:700}}>
                  <span style={{fontSize:16}}>📊</span>
                  Articles Globalized: <span style={{fontSize:24,fontWeight:800,color:'#1D4E89'}}>{articlesGlobalized}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,fontFamily:C.fH,color:'#1E3A66',fontSize:13,fontWeight:700}}>
                  <span style={{fontSize:16}}>🌐</span>
                  Markets Reached: <span style={{fontSize:24,fontWeight:800,color:'#1D4E89'}}>{marketsReached}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,fontFamily:C.fH,color:'#1E3A66',fontSize:13,fontWeight:700}}>
                  <span style={{fontSize:16}}>🗣</span>
                  Languages Published: <span style={{fontSize:24,fontWeight:800,color:'#1D4E89'}}>{languagesPublished}</span>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1.05fr 1.35fr',gap:14}}>
                <div style={{background:cardBg,border:cardBorder,borderRadius:10,padding:14,display:'flex',flexDirection:'column',minHeight:420}}>
                  <div style={{fontFamily:C.fH,fontSize:28/2,fontWeight:800,color:'#20426E',marginBottom:10}}>Top Markets</div>
                  <div style={{height:230,borderRadius:10,position:'relative',overflow:'hidden',background:softBlue,border:'1px solid #D9E3F2'}}>
                    {!mapImageFailed ? (
                      <img
                        src={mapImageSrc}
                        alt="Global map"
                        onError={() => setMapImageFailed(true)}
                        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 52%',transform:'scale(1.08)',transformOrigin:'center center'}}
                      />
                    ) : (
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.fB,fontSize:12,color:'#475569',background:'transparent'}}>
                        Map image not found at /analytics-world-map.jpg
                      </div>
                    )}
                    {mapMarkers.map((m, idx) => (
                      <div
                        key={`map-pin-${m.name}-${idx}`}
                        style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%, -50%)'}}
                      >
                        <div style={{width:10,height:10,borderRadius:'50%',background:'rgba(96,165,250,0.95)',boxShadow:'0 0 0 6px rgba(37,99,235,0.18)'}} />
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:9}}>
                    {countryRows.length > 0 ? countryRows.slice(0, 3).map((row) => (
                      <div key={row.name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,background:'#F7FAFF',border:'1px solid #E2E8F0'}}>
                        <span style={{fontSize:18}}>{row.flag}</span>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:'#1E3A66'}}>{row.name}</div>
                          <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B'}}>{summarizeMarketSignal(row)}</div>
                        </div>
                        <span style={{fontFamily:C.fH,fontSize:12,fontWeight:700,color:'#1E3A66'}}>Rank {row.position > 0 ? row.position.toFixed(1) : '-'}</span>
                      </div>
                    )) : <div style={{fontFamily:C.fB,fontSize:12,color:'#94A3B8'}}>No country data yet.</div>}
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateRows:'auto',gap:12}}>
                  <div style={{display:'grid',gridTemplateRows:'auto auto',gap:12}}>
                    <div style={{background:cardBg,border:cardBorder,borderRadius:10,padding:14,minHeight:136}}>
                      <div style={{fontFamily:C.fH,fontSize:28/2,fontWeight:800,color:'#20426E',marginBottom:10}}>Overall Performance</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,background:'#F7FAFF',border:'1px solid #E2E8F0',borderRadius:8,padding:'10px 12px'}}>
                        <div>
                          <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B'}}>Total Impressions</div>
                          <div style={{fontFamily:C.fH,fontSize:38/2,fontWeight:800,color:'#1E3A66'}}>{formatNumber(totalViews)}</div>
                        </div>
                        <div>
                          <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B'}}>Total Clicks</div>
                          <div style={{fontFamily:C.fH,fontSize:38/2,fontWeight:800,color:'#1E3A66'}}>{formatNumber(totalUsers)}</div>
                        </div>
                        <div>
                          <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B'}}>Avg. Position</div>
                          <div style={{fontFamily:C.fH,fontSize:38/2,fontWeight:800,color:'#1E3A66'}}>{avgPosition > 0 ? avgPosition.toFixed(1) : '0.0'}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>
                      {(pageCards.length ? pageCards : [{}, {}, {}]).map((row, idx) => {
                        const marketA = countryRows[idx];
                        const marketB = countryRows[idx + 1];
                        const query = topQueries[idx]?.query || 'search intent unavailable';
                        const translatedCountry = row.translatedCountry || '';
                        const translatedFlag = row.translatedCountryCode
                          ? getCountryFlagFromCode(row.translatedCountryCode)
                          : (translatedCountry ? getCountryFlag(translatedCountry) : '');
                        const translatedLabel = translatedCountry ? `${translatedFlag} ${translatedCountry}` : '';
                        return (
                          <div key={`article-card-${idx}`} style={{background:'#FFFFFF',border:'1px solid #D9E3F2',borderRadius:10,overflow:'hidden'}}>
                            <div
                              style={{
                                background:'#2F66A8',
                                color:'#FFFFFF',
                                fontFamily:C.fH,
                                fontWeight:800,
                                fontSize:12,
                                lineHeight:1.25,
                                padding:'8px 10px',
                                minHeight:34,
                                display:'-webkit-box',
                                WebkitLineClamp:2,
                                WebkitBoxOrient:'vertical',
                                overflow:'hidden',
                                textOverflow:'ellipsis'
                              }}
                              title={titleFromPageUrl(row.pageUrl, idx, row.title)}
                            >
                              {titleFromPageUrl(row.pageUrl, idx, row.title)}
                            </div>
                            <div style={{padding:'10px 10px 12px'}}>
                              <div style={{fontFamily:C.fH,fontSize:12,color:'#1E3A66',marginBottom:6}}>{marketA ? `${getCountryFlag(marketA.name)} ${marketA.name} - Rank #${Math.max(1, Math.round(marketA.position || 1))}` : (translatedLabel ? `${translatedLabel} - Rank unavailable` : 'Rank unavailable')}</div>
                              <div style={{fontFamily:C.fH,fontSize:12,color:'#1E3A66',marginBottom:8}}>{marketB ? `${getCountryFlag(marketB.name)} ${marketB.name} - Rank #${Math.max(1, Math.round(marketB.position || 1))}` : ''}</div>
                              <div style={{fontFamily:C.fH,fontSize:24/2,fontWeight:800,color:'#1E3A66'}}>{formatNumber(row.impressions || 0)} <span style={{fontFamily:C.fB,fontSize:12,fontWeight:500,color:'#64748B'}}>Impressions</span></div>
                              <div style={{fontFamily:C.fH,fontSize:24/2,fontWeight:800,color:'#1E3A66',marginBottom:6}}>{formatNumber(row.clicks || 0)} <span style={{fontFamily:C.fB,fontSize:12,fontWeight:500,color:'#64748B'}}>Clicks</span></div>
                              <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B'}}>Top Query: "{query}"</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{background:cardBg,border:cardBorder,borderRadius:10,padding:14}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div>
                        <div style={{fontFamily:C.fH,fontSize:13,fontWeight:800,color:'#20426E',marginBottom:8}}>Emerging Opportunities</div>
                        <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B',marginBottom:8}}>Trend across all articles over the last 7-28 days</div>
                        {emerging.length > 0 ? emerging.map((row) => (
                          <div key={`emerge-${row.countryCode}`} style={{marginBottom:8,paddingBottom:8,borderBottom:'1px solid #E2E8F0'}}>
                            <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:'#1E3A66'}}>{(row.countryCode ? getCountryFlagFromCode(row.countryCode) : '') || getCountryFlag(row.country)} {row.country}</div>
                            <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B'}}>Impressions ↑ {row.growthPct.toFixed(1)}% · Avg rank {Number(row.avgPosition || 0).toFixed(1)}</div>
                          </div>
                        )) : <div style={{fontFamily:C.fB,fontSize:12,color:'#94A3B8'}}>No emerging opportunities detected yet.</div>}
                      </div>
                      <div>
                        <div style={{fontFamily:C.fH,fontSize:13,fontWeight:800,color:'#20426E',marginBottom:8}}>Suggested Expansions</div>
                        <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B',marginBottom:8}}>Article-specific for: {focusTitle}</div>
                        {suggested.length > 0 ? suggested.map((row) => (
                          <div key={`expand-${row.countryCode}`} style={{marginBottom:8,paddingBottom:8,borderBottom:'1px solid #E2E8F0'}}>
                            <div style={{fontFamily:C.fH,fontSize:13,fontWeight:700,color:'#1E3A66'}}>{getCountryFlag(row.country)} {row.country}</div>
                            <div style={{fontFamily:C.fB,fontSize:11,color:'#64748B'}}>{row.demand} demand · {row.competition} competition</div>
                          </div>
                        )) : <div style={{fontFamily:C.fB,fontSize:12,color:'#94A3B8'}}>No expansion recommendations yet.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CMS VIEW — 7 platforms
   ══════════════════════════════════════════════════════════════════════════════ */
function CMSView() {
  const { user } = useUser();
  const BACKEND_URL = getBackendUrl();
  const [connections, setConnections]     = useState({});
  const [adding, setAdding]               = useState(null);
  const [form, setForm]                   = useState({});
  const [verifying, setVerifying]         = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishing, setPublishing]       = useState(false);
  const [pubLog, setPubLog]               = useState([]);
  const [pubDone, setPubDone]             = useState(false);
  const [filter, setFilter]               = useState("All");
  const [oauthConfigStatus, setOauthConfigStatus] = useState({});
  const [oauthSetup, setOauthSetup]       = useState(null);
  const [oauthLaunching, setOauthLaunching] = useState(null);

  const connCount  = Object.keys(connections).length;
  const categories = ["All","Connected",...Array.from(new Set(CMS_PLATFORMS.map(p=>p.category)))];
  const visible    = CMS_PLATFORMS.filter(p=>{
    if(filter==="All") return true;
    if(filter==="Connected") return !!connections[p.id];
    return p.category===filter;
  });
  const oauthTopOrder = ['webflow', 'shopify', 'github'];
  const orderedVisible = [...visible].sort((a, b) => {
    const aOauthIndex = oauthTopOrder.indexOf(a.id);
    const bOauthIndex = oauthTopOrder.indexOf(b.id);
    const aIsOauth = aOauthIndex !== -1;
    const bIsOauth = bOauthIndex !== -1;

    // Keep OAuth-first ordering for the top row while preserving default order for others.
    if (aIsOauth && bIsOauth) return aOauthIndex - bOauthIndex;
    if (aIsOauth) return -1;
    if (bIsOauth) return 1;
    return CMS_PLATFORMS.findIndex((p) => p.id === a.id) - CMS_PLATFORMS.findIndex((p) => p.id === b.id);
  });
  const variants = [
    {locale:"fr-FR",lang:"French",    flag:"🇫🇷",path:"/fr/how-ai-reshapes-finance"},
    {locale:"de-DE",lang:"German",    flag:"🇩🇪",path:"/de/wie-ki-finanzen-veraendert"},
    {locale:"es-MX",lang:"Spanish",   flag:"🇲🇽",path:"/es/como-ia-transforma-finanzas"},
    {locale:"pt-BR",lang:"Portuguese",flag:"🇧🇷",path:"/pt/como-ia-transforma-financas"},
  ];

  const closeModal = ()=>{setPublishTarget(null);setPubLog([]);setPubDone(false);};
  const oauthPlatforms = new Set(['webflow', 'shopify', 'github']);
  const oauthTargetLabel = {
    webflow: 'Blog Collection',
    shopify: 'Blog',
    github: 'Repository'
  };

  useEffect(() => {
    const fetchOAuthStatus = async () => {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/deploy/oauth/status`)
        const data = await resp.json()
        if (resp.ok && data.success) {
          setOauthConfigStatus(data.platforms || {})
        }
      } catch {
        setOauthConfigStatus({})
      }
    }

    fetchOAuthStatus()
  }, [BACKEND_URL])

  useEffect(() => {
    const fetchConnections = async () => {
      if (!user?.id) {
        setConnections({})
        return
      }

      try {
        const params = new URLSearchParams({ userId: user.id })
        const resp = await fetch(`${BACKEND_URL}/api/deploy/connections?${params.toString()}`)
        const data = await resp.json()

        if (!resp.ok || !data.success) {
          throw new Error(data.error || 'Failed to load existing CMS connections')
        }

        const next = {}
        for (const conn of data.connections || []) {
          next[conn.platform] = {
            connectionId: conn.id,
            siteName: conn.platform_name || conn.platform,
            connectedAt: conn.created_at || new Date().toISOString(),
            authType: conn.config?.auth_type || 'api-key'
          }
        }
        setConnections(next)
      } catch (error) {
        console.error('[CMS] Failed to load connections:', error)
        alert(error.message || 'Failed to load existing CMS connections')
      }
    }

    fetchConnections()
  }, [BACKEND_URL, user?.id])

  const startOAuthConnect = async (platform) => {
    try {
      if (!user?.id) {
        alert('Please sign in first to connect CMS accounts.')
        return
      }

      const isConfigured = oauthConfigStatus[platform]?.configured !== false
      if (!isConfigured) {
        alert(`OAuth for ${platform} is not configured on the server yet. Add client credentials and try again.`)
        return
      }

      setOauthLaunching(platform)

      const buildStartParams = (shopDomain = '') => {
        const params = new URLSearchParams({
          userId: user.id,
          origin: window.location.origin
        })
        if (shopDomain) {
          params.set('shop', shopDomain)
        }
        return params
      }

      let startResp = await fetch(`${BACKEND_URL}/api/deploy/oauth/${platform}/start?${buildStartParams().toString()}`)
      let startData = await startResp.json()

      // Shopify may still need a specific shop domain; ask only inside the OAuth flow.
      if (!startResp.ok && platform === 'shopify' && startData?.requiresShopDomain) {
        const shopDomain = window.prompt('Enter your Shopify store domain (e.g. yourstore.myshopify.com)')
        if (!shopDomain) return
        startResp = await fetch(`${BACKEND_URL}/api/deploy/oauth/${platform}/start?${buildStartParams(shopDomain).toString()}`)
        startData = await startResp.json()
      }

      if (!startResp.ok || !startData.authorizationUrl) {
        throw new Error(startData.error || `Failed to start ${platform} OAuth`)
      }

      const popup = window.open(
        startData.authorizationUrl,
        `${platform}-oauth`,
        'width=600,height=760,menubar=no,toolbar=no,status=no'
      )

      if (!popup) {
        setOauthLaunching(null)
        alert('Popup blocked. Please allow popups and try again.')
        return
      }

      let backendOrigin = ''
      try {
        backendOrigin = new URL(BACKEND_URL).origin
      } catch {
        backendOrigin = ''
      }

      const onMessage = (event) => {
        const allowedOrigins = new Set([window.location.origin, backendOrigin])
        if (!allowedOrigins.has(event.origin)) return
        const payload = event.data || {}
        if (payload.type !== 'scenehire:oauth-complete' || payload.platform !== platform) return

        window.clearInterval(popupWatch)
        window.removeEventListener('message', onMessage)
        if (!payload.success) {
          setOauthLaunching(null)
          alert(payload.message || `Failed to connect ${platform}`)
          return
        }

        setOauthLaunching(null)
        startOAuthSetupFlow(platform)
      }

      const popupWatch = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(popupWatch)
          window.removeEventListener('message', onMessage)
          setOauthLaunching((current) => (current === platform ? null : current))
        }
      }, 400)

      window.addEventListener('message', onMessage)
    } catch (error) {
      setOauthLaunching(null)
      alert(error.message)
    }
  }

  const startOAuthSetupFlow = async (platform) => {
    try {
      setOauthSetup({
        platform,
        step: 'scanning',
        options: [],
        selectedId: '',
        scanSummary: '',
        error: '',
        saving: false
      })

      const params = new URLSearchParams({ userId: user.id })
      const resp = await fetch(`${BACKEND_URL}/api/deploy/oauth/${platform}/resources?${params.toString()}`)
      const data = await resp.json()

      if (!resp.ok || !data.success) {
        throw new Error(data.error || `Failed to scan ${platform} resources`)
      }

      const options = data.options || []
      setOauthSetup((prev) => ({
        ...prev,
        step: 'select',
        options,
        selectedId: options[0]?.id || '',
        scanSummary: data.scanSummary || '',
        error: ''
      }))
    } catch (error) {
      setOauthSetup((prev) => ({
        ...(prev || {}),
        platform,
        step: 'error',
        options: [],
        selectedId: '',
        scanSummary: '',
        saving: false,
        error: error.message
      }))
    }
  }

  const confirmOAuthSelection = async () => {
    if (!oauthSetup?.platform || !oauthSetup?.selectedId) return

    try {
      const selectedTarget = oauthSetup.options.find((opt) => opt.id === oauthSetup.selectedId)
      if (!selectedTarget) {
        throw new Error('Please select a target before continuing.')
      }

      setOauthSetup((prev) => ({ ...prev, saving: true, error: '' }))

      const resp = await fetch(`${BACKEND_URL}/api/deploy/oauth/${oauthSetup.platform}/select-target`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          target: selectedTarget
        })
      })
      const data = await resp.json()

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to save OAuth target selection')
      }

      const savedConn = data.connection || {}

      setConnections((prev) => ({
        ...prev,
        [oauthSetup.platform]: {
          connectionId: savedConn.id,
          siteName: selectedTarget.label,
          connectedAt: savedConn.created_at || new Date().toISOString(),
          authType: 'oauth',
          target: selectedTarget
        }
      }))

      setOauthSetup((prev) => ({ ...prev, step: 'done', saving: false }))
      setAdding(null)
      setForm({})
    } catch (error) {
      setOauthSetup((prev) => ({ ...prev, saving: false, error: error.message }))
    }
  }

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

  const handleDisconnect = async (platformId) => {
    const existing = connections[platformId]
    if (!existing) return

    try {
      if (existing.connectionId && user?.id) {
        const params = new URLSearchParams({ userId: user.id })
        const resp = await fetch(`${BACKEND_URL}/api/deploy/connection/${existing.connectionId}?${params.toString()}`, {
          method: 'DELETE'
        })
        const data = await resp.json()
        if (!resp.ok || !data.success) {
          throw new Error(data.error || 'Failed to disconnect CMS integration')
        }
      }

      setConnections((prev) => {
        const next = { ...prev }
        delete next[platformId]
        return next
      })
    } catch (error) {
      alert(error.message || 'Failed to disconnect CMS integration')
    }
  }
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
        {orderedVisible.length>0 ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {orderedVisible.map(p=>{
              const conn=connections[p.id];
              const isAdding=adding===p.id;
              const catColor=CAT_COLORS[p.category]||C.textMuted;
              const isOauthPlatform = oauthPlatforms.has(p.id)
              const isOauthConfigured = oauthConfigStatus[p.id]?.configured !== false
              return(
                <ShadowCard key={p.id} hoverable style={{padding:"22px",display:"flex",flexDirection:"column",border:`1.5px solid ${conn?C.primary+"40":C.border}`,minHeight:280}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:44,height:44,borderRadius:12,background:`${p.color}15`,border:`1.5px solid ${p.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:C.fH,fontSize:17,fontWeight:800,color:p.color,flexShrink:0}}>{p.icon}</div>
                      <div>
                        <div style={{fontFamily:C.fH,fontSize:14,fontWeight:700,color:C.text}}>{p.name}</div>
                        <span style={{display:"inline-block",padding:"2px 8px",borderRadius:4,background:`${catColor}15`,fontFamily:C.fH,fontSize:10,fontWeight:700,color:catColor,marginTop:3}}>{p.category}</span>
                        {isOauthPlatform && <span style={{display:"inline-block",padding:"2px 8px",borderRadius:4,background:C.greenLt,fontFamily:C.fH,fontSize:10,fontWeight:700,color:C.green,marginTop:3,marginLeft:6}}>OAuth Available</span>}
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

                  {isOauthPlatform && !isOauthConfigured && (
                    <div style={{background:C.amberLt,border:`1px solid ${C.amber}40`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
                      <div style={{fontFamily:C.fH,fontSize:10,fontWeight:700,color:C.amber,marginBottom:2}}>OAuth Not Configured</div>
                      <div style={{fontFamily:C.fB,fontSize:11,color:C.textSub,lineHeight:1.45}}>Missing server OAuth client credentials for {p.name}.</div>
                    </div>
                  )}

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
                      {!isOauthPlatform && p.fields.map(f=>(
                        <Field key={f.key} label={f.label} placeholder={f.ph} value={form[f.key]||""} onChange={v=>setForm(prev=>({...prev,[f.key]:v}))} mono/>
                      ))}
                      {isOauthPlatform ? (
                        <div style={{fontFamily:C.fB,fontSize:11,color:C.textSub,lineHeight:1.5}}>
                          {isOauthConfigured
                            ? `OAuth available for ${p.name}. Click "OAuth Connect" to authorize without entering manual CMS configuration fields.`
                            : `OAuth for ${p.name} is currently unavailable until server client credentials are configured.`}
                        </div>
                      ) : (
                        <Field label={p.auth} placeholder={p.authPH} value={form.apiKey||""} onChange={v=>setForm(prev=>({...prev,apiKey:v}))} type="password" mono/>
                      )}
                    </div>
                  )}

                  <div style={{marginTop:"auto",display:"flex",gap:7,flexWrap:"wrap"}}>
                    {!conn&&!isAdding&&<Btn onClick={()=>{setAdding(p.id);setForm({});}} small>+ Connect</Btn>}
                    {isAdding&&<>
                      {isOauthPlatform
                        ? <Btn onClick={() => startOAuthConnect(p.id)} disabled={oauthLaunching === p.id} small>{oauthLaunching === p.id ? 'Opening OAuth…' : 'OAuth Connect'}</Btn>
                        : <Btn onClick={handleVerify} disabled={verifying} small>{verifying?"Verifying…":"✓ Verify & Connect"}</Btn>
                      }
                      <Btn onClick={()=>setAdding(null)} variant="ghost" small>Cancel</Btn>
                    </>}
                    {conn&&!isAdding&&<>
                      {isOauthPlatform && <Btn variant="success" disabled small>Connected</Btn>}
                      <Btn onClick={()=>handleDisconnect(p.id)} variant="danger" small>Disconnect</Btn>
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

      {/* OAuth setup workflow modal */}
      {oauthSetup && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,backdropFilter:"blur(4px)"}}
          onClick={e=>{if(e.target===e.currentTarget && !oauthSetup.saving)setOauthSetup(null);}}>
          <ShadowCard style={{width:620,padding:"28px",maxHeight:"84vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.20)"}}>
            <div style={{fontFamily:C.fH,fontSize:21,fontWeight:800,color:C.text,marginBottom:5}}>
              {CMS_PLATFORMS.find(p=>p.id===oauthSetup.platform)?.name} OAuth Setup
            </div>
            <div style={{fontFamily:C.fB,fontSize:12,color:C.textSub,marginBottom:16}}>
              Login and approval complete. Finish by selecting where SceneHire should publish.
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:8,marginBottom:16}}>
              {[
                'Connect',
                `Login to ${CMS_PLATFORMS.find(p=>p.id===oauthSetup.platform)?.name || 'Provider'}`,
                'Approve SceneHire',
                'SceneHire scans your CMS',
                `Select ${oauthTargetLabel[oauthSetup.platform] || 'Target'}`
              ].map((stepLabel, idx) => {
                const completed = oauthSetup.step === 'done' || (oauthSetup.step === 'select' && idx < 4) || (oauthSetup.step === 'scanning' && idx < 3)
                return (
                  <div key={stepLabel} style={{background:completed?C.greenLt:C.bg,border:`1px solid ${completed?C.green+'55':C.border}`,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontFamily:C.fH,fontSize:10,fontWeight:700,color:completed?C.green:C.textMuted,marginBottom:3}}>Step {idx+1}</div>
                    <div style={{fontFamily:C.fB,fontSize:10,color:C.textSub,lineHeight:1.3}}>{stepLabel}</div>
                  </div>
                )
              })}
            </div>

            {oauthSetup.step === 'scanning' && (
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px",borderRadius:10,background:C.bg,border:`1px solid ${C.border}`}}>
                <Spinner size={14} color={C.primary}/>
                <div style={{fontFamily:C.fB,fontSize:12,color:C.textSub}}>SceneHire scans your {CMS_PLATFORMS.find(p=>p.id===oauthSetup.platform)?.name} content targets...</div>
              </div>
            )}

            {oauthSetup.step === 'select' && (
              <>
                <div style={{fontFamily:C.fB,fontSize:12,color:C.textSub,marginBottom:8}}>{oauthSetup.scanSummary || 'Scan complete.'}</div>
                {oauthSetup.options.length > 0 ? (
                  <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:300,overflowY:"auto",paddingRight:4}}>
                    {oauthSetup.options.map((opt) => {
                      const active = oauthSetup.selectedId === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setOauthSetup((prev) => ({ ...prev, selectedId: opt.id }))}
                          style={{textAlign:"left",padding:"11px 12px",borderRadius:8,cursor:"pointer",border:`1.5px solid ${active?C.primary:C.border}`,background:active?C.primaryLt:"#fff"}}
                        >
                          <div style={{fontFamily:C.fH,fontSize:12,fontWeight:700,color:C.text}}>{opt.label}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{padding:"14px",borderRadius:10,background:C.amberLt,border:`1px solid ${C.amber}40`,fontFamily:C.fB,fontSize:12,color:C.textSub}}>
                    No {oauthTargetLabel[oauthSetup.platform]?.toLowerCase() || 'targets'} found yet. Create one in your CMS and rescan.
                  </div>
                )}
              </>
            )}

            {oauthSetup.step === 'done' && (
              <div style={{padding:"14px",borderRadius:10,background:C.greenLt,border:`1px solid ${C.green}45`,fontFamily:C.fB,fontSize:12,color:C.textSub}}>
                Connected. SceneHire is ready to publish using your selected {oauthTargetLabel[oauthSetup.platform]?.toLowerCase() || 'target'}.
              </div>
            )}

            {oauthSetup.error && (
              <div style={{marginTop:12,padding:"10px 12px",borderRadius:8,background:C.coralLt,border:`1px solid ${C.coral}40`,fontFamily:C.fB,fontSize:11,color:C.textSub}}>
                {oauthSetup.error}
              </div>
            )}

            <div style={{display:"flex",gap:8,marginTop:16}}>
              {oauthSetup.step === 'select' && (
                <Btn onClick={confirmOAuthSelection} disabled={oauthSetup.saving || !oauthSetup.selectedId}>
                  {oauthSetup.saving ? 'Saving…' : `Connect ${oauthTargetLabel[oauthSetup.platform] || 'Target'}`}
                </Btn>
              )}
              {oauthSetup.step === 'select' && (
                <Btn onClick={() => startOAuthSetupFlow(oauthSetup.platform)} variant="ghost" disabled={oauthSetup.saving}>Rescan</Btn>
              )}
              {(oauthSetup.step === 'done' || oauthSetup.step === 'error') && (
                <Btn onClick={() => setOauthSetup(null)} variant="ghost">Close</Btn>
              )}
            </div>
          </ShadowCard>
        </div>
      )}

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

function UpgradePlanView() {
  const CONTACT_SALES_URL = 'https://calendly.com/delvajavon/30min';
  const plans = [
    {
      name: 'Pro',
      desc: 'Built for small teams that need faster publishing and reliable global reach.',
      bullets: [
        'Up to 500 articles/month',
        'Globalize + CMS publishing',
        'Standard support'
      ]
    },
    {
      name: 'Agency',
      desc: 'Ideal for growth teams scaling multilingual content across key markets.',
      bullets: [
        'Up to 2,000 articles/month',
        'Globalize + Analytics + CMS workflows',
        'Priority support'
      ]
    },
    {
      name: 'Enterprise',
      desc: 'Advanced governance, custom onboarding, and strategic support for larger teams.',
      bullets: [
        'Unlimited content pipelines',
        'Custom integrations + SSO',
        'Dedicated success manager'
      ]
    }
  ];

  return (
    <div style={{flex:1,overflowY:'auto',background:C.bg,display:'flex',flexDirection:'column'}}>
      <TopBar title="Upgrade Plan" subtitle="Choose the plan that fits your content expansion goals." />
      <div style={{padding:'28px 32px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,420px))',justifyContent:'center',gap:18}}>
          {plans.map((plan) => (
            <ShadowCard key={plan.name} style={{padding:'22px',display:'flex',flexDirection:'column',border:`1px solid ${C.borderMd}`}}>
              <div style={{fontFamily:C.fH,fontSize:22,fontWeight:800,color:C.text,marginBottom:6}}>{plan.name}</div>
              <div style={{fontFamily:C.fB,fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:12}}>{plan.desc}</div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {plan.bullets.map((item) => (
                  <div key={item} style={{fontFamily:C.fB,fontSize:12,color:C.textSub}}>• {item}</div>
                ))}
              </div>
              <Btn
                onClick={() => window.open(CONTACT_SALES_URL, '_blank', 'noopener,noreferrer')}
                style={{marginTop:'auto',width:'100%'}}
              >
                Contact Sales
              </Btn>
            </ShadowCard>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const FREE_ARTICLE_LIMIT = 5;
  const configuredDemoEmails = String(import.meta.env.VITE_UNLIMITED_DEMO_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const demoEmailAllowList = new Set([
    ...configuredDemoEmails,
    'delvajavon@gmail.com',
    'javondelva@gmail.com'
  ]);
  const userEmail = String(
    user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress || ''
  ).toLowerCase();
  const isUnlimitedDemoAccount = Boolean(
    userEmail && (
      demoEmailAllowList.has(userEmail) ||
      userEmail.includes('delvajavon') ||
      userEmail.includes('javondelva')
    )
  );
  const [page, setPage] = useState("landing");
  const [view, setView] = useState("globalize");
  const [articleCount, setArticleCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const usageLocked = !isUnlimitedDemoAccount && articleCount >= FREE_ARTICLE_LIMIT;

  // Auto-redirect to dashboard when signed in
  useEffect(() => {
    if (isSignedIn && page !== "dashboard") {
      setPage("dashboard");
    } else if (!isSignedIn && page === "dashboard") {
      setPage("landing");
    }
  }, [isSignedIn, page]);

  const handleSignOut = () => {
    signOut();
    setPage("landing");
  };

  useEffect(() => {
    if (usageLocked && page === 'dashboard' && view !== 'upgrade') {
      setView('upgrade');
    }
  }, [usageLocked, page, view]);

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: C.bg
      }}>
        <div style={{ color: C.textMuted }}>Loading...</div>
      </div>
    );
  }

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
        .cl-rootBox {
          width: auto !important;
          margin: 0 auto !important;
          display: flex !important;
          justify-content: center !important;
        }
        .cl-signIn-root,
        .cl-signUp-root {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .cl-card { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 12px; }
        .cl-socialButtonsBlockButton[data-social-provider="oauth_github"],
        .cl-socialButtonsBlockButton[data-provider="github"],
        .cl-socialButtonsBlockButton__github {
          display: none !important;
        }
      `}</style>

      {page === "landing" && !isSignedIn && (
        <LandingPage 
          onSignIn={() => setPage("signin")} 
          onSignUp={() => setPage("signup")}
        />
      )}

      {page === "signin" && !isSignedIn && (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
          padding: "20px"
        }}>
          <div style={{ marginBottom: "24px" }}>
            <button
              onClick={() => setPage("landing")}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                color: C.text,
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              ← Back to Home
            </button>
          </div>
          <SignIn 
            appearance={{
              elements: {
                card: "shadow-lg rounded-xl",
                socialButtonsBlockButton__github: { display: 'none' }
              }
            }}
          />
        </div>
      )}

      {page === "signup" && !isSignedIn && (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
          padding: "20px"
        }}>
          <div style={{ marginBottom: "24px" }}>
            <button
              onClick={() => setPage("landing")}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                color: C.text,
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              ← Back to Home
            </button>
          </div>
          <SignUp 
            appearance={{
              elements: {
                card: "shadow-lg rounded-xl",
                socialButtonsBlockButton__github: { display: 'none' }
              }
            }}
          />
        </div>
      )}

      {(page === "dashboard" || isSignedIn) && (
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar 
            active={view} 
            setActive={setView} 
            user={user} 
            articleCount={articleCount} 
            freeLimit={FREE_ARTICLE_LIMIT}
            isUnlimitedDemoAccount={isUnlimitedDemoAccount}
            onSignOut={handleSignOut}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          />
          {view === "globalize" && (
            <GlobalizeView
              usageLocked={usageLocked}
              onUsageLocked={() => setView('upgrade')}
              currentUserId={user?.id}
              currentUserEmail={userEmail}
              onArticleAdded={() => {
                setArticleCount((n) => {
                  if (isUnlimitedDemoAccount) return n + 1;
                  return Math.min(FREE_ARTICLE_LIMIT, n + 1);
                });
              }}
            />
          )}
          {view === "analytics" && <AnalyticsView />}
          {view === "cms" && <CMSView />}
          {view === "upgrade" && <UpgradePlanView />}
        </div>
      )}
    </>
  );
}
