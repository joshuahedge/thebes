// Fire (spec 4.3, 4.9, 4.12). Stage 3 contract: Track 0 fixed every name, signature and shape here; Track A implements
// the functions marked STUB (each returns a safe default until then) and may add private helpers. Nothing here reads
// the clock or Math.random: every draw is hash2(id, world.day, world.seed + FIRE_SALT.x).
//
// State. Every building has b.risk (points, 0 up; only types that can burn ever gain any) and b.fire:
//   null                                          not burning
//   { stage: 'blaze', days, need, fought }        a blaze: days it has lasted, the covered-and-staffed days it needs to
//                                                 go out (1 or 2, drawn at ignition), and how many it has had
//   { stage: 'fire', days, left }                 a fire: days it has burned and days left before the building burns down
// world.danger.burnDays (days of buildings burned, last 360 days), .lastFireDay (the last day a building reached the
// fire stage) and .firePaused (the city's one first-time pause for a fire no staffed firehouse reaches) are fire's too,
// as are the tallies fires, blazesOut, firesOut, burned and rubbleCleared (rubble is counted by the commands).
//
// Events (pushed into the events array the clock passes; never saved):
//   { type: 'fire', id, covered, first }   a blaze started (by ignition, a spread or a raid's strike); covered: a staffed
//                                           firehouse reaches it; first: this is the city's first-time pause (the sim has
//                                           set world.speed to 0)
//   { type: 'fire_grow', id, covered }     a blaze grew into a fire
//   { type: 'fire_out', id, stage }        a blaze or fire was put out ('blaze' or 'fire')
//   { type: 'burned', id, kind, to }       the building burned down: kind is its type, to the ids of what replaced it
//                                           (empty plots for a home, rubble otherwise), in footprint order
// Alerts (fireAlerts): { code: 'fire', id } critical, a blaze or fire no staffed firehouse reaches; { code: 'blaze', id }
// warning, a covered blaze; { code: 'fire_risk', id } warning, a building in the High or Can-catch-fire band that no
// staffed firehouse covers (it carries the problem marker).
//
// Track A. Draws (each a fresh hash2, no state): ignition hash2(id, day, seed + FIRE_SALT.ignite) < FIRE.ignitionChance
// once risk >= FIRE.threshold; a blaze's need hash2(id, day, seed + putOut) at ignition (putOutDays, 1 or 2). day is
// the day being simulated (fireDay runs before tickDay turns the day). The first-time pause: the first blaze in the city
// that no staffed firehouse reaches sets world.speed to 0 through setSpeed and danger.firePaused, once per city; its
// event says first: true. The fire event also carries cause ('ignite', 'spread' or 'raid'). A building in the fire stage
// stops working (isWorking in labour.js), so a burning firehouse covers nothing until it is put out.
import { FIRE, FIRE_SALT, FIRE_RISK, HOUSE_RISK, FIRE_BANDS } from '../data/fire.js';
import { allBuildings } from './world.js';
import { atLeast } from './progression.js';
import { rubbleCostOf, riskOf } from './costs.js';
import { roadReach, adjacentRoadTiles } from './reach.js';
import { isWorking, staffRatio } from './labour.js';
import { hash2 } from './rng.js';
import { setSpeed } from './commands.js';

export { clearRubble } from './commands.js';   // the clearRubble command (spec 7.3) lives with demolish in commands.js

// A building's own risk a day before the difficulty and any firehouse: its type's, a home's by its tier; 0 never burns.
export const baseRiskOf = (b) => (b.type === 'house' ? HOUSE_RISK[b.tier] || 0 : FIRE_RISK[b.type] || 0);

// Whether a building can catch fire at all (spec 4.12): roads, empty plots, gardens, statues, wells, walls, gates,
// towers and rubble never do.
export const canBurn = (b) => baseRiskOf(b) > 0;

// Risk only builds up once the city is a Town.
export const fireStarted = (world) => atLeast(world, FIRE.startsAt);

// The risk points a building carries now (0 for one that never burns).
export const fireRiskOf = (world, b) => (canBurn(b) ? b.risk || 0 : 0);

// The band (spec 4.12) a risk falls in: 0 Low, 1 Rising, 2 High, 3 Can catch fire (FIRE_BAND_IDS).
export function fireBand(risk) {
  let k = 0;
  for (let i = 0; i < FIRE_BANDS.length; i++) if (risk >= FIRE_BANDS[i]) k = i;
  return k;
}

// Every burning building (a blaze or a fire), ascending id.
export const burning = (world) => allBuildings(world).filter((b) => b.fire);

// Building id -> coverage 0..1 (spec 4.12): the best staffing ratio among the working firehouses (25% staff or more, not
// paused) whose road reach (FIRE.reach tiles) takes in a road tile next to it. Buildings no firehouse reaches are not in
// the map. Each road tile keeps the best ratio reaching it, then each building reads its own road tiles: one pass over the
// firehouses and one over the buildings, never every building against every firehouse. Cached outside the world, keyed
// on the road version and a signature of every building's id, place, size and a firehouse's staff, pause and whether it
// is in the fire stage (a burning firehouse stops working); read-only.
const coverCache = new WeakMap();   // world -> { key, map }
const inFireStage = (b) => Boolean(b.fire && b.fire.stage === 'fire');
function coverKey(world) {
  let h = 0x811c9dc5, n = 0;
  for (const b of allBuildings(world)) {
    n++;
    h = Math.imul(h ^ b.id, 16777619);
    h = Math.imul(h ^ (b.x * 256 + b.y), 16777619);
    h = Math.imul(h ^ (b.w * 4 + b.d), 16777619);
    if (b.type === 'firehouse') h = Math.imul(h ^ ((b.staff | 0) * 4 + (b.paused ? 1 : 0) + (inFireStage(b) ? 2 : 0) + 1000), 16777619);
  }
  return `${world.roadVersion}|${n}|${h}`;
}
export function fireCoverage(world) {
  const key = coverKey(world);
  const c = coverCache.get(world);
  if (c && c.key === key) return c.map;
  const best = new Map();   // road tile -> the best staffing ratio of a working firehouse reaching it
  for (const f of allBuildings(world)) {
    if (f.type !== 'firehouse' || !isWorking(world, f)) continue;
    const ratio = staffRatio(world, f);
    for (const t of roadReach(world, f, FIRE.reach).keys()) if (ratio > (best.get(t) || 0)) best.set(t, ratio);
  }
  const map = new Map();
  if (best.size) {
    for (const b of allBuildings(world)) {
      let v = 0;
      for (const t of adjacentRoadTiles(world, b)) v = Math.max(v, best.get(t) || 0);
      if (v > 0) map.set(b.id, v);
    }
  }
  coverCache.set(world, { key, map });
  return map;
}

// A building's coverage, 0..1.
export const coverageOf = (world, b) => fireCoverage(world).get(b.id) || 0;

// Covered and staffed, for putting fires out: coverage of at least FIRE.staffedAt.
export const staffedCover = (world, b) => coverageOf(world, b) >= FIRE.staffedAt;

// The risk points the building adds today (spec 4.12): its base risk x the difficulty's risk (riskOf) x (1 - cut x
// coverage), and 0 before Town or for a building that never burns.
export function dailyRiskOf(world, b) {
  return riskToday(world, b, fireCoverage(world));
}
// The same, reading a coverage map the caller already has (fireDay reads it once a day, not once a building).
function riskToday(world, b, cover) {
  if (!fireStarted(world) || !canBurn(b)) return 0;
  return baseRiskOf(b) * riskOf(world) * (1 - FIRE.cut * (cover.get(b.id) || 0));
}

// A seeded draw in [0, 1): hash2(a, b, seed + FIRE_SALT[kind]). Stateless, so a reload changes nothing.
const draw = (world, a, b, kind) => hash2(a, b, (world.seed + FIRE_SALT[kind]) | 0);
// A whole number in [lo, hi] from a draw.
const between = ([lo, hi], u) => lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));

// The city's one first-time pause (spec 4.3): true when this fire is the one that paused the game.
function pauseFirst(world) {
  if (world.danger.firePaused) return false;
  setSpeed(world, 0);
  world.danger.firePaused = true;
  return true;
}

// The day's fire step, run by tickDay after production: every building that can burn and is not burning adds its daily
// risk (dailyRiskOf), and one at the threshold catches fire on a 3% draw (risk back to 0).
export function fireDay(world, events = null) {
  const day = world.day;
  const cover = fireCoverage(world);
  for (const b of allBuildings(world)) {
    if (b.fire || !canBurn(b)) continue;
    b.risk = (b.risk || 0) + riskToday(world, b, cover);
    if (b.risk >= FIRE.threshold && draw(world, b.id, day, 'ignite') < FIRE.ignitionChance) igniteBuilding(world, b.id, events, 'ignite');
  }
}

// Starts a blaze in the building (cause: 'ignite', 'spread' or 'raid'). Returns true when a blaze started; false when
// there is no such building, it never burns or it is already burning. Raids call it for a strike (Track B). The blaze
// draws the covered-and-staffed days it needs (1 or 2), the building's risk goes back to 0, tally.fires counts it, and
// the event { type: 'fire', id, covered, first, cause } says whether a staffed firehouse reaches it and whether it
// paused the game (the city's first fire that none reaches).
export function igniteBuilding(world, id, events = null, cause = 'ignite') {
  const b = world.buildings[id];
  if (!b || !canBurn(b) || b.fire) return false;
  b.fire = { stage: 'blaze', days: 0, need: between(FIRE.putOutDays, draw(world, b.id, world.day, 'putOut')), fought: 0 };
  b.risk = 0;
  world.tally.fires += 1;
  const covered = staffedCover(world, b);
  const first = !covered && pauseFirst(world);
  if (events) events.push({ type: 'fire', id: b.id, covered, first, cause });
  return true;
}

// STUB. Burns the building down now: a home becomes empty plots on its tiles (four for a 2x2) and its residents leave
// the city; anything else becomes one rubble per footprint tile and loses its stock. Removes it and inserts the new
// buildings under new ids (never a type change in place). Returns the new ids, or [] when there is no such building.
export function burnBuilding(world, id, events = null) {
  return [];
}

// STUB. Fire's alerts (codes above), in ascending building id.
export function fireAlerts(world) {
  return [];
}

// STUB. Fire's mood terms (spec 4.9, DANGER_MOOD): { fire } when a building reached the fire stage in the last 30 days,
// { burned } for buildings burned in the last 180; a key only while its term is not 0. updateMood adds them.
export function fireMood(world) {
  return {};
}

// What clearing this many rubble tiles costs in this city.
export const rubbleClearCost = (world, tiles = 1) => tiles * rubbleCostOf(world);
