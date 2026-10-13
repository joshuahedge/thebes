// The city score (spec 4.19): four parts measured from the city's state, never from clicks, the clock, pausing or undo,
// and never gating anything. Stage 3 contract: Track 0 fixed the names, signatures and shapes; Track E implements them.
// runMonth stores each month's score and parts in the history row (src/sim/clock.js).
//
// Each part is 0-100, the weighted sum of terms that are each 0 to 1 (SCORE_WEIGHTS, SCORE_TERMS in data/scoring.js):
//   people      60 growth (milestones after Village + the fraction to the next by people now, / 5; 1 at Capital)
//               + 40 homes ((the residents' average tier - 1) / 8)
//   prosperity  30 taxes (last month's tax per person / 5) + 30 jobs (full at 5% jobless, 0 at 30%)
//               + 20 treasury (1 at 0 gold or more, 0 at -500) + 20 trade (open routes / 2)
//   culture     25 each: the share of lived-in homes a working temple, booth and bazaar reach, and pleasant (the
//               homes' average desirability / 50)
//   safety      40 fire (the share of buildings that can burn a staffed firehouse covers; 1 before Town) + 40 defence
//               ((working towers + soldiers / 3) / the towers a raid sized now needs; 1 before the raid clock and on
//               Peaceful) + 20 record (1 - 0.2 a building burned and 0.5 a raid lost in the last 360 days)
// A city with no lived-in homes scores 0 on homes and on every culture term.
//
// Reasons: per part, null when the part is 100, else the term that lost it the most points (weight x (1 - term); ties to
// the first term), as { code, ... }:
//   growth { milestone, people, of }   homes { tier } (the tier most lived-in homes are at)   no_homes {}
//   taxes { perPerson }   jobless { percent }   debt { gold }   routes { n }
//   no_temple { n }   no_booth { n }   no_bazaar { n } (lived-in homes not reached)   plain { value }
//   fire_cover { n, dir } (buildings that can burn with no staffed firehouse; dir their side of the city or null)
//   towers { need, towers, soldiers }   burned { n }   raid_lost {}
//   (Stage 4, Monuments: the next step) finish { type, id, more }   found { type, first, more, milestone }
//   locked { type, first, milestone } or { type, first, prestige, have }   (monumentsReason below)
// The words are SCORE_TEXT's (src/ui/text.js), and from Stage 4 score4ReasonText's (Track D's section).
import { SCORE_VERSION, SCORE_PARTS, SCORE_WEIGHTS, SCORE_TERMS, SCORE_FACTOR, MEDALS, MEDALS_BY_VERSION, SPLITS } from '../data/scoring.js';
import { MONUMENTS, MONUMENT_KINDS } from '../data/monuments.js';
import { prestigeOf, prestigeByKind, monumentsPart } from './prestige.js';
import { siteProgress } from './monuments.js';
import { MILESTONES } from '../data/progression.js';
import { BUILDINGS } from '../data/buildings.js';
import { DAYS_PER_MONTH } from './time.js';
import { allBuildings, housesOf, population, makeBuilding, insertBuilding, removeBuilding } from './world.js';
import { footprint, idx, inBounds } from './grid.js';
import { milestoneIndex, isUnlocked } from './progression.js';
import { roadReach, adjacentRoadTiles } from './reach.js';
import { isWorking } from './labour.js';
import { desirabilityField, houseDesirability } from './desirability.js';
import { openRoutes } from './trade.js';
import { canBurn, fireStarted, fireCoverage } from './fire.js';
import { FIRE } from '../data/fire.js';
import { baseRaidSize, towersNeeded, workingTowers } from './raids.js';
import { raidsOn } from './costs.js';

const zeroParts = () => Object.fromEntries(SCORE_PARTS.map((p) => [p, 0]));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const T = SCORE_TERMS;

// The difficulty's score factor.
export const scoreFactor = (world) => SCORE_FACTOR[world.difficulty];

// The best medal a parts' total earns ('bronze', 'silver', 'gold'), or null. Stage 4: on the scale of the score version the
// total was made under (MEDALS_BY_VERSION: a v1 total of 240 is silver, a v2 one bronze); this version's by default.
export function medalFor(raw, version = SCORE_VERSION) {
  let medal = null;
  for (const m of MEDALS_BY_VERSION[version] || MEDALS) if (raw >= m.at) medal = m.id;
  return medal;
}

// The next medal above a parts' total and the city-score points to it ({ medal, points }), or null at gold. Medals sit on
// the parts' total, but show in city-score points: the medal's total times the factor, rounded, less the city score.
export function nextMedal(world, raw) {
  const f = scoreFactor(world);
  const m = MEDALS.find((x) => raw < x.at);
  return m ? { medal: m.id, points: Math.max(1, Math.round(m.at * f) - Math.round(raw * f)) } : null;
}

// Homes with people in them.
const livedHomes = (world) => housesOf(world).filter((h) => h.tier >= 1 && h.residents > 0);

// People: growth along the milestones by people now, and the residents' average tier.
function peopleTerms(world, lived) {
  const i = milestoneIndex(world.milestone);
  const pop = population(world);
  let growth;
  if (i >= MILESTONES.length - 1) growth = { value: 1, reason: null };
  else {
    const from = MILESTONES[i].population, next = MILESTONES[i + 1];
    const frac = clamp01((pop - from) / (next.population - from));
    growth = { value: Math.min(1, (i + frac) / T.growthSteps), reason: { code: 'growth', milestone: next.id, people: pop, of: next.population } };
  }
  if (!lived.length) return { growth, homes: { value: 0, reason: { code: 'no_homes' } } };
  let res = 0, weighted = 0;
  const byTier = new Map();
  for (const h of lived) {
    res += h.residents;
    weighted += h.tier * h.residents;
    byTier.set(h.tier, (byTier.get(h.tier) || 0) + 1);
  }
  let tier = 0, most = -1;
  for (const [t, n] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) if (n > most) { most = n; tier = t; }
  return { growth, homes: { value: clamp01((weighted / res - 1) / T.homesSpan), reason: { code: 'homes', tier } } };
}

// Prosperity: last month's taxes per person, jobs, the treasury and open trade routes.
function prosperityTerms(world) {
  const pop = population(world);
  const last = world.stats.lastMonth;
  const perPerson = last && pop > 0 ? last.taxes / pop : 0;
  const L = world.labour;
  const rate = L && L.workforce > 0 ? (L.workforce - L.employed) / L.workforce : 0;
  const routes = openRoutes(world);
  return {
    taxes: { value: Math.min(1, perPerson / T.taxPerPerson), reason: { code: 'taxes', perPerson: Math.round(perPerson * 10) / 10 } },
    jobs: { value: clamp01(1 - (rate - T.jobsFull) / (T.jobsZero - T.jobsFull)), reason: { code: 'jobless', percent: Math.round(rate * 100) } },
    treasury: { value: world.gold >= 0 ? 1 : clamp01(1 - world.gold / T.treasuryZero), reason: { code: 'debt', gold: -world.gold } },
    trade: { value: Math.min(1, routes / T.routes), reason: { code: 'routes', n: routes } },
  };
}

// How many lived-in homes a working building passing `matches` reaches along the roads, as coveredBy and bazaarsByHouse
// judge it (a road tile next to the home within the building's reach): the road tiles every such building reaches go
// into one set, then each home looks for one of its own road tiles in it, so the cost is providers plus homes, never
// providers times homes.
function reached(world, homeTiles, matches) {
  const tiles = new Set();
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!matches(def) || !def.reach || !isWorking(world, b)) continue;
    for (const t of roadReach(world, b, def.reach).keys()) tiles.add(t);   // roadReach stops at the reach
  }
  if (!tiles.size) return 0;
  let n = 0;
  for (const list of homeTiles) if (list.some((t) => tiles.has(t))) n++;
  return n;
}

// Culture: temple, entertainment and bazaar reach, and pleasant streets.
function cultureTerms(world, lived) {
  if (!lived.length) {
    const none = { value: 0, reason: { code: 'no_homes' } };
    return { temple: none, entertainment: none, bazaar: none, pleasant: none };
  }
  const homeTiles = lived.map((h) => adjacentRoadTiles(world, h));
  const share = (matches, code) => {
    const n = reached(world, homeTiles, matches);
    return { value: n / lived.length, reason: { code, n: lived.length - n } };
  };
  const field = desirabilityField(world);
  const avg = lived.reduce((s, h) => s + houseDesirability(world, h, field), 0) / lived.length;
  return {
    temple: share((d) => d.provides === 'religion', 'no_temple'),
    entertainment: share((d) => d.provides === 'entertainment', 'no_booth'),
    bazaar: share((d) => Boolean(d.sells), 'no_bazaar'),
    pleasant: { value: clamp01(avg / T.pleasant), reason: { code: 'plain', value: Math.round(avg) } },
  };
}

// The side of the city a set of buildings lies on, seen from the centre of all of them: 'east' (x up), 'west', 'south'
// (y up) or 'north', or null when they sit near the middle or all round it.
function sideOf(all, some) {
  const centre = (list) => list.reduce((c, b) => ({ x: c.x + (b.x + b.w / 2) / list.length, y: c.y + (b.y + b.d / 2) / list.length }), { x: 0, y: 0 });
  const a = centre(all), s = centre(some);
  const dx = s.x - a.x, dy = s.y - a.y;
  if (Math.hypot(dx, dy) < 4) return null;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
}

// Safety: firehouse cover, defence against a raid sized now, and the last year's record.
function safetyTerms(world) {
  let fire = { value: 1, reason: null };
  if (fireStarted(world)) {
    const all = allBuildings(world);
    const burnable = all.filter(canBurn);
    const cover = fireCoverage(world);                  // once: staffedCover's rule (coverage >= FIRE.staffedAt) per building
    const open = burnable.filter((b) => !((cover.get(b.id) || 0) >= FIRE.staffedAt));
    if (burnable.length) fire = { value: (burnable.length - open.length) / burnable.length, reason: { code: 'fire_cover', n: open.length, dir: open.length ? sideOf(burnable, open) : null } };
  }
  let defence = { value: 1, reason: null };
  if (raidsOn(world) && world.raid.clockDay !== null) {
    const need = towersNeeded(baseRaidSize(world));   // before favour's step: favour never moves the score (rulings 344, 441)
    // Ruling 414 (344): only foot soldiers count here, so archers and chariots (Stage 4.6) leave every score as it was.
    const towers = workingTowers(world), soldiers = world.soldiers.filter((u) => (u.kind || 'soldier') === 'soldier').length;
    defence = { value: Math.min(1, (towers + soldiers / 3) / need), reason: { code: 'towers', need, towers, soldiers } };
  }
  const since = (day) => world.day - day < T.recordDays;
  const burned = world.danger.burnDays.filter(since).length;
  const last = world.raid.last;
  const lost = last && !last.won && since(last.day) ? 1 : 0;
  const burnedLoss = T.burnedPenalty * burned, lostLoss = T.raidLostPenalty * lost;
  const record = {
    value: Math.max(0, 1 - burnedLoss - lostLoss),
    reason: lostLoss >= burnedLoss && lost ? { code: 'raid_lost' } : { code: 'burned', n: burned },
  };
  return { fire, defence, record };
}

// A part from its terms: round(sum of weight x term), and the reason of the term that lost the most points.
function partOf(part, terms) {
  const weights = SCORE_WEIGHTS[part];
  let sum = 0, worst = null, worstLoss = 0;
  for (const [term, w] of Object.entries(weights)) {
    const t = terms[term];
    sum += w * t.value;
    const loss = w * (1 - t.value);
    if (loss > worstLoss + 1e-9) { worstLoss = loss; worst = t.reason; }
  }
  const value = Math.round(sum);
  return { value, reason: value >= 100 ? null : worst };
}

// The prestige a kind gives in all (its courses' share and its completion share).
const prestigeFullOf = (type) => MONUMENTS[type].prestige.courses + MONUMENTS[type].prestige.done;

// The Monuments part's reason (spec 4.19): the next step, from the monuments standing (prestigeByKind: one of each kind).
//   { code: 'finish', type, id, more }     the most advanced unfinished site that holds its kind's prestige (the highest
//                                          share of its units laid; ties keep the earlier kind), and the prestige still to come
//   { code: 'found', type, first, more, milestone }   else the first kind with none standing, unlocked (first: no monument
//                                          stands at all; more: what it gives once finished; milestone: the one it came with)
//   { code: 'locked', type, first, milestone } or { code: 'locked', type, first, prestige, have }   that kind is not
//                                          unlocked yet: its milestone not reached, or (the pyramids) its prestige not yet held
function monumentsReason(world, prestige) {
  const by = prestigeByKind(world);
  let site = null, share = -1;
  for (const k of MONUMENT_KINDS) {
    const b = by[k].id === null ? null : world.buildings[by[k].id];
    if (!b || b.site.done !== null) continue;
    const done = siteProgress(b).done;
    if (done > share) { site = b; share = done; }
  }
  if (site) return { code: 'finish', type: site.type, id: site.id, more: prestigeFullOf(site.type) - by[site.type].prestige };
  const type = MONUMENT_KINDS.find((k) => by[k].id === null);
  if (!type) return null;
  const first = MONUMENT_KINDS.every((k) => by[k].id === null);
  if (isUnlocked(world, type)) return { code: 'found', type, first, more: prestigeFullOf(type), milestone: MONUMENTS[type].unlock.milestone };
  const u = MONUMENTS[type].unlock;
  return milestoneIndex(world.milestone) >= milestoneIndex(u.milestone)
    ? { code: 'locked', type, first, prestige: u.prestige, have: prestige }
    : { code: 'locked', type, first, milestone: u.milestone };
}

// Stage 4 (score v2, spec 4.19): Monuments, one term, prestige = sqrt(prestige / prestigeFull), at most 1 (complete in the
// contract: src/sim/prestige.js), with the next step as its reason (Track D).
function monumentsTerms(world) {
  const prestige = prestigeOf(world);
  return { prestige: { value: Math.min(1, Math.sqrt(prestige / T.prestigeFull)), reason: monumentsReason(world, prestige) } };
}

// What founding a monument of this type would add to the Monuments part once it is finished (spec 4.19: "+32 Monuments
// when finished"), as monumentsPart counts it: { gain, second }; second is true, and gain 0, when one of its kind already
// stands (one of each kind counts, so a second adds no prestige). null for a type that is not a monument.
export function monumentPreview(world, type) {
  if (!MONUMENTS[type]) return null;
  if (prestigeByKind(world)[type].id !== null) return { gain: 0, second: true };
  const now = prestigeOf(world);
  return { gain: monumentsPart(now + prestigeFullOf(type)) - monumentsPart(now), second: false };
}

// The score now: { version, total, raw, factor, parts, reasons, medal, next }
//   parts    { people, prosperity, culture, safety, monuments }, each a whole number 0-100 (spec 4.19, data/scoring.js)
//   raw      the parts' sum (0-500); total: round(raw x factor), the city score
//   reasons  per part, null or { code, ... }: the term that lost the part the most points, for its reason line
//            (codes and their fields above; the words live in SCORE_TEXT in src/ui/text.js)
//   medal    medalFor(raw); next: nextMedal(world, raw)
export function scoreOf(world) {
  const lived = livedHomes(world);
  const all = {
    people: partOf('people', peopleTerms(world, lived)),
    prosperity: partOf('prosperity', prosperityTerms(world)),
    culture: partOf('culture', cultureTerms(world, lived)),
    safety: partOf('safety', safetyTerms(world)),
    monuments: partOf('monuments', monumentsTerms(world)),
  };
  const parts = zeroParts();
  const reasons = {};
  for (const p of SCORE_PARTS) { parts[p] = all[p].value; reasons[p] = all[p].reason; }
  const raw = SCORE_PARTS.reduce((s, p) => s + parts[p], 0);
  const factor = scoreFactor(world);
  return { version: SCORE_VERSION, total: Math.round(raw * factor), raw, factor, parts, reasons, medal: medalFor(raw), next: nextMedal(world, raw) };
}

// What placing a building of this type at (x, y) would change, counting it as staffed: { people, prosperity, culture,
// safety } in whole points (the confirm bar shows changes of 1 or more: src/ui/scoreUi.js scoreLineFor). The building is
// put in for the count and taken out again, so the world is left exactly as it was: its workers come from the jobless
// first (no other building loses staff), and its price is left out (the building changes the parts, not the payment).
// Zeros for an unknown type or a footprint that is off the map or not free.
export function scorePreview(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def) return zeroParts();
  for (const [tx, ty] of footprint(x, y, def.w, def.d)) if (!inBounds(world.size, tx, ty) || world.occ[idx(world.size, tx, ty)]) return zeroParts();
  const before = scoreOf(world).parts;
  const nextId = world.nextId, labour = world.labour;
  const b = makeBuilding(world, type, x, y);
  b.staff = def.workers || 0;
  insertBuilding(world, b);
  if (def.workers) world.labour = { ...labour, employed: Math.min(labour.workforce, labour.employed + def.workers), jobs: labour.jobs + def.workers };
  let after;
  try { after = scoreOf(world).parts; } finally {
    removeBuilding(world, b.id);
    world.nextId = nextId;
    world.labour = labour;
  }
  return Object.fromEntries(SCORE_PARTS.map((p) => [p, after[p] - before[p]]));
}

// Game-months from the start to each split the city has reached (world.splits; score v2's seven, SPLITS), null where not.
export function splitMonths(world) {
  return Object.fromEntries(SPLITS.map((id) => [id, Number.isInteger(world.splits[id]) ? Math.floor(world.splits[id] / DAYS_PER_MONTH) : null]));
}

// The month-end history row's score fields (runMonth): { score, parts, version } (Stage 4: the score version, so the trend
// compares rows of one version only; a v4 save's rows are marked 1 when loaded).
export function scoreRow(world) {
  const s = scoreOf(world);
  return { score: s.total, parts: { ...s.parts }, version: s.version };
}

// The sealReign command (spec 4.19, 7.3): records the day and the score in the world; never refused, and repeatable.
// The interface then writes the chronicle entry (src/save/records.js). { ok: true, warnings: [], seal }.
export function sealReign(world) {
  const s = scoreOf(world);
  const seal = { day: world.day, score: s.total, parts: { ...s.parts }, medal: s.medal, version: s.version };
  world.seals.push(seal);
  return { ok: true, warnings: [], seal };
}
