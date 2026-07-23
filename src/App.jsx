import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import RefereeLLM from "./RefereeLLM";
import Sidebar from "./Sidebar";
import RefereeStatistics from "./pages/RefereeStatistics";
import GamesOrganizer from "./pages/GamesOrganizer";
import AboutUs from "./pages/AboutUs";
import Admin from "./Admin";

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
    let cancelled = false;

    const loadSession = (retriesLeft = 1) => {
      supabase.auth.getSession()
        .then(async ({ data: { session } }) => {
          if (cancelled) return;
          setUserEmail(session?.user?.email ?? null);
          setIsAdmin(await checkIsAdmin(session));
        })
        .catch(() => {
          if (cancelled) return;
          if (retriesLeft > 0) {
            // Transient auth lock contention with another mounted
            // component's session check (self-recovers) — retry once.
            loadSession(retriesLeft - 1);
            return;
          }
          setUserEmail(null);
          setIsAdmin(false);
        });
    };
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setUserEmail(session?.user?.email ?? null);
      setIsAdmin(await checkIsAdmin(session));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    // signOut() shares gotrue-js's internal auth lock with getSession(), and
    // that lock can end up genuinely stuck (not just contended) — observed
    // live: navigator.locks.query() shows it held with nothing pending,
    // never resolving. A retry doesn't help once it's in that state, so
    // bound the attempt with a timeout. If it doesn't finish in time, clear
    // the stored token directly and reload the page — a full reload is the
    // only way to guarantee every mounted component (App, RefereeLLM, etc.,
    // which each hold their own session state off the same stuck client)
    // re-syncs from a clean slate instead of some staying "signed in".
    const SIGNOUT_TIMEOUT_MS = 4000;
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timed out')), SIGNOUT_TIMEOUT_MS)),
      ]);
    } catch (err) {
      console.error('signOut did not complete cleanly, forcing local cleanup:', err);
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore — best effort
      }
    }
    window.location.reload();
  };

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
            onClick={handleSignOut}
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

      {/* Logo / menu toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        style={{
          position: "fixed",
          top: 8,
          left: 12,
          zIndex: 997,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          lineHeight: 0,
        }}
      >
        <img src="/vair-logo.svg" alt="VAiR" style={{ width: 84, display: "block" }} />
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
        {activePage === "statistics" && <RefereeStatistics />}
        {activePage === "games"      && <GamesOrganizer />}
        {activePage === "about"      && <AboutUs />}
        {activePage === "admin"      && <Admin />}
      </div>
    </div>
  );
}
