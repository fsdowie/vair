export default function GamesOrganizer() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628, #0d2137)",
      color: "#e8f5e9",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 32px 16px",
        borderBottom: "1px solid rgba(76,175,80,0.2)",
        background: "rgba(10,22,40,0.95)",
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          background: "linear-gradient(135deg, #4caf50, #81c784)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 4,
        }}>
          📅 Games Organizer
        </h1>
        <p style={{ fontSize: 13, color: "rgba(232,245,233,0.6)" }}>
          Manage and schedule matches
        </p>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: "rgba(13,33,55,0.6)",
          border: "1px solid rgba(76,175,80,0.15)",
          borderRadius: 16,
          padding: "48px 64px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <p style={{
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(232,245,233,0.7)",
            letterSpacing: "0.05em",
          }}>
            Upcoming Functionality
          </p>
        </div>
      </div>
    </div>
  );
}
