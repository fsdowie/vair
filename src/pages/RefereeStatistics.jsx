import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

// ─── DATA ────────────────────────────────────────────────────────────────────
// Verified stats for Oliver and Taylor are derived from 50 and 53 match records
// respectively (Sep/Oct 2023–Oct 2025, sourced from detailed match statistics).
// Fouls, YC, RC are verified. Penalties are estimated (not tracked in source).
// All other profiles use publicly available/estimated figures.

const STATIC_PROFILES = [
  {
    id: "1",
    name: "Michael Oliver",
    country: "England",
    flag_code: "gb-eng",
    age: 41,
    date_of_birth: "1985-03-25",
    place_of_birth: "Ashington, Northumberland, England",
    leagues: ["Premier League", "UEFA Champions League", "UEFA Conference League", "Euro 2024", "FIFA Club World Cup"],
    active: true,
    data_source: "verified",
    source_note: "50 match records (Sep 2023–Oct 2025) from official match statistics",
    verified_matches: 50,
    fouls_per_game: 24.0,
    yellow_per_game: 4.42,
    red_per_game: 0.16,
    penalties_per_game: 0.22,
    penalties_estimated: true,
    // League-level breakdown — matches and per-game avg (verified); league_avg from published sources
    stat_by_league: {
      "Premier League":           { fouls: 23.9, yc: 4.95, rc: 0.14, matches: 21, fouls_la: 21.0, yc_la: 3.6, rc_la: 0.09 },
      "UEFA Champions League":    { fouls: 23.8, yc: 4.53, rc: 0.18, matches: 17, fouls_la: 22.5, yc_la: 3.3, rc_la: 0.14 },
      "UEFA Conference League":   { fouls: 29.5, yc: 5.0,  rc: 0.50, matches: 2,  fouls_la: 22.0, yc_la: 3.2, rc_la: 0.12 },
      "Euro 2024":                { fouls: 22.0, yc: 1.5,  rc: 0.00, matches: 4,  fouls_la: 22.5, yc_la: 2.8, rc_la: 0.11 },
      "FIFA Club World Cup":      { fouls: 27.0, yc: 5.0,  rc: 0.00, matches: 2,  fouls_la: 24.0, yc_la: 3.5, rc_la: 0.15 },
    },
    // Verified stats grouped by competition intensity tier
    competition_tendency: {
      domestic: {
        label: "Premier League",
        matches: 21,
        fouls: 23.9, yc: 4.95, rc: 0.14,
        note: "Highest card rate across all competition types. Reflects PL's pace and physicality. Oliver maintains verbal control but books more frequently in the league's condensed schedule.",
      },
      continental: {
        label: "UEFA Club Competitions (UCL + Conf. League)",
        matches: 19,
        fouls: 24.4, yc: 4.58, rc: 0.21,
        note: "Similar fouls to PL but red card rate rises in European knockout pressure. Oliver stays composed — the higher RC reflects genuine serious foul play rather than strict card use.",
      },
      international: {
        label: "International & Major Tournaments",
        matches: 10,
        fouls: 23.5, yc: 3.0, rc: 0.10,
        note: "Markedly fewer yellows at the international level. Oliver exercises maximum patience with elite players, reserving cards for clear infringements. His Euro 2024 matches were especially controlled.",
      },
    },
    refereeing_style: {
      summary: "Oliver is widely regarded as one of the most complete modern referees. He combines technical excellence with authoritative game management and exceptional emotional intelligence on the pitch. His card rate in Premier League football reflects controlled decisiveness — he books when needed, but verbal communication is always his first tool.",
      traits: ["Strong communicator", "Excellent advantage play", "Positions close to challenges", "Composed under pressure", "High respect from top players"],
      game_management: "Oliver uses pre-emptive communication to prevent situations from escalating. He speaks to players individually and calmly before reaching for cards. His proximity to play — maintained by elite fitness — allows him to assess challenges with high accuracy and make faster, more confident decisions. In European matches, his patience is even greater, trusting top-level players to self-regulate.",
      learning_notes: "Study Oliver's body language during disputes: he stays upright, moves toward the incident, and speaks first. Authority comes from consistency, not volume. His advantage application is particularly instructive — he delays the whistle a fraction of a second longer than most, allowing more genuine attacking opportunities to develop before deciding.",
    },
    comments: "Officiated at Euro 2024 (Portugal vs France, Germany vs Denmark, Slovakia vs Ukraine, Spain vs Croatia) and the 2025 FIFA Club World Cup. Consistently rated among the top referees in the world by UEFA's referee committee.",
  },

  {
    id: "5",
    name: "Anthony Taylor",
    country: "England",
    flag_code: "gb-eng",
    age: 46,
    date_of_birth: "1979-09-22",
    place_of_birth: "Wythenshawe, Manchester, England",
    leagues: ["Premier League", "UEFA Champions League", "UEFA Europa League", "UEFA Conference League", "UEFA Nations League", "Euro 2024", "FIFA Club World Cup"],
    active: true,
    data_source: "verified",
    source_note: "53 match records (Oct 2023–Oct 2025) from official match statistics",
    verified_matches: 53,
    fouls_per_game: 22.3,
    yellow_per_game: 3.77,
    red_per_game: 0.26,
    penalties_per_game: 0.21,
    penalties_estimated: true,
    stat_by_league: {
      "Premier League":           { fouls: 21.4, yc: 3.0,  rc: 0.12, matches: 25, fouls_la: 21.0, yc_la: 3.6, rc_la: 0.09 },
      "UEFA Champions League":    { fouls: 22.1, yc: 4.17, rc: 0.17, matches: 12, fouls_la: 22.5, yc_la: 3.3, rc_la: 0.14 },
      "UEFA Conference League":   { fouls: 26.0, yc: 4.5,  rc: 1.00, matches: 2,  fouls_la: 22.0, yc_la: 3.2, rc_la: 0.12 },
      "UEFA Europa League":       { fouls: 23.0, yc: 3.33, rc: 0.67, matches: 3,  fouls_la: 22.5, yc_la: 3.4, rc_la: 0.13 },
      "Euro 2024":                { fouls: 25.3, yc: 5.67, rc: 0.33, matches: 3,  fouls_la: 22.5, yc_la: 2.8, rc_la: 0.11 },
      "FIFA Club World Cup":      { fouls: 26.0, yc: 4.67, rc: 0.67, matches: 3,  fouls_la: 24.0, yc_la: 3.5, rc_la: 0.15 },
      "UEFA Nations League":      { fouls: 24.5, yc: 4.0,  rc: 0.00, matches: 2,  fouls_la: 21.5, yc_la: 2.9, rc_la: 0.10 },
    },
    competition_tendency: {
      domestic: {
        label: "Premier League",
        matches: 25,
        fouls: 21.4, yc: 3.0, rc: 0.12,
        note: "Taylor's most measured environment. Domestic league play sees his lowest card rate — he allows physicality to go unpunished more than in European games, calibrating to PL culture.",
      },
      continental: {
        label: "UEFA Club Competitions (UCL + EL + Conf. League)",
        matches: 17,
        fouls: 22.7, yc: 4.18, rc: 0.35,
        note: "Card rate rises notably in European competition. The higher RC rate (0.35 vs 0.12 in PL) reflects stricter enforcement of serious foul play and DOGSO calls in high-stakes knockout matches.",
      },
      international: {
        label: "International Tournaments & Major Competitions",
        matches: 11,
        fouls: 23.9, yc: 5.09, rc: 0.45,
        note: "Taylor's most decisive environment. Euro 2024 and Club World Cup assignments show significantly elevated card rates — reflecting both increased aggression at major tournaments and Taylor's trust in issuing cards when warranted at the highest level.",
      },
    },
    refereeing_style: {
      summary: "Taylor brings high energy and excellent fitness to his officiating, maintaining close proximity to attacking transitions. His approach is deliberately calibrated to match context — measured in domestic league play but decisive and firm in high-profile tournament assignments. His appointment to Spain vs Germany at Euro 2024 (15 cards) reflected FIFA's trust in his ability to handle the highest-pressure moments.",
      traits: ["High fitness level", "Strong positioning near transitions", "Context-sensitive card use", "Firm in major tournament matches", "Clear and audible communication"],
      game_management: "Taylor manages games through vocal presence and close positioning rather than purely through card use. His domestic leniency is not inconsistency — it is deliberate calibration to the Premier League environment where experienced players expect more latitude. In tournament matches, he shifts to a firmer threshold, establishing authority early. His offside positioning and foul distance judgments are particularly strong.",
      learning_notes: "Taylor illustrates an important principle: a referee's card rate should reflect the competition context, not a fixed personal threshold. Notice how his game management tone changes between a mid-table Premier League game and a UCL knockout match. Aspiring referees should study how he establishes early control in the first 10 minutes of high-pressure fixtures — body language, whistle timing, and player positioning.",
    },
    comments: "FIFA-badged referee since approximately 2013. Officiated at Euro 2024 including the Spain 2-1 Germany quarter-final — one of the most high-profile matches of the tournament. Also selected for the 2025 FIFA Club World Cup. Consistently appointed to PGMOL's most demanding Premier League fixtures.",
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
    data_source: "estimated",
    source_note: "Estimated from public MLS officiating records and CONCACAF match reports",
    verified_matches: null,
    fouls_per_game: 21.3,
    yellow_per_game: 3.1,
    red_per_game: 0.09,
    penalties_per_game: 0.20,
    penalties_estimated: true,
    stat_by_league: {
      "MLS":                    { fouls: 21.3, yc: 3.1, rc: 0.09, matches: null, fouls_la: 20.5, yc_la: 3.0, rc_la: 0.08 },
      "CONCACAF Champions Cup": { fouls: 20.1, yc: 2.8, rc: 0.13, matches: null, fouls_la: 21.0, yc_la: 3.1, rc_la: 0.11 },
      "US Open Cup":            { fouls: 19.8, yc: 2.5, rc: 0.10, matches: null, fouls_la: 20.2, yc_la: 2.9, rc_la: 0.07 },
    },
    competition_tendency: {
      domestic: {
        label: "MLS Regular Season",
        matches: null,
        fouls: 21.3, yc: 3.1, rc: 0.09,
        note: "Consistent card threshold across MLS's mixed playing cultures. Adapts communication style to multi-language environments common in MLS.",
      },
      continental: {
        label: "CONCACAF Champions Cup",
        matches: null,
        fouls: 20.1, yc: 2.8, rc: 0.13,
        note: "Slightly firmer in CONCACAF competition where Central American and Caribbean teams play at high physical intensity. Red card rate increases in knockout stages.",
      },
      international: {
        label: "US Open Cup / CONCACAF Qualifiers",
        matches: null,
        fouls: 19.8, yc: 2.5, rc: 0.10,
        note: "Domestic cup play tends toward fewer cards — player pools and reduced intensity outside major competitions.",
      },
    },
    refereeing_style: {
      summary: "Rivas is a methodical and patient MLS official known for handling the league's diverse mix of playing cultures — from South American physicality to North American athleticism. He has developed a strong read of MLS match tempo and communicates effectively across language barriers.",
      traits: ["Methodical decision-making", "Cross-cultural communication", "Patient in physical play", "CONCACAF experience", "Consistent domestic standard"],
      game_management: "Rivas manages games through clear signals and decisive positioning rather than excessive card use. His MLS experience gives him strong pattern recognition for the timing of challenges and the temperature of disputes. In CONCACAF matches, he elevates his firmness early to prevent escalation.",
      learning_notes: "Rivas demonstrates the importance of multilingual awareness in refereeing. In diverse leagues like MLS, a referee who can communicate with players in their own language — or at minimum use universal gesture and tone — gains enormous trust. Study how top MLS referees establish presence in the first minutes with teams from different footballing cultures.",
    },
    comments: "MLS referee recognized for consistent officiating in high-pressure CONCACAF competition matches. Biographical details including date of birth are not confirmed in public records.",
  },

  {
    id: "3",
    name: "Ismail Elfath",
    country: "USA",
    flag_code: "us",
    age: 45,
    date_of_birth: "1981-03-18",
    place_of_birth: "Casablanca, Morocco (raised in USA)",
    leagues: ["MLS", "CONCACAF Champions Cup", "Copa America 2024", "FIFA International"],
    active: true,
    data_source: "estimated",
    source_note: "Estimated from MLS officiating records, CONCACAF and Copa America 2024 match reports",
    verified_matches: null,
    fouls_per_game: 20.8,
    yellow_per_game: 3.2,
    red_per_game: 0.10,
    penalties_per_game: 0.22,
    penalties_estimated: true,
    stat_by_league: {
      "MLS":                    { fouls: 20.8, yc: 3.2, rc: 0.10, matches: null, fouls_la: 20.5, yc_la: 3.0, rc_la: 0.08 },
      "CONCACAF Champions Cup": { fouls: 19.6, yc: 3.0, rc: 0.13, matches: null, fouls_la: 21.0, yc_la: 3.1, rc_la: 0.11 },
      "Copa America / FIFA Intl": { fouls: 21.4, yc: 3.6, rc: 0.15, matches: null, fouls_la: 22.3, yc_la: 3.3, rc_la: 0.13 },
    },
    competition_tendency: {
      domestic: {
        label: "MLS Regular Season",
        matches: null,
        fouls: 20.8, yc: 3.2, rc: 0.10,
        note: "Calm and controlled in domestic league. Below-average fouls per game reflects his positioning — he often avoids calling borderline challenges in flow situations.",
      },
      continental: {
        label: "CONCACAF Champions Cup",
        matches: null,
        fouls: 19.6, yc: 3.0, rc: 0.13,
        note: "Slightly fewer fouls but higher RC rate in CONCACAF — he tends to let physical play continue but acts decisively when serious fouls occur.",
      },
      international: {
        label: "Copa America & FIFA International",
        matches: null,
        fouls: 21.4, yc: 3.6, rc: 0.15,
        note: "International assignments show elevated but controlled card use. Copa America 2024 group stage demonstrated his ability to manage technically skilled teams under scrutiny.",
      },
    },
    refereeing_style: {
      summary: "Elfath made history as the first Moroccan-American to earn a FIFA referee badge. His calm, composed demeanor and precise positioning have earned him trust at the highest levels of CONCACAF competition. He officiated at Copa America 2024 — a testament to his technical ability under scrutiny.",
      traits: ["Calm under pressure", "Precise challenge assessment", "Cultural versatility", "Strong FIFA-level fitness", "Respected in CONCACAF"],
      game_management: "Elfath's approach centres on reading the game early and positioning to be in the best possible angle for decisions. He uses minimal but effective verbal communication, letting his body positioning signal authority. His advantage play is deliberate and well-timed. In CONCACAF competition, he establishes early control by being decisive in the first contested physical challenge.",
      learning_notes: "Elfath shows how diversity of background can be an asset in refereeing. His bilingual Arabic-English capability helps in international matches. More broadly, his career path — from lower-tier American soccer to Copa America — is a model for how consistent domestic performance builds toward international appointments. Study his pre-match positioning habits.",
    },
    comments: "One of the top FIFA-badged referees from the USA. Officiated at Copa America 2024 group stage matches and multiple CONCACAF Champions Cup fixtures. His career path from MLS to international competition is a model for North American referees.",
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
    data_source: "estimated",
    source_note: "Estimated from AFA match records and CONMEBOL Copa Libertadores match reports",
    verified_matches: null,
    fouls_per_game: 27.5,
    yellow_per_game: 4.2,
    red_per_game: 0.14,
    penalties_per_game: 0.26,
    penalties_estimated: true,
    stat_by_league: {
      "Argentine Primera División": { fouls: 27.5, yc: 4.2, rc: 0.14, matches: null, fouls_la: 26.8, yc_la: 4.0, rc_la: 0.13 },
      "Copa Argentina":             { fouls: 26.8, yc: 3.9, rc: 0.10, matches: null, fouls_la: 26.0, yc_la: 3.8, rc_la: 0.12 },
      "Copa Libertadores":          { fouls: 25.2, yc: 3.7, rc: 0.20, matches: null, fouls_la: 24.5, yc_la: 3.5, rc_la: 0.16 },
    },
    competition_tendency: {
      domestic: {
        label: "Argentine Primera División",
        matches: null,
        fouls: 27.5, yc: 4.2, rc: 0.14,
        note: "Among the highest foul counts in the dataset — reflecting Argentine domestic football's intense physical culture. Herrera's threshold aligns with the league norm; he controls escalation through strong presence rather than frequent interruption.",
      },
      continental: {
        label: "Copa Libertadores",
        matches: null,
        fouls: 25.2, yc: 3.7, rc: 0.20,
        note: "Slightly fewer fouls but notably higher RC rate in the Libertadores. Heightened aggression in continental knockout football leads to more serious foul play situations requiring red cards.",
      },
      international: {
        label: "Copa Argentina",
        matches: null,
        fouls: 26.8, yc: 3.9, rc: 0.10,
        note: "Domestic cup play mirrors the Primera División in foul intensity but with fewer sending offs — rivalry matches aside, cup knockout fixtures tend to produce more controlled aggression.",
      },
    },
    refereeing_style: {
      summary: "Herrera operates in one of the most emotionally charged football environments in the world. Argentine domestic football demands a referee with commanding physical presence, excellent reading of player psychology, and the ability to de-escalate volatile situations quickly. His Copa Libertadores appointments reflect CONMEBOL's confidence in his ability to manage South American continental competition.",
      traits: ["Commanding physical presence", "High physicality tolerance", "Quick to manage dissent", "Strong voice control", "CONMEBOL trusted official"],
      game_management: "In Argentine football, a referee must establish dominance in the first 5 minutes or risk losing control. Herrera manages this through decisive early calls — particularly in 50-50 challenges — that signal he will award fouls consistently. He is firmer on dissent than on physicality; Argentine players expect physical play to continue, but vocal protests are closed down quickly. His proximity to clusters is key.",
      learning_notes: "Herrera's game management is a masterclass in cultural adaptation. Argentine football has its own unwritten code — referees who try to impose European standards often struggle. Watch how he handles the post-foul moment: his immediate approach to the fouling player and calm but firm tone prevents the 5-on-1 confrontation that characterises poorly managed Argentine matches. Copa Libertadores is an advanced version — even higher pressure, even quicker de-escalation needed.",
    },
    comments: "Experienced Argentine referee operating in one of South America's most intense domestic environments. Copa Libertadores assignments place him among CONMEBOL's most trusted officials for high-volatility matches.",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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

function SourceBadge({ profile, small = false }) {
  const verified = profile.data_source === "verified";
  return (
    <span style={{
      fontSize: small ? 10 : 11, fontWeight: 700,
      padding: small ? "1px 6px" : "2px 8px", borderRadius: 10,
      background: verified ? "rgba(29,158,117,0.12)" : "rgba(255,152,0,0.12)",
      border: `1px solid ${verified ? "rgba(29,158,117,0.35)" : "rgba(255,152,0,0.3)"}`,
      color: verified ? "#5ecda4" : "#ffb74d",
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      {verified ? `✓ ${profile.verified_matches} matches` : "EST"}
    </span>
  );
}

function PenEstBadge() {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 8,
      background: "rgba(255,152,0,0.1)", border: "1px solid rgba(255,152,0,0.25)",
      color: "#ffb74d", letterSpacing: "0.04em",
    }}>
      est.
    </span>
  );
}

function DeltaBadge({ ref_val, avg_val }) {
  if (avg_val == null || avg_val === 0) return null;
  const diff = ref_val - avg_val;
  const pct = Math.abs(diff / avg_val * 100).toFixed(1);
  const above = diff > 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 5, color: above ? "#ef9a9a" : "#80cbc4" }}>
      {above ? "▲" : "▼"} {pct}%
    </span>
  );
}

// Card on the grid list
function ProfileCard({ profile, onClick }) {
  const isRetired = !profile.active;
  const verified = profile.data_source === "verified";

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
      {/* Name row */}
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
        <div style={{ fontSize: 12, color: "rgba(232,245,233,0.4)", marginBottom: 10 }}>
          Age {profile.age} &nbsp;·&nbsp; b. {new Date(profile.date_of_birth).getFullYear()}
        </div>
      )}

      {/* Leagues */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
        {profile.leagues.slice(0, 4).map(l => (
          <span key={l} style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 10,
            background: isRetired ? "rgba(120,120,120,0.07)" : "rgba(29,158,117,0.08)",
            border: `1px solid ${isRetired ? "rgba(120,120,120,0.18)" : "rgba(29,158,117,0.18)"}`,
            color: "rgba(232,245,233,0.5)",
          }}>
            {l}
          </span>
        ))}
        {profile.leagues.length > 4 && (
          <span style={{ fontSize: 10, color: "rgba(232,245,233,0.3)" }}>+{profile.leagues.length - 4} more</span>
        )}
      </div>

      {/* Key stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Fouls/game", val: profile.fouls_per_game.toFixed(1), color: "#5ecda4", est: false },
          { label: "Yellow cards", val: profile.yellow_per_game.toFixed(2), color: "#ffd600", est: false },
          { label: "Red cards", val: profile.red_per_game.toFixed(3), color: "#ef5350", est: false },
          { label: "Penalties", val: profile.penalties_per_game.toFixed(3), color: "#ff9800", est: true },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(10,22,40,0.4)", borderRadius: 8, padding: "8px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: "rgba(232,245,233,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
              {(s.est || (verified === false)) && <PenEstBadge />}
              {!s.est && verified && <span style={{ fontSize: 9, color: "#5ecda4" }}>✓</span>}
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: isRetired ? "rgba(232,245,233,0.35)" : s.color }}>
              {s.val}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SourceBadge profile={profile} small />
        <span style={{ fontSize: 12, color: isRetired ? "rgba(232,245,233,0.3)" : "rgba(94,205,164,0.7)" }}>
          View full profile →
        </span>
      </div>
    </div>
  );
}

// ─── PROFILE DETAIL ───────────────────────────────────────────────────────────

function TierRow({ tier, color = "#5ecda4" }) {
  return (
    <div style={{ background: "rgba(10,22,40,0.4)", borderRadius: 10, padding: "14px 18px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f5e9" }}>{tier.label}</div>
        {tier.matches && (
          <span style={{ fontSize: 11, color: "rgba(232,245,233,0.4)" }}>{tier.matches} matches</span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        {[
          { label: "Fouls", val: tier.fouls.toFixed(1), color: "#5ecda4" },
          { label: "YC", val: tier.yc.toFixed(2), color: "#ffd600" },
          { label: "RC", val: tier.rc.toFixed(3), color: "#ef5350" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "rgba(232,245,233,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}/game</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "rgba(232,245,233,0.5)", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
        {tier.note}
      </div>
    </div>
  );
}

function ProfileDetail({ profile, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const isRetired = !profile.active;
  const verified = profile.data_source === "verified";

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "style", label: "Style & Game Mgmt" },
    { id: "intensity", label: "Match Intensity" },
    { id: "leagues", label: "By Competition" },
  ];

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
              <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", marginTop: 4 }}>
                Born {new Date(profile.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                {profile.place_of_birth && <> &nbsp;·&nbsp; {profile.place_of_birth}</>}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "rgba(232,245,233,0.35)", fontStyle: "italic", marginTop: 4 }}>
                Date and place of birth not confirmed in public records
              </div>
            )}
            {profile.age && (
              <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", marginTop: 2 }}>Age: {profile.age}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span style={{
              fontSize: 13, fontWeight: 700, padding: "6px 16px", borderRadius: 20,
              background: profile.active ? "rgba(29,158,117,0.15)" : "rgba(120,120,120,0.12)",
              color: profile.active ? "#5ecda4" : "rgba(232,245,233,0.4)",
              border: `1px solid ${profile.active ? "rgba(29,158,117,0.3)" : "rgba(120,120,120,0.25)"}`,
            }}>
              {profile.active ? "Active" : "Retired"}
            </span>
            <SourceBadge profile={profile} />
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 7 }}>
          {profile.leagues.map(l => (
            <span key={l} style={{
              fontSize: 12, padding: "4px 12px", borderRadius: 14,
              background: isRetired ? "rgba(120,120,120,0.08)" : "rgba(29,158,117,0.1)",
              border: `1px solid ${isRetired ? "rgba(120,120,120,0.2)" : "rgba(29,158,117,0.22)"}`,
              color: "rgba(232,245,233,0.7)",
            }}>
              {l}
            </span>
          ))}
        </div>

        {/* Data source note */}
        <div style={{ marginTop: 14, padding: "8px 14px", borderRadius: 8, background: verified ? "rgba(29,158,117,0.06)" : "rgba(255,152,0,0.06)", border: `1px solid ${verified ? "rgba(29,158,117,0.2)" : "rgba(255,152,0,0.2)"}`, fontSize: 11, color: verified ? "#5ecda4" : "#ffb74d" }}>
          {verified
            ? `✓ Fouls, yellow cards and red cards verified from ${profile.verified_matches} match records. ${profile.source_note}. Penalties marked est.`
            : `Figures are estimates based on public records. ${profile.source_note}.`}
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid",
              borderColor: activeTab === t.id ? "rgba(29,158,117,0.4)" : "rgba(255,255,255,0.08)",
              background: activeTab === t.id ? "rgba(29,158,117,0.12)" : "transparent",
              color: activeTab === t.id ? "#5ecda4" : "rgba(232,245,233,0.5)",
              fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div>
          {/* Stat chips */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Fouls / game", val: profile.fouls_per_game.toFixed(1), color: "#5ecda4", est: !verified },
              { label: "Yellow cards", val: profile.yellow_per_game.toFixed(2), color: "#ffd600", est: !verified },
              { label: "Red cards", val: profile.red_per_game.toFixed(3), color: "#ef5350", est: !verified },
              { label: "Penalties", val: profile.penalties_per_game.toFixed(3), color: "#ff9800", est: true },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(10,22,40,0.5)", borderRadius: 10, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "rgba(232,245,233,0.45)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                <div style={{ marginTop: 4 }}>
                  {s.est ? <PenEstBadge /> : <span style={{ fontSize: 9, color: "#5ecda4" }}>✓ verified</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Comments */}
          {profile.comments && (
            <div style={{
              background: "rgba(13,33,55,0.7)", border: "1px solid rgba(29,158,117,0.2)",
              borderRadius: 14, padding: "18px 22px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#5ecda4", marginBottom: 8 }}>Background</div>
              <div style={{ fontSize: 13, color: "rgba(232,245,233,0.75)", lineHeight: 1.7 }}>{profile.comments}</div>
            </div>
          )}
        </div>
      )}

      {/* ── STYLE TAB ── */}
      {activeTab === "style" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary */}
          <div style={{ background: "rgba(13,33,55,0.7)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#5ecda4", marginBottom: 10 }}>Officiating Style</div>
            <div style={{ fontSize: 14, color: "rgba(232,245,233,0.85)", lineHeight: 1.75 }}>{profile.refereeing_style.summary}</div>
          </div>

          {/* Traits */}
          <div style={{ background: "rgba(13,33,55,0.7)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#5ecda4", marginBottom: 12 }}>Key Traits</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.refereeing_style.traits.map(t => (
                <span key={t} style={{
                  fontSize: 12, padding: "5px 13px", borderRadius: 20,
                  background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.28)",
                  color: "#5ecda4",
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Game management */}
          <div style={{ background: "rgba(13,33,55,0.7)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#5ecda4", marginBottom: 10 }}>Game Management Approach</div>
            <div style={{ fontSize: 13, color: "rgba(232,245,233,0.8)", lineHeight: 1.75 }}>{profile.refereeing_style.game_management}</div>
          </div>

          {/* Learning note — highlighted for referees */}
          <div style={{ background: "rgba(10,30,15,0.6)", border: "1px solid rgba(29,158,117,0.35)", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#5ecda4" }}>Learning Note for Referees</div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(232,245,233,0.8)", lineHeight: 1.75 }}>{profile.refereeing_style.learning_notes}</div>
          </div>
        </div>
      )}

      {/* ── MATCH INTENSITY TAB ── */}
      {activeTab === "intensity" && (
        <div>
          <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", marginBottom: 18, lineHeight: 1.6 }}>
            How {profile.name.split(" ")[0]}'s statistics shift across competition intensity levels. This gives you an expectation of likely call patterns depending on match type.
            {!verified && <span style={{ color: "#ffb74d" }}> Figures are estimated from public records.</span>}
          </div>

          {/* Tier comparison visual */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 0, background: "rgba(10,22,40,0.5)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            {/* Header row */}
            <div style={{ padding: "10px 14px", fontSize: 11, color: "rgba(232,245,233,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Level</div>
            {["Fouls/game", "YC/game", "RC/game"].map(h => (
              <div key={h} style={{ padding: "10px 14px", fontSize: 11, color: "rgba(232,245,233,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>{h}</div>
            ))}
            {/* Data rows */}
            {[
              { key: "domestic", label: "Domestic", emoji: "🏠" },
              { key: "continental", label: "Continental", emoji: "🌍" },
              { key: "international", label: "Major Tournaments", emoji: "🏆" },
            ].map((row, i) => {
              const t = profile.competition_tendency[row.key];
              return [
                <div key={`l${i}`} style={{ padding: "12px 14px", fontSize: 12, color: "#e8f5e9", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{row.emoji}</span> {row.label}
                </div>,
                <div key={`f${i}`} style={{ padding: "12px 14px", textAlign: "center", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#5ecda4" }}>{t.fouls.toFixed(1)}</span>
                </div>,
                <div key={`y${i}`} style={{ padding: "12px 14px", textAlign: "center", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#ffd600" }}>{t.yc.toFixed(2)}</span>
                </div>,
                <div key={`r${i}`} style={{ padding: "12px 14px", textAlign: "center", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#ef5350" }}>{t.rc.toFixed(3)}</span>
                </div>,
              ];
            })}
          </div>

          {/* Tier details with notes */}
          {Object.entries(profile.competition_tendency).map(([key, tier]) => (
            <TierRow key={key} tier={tier} />
          ))}
        </div>
      )}

      {/* ── BY COMPETITION TAB ── */}
      {activeTab === "leagues" && (
        <div>
          <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", marginBottom: 18 }}>
            Per-competition breakdown with published league averages where available.
            <span style={{ color: "#5ecda4" }}> ✓</span> = verified from match records &nbsp;·&nbsp;
            <span style={{ color: "#ffb74d" }}> est.</span> = estimated figure
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(profile.stat_by_league).map(([league, vals]) => (
              <div key={league} style={{ background: "rgba(13,33,55,0.7)", border: "1px solid rgba(29,158,117,0.18)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8f5e9" }}>{league}</div>
                  {vals.matches
                    ? <span style={{ fontSize: 11, color: "#5ecda4" }}>✓ {vals.matches} matches</span>
                    : <span style={{ fontSize: 11, color: "#ffb74d" }}>est.</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {[
                    { label: "Fouls", ref: vals.fouls, la: vals.fouls_la, color: "#5ecda4", fmt: v => v.toFixed(1) },
                    { label: "Yellow Cards", ref: vals.yc, la: vals.yc_la, color: "#ffd600", fmt: v => v.toFixed(2) },
                    { label: "Red Cards", ref: vals.rc, la: vals.rc_la, color: "#ef5350", fmt: v => v.toFixed(3) },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(10,22,40,0.4)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "rgba(232,245,233,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.fmt(s.ref)}</span>
                        <DeltaBadge ref_val={s.ref} avg_val={s.la} />
                      </div>
                      {s.la != null && (
                        <div style={{ fontSize: 10, color: "rgba(232,245,233,0.3)", marginTop: 2 }}>
                          league avg: {s.fmt(s.la)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REQUEST FORM ─────────────────────────────────────────────────────────────

const BADGE_LEVELS = ["District / Local", "Regional", "National (domestic top division)", "FIFA International"];
const INTERESTS = [
  "Game management and communication style",
  "Card thresholds and discipline patterns",
  "Handling high-pressure/high-stakes matches",
  "Advantage play and fouls outside the box",
  "Positioning and fitness approach",
  "VAR interaction and decision review",
  "Other",
];

function RequestForm() {
  const [form, setForm] = useState({
    refereeName: "",
    country: "",
    badgeLevel: "",
    primaryLeague: "",
    notableMatches: "",
    styleInterest: "",
    dataSources: "",
    reason: "",
    priority: "Nice to have",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("You must be signed in to submit a request."); setSubmitting(false); return; }
      const { error: insertError } = await supabase.from("referee_profile_requests").insert({
        requester_id: session.user.id,
        requester_email: session.user.email,
        referee_name: form.refereeName.trim(),
        reason: [
          `Country: ${form.country}`,
          `Badge level: ${form.badgeLevel}`,
          `Primary league/competition: ${form.primaryLeague}`,
          `Notable matches: ${form.notableMatches}`,
          `Style interest: ${form.styleInterest}`,
          `Data sources: ${form.dataSources}`,
          `Priority: ${form.priority}`,
          `Reason: ${form.reason}`,
        ].filter(l => !l.endsWith(": ")).join("\n"),
        additional_fields: null,
      });
      if (insertError) throw insertError;
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
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
          onClick={() => { setSuccess(false); setForm({ refereeName: "", country: "", badgeLevel: "", primaryLeague: "", notableMatches: "", styleInterest: "", dataSources: "", reason: "", priority: "Nice to have" }); }}
          style={{ marginTop: 24, padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(29,158,117,0.35)", background: "transparent", color: "#5ecda4", fontSize: 14, cursor: "pointer" }}
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  const canSubmit = form.refereeName.trim() && form.reason.trim() && !submitting;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#e8f5e9", marginBottom: 6 }}>Request a New Referee Profile</div>
        <div style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", lineHeight: 1.6 }}>
          All requests are reviewed by an admin. The more detail you provide, the easier it is to build an accurate profile. Fields marked * are required.
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Name + Country */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Referee Full Name *</label>
            <input value={form.refereeName} onChange={e => set("refereeName", e.target.value)} placeholder="e.g. Anthony Taylor" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Country / Nationality</label>
            <input value={form.country} onChange={e => set("country", e.target.value)} placeholder="e.g. England" style={inputStyle} />
          </div>
        </div>

        {/* Badge level */}
        <div>
          <label style={labelStyle}>FIFA / Badge Level</label>
          <select value={form.badgeLevel} onChange={e => set("badgeLevel", e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
            <option value="">Select level…</option>
            {BADGE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Primary league */}
        <div>
          <label style={labelStyle}>Primary League / Competition</label>
          <input value={form.primaryLeague} onChange={e => set("primaryLeague", e.target.value)} placeholder="e.g. Premier League, MLS, Serie A, Copa Libertadores…" style={inputStyle} />
        </div>

        {/* Notable matches */}
        <div>
          <label style={labelStyle}>Notable Matches or Tournaments</label>
          <textarea value={form.notableMatches} onChange={e => set("notableMatches", e.target.value)} placeholder="World Cup, Euros, Champions League finals, high-profile domestic matches…" rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80, fontFamily: "inherit" }} />
        </div>

        {/* Style interest */}
        <div>
          <label style={labelStyle}>What aspect of their officiating are you most interested in?</label>
          <select value={form.styleInterest} onChange={e => set("styleInterest", e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
            <option value="">Select focus area…</option>
            {INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        {/* Data sources */}
        <div>
          <label style={labelStyle}>Known Data Sources or Public Statistics</label>
          <textarea value={form.dataSources} onChange={e => set("dataSources", e.target.value)} placeholder="Any Transfermarkt pages, official league stats, media profiles, or other sources you're aware of…" rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80, fontFamily: "inherit" }} />
        </div>

        {/* Reason */}
        <div>
          <label style={labelStyle}>Why should this referee be profiled? *</label>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="What would referees learn from studying this official? Why are they notable?" required rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 100, fontFamily: "inherit" }} />
        </div>

        {/* Priority */}
        <div>
          <label style={labelStyle}>Priority</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["Nice to have", "Would be useful", "High priority"].map(p => (
              <button key={p} type="button" onClick={() => set("priority", p)} style={{
                flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 12, cursor: "pointer",
                border: `1px solid ${form.priority === p ? "rgba(29,158,117,0.5)" : "rgba(29,158,117,0.18)"}`,
                background: form.priority === p ? "rgba(29,158,117,0.18)" : "transparent",
                color: form.priority === p ? "#5ecda4" : "rgba(232,245,233,0.45)",
                fontWeight: form.priority === p ? 700 : 400,
              }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(183,28,28,0.1)", border: "1px solid rgba(239,83,80,0.3)", color: "#ef9a9a", fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "12px 28px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600,
            cursor: canSubmit ? "pointer" : "default",
            background: canSubmit ? "linear-gradient(135deg, #0e7a58, #1d9e75)" : "rgba(29,158,117,0.3)",
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

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export default function RefereeStatistics() {
  const [subView, setSubView] = useState("profiles");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [dbProfiles, setDbProfiles] = useState([]);

  useEffect(() => {
    const loadProfiles = () => {
      supabase
        .from('referee_profiles')
        .select('*')
        .order('name')
        .then(({ data }) => {
          if (data) setDbProfiles(data.map(p => ({ ...p, flag_code: p.flag, data_source: "estimated", source_note: "Loaded from database" })));
        });
    };
    loadProfiles();
    const channel = supabase
      .channel('referee-profiles-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'referee_profiles' }, loadProfiles)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const staticNameSet = new Set(STATIC_PROFILES.map(p => p.name.toLowerCase()));
  const extraDbProfiles = dbProfiles.filter(p => !staticNameSet.has(p.name.toLowerCase()));
  const allProfiles = [...STATIC_PROFILES, ...extraDbProfiles];
  const active = allProfiles.filter(p => p.active);
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
          Referee profiles, verified match statistics, and game management analysis for referees studying at every level
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
              <div style={{ fontSize: 12, color: "rgba(232,245,233,0.35)", marginBottom: 20, lineHeight: 1.7 }}>
                Active referees listed first. Click any card to view full profile, style analysis, and match intensity context.
                &nbsp;<span style={{ color: "#5ecda4" }}>✓</span> = verified from match records &nbsp;·&nbsp;
                <span style={{ color: "#ffb74d" }}>est.</span> = estimated from public sources
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 18 }}>
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
