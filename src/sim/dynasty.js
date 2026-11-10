// Version 9.0 "Dynasty" (Track D, rulings 1565-1584; the seam is wave 0's, ruling 1563): the heir's trait, the title a reign earns, the month-end
// counts the titles read, and Pass the throne. The tables are src/data/dynasty.js (TITLES, TRAITS); the words are Track D's text.js section.
import { decreeEnded, endedFail } from './rules.js';
import { TITLES, TRAITS, FACTOR_LEVERS, PASS_FROM, deeperLoss } from '../data/dynasty.js';
import { isHeir } from '../data/v90.js';
import { RAIDS } from '../data/raids.js';
import { MILESTONES } from '../data/progression.js';
import { atLeast } from './progression.js';
import { population } from './world.js';
import { fedNow } from './feats.js';
import { raidsOn } from './costs.js';
import { taxRateOf } from './palace.js';
import { scoreOf, sealReign } from './score.js';
import { illHomes } from './health.js';
import { DAYS_PER_MONTH } from './time.js';

// ── The trait ──
// The factor the heir's trait puts on one lever (design section 4, ruling 1567), read in that lever's one function; 1 when the lever is not the
// heir's (and always for the Steady). The score never reads it.
export function heirFactor(world, lever) {
  const trait = TRAITS[world && world.heir];
  return trait && FACTOR_LEVERS.includes(lever) && typeof trait[lever] === 'number' ? trait[lever] : 1;
}

// The days the Unconquered's every warning comes sooner (0 for any other city). Version 9.2 (Track S, ruling 1802): 30 days at every warning, the first and each later one
// (laterWarnDay), where 9.0 took 100 days off the first only.
export const warnSoonerOf = (world) => (TRAITS[world && world.heir] || {}).sooner || 0;

// The days from the raid clock's start to the first warning: RAIDS.firstWarnAfter, less the Unconquered's `sooner` (raids.js sets nextWarnDay from it).
export const firstWarnAfterOf = (world) => RAIDS.firstWarnAfter - warnSoonerOf(world);

// The High tax rate's factor in place of the data's, or null: the Generous's (src/sim/palace.js taxFactorOf reads it).
export const heirHighFactor = (world) => { const v = (TRAITS[world && world.heir] || {}).high; return typeof v === 'number' ? v : null; };

// A flood's harvest factor made deeper by the Bountiful (ruling 1572): under 1 it loses floodLoss times as much, never under 0; any other city's comes
// back untouched (src/data/dynasty.js deeperLoss). src/sim/flood.js levelHarvest applies the same rule from the data (it may not import this file).
export const heirLoss = (world, factor) => deeperLoss(factor, heirFactor(world, 'floodLoss'));

// ── The title ──
// Each title's measure now, with whether it may be earned and its fit (measure over bar, 0 when it may not): [{ id, bar, measure, fit, ok, ... }]
// in TITLES' order, each with the counts its words say:
//   unconquered { beaten, lost, tributes, raids }  builder { units }  merchant { gold, bills }  bountiful { fed, months }
//   generous { low, high, months }
export function titleMeasures(world) {
  const t = world.tally, months = t.townMonths || 0;
  return TITLES.map((def) => {
    let row;
    switch (def.id) {
      case 'unconquered': {
        const raids = raidsOn(world);
        row = { measure: t.raidsBeaten || 0, ok: raids && !(t.raidsLost > 0) && !(t.tributes > 0), beaten: t.raidsBeaten || 0, lost: t.raidsLost || 0, tributes: t.tributes || 0, raids };
        break;
      }
      case 'builder': {
        const units = (t.stoneLaid || 0) + (t.bricksLaid || 0);
        row = { measure: units, ok: true, units };
        break;
      }
      case 'merchant': {
        const gold = t.tradeGold || 0, bills = t.billsPaid || 0;
        row = { measure: bills > 0 ? gold / bills : 0, ok: bills > 0, gold, bills };
        break;
      }
      case 'bountiful': {
        const fed = Math.min(t.fedMonths || 0, months);
        row = { measure: months > 0 ? fed / months : 0, ok: months >= def.months, fed, months };
        break;
      }
      case 'generous': {
        // The Low and High month ends counted from Town (ruling 1584), never 8.4's taxLowMonths and taxHighMonths, which count from the first month.
        const low = Math.min(t.lowMonths || 0, months), high = Math.min(t.highMonths || 0, months);
        row = { measure: months > 0 ? low / months : 0, ok: months >= def.months && high <= def.highMax * months, low, high, months };
        break;
      }
      default: row = { measure: 0, ok: false };
    }
    return { id: def.id, bar: def.bar, ...row, fit: row.ok ? row.measure / def.bar : 0 };
  });
}

// The title the reign would be remembered by if the throne passed today (design section 3, ruling 1565): the highest fit among the titles whose bar
// is met (fit >= 1), a tie to the earlier row; none met is the Steady. runnerUp is the next title by fit (met or not, fit above 0), or null; rows is
// titleMeasures' list, for the words.  { id, fit, measure, runnerUp, rows }
export function titleOf(world) {
  const rows = titleMeasures(world);
  let best = null;
  for (const r of rows) if (r.fit >= 1 && (!best || r.fit > best.fit)) best = r;
  let runner = null;
  for (const r of rows) if (r !== best && r.fit > 0 && (!runner || r.fit > runner.fit)) runner = r;
  return best
    ? { id: best.id, fit: best.fit, measure: best.measure, runnerUp: runner ? runner.id : null, rows }
    : { id: 'steady', fit: 0, measure: 0, runnerUp: runner ? runner.id : null, rows };
}

// ── The month-end counts (src/data/v90.js V90_TALLY) ──
// runMonth (src/sim/clock.js) calls it once at each month's end, after monthlyEconomy, the milestone's update and the goods' month record, so
// stats.lastMonth holds the month's trade income and bills and world.milestone is the month's. From Town: townMonths, and fedMonths when every
// Cottage-or-better home is fed (feats.js fedNow, as Well fed reads it). From Market town: the month's trade income and its bills (wages, upkeep
// and soldiers' pay).
export function countDynastyMonth(world) {
  const t = world.tally;
  if (atLeast(world, 'town')) {
    t.townMonths += 1;
    if (fedNow(world, 0)) t.fedMonths += 1;
    const rate = taxRateOf(world);                       // the Generous's counts (ruling 1584): the month ends from Town at Low and at High
    if (rate === 'low') t.lowMonths += 1;
    if (rate === 'high') t.highMonths += 1;
    // Version 9.3 (Track R, ruling 1963): the decree's two counts, from Town as the others: a month end with no sick home, and one with no building burned down in the month.
    if (illHomes(world).length === 0) t.wellMonths = (t.wellMonths || 0) + 1;
    if (!world.danger.burnDays.some((d) => d >= world.day - DAYS_PER_MONTH)) t.fireSafeMonths = (t.fireSafeMonths || 0) + 1;
  }
  const m = world.stats.lastMonth;
  if (m && atLeast(world, 'market_town')) {
    t.tradeGold += m.tradeIncome || 0;
    t.billsPaid += (m.wages || 0) + (m.upkeep || 0) + (m.soldiers || 0);
  }
}

// ── Pass the throne (design section 2) ──
// Whether the throne can pass now: { ok, reason, people }. Never in the lesson ('lesson'); below City 'not_yet', with the people still needed
// (0 once the city has them and the month's end will make it a City). A won reign passes as any other City does.
export function canPassThrone(world) {
  if (world.lesson) return { ok: false, reason: 'lesson', people: 0 };
  if (!atLeast(world, PASS_FROM)) {
    const need = (MILESTONES.find((m) => m.id === PASS_FROM) || { population: 0 }).population;
    return { ok: false, reason: 'not_yet', people: Math.max(0, need - population(world)) };
  }
  return { ok: true, reason: null, people: 0 };
}

// The score a Pass keeps (design Q3, ruling 1569): the best of this reign's seals (the win's included) and today's score, today's on a tie.
// { score, parts, medal, version, sealed (true when an earlier seal is the higher), day (that seal's day, else today) }
export function passScore(world) {
  const s = scoreOf(world);
  let best = null;
  for (const seal of world.seals) if (Number.isFinite(seal.score) && (!best || seal.score > best.score)) best = seal;
  if (best && best.score > s.total) return { score: best.score, parts: { ...best.parts }, medal: best.medal || null, version: best.version, sealed: true, day: best.day };
  return { score: s.total, parts: { ...s.parts }, medal: s.medal, version: s.version, sealed: false, day: world.day };
}

// The passThrone command: seals the reign (sealReign with { passed: true, title }) with the score passScore keeps, and says the title the heir
// takes (title, else the reign's own by titleOf). The next city is the interface's (boot.js). { ok, warnings, seal, title }, or fails as
// canPassThrone says (with people for 'not_yet').
export function passThrone(world, { title } = {}) {
  if (decreeEnded(world)) return endedFail();   // Version 9.3 (Track R, ruling 1962): after a decree's end every command is refused
  const can = canPassThrone(world);
  if (!can.ok) return { ok: false, reason: can.reason, warnings: [], people: can.people };
  const id = isHeir(title) ? title : titleOf(world).id;
  const kept = passScore(world);
  const r = sealReign(world, { passed: true, title: id });
  if (kept.sealed) Object.assign(r.seal, { score: kept.score, parts: kept.parts, medal: kept.medal, version: kept.version });
  return { ok: true, warnings: [], seal: r.seal, title: id };
}
