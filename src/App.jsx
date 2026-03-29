import { useState } from "react";
import RefereeLLM from "./RefereeLLM";
import Sidebar from "./Sidebar";
import RefereeComparison from "./pages/RefereeComparison";
import GamesOrganizer from "./pages/GamesOrganizer";
import AboutUs from "./pages/AboutUs";

export default function App() {
  const [activePage, setActivePage] = useState("referee");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      />

      {/* Main content */}
      <div style={{ height: "100vh", overflowY: "auto" }}>
        {activePage === "referee"    && <RefereeLLM />}
        {activePage === "comparison" && <RefereeComparison />}
        {activePage === "games"      && <GamesOrganizer />}
        {activePage === "about"      && <AboutUs />}
      </div>
    </div>
  );
}
