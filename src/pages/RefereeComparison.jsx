export default function RefereeComparison() {
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
        padding: "24px 32px 16px 120px",
        borderBottom: "1px solid rgba(29,158,117,0.2)",
        background: "rgba(10,22,40,0.95)",
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          background: "linear-gradient(135deg, #1d9e75, #5ecda4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 4,
        }}>
          📊 Referee Comparison
        </h1>
        <p style={{ fontSize: 13, color: "rgba(232,245,233,0.6)" }}>
          Statistical analysis of referee performance
        </p>
      </div>

      {/* Charts area */}
      <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: 40 }}>

        {/* Chart 1 */}
        <div style={{
          background: "rgba(13,33,55,0.6)",
          border: "1px solid rgba(29,158,117,0.2)",
          borderRadius: 16,
          padding: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#5ecda4" }}>
            Match Statistics Overview
          </h2>
          <img
            src="/referee_comparison.png"
            alt="Referee comparison chart"
            style={{ width: "100%", borderRadius: 8, display: "block" }}
          />
        </div>

        {/* Future charts placeholder */}
        <div style={{
          background: "rgba(13,33,55,0.3)",
          border: "1px dashed rgba(29,158,117,0.15)",
          borderRadius: 16,
          padding: 32,
          textAlign: "center",
          color: "rgba(232,245,233,0.3)",
          fontSize: 14,
        }}>
          More charts coming soon
        </div>
      </div>
    </div>
  );
}
