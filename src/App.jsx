import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import RefereeLLM from "./RefereeLLM";
import Sidebar from "./Sidebar";
import RefereeComparison from "./pages/RefereeComparison";
import GamesOrganizer from "./pages/GamesOrganizer";
import WebsiteConnections from "./pages/WebsiteConnections";
import AboutUs from "./pages/AboutUs";
import Admin from "./Admin";

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

export default function App() {
  const [activePage, setActivePage] = useState("referee");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      {/* Hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        style={{
          position: "fixed",
          top: 14,
          left: 16,
          zIndex: 997,
          background: "rgba(10,22,40,0.8)",
          border: "1px solid rgba(76,175,80,0.3)",
          borderRadius: 8,
          color: "rgba(232,245,233,0.85)",
          fontSize: 18,
          cursor: "pointer",
          padding: "5px 9px",
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
      />

      {/* Main content */}
      <div style={{ height: "100vh", overflowY: "auto" }}>
        {activePage === "referee"    && <RefereeLLM />}
        {activePage === "comparison" && <RefereeComparison />}
        {activePage === "games"      && <GamesOrganizer />}
        {activePage === "connections" && <WebsiteConnections />}
        {activePage === "about"      && <AboutUs />}
        {activePage === "admin"      && <Admin />}
      </div>
    </div>
  );
}
