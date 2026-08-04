const FEATURES = [
  {
    emoji: "🤖",
    title: "Instant AI Rulings",
    text: "Describe any match situation in plain language and get a clear, decisive answer — no more flipping through a 200-page rulebook mid-argument.",
  },
  {
    emoji: "📖",
    title: "Grounded in the Official Laws",
    text: "Every answer is generated directly from the complete IFAB Laws of the Game 2026/27 — not general web knowledge — with the exact Law and section cited.",
  },
  {
    emoji: "🟨",
    title: "VAR-Aware Reasoning",
    text: "Rulings flag when a decision could trigger a VAR review, and walk through the reasoning for genuine grey areas instead of dodging the question.",
  },
  {
    emoji: "🎙️",
    title: "Ask by Voice",
    text: "Hands-free question input — dictate a match scenario out loud and let VAIR transcribe and answer it.",
  },
  {
    emoji: "💡",
    title: "Real Scenarios to Get You Started",
    text: "A rotating set of curated sample questions — offside nuances, drop balls, equipment, misconduct — shows what's possible from your very first visit.",
  },
  {
    emoji: "🚩",
    title: "Flag & Improve",
    text: "Disagree with an answer? Report it in one click. It's reviewed, and you're notified — a feedback loop that keeps VAIR sharper over time.",
  },
  {
    emoji: "📈",
    title: "Referee Statistics",
    text: "Browse referee profiles and verified match statistics — built for studying game management at every level.",
  },
  {
    emoji: "📅",
    title: "Games Organizer",
    text: "Keep every upcoming and past assignment in one place. Upload games or add them manually — no more chasing spreadsheets.",
  },
  {
    emoji: "🔒",
    title: "Your Own Secure Account",
    text: "A personal login with tracked usage and a private question history — not a shared public chatbot.",
  },
];

export default function Features({ onNavigate }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: "transparent",
      color: "#e8f5e9",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 32px 20px 120px",
        borderBottom: "1px solid rgba(29,158,117,0.2)",
        background: "rgba(10,22,40,0.95)",
      }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 700,
          background: "linear-gradient(135deg, #1d9e75, #5ecda4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>
          ✨ What VAiR Can Do
        </h1>
        <p style={{ fontSize: 14, color: "rgba(232,245,233,0.65)", maxWidth: 640, lineHeight: 1.5 }}>
          Built for referees who need a decisive, citable ruling in seconds — and for anyone who's ever
          argued about a call. VAiR turns the full IFAB Laws of the Game into instant, straight answers.
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "36px 32px 56px 120px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 20,
          maxWidth: 1080,
        }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                background: "rgba(13,33,55,0.6)",
                border: "1px solid rgba(29,158,117,0.2)",
                borderRadius: 16,
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1 }}>{f.emoji}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#5ecda4" }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: "rgba(232,245,233,0.7)", lineHeight: 1.55, margin: 0 }}>
                {f.text}
              </p>
            </div>
          ))}
        </div>

        {/* Who it's for */}
        <div style={{
          marginTop: 40,
          maxWidth: 1080,
          background: "rgba(29,158,117,0.08)",
          border: "1px solid rgba(29,158,117,0.2)",
          borderRadius: 16,
          padding: "24px 28px",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e8f5e9", margin: "0 0 8px 0" }}>
            Who it's for
          </h3>
          <p style={{ fontSize: 13.5, color: "rgba(232,245,233,0.7)", lineHeight: 1.6, margin: 0 }}>
            Match officials studying for their next level, assessors reviewing game management, coaches
            prepping a team talk, and players or fans who just want a straight answer on a controversial
            call — VAiR is a rules reference for anyone the Laws of the Game affect.
          </p>
        </div>

        {/* CTA */}
        {onNavigate && (
          <div style={{ marginTop: 40, maxWidth: 1080, textAlign: "center" }}>
            <button
              onClick={() => onNavigate("referee")}
              style={{
                background: "linear-gradient(135deg, #0e7a58, #1d9e75)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                padding: "12px 28px",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(29,158,117,0.2)",
              }}
            >
              ⚽ Try VAiR Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
