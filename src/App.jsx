// ============================================================
// ArcERP — Cabinet d'Architecture BAQILI
// App.jsx — Version avec Supabase intégré
// Supabase: https://siizcpwfwcyjomcjqvfl.supabase.co
// ============================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart, Area
} from "recharts";

// ─── Supabase ────────────────────────────────────────────────
const SUPABASE_URL = "https://siizcpwfwcyjomcjqvfl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaXpjcHdmd2N5am9tY2pxdmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjA1MzYyMDgwMH0.REPLACE_WITH_YOUR_REAL_ANON_KEY";

// ⚠️  Remplace la valeur de SUPABASE_ANON_KEY ci-dessus par ta vraie clé
// publique (anon key) depuis : Supabase Dashboard → Settings → API → anon public

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Helpers ────────────────────────────────────────────────
const DH = (n) =>
  new Intl.NumberFormat("fr-MA", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0) + " DH";

const addWeeks = (date, weeks) => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
};

const diffWeeks = (d1, d2) => {
  const ms = new Date(d2) - new Date(d1);
  return Math.round(ms / (7 * 24 * 3600 * 1000));
};

const today = () => new Date().toISOString().split("T")[0];

// Phase labels
const PHASES = [
  { key: "commande",       label: "À la Commande",         short: "CMD"  },
  { key: "esq",            label: "ESQ",                   short: "ESQ"  },
  { key: "aps",            label: "APS",                   short: "APS"  },
  { key: "apd",            label: "APD",                   short: "APD"  },
  { key: "pc",             label: "PC",                    short: "PC"   },
  { key: "pro_dce",        label: "PRO / DCE",             short: "DCE"  },
  { key: "suivi_chantier", label: "Suivi mensuel chantier", short: "SUV"  },
  { key: "rp",             label: "Réception provisoire",  short: "RP"   },
  { key: "rd",             label: "Réception définitive",  short: "RD"   },
];

const DEFAULT_MODALITES = () =>
  PHASES.reduce((acc, p) => {
    acc[p.key] = {
      actif: true,
      pct: 0,
      duree: 2,
      retard: 0,
      retard_valide: false,
      date_livraison: null,
      livree: false,
      facture_emise: false,
      paiement_recu: false,
      facturable: true,
      groupe_fact: "A",
      libelle_fact: p.label,
      avancement: 0,
      notes_tech: "",
    };
  }, {});

const DEFAULT_CONTRAT = () => ({
  id: null,
  ref_interne: "",
  ref_client: "",
  ref_bc: "",
  ref_rokhas: "",
  ref_pc: "",
  ref_refection: "",
  nom: "",
  type_contrat: "Marché",
  type_projet: "Résidentiel",
  nature_travaux: "Nouvelle construction",
  statut: "En cours",
  honoraires: 0,
  delai_paiement: 30,
  date_signature: today(),
  date_debut: today(),
  client_type: "particulier",
  client_cin: "",
  client_rc: "",
  client_ice: "",
  client_rep_nom: "",
  client_rep_prenom: "",
  tel1: "",
  tel2: "",
  email: "",
  infos: "",
  notes: "",
  cdp_id: null,
  modalites: DEFAULT_MODALITES(),
});

// Calcul de l'échéancier
const mkEcheances = (contrat) => {
  const m = contrat.modalites || {};
  const phases = [];
  let cursor = new Date(contrat.date_debut || today());

  for (const p of PHASES) {
    const mo = m[p.key];
    if (!mo || !mo.actif) continue;
    const montant = ((mo.pct || 0) / 100) * (contrat.honoraires || 0);
    const dureeTotal = (mo.duree || 0) + (mo.retard || 0);
    const dateEcheance = new Date(cursor);
    dateEcheance.setDate(dateEcheance.getDate() + dureeTotal * 7);
    const datePaiement = new Date(dateEcheance);
    datePaiement.setDate(
      datePaiement.getDate() + (contrat.delai_paiement || 30)
    );

    phases.push({
      key: p.key,
      label: p.label,
      short: p.short,
      pct: mo.pct || 0,
      montant,
      duree: mo.duree || 0,
      retard: mo.retard || 0,
      dateDebut: cursor.toISOString().split("T")[0],
      dateEcheance: dateEcheance.toISOString().split("T")[0],
      datePaiement: datePaiement.toISOString().split("T")[0],
      livree: mo.livree || false,
      date_livraison: mo.date_livraison,
      facture_emise: mo.facture_emise || false,
      paiement_recu: mo.paiement_recu || false,
      facturable: mo.facturable !== false,
      groupe_fact: mo.groupe_fact || "A",
      avancement: mo.avancement || 0,
      notes_tech: mo.notes_tech || "",
    });

    // cursor avance de la durée planifiée (sans retard pour la phase suivante)
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + (mo.duree || 0) * 7);
  }
  return phases;
};

// ─── RÔLES par défaut ────────────────────────────────────────
const DEFAULT_ROLES = [
  { id: "admin", label: "Architecte / Admin", pin: "0000", couleur: "#c8a96e", tabs: ["dashboard","contrats","facturation","previsionnel","rentabilite","clients","charges","rh","admin"] },
  { id: "raf",   label: "RAF",                pin: "1234", couleur: "#7eb8c9", tabs: ["dashboard","contrats","facturation","previsionnel","rentabilite","clients","charges"] },
  { id: "cdp1",  label: "Chef de Projet 1",   pin: "1111", couleur: "#a9c47e", tabs: ["technique"], isCdP: true },
  { id: "cdp2",  label: "Chef de Projet 2",   pin: "2222", couleur: "#a9c47e", tabs: ["technique"], isCdP: true },
  { id: "cdp3",  label: "Chef de Projet 3",   pin: "3333", couleur: "#a9c47e", tabs: ["technique"], isCdP: true },
  { id: "cdp4",  label: "Chef de Projet 4",   pin: "4444", couleur: "#a9c47e", tabs: ["technique"], isCdP: true },
];

// ─── Palette ─────────────────────────────────────────────────
const C = {
  bg:      "#0e0f11",
  surface: "#16181c",
  card:    "#1c1f25",
  border:  "#2a2d35",
  gold:    "#c8a96e",
  blue:    "#7eb8c9",
  green:   "#6db88a",
  red:     "#c97070",
  orange:  "#c9a070",
  text:    "#e8e6e0",
  muted:   "#6b6f7a",
};

// ─── CSS global ──────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; background: ${C.bg}; color: ${C.text}; font-family: 'Inter', sans-serif; font-size: 14px; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: ${C.bg}; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
    input, select, textarea { background: ${C.surface}; border: 1px solid ${C.border}; color: ${C.text}; border-radius: 6px; padding: 7px 10px; font-family: inherit; font-size: 13px; outline: none; width: 100%; }
    input:focus, select:focus, textarea:focus { border-color: ${C.gold}; }
    button { cursor: pointer; font-family: inherit; font-size: 13px; border: none; border-radius: 6px; padding: 7px 14px; transition: opacity .15s, transform .1s; }
    button:hover { opacity: .85; }
    button:active { transform: scale(.97); }
    label { font-size: 12px; color: ${C.muted}; display: block; margin-bottom: 4px; }
    h1 { font-size: 20px; font-weight: 700; letter-spacing: -.3px; }
    h2 { font-size: 16px; font-weight: 600; }
    h3 { font-size: 13px; font-weight: 600; color: ${C.muted}; text-transform: uppercase; letter-spacing: .8px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; color: ${C.muted}; text-transform: uppercase; letter-spacing: .6px; padding: 8px 10px; border-bottom: 1px solid ${C.border}; }
    td { padding: 8px 10px; border-bottom: 1px solid ${C.border}22; font-size: 13px; }
    tr:hover td { background: ${C.card}; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .tag-en-cours { background: ${C.gold}22; color: ${C.gold}; }
    .tag-livre    { background: ${C.green}22; color: ${C.green}; }
    .tag-retard   { background: ${C.red}22; color: ${C.red}; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  `}</style>
);

// ─── Composants UI ────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style, disabled }) => {
  const bg = variant === "primary" ? C.gold
           : variant === "danger"  ? C.red
           : variant === "ghost"   ? "transparent"
           : C.surface;
  const color = variant === "primary" ? "#0e0f11" : C.text;
  const border = variant === "ghost" ? `1px solid ${C.border}` : "none";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: bg, color, border, fontWeight: 600, opacity: disabled ? .4 : 1, ...style }}>
      {children}
    </button>
  );
};

const KPI = ({ label, value, sub, color }) => (
  <Card style={{ flex: 1, minWidth: 140 }}>
    <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: color || C.gold }}>{value}</div>
    {sub && <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{sub}</div>}
  </Card>
);

const FRow = ({ label, children, half }) => (
  <div style={{ marginBottom: 14, width: half ? "calc(50% - 6px)" : "100%" }}>
    <label>{label}</label>
    {children}
  </div>
);

const FormGrid = ({ children }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{children}</div>
);

const LoadingSpinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 16 }}>
    <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.gold}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    <div style={{ color: C.muted }}>Connexion à Supabase…</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const bg = type === "error" ? C.red : type === "warning" ? C.orange : C.green;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, background: bg, color: "#fff",
      padding: "12px 20px", borderRadius: 8, fontWeight: 600, zIndex: 9999,
      boxShadow: "0 4px 20px rgba(0,0,0,.5)", maxWidth: 340, fontSize: 13
    }}>
      {msg}
      <button onClick={onClose} style={{ background: "none", color: "#fff", marginLeft: 12, padding: 0, fontWeight: 700 }}>✕</button>
    </div>
  );
};

// ─── LOGIN ───────────────────────────────────────────────────
const LoginScreen = ({ roles, onLogin }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const tryLogin = () => {
    const role = roles.find((r) => r.pin === pin);
    if (role) { onLogin(role); setError(""); }
    else { setError("PIN incorrect"); setPin(""); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at 30% 20%, ${C.gold}08 0%, transparent 60%)`
    }}>
      <div style={{ textAlign: "center", maxWidth: 340 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>◻</div>
        <h1 style={{ color: C.gold, marginBottom: 4 }}>BAQILI ERP</h1>
        <div style={{ color: C.muted, marginBottom: 40, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>
          Cabinet d'Architecture
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
            <button key={i}
              onClick={() => {
                if (k === "⌫") setPin(p => p.slice(0,-1));
                else if (k !== "") setPin(p => (p + k).slice(0, 4));
              }}
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text,
                       padding: "14px 0", fontSize: 18, fontWeight: 600, borderRadius: 8,
                       opacity: k === "" ? 0 : 1, pointerEvents: k === "" ? "none" : "auto" }}>
              {k}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%",
              background: pin.length > i ? C.gold : C.border, transition: "background .2s" }} />
          ))}
        </div>
        {error && <div style={{ color: C.red, marginBottom: 12, fontSize: 13 }}>{error}</div>}
        <Btn onClick={tryLogin} style={{ width: "100%", padding: "11px 0" }} disabled={pin.length !== 4}>
          Connexion →
        </Btn>
      </div>
    </div>
  );
};

// ─── SIDEBAR ─────────────────────────────────────────────────
const TABS_META = {
  dashboard:    { icon: "⬡", label: "Dashboard"    },
  contrats:     { icon: "◈", label: "Contrats"     },
  technique:    { icon: "◎", label: "Technique"    },
  facturation:  { icon: "◇", label: "Facturation"  },
  previsionnel: { icon: "◫", label: "Prévisionnel" },
  rentabilite:  { icon: "◉", label: "Rentabilité"  },
  clients:      { icon: "◐", label: "Clients"      },
  charges:      { icon: "◳", label: "Charges"      },
  rh:           { icon: "◑", label: "RH"           },
  admin:        { icon: "⬢", label: "Admin"        },
};

const Sidebar = ({ role, activeTab, setTab, onLogout }) => (
  <div style={{
    width: 200, minHeight: "100vh", background: C.surface,
    borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column",
    position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100
  }}>
    <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ color: C.gold, fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>BAQILI ERP</div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{role.label}</div>
    </div>
    <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
      {role.tabs.map((t) => {
        const m = TABS_META[t];
        if (!m) return null;
        const active = activeTab === t;
        return (
          <button key={t} onClick={() => setTab(t)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 12px", borderRadius: 7, marginBottom: 2,
              background: active ? `${C.gold}18` : "transparent",
              border: active ? `1px solid ${C.gold}40` : "1px solid transparent",
              color: active ? C.gold : C.muted, fontWeight: active ? 600 : 400,
              textAlign: "left", fontSize: 13
            }}>
            <span style={{ fontSize: 16 }}>{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </nav>
    <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
      <Btn variant="ghost" onClick={onLogout} style={{ width: "100%", fontSize: 12, color: C.muted }}>
        ⎋ Déconnexion
      </Btn>
    </div>
  </div>
);

// ─── PAGE WRAPPER ─────────────────────────────────────────────
const Page = ({ title, action, children }) => (
  <div style={{ maxWidth: 1200, margin: "0 auto" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <h1>{title}</h1>
      {action}
    </div>
    {children}
  </div>
);

// ─── DASHBOARD ────────────────────────────────────────────────
const Dashboard = ({ contrats, charges }) => {
  const totalHonoraires = contrats.reduce((s, c) => s + (c.honoraires || 0), 0);
  const encaisse = contrats.reduce((s, c) => {
    const ech = mkEcheances(c);
    return s + ech.filter(e => e.paiement_recu).reduce((a, e) => a + e.montant, 0);
  }, 0);
  const factureEnAttente = contrats.reduce((s, c) => {
    const ech = mkEcheances(c);
    return s + ech.filter(e => e.facture_emise && !e.paiement_recu).reduce((a, e) => a + e.montant, 0);
  }, 0);
  const chargesTotal = charges.reduce((s, c) => s + (c.mnt || 0), 0);
  const retards = contrats.filter(c =>
    Object.values(c.modalites || {}).some(m => (m.retard || 0) > 0)
  ).length;

  // Cashflow mensuel (3 mois)
  const cfData = [];
  for (let i = -1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const m = d.toLocaleString("fr-FR", { month: "short", year: "2-digit" });
    const prev = contrats.reduce((s, c) => {
      const ech = mkEcheances(c);
      return s + ech.filter(e => {
        const ep = new Date(e.datePaiement);
        return ep.getMonth() === d.getMonth() && ep.getFullYear() === d.getFullYear();
      }).reduce((a, e) => a + e.montant, 0);
    }, 0);
    cfData.push({ m, prev, charges: chargesTotal });
  }

  return (
    <Page title="Dashboard">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KPI label="Portfolio actif" value={`${contrats.length} projets`} sub={DH(totalHonoraires)} />
        <KPI label="Encaissé" value={DH(encaisse)} color={C.green} />
        <KPI label="Facturé en attente" value={DH(factureEnAttente)} color={C.orange} />
        <KPI label="Charges / mois" value={DH(chargesTotal)} color={C.red} />
        <KPI label="Projets en retard" value={retards} color={retards > 0 ? C.red : C.green} />
      </div>
      <Card>
        <h2 style={{ marginBottom: 16 }}>Cashflow prévisionnel</h2>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={cfData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="m" stroke={C.muted} />
            <YAxis stroke={C.muted} tickFormatter={v => Math.round(v/1000)+"k"} />
            <Tooltip formatter={v => DH(v)} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="prev" name="Encaissements prév." fill={C.gold} radius={[4,4,0,0]} />
            <Line dataKey="charges" name="Charges fixes" stroke={C.red} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </Page>
  );
};

// ─── CONTRATS LIST ────────────────────────────────────────────
const ContratsList = ({ contrats, roles, onSelect, onCreate }) => {
  const [search, setSearch] = useState("");
  const filtered = contrats.filter(c =>
    (c.nom || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.ref_interne || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Page title="Contrats" action={<Btn onClick={onCreate}>+ Nouveau contrat</Btn>}>
      <Card style={{ marginBottom: 16 }}>
        <input placeholder="Rechercher par nom ou référence…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </Card>
      <Card>
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Projet</th>
              <th>Client</th>
              <th>Type</th>
              <th>Honoraires</th>
              <th>Statut</th>
              <th>Chef de projet</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: C.muted, padding: 32 }}>
                Aucun contrat — cliquez sur "+ Nouveau contrat"
              </td></tr>
            )}
            {filtered.map(c => {
              const cdp = roles.find(r => r.id === c.cdp_id);
              return (
                <tr key={c.id} onClick={() => onSelect(c)} style={{ cursor: "pointer" }}>
                  <td style={{ color: C.gold, fontFamily: "monospace" }}>{c.ref_interne}</td>
                  <td style={{ fontWeight: 600 }}>{c.nom}</td>
                  <td style={{ color: C.muted }}>{c.client_rep_nom} {c.client_rep_prenom}</td>
                  <td><span className="badge" style={{ background: `${C.blue}22`, color: C.blue }}>{c.type_projet}</span></td>
                  <td style={{ fontFamily: "monospace" }}>{DH(c.honoraires)}</td>
                  <td><span className={`badge tag-${c.statut === "En cours" ? "en-cours" : c.statut === "Terminé" ? "livre" : "retard"}`}>{c.statut}</span></td>
                  <td style={{ color: C.muted }}>{cdp?.label || "Non affecté"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </Page>
  );
};

// ─── FORMULAIRE CONTRAT (4 étapes) ───────────────────────────
const ContratForm = ({ initial, roles, onSave, onCancel, totalContrats }) => {
  const isNew = !initial?.id;
  const nextNum = String(totalContrats + 1).padStart(2, "0");
  const year = new Date().getFullYear();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    if (initial) return { ...DEFAULT_CONTRAT(), ...initial, modalites: { ...DEFAULT_MODALITES(), ...(initial.modalites || {}) } };
    return { ...DEFAULT_CONTRAT(), ref_interne: `C-BAQ-${nextNum}/${year}` };
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setM = (phase, key, val) =>
    setForm(f => ({ ...f, modalites: { ...f.modalites, [phase]: { ...f.modalites[phase], [key]: val } } }));

  const totalPct = PHASES.reduce((s, p) => s + (form.modalites[p.key]?.pct || 0), 0);
  const echeances = useMemo(() => mkEcheances(form), [form]);

  // calcul date PC auto
  const datePrevPC = useMemo(() => {
    const phasesBeforePC = ["commande","esq","aps","apd","pc"];
    let d = new Date(form.date_debut || today());
    for (const k of phasesBeforePC) {
      const m = form.modalites[k];
      if (m?.actif) d.setDate(d.getDate() + (m.duree || 0) * 7);
    }
    return d.toISOString().split("T")[0];
  }, [form]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const StepNav = () => (
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      {[1,2,3,4].map(s => (
        <button key={s} onClick={() => setStep(s)}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 6, fontWeight: 600, fontSize: 12,
            background: step === s ? C.gold : C.surface,
            color: step === s ? "#0e0f11" : C.muted,
            border: `1px solid ${step === s ? C.gold : C.border}`
          }}>
          {s === 1 ? "Identification" : s === 2 ? "Modalités" : s === 3 ? "Planning" : "Récap"}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn variant="ghost" onClick={onCancel}>← Retour</Btn>
        <h1>{isNew ? "Nouveau contrat" : `Modifier — ${form.ref_interne}`}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "✓ Valider & Enregistrer"}
          </Btn>
        </div>
      </div>

      <StepNav />

      {/* ÉTAPE 1 — Identification */}
      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <h3 style={{ marginBottom: 16 }}>Références dossier</h3>
            <FormGrid>
              <FRow label="Réf. interne" half><input value={form.ref_interne} onChange={e => set("ref_interne", e.target.value)} /></FRow>
              <FRow label="Réf. client" half><input value={form.ref_client} onChange={e => set("ref_client", e.target.value)} /></FRow>
              <FRow label="Réf. BC" half><input value={form.ref_bc} onChange={e => set("ref_bc", e.target.value)} /></FRow>
              <FRow label="Réf. ROKHAS" half><input value={form.ref_rokhas} onChange={e => set("ref_rokhas", e.target.value)} /></FRow>
              <FRow label="Réf. PC" half><input value={form.ref_pc} onChange={e => set("ref_pc", e.target.value)} /></FRow>
              <FRow label="Réf. Permis Réfection" half><input value={form.ref_refection} onChange={e => set("ref_refection", e.target.value)} /></FRow>
              <FRow label="Intitulé projet">
                <input value={form.nom} onChange={e => set("nom", e.target.value)} placeholder="Nom du projet" />
              </FRow>
            </FormGrid>
          </Card>
          <Card>
            <h3 style={{ marginBottom: 16 }}>Qualification</h3>
            <FormGrid>
              <FRow label="Type de contrat" half>
                <select value={form.type_contrat} onChange={e => set("type_contrat", e.target.value)}>
                  {["Marché","Bon de commande","Lettre de commande","Convention"].map(v => <option key={v}>{v}</option>)}
                </select>
              </FRow>
              <FRow label="Statut" half>
                <select value={form.statut} onChange={e => set("statut", e.target.value)}>
                  {["En cours","Terminé","Suspendu","Résilié"].map(v => <option key={v}>{v}</option>)}
                </select>
              </FRow>
              <FRow label="Type de projet" half>
                <select value={form.type_projet} onChange={e => set("type_projet", e.target.value)}>
                  {["Résidentiel","Bureaux","Commercial","Industriel","Hôtelier","Sport","Culturel","Éducation","Santé","Association","Aménagement urbain","Autre"].map(v => <option key={v}>{v}</option>)}
                </select>
              </FRow>
              <FRow label="Nature des travaux" half>
                <select value={form.nature_travaux} onChange={e => set("nature_travaux", e.target.value)}>
                  {["Nouvelle construction","Aménagement","Surélévation","Extension","Rénovation","Réhabilitation"].map(v => <option key={v}>{v}</option>)}
                </select>
              </FRow>
              <FRow label="Honoraires HT (DH)">
                <input type="number" value={form.honoraires} onChange={e => set("honoraires", +e.target.value)} />
              </FRow>
              <FRow label="Délai émission facture (jours)" half>
                <input type="number" value={form.delai_paiement} onChange={e => set("delai_paiement", +e.target.value)} />
              </FRow>
              <FRow label="Date signature" half><input type="date" value={form.date_signature} onChange={e => set("date_signature", e.target.value)} /></FRow>
              <FRow label="Date démarrage" half><input type="date" value={form.date_debut} onChange={e => set("date_debut", e.target.value)} /></FRow>
              <FRow label="Date prévisionnelle PC (calculée)" half>
                <input value={datePrevPC} readOnly style={{ color: C.gold, cursor: "default" }} />
              </FRow>
            </FormGrid>
          </Card>
          <Card style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ marginBottom: 16 }}>Identifiant client</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              {["particulier","société"].map(t => (
                <button key={t} onClick={() => set("client_type", t)}
                  style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: form.client_type === t ? C.gold : C.surface,
                    color: form.client_type === t ? "#0e0f11" : C.muted,
                    border: `1px solid ${form.client_type === t ? C.gold : C.border}` }}>
                  {t === "particulier" ? "Particulier" : "Société"}
                </button>
              ))}
            </div>
            <FormGrid>
              {form.client_type === "particulier"
                ? <FRow label="CIN" half><input value={form.client_cin} onChange={e => set("client_cin", e.target.value)} /></FRow>
                : <>
                    <FRow label="RC" half><input value={form.client_rc} onChange={e => set("client_rc", e.target.value)} /></FRow>
                    <FRow label="ICE" half><input value={form.client_ice} onChange={e => set("client_ice", e.target.value)} /></FRow>
                  </>}
              <FRow label="Nom représentant" half><input value={form.client_rep_nom} onChange={e => set("client_rep_nom", e.target.value)} /></FRow>
              <FRow label="Prénom représentant" half><input value={form.client_rep_prenom} onChange={e => set("client_rep_prenom", e.target.value)} /></FRow>
              <FRow label="Tél 1" half><input value={form.tel1} onChange={e => set("tel1", e.target.value)} /></FRow>
              <FRow label="Tél 2" half><input value={form.tel2} onChange={e => set("tel2", e.target.value)} /></FRow>
              <FRow label="Email" half><input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></FRow>
              <FRow label="Informations libres"><textarea value={form.infos} onChange={e => set("infos", e.target.value)} rows={2} /></FRow>
            </FormGrid>
          </Card>
        </div>
      )}

      {/* ÉTAPE 2 — Modalités de paiement */}
      {step === 2 && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2>Modalités de paiement</h2>
            <span style={{ color: totalPct === 100 ? C.green : C.red, fontWeight: 700, fontSize: 13 }}>
              Total : {totalPct}% {totalPct !== 100 && "⚠ doit être égal à 100%"}
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{width:30}}>Actif</th>
                <th>Phase</th>
                <th style={{width:70}}>%</th>
                <th style={{width:110}}>Montant</th>
                <th style={{width:80}}>Durée (sem.)</th>
                <th style={{width:80}}>Groupe fact.</th>
                <th style={{width:80}}>Facturable</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map(p => {
                const m = form.modalites[p.key];
                const montant = ((m.pct || 0) / 100) * (form.honoraires || 0);
                return (
                  <tr key={p.key}>
                    <td>
                      <input type="checkbox" checked={m.actif} onChange={e => setM(p.key, "actif", e.target.checked)} style={{ width: "auto" }} />
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.label}</td>
                    <td>
                      <input type="number" value={m.pct} min={0} max={100} style={{ width: 60 }}
                        onChange={e => setM(p.key, "pct", +e.target.value)} />
                    </td>
                    <td style={{ fontFamily: "monospace", color: C.gold }}>{DH(montant)}</td>
                    <td>
                      <input type="number" value={m.duree} min={0} style={{ width: 70 }}
                        onChange={e => setM(p.key, "duree", +e.target.value)} />
                    </td>
                    <td>
                      <select value={m.groupe_fact} onChange={e => setM(p.key, "groupe_fact", e.target.value)} style={{ width: 70 }}>
                        {["A","B","C","D","E"].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="checkbox" checked={m.facturable} onChange={e => setM(p.key, "facturable", e.target.checked)} style={{ width: "auto" }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ÉTAPE 3 — Planning */}
      {step === 3 && (
        <Card>
          <h2 style={{ marginBottom: 16 }}>Planning & Livraisons</h2>
          <table>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Date échéance prévue</th>
                <th>Date paiement prév.</th>
                <th>Retard (sem.)</th>
                <th>Livré</th>
                <th>Date livraison réelle</th>
                <th>Avancement %</th>
              </tr>
            </thead>
            <tbody>
              {echeances.map(e => (
                <tr key={e.key} style={{ opacity: e.livree ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{e.label}</td>
                  <td style={{ fontFamily: "monospace" }}>{e.dateEcheance}</td>
                  <td style={{ fontFamily: "monospace", color: C.gold }}>{e.datePaiement}</td>
                  <td>
                    <input type="number" value={form.modalites[e.key]?.retard || 0} min={0} style={{ width: 60 }}
                      onChange={v => setM(e.key, "retard", +v.target.value)} />
                  </td>
                  <td>
                    <input type="checkbox" checked={form.modalites[e.key]?.livree || false} style={{ width: "auto" }}
                      onChange={v => setM(e.key, "livree", v.target.checked)} />
                  </td>
                  <td>
                    <input type="date" value={form.modalites[e.key]?.date_livraison || ""}
                      onChange={v => setM(e.key, "date_livraison", v.target.value)} />
                  </td>
                  <td>
                    <select value={form.modalites[e.key]?.avancement || 0} style={{ width: 80 }}
                      onChange={v => setM(e.key, "avancement", +v.target.value)}>
                      {[0,20,40,60,80,100].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ÉTAPE 4 — Récapitulatif */}
      {step === 4 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <h3 style={{ marginBottom: 12 }}>Identité projet</h3>
            {[
              ["Référence interne", form.ref_interne],
              ["Intitulé", form.nom],
              ["Type", form.type_projet],
              ["Nature", form.nature_travaux],
              ["Honoraires HT", DH(form.honoraires)],
              ["Date démarrage", form.date_debut],
              ["Date prévisionnelle PC", datePrevPC],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ color: C.muted }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </Card>
          <Card>
            <h3 style={{ marginBottom: 12 }}>Échéancier récap</h3>
            {echeances.filter(e => e.pct > 0).map(e => (
              <div key={e.key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 12 }}>
                <span style={{ color: C.muted }}>{e.label} ({e.pct}%)</span>
                <span style={{ fontFamily: "monospace", color: C.gold }}>{DH(e.montant)}</span>
              </div>
            ))}
          </Card>
          <Card style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ marginBottom: 12 }}>Analyse de rentabilité estimée</h3>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {(() => {
                const mois = echeances.reduce((s, e) => s + (e.duree || 0), 0) / 4;
                const rbm = mois > 0 ? form.honoraires / mois : 0;
                const trp = form.honoraires > 0 ? ((form.honoraires - form.honoraires * 0.3) / form.honoraires * 100) : 0;
                return (
                  <>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>RBM estimé</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>{DH(rbm)} / mois</div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>TRP estimé (30% charges)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: trp >= 40 ? C.green : trp >= 20 ? C.orange : C.red }}>
                        {trp.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Durée totale estimée</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{mois.toFixed(1)} mois</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <Btn variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>← Précédent</Btn>
        <Btn onClick={step < 4 ? () => setStep(s => s + 1) : handleSave} disabled={saving}>
          {step < 4 ? "Suivant →" : saving ? "Enregistrement…" : "✓ Enregistrer"}
        </Btn>
      </div>
    </div>
  );
};

// ─── TECHNIQUE ────────────────────────────────────────────────
const Technique = ({ contrats, roleId }) => {
  const myContrats = contrats.filter(c => c.cdp_id === roleId);
  const [selected, setSelected] = useState(null);

  if (selected) {
    const c = myContrats.find(x => x.id === selected) || contrats.find(x => x.id === selected);
    if (!c) { setSelected(null); return null; }
    const ech = mkEcheances(c);
    const avancement = ech.length > 0
      ? Math.round(ech.reduce((s, e) => s + (e.avancement || 0), 0) / ech.length)
      : 0;
    return (
      <div>
        <Btn variant="ghost" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>← Retour</Btn>
        <h1 style={{ marginBottom: 4 }}>{c.nom}</h1>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 24 }}>{c.ref_interne} · {c.type_projet}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: C.gold }}>{avancement}%</div>
          <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4 }}>
            <div style={{ width: `${avancement}%`, height: "100%", background: C.gold, borderRadius: 4 }} />
          </div>
        </div>
        <Card>
          <table>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Échéance prévue</th>
                <th>Retard (sem.)</th>
                <th>Avancement</th>
                <th>Notes</th>
                <th>Livré</th>
              </tr>
            </thead>
            <tbody>
              {ech.map(e => (
                <tr key={e.key} style={{ opacity: e.livree ? 0.5 : 1 }}>
                  <td>
                    {e.livree
                      ? <span style={{ textDecoration: "line-through", color: C.muted }}>{e.label}</span>
                      : <><span className="badge" style={{ background: `${C.gold}22`, color: C.gold, marginRight: 6, animation: "pulse 2s infinite" }}>◉</span>{e.label}</>
                    }
                  </td>
                  <td style={{ fontFamily: "monospace" }}>{e.dateEcheance}</td>
                  <td style={{ color: (e.retard || 0) > 0 ? C.red : C.muted }}>{e.retard || 0} sem.</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: C.border, borderRadius: 2 }}>
                        <div style={{ width: `${e.avancement}%`, height: "100%", background: C.green, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: C.muted }}>{e.avancement}%</span>
                    </div>
                  </td>
                  <td style={{ color: C.muted, fontSize: 12 }}>{e.notes_tech || "—"}</td>
                  <td>{e.livree ? <span style={{ color: C.green }}>✓ {e.date_livraison}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  return (
    <Page title="Mes projets techniques">
      {myContrats.length === 0 && (
        <Card><div style={{ textAlign: "center", color: C.muted, padding: 32 }}>Aucun projet affecté pour le moment.</div></Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12 }}>
        {myContrats.map(c => {
          const ech = mkEcheances(c);
          const avg = ech.length > 0 ? Math.round(ech.reduce((s, e) => s + (e.avancement || 0), 0) / ech.length) : 0;
          const retards = ech.filter(e => (e.retard || 0) > 0).length;
          return (
            <Card key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelected(c.id)}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.nom}</div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>{c.ref_interne}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3 }}>
                  <div style={{ width: `${avg}%`, height: "100%", background: avg === 100 ? C.green : C.gold, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>{avg}%</span>
              </div>
              {retards > 0 && <span className="badge tag-retard">{retards} retard{retards > 1 ? "s" : ""}</span>}
            </Card>
          );
        })}
      </div>
    </Page>
  );
};

// ─── FACTURATION ──────────────────────────────────────────────
const Facturation = ({ contrats }) => {
  const alertes = [];
  contrats.forEach(c => {
    mkEcheances(c).forEach(e => {
      if (e.livree && e.facturable && !e.facture_emise) {
        alertes.push({ contratNom: c.nom, ref: c.ref_interne, phase: e.label, montant: e.montant, id: c.id, key: e.key });
      }
    });
  });

  const encaisse = contrats.reduce((s, c) => s + mkEcheances(c).filter(e => e.paiement_recu).reduce((a, e) => a + e.montant, 0), 0);
  const enAttente = contrats.reduce((s, c) => s + mkEcheances(c).filter(e => e.facture_emise && !e.paiement_recu).reduce((a, e) => a + e.montant, 0), 0);
  const aFacturer = alertes.reduce((s, a) => s + a.montant, 0);

  return (
    <Page title="Facturation">
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <KPI label="Encaissé total" value={DH(encaisse)} color={C.green} />
        <KPI label="Facturé en attente paiement" value={DH(enAttente)} color={C.orange} />
        <KPI label="À facturer (prêt)" value={DH(aFacturer)} color={C.gold} />
      </div>

      {alertes.length > 0 && (
        <Card style={{ marginBottom: 16, borderColor: `${C.gold}40` }}>
          <h2 style={{ marginBottom: 12, color: C.gold }}>⚠ Phases livrées prêtes à facturer ({alertes.length})</h2>
          <table>
            <thead><tr><th>Projet</th><th>Phase</th><th>Montant</th><th>Action</th></tr></thead>
            <tbody>
              {alertes.map((a, i) => (
                <tr key={i}>
                  <td>{a.contratNom} <span style={{ color: C.muted, fontSize: 11 }}>{a.ref}</span></td>
                  <td>{a.phase}</td>
                  <td style={{ fontFamily: "monospace", color: C.gold }}>{DH(a.montant)}</td>
                  <td><Btn style={{ fontSize: 11, padding: "4px 10px" }}>Émettre facture</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <h2 style={{ marginBottom: 12 }}>Toutes les phases facturables</h2>
        <table>
          <thead>
            <tr><th>Projet</th><th>Phase</th><th>Date paiement prév.</th><th>Montant</th><th>Facturée</th><th>Payée</th></tr>
          </thead>
          <tbody>
            {contrats.flatMap(c =>
              mkEcheances(c).filter(e => e.facturable && e.pct > 0).map(e => (
                <tr key={`${c.id}-${e.key}`}>
                  <td>{c.nom}</td>
                  <td>{e.label}</td>
                  <td style={{ fontFamily: "monospace" }}>{e.datePaiement}</td>
                  <td style={{ fontFamily: "monospace", color: C.gold }}>{DH(e.montant)}</td>
                  <td>{e.facture_emise ? <span style={{ color: C.green }}>✓</span> : <span style={{ color: C.border }}>—</span>}</td>
                  <td>{e.paiement_recu ? <span style={{ color: C.green }}>✓</span> : <span style={{ color: C.border }}>—</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </Page>
  );
};

// ─── PRÉVISIONNEL ─────────────────────────────────────────────
const Previsionnel = ({ contrats, charges }) => {
  const chargesTotal = charges.reduce((s, c) => s + (c.mnt || 0), 0);
  const data = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const prev = contrats.reduce((s, c) => {
      return s + mkEcheances(c).filter(e => {
        const ep = new Date(e.datePaiement);
        return ep.getMonth() === d.getMonth() && ep.getFullYear() === d.getFullYear();
      }).reduce((a, e) => a + e.montant, 0);
    }, 0);
    const encaisse = contrats.reduce((s, c) => {
      return s + mkEcheances(c).filter(e => {
        const ep = new Date(e.datePaiement);
        return e.paiement_recu && ep.getMonth() === d.getMonth() && ep.getFullYear() === d.getFullYear();
      }).reduce((a, e) => a + e.montant, 0);
    }, 0);
    data.push({
      m: d.toLocaleString("fr-FR", { month: "short", year: "2-digit" }),
      previsionnel: prev,
      encaisse: encaisse,
      charges: chargesTotal,
    });
  }

  return (
    <Page title="Prévisionnel Financier">
      <Card>
        <h2 style={{ marginBottom: 16 }}>Cashflow — 12 prochains mois</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="m" stroke={C.muted} />
            <YAxis stroke={C.muted} tickFormatter={v => Math.round(v/1000)+"k"} />
            <Tooltip formatter={v => DH(v)} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="previsionnel" name="Encaissements prév." fill={`${C.gold}80`} radius={[4,4,0,0]} />
            <Bar dataKey="encaisse"     name="Encaissé réel"       fill={C.green}        radius={[4,4,0,0]} />
            <Line dataKey="charges"     name="Charges fixes"       stroke={C.red}        strokeWidth={2}   dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 12 }}>Échéancier détaillé</h2>
        <table>
          <thead>
            <tr><th>Projet</th><th>Phase</th><th>Date paiement prév.</th><th>Montant</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {contrats.flatMap(c =>
              mkEcheances(c).filter(e => e.pct > 0).map(e => {
                const enRetard = new Date(e.datePaiement) < new Date() && !e.paiement_recu;
                return (
                  <tr key={`${c.id}-${e.key}`}>
                    <td>{c.nom}</td>
                    <td>{e.label}</td>
                    <td style={{ fontFamily: "monospace", color: enRetard ? C.red : C.text }}>{e.datePaiement}</td>
                    <td style={{ fontFamily: "monospace", color: C.gold }}>{DH(e.montant)}</td>
                    <td>
                      {e.paiement_recu
                        ? <span className="badge tag-livre">Payé</span>
                        : e.facture_emise
                          ? <span className="badge tag-en-cours">Facturé</span>
                          : enRetard
                            ? <span className="badge tag-retard">En retard</span>
                            : <span style={{ color: C.muted }}>—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </Page>
  );
};

// ─── RENTABILITÉ ──────────────────────────────────────────────
const Rentabilite = ({ contrats, charges, roles }) => {
  const chargesTotal = charges.reduce((s, c) => s + (c.mnt || 0), 0);
  const nbActifs = contrats.filter(c => c.statut === "En cours").length || 1;
  const seuilParProjet = chargesTotal / nbActifs;

  return (
    <Page title="Rentabilité & Performance">
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <KPI label="Charges totales / mois" value={DH(chargesTotal)} color={C.red} />
        <KPI label="Seuil par projet actif" value={DH(seuilParProjet)} color={C.orange} sub={`${nbActifs} projets actifs`} />
      </div>
      <Card>
        <h2 style={{ marginBottom: 16 }}>Performance par projet</h2>
        <table>
          <thead>
            <tr>
              <th>Projet</th>
              <th>Honoraires</th>
              <th>Durée (mois)</th>
              <th>RBM</th>
              <th>TRP</th>
              <th>Chef de projet</th>
            </tr>
          </thead>
          <tbody>
            {contrats.map(c => {
              const ech = mkEcheances(c);
              const totalSem = ech.reduce((s, e) => s + (e.duree || 0), 0);
              const mois = Math.max(totalSem / 4, 0.1);
              const rbm = c.honoraires / mois;
              const trp = c.honoraires > 0 ? ((c.honoraires - seuilParProjet * mois) / c.honoraires * 100) : 0;
              const cdp = roles.find(r => r.id === c.cdp_id);
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nom}</td>
                  <td style={{ fontFamily: "monospace" }}>{DH(c.honoraires)}</td>
                  <td>{mois.toFixed(1)}</td>
                  <td style={{ fontFamily: "monospace" }}>{DH(rbm)}</td>
                  <td>
                    <span style={{ color: trp >= 40 ? C.green : trp >= 20 ? C.orange : C.red, fontWeight: 700 }}>
                      {trp >= 40 ? "🟢" : trp >= 20 ? "🟡" : "🔴"} {trp.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ color: C.muted }}>{cdp?.label || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </Page>
  );
};

// ─── CLIENTS ──────────────────────────────────────────────────
const Clients = ({ contrats }) => {
  const clients = useMemo(() => {
    const map = {};
    contrats.forEach(c => {
      const key = c.client_cin || c.client_rc || c.client_rep_nom || "Inconnu";
      if (!map[key]) map[key] = { nom: `${c.client_rep_prenom} ${c.client_rep_nom}`.trim(), tel: c.tel1, email: c.email, contrats: 0, ca: 0 };
      map[key].contrats++;
      map[key].ca += c.honoraires || 0;
    });
    return Object.values(map);
  }, [contrats]);

  return (
    <Page title="Clients">
      <Card>
        <table>
          <thead><tr><th>Client</th><th>Tél</th><th>Email</th><th>Contrats</th><th>CA total</th></tr></thead>
          <tbody>
            {clients.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: C.muted, padding: 32 }}>Aucun client</td></tr>}
            {clients.map((cl, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{cl.nom || "—"}</td>
                <td style={{ color: C.muted }}>{cl.tel || "—"}</td>
                <td style={{ color: C.muted }}>{cl.email || "—"}</td>
                <td>{cl.contrats}</td>
                <td style={{ fontFamily: "monospace", color: C.gold }}>{DH(cl.ca)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Page>
  );
};

// ─── CHARGES ──────────────────────────────────────────────────
const Charges = ({ charges, setCharges }) => {
  const [form, setForm] = useState({ cat: "", mnt: 0, per: "Mensuel", desc: "" });
  const total = charges.reduce((s, c) => s + (c.mnt || 0), 0);

  const cats = ["Salaires","Loyer","Régie eau/élec","Téléphonie","Internet","Consommables","Tirage plans","ROKHAS","Cadastre","Agence urbaine","Conservation","Autre"];

  return (
    <Page title="Charges d'exploitation">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <KPI label="Total charges / mois" value={DH(total)} color={C.red} style={{ marginBottom: 16 }} />
          <Card>
            <table>
              <thead><tr><th>Catégorie</th><th>Montant</th><th>Périodicité</th><th>Description</th></tr></thead>
              <tbody>
                {charges.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: C.muted, padding: 32 }}>Aucune charge enregistrée</td></tr>}
                {charges.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.cat}</td>
                    <td style={{ fontFamily: "monospace", color: C.red }}>{DH(c.mnt)}</td>
                    <td style={{ color: C.muted }}>{c.per}</td>
                    <td style={{ color: C.muted }}>{c.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <Card style={{ width: 280 }}>
          <h3 style={{ marginBottom: 16 }}>Ajouter une charge</h3>
          <FRow label="Catégorie">
            <select value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
              <option value="">Choisir…</option>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </FRow>
          <FRow label="Montant (DH)">
            <input type="number" value={form.mnt} onChange={e => setForm(f => ({ ...f, mnt: +e.target.value }))} />
          </FRow>
          <FRow label="Périodicité">
            <select value={form.per} onChange={e => setForm(f => ({ ...f, per: e.target.value }))}>
              {["Mensuel","Annuel","Ponctuel"].map(p => <option key={p}>{p}</option>)}
            </select>
          </FRow>
          <FRow label="Description">
            <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
          </FRow>
          <Btn style={{ width: "100%", marginTop: 8 }} onClick={() => {
            if (form.cat && form.mnt > 0) {
              setCharges(prev => [...prev, { ...form, id: Date.now() }]);
              setForm({ cat: "", mnt: 0, per: "Mensuel", desc: "" });
            }
          }}>+ Ajouter</Btn>
        </Card>
      </div>
    </Page>
  );
};

// ─── ADMIN ────────────────────────────────────────────────────
const Admin = ({ roles, setRoles, contrats, setContrats }) => {
  const [activeTab, setActiveTab] = useState("profils");
  const cdps = roles.filter(r => r.isCdP);

  return (
    <Page title="Administration">
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["profils","affectation"].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: "7px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: activeTab === t ? C.gold : C.surface,
              color: activeTab === t ? "#0e0f11" : C.muted,
              border: `1px solid ${activeTab === t ? C.gold : C.border}` }}>
            {t === "profils" ? "Profils & PINs" : "Affectation projets"}
          </button>
        ))}
      </div>

      {activeTab === "profils" && (
        <Card>
          <h2 style={{ marginBottom: 16 }}>Gestion des accès</h2>
          <table>
            <thead><tr><th>Profil</th><th>PIN</th><th>Nouveau PIN</th></tr></thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.label}</td>
                  <td style={{ fontFamily: "monospace", letterSpacing: 4 }}>••••</td>
                  <td>
                    <input placeholder="Nouveau PIN (4 chiffres)" maxLength={4} style={{ width: 160 }}
                      onBlur={e => {
                        const v = e.target.value;
                        if (v.length === 4 && /^\d{4}$/.test(v)) {
                          setRoles(prev => prev.map(x => x.id === r.id ? { ...x, pin: v } : x));
                          e.target.value = "";
                        }
                      }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "affectation" && (
        <Card>
          <h2 style={{ marginBottom: 16 }}>Affectation des projets aux chefs de projet</h2>
          <table>
            <thead><tr><th>Projet</th><th>Référence</th><th>Chef de projet actuel</th><th>Affecter à</th></tr></thead>
            <tbody>
              {contrats.map(c => {
                const cdp = roles.find(r => r.id === c.cdp_id);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nom}</td>
                    <td style={{ color: C.muted, fontFamily: "monospace" }}>{c.ref_interne}</td>
                    <td>{cdp?.label || <span style={{ color: C.orange }}>Non affecté</span>}</td>
                    <td>
                      <select value={c.cdp_id || ""} style={{ width: 180 }}
                        onChange={e => setContrats(prev => prev.map(x => x.id === c.id ? { ...x, cdp_id: e.target.value || null } : x))}>
                        <option value="">— Non affecté —</option>
                        {cdps.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {contrats.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: C.muted, padding: 32 }}>Aucun contrat créé</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
  );
};

// ─── RH (stub) ────────────────────────────────────────────────
const RH = () => (
  <Page title="Ressources Humaines">
    <Card>
      <div style={{ textAlign: "center", padding: 48, color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>◑</div>
        <div style={{ fontSize: 16, marginBottom: 8 }}>Module RH — En cours de développement</div>
        <div style={{ fontSize: 13 }}>Gestion des collaborateurs, congés, paie et performances</div>
      </div>
    </Card>
  </Page>
);

// ═══════════════════════════════════════════════════════════════
// ─── APP PRINCIPALE ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // ── State ──────────────────────────────────────────────────
  const [ready, setReady]         = useState(false);
  const [role, setRole]           = useState(null);
  const [tab, setTab]             = useState("dashboard");
  const [contrats, setContrats]   = useState([]);
  const [charges, setCharges]     = useState([]);
  const [roles, setRoles]         = useState(DEFAULT_ROLES);
  const [editingContrat, setEditingContrat] = useState(null); // null = liste, false = nouveau, contrat = édition
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  // ── Chargement initial depuis Supabase ──────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: c }, { data: ch }, { data: r }] = await Promise.all([
          supabase.from("contrats").select("*").order("created_at", { ascending: false }),
          supabase.from("charges").select("*"),
          supabase.from("roles").select("*"),
        ]);
        if (c) setContrats(c.map(row => ({
          ...row,
          modalites: row.modalites || DEFAULT_MODALITES()
        })));
        if (ch) setCharges(ch);
        if (r && r.length > 0) setRoles(r);
      } catch (e) {
        console.warn("Supabase load error:", e);
        showToast("Connexion Supabase non disponible — mode local activé", "warning");
      }
      setReady(true);
    };
    load();
  }, []);

  // ── Sauvegarde contrat ──────────────────────────────────────
  const saveContrat = useCallback(async (form) => {
    try {
      const payload = { ...form, modalites: form.modalites };
      if (form.id) {
        const { error } = await supabase.from("contrats").update(payload).eq("id", form.id);
        if (error) throw error;
        setContrats(prev => prev.map(c => c.id === form.id ? payload : c));
        showToast("Contrat mis à jour ✓");
      } else {
        const { data, error } = await supabase.from("contrats").insert([payload]).select();
        if (error) throw error;
        setContrats(prev => [data[0], ...prev]);
        showToast("Contrat créé ✓");
      }
    } catch (e) {
      console.error(e);
      // Fallback local
      if (form.id) {
        setContrats(prev => prev.map(c => c.id === form.id ? form : c));
      } else {
        const newC = { ...form, id: Date.now() };
        setContrats(prev => [newC, ...prev]);
      }
      showToast("Sauvegardé localement (Supabase indisponible)", "warning");
    }
    setEditingContrat(null);
  }, []);

  // ── Sauvegarde charges ──────────────────────────────────────
  const saveCharges = useCallback(async (newCharges) => {
    setCharges(newCharges);
    // Sync nouvelle charge (la dernière) vers Supabase
    const last = newCharges[newCharges.length - 1];
    if (last && !last.synced) {
      try {
        await supabase.from("charges").insert([{ cat: last.cat, mnt: last.mnt, per: last.per, desc: last.desc }]);
      } catch (e) { console.warn("Supabase charges sync:", e); }
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────
  if (!ready) return <><GlobalStyle /><LoadingSpinner /></>;
  if (!role) return <><GlobalStyle /><LoginScreen roles={roles} onLogin={r => { setRole(r); setTab(r.tabs[0]); }} /></>;

  const renderContent = () => {
    // Contrats — édition en cours
    if ((tab === "contrats") && editingContrat !== null) {
      return (
        <ContratForm
          initial={editingContrat || undefined}
          roles={roles}
          totalContrats={contrats.length}
          onSave={saveContrat}
          onCancel={() => setEditingContrat(null)}
        />
      );
    }
    switch (tab) {
      case "dashboard":    return <Dashboard contrats={contrats} charges={charges} />;
      case "contrats":     return <ContratsList contrats={contrats} roles={roles} onSelect={c => setEditingContrat(c)} onCreate={() => setEditingContrat(false)} />;
      case "technique":    return <Technique contrats={contrats} roleId={role.id} />;
      case "facturation":  return <Facturation contrats={contrats} />;
      case "previsionnel": return <Previsionnel contrats={contrats} charges={charges} />;
      case "rentabilite":  return <Rentabilite contrats={contrats} charges={charges} roles={roles} />;
      case "clients":      return <Clients contrats={contrats} />;
      case "charges":      return <Charges charges={charges} setCharges={saveCharges} />;
      case "rh":           return <RH />;
      case "admin":        return <Admin roles={roles} setRoles={setRoles} contrats={contrats} setContrats={setContrats} />;
      default:             return null;
    }
  };

  return (
    <>
      <GlobalStyle />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar role={role} activeTab={tab} setTab={t => { setTab(t); setEditingContrat(null); }} onLogout={() => { setRole(null); setEditingContrat(null); }} />
        <main style={{ marginLeft: 200, flex: 1, padding: "28px 32px", minHeight: "100vh" }}>
          {renderContent()}
        </main>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
