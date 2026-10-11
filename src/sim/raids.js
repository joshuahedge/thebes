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
import { RAIDS, RAID_SALT } from '../data/raids.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, population } from './world.js';
import { isWorking } from './labour.js';
import { costOf, riskOf, raidsOn } from './costs.js';
import { spend } from './money.js';
import { hash2 } from './rng.js';
import { setSpeed } from './commands.js';

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

// The city's wealth for raid size (spec 4.13): the treasury if above 0, plus the base cost of every standing building
// (roads and walls are not buildings; rubble costs nothing).
export function raidWealth(world) {
  let w = Math.max(0, world.gold);
  for (const b of allBuildings(world)) w += BUILDINGS[b.type].cost;
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

// The day's raid step (spec 4.3, 4.13), run by tickDay after fireDay; world.day is the day being simulated. Never on
// Peaceful (raidsOn). The clock starts the first day the city has RAIDS.clockPeople people (its peak counts: a city that
// had them keeps its clock), and the first warning comes RAIDS.firstWarnAfter days later; a warning is raised on
// nextWarnDay when none is up and no raid is under way.
export function raidDay(world, events = null) {
  if (!raidsOn(world)) return;
  const r = world.raid, day = world.day;
  if (r.clockDay === null && Math.max(world.tally.peakPeople, population(world)) >= RAIDS.clockPeople) {
    r.clockDay = day;
    r.nextWarnDay = day + RAIDS.firstWarnAfter;
  }
  if (!r.warning && !r.active && r.nextWarnDay !== null && day >= r.nextWarnDay) raiseWarning(world, events);
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

// STUB. The raid mood term (spec 4.9, DANGER_MOOD): { raid } for raidDays after a raid ends, by its outcome; {} otherwise.
export function raidMood(world) {
  return {};
}
