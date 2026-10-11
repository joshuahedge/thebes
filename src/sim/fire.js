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
//   { type: 'fire_grow', id, covered, first }  a blaze grew into a fire (first: it paused the game, as for a fire)
//   { type: 'fire_out', id, stage }        a blaze or fire was put out ('blaze' or 'fire')
//   { type: 'burned', id, kind, to }       the building burned down: kind is its type, to the ids of what replaced it
//                                           (empty plots for a home, rubble otherwise), in footprint order
// Alerts (fireAlerts), in ascending id: { code: 'fire', id } critical, a burning building (blaze or fire) whose coverage
// is below FIRE.staffedAt; { code: 'blaze', id } warning, a burning building a staffed firehouse reaches (a covered
// blaze, and also a covered fire, which the contract's two codes did not name: ruling 7); { code: 'fire_risk', id }
// warning, a building that is not burning, whose risk is in the High band or above (fireBand >= 2) and whose coverage
// is below FIRE.staffedAt (it carries the problem marker). fireCause says why a building is not covered, for the
// alerts' words (and the fire row).
//
// Track A. Draws (each a fresh hash2, no state): ignition hash2(id, day, seed + FIRE_SALT.ignite) < FIRE.ignitionChance
// once risk >= FIRE.threshold; a blaze's need hash2(id, day, seed + putOut) at ignition (putOutDays, 1 or 2). day is
// the day being simulated (fireDay runs before tickDay turns the day). The first-time pause: the first blaze in the city
// that no staffed firehouse reaches sets world.speed to 0 through setSpeed and danger.firePaused, once per city; its
// event says first: true. The fire event also carries cause ('ignite', 'spread' or 'raid'). A building in the fire stage
// stops working (isWorking in labour.js), so a burning firehouse covers nothing until it is put out.
//
// The day, in this order (fireDay): (1) every building that was burning when the day began takes its day, in ascending
// id, with the coverage as the day began. A blaze counts the day (days + 1) and, when it is covered and staffed, a
// fought day (fought + 1); it is out once fought reaches need, and grows into a fire once days reaches FIRE.blazeDays,
// its length drawn by hash2(id, day, seed + length) (10-15 days); the first-time pause applies to a fire that grows with
// no staffed firehouse, and its fire_grow event carries first as the fire event does. A fire counts the day (days + 1,
// left - 1) and sets danger.lastFireDay (so lastFireDay is the last day any building was in the fire stage); a covered
// one (coverage above 0) goes out on hash2(id, day, seed + out) < outChance x coverage; otherwise it spreads to each
// building that shares an edge with it, can burn and is not burning, on hash2(neighbour id, day, seed + spread +
// burning id x 7919) < spreadChance, starting a blaze there (cause 'spread', whose first day is tomorrow), and it burns
// the building down when left reaches 0. Put out, a building keeps everything and its risk is 0. (2) Every other
// building that can burn adds its risk and may catch fire. (3) danger.burnDays forgets days a year (360 days) old.
import { FIRE, FIRE_SALT, FIRE_RISK, HOUSE_RISK, FIRE_BANDS } from '../data/fire.js';
import { DANGER_MOOD } from '../data/mood.js';
import { allBuildings, makeBuilding, insertBuilding, removeBuilding } from './world.js';
import { atLeast } from './progression.js';
import { rubbleCostOf, riskOf } from './costs.js';
import { roadReach, adjacentRoadTiles } from './reach.js';
import { isWorking, staffRatio } from './labour.js';
import { hash2 } from './rng.js';
import { setSpeed } from './commands.js';
import { footprint, ring, idx, inBounds } from './grid.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';

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

const KEEP_BURN_DAYS = MONTHS_PER_YEAR * DAYS_PER_MONTH;   // danger.burnDays covers the last year (Safety looks back 12 months)

// The day's fire step, run by tickDay after production (the order is in the header): fires burning since before today
// take their day, then risk builds and buildings at the threshold may catch fire, then old burn days are forgotten.
export function fireDay(world, events = null) {
  const day = world.day;
  const list = allBuildings(world);
  const lit = list.filter((b) => b.fire);
  if (lit.length) {
    const cover = fireCoverage(world);
    for (const b of lit) {
      if (world.buildings[b.id] !== b || !b.fire) continue;
      if (b.fire.stage === 'blaze') blazeDay(world, b, cover, day, events);
      else fireStageDay(world, b, cover, day, events);
    }
  }
  const cover = fireCoverage(world);
  for (const b of list) {
    if (b.fire || lit.includes(b) || !canBurn(b) || world.buildings[b.id] !== b) continue;   // put out today: risk stays 0
    b.risk = (b.risk || 0) + riskToday(world, b, cover);
    if (b.risk >= FIRE.threshold && draw(world, b.id, day, 'ignite') < FIRE.ignitionChance) igniteBuilding(world, b.id, events, 'ignite');
  }
  forgetBurnDays(world);
}

// A blaze's day: fought when covered and staffed; out at need, a fire after FIRE.blazeDays.
function blazeDay(world, b, cover, day, events) {
  const f = b.fire;
  const staffed = (cover.get(b.id) || 0) >= FIRE.staffedAt;
  f.days += 1;
  if (staffed) f.fought += 1;
  if (f.fought >= f.need) { putOut(world, b, events); return; }
  if (f.days < FIRE.blazeDays) return;
  b.fire = { stage: 'fire', days: 0, left: between(FIRE.fireDays, draw(world, b.id, day, 'length')) };
  world.danger.lastFireDay = day;
  const first = !staffed && pauseFirst(world);
  if (events) events.push({ type: 'fire_grow', id: b.id, covered: staffed, first });
}

// A fire's day: it may go out (when covered), spreads to its edge neighbours, and burns down when its days run out.
function fireStageDay(world, b, cover, day, events) {
  const f = b.fire;
  f.days += 1;
  f.left -= 1;
  world.danger.lastFireDay = day;
  const c = cover.get(b.id) || 0;
  if (c > 0 && draw(world, b.id, day, 'out') < FIRE.outChance * c) { putOut(world, b, events); return; }
  for (const n of edgeNeighbours(world, b)) {
    if (n.fire || !canBurn(n)) continue;
    if (hash2(n.id, day, (world.seed + FIRE_SALT.spread + Math.imul(b.id, 7919)) | 0) < FIRE.spreadChance) igniteBuilding(world, n.id, events, 'spread');
  }
  if (f.left <= 0) burnBuilding(world, b.id, events);
}

// Put out: the building is as it was, with risk 0 (spec 4.12).
function putOut(world, b, events) {
  const stage = b.fire.stage;
  b.fire = null;
  b.risk = 0;
  if (stage === 'blaze') world.tally.blazesOut += 1;
  else world.tally.firesOut += 1;
  if (events) events.push({ type: 'fire_out', id: b.id, stage });
}

// The buildings sharing an edge with b's footprint (a 1x1 has at most 4, a 2x2 at most 8), ascending id. A road, a wall
// or open ground between two buildings makes them no neighbours, so a road is a firebreak.
function edgeNeighbours(world, b) {
  const ids = new Set();
  for (const [x, y] of ring(b.x, b.y, b.w, b.d)) {
    if (!inBounds(world.size, x, y)) continue;
    const id = world.occ[idx(world.size, x, y)];
    if (id && id !== b.id) ids.add(id);
  }
  return [...ids].sort((p, q) => p - q).map((id) => world.buildings[id]).filter(Boolean);
}

// danger.burnDays keeps the days of the last year, oldest first.
function forgetBurnDays(world) {
  const days = world.danger.burnDays;
  let k = 0;
  while (k < days.length && days[k] <= world.day - KEEP_BURN_DAYS) k++;
  if (k) days.splice(0, k);
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

// Burns the building down now: a home becomes empty plots on its tiles (four for a 2x2) and its residents leave the
// city; anything else becomes one rubble per footprint tile and loses its stock. Removes it and inserts the new
// buildings under new ids (never a type change in place). Returns the new ids, or [] when there is no such building.
// Counts tally.burned, adds the day to danger.burnDays and pushes { type: 'burned', id, kind, to }.
export function burnBuilding(world, id, events = null) {
  const b = world.buildings[id];
  if (!b) return [];
  const kind = b.type === 'house' ? 'house' : 'rubble';   // a new house is an empty plot: tier 0, nobody living there
  removeBuilding(world, b.id);
  const to = footprint(b.x, b.y, b.w, b.d).map(([x, y]) => insertBuilding(world, makeBuilding(world, kind, x, y)).id);
  world.tally.burned += 1;
  world.danger.burnDays.push(world.day);
  if (events) events.push({ type: 'burned', id: b.id, kind: b.type, to });
  return to;
}

// Fire's alerts (codes above), in ascending building id. Cheap: one pass, and the coverage map only when some building
// is burning or at High risk (it is cached on the roads and the firehouses).
export function fireAlerts(world) {
  const out = [];
  let cover = null;
  const staffed = (b) => ((cover || (cover = fireCoverage(world))).get(b.id) || 0) >= FIRE.staffedAt;
  for (const b of allBuildings(world)) {
    if (b.fire) out.push({ code: staffed(b) ? 'blaze' : 'fire', id: b.id });
    else if (canBurn(b) && fireBand(b.risk || 0) >= 2 && !staffed(b)) out.push({ code: 'fire_risk', id: b.id });
  }
  return out;
}

// Why a building is or is not covered for putting fires out: { cause, cover, firehouse }. cause is 'covered' (coverage
// at least FIRE.staffedAt); 'no_road' (no road tile beside it, so no firehouse can reach it); 'none' (no firehouse within
// FIRE.reach road tiles); otherwise it names the best firehouse that does reach it (working beats burning beats paused,
// then the most staff): 'short' (working or not, it is short of workers), 'burning' (it is in the fire stage) or
// 'paused'. cover is the building's coverage (coverageOf); firehouse is that firehouse's id (for 'covered', the
// best-staffed one), or null.
export function fireCause(world, b) {
  const cover = coverageOf(world, b);
  const roads = adjacentRoadTiles(world, b);
  let pick = null, rank = -1;
  if (roads.length) {
    for (const f of allBuildings(world)) {
      if (f.type !== 'firehouse') continue;
      const reach = roadReach(world, f, FIRE.reach);
      if (!roads.some((t) => reach.has(t))) continue;
      const r = f.paused ? 0 : inFireStage(f) ? 1 : 2 + staffRatio(world, f);
      if (r > rank) { rank = r; pick = f; }
    }
  }
  let cause;
  if (cover >= FIRE.staffedAt) cause = 'covered';
  else if (!roads.length) cause = 'no_road';
  else if (!pick) cause = 'none';
  else cause = pick.paused ? 'paused' : inFireStage(pick) ? 'burning' : 'short';
  return { cause, cover, firehouse: pick ? pick.id : null };
}

// Fire's mood terms (spec 4.9, DANGER_MOOD): { fire } when a building was in the fire stage in the last 30 days
// (danger.lastFireDay; a blaze put out in time never sets it), { burned } for the buildings burned in the last 180 days
// (each burnedEach, at most burnedMax); a key only while its term is not 0. updateMood adds them at the month end, when
// world.day has just turned, so the last 30 days are exactly last month's.
export function fireMood(world) {
  const out = {};
  const d = world.danger;
  if (d.lastFireDay !== null && world.day - d.lastFireDay <= DAYS_PER_MONTH) out.fire = DANGER_MOOD.fireLastMonth;
  const n = d.burnDays.filter((day) => world.day - day <= DANGER_MOOD.burnedDays).length;
  if (n) out.burned = Math.max(DANGER_MOOD.burnedMax, n * DANGER_MOOD.burnedEach);
  return out;
}

// What clearing this many rubble tiles costs in this city.
export const rubbleClearCost = (world, tiles = 1) => tiles * rubbleCostOf(world);
