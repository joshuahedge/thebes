// Disease (Stage 4.5, ruling 318). The fire pattern (src/sim/fire.js) for homes: risk, cover by a physician, a seeded illness
// that spreads, alerts, a mood row. Pure functions from state; nothing here reads the clock or Math.random: every draw is
// hash2(id, world.day, world.seed + HEALTH_SALT.x).
//
// State (world version 6). Every home carries h.health (risk points, 0 up) and h.illness:
//   null                                              healthy
//   { start, days, left, lost, cap }                  ill: the day it began, how long it lasts, days left, residents lost so
//                                                     far, and the most it can lose (a quarter of its people, rounded down)
// tally.illnesses and tally.illnessesCured count them. Events (pushed into the events array the clock passes; never saved):
//   { type: 'illness', id, covered, cause }          a home fell ill (cause 'risk' or 'spread'); covered: a staffed physician
//                                                     reaches it
//   { type: 'illness_end', id }                      it recovered
// Alerts (healthAlerts), in ascending id: { code: 'illness', id } warning (never critical), an ill home no staffed physician
// reaches.
//
// The day (healthDay), in this order: (1) every home ill when the day began takes its day, in ascending id, with the
// coverage as the day began: it loses a resident (until it has lost its cap), a covered home (a staffed physician reaches it)
// does not spread the illness, an uncovered one passes it to each healthy edge neighbour that is a home on hash2(neighbour id,
// day, seed + spread + sick id x 7919) < spreadChance, and its days left fall by 1 (by coverFactor when covered); at 0 it
// recovers, its risk back to 0. (2) Every other home with people in it adds its risk and may fall ill (hash2(id, day, seed +
// fall) < illnessChance once at the threshold; the length is hash2(id, day, seed + length), 20-40 days). A home with nobody in
// it never builds risk.
import { HEALTH, HEALTH_SALT, HEALTH_BANDS, HEALTH_MOOD } from '../data/health.js';
import { BUILDINGS } from '../data/buildings.js';
import { housesOf, allBuildings } from './world.js';
import { atLeast } from './progression.js';
import { riskOf, threatsOn } from './costs.js';
import { roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';
import { desirabilityField, houseDesirability } from './desirability.js';
import { hash2 } from './rng.js';
import { ring, idx, inBounds } from './grid.js';
import { coverageMap, coverCause } from './serviceCover.js';

// Disease is on from the milestone the physician comes with, and never on Peaceful.
export const healthStarted = (world) => threatsOn(world) && atLeast(world, HEALTH.startsAt);

// Homes with people in it can fall ill; an empty plot or a home with nobody in never builds risk.
export const canFallIll = (b) => b.type === 'house' && b.tier >= 1 && b.residents > 0;

// The risk points a home carries now (0 for a home that cannot fall ill).
export const healthRiskOf = (world, b) => (canFallIll(b) ? b.health || 0 : 0);

// The band a risk falls in: 0 Low, 1 Rising, 2 High, 3 Can fall ill.
export function healthBand(risk) {
  let k = 0;
  for (let i = 0; i < HEALTH_BANDS.length; i++) if (risk >= HEALTH_BANDS[i]) k = i;
  return k;
}

// Building id -> coverage 0..1: the best staffing ratio among the working physicians whose road reach takes in a road tile next
// to it (src/sim/serviceCover.js). Cached; read-only.
export const healthCoverage = (world) => coverageMap(world, 'physician', HEALTH.reach);
export const healthCoverOf = (world, b) => healthCoverage(world).get(b.id) || 0;
// Covered: the coverage of a staffed physician (HEALTH.staffedAt or more).
export const healthCovered = (world, b) => healthCoverOf(world, b) >= HEALTH.staffedAt;
// Why a home is or is not covered: { cause, cover, service } (serviceCover.js coverCause).
export const healthCause = (world, b) => coverCause(world, b, 'physician', HEALTH.reach, HEALTH.staffedAt);

// The homes a working well reaches: a Set of ids, one pass over the wells (the coveredBy rule: src/sim/housing.js).
function wateredHomes(world) {
  const out = new Set();
  const homes = housesOf(world);
  for (const w of allBuildings(world)) {
    const def = BUILDINGS[w.type];
    if (def.provides !== 'water' || !isWorking(world, w)) continue;
    const reach = roadReach(world, w, def.reach);
    for (const h of homes) if (!out.has(h.id) && reachDistance(reach, world, h) <= def.reach) out.add(h.id);
  }
  return out;
}

// The reasons a home's risk builds faster: { well: true when no working well reaches it, crowded, poor }. The daily rate adds
// HEALTH.noWell, .crowded and .poorGround for each that is true. `watered` and `field` are the day's own, taken once by a
// caller judging many homes.
export function healthFactors(world, b, watered = wateredHomes(world), field = desirabilityField(world)) {
  return {
    well: !watered.has(b.id),
    crowded: b.residents / (b.w * b.d) > HEALTH.crowdedPerTile,
    poor: houseDesirability(world, b, field) < 0,
  };
}

// The risk points a home adds today: (base + a rate for each factor) x the difficulty's risk x (1 - cut x coverage); 0 for a
// home that cannot fall ill, before Town, and on Peaceful.
export function dailyHealthRiskOf(world, b) {
  if (!healthStarted(world) || !canFallIll(b)) return 0;
  return riskToday(world, b, healthCoverage(world), wateredHomes(world), desirabilityField(world));
}
function riskToday(world, b, cover, watered, field) {
  const f = healthFactors(world, b, watered, field);
  const rate = HEALTH.base + (f.well ? HEALTH.noWell : 0) + (f.crowded ? HEALTH.crowded : 0) + (f.poor ? HEALTH.poorGround : 0);
  return rate * riskOf(world) * (1 - HEALTH.cut * (cover.get(b.id) || 0));
}

const draw = (world, a, b, kind) => hash2(a, b, (world.seed + HEALTH_SALT[kind]) | 0);
const between = ([lo, hi], u) => lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));

// Every ill home, ascending id.
export const illHomes = (world) => housesOf(world).filter((b) => b.illness);

// The homes sharing an edge with b's footprint, ascending id (a road or open ground between makes none).
function homeNeighbours(world, b) {
  const ids = new Set();
  for (const [x, y] of ring(b.x, b.y, b.w, b.d)) {
    if (!inBounds(world.size, x, y)) continue;
    const id = world.occ[idx(world.size, x, y)];
    if (id && id !== b.id) ids.add(id);
  }
  return [...ids].sort((p, q) => p - q).map((id) => world.buildings[id]).filter((n) => n && n.type === 'house');
}

// Makes a home ill now (cause 'risk' or 'spread'): its length is drawn, its risk goes back to 0, tally.illnesses counts it.
// Returns false for a home that cannot fall ill or already is.
export function fallIll(world, id, events = null, cause = 'risk') {
  const b = world.buildings[id];
  if (!b || b.type !== 'house' || b.illness || !canFallIll(b)) return false;
  const days = between(HEALTH.illDays, draw(world, b.id, world.day, 'length'));
  b.illness = { start: world.day, days, left: days, lost: 0, cap: Math.floor(b.residents * HEALTH.lossShare) };
  b.health = 0;
  world.tally.illnesses += 1;
  if (events) events.push({ type: 'illness', id: b.id, covered: healthCovered(world, b), cause });
  return true;
}

// The day's disease step, run by tickDay after the fire step (the order is in the header).
export function healthDay(world, events = null) {
  if (!healthStarted(world)) return;
  const day = world.day;
  const homes = housesOf(world);
  const ill = homes.filter((b) => b.illness);
  const cover = healthCoverage(world);
  for (const b of ill) {
    if (world.buildings[b.id] !== b || !b.illness) continue;
    const i = b.illness;
    const covered = (cover.get(b.id) || 0) >= HEALTH.staffedAt;
    if (i.lost < i.cap && b.residents > 0) { b.residents -= 1; b.leftThisMonth += 1; i.lost += 1; }
    if (!covered) {
      for (const n of homeNeighbours(world, b)) {
        if (n.illness || !canFallIll(n)) continue;
        if (hash2(n.id, day, (world.seed + HEALTH_SALT.spread + Math.imul(b.id, 7919)) | 0) < HEALTH.spreadChance) fallIll(world, n.id, events, 'spread');
      }
    }
    i.left -= covered ? HEALTH.coverFactor : 1;
    if (i.left <= 0 || b.residents <= 0) {
      b.illness = null;
      b.health = 0;
      world.tally.illnessesCured += 1;
      if (events) events.push({ type: 'illness_end', id: b.id });
    }
  }
  const watered = wateredHomes(world), field = desirabilityField(world);
  const was = new Set(ill.map((b) => b.id));
  for (const b of homes) {
    if (b.illness || was.has(b.id) || !canFallIll(b) || world.buildings[b.id] !== b) continue;   // ill, or ill when the day began: risk stays 0
    b.health = (b.health || 0) + riskToday(world, b, cover, watered, field);
    if (b.health >= HEALTH.threshold && draw(world, b.id, day, 'fall') < HEALTH.illnessChance) fallIll(world, b.id, events, 'risk');
  }
}

// Disease's alerts, in ascending id: { code: 'illness', id }, an ill home no staffed physician reaches.
export function healthAlerts(world) {
  const out = [];
  for (const b of illHomes(world)) if (!healthCovered(world, b)) out.push({ code: 'illness', id: b.id });
  return out;
}

// The mood row (ruling 318): { illness } while any home is ill, each ill home HEALTH_MOOD.each, at most HEALTH_MOOD.max; no key
// at 0. updateMood adds it at the month end.
export function healthMood(world) {
  const n = illHomes(world).length;
  return n ? { illness: Math.max(HEALTH_MOOD.max, n * HEALTH_MOOD.each) } : {};
}
