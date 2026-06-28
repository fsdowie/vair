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
    leagues: ["MLS", "CONCACAF Champions Cup", "Leagues Cup", "FIFA International Panel"],
    active: true,
    data_source: "public",
    source_note: "117+ career matches (statshub.com, 2026). YC/RC/penalties from public match database; fouls estimated (not publicly tracked).",
    verified_matches: 117,
    fouls_per_game: 21.3,
    fouls_estimated: true,
    yellow_per_game: 4.67,
    red_per_game: 0.09,
    penalties_per_game: 0.39,
    penalties_estimated: false,
    achievements: ["2023 MLS Referee of the Year", "FIFA International Panel since 2023"],
    stat_by_league: {
      // YC/RC/Pen from statshub.com career data. Fouls estimated.
      "MLS":                    { fouls: 21.3, yc: 4.67, rc: 0.09, penalties: 0.39, matches: 117, fouls_la: 20.5, yc_la: 3.6, rc_la: 0.09 },
      "Leagues Cup":            { fouls: 21.0, yc: 7.00, rc: 0.50, penalties: 0.50, matches: 2,   fouls_la: 21.0, yc_la: 3.8, rc_la: 0.13 },
      "CONCACAF Champions Cup": { fouls: 19.8, yc: 2.00, rc: 0.00, penalties: 0.00, matches: 1,   fouls_la: 21.0, yc_la: 3.2, rc_la: 0.11 },
    },
    competition_tendency: {
      domestic: {
        label: "MLS Regular Season",
        matches: 117,
        fouls: 21.3, yc: 4.67, rc: 0.09,
        note: "Rivas is strictly above the MLS average for yellow cards (4.67 vs league avg ~3.6). He issues cards frequently and consistently — named MLS Referee of the Year 2023 despite, or because of, his firm disciplinary approach. Low RC rate means he prefers accumulating yellows over escalating to red.",
      },
      continental: {
        label: "Leagues Cup & CONCACAF",
        matches: 3,
        fouls: 20.3, yc: 5.33, rc: 0.33,
        note: "Very small sample (3 matches total). Leagues Cup data shows elevated card counts (7 YC/game). CONCACAF CC is a single match. Use with caution — not enough matches to draw firm conclusions.",
      },
      international: {
        label: "FIFA International Appointments",
        matches: null,
        fouls: 21.0, yc: 4.50, rc: 0.15,
        note: "Joined the FIFA international panel in 2023 (2023 CONCACAF U-17 Championship). International data is limited; figures are extrapolated from his domestic profile and available international match records.",
      },
    },
    refereeing_style: {
      summary: "Rivas is one of MLS's most recognised and demanding officials. Named the 2023 MLS Referee of the Year, his 4.67 yellow cards per game average is well above the league norm — he brings consistent, firm discipline to every match. His career began while working as a swimming instructor in Piedmont, California, before joining PRO (Professional Referee Organization) as a full-time official.",
      traits: ["Above-average card rate", "Consistent foul threshold", "Cross-cultural communication", "Strong MLS presence", "2023 MLS Referee of the Year"],
      game_management: "Rivas manages the game through active card use rather than verbal warnings. His above-average YC rate signals that he does not issue as many 'warnings' before booking — players in his matches are expected to self-regulate sooner. This style can create a controlled environment where players know exactly what the threshold is, but it also means matches with Rivas tend to see more early yellows than average.",
      learning_notes: "Rivas illustrates a valid but demanding game management style: establish the standard immediately and enforce it consistently. Some referees prefer more warnings; Rivas uses cards as his primary tool for control. Study whether his approach produces more or fewer incidents per match compared to referees with lower card rates — the data suggests it can be equally effective at maintaining order when applied consistently from the first minute.",
    },
    comments: "Named 2023 MLS Referee of the Year by MLS and PRO — the first time he earned this distinction. MLS debut: May 2018 (Minnesota United vs San Jose Earthquakes). Joined FIFA international panel in 2023. Date of birth not confirmed in public records.",
  },

  {
    id: "3",
    name: "Ismail Elfath",
    country: "USA",
    flag_code: "us",
    age: 44,
    date_of_birth: "1982-03-03",
    place_of_birth: "Casablanca, Morocco (raised in USA)",
    leagues: ["MLS", "FIFA World Cup 2026", "FIFA World Cup 2022", "CONCACAF Champions Cup", "Leagues Cup"],
    active: true,
    data_source: "public",
    source_note: "249 career matches (statshub.com, 2026). YC/RC/penalties from public match database; fouls estimated (not publicly tracked).",
    verified_matches: 249,
    fouls_per_game: 20.8,
    fouls_estimated: true,
    yellow_per_game: 3.84,
    red_per_game: 0.14,
    penalties_per_game: 0.37,
    penalties_estimated: false,
    achievements: ["FIFA World Cup 2026 referee (Netherlands–Japan, Uruguay–Spain)", "4th official — 2022 FIFA World Cup Final", "2022 MLS Referee of the Year", "2020 MLS Referee of the Year", "2019 U-20 World Cup Final", "2025 Intercontinental Cup Final"],
    stat_by_league: {
      // YC/RC/Pen from statshub.com career data (249 matches). Fouls estimated.
      "MLS":                    { fouls: 20.8, yc: 3.86, rc: 0.14, penalties: 0.33, matches: 222, fouls_la: 20.5, yc_la: 3.6, rc_la: 0.09 },
      "FIFA World Cup":         { fouls: 22.0, yc: 4.50, rc: 0.25, penalties: 0.25, matches: 4,   fouls_la: 22.5, yc_la: 3.0, rc_la: 0.12 },
      "CONCACAF Champions Cup": { fouls: 19.6, yc: 4.00, rc: 0.00, penalties: 0.29, matches: 7,   fouls_la: 21.0, yc_la: 3.2, rc_la: 0.11 },
      "Leagues Cup":            { fouls: 21.0, yc: 5.67, rc: 0.33, penalties: 0.67, matches: 3,   fouls_la: 21.0, yc_la: 3.8, rc_la: 0.13 },
    },
    competition_tendency: {
      domestic: {
        label: "MLS Regular Season",
        matches: 222,
        fouls: 20.8, yc: 3.86, rc: 0.14,
        note: "Steady and below-average card rate for MLS across 222 matches — the largest verified sample in this dataset. Elfath is one of the league's most controlled officials at domestic level. His penalty rate (0.33/game) is notable — he is willing to award spot kicks when warranted.",
      },
      continental: {
        label: "CONCACAF Champions Cup & Leagues Cup",
        matches: 10,
        fouls: 20.5, yc: 4.60, rc: 0.10,
        note: "Card rate rises noticeably in continental competition, particularly the Leagues Cup (5.67 YC/game in 3 matches). CONCACAF Champions Cup (7 matches) shows 4.00 YC/game. The elevated Leagues Cup figure may reflect the higher-intensity format — one match per round, no second chances.",
      },
      international: {
        label: "FIFA World Cup",
        matches: 4,
        fouls: 22.0, yc: 4.50, rc: 0.25,
        note: "World Cup assignments (2022 group + R16) show a firmer threshold. Notably, Elfath is one of very few active referees already with World Cup AND 2026 World Cup experience — his Uruguay vs Spain group match in 2026 included a red card (Canobbio) in stoppage time.",
      },
    },
    refereeing_style: {
      summary: "Elfath is among the most decorated active referees in North American football. His career spans 249 matches, two FIFA World Cups (as referee and 4th official at the final), multiple MLS Referee of the Year awards, and the 2025 Intercontinental Cup Final. Born in Casablanca, Morocco and raised in the USA, he became the first Moroccan-American to earn a FIFA badge in 2016.",
      traits: ["Calm under pressure", "Precise challenge assessment", "Below-average domestic card rate", "High-profile international appointments", "2022 World Cup Final 4th official"],
      game_management: "Elfath's approach centres on early positioning to be in the best possible angle for decisions. He uses minimal but deliberate verbal communication, relying on body language and proximity to assert authority. His MLS career average (3.86 YC/game across 222 matches) is one of the lower rates for senior officials in the league — he prefers position and conversation over cards as his primary control tool.",
      learning_notes: "Elfath's career progression is instructive for any referee: he debuted in MLS in 2012, became FIFA-listed in 2016, won MLS ROTY in 2020 and 2022, served as 4th official at the 2022 World Cup Final, and is now a full match referee at the 2026 World Cup. The path to international football is built on domestic consistency. Study his pre-match preparation routines and how he handles VAR interaction — he has more experience navigating elite VAR environments than almost any other American referee.",
    },
    comments: "One of the most accomplished referees in US Soccer history. 4th official at the 2022 FIFA World Cup Final (Argentina vs France). Referee at 2026 FIFA World Cup — officiated Netherlands 2–2 Japan and Uruguay vs Spain (group stage, stoppage-time red card). Named MLS Referee of the Year 2020 and 2022. 2025 Intercontinental Cup Final referee. 2019 U-20 World Cup Final.",
  },

  {
    id: "4",
    name: "Darío Herrera",
    country: "Argentina",
    flag_code: "ar",
    age: 41,
    date_of_birth: "1985-02-24",
    place_of_birth: "Andacollo, Neuquén, Argentina",
    leagues: ["Argentine Primera División", "Copa Libertadores", "Copa Sudamericana", "Copa Argentina"],
    active: true,
    data_source: "public",
    source_note: "39-match recent season sample (statsbet.es, 2025-26). YC/RC/penalties from public match database; fouls estimated (not publicly tracked).",
    verified_matches: 39,
    fouls_per_game: 27.5,
    fouls_estimated: true,
    yellow_per_game: 5.44,
    red_per_game: 0.46,
    penalties_per_game: 0.15,
    penalties_estimated: false,
    achievements: ["2025 Copa Libertadores Final referee (Palmeiras vs Flamengo, Nov 29)", "2015 Copa Libertadores — Boca vs River (both legs)", "FIFA International Referee 2015–2024"],
    stat_by_league: {
      // YC/RC/Pen from statsbet.es (39 matches recent season). Per-competition breakdown estimated from career profile.
      "Argentine Primera División": { fouls: 27.5, yc: 5.44, rc: 0.46, penalties: 0.15, matches: null, fouls_la: 26.8, yc_la: 4.8, rc_la: 0.30 },
      "Copa Libertadores":          { fouls: 25.0, yc: 4.80, rc: 0.30, penalties: 0.18, matches: null, fouls_la: 24.5, yc_la: 3.5, rc_la: 0.18 },
      "Copa Sudamericana":          { fouls: 25.5, yc: 8.00, rc: 0.00, penalties: 0.00, matches: null, fouls_la: 24.0, yc_la: 3.8, rc_la: 0.20 },
    },
    competition_tendency: {
      domestic: {
        label: "Argentine Primera División",
        matches: 39,
        fouls: 27.5, yc: 5.44, rc: 0.46,
        note: "Herrera's domestic numbers are among the highest in this dataset and accurately reflect Argentine football's intensity. 5.44 YC/game and 0.46 straight red cards per game (verified, 39 matches) confirm he operates in an extremely high-card environment — the AFA league average itself is ~4.8 YC/game.",
      },
      continental: {
        label: "Copa Libertadores & Sudamericana",
        matches: null,
        fouls: 25.0, yc: 4.80, rc: 0.30,
        note: "Copa Libertadores typically produces fewer fouls but remains intense. Herrera's appointment to the 2025 Libertadores Final — the most prestigious club match in South America — reflects CONMEBOL's highest level of trust. Per-competition breakdown estimated from career profile; sample sizes are smaller.",
      },
      international: {
        label: "FIFA International Matches",
        matches: null,
        fouls: 24.0, yc: 4.20, rc: 0.20,
        note: "Held FIFA status from 2015 to 2024. International figures estimated. His international career overlapped with the most demanding Copa Libertadores appointments, suggesting CONMEBOL viewed him as suitable for both domestic and continental elite matches.",
      },
    },
    refereeing_style: {
      summary: "Darío Herrera is one of Argentina's highest-profile international referees. Born in Andacollo, Neuquén (February 24, 1985), he debuted in Argentine football in 2013 and reached international status by 2015. His 5.44 YC per game in the 2025-26 season (verified from 39 matches) reflects the reality of Argentine domestic football — not personal harshness, but the correct calibration for the league's culture. His appointment to the 2025 Copa Libertadores Final is the peak appointment any South American referee can receive.",
      traits: ["One of Argentina's most senior officials", "High but calibrated card rate", "Copa Libertadores Final experience", "Strong presence in rivalry matches", "Physical Education teacher background"],
      game_management: "Argentine football culture requires a referee who establishes dominance in the opening minutes. Herrera does this through early, decisive foul awards — particularly in physical 50-50 challenges — and immediate, firm closure of dissent. He is less strict on physicality than a European referee might be, but much firmer on vocal confrontation. The very high red card rate (0.46/game) reflects the Argentine league environment where off-the-ball incidents, second fouls, and dissent are more likely to escalate to sending-offs than in most other leagues.",
      learning_notes: "Herrera's career is a case study in cultural competence. The same referee who issues 5.44 YC/game in Argentina was trusted to manage the Copa Libertadores Final — the most watched club match in South America. This shows that 'strict' is context-dependent: a referee who seems very card-heavy by European standards can be exactly right for the Argentine environment. Study how he calibrates his approach differently between regular season matches and Libertadores knockout rounds, where he typically reduces cards while maintaining control through a higher-stakes presence.",
    },
    comments: "2025 Copa Libertadores Final referee (Palmeiras 3–1 Flamengo, November 29, 2025). Previously officiated the 2015 Boca vs River Copa Libertadores tie. FIFA International Referee 2015–2024. Debut: Colón vs Vélez Sarsfield, 2013. Physical education teacher by training.",
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
  const src = profile.data_source;
  const color   = src === "verified" ? "#5ecda4" : src === "public" ? "#64b5f6" : "#ffb74d";
  const bg      = src === "verified" ? "rgba(29,158,117,0.12)" : src === "public" ? "rgba(33,150,243,0.12)" : "rgba(255,152,0,0.12)";
  const border  = src === "verified" ? "rgba(29,158,117,0.35)"  : src === "public" ? "rgba(33,150,243,0.35)"  : "rgba(255,152,0,0.3)";
  const label   = src === "verified" ? `✓ ${profile.verified_matches} matches`
                : src === "public"   ? `✓ ${profile.verified_matches}+ matches`
                : "EST";
  return (
    <span style={{
      fontSize: small ? 10 : 11, fontWeight: 700,
      padding: small ? "1px 6px" : "2px 8px", borderRadius: 10,
      background: bg, border: `1px solid ${border}`, color,
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      {label}
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
          { label: "Fouls/game",   val: profile.fouls_per_game.toFixed(1),     color: "#5ecda4", est: !!profile.fouls_estimated     || profile.data_source === "estimated" },
          { label: "Yellow cards", val: profile.yellow_per_game.toFixed(2),    color: "#ffd600", est: profile.data_source === "estimated" },
          { label: "Red cards",    val: profile.red_per_game.toFixed(3),        color: "#ef5350", est: profile.data_source === "estimated" },
          { label: "Penalties",    val: profile.penalties_per_game.toFixed(3),  color: "#ff9800", est: !!profile.penalties_estimated  || profile.data_source === "estimated" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(10,22,40,0.4)", borderRadius: 8, padding: "8px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: "rgba(232,245,233,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
              {s.est ? <PenEstBadge /> : <span style={{ fontSize: 9, color: "#5ecda4" }}>✓</span>}
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
  const verified = profile.data_source === "verified" || profile.data_source === "public";

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
        <div style={{ marginTop: 14, padding: "8px 14px", borderRadius: 8,
          background: profile.data_source === "verified" ? "rgba(29,158,117,0.06)" : profile.data_source === "public" ? "rgba(33,150,243,0.06)" : "rgba(255,152,0,0.06)",
          border: `1px solid ${profile.data_source === "verified" ? "rgba(29,158,117,0.2)" : profile.data_source === "public" ? "rgba(33,150,243,0.2)" : "rgba(255,152,0,0.2)"}`,
          fontSize: 11,
          color: profile.data_source === "verified" ? "#5ecda4" : profile.data_source === "public" ? "#64b5f6" : "#ffb74d",
        }}>
          {profile.data_source === "verified"
            ? `✓ Fouls, yellow cards and red cards verified from ${profile.verified_matches} match records. ${profile.source_note}.`
            : profile.data_source === "public"
            ? `✓ Yellow cards, red cards and penalties verified from ${profile.verified_matches}+ career matches (public database). ${profile.source_note}.`
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
              { label: "Fouls / game", val: profile.fouls_per_game.toFixed(1),    color: "#5ecda4", est: !!profile.fouls_estimated    || profile.data_source === "estimated" },
              { label: "Yellow cards", val: profile.yellow_per_game.toFixed(2),   color: "#ffd600", est: profile.data_source === "estimated" },
              { label: "Red cards",    val: profile.red_per_game.toFixed(3),       color: "#ef5350", est: profile.data_source === "estimated" },
              { label: "Penalties",    val: profile.penalties_per_game.toFixed(3), color: "#ff9800", est: !!profile.penalties_estimated || profile.data_source === "estimated" },
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

          {/* Achievements */}
          {profile.achievements && profile.achievements.length > 0 && (
            <div style={{ background: "rgba(13,33,55,0.7)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#5ecda4", marginBottom: 10 }}>Notable Appointments & Awards</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {profile.achievements.map(a => (
                  <div key={a} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "rgba(232,245,233,0.75)" }}>
                    <span style={{ color: "#5ecda4", marginTop: 1, flexShrink: 0 }}>→</span>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

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
            How {profile.name.split(" ")[0]}'s statistics shift across competition intensity levels.
            {profile.data_source === "verified" && " YC, RC and fouls all verified from match records."}
            {profile.data_source === "public" && <> YC, RC and penalties verified from public database. <span style={{ color: "#ffb74d" }}>Fouls per game estimated.</span></>}
            {profile.data_source === "estimated" && <span style={{ color: "#ffb74d" }}> All figures estimated from public records.</span>}
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
