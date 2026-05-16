import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

// flag_code = flagcdn.com ISO code (e.g. "gb-eng", "us", "ar")
// league_avg inside each league entry = rolling 3-season average across all referees
// in that league (estimated). Used as peer benchmark.
const STATIC_PROFILES = [
  {
    id: "1",
    name: "Michael Oliver",
    country: "England",
    flag_code: "gb-eng",
    age: 41,
    date_of_birth: "1985-03-25",
    place_of_birth: "Ashington, Northumberland, England",
    leagues: ["Premier League", "UEFA Champions League", "FA Cup", "EFL Cup"],
    active: true,
    fouls_per_game: 24.2,
    fouls_per_league: {
      "Premier League":        { per_game: 24.2, league_avg: 23.5 },
      "UEFA Champions League": { per_game: 22.8, league_avg: 22.0 },
      "FA Cup":                { per_game: 23.5, league_avg: 22.8 },
    },
    yellow_per_game: 3.8,
    yellow_per_league: {
      "Premier League":        { per_game: 3.8, league_avg: 3.6 },
      "UEFA Champions League": { per_game: 3.4, league_avg: 3.2 },
      "FA Cup":                { per_game: 3.1, league_avg: 3.3 },
    },
    red_per_game: 0.12,
    red_per_league: {
      "Premier League":        { per_game: 0.120, league_avg: 0.100 },
      "UEFA Champions League": { per_game: 0.250, league_avg: 0.140 },
      "FA Cup":                { per_game: 0.100, league_avg: 0.090 },
    },
    penalties_per_game: 0.28,
    penalties_per_league: {
      "Premier League":        { per_game: 0.280, league_avg: 0.250 },
      "UEFA Champions League": { per_game: 0.250, league_avg: 0.220 },
      "FA Cup":                { per_game: 0.200, league_avg: 0.210 },
    },
    comments: "One of England's most experienced and respected top-flight referees. Known for his composure and strong game management at the highest levels of European football.",
  },
  {
    id: "2",
    name: "Victor Manuel Rivas",
    country: "USA",
    flag_code: "us",
    age: null,
    date_of_birth: null,
    place_of_birth: null,
    leagues: ["MLS", "CONCACAF Champions Cup", "US Open Cup"],
    active: true,
    fouls_per_game: 21.3,
    fouls_per_league: {
      "MLS":                    { per_game: 21.3, league_avg: 20.5 },
      "CONCACAF Champions Cup": { per_game: 20.1, league_avg: 21.0 },
      "US Open Cup":            { per_game: 19.8, league_avg: 20.2 },
    },
    yellow_per_game: 3.1,
    yellow_per_league: {
      "MLS":                    { per_game: 3.1, league_avg: 3.0 },
      "CONCACAF Champions Cup": { per_game: 2.8, league_avg: 3.1 },
      "US Open Cup":            { per_game: 2.5, league_avg: 2.9 },
    },
    red_per_game: 0.09,
    red_per_league: {
      "MLS":                    { per_game: 0.090, league_avg: 0.080 },
      "CONCACAF Champions Cup": { per_game: 0.130, league_avg: 0.110 },
      "US Open Cup":            { per_game: 0.100, league_avg: 0.070 },
    },
    penalties_per_game: 0.20,
    penalties_per_league: {
      "MLS":                    { per_game: 0.200, league_avg: 0.180 },
      "CONCACAF Champions Cup": { per_game: 0.180, league_avg: 0.190 },
      "US Open Cup":            { per_game: 0.150, league_avg: 0.170 },
    },
    comments: "MLS referee recognized for consistent officiating in high-pressure CONCACAF competition matches. Biographical details to be confirmed.",
  },
  {
    id: "3",
    name: "Ismail Elfath",
    country: "USA",
    flag_code: "us",
    age: 45,
    date_of_birth: "1981-03-18",
    place_of_birth: "Casablanca, Morocco (raised in USA)",
    leagues: ["MLS", "CONCACAF Champions Cup", "USMNT Internationals", "FIFA International"],
    active: true,
    fouls_per_game: 20.8,
    fouls_per_league: {
      "MLS":                    { per_game: 20.8, league_avg: 20.5 },
      "CONCACAF Champions Cup": { per_game: 19.6, league_avg: 21.0 },
      "FIFA International":     { per_game: 21.4, league_avg: 22.3 },
    },
    yellow_per_game: 3.2,
    yellow_per_league: {
      "MLS":                    { per_game: 3.2, league_avg: 3.0 },
      "CONCACAF Champions Cup": { per_game: 3.0, league_avg: 3.1 },
      "FIFA International":     { per_game: 3.6, league_avg: 3.3 },
    },
    red_per_game: 0.10,
    red_per_league: {
      "MLS":                    { per_game: 0.100, league_avg: 0.080 },
      "CONCACAF Champions Cup": { per_game: 0.130, league_avg: 0.110 },
      "FIFA International":     { per_game: 0.150, league_avg: 0.130 },
    },
    penalties_per_game: 0.22,
    penalties_per_league: {
      "MLS":                    { per_game: 0.220, league_avg: 0.180 },
      "CONCACAF Champions Cup": { per_game: 0.200, league_avg: 0.190 },
      "FIFA International":     { per_game: 0.250, league_avg: 0.230 },
    },
    comments: "One of the top FIFA-badged referees from the USA. Officiated at multiple international tournaments including World Cup qualifiers and Copa America group stage matches.",
  },
  {
    id: "4",
    name: "Dario Herrera",
    country: "Argentina",
    flag_code: "ar",
    age: 46,
    date_of_birth: "1979-11-04",
    place_of_birth: "Córdoba, Argentina",
    leagues: ["Argentine Primera División", "Copa Argentina", "Copa Libertadores"],
    active: true,
    fouls_per_game: 27.5,
    fouls_per_league: {
      "Argentine Primera División": { per_game: 27.5, league_avg: 26.8 },
      "Copa Argentina":             { per_game: 26.8, league_avg: 26.0 },
      "Copa Libertadores":          { per_game: 25.2, league_avg: 24.5 },
    },
    yellow_per_game: 4.2,
    yellow_per_league: {
      "Argentine Primera División": { per_game: 4.2, league_avg: 4.0 },
      "Copa Argentina":             { per_game: 3.9, league_avg: 3.8 },
      "Copa Libertadores":          { per_game: 3.7, league_avg: 3.5 },
    },
    red_per_game: 0.14,
    red_per_league: {
      "Argentine Primera División": { per_game: 0.140, league_avg: 0.130 },
      "Copa Argentina":             { per_game: 0.100, league_avg: 0.120 },
      "Copa Libertadores":          { per_game: 0.200, league_avg: 0.160 },
    },
    penalties_per_game: 0.26,
    penalties_per_league: {
      "Argentine Primera División": { per_game: 0.260, league_avg: 0.240 },
      "Copa Argentina":             { per_game: 0.200, league_avg: 0.220 },
      "Copa Libertadores":          { per_game: 0.300, league_avg: 0.230 },
    },
    comments: "Experienced Argentine referee officiating in one of South America's most intense domestic leagues. Known for authoritative game management in high-volatility matches.",
  },
];

const STAT_ROWS = [
  { key: "fouls",     label: "Fouls",        gameKey: "fouls_per_game",     leagueKey: "fouls_per_league",     color: "#5ecda4", decimals: 1 },
  { key: "yellow",    label: "Yellow Cards", gameKey: "yellow_per_game",    leagueKey: "yellow_per_league",    color: "#ffd600", decimals: 1 },
  { key: "red",       label: "Red Cards",    gameKey: "red_per_game",       leagueKey: "red_per_league",       color: "#ef5350", decimals: 3 },
  { key: "penalties", label: "Penalties",    gameKey: "penalties_per_game", leagueKey: "penalties_per_league", color: "#ff9800", decimals: 3 },
];

function peersAvg(leagueMap) {
  const vals = Object.values(leagueMap);
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v.league_avg, 0) / vals.length;
}

function DeltaBadge({ ref_val, avg_val, higherIsBetter = false }) {
  if (avg_val == null || avg_val === 0) return null;
  const diff = ref_val - avg_val;
  const pct  = Math.abs(diff / avg_val * 100).toFixed(1);
  const above = diff > 0;
  // For most referee stats, being higher than average is neutral/informational — no good/bad coloring
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, marginLeft: 6,
      color: above ? "#ef9a9a" : "#80cbc4",
    }}>
      {above ? "▲" : "▼"} {pct}%
    </span>
  );
}

function FlagImg({ code, size = 24 }) {
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      width={size}
      alt=""
      style={{ borderRadius: 2, objectFit: "cover", display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    />
  );
}

function EstimateBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
      background: "rgba(255,152,0,0.12)", border: "1px solid rgba(255,152,0,0.3)",
      color: "#ffb74d", letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      EST
    </span>
  );
}

function ProfileCard({ profile, onClick }) {
  const isRetired = !profile.active;
  return (
    <div
      onClick={onClick}
      style={{
        background: isRetired ? "rgba(13,33,55,0.4)" : "rgba(13,33,55,0.7)",
        border: `1px solid ${isRetired ? "rgba(120,120,120,0.18)" : "rgba(29,158,117,0.25)"}`,
        borderRadius: 14, padding: 22, cursor: "pointer",
        transition: "all 0.18s", opacity: isRetired ? 0.65 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1px solid ${isRetired ? "rgba(120,120,120,0.35)" : "rgba(29,158,117,0.55)"}`;
        e.currentTarget.style.background = isRetired ? "rgba(13,33,55,0.55)" : "rgba(13,33,55,0.9)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = `1px solid ${isRetired ? "rgba(120,120,120,0.18)" : "rgba(29,158,117,0.25)"}`;
        e.currentTarget.style.background = isRetired ? "rgba(13,33,55,0.4)" : "rgba(13,33,55,0.7)";
      }}
    >
      {/* Name + flag + status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <FlagImg code={profile.flag_code} size={22} />
            <span style={{ fontSize: 17, fontWeight: 700, color: isRetired ? "rgba(232,245,233,0.55)" : "#e8f5e9" }}>
              {profile.name}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(232,245,233,0.4)", paddingLeft: 30 }}>
            {profile.country}
            {profile.place_of_birth ? ` · ${profile.place_of_birth}` : ""}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap",
          background: profile.active ? "rgba(29,158,117,0.15)" : "rgba(120,120,120,0.12)",
          color: profile.active ? "#5ecda4" : "rgba(232,245,233,0.35)",
          border: `1px solid ${profile.active ? "rgba(29,158,117,0.3)" : "rgba(120,120,120,0.25)"}`,
        }}>
          {profile.active ? "Active" : "Retired"}
        </span>
      </div>

      {profile.date_of_birth && (
        <div style={{ fontSize: 12, color: "rgba(232,245,233,0.4)", marginBottom: 12 }}>
          Age {profile.age} &nbsp;·&nbsp; b. {new Date(profile.date_of_birth).getFullYear()}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {profile.leagues.map(l => (
          <span key={l} style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 12,
            background: isRetired ? "rgba(120,120,120,0.07)" : "rgba(29,158,117,0.08)",
            border: `1px solid ${isRetired ? "rgba(120,120,120,0.18)" : "rgba(29,158,117,0.2)"}`,
            color: "rgba(232,245,233,0.55)",
          }}>
            {l}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {STAT_ROWS.map(s => {
          const avg = peersAvg(profile[s.leagueKey]);
          return (
            <div key={s.key} style={{ background: "rgba(10,22,40,0.4)", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <div style={{ fontSize: 10, color: "rgba(232,245,233,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                <EstimateBadge />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: isRetired ? "rgba(232,245,233,0.35)" : s.color }}>
                  {Number(profile[s.gameKey]).toFixed(s.decimals > 1 ? 3 : 1)}
                </span>
                <DeltaBadge ref_val={profile[s.gameKey]} avg_val={avg} />
              </div>
              <div style={{ fontSize: 10, color: "rgba(232,245,233,0.3)" }}>
                ref avg &nbsp;·&nbsp; peers: {avg != null ? avg.toFixed(s.decimals > 1 ? 3 : 1) : "—"}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: isRetired ? "rgba(232,245,233,0.3)" : "rgba(94,205,164,0.7)" }}>
        View full profile →
      </div>
    </div>
  );
}

function ProfileDetail({ profile, onBack }) {
  const isRetired = !profile.active;
  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "transparent", border: "none", color: "#5ecda4", fontSize: 13, cursor: "pointer", padding: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}
      >
        ← Back to profiles
      </button>

      {/* Header */}
      <div style={{
        background: isRetired ? "rgba(13,33,55,0.45)" : "rgba(13,33,55,0.7)",
        border: `1px solid ${isRetired ? "rgba(120,120,120,0.2)" : "rgba(29,158,117,0.25)"}`,
        borderRadius: 14, padding: "24px 28px", marginBottom: 20,
        opacity: isRetired ? 0.8 : 1,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <FlagImg code={profile.flag_code} size={36} />
              <div>
                <h2 style={{ fontSize: 26, fontWeight: 700, color: isRetired ? "rgba(232,245,233,0.6)" : "#e8f5e9", margin: 0, marginBottom: 2 }}>
                  {profile.name}
                </h2>
                <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)" }}>{profile.country}</div>
              </div>
            </div>
            {profile.date_of_birth ? (
              <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)" }}>
                Born {new Date(profile.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                {profile.place_of_birth && <> &nbsp;·&nbsp; {profile.place_of_birth}</>}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "rgba(232,245,233,0.35)", fontStyle: "italic" }}>
                Date and place of birth not confirmed
              </div>
            )}
            {profile.age && (
              <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", marginTop: 2 }}>Age: {profile.age}</div>
            )}
          </div>
          <span style={{
            fontSize: 13, fontWeight: 700, padding: "6px 16px", borderRadius: 20, alignSelf: "flex-start",
            background: profile.active ? "rgba(29,158,117,0.15)" : "rgba(120,120,120,0.12)",
            color: profile.active ? "#5ecda4" : "rgba(232,245,233,0.4)",
            border: `1px solid ${profile.active ? "rgba(29,158,117,0.3)" : "rgba(120,120,120,0.25)"}`,
          }}>
            {profile.active ? "Active" : "Retired"}
          </span>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {profile.leagues.map(l => (
            <span key={l} style={{
              fontSize: 12, padding: "4px 12px", borderRadius: 14,
              background: isRetired ? "rgba(120,120,120,0.08)" : "rgba(29,158,117,0.1)",
              border: `1px solid ${isRetired ? "rgba(120,120,120,0.2)" : "rgba(29,158,117,0.25)"}`,
              color: "rgba(232,245,233,0.7)",
            }}>
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Estimates disclaimer */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        background: "rgba(255,152,0,0.06)", border: "1px solid rgba(255,152,0,0.2)",
        borderRadius: 10, marginBottom: 20, fontSize: 12, color: "#ffb74d",
      }}>
        <EstimateBadge />
        All statistics are rolling 3-season averages (estimated). Peers avg = all other referees in the same league and season.
        &nbsp;▲ above peers &nbsp;·&nbsp; ▼ below peers
      </div>

      {/* Stats sections */}
      {STAT_ROWS.map(s => {
        const leagueEntries = Object.entries(profile[s.leagueKey] || {});
        const avg = peersAvg(profile[s.leagueKey]);
        return (
          <div key={s.key} style={{
            background: isRetired ? "rgba(13,33,55,0.4)" : "rgba(13,33,55,0.7)",
            border: `1px solid ${isRetired ? "rgba(120,120,120,0.15)" : "rgba(29,158,117,0.2)"}`,
            borderRadius: 14, padding: "20px 24px", marginBottom: 16,
            opacity: isRetired ? 0.75 : 1,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: isRetired ? "rgba(232,245,233,0.4)" : s.color, marginBottom: 16 }}>
              {s.label}
            </div>

            {/* Overall chips */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              <StatChip
                label="Referee Avg / Game"
                sublabel="3-season rolling avg"
                value={Number(profile[s.gameKey]).toFixed(s.decimals > 1 ? 3 : 1)}
                color={isRetired ? "rgba(232,245,233,0.35)" : s.color}
              />
              <StatChip
                label="Peers Avg / Game"
                sublabel="all referees · same leagues"
                value={avg != null ? avg.toFixed(s.decimals > 1 ? 3 : 1) : "—"}
                color="rgba(232,245,233,0.45)"
              />
            </div>

            {/* Per-league breakdown */}
            <div style={{ fontSize: 11, color: "rgba(232,245,233,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              By League
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leagueEntries.map(([league, vals]) => {
                const above = vals.per_game > vals.league_avg;
                const pct   = Math.abs((vals.per_game - vals.league_avg) / vals.league_avg * 100).toFixed(1);
                return (
                  <div key={league} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: 12, background: "rgba(10,22,40,0.35)", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 13, color: "rgba(232,245,233,0.7)" }}>{league}</div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isRetired ? "rgba(232,245,233,0.35)" : s.color }}>
                        {Number(vals.per_game).toFixed(s.decimals > 1 ? 3 : 1)}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(232,245,233,0.3)", marginLeft: 4 }}>ref</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, color: "rgba(232,245,233,0.4)" }}>
                        {Number(vals.league_avg).toFixed(s.decimals > 1 ? 3 : 1)}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(232,245,233,0.25)", marginLeft: 4 }}>peers</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: above ? "#ef9a9a" : "#80cbc4", minWidth: 52, textAlign: "right" }}>
                      {above ? "▲" : "▼"} {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Comments */}
      {profile.comments && (
        <div style={{
          background: isRetired ? "rgba(13,33,55,0.4)" : "rgba(13,33,55,0.7)",
          border: `1px solid ${isRetired ? "rgba(120,120,120,0.15)" : "rgba(29,158,117,0.2)"}`,
          borderRadius: 14, padding: "20px 24px",
          opacity: isRetired ? 0.75 : 1,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#5ecda4", marginBottom: 10 }}>Comments</div>
          <div style={{ fontSize: 13, color: "rgba(232,245,233,0.75)", lineHeight: 1.7 }}>{profile.comments}</div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, sublabel, value, color }) {
  return (
    <div style={{ background: "rgba(10,22,40,0.5)", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(232,245,233,0.4)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 10, color: "rgba(255,152,0,0.5)", marginTop: 1 }}>{sublabel}</div>
    </div>
  );
}

function RequestForm() {
  const [refereeName, setRefereeName] = useState("");
  const [reason, setReason] = useState("");
  const [additionalFields, setAdditionalFields] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("You must be signed in to submit a request."); return; }
      const { error: insertError } = await supabase.from("referee_profile_requests").insert({
        requester_id: session.user.id,
        requester_email: session.user.email,
        referee_name: refereeName.trim(),
        reason: reason.trim(),
        additional_fields: additionalFields.trim() || null,
      });
      if (insertError) throw insertError;
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#5ecda4", marginBottom: 8 }}>Request Submitted</div>
        <div style={{ fontSize: 13, color: "rgba(232,245,233,0.55)", lineHeight: 1.6 }}>
          Your request has been sent to the admin for review.<br />
          A profile will be created if approved.
        </div>
        <button
          onClick={() => { setSuccess(false); setRefereeName(""); setReason(""); setAdditionalFields(""); }}
          style={{ marginTop: 24, padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(29,158,117,0.35)", background: "transparent", color: "#5ecda4", fontSize: 14, cursor: "pointer" }}
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#e8f5e9", marginBottom: 6 }}>Request a New Referee Profile</div>
        <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", lineHeight: 1.6 }}>
          All requests are reviewed by an admin. Upon approval, a profile will be automatically created with the standard fields
          (name, country, age, date and place of birth, leagues, active status, rolling 3-season statistics, and comments).
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>Referee Name *</label>
          <input value={refereeName} onChange={e => setRefereeName(e.target.value)} placeholder="e.g. Anthony Taylor" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Reason for Request *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why should this referee be profiled? (e.g. regular in Champions League, upcoming World Cup assignment…)" required rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 100, fontFamily: "inherit" }} />
        </div>
        <div>
          <label style={labelStyle}>Additional Fields or Notes (optional)</label>
          <textarea value={additionalFields} onChange={e => setAdditionalFields(e.target.value)} placeholder="Any extra fields you'd like to see in this profile, or additional context for the admin…" rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80, fontFamily: "inherit" }} />
        </div>
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(183,28,28,0.1)", border: "1px solid rgba(239,83,80,0.3)", color: "#ef9a9a", fontSize: 13 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !refereeName.trim() || !reason.trim()}
          style={{
            padding: "12px 28px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600,
            cursor: submitting || !refereeName.trim() || !reason.trim() ? "default" : "pointer",
            background: submitting || !refereeName.trim() || !reason.trim() ? "rgba(29,158,117,0.3)" : "linear-gradient(135deg, #0e7a58, #1d9e75)",
            color: "#fff", alignSelf: "flex-start",
          }}
        >
          {submitting ? "Submitting…" : "Submit for Admin Approval"}
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "rgba(232,245,233,0.55)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 };
const inputStyle = { width: "100%", background: "rgba(10,22,40,0.6)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: 10, color: "#e8f5e9", fontSize: 14, padding: "11px 14px", outline: "none", boxSizing: "border-box", fontFamily: "system-ui, -apple-system, sans-serif" };

export default function RefereeStatistics() {
  const [subView, setSubView] = useState("profiles");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [dbProfiles, setDbProfiles] = useState([]);

  useEffect(() => {
    supabase
      .from('referee_profiles')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setDbProfiles(data.map(p => ({ ...p, flag_code: p.flag })));
        }
      });
  }, []);

  const staticNameSet = new Set(STATIC_PROFILES.map(p => p.name.toLowerCase()));
  const extraDbProfiles = dbProfiles.filter(p => !staticNameSet.has(p.name.toLowerCase()));
  const allProfiles = [...STATIC_PROFILES, ...extraDbProfiles];

  const active  = allProfiles.filter(p => p.active);
  const retired = allProfiles.filter(p => !p.active);
  const ordered = [...active, ...retired];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "transparent", color: "#e8f5e9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px 0 120px", background: "rgba(10,22,40,0.95)", borderBottom: "1px solid rgba(29,158,117,0.2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, background: "linear-gradient(135deg, #1d9e75, #5ecda4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
          📈 Referee Statistics
        </h1>
        <p style={{ fontSize: 13, color: "rgba(232,245,233,0.6)", marginBottom: 16 }}>
          Referee profiles and performance statistics
        </p>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ id: "profiles", label: "Existing Profiles" }, { id: "request", label: "Request New Profile" }].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setSubView(tab.id); setSelectedProfile(null); }}
              style={{
                padding: "9px 20px", borderRadius: "8px 8px 0 0", border: "1px solid", borderBottom: "none",
                borderColor: subView === tab.id ? "rgba(29,158,117,0.4)" : "transparent",
                background: subView === tab.id ? "rgba(29,158,117,0.12)" : "transparent",
                color: subView === tab.id ? "#5ecda4" : "rgba(232,245,233,0.5)",
                fontSize: 13, fontWeight: subView === tab.id ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 32px", flex: 1 }}>
        {subView === "profiles" && (
          selectedProfile ? (
            <ProfileDetail profile={selectedProfile} onBack={() => setSelectedProfile(null)} />
          ) : (
            <>
              <div style={{ fontSize: 12, color: "rgba(232,245,233,0.35)", marginBottom: 20 }}>
                Active referees listed first. Click any card to view full league breakdown.
                &nbsp;<span style={{ color: "#ffb74d" }}>EST</span> = rolling 3-season estimate.
                &nbsp;<span style={{ color: "#ef9a9a" }}>▲</span> above peers &nbsp;·&nbsp; <span style={{ color: "#80cbc4" }}>▼</span> below peers.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
                {ordered.map(p => (
                  <ProfileCard key={p.id} profile={p} onClick={() => setSelectedProfile(p)} />
                ))}
              </div>
            </>
          )
        )}
        {subView === "request" && <RequestForm />}
      </div>
    </div>
  );
}
