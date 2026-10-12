// Monuments (spec 4.16, 7.3; rulings 179-245): crews, deliveries, courses, work gold, stalls, prestige and its unlocks.
// Stage 4 contract (Track 0 fixed the names, signatures and shapes; Track A implements the STUBs and owns the file).
// A site's state lives on its building (b.site, src/sim/world.js newSite), so saving and loading mid-course changes
// nothing; nothing here reads the clock or Math.random. Everything but monumentDay, monumentMonth and
// updatePrestigeUnlocks only reads the world.
//
// Events (pushed into the optional events array; the sim never reads it):
//   { type: 'course_done', id, type: kind, course, prestige }   course: courses now done (1-based); prestige: what this
//                                                                course added to the site's prestige (ruling 242)
//   { type: 'monument_done', id, type: kind, prestige }          prestige: the completion share it added
//   { type: 'site_stalled', id, type: kind, reason }             the day a site reaches MONUMENT.stallDays without work
//   { type: 'prestige_unlock', id: kind, day }                   a prestige unlock first reached (updatePrestigeUnlocks)
//   (the palace's: src/sim/palace.js)
//
// Reason codes (siteStatus, site.reason, site_stalled), the first that applies (ruling 245): 'no_road', 'paused',
// 'no_crew', 'crew_short' (its guilds short of workers), 'crew_burning', 'no_gold', 'waiting_gilding',
// 'waiting_capstone', 'no_stone', 'no_bricks'.
import { BUILDINGS } from '../data/buildings.js';
import { MONUMENTS, MONUMENT, MATERIALS, PRESTIGE_UNLOCKS } from '../data/monuments.js';
import { DAYS_PER_MONTH } from './time.js';
import { allBuildings, isSite, isFinished } from './world.js';
import { touchesRoad, buildingsInReach } from './reach.js';
import { atLeast } from './progression.js';
import { prestigeOf, prestigeOfBuilding, prestigeByKind, holdsPrestige, monumentMood, monumentsPart } from './prestige.js';

export { prestigeOf, prestigeOfBuilding, prestigeByKind, holdsPrestige, monumentMood, monumentsPart };

// ── Pure helpers on one site (complete in the contract) ─────────────────────────────────────────────────────────

// The recipe of the course under way, or null once every course is laid.
export function courseOf(b) {
  const m = MONUMENTS[b.type];
  return m && b.site && b.site.course < m.courses.length ? m.courses[b.site.course] : null;
}

const unitsOf = (c) => c.stone + c.bricks;

// How far a site has come: { course (done), courses, inCourse (0-1 of the course under way), done (0-1 of all its
// units) }. A finished monument is { course: courses, inCourse: 1, done: 1 }.
export function siteProgress(b) {
  const m = MONUMENTS[b.type];
  const courses = m.courses.length;
  const c = courseOf(b);
  const all = m.courses.reduce((s, x) => s + unitsOf(x), 0);
  const before = m.courses.slice(0, b.site.course).reduce((s, x) => s + unitsOf(x), 0);
  const inUnits = c ? Math.min(unitsOf(c), b.site.laid.stone + b.site.laid.bricks) : 0;
  return { course: b.site.course, courses, inCourse: c ? inUnits / unitsOf(c) : 1, done: Math.min(1, (before + inUnits) / all) };
}

// The units of each material its unfinished courses still need (the course under way less what is laid on it).
export function remainingNeed(b) {
  const m = MONUMENTS[b.type];
  const out = { stone: 0, bricks: 0 };
  if (!m || !b.site) return out;
  m.courses.forEach((c, i) => {
    if (i < b.site.course) return;
    for (const g of MATERIALS) out[g] += c[g] - (i === b.site.course ? b.site.laid[g] : 0);
  });
  for (const g of MATERIALS) out[g] = Math.max(0, out[g]);
  return out;
}

// The stockpile's room for each material (ruling 238): the pile holds at most MONUMENT.stockPerCrew x the kind's most
// crews in all, and never more of one material than the courses still need (what is on site counts).
export function stockRoom(b) {
  const out = { stone: 0, bricks: 0 };
  if (!isSite(b)) return out;
  const cap = MONUMENT.stockPerCrew * MONUMENTS[b.type].crews;
  const held = b.site.stock.stone + b.site.stock.bricks;
  const need = remainingNeed(b);
  for (const g of MATERIALS) out[g] = Math.max(0, Math.min(cap - held, need[g] - b.site.stock[g]));
  return out;
}

// The game days left at last month's pace (spec 6.3 Pace row): the units still to lay over last month's units a day,
// rounded up; null when no month has passed for the site, last month laid nothing, or it is finished.
export function paceOf(world, b) {
  if (!isSite(b) || !b.site.last || !(b.site.last.units > 0)) return null;
  const left = remainingNeed(b);
  return Math.ceil(((left.stone + left.bricks) / b.site.last.units) * DAYS_PER_MONTH);
}

// The guilds whose crews work the site (today's, as monumentDay left them, in the order they took it) and the most it
// takes: { guilds: [ids], max }. Complete from state; Track A keeps site.crews true.
export const crewsFor = (world, b) => ({ guilds: b.site ? b.site.crews.slice() : [], max: MONUMENTS[b.type] ? MONUMENTS[b.type].crews : 0 });

// The guild ids within a footprint's crew reach, nearest first (the placing chip's "builders' guild near"; ruling 230).
// STUB in part: Track A adds "with room for a crew" (a guild already at work elsewhere does not count). probe: { x, y, w, d }.
export const guildsNear = (world, probe) => buildingsInReach(world, { id: -1, ...probe }, MONUMENT.crewReach, (o) => o.type === 'builders_guild').map((r) => r.b.id);

// Whether anything could bring this material to a footprint: a maker of it within its producer reach, or a storehouse
// within the site's supply reach that holds some (the placing chip's "Stone near"; ruling 230).
export function supplyNear(world, probe, good) {
  const p = { id: -1, ...probe };
  const maker = (o) => BUILDINGS[o.type].produces && BUILDINGS[o.type].produces.good === good;
  if (buildingsInReach(world, p, MONUMENT.producerReach, maker).length) return true;
  return buildingsInReach(world, p, MONUMENT.supplyReach, (o) => o.type === 'storehouse' && (o.store[good] || 0) > 0).length > 0;
}

// ── The sheet's facts ───────────────────────────────────────────────────────────────────────────────────────────

// Everything the site sheet says, computed from the sim's own rules (spec 6.3, ruling 210):
//   { id, type, finished, day (finished day or null), paused, road, progress: siteProgress(b), crews: crewsFor(world, b),
//     materials: { stone: { onSite, need, makers: [ids], stores: [ids] }, bricks: { ... } } (only the materials the kind uses),
//     last: site.last, pace: paceOf, prestige: { now, more, holds } (more: what is still to come; holds: whether this one
//     counts for its kind), stalled (site.idle >= MONUMENT.stallDays), reason }
// STUB in part: makers and stores are [] and reason is the stored site.reason (or 'no_road' / 'paused' from state) until
// Track A lists what reaches the site and judges the cause as monumentDay does. null for a building that is not a monument.
export function siteStatus(world, b) {
  const m = b && MONUMENTS[b.type];
  if (!m || !b.site) return null;
  const road = touchesRoad(world, b);
  const finished = isFinished(b);
  const need = remainingNeed(b);
  const used = MATERIALS.filter((g) => m.courses.some((c) => c[g] > 0));
  const materials = Object.fromEntries(used.map((g) => [g, { onSite: b.site.stock[g], need: need[g], makers: [], stores: [] }]));
  const now = prestigeOfBuilding(b);
  let reason = null;
  if (!finished) reason = !road ? 'no_road' : b.paused ? 'paused' : b.site.reason;
  return {
    id: b.id, type: b.type, finished, day: b.site.done, paused: Boolean(b.paused), road,
    progress: siteProgress(b), crews: crewsFor(world, b), materials, last: b.site.last, pace: paceOf(world, b),
    prestige: { now, more: m.prestige.courses + m.prestige.done - now, holds: holdsPrestige(world, b) },
    stalled: !finished && road && !b.paused && b.site.idle >= MONUMENT.stallDays, reason,
  };
}

// ── The daily and monthly steps ─────────────────────────────────────────────────────────────────────────────────

// STUB. The daily step, run by tickDay right after produceDay (before fire and raids): crews to sites (one guild, one
// crew, the nearest unpaused, unfinished, road-touching site within MONUMENT.crewReach with room; staffing as any
// producer's, none below MIN_STAFF_RATIO), deliveries counted (quarries and brickworks send to sites first: production.js;
// sites draw from storehouses within MONUMENT.supplyReach), work laid in each course's proportion, work gold paid daily
// (workGoldPerUnit, whole gold, the fraction carried, sites in founding order, never below 0), the gilding or capstone
// paid as the last course begins (extraGoldOf, never below 0), courses and monuments finished (site.course, site.done,
// tallies, events), site.crews, site.idle, site.reason and site.month kept, and a 'site_stalled' event the day idle
// reaches MONUMENT.stallDays. A road-less or paused site does nothing and its idle stays 0.
export function monumentDay(world, events = null) {}

// The monthly step, run by runMonth right after monthlyEconomy (which starts stats.lastMonth): each site's month becomes
// its last (a site finished before this month keeps its last), a month in which a crew stood idle for lack of material
// marks it starved (the Steady hands feat), and stats.lastMonth.monuments is the month's monument gold (work, gilding and
// capstone; founding counts with building costs). Complete in the contract; Track A owns it.
export function monumentMonth(world, events = null) {
  let gold = 0;
  for (const b of allBuildings(world)) {
    if (!b.site) continue;
    const mo = b.site.month;
    gold += mo.gold;
    if (mo.starvedDays > 0) b.site.starved = true;
    if (b.site.done === null || mo.units > 0 || mo.gold > 0) b.site.last = { units: mo.units, gold: mo.gold, crews: mo.crews };
    b.site.month = { units: 0, gold: 0, crews: 0, crewDays: 0, starvedDays: 0 };
  }
  if (world.stats.lastMonth) world.stats.lastMonth.monuments = gold;
}

// Monument warnings (spec 4.16, ruling 211, 244): { code: 'site_stalled', id, reason } for every unpaused, unfinished,
// road-touching site with MONUMENT.stallDays or more days in a row without work, ascending id. A road-less site has the
// existing 'no_road' warning instead; a paused one none. Complete from state (Track A keeps site.idle and site.reason).
export function monumentAlerts(world) {
  const out = [];
  for (const b of allBuildings(world)) {
    if (!isSite(b) || b.paused || b.site.idle < MONUMENT.stallDays || !touchesRoad(world, b)) continue;
    out.push({ code: 'site_stalled', id: b.id, reason: b.site.reason });
  }
  return out;
}

// The prestige unlocks (spec 4.14, ruling 243): the day the city first has a kind's milestone and its prestige together
// is recorded once in world.prestigeUnlocks (it stays, as a milestone does), the type joins newItems (its card says
// "New") and a 'prestige_unlock' event is pushed. The small pyramid's day is also the 'pyramids' split, and the day the
// first great pyramid is seen finished the 'great_pyramid' split (spec 4.19). Run daily by tickDay after monumentDay (not
// by settle: prestige and the milestone change only in the tick). Complete in the contract.
export function updatePrestigeUnlocks(world, events = null) {
  let prestige = null;
  for (const k of PRESTIGE_UNLOCKS) {
    if (Number.isInteger(world.prestigeUnlocks[k])) continue;
    const u = MONUMENTS[k].unlock;
    if (!atLeast(world, u.milestone)) continue;
    if (prestige === null) prestige = prestigeOf(world);
    if (prestige < u.prestige) continue;
    world.prestigeUnlocks[k] = world.day;
    if (!world.newItems.includes(k)) world.newItems.push(k);
    if (k === 'pyramid_small' && !Number.isInteger(world.splits.pyramids)) world.splits.pyramids = world.day;
    if (events) events.push({ type: 'prestige_unlock', id: k, day: world.day });
  }
  if (!Number.isInteger(world.splits.great_pyramid)) {
    const done = allBuildings(world).find((b) => b.type === 'pyramid_great' && isFinished(b));
    if (done) world.splits.great_pyramid = done.site.done;
  }
}


// ── What the supply buildings are doing (Stage 4, Task 0.4) ───────────────────────────────────────────────────────

// The site a builders' guild's crew works today (the site whose site.crews holds it), or null: its sheet's "Crew at work
// on the small mastaba" and the guild yard's art. Complete from state; Track A keeps site.crews true.
export function guildSite(world, g) {
  for (const b of allBuildings(world)) if (isSite(b) && b.site.crews.includes(g.id)) return b.id;
  return null;
}

// STUB. Whether a quarry or brickworks is needed (ruling 237): an unpaused, unfinished, road-touching site that still needs
// its material and has stockpile room lies in its producer reach, or within MONUMENT.supplyReach of a storehouse in its
// producer reach that accepts the material and has room. An idle one makes nothing, employs nobody and pays no wages
// (upkeep still runs), its sheet says "Idle: no monument site needs stone within reach" and its art lays its tools down.
// true for any other building. Until Track A: always true (a quarry works as any producer does).
export function supplyNeeded(world, b) {
  return true;
}
