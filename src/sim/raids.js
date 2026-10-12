// Raids (spec 4.3, 4.9, 4.13). Stage 3 contract: Track 0 fixed every name, signature and shape here; Track B implements
// the functions marked STUB and may add private helpers. Draws are hash2(world.seed, raid index, RAID_SALT.x).
//
// State: world.raid = { clockDay, nextWarnDay, index, warning, active, adaptation, last } (newRaidState in world.js).
//   clockDay      the day the city first had RAIDS.clockPeople people (null until then; never on Peaceful)
//   nextWarnDay   the day the next warning appears (null while the clock has not started)
//   index         raids warned so far: the next warning's index (the first raid is index 0)
//   warning       null, or the raid on its way:
//                 { index, entry: { x, y }, dir, size, tribute, target, day, arrives, first }
//                 dir: 'north' | 'east' | 'south' | 'west' (entryDir); size: raiders, fixed now; tribute: gold, or null
//                 for the first raid (hidden); target: the RAIDS.targets kind it is after, or 'building'; day: the
//                 warning's day; arrives: day + RAIDS.warningDays; first: index === 0
//   active        null, or the raid under way: { index, entry, dir, size, target, day, raiders, phase, targetId, struck,
//                 wait, byTowers, bySoldiers, burned, stolen, shots }
//                 raiders: [{ id, x, y, hp, hit }] (tile coordinates, may be fractional; hit: hurt at least once);
//                 phase: 'attack' | 'strike' | 'leave' | 'retreat'; targetId: the building the band is going for; struck:
//                 ids struck so far (at most RAIDS.strikes); wait: days left at the current strike; byTowers, bySoldiers:
//                 raiders stopped by each; burned: buildings the raid's blazes burned down; stolen: gold taken; shots: the
//                 day's tower shots [{ from: { x, y }, to: { x, y } }] for the arrows (Track C draws them)
//   adaptation    1, or less after a lost raid (RAIDS.adaptLost, then + RAIDS.adaptStep per raid up to 1)
//   last          null, or the last raid's report: { index, dir, size, won, byTowers, bySoldiers, towers, burned, stolen,
//                 day } (day: the day it ended; a raid paid off leaves no report and no mood term)
// world.soldiers (combat.js), world.nextUnitId (raiders and soldiers share it), and the tallies raids, raidsBeaten,
// raidsLost, tributes, raidersByTowers, raidersBySoldiers, soldiersWounded and goldStolen are raids'.
//
// Events: { type: 'raid_warning', index, entry, dir, size, tribute, target, arrives, first } (the sim has paused the
// game for the first, dropped 2x or 3x to 1x for later ones); { type: 'raid_start', index, dir, size } (the sim has
// dropped 2x or 3x to 1x); { type: 'raid_strike', id, stolen } (a target struck); { type: 'raid_end', won, report }
// (report as raid.last); { type: 'tribute', index, cost } is never pushed: payTribute is a command and returns it.
// Alerts (raidAlerts): { code: 'raid_warning', x, y, dir, arrives } and { code: 'raid', x, y, left } (left: raiders still
// on the map), both critical and pinned at a map point (x, y: the entry, or the band's centre while it is on the map).
//
// Track B's fields (the contract lets the owner add them inside its records):
//   active.x, active.y   the band's tile: the band moves as one, UNITS.raider.speed tiles a day, along flowField; each
//                        raider stands at the tile's centre plus a small offset by its id (SLOTS), so they read as a group
//   active.blocked       the tile index of the standing wall tile in the band's way (its raiders hit it), or null
//   active.towerIds      the towers that have shot during the raid (the report's towers)
//   active.fires         [{ id, type }]: buildings the raid set alight that are still burning; when one burns down,
//                        burned goes up and its type joins burnedKinds. The report keeps both and goes on counting, so
//                        raid.last.burned can still rise after the raid ends while its fires burn out
//   active.burnedKinds   the types the raid's fires burned down, in order (the report names one kind: "1 storehouse")
// A day of a raid (raidDay): combat (combat.js); the end when no raider is left; retreat once RAIDS.retreatShare of the
// raiders (rounded up) have fallen; then, unless a raider is fighting, the band waits out a strike or takes one step: to
// the target it is after (attack), back to its entry (leave, after RAIDS.strikes strikes; retreat), or stops before a
// standing wall tile and hits it the next day. Reaching its target the band strikes at once (strike): the blaze, the
// theft and RAIDS.strikeDays days there. Reaching the entry it leaves the map and the raid ends, lost after its strikes and
// beaten in retreat. A target is the nearest (straight line from the band) unstruck building of the warned kind, else of
// each kind below it in RAIDS.targets, else any other building but a home or rubble, that the band can reach.
import { RAIDS, RAID_SALT, UNITS } from '../data/raids.js';
import { DANGER_MOOD } from '../data/mood.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, population } from './world.js';
import { isWorking } from './labour.js';
import { costOf, riskOf, raidsOn } from './costs.js';
import { spend } from './money.js';
import { hash2 } from './rng.js';
import { setSpeed } from './commands.js';
import { idx, ring, inBounds } from './grid.js';
import { igniteBuilding } from './fire.js';
import { flowField, tileCost } from './pathfinding.js';
import { healWalls } from './defence.js';
import { trainSoldiers, combatDay, soldiersHome } from './combat.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });

// The edge an entry point sits on, named as the warning words it ("from the east").
export function entryDir(world, entry) {
  if (entry.x >= world.size - 1) return 'east';
  if (entry.x <= 0) return 'west';
  if (entry.y <= 0) return 'north';
  return 'south';
}

// The staffed towers that would beat a raid of this size (spec 4.13): ceil(raiders / 3).
export const towersNeeded = (size) => Math.ceil(size / RAIDS.raidersPerTower);

// Towers that are working now (staffed at 25% or more and not paused).
export const workingTowers = (world) => allBuildings(world).filter((b) => b.type === 'tower' && isWorking(world, b)).length;

// The kind of building a raid warned now would be after: the first of RAIDS.targets the city has, else 'building'
// (any other building that is not a home).
export function raidTargetKind(world) {
  const types = new Set(allBuildings(world).map((b) => b.type));
  return RAIDS.targets.find((t) => types.has(t)) || 'building';
}

// Stage 4 (spec 4.16, 4.20, ruling 195): monuments (finished or under way, with their stockpiles) and the palace are not
// wealth and never a raid's target.
const raidProof = (b) => Boolean(BUILDINGS[b.type].monument || BUILDINGS[b.type].palace);

// The city's wealth for raid size (spec 4.13): the treasury if above 0, plus the base cost of every standing building
// (roads and walls are not buildings; rubble costs nothing; monuments and the palace do not count).
export function raidWealth(world) {
  let w = Math.max(0, world.gold);
  for (const b of allBuildings(world)) if (!raidProof(b)) w += BUILDINGS[b.type].cost;
  return w;
}

// The raiders a raid warned now would bring (spec 4.13): RAIDS.firstSize for the first raid (index 0) at every level;
// otherwise round((1 + people / 125 + clamp((wealth - 5000) / 5000, 0, 4)) x the difficulty's risk x adaptation),
// between RAIDS.minSize and RAIDS.maxSize. The warning fixes it; Safety's defence term (score.js) reads it for "now".
export function raidSize(world) {
  if (world.raid.index === 0) return RAIDS.firstSize;
  const wealth = Math.min(RAIDS.wealthMax, Math.max(0, (raidWealth(world) - RAIDS.wealthBase) / RAIDS.wealthStep));
  const raw = 1 + population(world) / RAIDS.peoplePerRaider + wealth;
  return Math.max(RAIDS.minSize, Math.min(RAIDS.maxSize, Math.round(raw * riskOf(world) * world.raid.adaptation)));
}

// A raid's tribute (spec 4.13): round(RAIDS.tributeShare x towers needed x the tower's price in this city), fixed when
// the warning appears (warning.tribute; null for the first raid, which cannot be paid off).
export const tributeFor = (world, size) => Math.round(RAIDS.tributeShare * towersNeeded(size) * costOf(world, 'tower'));

// The day a later warning appears (spec 4.13): RAIDS.laterMin to RAIDS.laterMax days after fromDay (the last raid's
// arrival day, or the day a cancelled raid would have arrived), drawn by hash2(seed, the next raid's index, salt).
export function laterWarnDay(world, fromDay) {
  const span = RAIDS.laterMax - RAIDS.laterMin + 1;
  return fromDay + RAIDS.laterMin + Math.floor(hash2(world.seed, world.raid.index, RAID_SALT.gap) * span);
}

// The warned raid's tribute and the defence it could buy instead, or null with no warning up:
// { cost, size, towersNeeded, towersHave, buildN, buildCost, hidden, payable, reason }
// cost: the warning's tribute (null for the first raid); hidden: the first raid; buildN: max(0, towers needed - working
// towers); buildCost: buildN x the tower's price; payable and reason: what payTribute would say now (reason null when
// payable).
export function tributeQuote(world) {
  const w = world.raid.warning;
  if (!w) return null;
  const need = towersNeeded(w.size), have = workingTowers(world), buildN = Math.max(0, need - have);
  const reason = w.first ? 'first_raid' : world.gold - w.tribute < 0 ? 'below_zero' : null;
  return { cost: w.tribute, size: w.size, towersNeeded: need, towersHave: have, buildN, buildCost: buildN * costOf(world, 'tower'), hidden: Boolean(w.first), payable: !reason, reason };
}

// The payTribute command (spec 4.13, 7.3): pays the warned raid's tribute and cancels the raid: no raiders, no report,
// no mood term; the adaptation steps up as after any raid, and the next warning comes laterWarnDay after the day it
// would have arrived. { ok: true, cost, warnings: [] }, or fails with 'no_warning' (none up: raiders that have arrived
// are no longer a warning), 'first_raid' (it cannot be paid off) or 'below_zero' (the treasury would go below 0).
export function payTribute(world) {
  const w = world.raid.warning;
  if (!w) return fail('no_warning');
  if (w.first) return fail('first_raid');
  if (world.gold - w.tribute < 0) return fail('below_zero');
  spend(world, w.tribute);
  world.tally.tributes += 1;
  world.raid.adaptation = Math.min(1, world.raid.adaptation + RAIDS.adaptStep);
  world.raid.nextWarnDay = laterWarnDay(world, w.arrives);
  world.raid.warning = null;
  return { ok: true, cost: w.tribute, warnings: [] };
}

// Raises the warning for the raid at world.raid.index (spec 4.3, 4.13): its entry by hash2(seed, index,
// RAID_SALT.entry) among world.raiderEntries (a map without any has no raids), its direction, its size and tribute fixed
// now, the target kind now, arriving RAIDS.warningDays later. The first warning pauses the game; later ones drop 2x or 3x
// to 1x (setSpeed). index then counts it, so laterWarnDay draws the next raid's gap.
function raiseWarning(world, events) {
  const r = world.raid, entries = world.raiderEntries;
  if (!entries.length) return;
  const index = r.index, first = index === 0;
  const entry = { ...entries[Math.floor(hash2(world.seed, index, RAID_SALT.entry) * entries.length)] };
  const size = raidSize(world);
  const w = { index, entry, dir: entryDir(world, entry), size, tribute: first ? null : tributeFor(world, size), target: raidTargetKind(world), day: world.day, arrives: world.day + RAIDS.warningDays, first };
  r.warning = w;
  r.index = index + 1;
  if (first) setSpeed(world, 0);
  else if (world.speed > 1) setSpeed(world, 1);
  if (events) events.push({ type: 'raid_warning', index, entry: { ...entry }, dir: w.dir, size, tribute: w.tribute, target: w.target, arrives: w.arrives, first });
}

// The day's raid step (spec 4.3, 4.13), run by tickDay after fireDay; world.day is the day being simulated. Barracks
// train every day on every level (combat.js). The rest never runs on Peaceful (raidsOn): the clock starts the first day
// the city has RAIDS.clockPeople people (its peak counts: a city that had them keeps its clock), and the first warning
// comes RAIDS.firstWarnAfter days later; a warning is raised on nextWarnDay when none is up and no raid is under way,
// and its raiders arrive on its arrives day. A raid under way has its day (raidStep); soldiers with none walk home.
export function raidDay(world, events = null) {
  trainSoldiers(world, events);
  const r = world.raid, day = world.day;
  if (raidsOn(world) && r.clockDay === null && Math.max(world.tally.peakPeople, population(world)) >= RAIDS.clockPeople) {
    r.clockDay = day;
    r.nextWarnDay = day + RAIDS.firstWarnAfter;
  }
  trackFires(world, r.active);
  trackFires(world, r.last);
  if (r.active) return raidStep(world, events);
  soldiersHome(world);
  if (!raidsOn(world)) return;
  if (r.warning) { if (day >= r.warning.arrives) arrive(world, events); }
  else if (r.nextWarnDay !== null && day >= r.nextWarnDay) raiseWarning(world, events);
}

// STUB. The month-end raid step, run by runMonth before mood (nothing required yet; kept so a later rule has its seam).
export function raidMonth(world, events = null) {}

// The band's centre as a map tile: the mean of its raiders' points, or the entry when none is left.
function bandCentre(a) {
  if (!a.raiders.length) return { x: a.entry.x, y: a.entry.y };
  const n = a.raiders.length;
  return { x: Math.floor(a.raiders.reduce((s, u) => s + u.x, 0) / n), y: Math.floor(a.raiders.reduce((s, u) => s + u.y, 0) / n) };
}

// Raids' alerts, both critical: { code: 'raid', x, y, left } while raiders are on the map (x, y: the band's centre;
// left: raiders still on the map) and { code: 'raid_warning', x, y, dir, arrives } while a raid is on its way (x, y: its
// entry). A warning and a raid are never up at once.
export function raidAlerts(world) {
  const r = world.raid, out = [];
  if (r.active) out.push({ code: 'raid', ...bandCentre(r.active), left: r.active.raiders.length });
  if (r.warning) out.push({ code: 'raid_warning', x: r.warning.entry.x, y: r.warning.entry.y, dir: r.warning.dir, arrives: r.warning.arrives });
  return out;
}

// Where each raider stands in the band's tile, by its id: the centre and eleven spots around it.
const SLOTS = [[0, 0], [0.25, 0.2], [-0.25, 0.2], [0.25, -0.2], [-0.25, -0.2], [0, 0.32], [0, -0.32], [0.32, 0], [-0.32, 0], [0.16, 0.34], [-0.16, -0.34], [0.34, -0.16]];
function placeBand(a) {
  for (const u of a.raiders) {
    const [dx, dy] = SLOTS[u.id % SLOTS.length];
    u.x = a.x + 0.5 + dx;
    u.y = a.y + 0.5 + dy;
  }
}

// The raiders arrive at the warned entry (spec 4.13): the warning becomes the raid under way, every standing wall tile
// is at its full hit points (a tower on a wall tile at DEFENCE.towerOnWallHp), tally.raids counts it, 2x or 3x drops to
// 1x, and raid_start is pushed. They make their first move the next day.
function arrive(world, events) {
  const r = world.raid, w = r.warning;
  const raiders = [];
  for (let k = 0; k < w.size; k++) raiders.push({ id: world.nextUnitId++, x: 0, y: 0, hp: UNITS.raider.hp, hit: false });
  const a = {
    index: w.index, entry: { ...w.entry }, dir: w.dir, size: w.size, target: w.target, day: world.day, raiders, phase: 'attack', targetId: null,
    struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [], x: w.entry.x, y: w.entry.y, blocked: null, towerIds: [], fires: [], burnedKinds: [],
  };
  placeBand(a);
  r.active = a;
  r.warning = null;
  world.tally.raids += 1;
  healWalls(world);
  if (world.speed > 1) setSpeed(world, 1);
  if (events) events.push({ type: 'raid_start', index: a.index, dir: a.dir, size: a.size });
}

// The tiles next to a building that a raider could stand on: its strike goals.
function ringGoals(world, b) {
  return ring(b.x, b.y, b.w, b.d).filter(([x, y]) => inBounds(world.size, x, y) && tileCost(world, x, y) !== Infinity);
}

// The building the band goes for next, or null (see the header): the warned kind first, then each kind below it, then
// any building but a home or rubble; nearest first, ties to the lower id; one it can reach.
function pickTarget(world, a) {
  const at = idx(world.size, a.x, a.y), here = { x: a.x + 0.5, y: a.y + 0.5 };
  const kinds = RAIDS.targets.includes(a.target) ? RAIDS.targets.slice(RAIDS.targets.indexOf(a.target)) : [];
  const groups = [...kinds.map((k) => (b) => b.type === k), (b) => b.type !== 'house' && b.type !== 'rubble' && !raidProof(b)];
  for (const match of groups) {
    const near = allBuildings(world).filter((b) => match(b) && !a.struck.includes(b.id))
      .map((b) => ({ b, d: Math.hypot(b.x + b.w / 2 - here.x, b.y + b.d / 2 - here.y) }))
      .sort((p, q) => p.d - q.d || p.b.id - q.b.id);
    for (const { b } of near) if (flowField(world, ringGoals(world, b)).dist[at] !== Infinity) return b;
  }
  return null;
}

// A strike (spec 4.13): a blaze through the fire system (Track A's igniteBuilding; the building is followed while it
// burns, see trackFires), and each raider steals RAIDS.stealShare of the treasury, at least RAIDS.stealMin and at most
// RAIDS.stealMax, never taking it below 0. The band stays RAIDS.strikeDays days, this one included.
function strike(world, a, b, events) {
  if (igniteBuilding(world, b.id, events, 'raid')) a.fires.push({ id: b.id, type: b.type });
  let stolen = 0;
  for (let k = 0; k < a.raiders.length; k++) {
    const take = Math.min(Math.max(0, world.gold), Math.max(RAIDS.stealMin, Math.min(RAIDS.stealMax, Math.round(world.gold * RAIDS.stealShare))));
    world.gold -= take;
    stolen += take;
  }
  a.stolen += stolen;
  world.tally.goldStolen += stolen;
  a.struck.push(b.id);
  a.targetId = b.id;
  a.phase = 'strike';
  a.wait = RAIDS.strikeDays;
  if (events) events.push({ type: 'raid_strike', id: b.id, stolen });
}

// Follows the raid's fires (active.fires, then the report's): one put out is dropped; one whose building is gone on a
// day a building burned down (danger.burnDays, written by fire.js) counts as burned, with its type.
function trackFires(world, rec) {
  if (!rec || !rec.fires || !rec.fires.length) return;
  const burnDays = world.danger.burnDays;
  rec.fires = rec.fires.filter((f) => {
    const b = world.buildings[f.id];
    if (b) return Boolean(b.fire);
    if (burnDays.length && burnDays[burnDays.length - 1] === world.day) { rec.burned += 1; rec.burnedKinds.push(f.type); }
    return false;
  });
}

// The raid is over (spec 4.13): no raider is left on the map. Beaten (won) when the raiders retreated or all fell, lost
// when the band left after its strikes. The report becomes raid.last; the tallies, the adaptation (a lost raid sets
// RAIDS.adaptLost, any other adds RAIDS.adaptStep up to 1) and the next warning (laterWarnDay after the arrival day)
// follow; hit wall tiles heal; soldiers out walk back.
function endRaid(world, events, won) {
  const r = world.raid, a = r.active;
  const report = {
    index: a.index, dir: a.dir, size: a.size, won, byTowers: a.byTowers, bySoldiers: a.bySoldiers, towers: a.towerIds.length, burned: a.burned,
    stolen: a.stolen, day: world.day, burnedKinds: a.burnedKinds.slice(), fires: a.fires.map((f) => ({ ...f })),
  };
  r.active = null;
  r.last = report;
  world.tally[won ? 'raidsBeaten' : 'raidsLost'] += 1;
  r.adaptation = won ? Math.min(1, r.adaptation + RAIDS.adaptStep) : RAIDS.adaptLost;
  r.nextWarnDay = laterWarnDay(world, a.day);
  healWalls(world);
  for (const s of world.soldiers) if (s.task === 'out') s.task = 'back';
  if (events) events.push({ type: 'raid_end', won, report: JSON.parse(JSON.stringify(report)) });
}

// One day of the raid under way (see the header).
function raidStep(world, events) {
  const a = world.raid.active;
  if (!Number.isInteger(a.x)) Object.assign(a, bandCentre(a));      // a raid set up in the contract's shape alone
  if (a.blocked === undefined) a.blocked = null;
  if (!a.towerIds) a.towerIds = [];
  if (!a.fires) a.fires = [];
  if (!a.burnedKinds) a.burnedKinds = [];
  const { fighting } = combatDay(world, events);
  if (!a.raiders.length) return endRaid(world, events, true);
  if (a.phase !== 'retreat' && a.size - a.raiders.length >= Math.ceil(a.size * RAIDS.retreatShare)) {
    a.phase = 'retreat';
    a.targetId = null;
    a.wait = 0;
  }
  if (fighting) return;
  if (a.phase === 'strike') {
    a.wait -= 1;
    if (a.wait > 0) return;
    a.phase = a.struck.length >= RAIDS.strikes ? 'leave' : 'attack';
    a.targetId = null;
  }
  for (let step = 0; step < UNITS.raider.speed; step++) {
    let goals;
    if (a.phase === 'attack') {
      let t = a.targetId ? world.buildings[a.targetId] : null;
      if (!t || flowField(world, ringGoals(world, t)).dist[idx(world.size, a.x, a.y)] === Infinity) t = pickTarget(world, a);
      if (t) { a.targetId = t.id; goals = ringGoals(world, t); }
      else { a.phase = 'leave'; a.targetId = null; }
    }
    if (a.phase !== 'attack') goals = [[a.entry.x, a.entry.y]];
    const field = flowField(world, goals);
    const here = idx(world.size, a.x, a.y);
    if (field.dist[here] === 0 || field.dist[here] === Infinity) return reach(world, a, events);
    const [nx, ny] = field.next(a.x, a.y);
    const ni = idx(world.size, nx, ny);
    if (world.wall[ni] > 0) { a.blocked = ni; return; }
    a.blocked = null;
    a.x = nx;
    a.y = ny;
    placeBand(a);
    if (field.dist[ni] === 0) return reach(world, a, events);
  }
}

// The band is at its goal: its target (a strike), or its entry (it leaves the map and the raid ends). A band that can
// no longer reach its entry slips away at once.
function reach(world, a, events) {
  if (a.phase === 'attack') return strike(world, a, world.buildings[a.targetId], events);
  const won = a.phase === 'retreat';
  a.raiders = [];
  return endRaid(world, events, won);
}

// The raid mood term (spec 4.9, DANGER_MOOD): { raid: raidBeaten or raidLost } for raidDays after the last raid ended,
// by its outcome; {} otherwise (and for a raid paid off, which leaves no report).
export function raidMood(world) {
  const last = world.raid.last;
  if (!last || world.day - last.day >= DANGER_MOOD.raidDays) return {};
  return { raid: last.won ? DANGER_MOOD.raidBeaten : DANGER_MOOD.raidLost };
}
