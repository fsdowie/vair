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
    <div style={{ position: "relative", height: "100vh", overflow: "hidden", background: "linear-gradient(135deg, #0a1628, #0d2137)" }}>
      {/* Faded logo background */}
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}>
        <img
          src="/vair-logo.svg"
          alt=""
          style={{ width: "min(560px, 72vw)", opacity: 0.045, userSelect: "none" }}
        />
      </div>

      {/* Top-right: signed-in user + sign out */}
      {userEmail && (
        <div style={{
          position: "fixed",
          top: 12,
          right: 16,
          zIndex: 997,
          display: "flex",
          alignItems: "center",
          gap: 10,
          backdropFilter: "blur(6px)",
        }}>
          <span style={{
            fontSize: 13,
            color: "rgba(232,245,233,0.45)",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {userEmail}
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid rgba(29,158,117,0.3)",
              background: "rgba(10,22,40,0.8)",
              color: "#1d9e75",
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        style={{
          position: "fixed",
          top: 12,
          left: 14,
          zIndex: 997,
          background: "rgba(10,22,40,0.8)",
          border: "1px solid rgba(29,158,117,0.35)",
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

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onNavigate={setActivePage}
        userEmail={userEmail}
        isAdmin={isAdmin}
      />

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, height: "100vh", overflowY: "auto" }}>
        {activePage === "referee"    && <RefereeLLM />}
        {activePage === "comparison" && <RefereeComparison />}
        {activePage === "games"      && <GamesOrganizer />}
        {activePage === "about"      && <AboutUs />}
        {activePage === "admin"      && <Admin />}
      </div>
    </div>
  );
}
