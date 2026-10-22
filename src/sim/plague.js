// Version 6.0, Track B1 (rulings 684-686): the plague. A plague is warned (the home it will start in, two months ahead), starts in a crowded,
// poorly served home, and each day may pass to the homes near a sick one; sick homes lose people until they mend, and the work near them stops
// where no staffed physician reaches. A physician, a well and room to breathe slow it. Quarantining a district for a fee keeps it from crossing
// the district's edge (and slows it inside), while work in the district stops for as long as it holds.
//
// State: world.hazards.plague = { warning, active, nextDay, last } (src/data/hazards.js):
//   warning  null, or { day, strikes, origin }: the plague on its way and the home it will start in (a different one if that is gone)
//   active   null, or { day, origin, homes, lost, quarantines }: homes are every home it has reached, lost the people it has taken, quarantines
//            [{ key, from, until, fee, homes }] (a quarantine holds while until > the day)
//   last     null, or the last plague's report { day, end, origin, homes, lost, quarantines }
// A sick home is a home with illness.plague (src/sim/health.js isPlagueHome): its record { start, days, left, lost, cap, plague: true }, so the
// Health layer, the sheet's health row, the mood row and the court's remedies see it as an ill home, and the state is in the buildings (a remedy
// that cures a home changes it with no bookkeeping here). Draws are hash2(id, day, seed + HAZARD_SALT.x).
import { PLAGUE, HAZARD_SALT } from '../data/hazards.js';
import { HEALTH } from '../data/health.js';
import { CRIME } from '../data/crime.js';
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { housesOf, allBuildings } from './world.js';
import { canFallIll, healthCoverage, healthFactors, wateredHomes, isPlagueHome } from './health.js';
import { desirabilityField } from './desirability.js';
import { canAfford, spend } from './money.js';
import { dangerDraws, hazardDraw, between, gapDays, otherWarned, slowToOne } from './draws.js';
import { hash2 } from './rng.js';
import { DAYS_PER_MONTH } from './time.js';
import { idx, inBounds } from './grid.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

// ── Who is sick, and where ──
export const sickHomes = (world) => housesOf(world).filter(isPlagueHome);
export const plagueActive = (world) => Boolean(world.hazards.plague.active);

// The district a building stands in: the square of CRIME.districtTiles tiles its corner is in, as the alerts group homes.
export const districtKey = (b) => `${Math.floor(b.x / CRIME.districtTiles)},${Math.floor(b.y / CRIME.districtTiles)}`;
export const districtOf = (key) => { const [cx, cy] = key.split(',').map(Number); return { cx, cy, x0: cx * CRIME.districtTiles, y0: cy * CRIME.districtTiles, x1: (cx + 1) * CRIME.districtTiles - 1, y1: (cy + 1) * CRIME.districtTiles - 1 }; };

// The quarantines holding now: a Map key -> record (while the plague is under way and until is ahead of the day).
export function quarantines(world) {
  const a = world.hazards.plague.active, out = new Map();
  if (a) for (const q of a.quarantines || []) if (q.until > world.day) out.set(q.key, q);
  return out;
}

const crowded = (b) => b.residents / (b.w * b.d) > HEALTH.crowdedPerTile;

// ── The homes a plague can reach ──
// The homes within PLAGUE.reach tiles of b's footprint (a road between two homes is one tile), ascending id.
export function homesNear(world, b) {
  const r = PLAGUE.reach, ids = new Set();
  for (let y = b.y - r; y < b.y + b.d + r; y++) {
    for (let x = b.x - r; x < b.x + b.w + r; x++) {
      if (!inBounds(world.size, x, y)) continue;
      const id = world.occ[idx(world.size, x, y)];
      if (id && id !== b.id) ids.add(id);
    }
  }
  return [...ids].sort((p, q) => p - q).map((id) => world.buildings[id]).filter((n) => n && n.type === 'house');
}

// What the day's spread reads once: a staffed physician's coverage of each building, the homes a working well reaches, the level's severity and
// the quarantines holding. Taken once by a caller judging many homes.
export function plagueContext(world) {
  return { cover: healthCoverage(world), watered: wateredHomes(world), severity: dangerDraws(world).severity, held: quarantines(world) };
}

// The chance a day that a sick home `from` passes the plague to the home `to` near it: PLAGUE.spread x severity, cut by a staffed physician
// reaching `to`, by a working well reaching it and by room (a home not crowded), and kept to nothing across a quarantined district's edge and to
// PLAGUE.quarantine.insideFactor inside it. The words say exactly these factors.
export function catchChance(world, from, to, ctx = plagueContext(world)) {
  let p = PLAGUE.spread * ctx.severity;
  p *= 1 - PLAGUE.coverCut * (ctx.cover.get(to.id) || 0);
  if (ctx.watered.has(to.id)) p *= PLAGUE.wellFactor;
  if (!crowded(to)) p *= PLAGUE.roomFactor;
  const a = districtKey(from), b = districtKey(to);
  if (ctx.held.has(a) || ctx.held.has(b)) p = a === b ? p * PLAGUE.quarantine.insideFactor : 0;
  return p;
}

// ── Where it starts ──
// How badly a home is placed for a plague (higher is likelier): crowded and uncovered by a physician 2 each, no well and poor ground 1 each,
// and a seeded jitter under 1 so two alike homes are told apart. Only homes that can fall ill (canFallIll) and are not sick count.
export function plagueRisk(world, b, ctx = null) {
  const cover = ctx ? ctx.cover : healthCoverage(world), f = healthFactors(world, b, ctx ? ctx.watered : wateredHomes(world), ctx ? ctx.field : desirabilityField(world));
  return (f.crowded ? 2 : 0) + ((cover.get(b.id) || 0) < HEALTH.staffedAt ? 2 : 0) + (f.well ? 1 : 0) + (f.poor ? 1 : 0)
    + 0.9 * hazardDraw(world, b.id, world.day, 'plagueStart');
}

// The home a plague would start in now, or null (fewer than PLAGUE.minHomes homes with people in them, or none that can fall ill).
export function pickOrigin(world) {
  const homes = housesOf(world).filter((b) => b.residents > 0);
  if (homes.length < PLAGUE.minHomes) return null;
  const ctx = { cover: healthCoverage(world), watered: wateredHomes(world), field: desirabilityField(world) };
  let best = null, bestScore = -Infinity;
  for (const b of homes) {
    if (!canFallIll(b) || b.illness) continue;
    const s = plagueRisk(world, b, ctx);
    if (s > bestScore) { best = b; bestScore = s; }
  }
  return best;
}

// ── Infecting ──
function infect(world, b, events, cause) {
  const a = world.hazards.plague.active, sev = dangerDraws(world).severity;
  const days = between(PLAGUE.days, hazardDraw(world, b.id, world.day, 'plagueLength'));
  const cap = Math.min(b.residents, Math.floor(b.residents * Math.min(PLAGUE.lossMax, PLAGUE.lossShare * sev)));
  b.illness = { start: world.day, days, left: days, lost: 0, cap, plague: true };
  b.health = 0;
  if (!a.homes.includes(b.id)) a.homes.push(b.id);
  world.tally.plagueHomes += 1;
  if (events) events.push({ type: 'plague_spread', id: b.id, cause });
}

// A plague begins now in the home (a command of the sim, run by the strike day and by the dev scene): false when one is under way or the home
// cannot fall ill.
export function startPlague(world, id, events = null) {
  const p = world.hazards.plague, b = world.buildings[id];
  if (p.active || !b || b.type !== 'house' || !canFallIll(b) || b.illness) return false;
  p.active = { day: world.day, origin: b.id, homes: [], lost: 0, quarantines: [] };
  p.warning = null;
  world.tally.plagues += 1;
  infect(world, b, events, 'origin');
  if (events) events.push({ type: 'plague_start', id: b.id });
  return true;
}

// ── The day ──
export function plagueDay(world, events = null) {
  const p = world.hazards.plague;
  if (p.warning && !p.active && world.day >= p.warning.strikes) {
    const w = p.warning, home = world.buildings[w.origin];
    const origin = home && canFallIll(home) && !home.illness ? home : pickOrigin(world);
    p.warning = null;
    if (origin) startPlague(world, origin.id, events);
    else p.nextDay = world.day + DAYS_PER_MONTH;
  }
  const a = p.active;
  if (!a) return;
  for (const q of a.quarantines) if (q.until === world.day && events) events.push({ type: 'quarantine_end', key: q.key });
  const sick = sickHomes(world);
  const ctx = plagueContext(world);
  for (const b of sick) {
    if (world.buildings[b.id] !== b || !isPlagueHome(b)) continue;
    const i = b.illness;
    if (i.lost < i.cap && b.residents > 0) {
      const k = Math.min(PLAGUE.lossPerDay, i.cap - i.lost, b.residents);
      b.residents -= k; b.leftThisMonth += k; i.lost += k; a.lost += k;
    }
    for (const n of homesNear(world, b)) {
      if (n.illness || !canFallIll(n) || a.homes.includes(n.id)) continue;           // a home that has had this plague (mended, or still sick) does not catch it again
      if (hash2(n.id, world.day, (world.seed + HAZARD_SALT.plagueSpread + Math.imul(b.id, 7919)) | 0) < catchChance(world, b, n, ctx)) infect(world, n, events, 'spread');
    }
    i.left -= (ctx.cover.get(b.id) || 0) >= HEALTH.staffedAt ? PLAGUE.coverFactor : 1;
    if (i.left <= 0 || b.residents <= 0) { b.illness = null; b.health = 0; }
  }
  if (!sickHomes(world).length) {
    p.last = { day: a.day, end: world.day, origin: a.origin, homes: a.homes.length, lost: a.lost, quarantines: a.quarantines.length };
    p.active = null;
    p.nextDay = world.day + gapDays(world, PLAGUE.gap, 'plagueDraw', a.homes.length);
    if (events) events.push({ type: 'plague_end', homes: a.homes.length, lost: a.lost });
  }
}

// ── The draw and the warning (the month's end) ──
export function plagueMonth(world, events = null) {
  const p = world.hazards.plague, d = dangerDraws(world);
  if (p.warning || p.active || !d.plague) return;
  if (p.nextDay === null) { p.nextDay = world.day + gapDays(world, PLAGUE.first, 'plagueDraw', 0); return; }
  if (world.day < p.nextDay) return;
  const origin = otherWarned(world, 'plague') ? null : pickOrigin(world);
  if (!origin) { p.nextDay = world.day + DAYS_PER_MONTH; return; }
  p.warning = { day: world.day, strikes: world.day + PLAGUE.warnDays, origin: origin.id };
  slowToOne(world);
  if (events) events.push({ type: 'plague_warning', id: origin.id, strikes: p.warning.strikes });
}

// ── Work stops ──
// The buildings whose work stops now, a Set of ids, or null when no plague is under way: every workplace in a quarantined district, and every
// workplace within PLAGUE.workReach tiles of a sick home no staffed physician reaches (a physician's cover keeps the work going). Houses and
// services are not stopped: production (src/sim/production.js produceDay) reads this once a day.
export function plagueHalted(world) {
  const a = world.hazards.plague.active;
  if (!a) return null;
  const held = quarantines(world), sick = sickHomes(world), cover = sick.length ? healthCoverage(world) : null;
  const out = new Set();
  const spots = sick.filter((b) => (cover.get(b.id) || 0) < HEALTH.staffedAt);
  if (!held.size && !spots.length) return out;
  const r = PLAGUE.workReach;
  for (const b of allBuildings(world)) {
    if (b.type === 'house' || !BUILDINGS[b.type].workers) continue;
    if (held.has(districtKey(b)) || spots.some((s) => b.x <= s.x + s.w - 1 + r && b.x + b.w - 1 >= s.x - r && b.y <= s.y + s.d - 1 + r && b.y + b.d - 1 >= s.y - r)) out.add(b.id);
  }
  return out;
}
// Why one building's work has stopped, or null: 'quarantine' (its district is shut) or 'plague' (a sick home near it no physician reaches).
export function haltReason(world, b) {
  const halted = plagueHalted(world);
  if (!halted || !halted.has(b.id)) return null;
  return quarantines(world).has(districtKey(b)) ? 'quarantine' : 'plague';
}

// ── Quarantine ──
// What quarantining the district a home stands in would do, for the sheet's button and the command (the words say these numbers):
//   { ok, reason, key, fee, homes (homes with people in the district), sick (sick homes in it), workplaces (producers in it that would stop),
//     months, until (the day it ends), held (a quarantine already holds there: until) }
// reason when not ok: 'no_plague' (none under way), 'none_sick' (no sick home in that district: nothing to hold), 'already' (it already holds),
// 'no_gold' (the fee would take the treasury below the debt floor). The fee is PLAGUE.quarantine.feePerHome a home with people in it (at least
// feeMin), times the difficulty's cost.
export function quarantineQuote(world, home) {
  const q = PLAGUE.quarantine, a = world.hazards.plague.active;
  const key = districtKey(home);
  const base = { key, fee: 0, homes: 0, sick: 0, workplaces: 0, months: q.months, until: world.day + q.months * DAYS_PER_MONTH, held: null };
  if (!a) return fail('no_plague', base);
  const mine = (b) => districtKey(b) === key;
  const homes = housesOf(world).filter((b) => mine(b) && b.residents > 0).length;
  const sick = sickHomes(world).filter(mine).length;
  const workplaces = allBuildings(world).filter((b) => mine(b) && b.type !== 'house' && BUILDINGS[b.type].produces && BUILDINGS[b.type].workers).length;
  const fee = Math.round(Math.max(q.feeMin, homes * q.feePerHome) * DIFFICULTIES[world.difficulty].cost);
  const out = { ...base, fee, homes, sick, workplaces };
  const held = quarantines(world).get(key);
  if (held) return fail('already', { ...out, held: held.until });
  if (!sick) return fail('none_sick', out);
  if (!canAfford(world, fee)) return fail('no_gold', out);
  return { ok: true, reason: null, ...out };
}

// The quarantine command: pays the fee and shuts the district for PLAGUE.quarantine.months months. { ok, reason, ... } as the quote.
export function quarantineDistrict(world, id) {
  const home = world.buildings[id];
  if (!home) return fail('no_building');
  const quote = quarantineQuote(world, home);
  if (!quote.ok) return quote;
  spend(world, quote.fee);
  world.hazards.plague.active.quarantines.push({ key: quote.key, from: world.day, until: quote.until, fee: quote.fee, homes: quote.homes });
  world.tally.quarantines += 1;
  return quote;
}
