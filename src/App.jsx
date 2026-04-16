import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import RefereeLLM from "./RefereeLLM";
import Sidebar from "./Sidebar";
import RefereeComparison from "./pages/RefereeComparison";
import GamesOrganizer from "./pages/GamesOrganizer";
import AboutUs from "./pages/AboutUs";
import Admin from "./Admin";

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

const WhistleLogo = () => (
  <svg width="46" height="29" viewBox="0 0 60 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wg-chrome" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0f0f0"/>
        <stop offset="28%" stopColor="#d8d8d8"/>
        <stop offset="58%" stopColor="#8a8a8a"/>
        <stop offset="100%" stopColor="#c8c8c8"/>
      </linearGradient>
      <linearGradient id="wg-chrome2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e0e0e0"/>
        <stop offset="50%" stopColor="#9a9a9a"/>
        <stop offset="100%" stopColor="#c0c0c0"/>
      </linearGradient>
      <radialGradient id="wg-pea" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#a0ffb0"/>
        <stop offset="60%" stopColor="#00e060"/>
        <stop offset="100%" stopColor="#00aa40"/>
      </radialGradient>
      <filter id="wg-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="wg-bigglow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    {/* Mouthpiece tube */}
    <rect x="1" y="15" width="14" height="9" rx="4.5" fill="url(#wg-chrome2)" stroke="#666" strokeWidth="0.5"/>
    <rect x="2" y="16" width="12" height="3" rx="2" fill="rgba(255,255,255,0.3)"/>
    {/* Main body */}
    <rect x="12" y="7" width="40" height="24" rx="10" fill="url(#wg-chrome)" stroke="#777" strokeWidth="0.5"/>
    {/* Top highlight */}
    <rect x="14" y="8" width="36" height="9" rx="5" fill="rgba(255,255,255,0.32)"/>
    {/* Sound opening */}
    <rect x="22" y="7" width="18" height="7" rx="2.5" fill="#0a1628" stroke="#4caf50" strokeWidth="0.9" filter="url(#wg-glow)"/>
    {/* Circuit traces */}
    <line x1="13" y1="22" x2="50" y2="22" stroke="#4caf50" strokeWidth="0.6" opacity="0.55" filter="url(#wg-glow)"/>
    <line x1="35" y1="22" x2="35" y2="27" stroke="#4caf50" strokeWidth="0.5" opacity="0.4"/>
    <line x1="42" y1="22" x2="42" y2="18" stroke="#4caf50" strokeWidth="0.4" opacity="0.3"/>
    {/* Finger grip lines */}
    <line x1="30" y1="9" x2="30" y2="29" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8"/>
    <line x1="36" y1="9" x2="36" y2="29" stroke="rgba(0,0,0,0.16)" strokeWidth="0.8"/>
    {/* Pea window */}
    <circle cx="22" cy="26" r="5" fill="#0a1628" stroke="#4caf50" strokeWidth="0.9" filter="url(#wg-glow)"/>
    <circle cx="22" cy="26" r="3.2" fill="url(#wg-pea)" filter="url(#wg-bigglow)"/>
    {/* LED indicator */}
    <circle cx="46" cy="26" r="2.2" fill="#4caf50" filter="url(#wg-bigglow)"/>
    {/* Lanyard ring */}
    <circle cx="52" cy="19" r="4" fill="none" stroke="#888" strokeWidth="1.2"/>
    <circle cx="52" cy="19" r="2.2" fill="#0a1628"/>
  </svg>
);

const BOOTSTRAP_ADMIN_EMAIL = 'fsdowie@yahoo.com';

async function checkIsAdmin(session) {
  if (!session) return false;
  if (session.user.email === BOOTSTRAP_ADMIN_EMAIL) return true;
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();
  return data?.is_admin === true;
}

export default function App() {
  const [activePage, setActivePage] = useState("referee");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
      setIsAdmin(await checkIsAdmin(session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setUserEmail(session?.user?.email ?? null);
      setIsAdmin(await checkIsAdmin(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      {/* Logo + Hamburger bar */}
      <div style={{
        position: "fixed",
        top: 10,
        left: 12,
        zIndex: 997,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <WhistleLogo />
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          style={{
            background: "rgba(10,22,40,0.8)",
            border: "1px solid rgba(76,175,80,0.3)",
            borderRadius: 8,
            color: "rgba(232,245,233,0.85)",
            fontSize: 22,
            cursor: "pointer",
            padding: "7px 12px",
            lineHeight: 1,
            backdropFilter: "blur(6px)",
          }}
        >
          ☰
        </button>
      </div>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onNavigate={setActivePage}
        userEmail={userEmail}
        isAdmin={isAdmin}
      />

      {/* Main content */}
      <div style={{ height: "100vh", overflowY: "auto" }}>
        {activePage === "referee"    && <RefereeLLM />}
        {activePage === "comparison" && <RefereeComparison />}
        {activePage === "games"      && <GamesOrganizer />}
        {activePage === "about"      && <AboutUs />}
        {activePage === "admin"      && <Admin />}
      </div>
    </div>
  );
}
