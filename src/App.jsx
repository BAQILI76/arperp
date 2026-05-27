import { useState, useMemo, useCallback, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie, Line
} from "recharts";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════
   SUPABASE CLIENT
═══════════════════════════════════════════════════════════ */
const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const T = {
  bg:"#0C0C0E", surface:"#111114", card:"#17171B", card2:"#1E1E23",
  border:"#26262E", borderHi:"#3A3A46",
  gold:"#D4A84B", goldLt:"#EAC97C", goldDk:"#8A6A28",
  text:"#F5F4F9", sub:"#9090A8", dim:"#50505E",
  green:"#3ECF8E", greenDk:"#0E9E6A",
  red:"#F16B6B", redDk:"#C42B2B",
  orange:"#F5923A", blue:"#5B9CF6",
  purple:"#B57BF0", teal:"#26C4B4",
  rose:"#F47285",
};

const GFONT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');`;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:${T.bg};color:${T.text};font-family:'Inter',sans-serif}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:${T.surface}}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
select option{background:${T.card}}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.35);cursor:pointer}
input[type=number]::-webkit-inner-spin-button{opacity:.3}
textarea{resize:vertical}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes pinShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
`;

/* ═══════════════════════════════════════════════════════════
   RÔLES & PERMISSIONS
═══════════════════════════════════════════════════════════ */
const ROLES = {
  ADMIN: {
    id:"ADMIN", label:"Architecte / Gérant", pin:"0000",
    couleur: T.gold, icon:"⬡",
    desc:"Accès complet · Configuration · Vision consolidée",
    tabs:["dashboard","contrats","facturation","technique","previsionnel","rentabilite","clients","charges","admin"],
    isCdP:false,
  },
  RAF: {
    id:"RAF", label:"RAF", pin:"1234",
    couleur: T.blue, icon:"◻",
    desc:"Contrats · Facturation · Clients · Charges · Prévisionnel",
    tabs:["dashboard_raf","contrats","facturation","previsionnel","rentabilite","clients","charges"],
    isCdP:false,
  },
  CDP1: {
    id:"CDP1", label:"Chef de Projet 1", pin:"1111",
    couleur:"#34D399", icon:"◈",
    desc:"Suivi technique · Projets affectés",
    tabs:["technique"], isCdP:true, nom:"Chef de Projet 1",
  },
  CDP2: {
    id:"CDP2", label:"Chef de Projet 2", pin:"2222",
    couleur:"#60A5FA", icon:"◈",
    desc:"Suivi technique · Projets affectés",
    tabs:["technique"], isCdP:true, nom:"Chef de Projet 2",
  },
  CDP3: {
    id:"CDP3", label:"Chef de Projet 3", pin:"3333",
    couleur:"#C084FC", icon:"◈",
    desc:"Suivi technique · Projets affectés",
    tabs:["technique"], isCdP:true, nom:"Chef de Projet 3",
  },
  CDP4: {
    id:"CDP4", label:"Chef de Projet 4", pin:"4444",
    couleur:"#FB923C", icon:"◈",
    desc:"Suivi technique · Projets affectés",
    tabs:["technique"], isCdP:true, nom:"Chef de Projet 4",
  },
};

/* ═══════════════════════════════════════════════════════════
   BARÈME PHASES
═══════════════════════════════════════════════════════════ */
const PHASES_DEF = [
  {key:"COMMANDE", label:"À la commande",         pct:5,  duree:0,  couleur:T.purple,  facturable:true},
  {key:"ESQ",      label:"Esquisse",               pct:5,  duree:2,  couleur:T.blue,    facturable:true},
  {key:"APS",      label:"Avant-Projet Sommaire",  pct:10, duree:3,  couleur:T.teal,    facturable:true},
  {key:"APD",      label:"Avant-Projet Définitif", pct:20, duree:5,  couleur:T.gold,    facturable:true},
  {key:"PC",       label:"Permis de Construire",   pct:5,  duree:2,  couleur:T.goldLt,  facturable:true},
  {key:"PRO_DCE",  label:"Projet / DCE",           pct:15, duree:6,  couleur:T.orange,  facturable:true},
  {key:"CHANTIER", label:"Suivi mensuel chantier", pct:15, duree:24, couleur:T.green,   facturable:true, mensuel:true},
  {key:"REC_PROV", label:"Réception provisoire",   pct:10, duree:2,  couleur:T.rose,    facturable:true},
  {key:"REC_DEF",  label:"Réception définitive",   pct:15, duree:4,  couleur:T.red,     facturable:true},
];

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
// Format financier : espaces milliers, 2 décimales
const fmt    = n => new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0)+" DH";
const fmtInt = n => new Intl.NumberFormat("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:0}).format(n||0)+" DH";
const fmtK  = n => n>=1000?`${(n/1000).toFixed(0)}k`:n;
const today = () => new Date().toISOString().split("T")[0];
const addW  = (d,w) => { const x=new Date(d); x.setDate(x.getDate()+w*7); return x.toISOString().split("T")[0]; };
const addD  = (d,days) => { const x=new Date(d); x.setDate(x.getDate()+days); return x.toISOString().split("T")[0]; };
const nid   = () => Date.now()+Math.random();
const pct   = (a,b) => b?((a/b)*100).toFixed(0)+"%":"0%";

// Phases incluses dans le délai PC+DCE (jusqu'à PRO_DCE inclus)
const PHASES_PC_DCE    = ["COMMANDE","ESQ","APS","APD","PC","PRO_DCE"];
const PHASES_JUSQU_PC  = ["COMMANDE","ESQ","APS","APD","PC"];   // pour date prévisionnelle PC

// Convertit un nombre de semaines en libellé "X mois et Y semaines"
const semToLabel = (totalSem) => {
  if(!totalSem||totalSem===0) return "—";
  const mois = Math.floor(totalSem / 4.33);
  const semReste = Math.round(totalSem - mois * 4.33);
  if(mois===0) return `${semReste} semaine${semReste>1?"s":""}`;
  if(semReste===0) return `${mois} mois`;
  return `${mois} mois et ${semReste} semaine${semReste>1?"s":""}`;
};

const mkEcheances = (contrat) => {
  if(!contrat.date_debut||!contrat.honoraires) return [];
  let cursor = new Date(contrat.date_debut);
  return PHASES_DEF.map(ph => {
    const ov     = contrat.modalites?.[ph.key]||{};
    const actif  = ov.actif!==false;
    const pctV   = ov.pct  !==undefined ? ov.pct  : ph.pct;
    const duree  = ov.duree!==undefined ? ov.duree : ph.duree;
    const retard = ov.retard||0;
    const montant= Math.round((contrat.honoraires*pctV)/100);
    const debut  = new Date(cursor);
    const echeance = addW(debut.toISOString().split("T")[0], duree);
    const paiement = addD(echeance, contrat.delai_paiement||14);
    cursor = new Date(echeance);
    cursor.setDate(cursor.getDate()+retard*7);
    return {
      key:ph.key, label:ph.label, couleur:ph.couleur,
      pct:pctV, duree, retard, montant, actif,
      date_debut:   debut.toISOString().split("T")[0],
      date_echeance: echeance,
      date_paiement: paiement,
      livree:        ov.livree||false,
      date_livraison:ov.date_livraison||null,
      facture_emise: ov.facture_emise||false,
      paiement_recu: ov.paiement_recu||false,
      mensuel:       ph.mensuel||false,
      avancement:    ov.avancement||0,
      notes_tech:    ov.notes_tech||"",
      // Facturation groupée
      facturable:    ov.facturable!==undefined ? ov.facturable : (ph.facturable!==false),
      groupe_fact:   ov.groupe_fact||null,
      libelle_fact:  ov.libelle_fact||"",
      retard_manuel: ov.retard_manuel||false,
    };
  }).filter(e=>e.actif);
};

/* ═══════════════════════════════════════════════════════════
   DONNÉES DÉMO
═══════════════════════════════════════════════════════════ */
const INIT_CLIENTS = [
  {id:1,code:"CLI-001",nom:"Groupe Méditerranée Invest", contact:"Ahmed Bensalem",  email:"a.bensalem@gmi.tn",   tel:"+216 71 234 567",ville:"Tunis",   type:"Promoteur"},
  {id:2,code:"CLI-002",nom:"SCI Carthage Premium",        contact:"Nadia Chaibi",    email:"n.chaibi@sci-cp.com", tel:"+216 74 456 789",ville:"La Marsa",type:"Promoteur"},
  {id:3,code:"CLI-003",nom:"Ministère des Équipements",   contact:"Karim Gharbi",    email:"k.gharbi@eq.gov.tn",  tel:"+216 71 890 123",ville:"Tunis",   type:"Public"},
  {id:4,code:"CLI-004",nom:"Clinique Pasteur",            contact:"Dr. Slim Ayed",   email:"s.ayed@pasteur.tn",   tel:"+216 71 567 890",ville:"Sfax",    type:"Privé"},
];

const mk = (clientId,ref,nom,type,honoraires,dateDebut,overrides={}) => ({
  id:nid(), ref, nom, clientId, type, honoraires,
  date_debut:dateDebut, date_signature:dateDebut, statut:"Actif",
  delai_paiement:14, description:"", notes:"",
  type_contrat:"Convention d'honoraires", num_bc:"",
  modalites:overrides,
  echeances:mkEcheances({date_debut:dateDebut,honoraires,delai_paiement:14,modalites:overrides}),
});

const INIT_CONTRATS = [
  mk(1,"CTR-2024-001","Résidence Les Jasmins","Résidentiel",185000,"2024-01-15",{
    COMMANDE:{livree:true,date_livraison:"2024-01-15",paiement_recu:true,facture_emise:true,avancement:100},
    ESQ:     {livree:true,date_livraison:"2024-01-30",paiement_recu:true,facture_emise:true,avancement:100},
    APS:     {livree:true,date_livraison:"2024-02-25",paiement_recu:true,facture_emise:true,avancement:100},
    APD:     {retard:2,livree:true,date_livraison:"2024-05-10",facture_emise:true,avancement:100},
    PC:      {duree:3,avancement:60,notes_tech:"Dépôt PC en cours — DRE Tunis"},
    PRO_DCE: {duree:7,avancement:15},
  }),
  mk(2,"CTR-2024-002","Centre Commercial Montplaisir","Commercial",320000,"2024-03-01",{
    COMMANDE:{livree:true,date_livraison:"2024-03-01",paiement_recu:true,facture_emise:true,avancement:100},
    ESQ:     {livree:true,date_livraison:"2024-03-14",paiement_recu:true,facture_emise:true,avancement:100},
    APS:     {retard:3,livree:true,date_livraison:"2024-05-15",paiement_recu:true,facture_emise:true,avancement:100},
    APD:     {duree:7,retard:1,avancement:35,notes_tech:"En attente validation client"},
  }),
  mk(4,"CTR-2025-001","Clinique Pasteur Extension","Santé",210000,"2025-02-01",{
    COMMANDE:{livree:true,date_livraison:"2025-02-01",paiement_recu:true,facture_emise:true,avancement:100},
    ESQ:     {duree:3,avancement:80,notes_tech:"Esquisse soumise — retour client attendu"},
  }),
];

const INIT_CHARGES = [
  {id:1,cat:"Loyer bureau",   mnt:2800, per:"Mensuel",desc:"Bureaux centre-ville"},
  {id:2,cat:"Salaires",       mnt:18500,per:"Mensuel",desc:"Équipe 5 collaborateurs"},
  {id:3,cat:"Logiciels",      mnt:1200, per:"Mensuel",desc:"AutoCAD, Revit, Adobe CC"},
  {id:4,cat:"Charges sociales",mnt:4200,per:"Mensuel",desc:"CNSS, CNAM"},
  {id:5,cat:"Télécoms",       mnt:350,  per:"Mensuel",desc:"Téléphone & Internet"},
  {id:6,cat:"Fournitures",    mnt:600,  per:"Mensuel",desc:"Papeterie, impression"},
  {id:7,cat:"Comptabilité",   mnt:800,  per:"Mensuel",desc:"Cabinet comptable"},
  {id:8,cat:"Assurance RC",   mnt:420,  per:"Mensuel",desc:"Responsabilité civile pro"},
];

/* ═══════════════════════════════════════════════════════════
   UI ATOMS
═══════════════════════════════════════════════════════════ */
const Tag = ({c=T.gold,children,sm}) => (
  <span style={{background:`${c}18`,color:c,border:`1px solid ${c}35`,
    padding:sm?"1px 7px":"2px 10px",borderRadius:3,
    fontSize:sm?10:11,fontFamily:"'JetBrains Mono',monospace",
    letterSpacing:".04em",whiteSpace:"nowrap"}}>{children}</span>
);

const Kpi = ({label,value,sub,accent=T.gold,sm}) => (
  <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,
    padding:sm?"13px 16px":"16px 20px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:accent}}/>
    <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
      letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>{label}</div>
    <div style={{fontSize:sm?18:22,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,
      color:T.text,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.sub,marginTop:4}}>{sub}</div>}
  </div>
);

const Btn = ({children,onClick,v="primary",sm,disabled,full}) => {
  const s={
    primary:{background:T.gold,color:"#08080A",border:"none"},
    ghost:  {background:"transparent",color:T.text,border:`1px solid ${T.border}`},
    danger: {background:"transparent",color:T.red,border:`1px solid ${T.redDk}55`},
    green:  {background:`${T.green}18`,color:T.green,border:`1px solid ${T.green}40`},
    blue:   {background:`${T.blue}18`,color:T.blue,border:`1px solid ${T.blue}40`},
    teal:   {background:`${T.teal}18`,color:T.teal,border:`1px solid ${T.teal}40`},
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...s[v],padding:sm?"5px 12px":"9px 20px",borderRadius:5,
      cursor:disabled?"not-allowed":"pointer",fontSize:sm?11:13,
      fontFamily:"'Inter',sans-serif",fontWeight:500,opacity:disabled?.4:1,
      width:full?"100%":"auto",whiteSpace:"nowrap",transition:"opacity .15s"
    }}
    onMouseOver={e=>!disabled&&(e.currentTarget.style.opacity=".75")}
    onMouseOut={e=>(e.currentTarget.style.opacity="1")}>{children}</button>
  );
};

const Inp = ({label,value,onChange,type="text",opts,half,readOnly,rows,note,style}) => (
  <div style={{marginBottom:12,flex:half?"0 0 calc(50% - 7px)":"1 1 100%",...(style||{})}}>
    {label&&<div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
      letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>{label}</div>}
    {opts?(
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,
        padding:"8px 10px",color:T.text,fontSize:13,fontFamily:"'Inter',sans-serif"}}>
        {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
      </select>
    ):rows?(
      <textarea value={value} onChange={e=>!readOnly&&onChange(e.target.value)} rows={rows}
        style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,
          padding:"8px 10px",color:T.text,fontSize:13,fontFamily:"'Inter',sans-serif"}}/>
    ):(
      <input type={type} value={value||""} readOnly={readOnly}
        onChange={e=>!readOnly&&onChange(e.target.value)} style={{
        width:"100%",background:readOnly?T.bg:T.surface,border:`1px solid ${T.border}`,
        borderRadius:5,padding:"8px 10px",color:readOnly?T.sub:T.text,
        fontSize:13,fontFamily:"'Inter',sans-serif"}}/>
    )}
    {note&&<div style={{fontSize:10,color:T.dim,marginTop:3}}>{note}</div>}
  </div>
);

const Modal = ({title,sub,onClose,children,wide,xl}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:2000,
    display:"flex",alignItems:"flex-start",justifyContent:"center",
    padding:20,overflowY:"auto"}}>
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,
      width:"100%",maxWidth:xl?1080:wide?760:540,marginTop:20,marginBottom:20,
      animation:"fadeIn .2s ease"}}>
      <div style={{padding:"15px 20px",borderBottom:`1px solid ${T.border}`,
        display:"flex",justifyContent:"space-between",alignItems:"center",
        position:"sticky",top:0,background:T.card,zIndex:1,borderRadius:"12px 12px 0 0"}}>
        <div>
          <div style={{fontSize:16,fontFamily:"'Inter',sans-serif",fontWeight:600,color:T.text}}>{title}</div>
          {sub&&<div style={{fontSize:11,color:T.sub,marginTop:1}}>{sub}</div>}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.sub,
          cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   ÉCRAN DE CONNEXION PAR PIN
═══════════════════════════════════════════════════════════ */
function LoginScreen({onLogin}) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [pin, setPin]   = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState("");

  const handleDigit = (d) => {
    if(pin.length>=4) return;
    const newPin = pin+d;
    setPin(newPin);
    if(newPin.length===4) {
      setTimeout(()=>{
        if(newPin===ROLES[selectedRole].pin) {
          onLogin(selectedRole);
        } else {
          setShake(true);
          setError("Code PIN incorrect");
          setTimeout(()=>{setPin("");setShake(false);setError("");},800);
        }
      },150);
    }
  };

  const handleBack = () => setPin(p=>p.slice(0,-1));

  const role = selectedRole ? ROLES[selectedRole] : null;

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",
      justifyContent:"center",flexDirection:"column",padding:20}}>

      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:48}}>
        <div style={{fontSize:9,color:T.goldDk,fontFamily:"'JetBrains Mono',monospace",
          letterSpacing:".25em",textTransform:"uppercase",marginBottom:8}}>
          CABINET D'ARCHITECTURE
        </div>
        <div style={{fontSize:32,fontFamily:"'Inter',sans-serif",fontWeight:700,color:T.text,lineHeight:1,letterSpacing:'-.02em'}}>
          Arc<span style={{color:T.gold}}>ERP</span>
        </div>
        <div style={{fontSize:12,color:T.dim,marginTop:6,fontFamily:"'JetBrains Mono',monospace",
          letterSpacing:".1em"}}>Plateforme de gestion · v3.0</div>
      </div>

      {!selectedRole ? (
        /* Sélection du rôle */
        <div style={{width:"100%",maxWidth:460}}>
          <div style={{fontSize:12,color:T.sub,textAlign:"center",marginBottom:20,
            fontFamily:"'JetBrains Mono',monospace",letterSpacing:".08em"}}>
            SÉLECTIONNEZ VOTRE PROFIL
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {Object.values(ROLES).map(r=>(
              <button key={r.id} onClick={()=>setSelectedRole(r.id)} style={{
                background:T.card,border:`1px solid ${T.border}`,borderRadius:10,
                padding:"18px 22px",cursor:"pointer",textAlign:"left",
                transition:"all .2s",display:"flex",alignItems:"center",gap:16
              }}
              onMouseOver={e=>{e.currentTarget.style.borderColor=r.couleur;e.currentTarget.style.background=`${r.couleur}10`}}
              onMouseOut={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.card}}>
                <div style={{width:44,height:44,borderRadius:10,background:`${r.couleur}20`,
                  border:`1px solid ${r.couleur}40`,display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:20,color:r.couleur,flexShrink:0}}>
                  {r.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontFamily:"'Inter',sans-serif",fontWeight:600,
                    color:T.text,marginBottom:3}}>{r.label}</div>
                  <div style={{fontSize:11,color:T.sub}}>{r.desc}</div>
                </div>
                <div style={{color:T.dim,fontSize:18}}>›</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Saisie PIN */
        <div style={{width:"100%",maxWidth:320,textAlign:"center",animation:"fadeIn .2s ease"}}>
          {/* Profil sélectionné */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:28}}>
            <div style={{width:36,height:36,borderRadius:8,background:`${role.couleur}20`,
              border:`1px solid ${role.couleur}40`,display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:16,color:role.couleur}}>
              {role.icon}
            </div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:15,fontFamily:"'Inter',sans-serif",fontWeight:600,color:T.text}}>{role.label}</div>
              <div style={{fontSize:11,color:T.sub}}>Entrez votre code PIN</div>
            </div>
          </div>

          {/* Points PIN */}
          <div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:28,
            animation:shake?"pinShake .4s ease":"none"}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{width:14,height:14,borderRadius:"50%",
                background:i<pin.length?role.couleur:`${T.border}`,
                border:`2px solid ${i<pin.length?role.couleur:T.border}`,
                transition:"all .15s",transform:i<pin.length?"scale(1.1)":"scale(1)"}}>
              </div>
            ))}
          </div>

          {error&&<div style={{fontSize:12,color:T.red,marginBottom:16,
            fontFamily:"'JetBrains Mono',monospace"}}>{error}</div>}

          {/* Pavé numérique */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
              <button key={i} onClick={()=>d==="⌫"?handleBack():d!==""&&handleDigit(String(d))}
                disabled={d===""}
                style={{
                  height:56,borderRadius:10,border:`1px solid ${T.border}`,
                  background:d==="⌫"?`${T.red}15`:T.card,
                  color:d==="⌫"?T.red:T.text,
                  fontSize:d==="⌫"?18:20,fontFamily:"'JetBrains Mono',monospace",
                  cursor:d===""?"default":"pointer",fontWeight:400,
                  opacity:d===""?0:1,transition:"all .1s"
                }}
                onMouseOver={e=>d!==""&&d!=="⌫"&&(e.currentTarget.style.background=`${role.couleur}20`)}
                onMouseOut={e=>(e.currentTarget.style.background=d==="⌫"?`${T.red}15`:T.card)}>
                {d}
              </button>
            ))}
          </div>

          <button onClick={()=>{setSelectedRole(null);setPin("");setError("");}}
            style={{background:"none",border:"none",color:T.sub,cursor:"pointer",
              fontSize:12,fontFamily:"'JetBrains Mono',monospace",letterSpacing:".06em"}}>
            ← Changer de profil
          </button>
        </div>
      )}

      {/* Hint discret */}
      <div style={{position:"fixed",bottom:16,fontSize:10,color:T.dim,
        fontFamily:"'JetBrains Mono',monospace",textAlign:"center"}}>
        Admin: 0000 · RAF: 1234 · CdP: 1111/2222/3333/4444
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MINI GANTT
═══════════════════════════════════════════════════════════ */
const MiniGantt = ({echeances}) => {
  if(!echeances?.length) return null;
  const total = echeances.reduce((s,e)=>s+(e.duree||1),0)||1;
  return (
    <div style={{display:"flex",gap:2,height:18,marginTop:8}}>
      {echeances.map((e,i)=>(
        <div key={i} title={`${e.label} · ${fmt(e.montant)}`} style={{
          flex:`0 0 ${((e.duree||1)/total*100).toFixed(1)}%`,height:"100%",
          background:e.paiement_recu?e.couleur:e.livree?`${e.couleur}80`:`${e.couleur}28`,
          border:`1px solid ${e.couleur}50`,borderRadius:2,
          outline:e.retard>0?`1px solid ${T.red}`:"none"
        }}/>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   DASHBOARD ADMIN & RAF
═══════════════════════════════════════════════════════════ */
function PageDashboard({contrats, clients, charges, role}) {
  const allEch  = contrats.flatMap(c=>(c.echeances||[]).map(e=>({...e,cNom:c.nom,cRef:c.ref})));
  const totHon  = contrats.reduce((s,c)=>s+c.honoraires,0);
  const totPayé = allEch.filter(e=>e.paiement_recu).reduce((s,e)=>s+e.montant,0);
  const totFact = allEch.filter(e=>e.facture_emise&&!e.paiement_recu).reduce((s,e)=>s+e.montant,0);
  const totPlan = allEch.filter(e=>!e.facture_emise&&!e.paiement_recu).reduce((s,e)=>s+e.montant,0);
  const chargeM = charges.reduce((s,c)=>s+c.mnt,0);
  const retards = allEch.filter(e=>e.retard>0&&!e.paiement_recu);

  const cfByM={};
  allEch.forEach(e=>{
    const m=e.date_paiement?.slice(0,7); if(!m) return;
    if(!cfByM[m]) cfByM[m]={prevu:0,reel:0};
    cfByM[m].prevu+=e.montant;
    if(e.paiement_recu) cfByM[m].reel+=e.montant;
  });
  const cfData = Object.keys(cfByM).sort().slice(0,16).map(m=>({
    label: new Date(m+"-01").toLocaleDateString("fr-FR",{month:"short",year:"2-digit"}),
    prevu:cfByM[m].prevu, reel:cfByM[m].reel, charges:chargeM,
  }));

  const prochains = allEch.filter(e=>!e.livree&&e.date_echeance>=today())
    .sort((a,b)=>a.date_echeance.localeCompare(b.date_echeance)).slice(0,5);

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{marginBottom:22}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>
          {role==="ADMIN"?"Vue Consolidée":"Dashboard RAF"}
        </h2>
        <p style={{color:T.sub,fontSize:13,marginTop:3}}>
          {contrats.length} contrats · {clients.length} clients · {new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
        <Kpi label="Portfolio" value={fmt(totHon)} sm/>
        <Kpi label="Encaissé" value={fmt(totPayé)} accent={T.green} sub={pct(totPayé,totHon)} sm/>
        <Kpi label="En attente" value={fmt(totFact)} accent={T.orange} sm/>
        <Kpi label="À facturer" value={fmt(totPlan)} accent={T.blue} sm/>
        <Kpi label="Charges/mois" value={fmt(chargeM)} accent={T.red} sm/>
      </div>

      {retards.length>0&&(
        <div style={{background:`${T.red}0C`,border:`1px solid ${T.red}28`,borderRadius:8,
          padding:"12px 16px",marginBottom:18}}>
          <div style={{fontSize:12,color:T.red,fontWeight:600,marginBottom:7}}>
            ⚠ {retards.length} livrable(s) en retard — Impact cashflow
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {retards.map((r,i)=>(
              <div key={i} style={{background:`${T.red}10`,border:`1px solid ${T.red}20`,
                borderRadius:5,padding:"4px 10px",fontSize:11}}>
                <span style={{color:T.sub}}>{r.cRef} · </span>
                <span style={{color:r.couleur,fontFamily:"'JetBrains Mono',monospace"}}>{r.key}</span>
                <span style={{color:T.red}}> +{r.retard}sem </span>
                <span style={{color:T.gold}}>→ {fmt(r.montant)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16,marginBottom:16}}>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"16px 13px"}}>
          <div style={{fontSize:10,color:T.sub,fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:".07em",textTransform:"uppercase",marginBottom:13}}>
            CASHFLOW PRÉVU vs ENCAISSÉ vs CHARGES
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={cfData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="label" tick={{fill:T.sub,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={fmtK} tick={{fill:T.sub,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.border}`,borderRadius:6}}
                formatter={(v,n)=>[fmt(v),n]}/>
              <Bar dataKey="prevu" name="Prévu" fill={`${T.gold}50`} radius={[2,2,0,0]}/>
              <Bar dataKey="reel"  name="Encaissé" fill={T.green} radius={[2,2,0,0]}/>
              <Line type="monotone" dataKey="charges" name="Charges" stroke={T.red}
                strokeWidth={1.5} strokeDasharray="4 2" dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontSize:10,
            color:T.sub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:".07em",
            textTransform:"uppercase"}}>
            PROCHAINS LIVRABLES → PAIEMENTS
          </div>
          {prochains.map((e,i)=>(
            <div key={i} style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                  <Tag c={e.couleur} sm>{e.key}</Tag>
                  <span style={{fontSize:11,color:T.text}}>{(e.cNom||"").split(" ").slice(0,2).join(" ")}</span>
                </div>
                <div style={{fontSize:10,color:T.dim}}>Paiement : {e.date_paiement}</div>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                color:T.gold,flexShrink:0}}>{fmt(e.montant)}</div>
            </div>
          ))}
          {prochains.length===0&&(
            <div style={{padding:24,textAlign:"center",color:T.dim,fontSize:12}}>
              Aucun livrable planifié
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORMULAIRE CONTRAT (4 ÉTAPES)
═══════════════════════════════════════════════════════════ */
/* Champ honoraires avec formatage financier en temps réel */
function HonorairesInput({value, onChange}) {
  const [focused, setFocused] = useState(false);

  // Format number with spaces: 300000 -> "300 000"
  const formatNum = n => n ? new Intl.NumberFormat("fr-FR").format(+n) : "";

  // While editing: raw digits only. While not editing: formatted display
  const [raw, setRaw] = useState(value ? String(value) : "");

  const handleChange = (e) => {
    const clean = e.target.value.replace(/[^0-9]/g,"");
    setRaw(clean);
    onChange(clean ? parseInt(clean,10) : "");
  };

  // Sync raw when value is set externally (e.g. editing existing contract)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(value) setRaw(String(value)); },[]);

  const displayVal = focused ? raw : formatNum(raw);

  return (
    <div style={{marginBottom:12,flex:"0 0 calc(50% - 7px)"}}>
      <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
        letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>
        Honoraires HT
      </div>
      <div style={{position:"relative"}}>
        <input
          type="text"
          inputMode="numeric"
          value={displayVal}
          onChange={handleChange}
          onFocus={()=>setFocused(true)}
          onBlur={()=>setFocused(false)}
          placeholder="300 000"
          style={{
            width:"100%",background:T.surface,border:`1px solid ${T.border}`,
            borderRadius:5,padding:"8px 42px 8px 10px",
            color:T.gold,fontSize:16,fontFamily:"'JetBrains Mono',monospace",
            fontWeight:600,letterSpacing:".03em"
          }}
        />
        <span style={{
          position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
          fontSize:11,color:T.goldDk,fontFamily:"'JetBrains Mono',monospace",
          pointerEvents:"none",fontWeight:500
        }}>DH</span>
      </div>
      {raw&&+raw>0&&(
        <div style={{fontSize:10,color:T.sub,marginTop:3,fontFamily:"'JetBrains Mono',monospace"}}>
          {new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(+raw)} DH
        </div>
      )}
    </div>
  );
}

// Génère la référence interne C-BAQ-XX/YYYY
// Le numéro d'ordre est global (jamais réinitialisé par année)
function genRefInterne(contrats) {
  const year = new Date().getFullYear();
  // Compte tous les contrats existants pour obtenir le prochain numéro
  const next = (contrats.length + 1);
  const num  = String(next).padStart(2, "0");
  return `C-BAQ-${num}/${year}`;
}

function FormulaireContrat({contrat, clients, contrats, charges, onSave, onClose}) {
  const isEdit = !!contrat;
  const [step, setStep] = useState(1);
  const [base, setBase] = useState({
    ref_interne:     contrat?.ref_interne      || genRefInterne(contrats),
    ref_client:      contrat?.ref_client       || "",   // numéro contrat côté client
    nom:             contrat?.nom             || "",
    clientId:        contrat?.clientId        || clients[0]?.id||"",
    type:            contrat?.type            || "Résidentiel",
    nature:          contrat?.nature          || "Nouvelle construction",
    statut:          contrat?.statut          || "Actif",
    honoraires:      contrat?.honoraires      || "",
    date_signature:  contrat?.date_signature  || today(),
    date_debut:      contrat?.date_debut      || today(),
    delai_paiement:  contrat?.delai_paiement  || 14,
    // delai_global calculé automatiquement depuis les modalités (delaiPcDceSemaines)
    // date_prevision_pc calculée automatiquement (datePrevPC)
    type_contrat:    contrat?.type_contrat    || "Convention d'honoraires",
    num_bc:          contrat?.num_bc          || "",
    ref_rokhas:      contrat?.ref_rokhas      || "",
    ref_pc:          contrat?.ref_pc          || "",
    ref_refection:   contrat?.ref_refection   || "",
    notes:           contrat?.notes           || "",
    // Bloc client identifiant (saisi au contrat, indépendant de la fiche client)
    client_type_id:  contrat?.client_type_id  || "société",   // "particulier"|"société"
    client_cin:      contrat?.client_cin       || "",
    client_rc:       contrat?.client_rc        || "",
    client_ice:      contrat?.client_ice       || "",
    client_rep_nom:  contrat?.client_rep_nom   || "",
    client_rep_prenom:contrat?.client_rep_prenom||"",
    client_tel1:     contrat?.client_tel1      || "",
    client_tel2:     contrat?.client_tel2      || "",
    client_email:    contrat?.client_email     || "",
    client_infos:    contrat?.client_infos     || "",
    client_nom_saisi:contrat?.client_nom_saisi || "",   // Saisie libre au contrat
  });

  const [modalites, setModalites] = useState(()=>{
    const m={};
    PHASES_DEF.forEach(ph=>{
      m[ph.key]={
        actif:          contrat?.modalites?.[ph.key]?.actif!==false,
        pct:            contrat?.modalites?.[ph.key]?.pct   ?? ph.pct,
        duree:          contrat?.modalites?.[ph.key]?.duree ?? ph.duree,
        retard:         contrat?.modalites?.[ph.key]?.retard         ||0,
        livree:         contrat?.modalites?.[ph.key]?.livree         ||false,
        date_livraison: contrat?.modalites?.[ph.key]?.date_livraison ||"",
        facture_emise:  contrat?.modalites?.[ph.key]?.facture_emise  ||false,
        paiement_recu:  contrat?.modalites?.[ph.key]?.paiement_recu  ||false,
        avancement:     contrat?.modalites?.[ph.key]?.avancement     ||0,
        notes_tech:     contrat?.modalites?.[ph.key]?.notes_tech     ||"",
        facturable:     contrat?.modalites?.[ph.key]?.facturable     !==undefined ? contrat.modalites[ph.key].facturable : true,
        groupe_fact:    contrat?.modalites?.[ph.key]?.groupe_fact    ||"",
        libelle_fact:   contrat?.modalites?.[ph.key]?.libelle_fact   ||"",
        retard_manuel:  contrat?.modalites?.[ph.key]?.retard_manuel  ||false,
      };
    });
    return m;
  });

  const hon = +base.honoraires||0;
  const totalPct = PHASES_DEF.filter(ph=>modalites[ph.key]?.actif).reduce((s,ph)=>s+(+modalites[ph.key]?.pct||0),0);
  const prevEch  = useMemo(()=>mkEcheances({...base,honoraires:hon,modalites}),[base.date_debut,base.delai_paiement,hon,modalites]);
  const upM = (key,field,val) => setModalites(p=>({...p,[key]:{...p[key],[field]:val}}));

  // Cascade : quand une date_livraison réelle est saisie sur une phase,
  // calcule le décalage (retard réel en semaines) et le propage aux phases suivantes
  // SAUF si la phase suivante a déjà été ajustée manuellement (retard_manuel=true)
  const upLivraisonReelle = (key, dateReelle) => {
    setModalites(prev => {
      const next = {...prev};
      // Mettre à jour la date réelle de la phase modifiée
      next[key] = {...next[key], date_livraison: dateReelle};

      // Calculer le retard réel de cette phase
      // Date écheance prévue : recalculée depuis l'état courant
      const echs = mkEcheances({...base, honoraires: hon, modalites: next});
      const phEch = echs.find(e => e.key === key);
      if(!phEch || !dateReelle) return next;

      const datePrevu = new Date(phEch.date_echeance);
      const dateReel  = new Date(dateReelle);
      const diffJours = Math.round((dateReel - datePrevu) / (1000 * 3600 * 24));
      const diffSem   = Math.round(diffJours / 7);

      // Mettre à jour le retard de cette phase
      next[key] = {...next[key], retard: Math.max(0, diffSem)};

      // Propager en cascade aux phases suivantes NON manuellement ajustées
      const ORDRE = ["COMMANDE","ESQ","APS","APD","PC","PRO_DCE","CHANTIER","REC_PROV","REC_DEF"];
      const idx = ORDRE.indexOf(key);
      if(idx >= 0 && diffSem !== 0) {
        for(let i = idx + 1; i < ORDRE.length; i++) {
          const nextKey = ORDRE[i];
          if(next[nextKey] && next[nextKey].actif !== false && !next[nextKey].retard_manuel) {
            // Décaler le retard en cascade (cumulatif)
            const retardActuel = next[nextKey].retard || 0;
            next[nextKey] = {
              ...next[nextKey],
              retard: Math.max(0, retardActuel + diffSem),
            };
          }
        }
      }
      return next;
    });
  };

  // Calcul automatique délai PC+DCE depuis les semaines des modalités
  const delaiPcDceSemaines = useMemo(()=>{
    return PHASES_PC_DCE.reduce((s, key)=>{
      const m = modalites[key];
      if(!m||m.actif===false) return s;
      return s + (+m.duree||0) + (+m.retard||0);
    }, 0);
  }, [modalites]);
  const delaiPcDceLabel = semToLabel(delaiPcDceSemaines);

  // Date prévisionnelle PC = date démarrage + somme semaines jusqu'à PC inclus
  const datePrevPC = useMemo(()=>{
    if(!base.date_debut) return null;
    const semPC = PHASES_JUSQU_PC.reduce((s, key)=>{
      const m = modalites[key];
      if(!m || m.actif===false) return s;
      return s + (+m.duree||0) + (+m.retard||0);
    }, 0);
    if(semPC===0) return null;
    const d = new Date(base.date_debut);
    d.setDate(d.getDate() + semPC * 7);
    return d.toISOString().split("T")[0];
  }, [base.date_debut, modalites]);

  const save = () => {
    const c={...base,id:contrat?.id||nid(),ref:base.ref_interne,honoraires:hon,modalites,
      echeances:mkEcheances({...base,honoraires:hon,modalites})};
    onSave(c); onClose();
  };

  const STEPS=["Identification","Modalités paiement","Planning","Récapitulatif"];

  return (
    <Modal title={isEdit?"Modifier contrat":"Nouveau contrat / Bon de commande"}
      sub={base.ref} onClose={onClose} xl>
      {/* Stepper */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderRadius:7,
        overflow:"hidden",border:`1px solid ${T.border}`}}>
        {STEPS.map((s,i)=>(
          <button key={i} onClick={()=>setStep(i+1)} style={{
            flex:1,padding:"9px 4px",background:step===i+1?T.gold:T.surface,
            color:step===i+1?"#08080A":T.sub,border:"none",
            borderRight:i<STEPS.length-1?`1px solid ${T.border}`:"none",
            cursor:"pointer",fontSize:12,fontFamily:"'Inter',sans-serif",fontWeight:step===i+1?600:400
          }}>
            <span style={{opacity:.5,fontSize:10}}>{i+1}. </span>{s}
          </button>
        ))}
      </div>

      {/* Step 1 */}
      {step===1&&(
        <div>
          {/* ── Références dossier ── */}
          <div style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,
            paddingBottom:5,borderBottom:`1px solid ${T.border}`}}>
            Références dossier
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 14px",marginBottom:6}}>
            <div style={{display:"flex",gap:12,flex:"1 1 100%",flexWrap:"wrap"}}>
              <div style={{flex:"1 1 calc(50% - 6px)"}}>
                <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                  letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>
                  Réf. interne (auto-générée)
                </div>
                <div style={{
                  background:T.bg,border:`1px solid ${T.border}`,borderRadius:5,
                  padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",
                  gap:8
                }}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,
                    color:T.gold,fontWeight:600,letterSpacing:".04em"}}>
                    {base.ref_interne||"—"}
                  </span>
                  <span style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                    background:`${T.gold}12`,padding:"2px 7px",borderRadius:3,
                    border:`1px solid ${T.gold}25`}}>AUTO</span>
                </div>
              </div>
              <Inp label="Réf. contrat client (numérotation client)" value={base.ref_client}
                onChange={v=>setBase({...base,ref_client:v})}
                style={{flex:"1 1 calc(50% - 6px)"}}/>
            </div>
            <Inp label="Intitulé du projet" value={base.nom} onChange={v=>setBase({...base,nom:v})} half/>
            <Inp label="Réf. Bon de commande" value={base.num_bc} onChange={v=>setBase({...base,num_bc:v})} half/>
            <Inp label="Réf. dossier ROKHAS" value={base.ref_rokhas} onChange={v=>setBase({...base,ref_rokhas:v})} half/>
            <Inp label="Réf. Permis de réfection" value={base.ref_refection} onChange={v=>setBase({...base,ref_refection:v})} half/>
            <Inp label="Réf. Permis de construire" value={base.ref_pc} onChange={v=>setBase({...base,ref_pc:v})} half/>
          </div>

          {/* ── Qualification projet ── */}
          <div style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:".04em",textTransform:"uppercase",marginBottom:10,marginTop:16,
            paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>
            Qualification du projet
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 14px",marginBottom:6}}>
            <Inp label="Type de contrat" value={base.type_contrat}
              onChange={v=>setBase({...base,type_contrat:v})}
              opts={["Convention d'honoraires","Bon de commande","Marché public","Avenant","Contrat sous-traitance"]} half/>
            <Inp label="Statut" value={base.statut}
              onChange={v=>setBase({...base,statut:v})}
              opts={["Actif","Suspendu","Résilié","Archivé"]} half/>
            <Inp label="Type de projet" value={base.type}
              onChange={v=>setBase({...base,type:v})}
              opts={["Résidentiel","Commercial","Public","Industriel","Santé","Éducation","Hôtellerie","Sport","Association","Culturel","Aménagement urbain","Mixte"]} half/>
            <Inp label="Nature des travaux" value={base.nature}
              onChange={v=>setBase({...base,nature:v})}
              opts={["Nouvelle construction","Aménagement","Surélévation","Extension","Rénovation","Réhabilitation"]} half/>
          </div>

          {/* ── Données financières & délais ── */}
          <div style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:".04em",textTransform:"uppercase",marginBottom:10,marginTop:16,
            paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>
            Données financières & délais
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 14px",marginBottom:6}}>
            <HonorairesInput value={base.honoraires} onChange={v=>setBase({...base,honoraires:v})}/>
            <Inp label="Délai d'émission facture après livraison (jours)" type="number" value={base.delai_paiement}
              onChange={v=>setBase({...base,delai_paiement:+v})} half/>
            <Inp label="Date de signature" type="date" value={base.date_signature}
              onChange={v=>setBase({...base,date_signature:v})} half/>
            <Inp label="Date de démarrage" type="date" value={base.date_debut}
              onChange={v=>setBase({...base,date_debut:v})} half/>
            <div style={{flex:"0 0 calc(50% - 7px)",marginBottom:12}}>
              <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>
                Délai livraison PC & DCE (auto)
              </div>
              <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:5,
                padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                  color:delaiPcDceSemaines>0?T.teal:T.dim,fontWeight:600}}>
                  {delaiPcDceLabel}
                </span>
                <span style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                  background:`${T.teal}12`,padding:"2px 7px",borderRadius:3,
                  border:`1px solid ${T.teal}25`,whiteSpace:"nowrap"}}>
                  {delaiPcDceSemaines>0?`${delaiPcDceSemaines} sem.`:"depuis modalités"}
                </span>
              </div>
              <div style={{fontSize:9,color:T.dim,marginTop:3}}>
                Somme des durées : COMMANDE → PRO/DCE inclus
              </div>
            </div>
            <div style={{flex:"0 0 calc(50% - 7px)",marginBottom:12}}>
              <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>
                Date prévisionnelle sortie PC (auto)
              </div>
              <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:5,
                padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                  color:datePrevPC?T.goldLt:T.dim,fontWeight:600,letterSpacing:".03em"}}>
                  {datePrevPC
                    ? new Date(datePrevPC).toLocaleDateString("fr-MA",{day:"2-digit",month:"long",year:"numeric"})
                    : "— renseigner démarrage + délais"}
                </span>
                <span style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                  background:`${T.goldLt}12`,padding:"2px 7px",borderRadius:3,
                  border:`1px solid ${T.goldLt}25`}}>AUTO</span>
              </div>
              <div style={{fontSize:9,color:T.dim,marginTop:3}}>
                Démarrage + durées COMMANDE → PC inclus
              </div>
            </div>
          </div>

          {/* ── Bloc identifiant client ── */}
          <div style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:".04em",textTransform:"uppercase",marginBottom:10,marginTop:16,
            paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>
            Identifiant client / Maître d'ouvrage
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 14px",marginBottom:6}}>
            <Inp label="Raison sociale / Nom du client" value={base.client_nom_saisi}
              onChange={v=>setBase({...base,client_nom_saisi:v})}/>
            <Inp label="Type de client" value={base.client_type_id}
              onChange={v=>setBase({...base,client_type_id:v})}
              opts={["particulier","société"]} half/>
            {base.client_type_id==="particulier"
              ? <Inp label="CIN" value={base.client_cin} onChange={v=>setBase({...base,client_cin:v})} half/>
              : <>
                  <Inp label="Registre de commerce (RC)" value={base.client_rc} onChange={v=>setBase({...base,client_rc:v})} half/>
                  <Inp label="ICE" value={base.client_ice} onChange={v=>setBase({...base,client_ice:v})} half/>
                </>
            }
            <Inp label="Nom du représentant juridique" value={base.client_rep_nom}
              onChange={v=>setBase({...base,client_rep_nom:v})} half/>
            <Inp label="Prénom du représentant" value={base.client_rep_prenom}
              onChange={v=>setBase({...base,client_rep_prenom:v})} half/>
            <Inp label="Téléphone 1" value={base.client_tel1}
              onChange={v=>setBase({...base,client_tel1:v})} half/>
            <Inp label="Téléphone 2" value={base.client_tel2}
              onChange={v=>setBase({...base,client_tel2:v})} half/>
            <Inp label="Adresse e-mail" type="email" value={base.client_email}
              onChange={v=>setBase({...base,client_email:v})}/>
            <Inp label="Informations complémentaires" value={base.client_infos}
              onChange={v=>setBase({...base,client_infos:v})} rows={2}/>
          </div>

          {/* ── Notes ── */}
          <div style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:".04em",textTransform:"uppercase",marginBottom:10,marginTop:16,
            paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>
            Notes & observations
          </div>
          <Inp value={base.notes} onChange={v=>setBase({...base,notes:v})} rows={2}/>
        </div>
      )}

      {/* Step 2 — Modalités */}
      {step===2&&(
        <div>
          <div style={{background:`${T.gold}10`,border:`1px solid ${T.gold}28`,borderRadius:7,
            padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:T.text}}>
              Total alloué :&nbsp;
              <span style={{color:totalPct===100?T.green:T.red,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>
                {totalPct}%
              </span>
            </span>
            <span style={{fontSize:12,color:T.sub}}>Base : <span style={{color:T.gold}}>{fmt(hon)}</span></span>
          </div>
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.border}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"24px 1fr 50px 85px 55px 50px 95px 50px 80px 60px 60px",
              gap:5,padding:"9px 12px",background:T.card2,borderBottom:`1px solid ${T.border}`}}>
              {["","Jalon de paiement","%","Montant","Durée\n(sem)","Ret.\n(sem)","Paiement\nprévu","Factble","Groupe\nfact.","Fact.","Payée"]
                .map((h,i)=>(
                <div key={i} style={{fontSize:9,color:i===7?T.orange:i===8?T.blue:T.dim,
                  fontFamily:"'JetBrains Mono',monospace",
                  letterSpacing:".05em",whiteSpace:"pre-line",lineHeight:1.3}}>{h}</div>
              ))}
            </div>
            {PHASES_DEF.map((ph,i)=>{
              const m=modalites[ph.key];
              const mt=Math.round((hon*(+m.pct||0))/100);
              const prev=prevEch.find(e=>e.key===ph.key);
              return (
                <div key={ph.key} style={{
                  display:"grid",
                  gridTemplateColumns:"24px 1fr 50px 85px 55px 50px 95px 50px 80px 60px 60px",
                  gap:5,padding:"9px 12px",
                  borderBottom:i<PHASES_DEF.length-1?`1px solid ${T.border}`:"none",
                  background:m.actif?"transparent":`${T.dim}06`,opacity:m.actif?1:.5,
                  alignItems:"center"}}>
                  {/* Actif */}
                  <input type="checkbox" checked={m.actif}
                    onChange={e=>upM(ph.key,"actif",e.target.checked)}
                    style={{accentColor:T.gold,width:13,height:13,cursor:"pointer"}}/>
                  {/* Label */}
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:ph.couleur,flexShrink:0}}/>
                    <span style={{fontSize:12,color:T.text}}>{ph.label}</span>
                    {ph.mensuel&&<Tag c={T.teal} sm>mensuel</Tag>}
                  </div>
                  {/* % */}
                  <input type="number" min="0" max="100" value={m.pct} disabled={!m.actif}
                    onChange={e=>upM(ph.key,"pct",+e.target.value)}
                    style={{width:"100%",background:T.bg,border:`1px solid ${T.border}`,
                      borderRadius:4,padding:"3px 5px",color:T.gold,
                      fontSize:11,fontFamily:"'JetBrains Mono',monospace",textAlign:"center"}}/>
                  {/* Montant */}
                  <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:T.gold}}>{fmt(mt)}</div>
                  {/* Durée */}
                  <input type="number" min="0" max="104" value={m.duree} disabled={!m.actif}
                    onChange={e=>upM(ph.key,"duree",+e.target.value)}
                    style={{width:"100%",background:T.bg,border:`1px solid ${T.border}`,
                      borderRadius:4,padding:"3px 5px",color:T.text,
                      fontSize:11,fontFamily:"'JetBrains Mono',monospace",textAlign:"center"}}/>
                  {/* Retard */}
                  <input type="number" min="0" max="52" value={m.retard} disabled={!m.actif}
                    onChange={e=>upM(ph.key,"retard",+e.target.value)}
                    style={{width:"100%",background:m.retard>0?`${T.red}15`:T.bg,
                      border:`1px solid ${m.retard>0?T.red:T.border}`,
                      borderRadius:4,padding:"3px 5px",
                      color:m.retard>0?T.red:T.text,
                      fontSize:11,fontFamily:"'JetBrains Mono',monospace",textAlign:"center"}}/>
                  {/* Paiement prévu */}
                  <div style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:T.goldDk}}>
                    {prev?.date_paiement||"—"}
                  </div>
                  {/* Facturable toggle */}
                  <button onClick={()=>upM(ph.key,"facturable",!m.facturable)} disabled={!m.actif}
                    title={m.facturable?"Facturable seule":"Non facturable seule — à regrouper"}
                    style={{padding:"3px 0",borderRadius:4,fontSize:10,cursor:"pointer",
                      background:m.facturable?`${T.orange}22`:`${T.dim}15`,
                      color:m.facturable?T.orange:T.dim,
                      border:`1px solid ${m.facturable?T.orange+"50":T.border}`,
                      fontFamily:"'JetBrains Mono',monospace"}}>
                    {m.facturable?"✓":"✗"}
                  </button>
                  {/* Groupe de facturation */}
                  <input type="text" maxLength={3}
                    value={m.groupe_fact||""}
                    disabled={!m.actif||m.facturable}
                    placeholder="—"
                    title="Lettre de groupe (ex: A, B) — regrouper plusieurs phases sur une même facture"
                    onChange={e=>upM(ph.key,"groupe_fact",e.target.value.toUpperCase())}
                    style={{width:"100%",background:m.groupe_fact?`${T.blue}15`:T.bg,
                      border:`1px solid ${m.groupe_fact?T.blue+"60":T.border}`,
                      borderRadius:4,padding:"3px 5px",
                      color:m.groupe_fact?T.blue:T.dim,
                      fontSize:11,fontFamily:"'JetBrains Mono',monospace",
                      textAlign:"center",opacity:m.facturable?.4:1}}/>
                  {/* Facturée */}
                  <button onClick={()=>upM(ph.key,"facture_emise",!m.facture_emise)} disabled={!m.actif}
                    style={{padding:"3px 0",borderRadius:4,fontSize:10,cursor:"pointer",
                      background:m.facture_emise?`${T.orange}22`:"transparent",
                      color:m.facture_emise?T.orange:T.dim,
                      border:`1px solid ${m.facture_emise?T.orange+"50":T.border}`,
                      fontFamily:"'JetBrains Mono',monospace"}}>
                    {m.facture_emise?"✓":"—"}
                  </button>
                  {/* Payée */}
                  <button onClick={()=>upM(ph.key,"paiement_recu",!m.paiement_recu)} disabled={!m.actif}
                    style={{padding:"3px 0",borderRadius:4,fontSize:10,cursor:"pointer",
                      background:m.paiement_recu?`${T.green}22`:"transparent",
                      color:m.paiement_recu?T.green:T.dim,
                      border:`1px solid ${m.paiement_recu?T.green+"50":T.border}`,
                      fontFamily:"'JetBrains Mono',monospace"}}>
                    {m.paiement_recu?"✓":"—"}
                  </button>
                </div>
              );
            })}
          </div>
          {totalPct!==100&&(
            <div style={{background:`${T.red}10`,border:`1px solid ${T.red}28`,borderRadius:5,
              padding:"7px 12px",marginTop:10,fontSize:11,color:T.red}}>
              ⚠ Total = {totalPct}% — doit être égal à 100% pour un contrat équilibré.
            </div>
          )}
          <div style={{background:`${T.blue}0A`,border:`1px solid ${T.blue}25`,borderRadius:6,
            padding:"9px 13px",marginTop:10,fontSize:11,color:T.sub,lineHeight:1.6}}>
            <strong style={{color:T.blue}}>Groupe de facturation</strong> — Si plusieurs phases doivent être
            regroupées sur une même facture, désactivez <span style={{color:T.orange}}>"Factble"</span> et
            attribuez la même lettre de groupe (ex : <span style={{color:T.blue,fontFamily:"'JetBrains Mono',monospace"}}>A</span>) à chacune.
            La facture groupe sera émise quand toutes les phases du groupe seront livrées.
          </div>
        </div>
      )}

      {/* Step 3 — Planning */}
      {step===3&&(
        <div>
          <div style={{background:`${T.teal}0C`,border:`1px solid ${T.teal}30`,borderRadius:7,
            padding:"9px 13px",marginBottom:12,fontSize:12,color:T.sub,lineHeight:1.6}}>
            ℹ <strong style={{color:T.teal}}>Cascade automatique</strong> — Saisir une date réelle
            décale automatiquement toutes les phases suivantes.
            Activez <span style={{color:T.orange,fontFamily:"'JetBrains Mono',monospace"}}>Manuel</span> sur
            une phase pour bloquer son décalage (rattrapage de retard).
          </div>
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.border}`,overflow:"hidden"}}>
            <div style={{display:"grid",
              gridTemplateColumns:"120px 70px 95px 110px 130px 70px 95px 70px",
              gap:5,padding:"9px 12px",background:T.card2,borderBottom:`1px solid ${T.border}`}}>
              {["Phase","Durée","Début prévu","Livraison prévue","Livraison réelle → cascade","Retard","Paiement prévu","Montant"]
                .map((h,i)=>(
                <div key={i} style={{fontSize:9,
                  color:i===3?T.gold:i===4?T.green:i===5?T.red:T.dim,
                  fontFamily:"'JetBrains Mono',monospace",letterSpacing:".04em"}}>{h}</div>
              ))}
            </div>
            {prevEch.map((e,i)=>{
              const m = modalites[e.key];
              const isLate = e.retard > 0;
              const isManuel = m.retard_manuel || false;
              return (
                <div key={e.key} style={{
                  display:"grid",
                  gridTemplateColumns:"120px 70px 95px 110px 130px 70px 95px 70px",
                  gap:5,padding:"10px 12px",
                  borderBottom:i<prevEch.length-1?`1px solid ${T.border}`:"none",
                  background:isLate?`${T.red}07`:`${T.border}08`,
                  alignItems:"center",transition:"background .15s"
                }}>

                  {/* Phase */}
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:e.couleur,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:11,color:e.couleur,fontFamily:"'JetBrains Mono',monospace"}}>{e.key}</div>
                      <div style={{fontSize:9,color:T.dim}}>{e.pct}%</div>
                    </div>
                  </div>

                  {/* Durée */}
                  <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:T.sub,textAlign:"center"}}>
                    {e.duree}<span style={{fontSize:9,color:T.dim}}> sem</span>
                  </div>

                  {/* Début prévu */}
                  <div style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:T.sub}}>
                    {e.date_debut}
                  </div>

                  {/* Date livraison PRÉVUE */}
                  <div style={{background:`${T.gold}10`,border:`1px solid ${T.gold}25`,
                    borderRadius:5,padding:"4px 8px"}}>
                    <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",
                      color:T.gold,fontWeight:600}}>{e.date_echeance}</div>
                    {isLate&&<div style={{fontSize:8,color:T.red,marginTop:1}}>+{e.retard}sem glissé</div>}
                  </div>

                  {/* Date livraison RÉELLE + cascade */}
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {m.livree ? (
                      <div style={{display:"flex",flexDirection:"column",gap:3}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:T.green,flexShrink:0}}/>
                          <span style={{fontSize:9,color:T.green,fontFamily:"'JetBrains Mono',monospace"}}>Livré</span>
                        </div>
                        <input type="date" value={m.date_livraison||""}
                          onChange={ev=>upLivraisonReelle(e.key, ev.target.value)}
                          style={{background:T.bg,border:`1px solid ${T.green}50`,borderRadius:4,
                            padding:"3px 6px",color:T.green,fontSize:10,
                            fontFamily:"'JetBrains Mono',monospace",width:"100%"}}/>
                        <button onClick={()=>upM(e.key,"livree",false)} style={{
                          fontSize:9,color:T.dim,background:"none",border:"none",
                          cursor:"pointer",textAlign:"left",fontFamily:"'JetBrains Mono',monospace"}}>
                          ↩ annuler
                        </button>
                      </div>
                    ) : (
                      <button onClick={()=>{upM(e.key,"livree",true);upM(e.key,"date_livraison",today());}} style={{
                        padding:"4px 8px",borderRadius:4,fontSize:10,cursor:"pointer",
                        background:`${T.dim}12`,color:T.sub,
                        border:`1px solid ${T.border}`,
                        fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>
                        + Saisir livraison
                      </button>
                    )}
                  </div>

                  {/* Retard — éditable + toggle Manuel */}
                  <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"center"}}>
                    <input type="number" min="0" max="52" value={m.retard||0}
                      onChange={e2=>{
                        upM(e.key,"retard",+e2.target.value);
                        upM(e.key,"retard_manuel",true);
                      }}
                      style={{width:40,background:isLate?`${T.red}15`:T.bg,
                        border:`1px solid ${isLate?T.red:T.border}`,
                        borderRadius:4,padding:"3px 5px",
                        color:isLate?T.red:T.sub,
                        fontSize:12,fontFamily:"'JetBrains Mono',monospace",textAlign:"center"}}/>
                    <button
                      title={isManuel?"Ajustement manuel actif — cliquer pour repasser en auto":"Auto-cascade actif"}
                      onClick={()=>upM(e.key,"retard_manuel",!isManuel)}
                      style={{fontSize:8,padding:"1px 5px",borderRadius:3,cursor:"pointer",
                        background:isManuel?`${T.orange}20`:`${T.teal}15`,
                        color:isManuel?T.orange:T.teal,
                        border:`1px solid ${isManuel?T.orange+"50":T.teal+"40"}`,
                        fontFamily:"'JetBrains Mono',monospace",lineHeight:1.5}}>
                      {isManuel?"Manuel":"Auto"}
                    </button>
                  </div>

                  {/* Paiement prévu */}
                  <div style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:T.goldDk,lineHeight:1.4}}>
                    {e.date_paiement}
                  </div>

                  {/* Montant */}
                  <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:T.gold,textAlign:"right"}}>
                    {fmt(e.montant)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Légende */}
          <div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>
            {[
              {c:T.gold, l:"Date prévue — calculée depuis les durées"},
              {c:T.green,l:"Date réelle — déclenche la cascade"},
              {c:T.teal, l:"Auto — suit la cascade"},
              {c:T.orange,l:"Manuel — bloque la cascade (rattrapage)"},
              {c:T.red,  l:"Retard actif"},
            ].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:x.c,flexShrink:0}}/>
                <span style={{fontSize:10,color:T.dim}}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4 — Récap */}
      {step===4&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
            {/* Bloc contrat */}
            <div style={{background:T.surface,borderRadius:8,padding:"14px 16px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>Contrat</div>
              {[
                ["Réf. interne",base.ref_interne],
                base.ref_client&&["Réf. client",base.ref_client],
                base.num_bc&&["Réf. BC",base.num_bc],
                base.ref_rokhas&&["Réf. ROKHAS",base.ref_rokhas],
                base.ref_pc&&["Réf. PC",base.ref_pc],
                base.ref_refection&&["Réf. Réfection",base.ref_refection],
                ["Type contrat",base.type_contrat],
                ["Projet",base.nom],
                ["Type / Nature",`${base.type} — ${base.nature}`],
                ["Client / MO",base.client_nom_saisi||clients.find(c=>c.id===+base.clientId)?.nom||"—"],
                ["Honoraires",fmtInt(hon)],
                ["Démarrage",base.date_debut],
                delaiPcDceSemaines>0&&["Délai PC & DCE",`${delaiPcDceLabel} (${delaiPcDceSemaines} sem.)`],
                datePrevPC&&["Sortie PC prévue",
                  new Date(datePrevPC).toLocaleDateString("fr-MA",{day:"2-digit",month:"long",year:"numeric"})],
              ].filter(Boolean).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",
                  padding:"4px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}>
                  <span style={{color:T.sub,flexShrink:0,marginRight:8}}>{k}</span>
                  <span style={{color:T.text,fontFamily:"'JetBrains Mono',monospace",
                    fontSize:10,textAlign:"right"}}>{v}</span>
                </div>
              ))}
            </div>

            {/* Bloc client + échéancier */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {/* Identifiant client */}
              <div style={{background:T.surface,borderRadius:8,padding:"14px 16px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                  letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>Identifiant client</div>
                {[
                  ["Type",base.client_type_id==="particulier"?"Particulier":"Société"],
                  base.client_cin&&["CIN",base.client_cin],
                  base.client_rc&&["RC",base.client_rc],
                  base.client_ice&&["ICE",base.client_ice],
                  (base.client_rep_nom||base.client_rep_prenom)&&["Représentant",`${base.client_rep_prenom} ${base.client_rep_nom}`.trim()],
                  base.client_tel1&&["Tél. 1",base.client_tel1],
                  base.client_tel2&&["Tél. 2",base.client_tel2],
                  base.client_email&&["Email",base.client_email],
                ].filter(Boolean).map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",
                    padding:"3px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}>
                    <span style={{color:T.sub,flexShrink:0,marginRight:8}}>{k}</span>
                    <span style={{color:T.text,fontFamily:"'JetBrains Mono',monospace",
                      fontSize:10,textAlign:"right"}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Échéancier */}
              <div style={{background:T.surface,borderRadius:8,padding:"14px 16px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                  letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>Échéancier</div>
                {prevEch.map(e=>(
                  <div key={e.key} style={{display:"flex",justifyContent:"space-between",
                    padding:"4px 0",borderBottom:`1px solid ${T.border}`,fontSize:11,alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:e.couleur,flexShrink:0}}/>
                      <span style={{color:T.sub,fontSize:10}}>{e.label}</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{color:T.dim,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>{e.date_paiement}</span>
                      <span style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:11,minWidth:90,textAlign:"right"}}>{fmtInt(e.montant)}</span>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,fontSize:13,fontWeight:600}}>
                  <span style={{color:T.text}}>Total HT</span>
                  <span style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace"}}>{fmtInt(hon)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Analyse rentabilité estimée */}
          <MiniRentabilite
            contrat={{...base,honoraires:hon,modalites,echeances:prevEch}}
            chargesMensuelles={(charges||[]).reduce((s,c)=>s+c.mnt,0)||28870}
            nbProjets={3}
          />
        </div>
      )}

      {/* Nav */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18,
        paddingTop:14,borderTop:`1px solid ${T.border}`}}>
        <Btn v="ghost" onClick={()=>step>1?setStep(step-1):onClose()}>
          {step>1?"← Précédent":"Annuler"}
        </Btn>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {/* Valider & Fermer — disponible dès l'étape 1 si données suffisantes */}
          {(base.nom&&hon&&base.clientId)&&(
            <Btn v="green" onClick={save}>
              ✓ Valider & fermer
            </Btn>
          )}
          {step<4
            ? <Btn onClick={()=>setStep(step+1)}>Suivant →</Btn>
            : <Btn onClick={save} disabled={!base.nom||!hon||!base.clientId}>
                ✓ {isEdit?"Enregistrer":"Créer le contrat"}
              </Btn>
          }
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE CONTRATS (RAF + ADMIN)
═══════════════════════════════════════════════════════════ */
function PageContrats({contrats, setContrats, clients, charges}) {
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail,  setDetail]  = useState(null);
  const [filtre,  setFiltre]  = useState("Tous");

  const save = c => {
    if(editing) setContrats(p=>p.map(x=>x.id===c.id?c:x));
    else        setContrats(p=>[...p,c]);
    setEditing(null);
  };

  const filtered = filtre==="Tous"?contrats:contrats.filter(c=>c.statut===filtre);

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>
            Contrats & Bons de commande
          </h2>
          <p style={{color:T.sub,fontSize:13,marginTop:3}}>
            Modalités de paiement liées aux livrables
          </p>
        </div>
        <Btn onClick={()=>{setEditing(null);setModal(true);}}>+ Nouveau contrat / BC</Btn>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {["Tous","Actif","Suspendu","Résilié","Archivé"].map(s=>(
          <button key={s} onClick={()=>setFiltre(s)} style={{
            padding:"5px 13px",borderRadius:4,fontSize:12,cursor:"pointer",
            background:filtre===s?T.gold:"transparent",
            color:filtre===s?"#08080A":T.sub,
            border:`1px solid ${filtre===s?T.gold:T.border}`,fontFamily:"'Inter',sans-serif"
          }}>{s}</button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(c=>{
          const cl    = clients.find(x=>x.id===c.clientId);
          const payé  = c.echeances?.filter(e=>e.paiement_recu).reduce((s,e)=>s+e.montant,0)||0;
          const proch = c.echeances?.find(e=>!e.livree&&e.actif);
          const nRet  = c.echeances?.filter(e=>e.retard>0).length||0;
          return (
            <div key={c.id} style={{background:T.card,border:`1px solid ${T.border}`,
              borderRadius:9,overflow:"hidden",transition:"border-color .2s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=T.borderHi}
              onMouseOut={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.goldDk}}>{c.ref_interne||c.ref}</span>
                    {c.num_bc&&<Tag c={T.blue} sm>BC {c.num_bc}</Tag>}
                    <Tag c={c.statut==="Actif"?T.green:c.statut==="Suspendu"?T.orange:T.red} sm>{c.statut}</Tag>
                    <Tag c={T.dim} sm>{c.type_contrat||"Convention"}</Tag>
                    {nRet>0&&<Tag c={T.red} sm>⚠ {nRet} retard{nRet>1?"s":""}</Tag>}
                  </div>
                  <div style={{fontSize:16,color:T.text,fontFamily:"'Inter',sans-serif",
                    fontWeight:600,marginBottom:2}}>{c.nom}</div>
                  <div style={{fontSize:12,color:T.sub}}>{cl?.nom} · {c.type}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:17,fontFamily:"'JetBrains Mono',monospace",color:T.gold,letterSpacing:"-.01em"}}>{fmt(c.honoraires)}</div>
                  <div style={{fontSize:11,color:T.green}}>Encaissé : {fmt(payé)}</div>
                  <div style={{fontSize:11,color:T.sub}}>{pct(payé,c.honoraires)} · {c.date_debut}</div>
                </div>
              </div>
              <div style={{padding:"0 18px 8px"}}>
                <MiniGantt echeances={c.echeances}/>
              </div>
              {proch&&(
                <div style={{padding:"7px 18px",background:`${T.gold}07`,
                  borderTop:`1px solid ${T.border}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div style={{fontSize:11,color:T.sub}}>
                    Prochain :&nbsp;
                    <span style={{color:proch.couleur,fontFamily:"'JetBrains Mono',monospace"}}>{proch.key}</span>
                    <span style={{color:T.text,marginLeft:4}}>— {proch.label}</span>
                    <span style={{color:T.dim,marginLeft:8}}>Livraison : {proch.date_echeance}</span>
                  </div>
                  <span style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>
                    {fmt(proch.montant)}
                  </span>
                </div>
              )}
              <div style={{padding:"9px 18px",borderTop:`1px solid ${T.border}`,
                display:"flex",gap:8,justifyContent:"flex-end"}}>
                <Btn sm v="ghost" onClick={()=>setDetail(c)}>Détail</Btn>
                <Btn sm v="blue"  onClick={()=>{setEditing(c);setModal(true);}}>Modifier</Btn>
                <Btn sm v="danger" onClick={()=>setContrats(p=>p.filter(x=>x.id!==c.id))}>Supprimer</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {modal&&(
        <FormulaireContrat contrat={editing} clients={clients} contrats={contrats} charges={charges||[]}
          onSave={save} onClose={()=>{setModal(false);setEditing(null);}}/>
      )}
      {detail&&(
        <Modal title={detail.nom} sub={`${detail.ref} · ${detail.type_contrat}`}
          onClose={()=>setDetail(null)} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            <Kpi label="Honoraires" value={fmt(detail.honoraires)} sm/>
            <Kpi label="Encaissé" value={fmt(detail.echeances?.filter(e=>e.paiement_recu).reduce((s,e)=>s+e.montant,0)||0)} accent={T.green} sm/>
          </div>
          {detail.echeances?.map((e,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"9px 13px",borderBottom:`1px solid ${T.border}`,
              background:e.paiement_recu?`${T.green}05`:e.retard>0?`${T.red}05`:"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:e.couleur}}/>
                <span style={{fontSize:12,color:T.text}}>{e.label}</span>
                <span style={{fontSize:10,color:T.dim}}>{e.pct}%</span>
              </div>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontSize:10,color:T.sub,fontFamily:"'JetBrains Mono',monospace"}}>{e.date_paiement}</span>
                <span style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{fmt(e.montant)}</span>
                {e.paiement_recu?<Tag c={T.green} sm>Payé</Tag>:e.facture_emise?<Tag c={T.orange} sm>Fact.</Tag>:<Tag c={T.blue} sm>Planifié</Tag>}
                {e.retard>0&&<Tag c={T.red} sm>+{e.retard}sem</Tag>}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE FACTURATION (RAF + ADMIN)
═══════════════════════════════════════════════════════════ */
function PageFacturation({contrats, setContrats, clients}) {
  const [preview, setPreview] = useState(null);

  const allEch = contrats.flatMap(c=>
    (c.echeances||[]).filter(e=>e.facture_emise||e.paiement_recu||e.livree).map(e=>({...e,contrat:c,client:clients.find(x=>x.id===c.clientId)}))
  );

  const marquerPayee = (contratId, phaseKey) => {
    setContrats(prev=>prev.map(c=>{
      if(c.id!==contratId) return c;
      const newMod = {...c.modalites,[phaseKey]:{...c.modalites?.[phaseKey],paiement_recu:true}};
      return {...c,modalites:newMod,echeances:mkEcheances({...c,modalites:newMod})};
    }));
  };

  // Émettre une facture individuelle
  const emettreFact = (contratId, phaseKey) => {
    setContrats(prev=>prev.map(c=>{
      if(c.id!==contratId) return c;
      const newMod = {...c.modalites,[phaseKey]:{...c.modalites?.[phaseKey],facture_emise:true}};
      return {...c,modalites:newMod,echeances:mkEcheances({...c,modalites:newMod})};
    }));
  };

  // Émettre une facture groupe (toutes les phases du même groupe)
  const emettreGroupe = (contratId, groupe) => {
    setContrats(prev=>prev.map(c=>{
      if(c.id!==contratId) return c;
      const newMod = {...c.modalites};
      (c.echeances||[]).filter(e=>e.groupe_fact===groupe).forEach(e=>{
        newMod[e.key]={...newMod[e.key],facture_emise:true};
      });
      return {...c,modalites:newMod,echeances:mkEcheances({...c,modalites:newMod})};
    }));
  };

  const totPayé  = allEch.filter(e=>e.paiement_recu).reduce((s,e)=>s+e.montant,0);
  const totFact  = allEch.filter(e=>e.facture_emise&&!e.paiement_recu).reduce((s,e)=>s+e.montant,0);

  // Phases livrées individuelles (facturable seule, non encore facturée)
  const aFacturerSolo = contrats.flatMap(c=>
    (c.echeances||[])
      .filter(e=>e.livree&&!e.facture_emise&&e.facturable&&!e.groupe_fact)
      .map(e=>({...e,contrat:c,client:clients.find(x=>x.id===c.clientId)}))
  );

  // Groupes prêts à facturer (toutes les phases du groupe livrées, aucune facturée)
  const groupesPrets = [];
  contrats.forEach(c=>{
    const cl = clients.find(x=>x.id===c.clientId);
    const groupes = [...new Set((c.echeances||[]).filter(e=>e.groupe_fact).map(e=>e.groupe_fact))];
    groupes.forEach(g=>{
      const phGrp = (c.echeances||[]).filter(e=>e.groupe_fact===g);
      const toutesLivrees = phGrp.every(e=>e.livree);
      const aucuneFacturee = phGrp.every(e=>!e.facture_emise);
      const partiellement = phGrp.some(e=>e.livree)&&!toutesLivrees;
      const montantGrp = phGrp.reduce((s,e)=>s+e.montant,0);
      if(!phGrp.every(e=>e.facture_emise)){
        groupesPrets.push({
          groupe:g, contrat:c, client:cl,
          phases:phGrp, montant:montantGrp,
          pret:toutesLivrees&&aucuneFacturee,
          partiel:partiellement,
          livrees:phGrp.filter(e=>e.livree).length,
          total:phGrp.length,
        });
      }
    });
  });

  const nbAFacturer = aFacturerSolo.length + groupesPrets.filter(g=>g.pret).length;

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{marginBottom:22}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>Facturation</h2>
        <p style={{color:T.sub,fontSize:13,marginTop:3}}>Gestion des factures · Phases individuelles & groupes de facturation</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        <Kpi label="Encaissé total" value={fmt(totPayé)} accent={T.green} sm/>
        <Kpi label="Facturé / en attente" value={fmt(totFact)} accent={T.orange} sm/>
        <Kpi label="À facturer" value={nbAFacturer} accent={T.blue}
          sub={`${fmt([...aFacturerSolo,...groupesPrets.filter(g=>g.pret)].reduce((s,e)=>s+(e.montant||0),0))}`} sm/>
      </div>

      {/* Alertes : phases individuelles à facturer */}
      {aFacturerSolo.length>0&&(
        <div style={{background:`${T.blue}0C`,border:`1px solid ${T.blue}28`,borderRadius:8,
          padding:"12px 16px",marginBottom:12}}>
          <div style={{fontSize:12,color:T.blue,fontWeight:600,marginBottom:8}}>
            📋 {aFacturerSolo.length} livrable(s) individuel(s) livré(s) — facture à émettre
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {aFacturerSolo.map((e,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                background:`${T.blue}0A`,borderRadius:6,padding:"8px 12px",flexWrap:"wrap",gap:8}}>
                <div style={{fontSize:12}}>
                  <Tag c={e.couleur} sm>{e.key}</Tag>
                  <span style={{color:T.text,marginLeft:8}}>{e.contrat.nom}</span>
                  <span style={{color:T.sub,marginLeft:8}}>· {e.client?.nom}</span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:13}}>{fmt(e.montant)}</span>
                  <Btn sm onClick={()=>emettreFact(e.contrat.id,e.key)}>Émettre facture</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groupes de facturation */}
      {groupesPrets.length>0&&(
        <div style={{background:`${T.purple}0C`,border:`1px solid ${T.purple}28`,borderRadius:8,
          padding:"12px 16px",marginBottom:18}}>
          <div style={{fontSize:12,color:T.purple,fontWeight:600,marginBottom:8}}>
            🗂 Groupes de facturation — {groupesPrets.filter(g=>g.pret).length} prêt(s) · {groupesPrets.filter(g=>g.partiel).length} en attente
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {groupesPrets.map((g,i)=>(
              <div key={i} style={{
                background:g.pret?`${T.purple}0A`:`${T.dim}08`,
                border:`1px solid ${g.pret?T.purple+"40":T.border}`,
                borderRadius:7,padding:"10px 14px"
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{background:`${T.purple}20`,color:T.purple,border:`1px solid ${T.purple}40`,
                        padding:"2px 10px",borderRadius:4,fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>
                        Groupe {g.groupe}
                      </span>
                      <span style={{fontSize:12,color:T.text}}>{g.contrat.nom}</span>
                      <span style={{fontSize:11,color:T.sub}}>· {g.client?.nom}</span>
                      {g.pret
                        ? <Tag c={T.green} sm>✓ Toutes livrées — prêt à facturer</Tag>
                        : <Tag c={T.orange} sm>⏳ {g.livrees}/{g.total} livrées</Tag>
                      }
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {g.phases.map(ph=>(
                        <div key={ph.key} style={{display:"flex",alignItems:"center",gap:4,
                          background:ph.livree?`${ph.couleur}18`:`${T.dim}10`,
                          border:`1px solid ${ph.livree?ph.couleur+"40":T.border}`,
                          borderRadius:4,padding:"2px 8px"}}>
                          <div style={{width:5,height:5,borderRadius:"50%",
                            background:ph.livree?ph.couleur:T.dim}}/>
                          <span style={{fontSize:10,color:ph.livree?ph.couleur:T.dim,
                            fontFamily:"'JetBrains Mono',monospace"}}>{ph.key}</span>
                          <span style={{fontSize:10,color:T.dim}}>{fmt(ph.montant)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:15,color:T.gold}}>
                      {fmt(g.montant)}
                    </span>
                    {g.pret&&(
                      <Btn sm v="blue" onClick={()=>emettreGroupe(g.contrat.id,g.groupe)}>
                        Émettre facture groupe
                      </Btn>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau factures */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"11px 16px",borderBottom:`1px solid ${T.border}`,fontSize:10,
          color:T.sub,fontFamily:"'JetBrains Mono',monospace",letterSpacing:".07em",
          textTransform:"uppercase"}}>
          FACTURES ÉMISES
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:T.surface}}>
                {["Contrat","Client","Phase","Montant","Date livraison","Échéance paiement","Statut","Action"]
                  .map(h=>(
                  <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:9,
                    color:T.dim,fontFamily:"'JetBrains Mono',monospace",letterSpacing:".05em",
                    borderBottom:`1px solid ${T.border}`,fontWeight:400,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allEch.map((e,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`,
                  background:e.paiement_recu?`${T.green}04`:"transparent",
                  transition:"background .15s"}}
                  onMouseOver={ev=>ev.currentTarget.style.background=`${T.borderHi}30`}
                  onMouseOut={ev=>ev.currentTarget.style.background=e.paiement_recu?`${T.green}04`:"transparent"}>
                  <td style={{padding:"9px 13px"}}>
                    <div style={{fontSize:10,color:T.goldDk,fontFamily:"'JetBrains Mono',monospace"}}>{e.contrat.ref}</div>
                    <div style={{fontSize:12,color:T.text}}>{(e.contrat.nom||"").split(" ").slice(0,3).join(" ")}</div>
                  </td>
                  <td style={{padding:"9px 13px",fontSize:12,color:T.sub}}>{e.client?.nom.split(" ").slice(0,2).join(" ")||"—"}</td>
                  <td style={{padding:"9px 13px"}}><Tag c={e.couleur}>{e.key}</Tag></td>
                  <td style={{padding:"9px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:T.gold,whiteSpace:"nowrap"}}>{fmt(e.montant)}</td>
                  <td style={{padding:"9px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.sub}}>{e.date_livraison||e.date_echeance}</td>
                  <td style={{padding:"9px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.gold}}>{e.date_paiement}</td>
                  <td style={{padding:"9px 13px"}}>
                    <Tag c={e.paiement_recu?T.green:e.facture_emise?T.orange:T.blue} sm>
                      {e.paiement_recu?"Payée":e.facture_emise?"Émise":"Livré"}
                    </Tag>
                  </td>
                  <td style={{padding:"9px 13px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <Btn sm v="ghost" onClick={()=>setPreview(e)}>Aperçu</Btn>
                      {e.facture_emise&&!e.paiement_recu&&(
                        <Btn sm v="green" onClick={()=>marquerPayee(e.contrat.id,e.key)}>✓ Payée</Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aperçu facture */}
      {preview&&(
        <Modal title="Aperçu Facture" onClose={()=>setPreview(null)} wide>
          <div style={{background:"#fff",color:"#111",padding:40,borderRadius:8,fontFamily:"'Inter',sans-serif"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:28}}>
              <div>
                <div style={{fontSize:18,fontFamily:"'Inter',sans-serif",fontWeight:600,marginBottom:4}}>
                  CABINET D'ARCHITECTURE
                </div>
                <div style={{fontSize:12,color:"#666"}}>Architecte DPLG · Membre de l'OAT</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,color:"#C8A84B",fontFamily:"monospace",fontWeight:700}}>
                  FACTURE
                </div>
                <div style={{fontSize:11,color:"#666",marginTop:4}}>{preview.contrat.ref}-{preview.key}</div>
                <div style={{fontSize:11,color:"#666"}}>Date : {today()}</div>
              </div>
            </div>
            <hr style={{border:"none",borderTop:"2px solid #C8A84B",marginBottom:22}}/>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,color:"#999",textTransform:"uppercase",letterSpacing:".1em",marginBottom:5}}>Facturé à</div>
              <div style={{fontWeight:600,fontSize:15}}>{preview.client?.nom}</div>
              <div style={{fontSize:13,color:"#555"}}>{preview.client?.contact} · {preview.client?.ville}</div>
            </div>
            <div style={{background:"#f8f8f6",borderRadius:6,padding:14,marginBottom:22}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}>
                <span style={{fontWeight:500}}>Projet</span><span style={{color:"#555"}}>{preview.contrat.nom}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                <span style={{fontWeight:500}}>Prestation</span><span style={{color:"#555"}}>{preview.label}</span>
              </div>
            </div>
            <div style={{background:"#C8A84B",borderRadius:6,padding:"14px 18px",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:600,color:"#fff",fontSize:14}}>TOTAL TTC</span>
              <span style={{fontFamily:"monospace",fontWeight:700,color:"#fff",fontSize:22}}>{fmt(preview.montant)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE TECHNIQUE — SUIVI PROJETS
   Vue liste → clic → détail phases
   ⚠ Aucune donnée financière visible
═══════════════════════════════════════════════════════════ */

// Calcule la phase active courante d'un contrat
/* ═══════════════════════════════════════════════════════════
   HELPERS TECHNIQUE
═══════════════════════════════════════════════════════════ */
const JALONS = [0, 20, 40, 60, 80, 100];

// Phases affichées dans le suivi (pas COMMANDE ni ESQ pour le suivi chantier)
const PHASES_SUIVI = ["APS","APD","PC","PRO_DCE","CHANTIER","REC_PROV","REC_DEF"];

const getPhaseActive = (c) => {
  const phases = c.echeances||[];
  return phases.find(p=>!p.livree) || phases[phases.length-1] || null;
};

const getAvancement = (c) => {
  const phases = (c.echeances||[]).filter(p=>PHASES_SUIVI.includes(p.key));
  if(!phases.length) return 0;
  return Math.round(phases.reduce((s,p)=>s+(p.avancement||0),0)/phases.length);
};

const couleurAvan = (v) => v===100?T.green:v>=60?T.teal:v>=30?T.orange:T.dim;

// Jalon selector — 6 steps
function JalonSelector({value, onChange, couleur, disabled}) {
  return (
    <div style={{display:"flex",gap:3,alignItems:"center"}}>
      {JALONS.map(j=>{
        const active = (value||0) >= j && j > 0 || (j===0 && (value||0)===0);
        const selected = (value||0) === j;
        return (
          <button key={j} onClick={()=>!disabled&&onChange(j)}
            disabled={disabled}
            title={j+"%"}
            style={{
              width: j===0||j===100 ? 28 : 24,
              height: 24,
              borderRadius: 4,
              border: selected ? `2px solid ${couleur}` : `1px solid ${(value||0)>j ? couleur+"60" : T.border}`,
              background: selected
                ? couleur
                : (value||0)>j
                  ? `${couleur}30`
                  : T.bg,
              color: selected ? "#08080A" : (value||0)>j ? couleur : T.dim,
              fontSize: 9,
              fontFamily: "'JetBrains Mono',monospace",
              fontWeight: selected ? 700 : 400,
              cursor: disabled ? "default" : "pointer",
              transition: "all .12s",
              flexShrink: 0,
            }}
            onMouseOver={e=>!disabled&&!selected&&(e.currentTarget.style.borderColor=couleur)}
            onMouseOut={e=>!disabled&&!selected&&(e.currentTarget.style.borderColor=(value||0)>j?couleur+"60":T.border)}
          >{j}</button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DETAIL PROJET
═══════════════════════════════════════════════════════════ */
function DetailProjet({contrat, onClose, onUpdate, cdpCouleur}) {
  const [noteEdit, setNoteEdit] = useState({});
  const phases = (contrat.echeances||[]).filter(p=>PHASES_SUIVI.includes(p.key));
  const av = getAvancement(contrat);

  const updatePhase = (phaseKey, updates) => onUpdate(contrat.id, phaseKey, updates);

  return (
    <div style={{animation:"fadeIn .25s ease"}}>
      {/* Retour */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onClose} style={{
          background:T.card2,border:`1px solid ${T.border}`,borderRadius:7,
          padding:"7px 14px",color:T.sub,cursor:"pointer",fontSize:12,
          fontFamily:"'JetBrains Mono',monospace",letterSpacing:".05em",
          display:"flex",alignItems:"center",gap:6,transition:"all .15s"
        }}
        onMouseOver={e=>{e.currentTarget.style.borderColor=cdpCouleur||T.teal;e.currentTarget.style.color=cdpCouleur||T.teal;}}
        onMouseOut={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.sub;}}>
          ← Liste des projets
        </button>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.sub}}>{contrat.ref}</span>
        <Tag c={T.sub} sm>{contrat.type}</Tag>
      </div>

      {/* Titre */}
      <div style={{marginBottom:20}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:19,color:T.text,fontWeight:600,marginBottom:4}}>
          {contrat.nom}
        </h2>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          <span style={{fontSize:12,color:T.sub}}>Démarrage : {contrat.date_debut}</span>
          <span style={{fontSize:12,color:T.sub}}>·</span>
          <span style={{fontSize:12,color:T.sub}}>{phases.filter(p=>p.livree).length}/{phases.length} phases livrées</span>
          <span style={{fontSize:13,color:couleurAvan(av),fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>
            {av}% global
          </span>
        </div>
        {/* Barre globale */}
        <div style={{height:5,background:T.border,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${av}%`,
            background:`linear-gradient(90deg,${cdpCouleur||T.teal},${T.green})`,
            borderRadius:3,transition:"width .6s"}}/>
        </div>
      </div>

      {/* Phases */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {phases.map((ph,i)=>{
          const livree   = ph.livree;
          const isActive = !livree && (i===0||(phases[i-1]?.livree));
          const notStarted = !livree && !isActive;
          const editingNote = noteEdit[ph.key]!==undefined;

          return (
            <div key={ph.key} style={{
              borderRadius:9,overflow:"hidden",
              border: livree
                ? `1px solid ${T.border}`
                : isActive
                  ? `1px solid ${ph.couleur}60`
                  : `1px solid ${T.border}`,
              // Grisé si livré
              opacity: livree ? 0.42 : 1,
              filter: livree ? "grayscale(0.5)" : "none",
              transition:"all .2s",
              background: livree ? T.surface : isActive ? `${ph.couleur}06` : T.card,
            }}>

              {/* Header phase */}
              <div style={{padding:"11px 16px",display:"flex",alignItems:"center",
                justifyContent:"space-between",flexWrap:"wrap",gap:10}}>

                {/* Identité */}
                <div style={{display:"flex",alignItems:"center",gap:10,flex:"1 1 180px"}}>
                  <div style={{
                    width:34,height:34,borderRadius:7,flexShrink:0,
                    background: livree ? `${T.dim}20` : `${ph.couleur}18`,
                    border: `1px solid ${livree?T.dim+"30":ph.couleur+"40"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                    color: livree ? T.dim : ph.couleur, fontWeight:600
                  }}>{ph.key.split("_")[0]}</div>

                  <div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{
                        fontSize:14,fontFamily:"'Inter',sans-serif",fontWeight:600,
                        color: livree ? T.dim : T.text,
                        textDecoration: livree ? "line-through" : "none",
                      }}>{ph.label}</span>
                      {isActive&&(
                        <span style={{fontSize:9,color:ph.couleur,
                          fontFamily:"'JetBrains Mono',monospace",
                          background:`${ph.couleur}15`,padding:"1px 7px",borderRadius:3,
                          animation:"pulse 2s infinite",letterSpacing:".06em"}}>● EN COURS</span>
                      )}
                      {livree&&<Tag c={T.dim} sm>✓ Livré {ph.date_livraison||""}</Tag>}
                      {ph.retard>0&&!livree&&<Tag c={T.red} sm>⚠ +{ph.retard}sem</Tag>}
                    </div>
                    <div style={{fontSize:10,color:T.dim,marginTop:2}}>
                      Échéance : {ph.date_echeance}
                    </div>
                  </div>
                </div>

                {/* Contrôles — masqués si livré */}
                {!livree && (
                  <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0,flexWrap:"wrap"}}>
                    {/* Jalons */}
                    <div>
                      <div style={{fontSize:8,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                        letterSpacing:".08em",textTransform:"uppercase",marginBottom:5,textAlign:"center"}}>
                        Avancement
                      </div>
                      <JalonSelector
                        value={ph.avancement||0}
                        onChange={v=>updatePhase(ph.key,{avancement:v})}
                        couleur={ph.couleur}
                        disabled={false}
                      />
                    </div>

                    {/* Retard */}
                    <div>
                      <div style={{fontSize:8,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                        letterSpacing:".08em",textTransform:"uppercase",marginBottom:5,textAlign:"center"}}>
                        Retard (sem)
                      </div>
                      <input type="number" min="0" max="52" value={ph.retard||0}
                        onChange={e=>updatePhase(ph.key,{retard:+e.target.value})}
                        style={{width:48,background:ph.retard>0?`${T.red}18`:T.bg,
                          border:`1px solid ${ph.retard>0?T.red:T.border}`,
                          borderRadius:5,padding:"5px 6px",
                          color:ph.retard>0?T.red:T.text,
                          fontSize:13,fontFamily:"'JetBrains Mono',monospace",
                          textAlign:"center",display:"block"}}/>
                    </div>

                    {/* Bouton livré */}
                    <div style={{paddingTop:16}}>
                      <button onClick={()=>updatePhase(ph.key,{
                        livree:true, date_livraison:today(), avancement:100
                      })} style={{
                        padding:"6px 14px",borderRadius:6,fontSize:12,cursor:"pointer",
                        background:`${ph.couleur}18`,color:ph.couleur,
                        border:`1px solid ${ph.couleur}50`,
                        fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap",
                        transition:"all .15s",fontWeight:500
                      }}
                      onMouseOver={e=>{e.currentTarget.style.background=`${ph.couleur}35`;}}
                      onMouseOut={e=>{e.currentTarget.style.background=`${ph.couleur}18`;}}>
                        Marquer livré ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* Si livré : bouton annuler livraison */}
                {livree && (
                  <button onClick={()=>updatePhase(ph.key,{livree:false,date_livraison:null,avancement:80})}
                    style={{padding:"4px 10px",borderRadius:4,fontSize:10,cursor:"pointer",
                      background:"transparent",color:T.dim,border:`1px solid ${T.border}`,
                      fontFamily:"'JetBrains Mono',monospace",transition:"all .15s"}}
                    onMouseOver={e=>{e.currentTarget.style.color=T.orange;e.currentTarget.style.borderColor=T.orange;}}
                    onMouseOut={e=>{e.currentTarget.style.color=T.dim;e.currentTarget.style.borderColor=T.border;}}>
                    ↩ Annuler
                  </button>
                )}
              </div>

              {/* Barre jalon visuelle — uniquement si non livré */}
              {!livree && (
                <div style={{padding:"0 16px 10px"}}>
                  <div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${ph.avancement||0}%`,
                      background:ph.couleur,borderRadius:2,transition:"width .4s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                    {JALONS.map(j=>(
                      <span key={j} style={{fontSize:8,color:(ph.avancement||0)>=j?ph.couleur:T.dim,
                        fontFamily:"'JetBrains Mono',monospace"}}>{j}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Note technique — masquée si livré */}
              {!livree && (
                <div style={{padding:"7px 16px",borderTop:`1px solid ${T.border}`,
                  background:`${T.bg}60`,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:8,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                    textTransform:"uppercase",letterSpacing:".08em",flexShrink:0}}>Note :</span>
                  {editingNote?(
                    <div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}>
                      <input autoFocus value={noteEdit[ph.key]}
                        onChange={e=>setNoteEdit(p=>({...p,[ph.key]:e.target.value}))}
                        onKeyDown={e=>{
                          if(e.key==="Enter"){updatePhase(ph.key,{notes_tech:noteEdit[ph.key]});setNoteEdit(p=>{const n={...p};delete n[ph.key];return n;});}
                          if(e.key==="Escape"){setNoteEdit(p=>{const n={...p};delete n[ph.key];return n;});}
                        }}
                        placeholder="Saisir une note..."
                        style={{flex:1,background:T.card2,border:`1px solid ${ph.couleur}50`,borderRadius:4,
                          padding:"4px 8px",color:T.text,fontSize:12,fontFamily:"'Inter',sans-serif"}}/>
                      <Btn sm v="teal" onClick={()=>{updatePhase(ph.key,{notes_tech:noteEdit[ph.key]});setNoteEdit(p=>{const n={...p};delete n[ph.key];return n;});}}>OK</Btn>
                    </div>
                  ):(
                    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                      <span onClick={()=>setNoteEdit(p=>({...p,[ph.key]:ph.notes_tech||""}))}
                        style={{fontSize:11,color:ph.notes_tech?T.sub:T.dim,
                          fontStyle:ph.notes_tech?"italic":"normal",cursor:"pointer"}}>
                        {ph.notes_tech||"Ajouter une note…"}
                      </span>
                      <button onClick={()=>setNoteEdit(p=>({...p,[ph.key]:ph.notes_tech||""}))}
                        style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:12,
                          padding:"0 3px",transition:"color .15s"}}
                        onMouseOver={e=>e.currentTarget.style.color=ph.couleur}
                        onMouseOut={e=>e.currentTarget.style.color=T.dim}>✎</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerte retards */}
      {phases.some(p=>p.retard>0&&!p.livree)&&(
        <div style={{marginTop:12,padding:"9px 14px",background:`${T.orange}0C`,
          border:`1px solid ${T.orange}30`,borderRadius:7,fontSize:12,color:T.orange}}>
          ⚡ Retards enregistrés — le RAF est notifié automatiquement dans son prévisionnel.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE TECHNIQUE — LISTE + FILTRES + DÉTAIL
═══════════════════════════════════════════════════════════ */
function PageTechnique({contrats, setContrats, roleId, roles}) {
  const [selected,   setSelected]   = useState(null);
  const [filtreType, setFiltreType] = useState("Tous");
  const [filtrePhase,setFiltrePhase]= useState("Toutes");
  const [filtreAvan, setFiltreAvan] = useState("Tous");
  const [recherche,  setRecherche]  = useState("");

  const isCdP = roles[roleId]?.isCdP;
  const cdpCouleur = roles[roleId]?.couleur || T.teal;
  const cdpNom = roles[roleId]?.label || "Service Technique";

  // Un CdP ne voit que ses projets affectés ; Admin/RAF voient tout
  const contratsFiltresParRole = isCdP
    ? contrats.filter(c=>c.cdpId===roleId)
    : contrats;

  const updatePhase = (contratId, phaseKey, updates) => {
    setContrats(prev=>prev.map(c=>{
      if(c.id!==contratId) return c;
      const newMod={...c.modalites,[phaseKey]:{...c.modalites?.[phaseKey],...updates}};
      return {...c,modalites:newMod,echeances:mkEcheances({...c,modalites:newMod})};
    }));
    setSelected(prev=>{
      if(!prev||prev.id!==contratId) return prev;
      const newMod={...prev.modalites,[phaseKey]:{...prev.modalites?.[phaseKey],...updates}};
      return {...prev,modalites:newMod,echeances:mkEcheances({...prev,modalites:newMod})};
    });
  };

  const typesDispos  = ["Tous",...new Set(contratsFiltresParRole.map(c=>c.type))];
  const avanOptions  = ["Tous","Non démarré","En cours","Avancé (>60%)","Terminé"];

  const filtres = contratsFiltresParRole.filter(c=>{
    if(c.statut==="Archivé"||c.statut==="Résilié") return false;
    if(filtreType!=="Tous"&&c.type!==filtreType) return false;
    const ph = getPhaseActive(c);
    if(filtrePhase!=="Toutes"&&ph?.key!==filtrePhase) return false;
    const av = getAvancement(c);
    if(filtreAvan==="Non démarré"&&av>0) return false;
    if(filtreAvan==="En cours"&&(av===0||av===100)) return false;
    if(filtreAvan==="Avancé (>60%)"&&(av<=60||av===100)) return false;
    if(filtreAvan==="Terminé"&&av!==100) return false;
    if(recherche&&!c.nom.toLowerCase().includes(recherche.toLowerCase())&&
       !c.ref.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  // Détail projet sélectionné
  if(selected){
    const fresh = contrats.find(c=>c.id===selected.id)||selected;
    return <DetailProjet contrat={fresh} onClose={()=>setSelected(null)} onUpdate={updatePhase} cdpCouleur={cdpCouleur}/>;
  }

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:cdpCouleur,
            boxShadow:`0 0 7px ${cdpCouleur}`,animation:"pulse 2s infinite"}}/>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:20,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>
            Suivi Technique
          </h2>
          {isCdP&&(
            <div style={{marginLeft:6,padding:"3px 11px",background:`${cdpCouleur}18`,
              border:`1px solid ${cdpCouleur}40`,borderRadius:5,
              fontSize:11,color:cdpCouleur,fontFamily:"'JetBrains Mono',monospace"}}>
              {cdpNom}
            </div>
          )}
        </div>
        <p style={{color:T.sub,fontSize:12}}>
          {isCdP
            ? `${filtres.length} projet(s) vous sont affectés · Cliquez pour accéder au détail`
            : `${filtres.length} projet(s) · Vue globale de tous les chefs de projet`
          }
        </p>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
        <Kpi label="Projets" value={contratsFiltresParRole.filter(c=>c.statut==="Actif").length} accent={cdpCouleur} sm/>
        <Kpi label="Phases actives"
          value={contratsFiltresParRole.flatMap(c=>(c.echeances||[]).filter(e=>PHASES_SUIVI.includes(e.key))).filter(e=>e.avancement>0&&e.avancement<100).length}
          accent={T.blue} sm/>
        <Kpi label="Livrés"
          value={contratsFiltresParRole.flatMap(c=>(c.echeances||[]).filter(e=>PHASES_SUIVI.includes(e.key))).filter(e=>e.livree).length}
          accent={T.green} sm/>
        <Kpi label="Retards"
          value={contratsFiltresParRole.flatMap(c=>(c.echeances||[]).filter(e=>PHASES_SUIVI.includes(e.key))).filter(e=>e.retard>0&&!e.livree).length}
          accent={T.red} sm/>
      </div>

      {/* Filtres */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:9,
        padding:"13px 15px",marginBottom:14}}>
        <input value={recherche} onChange={e=>setRecherche(e.target.value)}
          placeholder="Rechercher un projet par nom ou référence…"
          style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,
            borderRadius:6,padding:"8px 13px",color:T.text,fontSize:13,
            fontFamily:"'Inter',sans-serif",marginBottom:11,outline:"none"}}/>
        <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
          {/* Type */}
          <div>
            <div style={{fontSize:8,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>Type</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {typesDispos.map(t=>(
                <button key={t} onClick={()=>setFiltreType(t)} style={{
                  padding:"3px 10px",borderRadius:4,fontSize:11,cursor:"pointer",
                  background:filtreType===t?cdpCouleur:"transparent",
                  color:filtreType===t?"#08080A":T.sub,
                  border:`1px solid ${filtreType===t?cdpCouleur:T.border}`,
                  fontFamily:"'Inter',sans-serif",transition:"all .13s"
                }}>{t}</button>
              ))}
            </div>
          </div>
          {/* Phase active */}
          <div>
            <div style={{fontSize:8,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>Phase en cours</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {["Toutes",...PHASES_SUIVI].map(p=>{
                const def=PHASES_DEF.find(x=>x.key===p);
                return (
                  <button key={p} onClick={()=>setFiltrePhase(p)} style={{
                    padding:"3px 10px",borderRadius:4,fontSize:11,cursor:"pointer",
                    background:filtrePhase===p?(def?.couleur||cdpCouleur):"transparent",
                    color:filtrePhase===p?"#08080A":T.sub,
                    border:`1px solid ${filtrePhase===p?(def?.couleur||cdpCouleur):T.border}`,
                    fontFamily:"'JetBrains Mono',monospace",transition:"all .13s"
                  }}>{p}</button>
                );
              })}
            </div>
          </div>
          {/* Avancement */}
          <div>
            <div style={{fontSize:8,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>Avancement</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {avanOptions.map(a=>(
                <button key={a} onClick={()=>setFiltreAvan(a)} style={{
                  padding:"3px 10px",borderRadius:4,fontSize:11,cursor:"pointer",
                  background:filtreAvan===a?T.gold:"transparent",
                  color:filtreAvan===a?"#08080A":T.sub,
                  border:`1px solid ${filtreAvan===a?T.gold:T.border}`,
                  fontFamily:"'Inter',sans-serif",transition:"all .13s"
                }}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Message si CdP sans projets affectés */}
      {isCdP && contratsFiltresParRole.length===0 && (
        <div style={{textAlign:"center",padding:"48px 20px",
          background:T.card,border:`1px solid ${T.border}`,borderRadius:8}}>
          <div style={{fontSize:28,marginBottom:12}}>📋</div>
          <div style={{fontSize:14,color:T.sub,fontFamily:"'Inter',sans-serif"}}>
            Aucun projet ne vous est affecté pour le moment.
          </div>
          <div style={{fontSize:12,color:T.dim,marginTop:6}}>
            L'architecte gérant peut vous affecter des projets depuis la page Administration.
          </div>
        </div>
      )}

      {/* Liste */}
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {filtres.length===0&&contratsFiltresParRole.length>0&&(
          <div style={{textAlign:"center",padding:"36px 20px",color:T.dim,fontSize:13,
            fontFamily:"'JetBrains Mono',monospace"}}>
            Aucun projet ne correspond aux filtres
          </div>
        )}
        {filtres.map(c=>{
          const av       = getAvancement(c);
          const phAct    = getPhaseActive(c);
          const nRet     = (c.echeances||[]).filter(e=>e.retard>0&&!e.livree).length;
          const nLiv     = (c.echeances||[]).filter(e=>PHASES_SUIVI.includes(e.key)&&e.livree).length;
          const nTot     = (c.echeances||[]).filter(e=>PHASES_SUIVI.includes(e.key)).length;
          const coul     = couleurAvan(av);
          const cdpAssigne = roles[c.cdpId];

          return (
            <div key={c.id} onClick={()=>setSelected(c)} style={{
              background:T.card,border:`1px solid ${T.border}`,borderRadius:9,
              padding:"13px 17px",cursor:"pointer",transition:"all .18s",
              display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"
            }}
            onMouseOver={e=>{e.currentTarget.style.borderColor=cdpCouleur+"70";e.currentTarget.style.background=T.card2;e.currentTarget.style.transform="translateX(3px)";}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.card;e.currentTarget.style.transform="translateX(0)";}}>

              {/* Cercle avancement */}
              <div style={{width:42,height:42,borderRadius:"50%",flexShrink:0,
                background:`conic-gradient(${coul} ${av}%, ${T.border} 0)`,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:T.card,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:coul,fontWeight:600}}>
                  {av}%
                </div>
              </div>

              {/* Infos */}
              <div style={{flex:1,minWidth:150}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.sub}}>{c.ref}</span>
                  <Tag c={T.dim} sm>{c.type}</Tag>
                  {nRet>0&&<Tag c={T.red} sm>⚠ {nRet} retard{nRet>1?"s":""}</Tag>}
                  {av===100&&<Tag c={T.green} sm>✓ Terminé</Tag>}
                  {/* Badge CdP — visible pour Admin */}
                  {!isCdP&&cdpAssigne&&(
                    <span style={{fontSize:10,padding:"1px 7px",borderRadius:3,
                      background:`${cdpAssigne.couleur}18`,color:cdpAssigne.couleur,
                      border:`1px solid ${cdpAssigne.couleur}35`,
                      fontFamily:"'JetBrains Mono',monospace"}}>{cdpAssigne.label}</span>
                  )}
                  {!isCdP&&!c.cdpId&&(
                    <span style={{fontSize:10,padding:"1px 7px",borderRadius:3,
                      background:`${T.dim}18`,color:T.dim,
                      border:`1px solid ${T.dim}35`,fontFamily:"'JetBrains Mono',monospace"}}>Non affecté</span>
                  )}
                </div>
                <div style={{fontSize:15,color:T.text,fontFamily:"'Inter',sans-serif",fontWeight:600,marginBottom:2}}>
                  {c.nom}
                </div>
                <div style={{fontSize:11,color:T.dim}}>{nLiv}/{nTot} phases livrées · {c.date_debut}</div>
              </div>

              {/* Phase active badge */}
              <div style={{flexShrink:0,textAlign:"center",minWidth:100}}>
                {phAct&&(
                  <>
                    <div style={{fontSize:8,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                      letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>Phase active</div>
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,
                      background:`${phAct.couleur}15`,border:`1px solid ${phAct.couleur}40`,
                      borderRadius:5,padding:"4px 10px"}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:phAct.couleur}}/>
                      <span style={{fontSize:12,color:phAct.couleur,
                        fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>{phAct.key}</span>
                    </div>
                    <div style={{fontSize:9,color:T.dim,marginTop:2}}>{phAct.label}</div>
                  </>
                )}
              </div>

              <div style={{color:T.dim,fontSize:18,flexShrink:0}}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE ADMIN — ACCÈS + AFFECTATION PROJETS
═══════════════════════════════════════════════════════════ */
function PageAdmin({roles, setRoles, contrats, setContrats}) {
  const [editPin, setEditPin] = useState({});
  const [editNom, setEditNom] = useState({});
  const [onglet, setOnglet]   = useState("acces"); // "acces" | "affectation"

  const cdps = Object.values(roles).filter(r=>r.isCdP);

  const affecter = (contratId, cdpId) => {
    setContrats(prev=>prev.map(c=>c.id===contratId?{...c,cdpId:cdpId||null}:c));
  };

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{marginBottom:20}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>
          Administration
        </h2>
        <p style={{color:T.sub,fontSize:13,marginTop:3}}>Gestion des accès · Affectation des projets</p>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:0,marginBottom:22,borderRadius:7,
        overflow:"hidden",border:`1px solid ${T.border}`,width:"fit-content"}}>
        {[{id:"acces",label:"Profils & PINs"},{id:"affectation",label:"Affectation projets"}].map(o=>(
          <button key={o.id} onClick={()=>setOnglet(o.id)} style={{
            padding:"9px 22px",background:onglet===o.id?T.gold:T.surface,
            color:onglet===o.id?"#08080A":T.sub,border:"none",
            borderRight:o.id==="acces"?`1px solid ${T.border}`:"none",
            cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",
            fontWeight:onglet===o.id?600:400,transition:"all .15s"
          }}>{o.label}</button>
        ))}
      </div>

      {/* ─── ONGLET ACCÈS ─── */}
      {onglet==="acces"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {Object.values(roles).map(r=>(
            <div key={r.id} style={{background:T.card,border:`1px solid ${T.border}`,
              borderRadius:9,padding:"16px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                flexWrap:"wrap",gap:12}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:40,height:40,borderRadius:9,background:`${r.couleur}18`,
                    border:`1px solid ${r.couleur}40`,display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:18,color:r.couleur}}>{r.icon}</div>
                  <div>
                    {/* Nom éditable pour les CdP */}
                    {r.isCdP ? (
                      editNom[r.id]!==undefined ? (
                        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4}}>
                          <input value={editNom[r.id]}
                            onChange={e=>setEditNom(p=>({...p,[r.id]:e.target.value}))}
                            style={{background:T.bg,border:`1px solid ${r.couleur}50`,borderRadius:4,
                              padding:"4px 8px",color:T.text,fontSize:13,fontFamily:"'Inter',sans-serif",width:180}}/>
                          <Btn sm v="green" onClick={()=>{
                            setRoles(p=>({...p,[r.id]:{...p[r.id],label:editNom[r.id],nom:editNom[r.id]}}));
                            setEditNom(p=>{const n={...p};delete n[r.id];return n;});
                          }}>OK</Btn>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4}}>
                          <span style={{fontSize:14,fontFamily:"'Inter',sans-serif",fontWeight:600,color:T.text}}>{r.label}</span>
                          <button onClick={()=>setEditNom(p=>({...p,[r.id]:r.label}))}
                            style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:11}}
                            onMouseOver={e=>e.currentTarget.style.color=r.couleur}
                            onMouseOut={e=>e.currentTarget.style.color=T.dim}>✎</button>
                        </div>
                      )
                    ):(
                      <div style={{fontSize:14,fontFamily:"'Inter',sans-serif",fontWeight:600,
                        color:T.text,marginBottom:4}}>{r.label}</div>
                    )}
                    <div style={{fontSize:11,color:T.sub}}>{r.desc}</div>
                    {r.isCdP&&(
                      <div style={{fontSize:10,color:T.dim,marginTop:3}}>
                        {contrats.filter(c=>c.cdpId===r.id).length} projet(s) affecté(s)
                      </div>
                    )}
                  </div>
                </div>

                {/* PIN */}
                <div>
                  <div style={{fontSize:8,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                    letterSpacing:".08em",textTransform:"uppercase",marginBottom:4}}>Code PIN</div>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    <input type="password" maxLength={4}
                      value={editPin[r.id]!==undefined?editPin[r.id]:r.pin}
                      onChange={e=>setEditPin(p=>({...p,[r.id]:e.target.value.replace(/\D/g,"").slice(0,4)}))}
                      style={{width:65,background:T.bg,border:`1px solid ${r.couleur}50`,
                        borderRadius:5,padding:"6px 9px",color:r.couleur,
                        fontSize:16,fontFamily:"'JetBrains Mono',monospace",
                        textAlign:"center",letterSpacing:".2em"}}/>
                    {editPin[r.id]!==undefined&&editPin[r.id]!==r.pin&&(
                      <Btn sm v="green" onClick={()=>{
                        setRoles(p=>({...p,[r.id]:{...p[r.id],pin:editPin[r.id]}}));
                        setEditPin(p=>{const n={...p};delete n[r.id];return n;});
                      }}>Sauver</Btn>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── ONGLET AFFECTATION ─── */}
      {onglet==="affectation"&&(
        <div>
          <div style={{background:`${T.gold}0C`,border:`1px solid ${T.gold}25`,borderRadius:7,
            padding:"10px 14px",marginBottom:16,fontSize:12,color:T.sub}}>
            ℹ Affectez chaque projet à un chef de projet. Ce dernier n'aura accès qu'à ses projets lors de sa connexion.
          </div>

          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
            {/* Header */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 160px 160px",gap:10,
              padding:"9px 16px",background:T.card2,borderBottom:`1px solid ${T.border}`}}>
              {["Projet","Statut","Chef de projet affecté"].map(h=>(
                <div key={h} style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
                  letterSpacing:".06em",textTransform:"uppercase"}}>{h}</div>
              ))}
            </div>

            {contrats.filter(c=>c.statut!=="Archivé"&&c.statut!=="Résilié").map((c,i,arr)=>{
              const cdpActuel = roles[c.cdpId];
              return (
                <div key={c.id} style={{
                  display:"grid",gridTemplateColumns:"1fr 160px 160px",gap:10,
                  padding:"11px 16px",
                  borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none",
                  alignItems:"center",transition:"background .15s"
                }}
                onMouseOver={e=>e.currentTarget.style.background=T.card2}
                onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{fontSize:10,color:T.goldDk,fontFamily:"'JetBrains Mono',monospace"}}>{c.ref}</div>
                    <div style={{fontSize:13,color:T.text,fontFamily:"'Inter',sans-serif",fontWeight:600}}>{c.nom}</div>
                    <div style={{fontSize:11,color:T.dim}}>{c.type}</div>
                  </div>
                  <div>
                    <Tag c={c.statut==="Actif"?T.green:T.orange} sm>{c.statut}</Tag>
                  </div>
                  <div>
                    <select value={c.cdpId||""}
                      onChange={e=>affecter(c.id,e.target.value||null)}
                      style={{width:"100%",background:T.surface,border:`1px solid ${cdpActuel?cdpActuel.couleur+"60":T.border}`,
                        borderRadius:5,padding:"6px 9px",
                        color:cdpActuel?cdpActuel.couleur:T.sub,
                        fontSize:12,fontFamily:"'Inter',sans-serif",cursor:"pointer"}}>
                      <option value="">— Non affecté —</option>
                      {cdps.map(r=>(
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Note architecture */}
      <div style={{background:`${T.gold}0A`,border:`1px solid ${T.gold}20`,borderRadius:7,
        padding:"12px 16px",marginTop:20,fontSize:12,color:T.sub,lineHeight:1.7}}>
        <strong style={{color:T.gold}}>Cloisonnement des données</strong> — Chaque chef de projet ne voit
        que ses projets affectés. Les retards saisis remontent automatiquement au RAF (prévisionnel)
        et à l'Architecte (dashboard) sans exposer les données financières au service technique.
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   MOTEUR DE CALCUL RENTABILITÉ
═══════════════════════════════════════════════════════════ */

// Phases études actives (hors chantier) pour durée projet
const PHASES_ETUDES = ["COMMANDE","ESQ","APS","APD","PC","PRO_DCE"];
const PHASES_TOTALES = ["COMMANDE","ESQ","APS","APD","PC","PRO_DCE","CHANTIER","REC_PROV","REC_DEF"];

function calcRentabilite(contrat, chargesMensuelles, nbProjetsActifs) {
  const modalites = contrat.modalites || {};
  const honoraires = contrat.honoraires || 0;

  // Durée totale projet en semaines (toutes phases)
  const semTotales = PHASES_TOTALES.reduce((s, key) => {
    const m = modalites[key];
    if(!m || m.actif === false) return s;
    return s + (+m.duree||0) + (+m.retard||0);
  }, 0);

  // Durée études PC+DCE
  const semEtudes = PHASES_ETUDES.reduce((s, key) => {
    const m = modalites[key];
    if(!m || m.actif === false) return s;
    return s + (+m.duree||0) + (+m.retard||0);
  }, 0);

  const moisTotal  = semTotales / 4.33;
  const moisEtudes = semEtudes  / 4.33;

  // ① RBM — Rendement Brut Mensuel
  const rbm = moisEtudes > 0 ? honoraires / moisEtudes : 0;

  // Seuil de couverture = part des charges cabinet sur durée études
  const partCharges = chargesMensuelles * moisEtudes * (1 / Math.max(nbProjetsActifs, 1));
  const seuilCouverture = chargesMensuelles / Math.max(nbProjetsActifs, 1);

  // ② TRP — Taux de Rentabilité Projet
  const chargesImputablees = chargesMensuelles * moisTotal / Math.max(nbProjetsActifs, 1);
  const margeNette = honoraires - chargesImputablees;
  const trp = honoraires > 0 ? (margeNette / honoraires) * 100 : 0;

  // ③ ICP — Indice de Couverture (honoraires / mois vs seuil)
  const icp = seuilCouverture > 0 ? rbm / seuilCouverture : 0;

  // Encaissé à date
  const encaisse = (contrat.echeances||[]).filter(e=>e.paiement_recu).reduce((s,e)=>s+e.montant,0);
  // Théorique à date selon planning
  const todayStr = new Date().toISOString().split("T")[0];
  const theorique = (contrat.echeances||[])
    .filter(e => e.date_paiement && e.date_paiement <= todayStr)
    .reduce((s,e) => s+e.montant, 0);
  const icpReel = theorique > 0 ? encaisse / theorique : null;

  // Feu tricolore
  const feu = trp >= 40 ? "vert" : trp >= 20 ? "orange" : "rouge";

  return {
    honoraires, moisTotal, moisEtudes, semTotales, semEtudes,
    rbm, seuilCouverture, partCharges, chargesImputablees,
    margeNette, trp, icp, icpReel, encaisse, theorique, feu
  };
}

/* ═══════════════════════════════════════════════════════════
   BADGE FEU TRICOLORE
═══════════════════════════════════════════════════════════ */
const FeuBadge = ({feu, trp}) => {
  const map = {
    vert:   {c:T.green,  label:"Rentable",    icon:"●"},
    orange: {c:T.orange, label:"Limite",       icon:"●"},
    rouge:  {c:T.red,    label:"Non rentable", icon:"●"},
  };
  const m = map[feu]||map.rouge;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,
      background:`${m.c}15`,border:`1px solid ${m.c}40`,
      borderRadius:5,padding:"3px 10px"}}>
      <span style={{color:m.c,fontSize:12}}>{m.icon}</span>
      <span style={{color:m.c,fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>
        {m.label}
      </span>
      <span style={{color:m.c,fontSize:10,opacity:.8}}>
        {trp.toFixed(0)}%
      </span>
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   MINI-BLOC RENTABILITÉ (dans formulaire contrat step 4)
═══════════════════════════════════════════════════════════ */
function MiniRentabilite({contrat, chargesMensuelles, nbProjets}) {
  const r = calcRentabilite(contrat, chargesMensuelles, nbProjets);
  if(!r.moisTotal) return null;

  return (
    <div style={{background:`${T.card2}`,border:`1px solid ${T.border}`,
      borderRadius:8,padding:"14px 16px",marginTop:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:10,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
          letterSpacing:".1em",textTransform:"uppercase"}}>Analyse de rentabilité estimée</span>
        <FeuBadge feu={r.feu} trp={r.trp}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[
          {l:"Rendement brut / mois",      v:fmtInt(r.rbm),              sub:"honoraires ÷ durée études", c:T.gold},
          {l:"Seuil couverture / mois",     v:fmtInt(r.seuilCouverture),  sub:"charges ÷ nb projets actifs",c:T.sub},
          {l:"Marge nette estimée",         v:fmtInt(r.margeNette),       sub:`TRP : ${r.trp.toFixed(1)}%`, c:r.trp>=40?T.green:r.trp>=20?T.orange:T.red},
        ].map(x=>(
          <div key={x.l} style={{background:T.surface,borderRadius:6,padding:"10px 12px",
            borderLeft:`3px solid ${x.c}`}}>
            <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".08em",textTransform:"uppercase",marginBottom:5}}>{x.l}</div>
            <div style={{fontSize:17,fontFamily:"'Inter',sans-serif",fontWeight:700,
              color:x.c,lineHeight:1}}>{x.v}</div>
            <div style={{fontSize:9,color:T.dim,marginTop:3}}>{x.sub}</div>
          </div>
        ))}
      </div>
      {r.icp > 0 && (
        <div style={{marginTop:10,padding:"6px 10px",background:`${r.icp>=1?T.green:T.red}0C`,
          border:`1px solid ${r.icp>=1?T.green:T.red}25`,borderRadius:5,fontSize:11,
          color:r.icp>=1?T.green:T.red,display:"flex",justifyContent:"space-between"}}>
          <span>Indice de couverture (RBM ÷ seuil)</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>
            {r.icp.toFixed(2)} {r.icp>=1?"✓ au-dessus du seuil":"⚠ en-dessous du seuil"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE RENTABILITÉ & PERFORMANCE
═══════════════════════════════════════════════════════════ */
function PageRentabilite({contrats, charges, roles}) {
  const chargesMensuelles = charges.reduce((s,c)=>s+c.mnt, 0);
  const projetsActifs = contrats.filter(c=>c.statut==="Actif").length || 1;
  const [sortBy, setSortBy] = useState("trp");
  const [filtre, setFiltre] = useState("Tous");

  const analyses = contrats
    .filter(c => c.statut!=="Archivé")
    .map(c => ({
      contrat: c,
      ...calcRentabilite(c, chargesMensuelles, projetsActifs),
    }))
    .sort((a,b) => sortBy==="trp" ? b.trp-a.trp :
                   sortBy==="rbm" ? b.rbm-a.rbm :
                   sortBy==="icp" ? (b.icpReel||0)-(a.icpReel||0) : 0);

  const filtered = filtre==="Tous" ? analyses :
    filtre==="Rentable"     ? analyses.filter(a=>a.feu==="vert") :
    filtre==="Limite"       ? analyses.filter(a=>a.feu==="orange") :
    analyses.filter(a=>a.feu==="rouge");

  // Stats globales
  const totalHon  = analyses.reduce((s,a)=>s+a.honoraires, 0);
  const moyRBM    = analyses.length ? analyses.reduce((s,a)=>s+a.rbm,0)/analyses.length : 0;
  const moyTRP    = analyses.length ? analyses.reduce((s,a)=>s+a.trp,0)/analyses.length : 0;
  const nRentable = analyses.filter(a=>a.feu==="vert").length;
  const nLimite   = analyses.filter(a=>a.feu==="orange").length;
  const nRouge    = analyses.filter(a=>a.feu==="rouge").length;

  // Performance par CdP
  const cdps = Object.values(roles).filter(r=>r.isCdP);
  const perfCdP = cdps.map(cdp => {
    const projCdP = analyses.filter(a=>a.contrat.cdpId===cdp.id);
    const moyICP  = projCdP.filter(a=>a.icpReel!==null).length > 0
      ? projCdP.filter(a=>a.icpReel!==null).reduce((s,a)=>s+(a.icpReel||0),0)
        / projCdP.filter(a=>a.icpReel!==null).length
      : null;
    const moyTRPcdp = projCdP.length ? projCdP.reduce((s,a)=>s+a.trp,0)/projCdP.length : 0;
    return {cdp, projCdP, moyICP, moyTRPcdp, nProjets:projCdP.length};
  }).filter(p=>p.nProjets>0);

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{marginBottom:20}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>
          Rentabilité & Performance
        </h2>
        <p style={{color:T.sub,fontSize:13,marginTop:3}}>
          Analyse automatique basée sur les honoraires, délais et charges du cabinet
        </p>
      </div>

      {/* KPIs globaux */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Portfolio",           v:fmtInt(totalHon),          a:T.gold},
          {l:"RBM moyen",           v:fmtInt(moyRBM),            a:T.blue,   s:"rendement / mois études"},
          {l:"TRP moyen",           v:`${moyTRP.toFixed(1)}%`,   a:moyTRP>=40?T.green:moyTRP>=20?T.orange:T.red, s:"marge nette estimée"},
          {l:"Seuil couverture",    v:fmtInt(chargesMensuelles/projetsActifs), a:T.sub, s:"charges ÷ projets actifs"},
          {l:"Projets rentables",   v:`${nRentable} / ${analyses.length}`,a:T.green, s:`${nLimite} limite · ${nRouge} non rentable`},
        ].map(k=>(
          <div key={k.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,
            padding:"14px 18px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:k.a}}/>
            <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>{k.l}</div>
            <div style={{fontSize:20,fontFamily:"'Inter',sans-serif",fontWeight:700,
              color:T.text,lineHeight:1}}>{k.v}</div>
            {k.s&&<div style={{fontSize:10,color:T.sub,marginTop:4}}>{k.s}</div>}
          </div>
        ))}
      </div>

      {/* Légende seuils */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,
        padding:"12px 18px",marginBottom:18,display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,color:T.sub,fontFamily:"'JetBrains Mono',monospace"}}>Seuils TRP :</span>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {[
            {c:T.green, l:"Rentable", v:"TRP ≥ 40%"},
            {c:T.orange,l:"Limite",   v:"20% ≤ TRP < 40%"},
            {c:T.red,   l:"Non rentable", v:"TRP < 20%"},
          ].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:x.c}}/>
              <span style={{fontSize:11,color:x.c,fontFamily:"'JetBrains Mono',monospace"}}>{x.l}</span>
              <span style={{fontSize:10,color:T.dim}}>{x.v}</span>
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:T.dim}}>
              ICP ≥ 1 = encaissements dans les temps · ICP &lt; 1 = retard financier
            </span>
          </div>
        </div>
      </div>

      {/* Filtres + tri */}
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:6}}>
          {["Tous","Rentable","Limite","Non rentable"].map(f=>(
            <button key={f} onClick={()=>setFiltre(f)} style={{
              padding:"4px 12px",borderRadius:4,fontSize:11,cursor:"pointer",
              background:filtre===f?T.gold:"transparent",
              color:filtre===f?"#08080A":T.sub,
              border:`1px solid ${filtre===f?T.gold:T.border}`,
              fontFamily:"'Inter',sans-serif",transition:"all .13s"
            }}>{f}</button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:10,color:T.dim,fontFamily:"'JetBrains Mono',monospace"}}>Trier par :</span>
          {[{v:"trp",l:"TRP"},{v:"rbm",l:"RBM"},{v:"icp",l:"ICP réel"}].map(s=>(
            <button key={s.v} onClick={()=>setSortBy(s.v)} style={{
              padding:"3px 10px",borderRadius:4,fontSize:11,cursor:"pointer",
              background:sortBy===s.v?`${T.blue}25`:"transparent",
              color:sortBy===s.v?T.blue:T.sub,
              border:`1px solid ${sortBy===s.v?T.blue+"50":T.border}`,
              fontFamily:"'JetBrains Mono',monospace",transition:"all .13s"
            }}>{s.l}</button>
          ))}
        </div>
      </div>

      {/* Tableau des projets */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,
        overflow:"hidden",marginBottom:20}}>
        <div style={{display:"grid",
          gridTemplateColumns:"2fr 90px 100px 100px 100px 100px 90px",
          gap:8,padding:"9px 16px",background:T.card2,borderBottom:`1px solid ${T.border}`}}>
          {["Projet","Durée (mois)","Honoraires","RBM (DH/mois)","Seuil couverture","TRP (marge %)","ICP réel"].map((h,i)=>(
            <div key={i} style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".05em",lineHeight:1.3}}>{h}</div>
          ))}
        </div>
        {filtered.map((a,i)=>{
          const cdp = roles[a.contrat.cdpId];
          const icpColor = a.icpReel===null ? T.dim : a.icpReel>=1 ? T.green : T.red;
          return (
            <div key={a.contrat.id} style={{
              display:"grid",
              gridTemplateColumns:"2fr 90px 100px 100px 100px 100px 90px",
              gap:8,padding:"11px 16px",
              borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none",
              background:i%2===0?"transparent":`${T.border}18`,
              alignItems:"center",transition:"background .15s"
            }}
            onMouseOver={e=>e.currentTarget.style.background=`${T.borderHi}30`}
            onMouseOut={e=>e.currentTarget.style.background=i%2===0?"transparent":`${T.border}18`}>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:9,color:T.goldDk,fontFamily:"'JetBrains Mono',monospace"}}>
                    {a.contrat.ref_interne||a.contrat.ref}
                  </span>
                  <FeuBadge feu={a.feu} trp={a.trp}/>
                  {cdp&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:3,
                    background:`${cdp.couleur}18`,color:cdp.couleur,
                    border:`1px solid ${cdp.couleur}30`,fontFamily:"'JetBrains Mono',monospace"}}>{cdp.label}</span>}
                </div>
                <div style={{fontSize:14,color:T.text,fontFamily:"'Inter',sans-serif",fontWeight:600}}>
                  {a.contrat.nom}
                </div>
                <div style={{fontSize:11,color:T.dim}}>{a.contrat.type} · {a.contrat.nature||""}</div>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.sub,textAlign:"center"}}>
                {a.moisTotal>0?`${a.moisTotal.toFixed(1)} m`:"—"}
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.gold}}>
                {fmtInt(a.honoraires)}
              </div>
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                  color:a.rbm>=a.seuilCouverture?T.green:T.red,fontWeight:600}}>
                  {fmtInt(a.rbm)}
                </div>
                <div style={{fontSize:9,color:T.dim,marginTop:1}}>
                  {a.rbm>=a.seuilCouverture?"▲ au-dessus seuil":"▼ en-dessous seuil"}
                </div>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.sub}}>
                {fmtInt(a.seuilCouverture)}
              </div>
              <div>
                <div style={{
                  height:5,background:T.border,borderRadius:3,overflow:"hidden",marginBottom:3,width:"100%"}}>
                  <div style={{height:"100%",
                    width:`${Math.min(Math.max(a.trp,0),100)}%`,
                    background:a.trp>=40?T.green:a.trp>=20?T.orange:T.red,
                    borderRadius:3,transition:"width .4s"}}/>
                </div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                  color:a.trp>=40?T.green:a.trp>=20?T.orange:T.red,fontWeight:600}}>
                  {a.trp.toFixed(1)}%
                </span>
              </div>
              <div style={{textAlign:"center"}}>
                {a.icpReel!==null ? (
                  <div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                      color:icpColor,fontWeight:600}}>{a.icpReel.toFixed(2)}</div>
                    <div style={{fontSize:9,color:icpColor,marginTop:1}}>
                      {a.icpReel>=1?"✓ dans les temps":"⚠ retard"}
                    </div>
                  </div>
                ) : (
                  <span style={{fontSize:10,color:T.dim,fontFamily:"'JetBrains Mono',monospace"}}>N/D</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance par Chef de Projet */}
      {perfCdP.length > 0 && (
        <div>
          <div style={{fontSize:10,color:T.sub,fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:".09em",textTransform:"uppercase",marginBottom:12,
            paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
            Performance par Chef de Projet
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
            {perfCdP.map(p=>{
              const coulCdP = p.cdp.couleur||T.teal;
              const icpColor = p.moyICP===null?T.dim:p.moyICP>=1?T.green:T.red;
              return (
                <div key={p.cdp.id} style={{background:T.card,border:`1px solid ${T.border}`,
                  borderRadius:9,padding:"16px 18px",
                  borderTop:`3px solid ${coulCdP}`}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
                    <div style={{width:32,height:32,borderRadius:7,
                      background:`${coulCdP}18`,border:`1px solid ${coulCdP}40`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:14,color:coulCdP}}>◈</div>
                    <div>
                      <div style={{fontSize:13,color:T.text,fontFamily:"'Inter',sans-serif",fontWeight:600}}>
                        {p.cdp.label}
                      </div>
                      <div style={{fontSize:10,color:T.dim}}>{p.nProjets} projet{p.nProjets>1?"s":""}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      padding:"7px 10px",background:T.surface,borderRadius:5}}>
                      <span style={{fontSize:11,color:T.sub}}>TRP moyen</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                        color:p.moyTRPcdp>=40?T.green:p.moyTRPcdp>=20?T.orange:T.red,fontWeight:600}}>
                        {p.moyTRPcdp.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",
                      padding:"7px 10px",background:T.surface,borderRadius:5}}>
                      <span style={{fontSize:11,color:T.sub}}>ICP moyen</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                        color:icpColor,fontWeight:600}}>
                        {p.moyICP!==null ? p.moyICP.toFixed(2) : "—"}
                        {p.moyICP!==null&&(
                          <span style={{fontSize:9,marginLeft:5,opacity:.8}}>
                            {p.moyICP>=1?"✓":"⚠"}
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Mini barre TRP */}
                    <div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",
                        width:`${Math.min(Math.max(p.moyTRPcdp,0),100)}%`,
                        background:p.moyTRPcdp>=40?T.green:p.moyTRPcdp>=20?T.orange:T.red,
                        borderRadius:2,transition:"width .5s"}}/>
                    </div>
                    <FeuBadge
                      feu={p.moyTRPcdp>=40?"vert":p.moyTRPcdp>=20?"orange":"rouge"}
                      trp={p.moyTRPcdp}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE PRÉVISIONNEL
═══════════════════════════════════════════════════════════ */
function PagePrevisionnel({contrats, charges}) {
  const allEch = contrats.flatMap(c=>(c.echeances||[]).map(e=>({...e,cNom:c.nom,cRef:c.ref_interne||c.ref})))
    .sort((a,b)=>(a.date_paiement||"").localeCompare(b.date_paiement||""));
  const chargeM = charges.reduce((s,c)=>s+c.mnt,0);

  const cfByM={};
  allEch.forEach(e=>{
    const m=e.date_paiement?.slice(0,7); if(!m) return;
    if(!cfByM[m]) cfByM[m]={prevu:0,reel:0};
    cfByM[m].prevu+=e.montant;
    if(e.paiement_recu) cfByM[m].reel+=e.montant;
  });
  let cumP=0,cumR=0;
  const cfData=Object.keys(cfByM).sort().slice(0,18).map(m=>{
    cumP+=cfByM[m].prevu; cumR+=cfByM[m].reel;
    return {
      label:new Date(m+"-01").toLocaleDateString("fr-MA",{month:"short",year:"2-digit"}),
      prevu:cfByM[m].prevu, reel:cfByM[m].reel,
      cum_prevu:cumP, cum_reel:cumR, charges:chargeM
    };
  });

  const payé    = allEch.filter(e=>e.paiement_recu).reduce((s,e)=>s+e.montant,0);
  const attent  = allEch.filter(e=>e.facture_emise&&!e.paiement_recu).reduce((s,e)=>s+e.montant,0);
  const retardA = allEch.filter(e=>e.retard>0&&!e.paiement_recu).reduce((s,e)=>s+e.montant,0);
  const planifié= allEch.filter(e=>!e.facture_emise&&!e.paiement_recu).reduce((s,e)=>s+e.montant,0);

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{marginBottom:22}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>Prévisionnel Financier</h2>
        <p style={{color:T.sub,fontSize:13,marginTop:3}}>Généré automatiquement depuis les contrats & livrables</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Encaissé",a:T.green,v:fmt(payé)},
          {l:"En attente paiement",a:T.orange,v:fmt(attent)},
          {l:"Impact retards",a:T.red,v:fmt(retardA)},
          {l:"À venir planifié",a:T.blue,v:fmt(planifié)},
        ].map(k=>(
          <div key={k.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,
            padding:"14px 18px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:k.a}}/>
            <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>{k.l}</div>
            <div style={{fontSize:20,fontFamily:"'Inter',sans-serif",fontWeight:700,color:T.text}}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"16px 13px",marginBottom:16}}>
        <div style={{fontSize:10,color:T.sub,fontFamily:"'JetBrains Mono',monospace",
          letterSpacing:".07em",textTransform:"uppercase",marginBottom:13}}>
          CASHFLOW MENSUEL PRÉVU vs RÉEL
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={cfData}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="label" tick={{fill:T.sub,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis yAxisId="l" tickFormatter={fmtK} tick={{fill:T.sub,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis yAxisId="r" orientation="right" tickFormatter={fmtK} tick={{fill:T.sub,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.border}`,borderRadius:6}}
              formatter={(v,n)=>[fmt(v),n]}/>
            <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:10,color:T.sub}}/>
            <Bar yAxisId="l" dataKey="prevu" name="Prévu" fill={`${T.gold}50`} radius={[2,2,0,0]}/>
            <Bar yAxisId="l" dataKey="reel" name="Encaissé" fill={T.green} radius={[2,2,0,0]}/>
            <Line yAxisId="r" type="monotone" dataKey="cum_prevu" name="Cumulé prévu" stroke={T.blue} strokeWidth={2} dot={false} strokeDasharray="5 3"/>
            <Line yAxisId="r" type="monotone" dataKey="cum_reel" name="Cumulé réel" stroke={T.gold} strokeWidth={2} dot={false}/>
            <Line yAxisId="l" type="monotone" dataKey="charges" name="Charges" stroke={T.red} strokeWidth={1.5} strokeDasharray="3 2" dot={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"11px 16px",borderBottom:`1px solid ${T.border}`,fontSize:10,color:T.sub,
          fontFamily:"'JetBrains Mono',monospace",letterSpacing:".07em",textTransform:"uppercase"}}>
          ÉCHÉANCIER COMPLET
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:T.surface}}>
                {["Contrat","Phase","Livraison","Paiement prévu","Montant","Statut","Dérive"].map(h=>(
                  <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:9,color:T.dim,
                    fontFamily:"'JetBrains Mono',monospace",letterSpacing:".05em",
                    borderBottom:`1px solid ${T.border}`,fontWeight:400,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allEch.map((e,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`,
                  background:e.paiement_recu?`${T.green}04`:e.retard>0?`${T.red}06`:"transparent"}}>
                  <td style={{padding:"9px 13px"}}>
                    <div style={{fontSize:9,color:T.goldDk,fontFamily:"'JetBrains Mono',monospace"}}>{e.cRef}</div>
                    <div style={{fontSize:12,color:T.text}}>{e.cNom?.split(" ").slice(0,3).join(" ")}</div>
                  </td>
                  <td style={{padding:"9px 13px"}}><Tag c={e.couleur}>{e.key}</Tag></td>
                  <td style={{padding:"9px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.sub}}>{e.date_echeance}</td>
                  <td style={{padding:"9px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.gold}}>{e.date_paiement}</td>
                  <td style={{padding:"9px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.gold,whiteSpace:"nowrap"}}>{fmt(e.montant)}</td>
                  <td style={{padding:"9px 13px"}}>
                    <Tag c={e.paiement_recu?T.green:e.facture_emise?T.orange:e.retard>0?T.red:T.blue} sm>
                      {e.paiement_recu?"Payé":e.facture_emise?"Facturé":e.retard>0?"Retard":"Planifié"}
                    </Tag>
                  </td>
                  <td style={{padding:"9px 13px",fontFamily:"'JetBrains Mono',monospace",
                    fontSize:10,color:e.retard>0?T.red:T.dim}}>
                    {e.retard>0?`+${e.retard} sem.`:"—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE CLIENTS
═══════════════════════════════════════════════════════════ */
function PageClients({clients, setClients, contrats}) {
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({nom:"",contact:"",email:"",tel:"",ville:"",type:"Promoteur"});
  const COLS={Promoteur:T.gold,Public:T.blue,Privé:T.teal,Institutionnel:T.purple};

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>Clients</h2>
          <p style={{color:T.sub,fontSize:13,marginTop:3}}>{clients.length} maîtres d'ouvrage</p>
        </div>
        <Btn onClick={()=>setModal(true)}>+ Nouveau client</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {clients.map(c=>{
          const nC  = contrats.filter(x=>x.clientId===c.id).length;
          const ca  = contrats.filter(x=>x.clientId===c.id)
            .flatMap(x=>x.echeances||[]).filter(e=>e.paiement_recu).reduce((s,e)=>s+e.montant,0);
          const col = COLS[c.type]||T.gold;
          return (
            <div key={c.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:17,
              transition:"border-color .2s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=col}
              onMouseOut={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:11}}>
                <div style={{width:38,height:38,background:`${col}18`,border:`1px solid ${col}35`,
                  borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,color:col,fontFamily:"'Inter',sans-serif",fontWeight:700}}>
                  {(c.nom||"?").charAt(0)}
                </div>
                <Tag c={col}>{c.type}</Tag>
              </div>
              <div style={{fontSize:15,color:T.text,fontFamily:"'Inter',sans-serif",fontWeight:600,marginBottom:2}}>{c.nom}</div>
              <div style={{fontSize:12,color:T.sub,marginBottom:8}}>{c.contact} · {c.ville}</div>
              <div style={{fontSize:11,color:T.dim,marginBottom:2}}>{c.email}</div>
              <div style={{fontSize:11,color:T.dim,marginBottom:13}}>{c.tel}</div>
              <div style={{display:"flex",gap:14,paddingTop:11,borderTop:`1px solid ${T.border}`}}>
                <div>
                  <div style={{fontSize:18,fontFamily:"'JetBrains Mono',monospace",color:T.gold}}>{nC}</div>
                  <div style={{fontSize:10,color:T.dim}}>contrats</div>
                </div>
                <div>
                  <div style={{fontSize:15,fontFamily:"'JetBrains Mono',monospace",color:T.green}}>{fmt(ca)}</div>
                  <div style={{fontSize:10,color:T.dim}}>CA encaissé</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {modal&&(
        <Modal title="Nouveau client" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 14px"}}>
            <Inp label="Raison sociale" value={form.nom} onChange={v=>setForm({...form,nom:v})}/>
            <Inp label="Contact" value={form.contact} onChange={v=>setForm({...form,contact:v})}/>
            <Inp label="Email" type="email" value={form.email} onChange={v=>setForm({...form,email:v})} half/>
            <Inp label="Téléphone" value={form.tel} onChange={v=>setForm({...form,tel:v})} half/>
            <Inp label="Ville" value={form.ville} onChange={v=>setForm({...form,ville:v})} half/>
            <Inp label="Type" value={form.type} onChange={v=>setForm({...form,type:v})}
              opts={["Promoteur","Privé","Public","Institutionnel"]} half/>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn v="ghost" onClick={()=>setModal(false)}>Annuler</Btn>
            <Btn onClick={()=>{setClients(p=>[...p,{...form,id:nid(),code:`CLI-${String(p.length+1).padStart(3,"0")}`}]);setModal(false);}}
              disabled={!form.nom}>Créer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE CHARGES
═══════════════════════════════════════════════════════════ */
function PageCharges({charges, setCharges}) {
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({cat:"",mnt:"",per:"Mensuel",desc:""});
  const total   = charges.reduce((s,c)=>s+c.mnt,0);
  const parCat  = Object.entries(
    charges.reduce((acc,c)=>{acc[c.cat]=(acc[c.cat]||0)+c.mnt;return acc;},{})
  ).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:22,color:T.text,fontWeight:600,letterSpacing:'-.01em'}}>Charges</h2>
          <p style={{color:T.sub,fontSize:13,marginTop:3}}>Charges fixes & variables du cabinet</p>
        </div>
        <Btn onClick={()=>setModal(true)}>+ Ajouter</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {[
          {l:"Charges mensuelles",v:fmt(total),       a:T.red},
          {l:"Charges annuelles", v:fmt(total*12),    a:T.orange},
        ].map(k=>(
          <div key={k.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,
            padding:"14px 18px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:k.a}}/>
            <div style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>{k.l}</div>
            <div style={{fontSize:18,fontFamily:"'Inter',sans-serif",fontWeight:600,color:T.text}}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
          {charges.map((c,i)=>(
            <div key={c.id} style={{padding:"12px 16px",
              borderBottom:i<charges.length-1?`1px solid ${T.border}`:"none",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,color:T.text}}>{c.cat}</div>
                <div style={{fontSize:11,color:T.dim}}>{c.desc} · {c.per}</div>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",color:T.red,fontSize:14}}>{fmt(c.mnt)}</div>
            </div>
          ))}
        </div>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 12px"}}>
          <div style={{fontSize:10,color:T.sub,fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:".07em",textTransform:"uppercase",marginBottom:12}}>RÉPARTITION</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={parCat} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
              <XAxis type="number" tickFormatter={fmtK} tick={{fill:T.sub,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:T.sub,fontSize:10}} width={85} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.border}`,borderRadius:6}}
                formatter={v=>[fmt(v)]}/>
              <Bar dataKey="value" fill={T.red} radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {modal&&(
        <Modal title="Ajouter une charge" onClose={()=>setModal(false)}>
          <Inp label="Catégorie" value={form.cat} onChange={v=>setForm({...form,cat:v})}/>
          <Inp label="Montant (DH)" type="number" value={form.mnt} onChange={v=>setForm({...form,mnt:v})}/>
          <Inp label="Périodicité" value={form.per} onChange={v=>setForm({...form,per:v})}
            opts={["Mensuel","Trimestriel","Annuel","Ponctuel"]}/>
          <Inp label="Description" value={form.desc} onChange={v=>setForm({...form,desc:v})}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn v="ghost" onClick={()=>setModal(false)}>Annuler</Btn>
            <Btn onClick={()=>{setCharges(p=>[...p,{...form,id:nid(),mnt:+form.mnt}]);setModal(false);}}
              disabled={!form.cat}>Ajouter</Btn>
          </div>
        </Modal>
      )}
    </div>

    {/* ── Modal modifications non sauvegardées ── */}
    {showUnsavedAlert && (
      <div style={{
        position:"fixed", inset:0, zIndex:9999,
        background:"rgba(0,0,0,0.7)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"1rem",
      }}>
        <div style={{
          background:"#17171B", border:"1px solid #3A3A46",
          borderRadius:"12px", padding:"2rem",
          width:"100%", maxWidth:"420px",
        }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:"6px",
            background:"rgba(241,107,107,0.15)", color:"#F16B6B",
            borderRadius:"6px", padding:"4px 10px",
            fontSize:"12px", fontWeight:500, marginBottom:"1rem",
          }}>
            ⚠ Modifications non enregistrées
          </div>
          <h2 style={{fontSize:"16px", fontWeight:500, color:"#F5F4F9", margin:"0 0 0.5rem"}}>
            Quitter sans enregistrer ?
          </h2>
          <p style={{fontSize:"14px", color:"#9090A8", margin:"0 0 1.5rem", lineHeight:1.6}}>
            Vous avez des modifications en cours. Si vous quittez maintenant, ces changements seront perdus.
          </p>
          <div style={{display:"flex", gap:"10px", justifyContent:"flex-end"}}>
            <button
              onClick={() => setShowUnsavedAlert(false)}
              style={{
                padding:"9px 18px", borderRadius:"8px",
                border:"1px solid #26262E", background:"transparent",
                color:"#9090A8", fontSize:"14px", cursor:"pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={() => { setShowUnsavedAlert(false); setHasUnsaved(false); handleLogout(); }}
              style={{
                padding:"9px 18px", borderRadius:"8px",
                border:"none", background:"rgba(241,107,107,0.15)",
                color:"#F16B6B", fontSize:"14px", fontWeight:500,
                cursor:"pointer",
              }}
            >
              Quitter sans enregistrer
            </button>
          </div>
        </div>
      </div>
    )}
  );
}