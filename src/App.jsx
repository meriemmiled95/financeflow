import { useState, useEffect, useCallback, useMemo } from "react";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const CATEGORIES = [
  { id: "rent", label: "🏠 Loyer", color: "#E74C3C" },
  { id: "food", label: "🛒 Alimentation", color: "#F39C12" },
  { id: "transport", label: "🚗 Transport", color: "#3498DB" },
  { id: "health", label: "💊 Santé", color: "#2ECC71" },
  { id: "beauty", label: "💄 Beauté & Soins", color: "#E91E90" },
  { id: "clothes", label: "👗 Vêtements", color: "#9B59B6" },
  { id: "bills", label: "📱 Factures", color: "#1ABC9C" },
  { id: "education", label: "📚 Éducation", color: "#34495E" },
  { id: "entertainment", label: "🎬 Loisirs", color: "#E67E22" },
  { id: "savings", label: "💰 Épargne", color: "#27AE60" },
  { id: "gifts", label: "🎁 Cadeaux", color: "#8E44AD" },
  { id: "other", label: "📦 Autres", color: "#7F8C8D" },
];
const CURRENCY_OPTIONS = [
  { code: "TND", symbol: "DT", label: "Dinar Tunisien" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "MAD", symbol: "MAD", label: "Dirham Marocain" },
  { code: "DZD", symbol: "DA", label: "Dinar Algérien" },
  { code: "SAR", symbol: "SAR", label: "Riyal Saoudien" },
];
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function fmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function parseDate(s) { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }

function useIsMobile(bp=768) {
  const [m, setM] = useState(typeof window!=="undefined" && window.innerWidth < bp);
  useEffect(() => { const h = () => setM(window.innerWidth < bp); window.addEventListener("resize",h); return () => window.removeEventListener("resize",h); }, [bp]);
  return m;
}

// ═══════════════════════════════════════════════════
// FIREBASE DATA LAYER
// ═══════════════════════════════════════════════════
async function loadUserData(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) { console.error("Load error:", e); return null; }
}

async function saveUserData(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
  } catch (e) { console.error("Save error:", e); }
}

// ═══════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════
function BarChart({ data, maxVal, color }) {
  const h=80, barW=Math.max(4,Math.min(18,260/Math.max(data.length,1))), gap=2, w=data.length*(barW+gap);
  return (
    <svg width="100%" viewBox={`0 0 ${Math.max(w,60)} ${h+16}`} style={{overflow:"visible"}}>
      {data.map((v,i) => { const bh=maxVal?(v.value/maxVal)*h:0; return (
        <g key={i}><rect x={i*(barW+gap)} y={h-bh} width={barW} height={Math.max(bh,1)} rx={2} fill={color} opacity={.85}/>
        <text x={i*(barW+gap)+barW/2} y={h+12} textAnchor="middle" style={{fontSize:7,fill:"#8b949e",fontFamily:"'DM Sans'"}}>{v.label}</text></g>
      );})}
    </svg>
  );
}
function Donut({ segments, size=130 }) {
  const r=46, cx=size/2, cy=size/2, circ=2*Math.PI*r, total=segments.reduce((s,seg)=>s+seg.value,0);
  let offset=0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#21262d" strokeWidth={14}/>
      {total>0 && segments.filter(s=>s.value>0).map((seg,i)=>{
        const dash=(seg.value/total)*circ;
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={14}
          strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-offset} strokeLinecap="butt"
          style={{transform:"rotate(-90deg)",transformOrigin:"center",transition:"all .5s"}}/>;
        offset+=dash; return el;
      })}
      <text x={cx} y={cy-4} textAnchor="middle" style={{fontSize:14,fontWeight:700,fill:"#f0f6fc",fontFamily:"'Playfair Display'"}}>{total>0?"100%":"0%"}</text>
      <text x={cx} y={cy+12} textAnchor="middle" style={{fontSize:9,fill:"#8b949e",fontFamily:"'DM Sans'"}}>réparti</text>
    </svg>
  );
}

// ─── Reusable ────────────────────────────────────
function Card({children,style,...p}){return <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:14,padding:16,...style}} {...p}>{children}</div>;}
function STitle({children}){return <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:600,color:"#c9a84c",fontFamily:"'Playfair Display',serif"}}>{children}</h3>;}

// ═══════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════
function LoginScreen({ mob, onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
      if (e.code === "auth/popup-closed-by-user") setError("Connexion annulée");
      else if (e.code === "auth/popup-blocked") setError("Le popup a été bloqué. Autorisez les popups pour ce site.");
      else setError("Erreur de connexion. Réessayez.");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#0d1117 0%,#1a1f2e 50%,#0d1117 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:mob?14:20,fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:mob?18:24,padding:mob?"32px 24px":"48px 40px",width:"100%",maxWidth:440,textAlign:"center"}}>
        <div style={{fontSize:mob?48:64,marginBottom:12}}>💎</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?26:36,fontWeight:700,color:"#c9a84c",margin:"0 0 8px"}}>FinanceFlow</h1>
        <p style={{color:"#8b949e",fontSize:mob?13:15,margin:"0 0 8px"}}>Prenez le contrôle de vos finances</p>
        <p style={{color:"#8b949e88",fontSize:mob?11:12,margin:"0 0 32px",lineHeight:1.5}}>
          Connectez-vous pour sauvegarder vos données en toute sécurité et y accéder depuis n'importe quel appareil.
        </p>

        <button onClick={handleGoogle} disabled={loading}
          style={{width:"100%",background:"#fff",color:"#333",border:"none",borderRadius:12,padding:mob?"14px":"16px",fontSize:mob?14:16,fontWeight:600,cursor:loading?"wait":"pointer",fontFamily:"'DM Sans'",display:"flex",alignItems:"center",justifyContent:"center",gap:12,opacity:loading?.6:1,transition:"all .2s"}}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {loading ? "Connexion..." : "Se connecter avec Google"}
        </button>

        {error && <p style={{color:"#E74C3C",fontSize:12,marginTop:12}}>{error}</p>}

        <div style={{marginTop:32,padding:"16px 0",borderTop:"1px solid #21262d"}}>
          <p style={{color:"#8b949e66",fontSize:10,margin:0}}>🔒 Vos données sont privées et sécurisées</p>
          <p style={{color:"#8b949e44",fontSize:9,marginTop:4}}>FinanceFlow v2.0</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SETUP SCREEN (after first login)
// ═══════════════════════════════════════════════════
function SetupScreen({onSave,mob,userName}){
  const [step,setStep]=useState(0);const [name,setName]=useState(userName||"");const [salary,setSalary]=useState("");const [currency,setCurrency]=useState("TND");
  const inputS={width:"100%",background:"#0d1117",border:"1px solid #30363d",borderRadius:12,padding:mob?"12px 14px":"14px 16px",color:"#f0f6fc",fontSize:mob?14:15,fontFamily:"'DM Sans'",outline:"none",boxSizing:"border-box",marginBottom:16};
  const btnS={width:"100%",background:"linear-gradient(135deg,#c9a84c,#d4a843)",color:"#0d1117",border:"none",borderRadius:12,padding:mob?"12px":"14px",fontSize:mob?14:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"};
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#0d1117 0%,#1a1f2e 50%,#0d1117 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:mob?14:20,fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:mob?18:24,padding:mob?"28px 20px":"40px 32px",width:"100%",maxWidth:440,textAlign:"center"}}>
        <div style={{fontSize:mob?42:56,marginBottom:8}}>💎</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?24:32,fontWeight:700,color:"#c9a84c",margin:"0 0 8px"}}>Bienvenue !</h1>
        <p style={{color:"#8b949e",fontSize:mob?12:14,margin:"0 0 24px"}}>Configurons votre espace financier</p>
        {step===0&&<div style={{textAlign:"left"}}><label style={{display:"block",fontSize:13,fontWeight:600,color:"#c9d1d9",marginBottom:8}}>Votre nom</label><input style={inputS} value={name} onChange={e=>setName(e.target.value)} placeholder="Votre prénom..."/><button style={{...btnS,opacity:name.trim()?1:.4}} disabled={!name.trim()} onClick={()=>setStep(1)}>Continuer →</button></div>}
        {step===1&&<div style={{textAlign:"left"}}><label style={{display:"block",fontSize:13,fontWeight:600,color:"#c9d1d9",marginBottom:8}}>Votre devise</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>{CURRENCY_OPTIONS.map(c=><button key={c.code} onClick={()=>setCurrency(c.code)} style={{background:currency===c.code?"#c9a84c11":"#21262d",border:currency===c.code?"2px solid #c9a84c":"2px solid transparent",borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left"}}><span style={{display:"block",fontSize:15,fontWeight:700,color:"#c9a84c"}}>{c.symbol}</span><span style={{display:"block",fontSize:10,color:"#8b949e",marginTop:2}}>{c.label}</span></button>)}</div><button style={btnS} onClick={()=>setStep(2)}>Continuer →</button></div>}
        {step===2&&<div style={{textAlign:"left"}}><label style={{display:"block",fontSize:13,fontWeight:600,color:"#c9d1d9",marginBottom:8}}>Salaire mensuel</label><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><input style={{...inputS,flex:1,marginBottom:0}} type="number" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="Ex: 2500"/><span style={{fontSize:18,fontWeight:700,color:"#c9a84c"}}>{CURRENCY_OPTIONS.find(c=>c.code===currency)?.symbol}</span></div><button style={{...btnS,opacity:Number(salary)>0?1:.4}} disabled={!Number(salary)} onClick={()=>onSave({name:name.trim(),salary:Number(salary),currency})}>🚀 Commencer</button></div>}
        <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:20}}>{[0,1,2].map(i=><div key={i} style={{width:step===i?24:8,height:8,borderRadius:step===i?4:"50%",background:step===i?"#c9a84c":"#21262d",transition:"all .3s"}}/>)}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
export default function App() {
  const mob = useIsMobile();
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [view, setView] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(()=>{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  // ─── Auth Listener ─────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ─── Load data when user logs in ───
  useEffect(() => {
    if (!authUser) { setProfile(null); setTransactions([]); setBudgets({}); return; }
    (async () => {
      setDataLoading(true);
      const data = await loadUserData(authUser.uid);
      if (data) {
        if (data.profile) setProfile(data.profile);
        if (data.transactions) setTransactions(data.transactions);
        if (data.budgets) setBudgets(data.budgets);
      }
      setDataLoading(false);
    })();
  }, [authUser]);

  // ─── Save to Firestore ─────────────
  const saveToCloud = useCallback(async (p, t, b) => {
    if (!authUser) return;
    setSaving(true);
    await saveUserData(authUser.uid, { profile: p, transactions: t, budgets: b, updatedAt: new Date().toISOString() });
    setSaving(false);
  }, [authUser]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  const curr = profile ? (CURRENCY_OPTIONS.find(c=>c.code===profile.currency)||CURRENCY_OPTIONS[0]) : CURRENCY_OPTIONS[0];

  // ─── Derived ───────────────────────
  const [selYear,selMon]=selectedMonth.split("-").map(Number);
  const monthTx=useMemo(()=>transactions.filter(t=>{const d=parseDate(t.date);return d.getFullYear()===selYear&&d.getMonth()+1===selMon;}),[transactions,selYear,selMon]);
  const totalSpent=monthTx.reduce((s,t)=>s+t.amount,0);
  const remaining=(profile?.salary||0)-totalSpent;
  const savingsRate=(profile?.salary||0)>0?Math.max(0,(remaining/(profile?.salary||1))*100):0;
  const catTotals=useMemo(()=>{const m={};CATEGORIES.forEach(c=>{m[c.id]=0;});monthTx.forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return m;},[monthTx]);
  const dailyData=useMemo(()=>{const days=new Date(selYear,selMon,0).getDate();return Array.from({length:days},(_,i)=>{const k=`${selectedMonth}-${String(i+1).padStart(2,"0")}`;return{label:i+1,value:monthTx.filter(t=>t.date===k).reduce((s,t)=>s+t.amount,0)};});},[monthTx,selectedMonth,selYear,selMon]);
  const maxDaily=Math.max(...dailyData.map(d=>d.value),1);
  const todayTotal=transactions.filter(t=>t.date===fmtDate(new Date())).reduce((s,t)=>s+t.amount,0);

  // ─── Handlers ──────────────────────
  const addTx=(tx)=>{const n=[...transactions,{...tx,id:genId()}];setTransactions(n);saveToCloud(profile,n,budgets);showToast("✅ Dépense ajoutée !");};
  const updateTx=(tx)=>{const n=transactions.map(t=>t.id===tx.id?tx:t);setTransactions(n);saveToCloud(profile,n,budgets);showToast("✏️ Modifiée !");};
  const deleteTx=(id)=>{const n=transactions.filter(t=>t.id!==id);setTransactions(n);saveToCloud(profile,n,budgets);showToast("🗑️ Supprimée");};
  const saveProf=(p)=>{setProfile(p);saveToCloud(p,transactions,budgets);showToast("👤 Profil sauvé !");};
  const saveBudg=(b)=>{setBudgets(b);saveToCloud(profile,transactions,b);showToast("📊 Budgets mis à jour !");};
  const handleLogout=async()=>{if(confirm("Se déconnecter ?"))await signOut(auth);};
  const exportCSV=()=>{
    const rows=[["Date","Catégorie","Description","Montant"]];
    monthTx.sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{const cat=CATEGORIES.find(c=>c.id===t.category);rows.push([t.date,cat?.label||t.category,`"${t.description}"`,t.amount.toFixed(2)]);});
    rows.push([],["","","TOTAL",totalSpent.toFixed(2)],["","","Salaire",(profile?.salary||0).toFixed(2)],["","","Reste",remaining.toFixed(2)]);
    const blob=new Blob(["\uFEFF"+rows.map(r=>r.join(",")).join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`depenses_${selectedMonth}.csv`;a.click();URL.revokeObjectURL(url);showToast("📥 CSV téléchargé !");
  };

  // ─── Render States ─────────────────
  if (authLoading) return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0d1117",fontFamily:"'DM Sans',sans-serif"}}><div style={{fontSize:56}}>💎</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"#c9a84c",marginTop:12}}>FinanceFlow</div><p style={{color:"#8b949e",marginTop:8,fontSize:13}}>Chargement...</p></div>;
  if (!authUser) return <LoginScreen mob={mob} />;
  if (dataLoading) return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0d1117",fontFamily:"'DM Sans',sans-serif"}}><div style={{fontSize:56}}>💎</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#c9a84c",marginTop:12}}>Chargement de vos données...</div><p style={{color:"#8b949e",marginTop:8,fontSize:13}}>☁️ Synchronisation en cours</p></div>;
  if (!profile) return <SetupScreen mob={mob} onSave={saveProf} userName={authUser.displayName?.split(" ")[0]||""} />;

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#0d1117",color:"#f0f6fc",minHeight:"100vh",padding:mob?"0 12px 24px":"0 48px 40px"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:mob?"14px 0 10px":"24px 0 16px",borderBottom:"1px solid #21262d",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:mob?8:14}}>
          <span style={{fontSize:mob?26:36}}>💎</span>
          <div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?17:26,fontWeight:700,color:"#c9a84c",margin:0}}>FinanceFlow</h1>
            <p style={{margin:0,fontSize:mob?10:14,color:"#8b949e"}}>Bonjour, {profile.name.split(" ")[0]} ✨ {saving&&<span style={{fontSize:9,color:"#c9a84c"}}>☁️ sync...</span>}</p>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:mob?4:8}}>
          <button onClick={()=>setShowProfileModal(true)} style={{background:"#21262d",border:"none",borderRadius:8,padding:mob?"6px 8px":"8px 10px",fontSize:mob?13:15,cursor:"pointer"}}>👤</button>
          <button onClick={exportCSV} style={{background:"#21262d",border:"none",borderRadius:8,padding:mob?"6px 8px":"8px 10px",fontSize:mob?13:15,cursor:"pointer"}}>📥</button>
          <button onClick={handleLogout} style={{background:"#21262d",border:"none",borderRadius:8,padding:mob?"6px 8px":"8px 10px",fontSize:mob?13:15,cursor:"pointer"}} title="Déconnexion">🚪</button>
          <button onClick={()=>{setEditTx(null);setShowAddModal(true);}} style={{background:"linear-gradient(135deg,#c9a84c,#d4a843)",color:"#0d1117",border:"none",borderRadius:mob?8:10,padding:mob?"7px 10px":"10px 18px",fontSize:mob?11:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",whiteSpace:"nowrap"}}>+ Ajouter</button>
        </div>
      </header>

      {/* NAV */}
      <nav style={{display:"flex",gap:mob?2:6,padding:mob?"8px 0":"16px 0",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {[{id:"dashboard",icon:"📊",label:"Tableau de bord",short:"Accueil"},{id:"transactions",icon:"📋",label:"Transactions",short:"Dépenses"},{id:"budgets",icon:"🎯",label:"Budgets",short:"Budgets"},{id:"analytics",icon:"📈",label:"Analyse",short:"Analyse"}].map(tab=>(
          <button key={tab.id} onClick={()=>setView(tab.id)} style={{display:"flex",alignItems:"center",gap:mob?4:8,background:view===tab.id?"#21262d":"transparent",border:view===tab.id?"1px solid #c9a84c33":"1px solid transparent",borderRadius:mob?8:12,padding:mob?"6px 10px":"10px 18px",color:view===tab.id?"#c9a84c":"#8b949e",fontSize:mob?11:14,cursor:"pointer",fontFamily:"'DM Sans'",whiteSpace:"nowrap",transition:"all .2s"}}>
            <span style={{fontSize:mob?13:18}}>{tab.icon}</span><span>{mob?tab.short:tab.label}</span>
          </button>
        ))}
      </nav>

      {/* MONTH PICKER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:mob?12:20,padding:mob?"6px 0":"14px 0"}}>
        <button style={{background:"#21262d",border:"none",color:"#c9a84c",borderRadius:8,padding:mob?"5px 10px":"8px 16px",fontSize:mob?12:16,cursor:"pointer"}} onClick={()=>{let m=selMon-1,y=selYear;if(m<1){m=12;y--;}setSelectedMonth(`${y}-${String(m).padStart(2,"0")}`);}}>◀</button>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:mob?16:22,fontWeight:600,color:"#f0f6fc",minWidth:mob?130:200,textAlign:"center"}}>{MONTHS_FR[selMon-1]} {selYear}</span>
        <button style={{background:"#21262d",border:"none",color:"#c9a84c",borderRadius:8,padding:mob?"5px 10px":"8px 16px",fontSize:mob?12:16,cursor:"pointer"}} onClick={()=>{let m=selMon+1,y=selYear;if(m>12){m=1;y++;}setSelectedMonth(`${y}-${String(m).padStart(2,"0")}`);}}>▶</button>
      </div>

      {/* CONTENT */}
      <main style={{paddingTop:mob?4:12}}>
        {view==="dashboard"&&<DashboardView {...{profile,curr,totalSpent,remaining,savingsRate,todayTotal,catTotals,dailyData,maxDaily,monthTx,mob}}/>}
        {view==="transactions"&&<TransactionsView {...{monthTx,curr,mob,onEdit:(t)=>{setEditTx(t);setShowAddModal(true);},onDelete:deleteTx}}/>}
        {view==="budgets"&&<BudgetsView {...{budgets,catTotals,curr,mob,onSave:saveBudg}}/>}
        {view==="analytics"&&<AnalyticsView {...{transactions,profile,curr,selYear,mob}}/>}
      </main>

      <footer style={{textAlign:"center",padding:"24px 0 10px",borderTop:"1px solid #21262d",marginTop:24}}>
        <p style={{color:"#8b949e",fontSize:10,margin:0}}>☁️ Connecté en tant que {authUser.email}</p>
        <p style={{color:"#8b949e44",fontSize:9,marginTop:4}}>FinanceFlow v2.0 — Données synchronisées en temps réel</p>
      </footer>

      {showAddModal&&<TxModal tx={editTx} curr={curr} mob={mob} onSave={(tx)=>{editTx?updateTx(tx):addTx(tx);setShowAddModal(false);setEditTx(null);}} onClose={()=>{setShowAddModal(false);setEditTx(null);}}/>}
      {showProfileModal&&<ProfileModal profile={profile} mob={mob} onSave={(p)=>{saveProf(p);setShowProfileModal(false);}} onClose={()=>setShowProfileModal(false)}/>}
      {toast&&<div style={{position:"fixed",bottom:mob?16:30,left:"50%",transform:"translateX(-50%)",background:"#c9a84c",color:"#0d1117",padding:mob?"10px 18px":"12px 24px",borderRadius:12,fontSize:mob?12:14,fontWeight:600,fontFamily:"'DM Sans'",boxShadow:"0 8px 30px rgba(0,0,0,.4)",zIndex:2000,whiteSpace:"nowrap"}}>{toast}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════
function DashboardView({profile,curr,totalSpent,remaining,savingsRate,todayTotal,catTotals,dailyData,maxDaily,monthTx,mob}){
  const topCats=CATEGORIES.map(c=>({...c,total:catTotals[c.id]||0})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  const segments=topCats.map(c=>({color:c.color,value:c.total}));
  const cards=[
    {bg:"linear-gradient(135deg,#0f4c3a,#1a7a5c)",icon:"💰",label:"SALAIRE",val:`${profile.salary.toLocaleString()} ${curr.symbol}`},
    {bg:"linear-gradient(135deg,#7a1a1a,#c0392b)",icon:"🛍️",label:"DÉPENSÉ",val:`${totalSpent.toLocaleString()} ${curr.symbol}`},
    {bg:remaining>=0?"linear-gradient(135deg,#1a3a7a,#2980b9)":"linear-gradient(135deg,#7a1a1a,#e74c3c)",icon:remaining>=0?"✅":"⚠️",label:"RESTE",val:`${remaining.toLocaleString()} ${curr.symbol}`},
    {bg:"linear-gradient(135deg,#3a1a6a,#8e44ad)",icon:"📈",label:"ÉPARGNE",val:`${savingsRate.toFixed(1)}%`},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:mob?10:20}}>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:mob?8:16}}>
        {cards.map((c,i)=>(<div key={i} style={{background:c.bg,borderRadius:mob?12:16,padding:mob?"12px 14px":"20px 24px",display:"flex",alignItems:"center",gap:mob?10:16}}><span style={{fontSize:mob?22:34}}>{c.icon}</span><div><p style={{margin:0,fontSize:mob?9:12,color:"#ffffffaa",textTransform:"uppercase",letterSpacing:1}}>{c.label}</p><p style={{margin:"3px 0 0",fontSize:mob?14:22,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>{c.val}</p></div></div>))}
      </div>
      <Card style={{display:"flex",alignItems:"center",gap:mob?10:16,padding:mob?"12px 14px":"18px 24px"}}><span style={{fontSize:mob?18:24}}>📅</span><div><p style={{margin:0,fontSize:mob?11:13,color:"#8b949e"}}>Dépenses aujourd'hui</p><p style={{margin:"2px 0 0",fontSize:mob?18:24,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#c9a84c"}}>{todayTotal.toLocaleString()} {curr.symbol}</p></div></Card>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 300px",gap:mob?10:20}}>
        <Card style={{padding:mob?14:24}}><STitle>Dépenses par jour</STitle><BarChart data={dailyData} maxVal={maxDaily} color="#E74C3C"/></Card>
        <Card style={{padding:mob?14:24,display:"flex",flexDirection:"column",alignItems:"center"}}><STitle>Répartition</STitle><Donut segments={segments} size={mob?110:130}/><div style={{marginTop:10,width:"100%"}}>{topCats.slice(0,5).map(c=>(<div key={c.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/><span style={{fontSize:mob?9:11,color:"#c9d1d9",flex:1}}>{c.label.split(" ").slice(1).join(" ")}</span><span style={{fontSize:mob?9:11,fontWeight:600,color:"#f0f6fc"}}>{totalSpent?((c.total/totalSpent)*100).toFixed(0):0}%</span></div>))}</div></Card>
      </div>
      <Card style={{padding:mob?14:24}}><STitle>Dernières dépenses</STitle>{monthTx.length===0?<p style={{color:"#8b949e",fontSize:mob?12:14}}>Aucune dépense ce mois 🎉</p>:monthTx.slice(-5).reverse().map(t=>{const cat=CATEGORIES.find(c=>c.id===t.category);return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:mob?8:12,padding:mob?"8px 0":"10px 0",borderBottom:"1px solid #21262d"}}><span style={{width:mob?8:10,height:mob?8:10,borderRadius:"50%",background:cat?.color,flexShrink:0}}/><div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:mob?12:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}</p><p style={{margin:"1px 0 0",fontSize:mob?9:11,color:"#8b949e"}}>{t.date}</p></div><p style={{fontSize:mob?12:15,fontWeight:700,color:"#E74C3C",whiteSpace:"nowrap",margin:0}}>-{t.amount.toLocaleString()} {curr.symbol}</p></div>);})}</Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════
function TransactionsView({monthTx,curr,mob,onEdit,onDelete}){
  const [filterCat,setFilterCat]=useState("all");const [search,setSearch]=useState("");
  const filtered=monthTx.filter(t=>filterCat==="all"||t.category===filterCat).filter(t=>t.description.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
  const total=filtered.reduce((s,t)=>s+t.amount,0);
  const inputS={background:"#161b22",border:"1px solid #21262d",borderRadius:10,padding:mob?"8px 10px":"10px 14px",color:"#f0f6fc",fontSize:mob?12:13,fontFamily:"'DM Sans'",outline:"none"};
  return(<div>
    <div style={{display:"flex",gap:mob?6:10,marginBottom:mob?10:14,flexWrap:"wrap"}}><input style={{...inputS,flex:1,minWidth:mob?100:180}} placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/><select style={{...inputS,maxWidth:mob?140:"none"}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}><option value="all">Toutes</option>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:mob?11:13,color:"#8b949e",marginBottom:10}}><span>{filtered.length} transaction{filtered.length!==1?"s":""}</span><span style={{fontWeight:700,color:"#E74C3C"}}>Total: {total.toLocaleString()} {curr.symbol}</span></div>
    {filtered.length===0?<div style={{textAlign:"center",padding:"40px 0"}}><span style={{fontSize:40}}>📭</span><p style={{color:"#8b949e",fontSize:13,marginTop:8}}>Aucune transaction</p></div>:
      filtered.map(t=>{const cat=CATEGORIES.find(c=>c.id===t.category);return(
        <Card key={t.id} style={{marginBottom:8,padding:mob?"10px 12px":"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:mob?6:10,minWidth:0,flex:1}}><span style={{padding:mob?"3px 6px":"4px 10px",borderRadius:8,fontSize:mob?11:13,fontWeight:500,background:(cat?.color||"#888")+"22",color:cat?.color,whiteSpace:"nowrap",flexShrink:0}}>{cat?.label.split(" ")[0]}</span><div style={{minWidth:0}}><p style={{margin:0,fontSize:mob?12:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}</p><p style={{margin:"1px 0 0",fontSize:mob?9:11,color:"#8b949e"}}>{t.date}{t.note?` • ${t.note}`:""}</p></div></div>
          <div style={{display:"flex",alignItems:"center",gap:mob?6:12}}><p style={{fontSize:mob?13:15,fontWeight:700,color:"#E74C3C",whiteSpace:"nowrap",margin:0}}>-{t.amount.toLocaleString()} {curr.symbol}</p><button onClick={()=>onEdit(t)} style={{background:"#21262d",border:"none",borderRadius:6,padding:"5px 7px",fontSize:12,cursor:"pointer"}}>✏️</button><button onClick={()=>{if(confirm("Supprimer ?"))onDelete(t.id);}} style={{background:"#21262d",border:"none",borderRadius:6,padding:"5px 7px",fontSize:12,cursor:"pointer"}}>🗑️</button></div>
        </Card>);})}
  </div>);
}

// ═══════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════
function BudgetsView({budgets,catTotals,curr,mob,onSave}){
  const [lb,setLb]=useState({...budgets});
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mob?10:16,flexWrap:"wrap",gap:8}}><STitle>Budgets par catégorie</STitle><button onClick={()=>onSave(lb)} style={{background:"#c9a84c",color:"#0d1117",border:"none",borderRadius:10,padding:mob?"8px 14px":"10px 20px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",fontSize:mob?12:13}}>💾 Sauvegarder</button></div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(300px,1fr))",gap:mob?8:16}}>
      {CATEGORIES.map(cat=>{const budget=lb[cat.id]||0;const spent=catTotals[cat.id]||0;const pct=budget>0?Math.min((spent/budget)*100,100):0;const over=spent>budget&&budget>0;return(
        <Card key={cat.id} style={{padding:mob?"12px 14px":"18px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:mob?12:13,fontWeight:600}}>{cat.label}</span>{over&&<span style={{fontSize:10,color:"#E74C3C",fontWeight:600}}>⚠️ Dépassé</span>}</div>
          <div style={{height:6,background:"#21262d",borderRadius:3,marginBottom:8}}><div style={{height:"100%",borderRadius:3,background:over?"#E74C3C":cat.color,width:`${pct}%`,transition:"width .4s"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}><span style={{fontSize:mob?10:11,color:"#8b949e"}}>{spent.toLocaleString()} {curr.symbol}</span><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10,color:"#8b949e"}}>Budget:</span><input type="number" value={lb[cat.id]||""} onChange={e=>setLb({...lb,[cat.id]:Number(e.target.value)})} placeholder="0" style={{width:mob?50:60,background:"#21262d",border:"1px solid #30363d",borderRadius:6,padding:"4px 6px",color:"#f0f6fc",fontSize:11,fontFamily:"'DM Sans'",textAlign:"right",outline:"none"}}/><span style={{fontSize:10,color:"#8b949e"}}>{curr.symbol}</span></div></div>
        </Card>);})}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════
function AnalyticsView({transactions,profile,curr,selYear,mob}){
  const monthlyTotals=useMemo(()=>Array.from({length:12},(_,i)=>{const m=i+1;const total=transactions.filter(t=>{const d=parseDate(t.date);return d.getFullYear()===selYear&&d.getMonth()+1===m;}).reduce((s,t)=>s+t.amount,0);return{label:MONTHS_FR[i].substring(0,3),value:total};}),[transactions,selYear]);
  const maxMonth=Math.max(...monthlyTotals.map(m=>m.value),1);
  const avgMonthly=monthlyTotals.reduce((s,m)=>s+m.value,0)/12;
  const topMonth=monthlyTotals.reduce((mx,m)=>m.value>mx.value?m:mx,monthlyTotals[0]);
  const yearCatTotals=useMemo(()=>{const m={};CATEGORIES.forEach(c=>{m[c.id]=0;});transactions.filter(t=>parseDate(t.date).getFullYear()===selYear).forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return CATEGORIES.map(c=>({...c,total:m[c.id]})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);},[transactions,selYear]);
  const yearTotal=yearCatTotals.reduce((s,c)=>s+c.total,0);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:mob?10:20}}>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?8:16}}>
        {[{label:`TOTAL ${selYear}`,val:`${yearTotal.toLocaleString()} ${curr.symbol}`},{label:"MOY. MENSUELLE",val:`${avgMonthly.toFixed(0)} ${curr.symbol}`},{label:"MOIS TOP",val:`${topMonth.label} (${topMonth.value.toLocaleString()} ${curr.symbol})`}].map((s,i)=><Card key={i} style={{padding:mob?"12px 14px":"20px 24px"}}><p style={{margin:0,fontSize:mob?10:12,color:"#8b949e",textTransform:"uppercase",letterSpacing:1}}>{s.label}</p><p style={{margin:"6px 0 0",fontSize:mob?16:22,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#c9a84c"}}>{s.val}</p></Card>)}
      </div>
      <Card style={{padding:mob?14:24}}><STitle>Évolution mensuelle {selYear}</STitle><BarChart data={monthlyTotals} maxVal={maxMonth} color="#3498DB"/></Card>
      <Card style={{padding:mob?14:24}}><STitle>Top catégories {selYear}</STitle>{yearCatTotals.map(c=>(<div key={c.id} style={{display:"flex",alignItems:"center",marginBottom:mob?8:10,gap:mob?6:10}}><span style={{padding:"3px 8px",borderRadius:8,fontSize:mob?10:11,fontWeight:500,background:c.color+"22",color:c.color,whiteSpace:"nowrap",flexShrink:0}}>{c.label}</span><div style={{flex:1,height:6,background:"#21262d",borderRadius:3}}><div style={{height:"100%",borderRadius:3,background:c.color,width:`${yearTotal?(c.total/yearTotal)*100:0}%`,transition:"width .4s"}}/></div><span style={{fontSize:mob?11:12,fontWeight:600,fontFamily:"'DM Sans'",color:"#f0f6fc",minWidth:mob?60:80,textAlign:"right"}}>{c.total.toLocaleString()} {curr.symbol}</span></div>))}</Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════
function TxModal({tx,curr,mob,onSave,onClose}){
  const [amount,setAmount]=useState(tx?.amount||"");const [category,setCategory]=useState(tx?.category||"food");
  const [description,setDescription]=useState(tx?.description||"");const [date,setDate]=useState(tx?.date||fmtDate(new Date()));const [note,setNote]=useState(tx?.note||"");
  const valid=Number(amount)>0&&description.trim();
  const inputS={width:"100%",background:"#0d1117",border:"1px solid #30363d",borderRadius:10,padding:mob?"10px 12px":"12px 14px",color:"#f0f6fc",fontSize:mob?13:14,fontFamily:"'DM Sans'",outline:"none",boxSizing:"border-box"};
  const labelS={display:"block",fontSize:mob?11:12,fontWeight:600,color:"#c9d1d9",marginBottom:6,textTransform:"uppercase",letterSpacing:.5};
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:1000,padding:mob?0:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#161b22",border:"1px solid #30363d",borderRadius:mob?"18px 18px 0 0":"18px",padding:mob?"20px 16px 28px":"24px",width:"100%",maxWidth:mob?"100%":"520px",maxHeight:mob?"85vh":"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mob?14:20}}><h2 style={{margin:0,fontSize:mob?16:20,fontFamily:"'Playfair Display',serif",color:"#c9a84c"}}>{tx?"✏️ Modifier":"➕ Nouvelle dépense"}</h2><button onClick={onClose} style={{background:"#21262d",border:"none",color:"#8b949e",borderRadius:8,padding:"6px 10px",fontSize:16,cursor:"pointer"}}>✕</button></div>
        <div style={{marginBottom:14}}><label style={labelS}>Montant ({curr.symbol}) *</label><input style={inputS} type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" autoFocus/></div>
        <div style={{marginBottom:14}}><label style={labelS}>Catégorie *</label><div style={{display:"flex",flexWrap:"wrap",gap:mob?4:6}}>{CATEGORIES.map(c=><button key={c.id} onClick={()=>setCategory(c.id)} style={{background:category===c.id?c.color+"22":"#21262d",border:category===c.id?`1px solid ${c.color}`:"1px solid #30363d",borderRadius:8,padding:mob?"4px 8px":"6px 12px",fontSize:mob?10:12,color:category===c.id?c.color:"#c9d1d9",cursor:"pointer",fontFamily:"'DM Sans'",transition:"all .2s"}}>{c.label}</button>)}</div></div>
        <div style={{marginBottom:14}}><label style={labelS}>Description *</label><input style={inputS} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex: Courses Carrefour..."/></div>
        <div style={{display:"flex",gap:mob?8:12,marginBottom:14,flexDirection:mob?"column":"row"}}><div style={{flex:1}}><label style={labelS}>Date</label><input style={inputS} type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div style={{flex:1}}><label style={labelS}>Note</label><input style={inputS} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optionnel..."/></div></div>
        <button disabled={!valid} onClick={()=>onSave({id:tx?.id,amount:Number(amount),category,description:description.trim(),date,note:note.trim()})} style={{width:"100%",background:"linear-gradient(135deg,#c9a84c,#d4a843)",color:"#0d1117",border:"none",borderRadius:12,padding:mob?"12px":"14px",fontSize:mob?14:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",marginTop:4,opacity:valid?1:.4}}>{tx?"💾 Enregistrer":"✅ Ajouter"}</button>
      </div>
    </div>
  );
}

function ProfileModal({profile,mob,onSave,onClose}){
  const [name,setName]=useState(profile.name);const [salary,setSalary]=useState(profile.salary);const [currency,setCurrency]=useState(profile.currency);
  const inputS={width:"100%",background:"#0d1117",border:"1px solid #30363d",borderRadius:10,padding:mob?"10px 12px":"12px 14px",color:"#f0f6fc",fontSize:mob?13:14,fontFamily:"'DM Sans'",outline:"none",boxSizing:"border-box"};
  const labelS={display:"block",fontSize:mob?11:12,fontWeight:600,color:"#c9d1d9",marginBottom:6,textTransform:"uppercase",letterSpacing:.5};
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:1000,padding:mob?0:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#161b22",border:"1px solid #30363d",borderRadius:mob?"18px 18px 0 0":"18px",padding:mob?"20px 16px 28px":"24px",width:"100%",maxWidth:mob?"100%":"520px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mob?14:20}}><h2 style={{margin:0,fontSize:mob?16:20,fontFamily:"'Playfair Display',serif",color:"#c9a84c"}}>👤 Mon Profil</h2><button onClick={onClose} style={{background:"#21262d",border:"none",color:"#8b949e",borderRadius:8,padding:"6px 10px",fontSize:16,cursor:"pointer"}}>✕</button></div>
        <div style={{marginBottom:14}}><label style={labelS}>Nom</label><input style={inputS} value={name} onChange={e=>setName(e.target.value)}/></div>
        <div style={{marginBottom:14}}><label style={labelS}>Salaire mensuel</label><input style={inputS} type="number" value={salary} onChange={e=>setSalary(Number(e.target.value))}/></div>
        <div style={{marginBottom:14}}><label style={labelS}>Devise</label><select style={inputS} value={currency} onChange={e=>setCurrency(e.target.value)}>{CURRENCY_OPTIONS.map(c=><option key={c.code} value={c.code}>{c.symbol} — {c.label}</option>)}</select></div>
        <button onClick={()=>onSave({name,salary,currency})} style={{width:"100%",background:"linear-gradient(135deg,#c9a84c,#d4a843)",color:"#0d1117",border:"none",borderRadius:12,padding:mob?"12px":"14px",fontSize:mob?14:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>💾 Sauvegarder</button>
      </div>
    </div>
  );
}
