const NAV_ITEMS = [
  { id: "referee",    emoji: "🤖", label: "AI Referee" },
  { id: "comparison", emoji: "📊", label: "Referee Comparison" },
  { id: "games",      emoji: "📅", label: "Games Organizer" },
  { id: "about",      emoji: "ℹ️",  label: "About Us" },
];

const ADMIN_EMAIL = 'fsdowie@yahoo.com';

export default function Sidebar({ open, onClose, activePage, onNavigate, userEmail }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 998,
          }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 260,
        background: "linear-gradient(180deg, #0a1e0f 0%, #0a1628 100%)",
        borderRight: "1px solid rgba(76,175,80,0.2)",
        zIndex: 999,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        display: "flex",
        flexDirection: "column",
        paddingTop: 64,
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            color: "rgba(232,245,233,0.6)",
            fontSize: 20,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            lineHeight: 1,
          }}
          aria-label="Close menu"
        >
          ✕
        </button>

        {/* Logo */}
        <div style={{ padding: "0 24px 24px", borderBottom: "1px solid rgba(76,175,80,0.12)" }}>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            background: "linear-gradient(135deg, #4caf50, #81c784)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            VAIR
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,245,233,0.4)", marginTop: 2 }}>
            Video Assistant Intelligence Referee
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {[...NAV_ITEMS, ...(userEmail === ADMIN_EMAIL ? [{ id: "admin", emoji: "⚙️", label: "Admin" }] : [])].map(item => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "11px 14px",
                  marginBottom: 4,
                  background: isActive ? "rgba(76,175,80,0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(76,175,80,0.3)" : "1px solid transparent",
                  borderRadius: 10,
                  color: isActive ? "#81c784" : "rgba(232,245,233,0.75)",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(76,175,80,0.07)";
                    e.currentTarget.style.color = "#e8f5e9";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(232,245,233,0.75)";
                  }
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.emoji}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
