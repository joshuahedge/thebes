// The city score (spec 4.19): four parts measured from the city's state, never from clicks, the clock, pausing or undo,
// and never gating anything. Stage 3 contract: Track 0 fixed the names, signatures and shapes; Track E implements the
// STUBs. runMonth stores each month's score and parts in the history row (src/sim/clock.js).
import { SCORE_VERSION, SCORE_PARTS, SCORE_FACTOR, MEDALS, SPLIT_MILESTONES } from '../data/scoring.js';
import { DAYS_PER_MONTH } from './time.js';

const zeroParts = () => Object.fromEntries(SCORE_PARTS.map((p) => [p, 0]));

// The difficulty's score factor.
export const scoreFactor = (world) => SCORE_FACTOR[world.difficulty];

// The best medal a parts' total earns ('bronze', 'silver', 'gold'), or null.
export function medalFor(raw) {
  let medal = null;
  for (const m of MEDALS) if (raw >= m.at) medal = m.id;
  return medal;
}

// The next medal above a parts' total and the city-score points to it ({ medal, points }), or null at gold. Medals sit on
// the parts' total, but show in city-score points: the medal's total times the factor, rounded, less the city score.
export function nextMedal(world, raw) {
  const f = scoreFactor(world);
  const m = MEDALS.find((x) => raw < x.at);
  return m ? { medal: m.id, points: Math.max(1, Math.round(m.at * f) - Math.round(raw * f)) } : null;
}

// STUB. The score now: { version, total, raw, factor, parts, reasons, medal, next }
//   parts    { people, prosperity, culture, safety }, each a whole number 0-100 (spec 4.19 formulas, data/scoring.js)
//   raw      the parts' sum (0-400); total: round(raw x factor), the city score
//   reasons  per part, null or { code, ... }: the term that lost the part the most points, for its reason line
//            (codes and their fields are Track E's; the words live in SCORE_TEXT in src/ui/text.js)
//   medal    medalFor(raw); next: nextMedal(world, raw)
export function scoreOf(world) {
  const parts = zeroParts();
  const raw = 0;
  const factor = scoreFactor(world);
  return {
    version: SCORE_VERSION, total: Math.round(raw * factor), raw, factor, parts,
    reasons: Object.fromEntries(SCORE_PARTS.map((p) => [p, null])), medal: medalFor(raw), next: nextMedal(world, raw),
  };
}

// STUB. What placing a building of this type at (x, y) would change, counting it as staffed: { people, prosperity,
// culture, safety } in whole points (the confirm bar shows changes of 1 or more: src/ui/scoreUi.js scoreLineFor).
export function scorePreview(world, type, x, y) {
  return zeroParts();
}

// Game-months from the start to each milestone the city has reached (world.splits), null where not reached.
export function splitMonths(world) {
  return Object.fromEntries(SPLIT_MILESTONES.map((id) => [id, Number.isInteger(world.splits[id]) ? Math.floor(world.splits[id] / DAYS_PER_MONTH) : null]));
}

// The month-end history row's score fields (runMonth): { score, parts }.
export function scoreRow(world) {
  const s = scoreOf(world);
  return { score: s.total, parts: { ...s.parts } };
}

// The sealReign command (spec 4.19, 7.3): records the day and the score in the world; never refused, and repeatable.
// The interface then writes the chronicle entry (src/save/records.js). { ok: true, warnings: [], seal }.
export function sealReign(world) {
  const s = scoreOf(world);
  const seal = { day: world.day, score: s.total, parts: { ...s.parts }, medal: s.medal, version: s.version };
  world.seals.push(seal);
  return { ok: true, warnings: [], seal };
}
