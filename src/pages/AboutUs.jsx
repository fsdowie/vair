/* global __RELEASE_DATE__ */

export default function AboutUs() {
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
          ℹ️ About Us
        </h1>
        <p style={{ fontSize: 13, color: "rgba(232,245,233,0.6)" }}>
          Project information
        </p>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}>
        <div style={{
          background: "rgba(13,33,55,0.6)",
          border: "1px solid rgba(76,175,80,0.2)",
          borderRadius: 16,
          padding: "40px 56px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          minWidth: 320,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🟢</div>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              background: "linear-gradient(135deg, #4caf50, #81c784)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              VAIR
            </h2>
            <p style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", marginTop: 4 }}>
              Video Assistant Intelligence Referee
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(76,175,80,0.15)", paddingTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32 }}>
              <span style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Author</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#e8f5e9" }}>Federico</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32 }}>
              <span style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Release</span>
              <span style={{ fontSize: 14, fontFamily: "monospace", color: "#81c784" }}>
                {typeof __RELEASE_DATE__ !== 'undefined' ? __RELEASE_DATE__ : 'unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
