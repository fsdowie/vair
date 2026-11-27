import { IFAB_UPDATES } from './ifab-updates.ts';
import { ECNL_RULES } from './ecnl-rules.ts';
import { EA_RULES } from './ea-rules.ts';
import { N1_RULES } from './n1-rules.ts';
import { MLS_NEXT_ACADEMY_RULES } from './mls-next-academy-rules.ts';
import { NFHS_GUIDE } from './nfhs-guide.ts';
import { NFHS_UNIFORMS } from './nfhs-uniforms.ts';
import { WIAA_RULES } from './wiaa-rules.ts';
import { NCAA_RULES } from './ncaa-rules.ts';
import { LAWS_2026_27 } from './laws-2026-27.ts';
import { LAWS_2025_26 } from './laws-2025-26.ts';

type Message = { role: string; content: unknown };
type Correction = { correction_text: string; version_label: string; notes: string | null };

// Optional rulebooks, sent only when the conversation mentions them. Sending
// every rulebook on every question made each request ~216K tokens; most
// questions only need the current Laws (~77K). Patterns are matched against
// every user message, so follow-ups keep the rulebooks the conversation
// started with (and keep hitting the same cache entry).
const HIGH_SCHOOL = [/\bnfhs\b/i, /high[\s-]*schools?\b/i, /\bhs\b/i, /\bvarsity\b/i, /\bjv\b/i,
  /\bwiaa\b/i, /\bwoa\b/i, /\bosaa\b/i, /\bidhsaa\b/i, /\bcif\b/i, /\buil\b/i, /\bghsa\b/i,
  /\bfhsaa\b/i, /state association/i];
const COLLEGE = [/\bncaa\b/i, /\bnaia\b/i, /\bcolleges?\b/i, /\bcollegiate\b/i, /\buniversity\b/i];

const OPTIONAL_RULEBOOKS = [
  {
    patterns: [/2025\s*[/\-–]\s*(20)?26/, /\b25\s*[/\-–]\s*26\b/, /\b2025\b/,
      /\b(last|previous|prior|old|older)\s+(season|year|version|rules?|laws?)/i,
      /what('s|s| has| have)?\s+changed/i, /\bchanges?\b.{0,40}\b(season|year|law|rule)/i,
      /\b(difference|differences|different)\b.{0,40}\b(season|year|version)/i,
      /\bnew\s+(law|rule)/i],
    text: `--- IFAB LAWS OF THE GAME 2025/26 (previous season, reference only) ---
${LAWS_2025_26}
--- END LAWS OF THE GAME 2025/26 ---`,
  },
  {
    patterns: [/\becnl\b/i, /elite clubs national/i],
    text: `--- ECNL COMPETITION RULES 2026/27 (use only when explicitly asked) ---
${ECNL_RULES}
--- END ECNL RULES ---`,
  },
  {
    patterns: [/\bea\b/i, /elite academy/i],
    text: `--- EA STANDARDS & RULES 2026/27 (use only when explicitly asked) ---
${EA_RULES}
--- END EA RULES ---`,
  },
  {
    patterns: [/\bn1\b/i, /national\s*(1|one)\b/i, /\bwpl\b/i, /washington premier/i],
    text: `--- NATIONAL 1 LEAGUE (N1) HANDBOOK & RULES 2026/27, INCL. WPL ADDENDUM (use only when explicitly asked) ---
${N1_RULES}
--- END N1 RULES ---`,
  },
  {
    patterns: [/\bmls\b/i, /academy division/i],
    text: `--- MLS NEXT ACADEMY DIVISION (MLS NEXT 2) RULES & REGULATIONS AND TECHNICAL STANDARDS 2026/27 (use only when explicitly asked) ---
${MLS_NEXT_ACADEMY_RULES}
--- END MLS NEXT ACADEMY DIVISION RULES ---`,
  },
  {
    patterns: [...HIGH_SCHOOL, ...COLLEGE],
    text: `--- NFHS 2026-27 SOCCER GUIDE: NCAA vs NFHS vs IFAB COMPARISON (high school / college; use only when asked) ---
${NFHS_GUIDE}
--- END NFHS 2026-27 SOCCER GUIDE ---`,
  },
  {
    patterns: HIGH_SCHOOL,
    text: `--- NFHS SOCCER UNIFORMS (high school, incl. Washington WIAA; use only when asked) ---
${NFHS_UNIFORMS}
--- END NFHS SOCCER UNIFORMS ---

--- WIAA (WASHINGTON HIGH SCHOOL) SOCCER RULES 2026-27: IFAB LAWS + WIAA MODIFICATIONS (use only for Washington high school) ---
${WIAA_RULES}
--- END WIAA RULES ---`,
  },
  {
    patterns: COLLEGE,
    text: `--- NCAA MEN'S AND WOMEN'S SOCCER RULES BOOK 2026 & 2027 (college; use only when asked) ---
${NCAA_RULES}
--- END NCAA RULES ---`,
  },
];

// Never changes between requests, so it's cached once and shared by every
// question whatever rulebooks it adds.
const BASE_PROMPT = `You are an expert football/soccer referee assistant with deep knowledge of IFAB Laws of the Game 2026/27.

SPECIAL INSTRUCTIONS:
- If asked who built/created VAIR: Say "VAIR was created by Fede in collaboration with Mr. Claude"
- IFAB Laws of the Game 2026/27 (the current, default ruleset, embedded in full below) are ALWAYS the default ruleset for all answers.
- Other rulebooks (IFAB Laws 2025/26, ECNL, EA, National 1, MLS NEXT Academy Division, high school NFHS/WIAA, college NCAA) are added after the Laws only when the conversation mentions them.
- Only reference the IFAB Laws of the Game 2025/26 if the user explicitly asks about the previous season, a match played under 2025/26 rules, or what changed between the two seasons. If a rule changed between seasons, say so.
- Only reference ECNL rules if the user explicitly asks about ECNL rules or an ECNL match.
- Only reference EA rules if the user explicitly asks about EA rules or an EA match.
- Only reference National 1 League (N1) rules if the user explicitly asks about National 1 / N1 rules or an N1 match. The WPL addendum at the end of the N1 rules applies only to N1 matches operated by the WPL (Washington).
- Only reference MLS NEXT Academy Division rules if the user explicitly asks about MLS NEXT Academy / MLS NEXT Academy Division / MLS NEXT 2 rules or a match in that division. MLS NEXT 2 and MLS NEXT Academy are other names for the MLS NEXT Academy Division. These rules cover only the Academy Division, not the MLS NEXT Homegrown Division.
- If an ECNL, EA, N1 or MLS NEXT Academy rule conflicts with IFAB, state the IFAB ruling first, then note "Note: this has been modified by [ECNL/EA/N1/MLS NEXT Academy] rules: [modification]".
- HIGH SCHOOL questions (only when the user asks about high school / NFHS / a state high school association):
  - Washington high school (WIAA) does NOT use NFHS rules: it plays the IFAB Laws of the Game 2026/27 with the WIAA modifications and NFHS uniform rules. Answer Washington questions from the IFAB Laws plus the WIAA rules block.
  - Most other states (including Oregon OSAA and Idaho IDHSAA) play NFHS rules. If the user doesn't say which state and the NFHS and Washington answers differ, give the NFHS answer and then add "In Washington (WIAA): ..." with the difference.
  - NFHS answers come from the NFHS 2026-27 Soccer Guide, a rule-by-rule comparison (not the full NFHS rulebook). Use the guide's NFHS column; where it says "Same as IFAB" apply the IFAB Laws. If the guide doesn't cover the situation, say so and refer the user to the NFHS Soccer Rules Book and their state association. Cite as "NFHS Rule [number] (per the NFHS 2026-27 Soccer Guide)" using only the rule number the guide gives; never invent NFHS sub-rule numbers.
  - State associations can modify NFHS rules (overtime, post-season tie-breakers, when a suspended game is official, caps): when the answer depends on this, say it depends on the state association.
  - For uniforms, the NFHS 2026-27 Soccer Guide takes precedence over the older NFHS uniform sheet where they differ.
  - Link: NFHS rules https://www.nfhs.org/sports/soccer/rules ; WIAA https://www.mywiaa.wiaa.com/soccer-resources-welcome/
- COLLEGE questions (only when the user asks about college / NCAA / NAIA): answer from the NCAA Rules Book 2026 & 2027 and cite the rule number (e.g., "NCAA Rule 3.4.3"). Rules often differ by division (Division I men vs Division I women vs Divisions II/III), so say which division the answer applies to. The NCAA Rules Book takes precedence over the NCAA column of the NFHS guide, which is out of date in places (e.g., substitutions). NAIA uses the NCAA rules. Link: https://ncaaorg.s3.amazonaws.com/championships/sports/soccer/rules/PRXSO_RulesBook.pdf
- For high school or college answers, state the NFHS/WIAA/NCAA ruling (that is the game being played), and when it differs from IFAB add "Note: under IFAB Laws of the Game: [difference]" only if it helps.
- Admin-verified corrections, when there are any, come last and take precedence over default answers.

${IFAB_UPDATES}

--- IFAB LAWS OF THE GAME 2026/27 (current, default ruleset) ---
${LAWS_2026_27}
--- END LAWS OF THE GAME 2026/27 ---

IMPORTANT: Keep responses SHORT (2-3 sentences):
1. State the ruling with Law number
2. Brief explanation
3. If relevant, mention recent IFAB clarifications above
4. Include the specific Law link from this list:

Law 1: https://www.theifab.com/laws/latest/the-field-of-play/
Law 2: https://www.theifab.com/laws/latest/the-ball/
Law 3: https://www.theifab.com/laws/latest/the-players/
Law 4: https://www.theifab.com/laws/latest/the-players-equipment/
Law 5: https://www.theifab.com/laws/latest/the-referee/
Law 6: https://www.theifab.com/laws/latest/the-other-match-officials/
Law 7: https://www.theifab.com/laws/latest/the-duration-of-the-match/
Law 8: https://www.theifab.com/laws/latest/the-start-and-restart-of-play/
Law 9: https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/
Law 10: https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/
Law 11: https://www.theifab.com/laws/latest/offside/
Law 12: https://www.theifab.com/laws/latest/fouls-and-misconduct/
Law 13: https://www.theifab.com/laws/latest/free-kicks/
Law 14: https://www.theifab.com/laws/latest/the-penalty-kick/
Law 15: https://www.theifab.com/laws/latest/the-throw-in/
Law 16: https://www.theifab.com/laws/latest/the-goal-kick/
Law 17: https://www.theifab.com/laws/latest/the-corner-kick/

For specific sections, add anchors (e.g., Law 4 safety: #safety, #colours, #jewellery, etc.)

Only provide detailed explanations if user asks for more.

For broad overview questions (e.g., "what are the differences between high school and IFAB?"), list only the 6-8 most important differences as one-line bullets, then offer more detail on any of them.`;

// Where a cut-off answer's "(more)" link points: the rules the latest
// question is about (falling back to the whole conversation), else the IFAB
// Laws. Washington and college come before generic high school.
const FULL_RULES_LINKS: Array<[RegExp[], string]> = [
  [COLLEGE, 'https://ncaaorg.s3.amazonaws.com/championships/sports/soccer/rules/PRXSO_RulesBook.pdf'],
  [[/\bwiaa\b/i, /\bwashington\b(?!\s+premier)/i],'https://www.mywiaa.wiaa.com/soccer-resources-welcome/'],
  [HIGH_SCHOOL, 'https://www.nfhs.org/sports/soccer/rules'],
  [[/\becnl\b/i, /elite clubs national/i], 'https://www.theecnl.com/'],
  [[/\bea\b/i, /elite academy/i], 'https://eliteacademyleague.com/'],
  [[/\bn1\b/i, /national\s*(1|one)\b/i, /\bwpl\b/i, /washington premier/i], 'https://national1league.org/'],
  [[/\bmls\b/i, /academy division/i], 'https://www.mlssoccer.com/mlsnext/academy-division/'],
];
const IFAB_LAWS_LINK = 'https://www.theifab.com/laws/latest/';

export function fullRulesLink(messages: Message[]) {
  const users = messages.filter((m) => m.role === 'user');
  for (const text of [userText(users.slice(-1)), userText(users)]) {
    const hit = FULL_RULES_LINKS.find(([patterns]) => patterns.some((p) => p.test(text)));
    if (hit) return hit[1];
  }
  return IFAB_LAWS_LINK;
}

const userText = (messages: Message[]) =>
  messages
    .filter((m) => m.role === 'user')
    .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n');

// System blocks in cache order: the shared base (Laws 2026/27), then any
// rulebooks the conversation needs, then the corrections. Corrections are
// last and uncached so adding or editing one doesn't force the ~77K-token
// Laws cache to be rewritten.
export function buildSystem(messages: Message[], corrections: Correction[] | null) {
  const text = userText(messages);
  const extras = OPTIONAL_RULEBOOKS
    .filter((book) => book.patterns.some((p) => p.test(text)))
    .map((book) => book.text);

  const system: Array<Record<string, unknown>> = [
    { type: 'text', text: BASE_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } },
  ];
  if (extras.length > 0) {
    system.push({ type: 'text', text: extras.join('\n\n'), cache_control: { type: 'ephemeral', ttl: '1h' } });
  }
  if (corrections && corrections.length > 0) {
    system.push({
      type: 'text',
      text: `--- VERIFIED CORRECTIONS (admin-reviewed, take precedence over default answers) ---\n` +
        corrections.map((c) =>
          `[${c.version_label}]${c.notes ? ` (${c.notes})` : ''}\n${c.correction_text}`
        ).join('\n\n') +
        `\n--- END CORRECTIONS ---`,
    });
  }
  return system;
}
