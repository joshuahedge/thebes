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
import { isWorking, staffRatio } from './labour.js';
import { storeAccepts, hasSpace } from './production.js';
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

// The guild ids within a footprint's crew reach that have room for a crew, nearest first (the placing chip's "builders'
// guild near"; ruling 230): unpaused, and not already at work on a site in today's crew plan. probe: { x, y, w, d }.
export function guildsNear(world, probe) {
  const plan = crewPlan(world);
  const free = (o) => o.type === 'builders_guild' && !o.paused && !plan.has(o.id);
  return buildingsInReach(world, { id: -1, ...probe }, MONUMENT.crewReach, free).map((r) => r.b.id);
}

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

// ── Crews and work (Track A) ────────────────────────────────────────────────────────────────────────────────────

const EPS = 1e-6;   // a course, a stockpile or a crew's day closer than this to its end counts as there

// Tallies and month counts add up fractions (a full crew lays 2/3 a unit a day); a sum this close to a whole number is
// that number, so a month or a course adds up to 20 and not to 19.999999999999996.
const snap = (v) => (Math.abs(v - Math.round(v)) < EPS ? Math.round(v) : v);

// The units one builders' guild's crew lays in a day: MONUMENT.unitsPerCrewMonth a month at full staff, in proportion to
// its staffing like any producer's (spec 4.16). Whether it works at all is isWorking's (MIN_STAFF_RATIO, not burning).
export const crewDayUnits = (world, g) => (MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH) * staffRatio(world, g);

// A site a crew can work: unfinished, unpaused and touching a road (spec 4.16, ruling 226).
const openSite = (world, b) => isSite(b) && !b.paused && touchesRoad(world, b);

// Which site each builders' guild's crew goes to today (spec 4.16, ruling 184): guild id -> site id, in the order the
// crews took their sites. Every guild that is unpaused and touches a road may work any open site within
// MONUMENT.crewReach road tiles; the pairs are taken nearest first (ties to the older guild, then the older site), each
// guild taking one site and each site at most its kind's crews. So each guild works the nearest open site that still
// had room when its turn came, and where two guilds want a site's last place the nearer one gets it. A guild short of
// workers or burning still holds its place (the site then names it as the cause, ruling 245); a paused guild, or one
// with no road, holds none. Pure: labour.js reads it to employ only guilds with a site, and monumentDay to put the
// crews to work.
export function crewPlan(world) {
  const plan = new Map();
  const open = new Set();
  for (const b of allBuildings(world)) if (openSite(world, b)) open.add(b.id);
  if (!open.size) return plan;
  const pairs = [];
  for (const g of allBuildings(world)) {
    if (g.type !== 'builders_guild' || g.paused || !touchesRoad(world, g)) continue;
    for (const r of buildingsInReach(world, g, MONUMENT.crewReach, (o) => open.has(o.id))) pairs.push({ g: g.id, s: r.b, d: r.dist });
  }
  pairs.sort((p, q) => p.d - q.d || p.g - q.g || p.s.id - q.s.id);
  const taken = new Map();
  for (const { g, s } of pairs) {
    if (plan.has(g) || (taken.get(s.id) || 0) >= MONUMENTS[s.type].crews) continue;
    plan.set(g, s.id);
    taken.set(s.id, (taken.get(s.id) || 0) + 1);
  }
  return plan;
}

// Whether a workplace of the monuments priority has work today, so labour.js employs it (spec 4.8, 4.16, ruling 187): a
// builders' guild only while the crew plan gives it a site, a quarry or brickworks only while supplyNeeded. Any other
// building: true. plan: crewPlan(world), passed in so labour.js works it out once a day.
export function hasMonumentWork(world, b, plan = null) {
  if (b.type === 'builders_guild') return (plan || crewPlan(world)).has(b.id);
  if (materialOf(b)) return supplyNeeded(world, b);
  return true;
}

// What one crew would lay today with `cap` units of work (pure: the site is not touched). It lays the course under way
// from the stockpile in the course's recipe proportion (ruling 239: a course naming two materials waits when either is
// missing) and carries on into the next course when it finishes one, until its work for the day is done, a material
// runs out (short: the first missing, in MATERIALS order) or the monument is finished. st is the site's course, laid
// and stock afterwards; courses how many it finished; by the units of each material laid.
function planCrew(b, cap) {
  const m = MONUMENTS[b.type];
  const st = { course: b.site.course, laid: { ...b.site.laid }, stock: { ...b.site.stock } };
  const p = { units: 0, by: { stone: 0, bricks: 0 }, courses: 0, short: null, st };
  let left = cap;
  while (left > EPS && st.course < m.courses.length) {
    const c = m.courses[st.course];
    const total = c.stone + c.bricks;
    const rest = total - st.laid.stone - st.laid.bricks;
    let u = Math.min(left, rest);
    for (const g of MATERIALS) if (c[g] > 0) u = Math.min(u, (st.stock[g] * total) / c[g]);
    if (u > EPS) {
      for (const g of MATERIALS) {
        const x = (u * c[g]) / total;
        st.laid[g] += x;
        st.stock[g] = Math.max(0, st.stock[g] - x);
        p.by[g] += x;
      }
      p.units += u;
      left -= u;
    } else u = 0;
    if (rest - u <= EPS) {
      st.course += 1;
      st.laid = { stone: 0, bricks: 0 };
      p.courses += 1;
      continue;
    }
    if (left > EPS) p.short = MATERIALS.find((g) => c[g] > 0 && (st.stock[g] * total) / c[g] <= EPS) || null;
    break;
  }
  return p;
}

// Lays a crew's planned day on the site: the tallies, each course finished ('course_done', with what it added to the
// city's prestige, ruling 242: a second of a kind that is not ahead of the first adds 0), and the monument finished
// ('monument_done', with its completion share's gain; site.done, its crews released).
function commitCrew(world, b, p, events) {
  const s = b.site;
  const courses = MONUMENTS[b.type].courses.length;
  for (const g of MATERIALS) world.tally[`${g}Laid`] = snap(world.tally[`${g}Laid`] + p.by[g]);
  let before = events ? prestigeOf(world) : 0;
  for (let k = 0; k < p.courses; k++) {
    s.course += 1;
    s.laid = { stone: 0, bricks: 0 };
    world.tally.courses += 1;
    if (!events) continue;
    const now = prestigeOf(world);
    events.push({ type: 'course_done', id: b.id, kind: b.type, course: s.course, prestige: now - before });
    before = now;
  }
  s.laid = p.st.laid;
  s.stock = p.st.stock;
  s.month.units = snap(s.month.units + p.units);
  s.month.crewDays += 1;
  if (s.course < courses) return;
  s.done = world.day;
  s.crews = [];
  world.tally.monumentsDone += 1;
  if (events) events.push({ type: 'monument_done', id: b.id, kind: b.type, prestige: prestigeOf(world) - before });
}

// The daily step (spec 4.16), run by tickDay right after produceDay (before updatePrestigeUnlocks, palaceDay, fire and
// raids). Sites go in founding order (ascending id). Each open site's crews are the working guilds the crew plan sends
// it (site.crews, in the order they took it; month.crews the most on one day); each crew lays its day (crewDayUnits) from
// the stockpile, course by course; a crew that cannot lay its full share for want of material counts a starved day
// (month.starvedDays). Before its crews work, an open site draws what its stockpile has room for from the storehouses
// within MONUMENT.supplyReach (drawFromStores; quarries and brickworks delivered earlier in the day, production.js). A
// road-less or paused site has no crews and does nothing. Task A3 adds the work gold, the gilding and capstone, idle,
// reason and the stall.
export function monumentDay(world, events = null) {
  const plan = crewPlan(world);
  const guildsAt = new Map();
  for (const [gid, sid] of plan) {
    if (!guildsAt.has(sid)) guildsAt.set(sid, []);
    guildsAt.get(sid).push(world.buildings[gid]);
  }
  for (const b of allBuildings(world)) {
    if (!isSite(b)) continue;
    const s = b.site;
    if (openSite(world, b)) drawFromStores(world, b);
    const working = (guildsAt.get(b.id) || []).filter((g) => isWorking(world, g));
    s.crews = working.map((g) => g.id);
    s.month.crews = Math.max(s.month.crews, s.crews.length);
    for (const g of working) {
      if (!isSite(b)) break;
      const p = planCrew(b, crewDayUnits(world, g));
      if (p.short) s.month.starvedDays += 1;
      if (p.units > EPS) commitCrew(world, b, p, events);
    }
  }
}

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

// ── Supply (Track A) ─────────────────────────────────────────────────────────────────────────────────────────────

// The material a quarry or brickworks makes (MATERIALS), or null for any other building.
export function materialOf(b) {
  const p = BUILDINGS[b.type] && BUILDINGS[b.type].produces;
  return p && MATERIALS.includes(p.good) ? p.good : null;
}

// A site that wants a material today: open (unpaused, unfinished, on a road) with stockpile room for a whole unit of it
// (stockRoom, ruling 238). Units arrive whole, so a pile is never filled past its limit or past what its courses need.
const wantsGood = (world, o, good) => openSite(world, o) && stockRoom(o)[good] >= 1 - EPS;

// The sites a quarry or brickworks delivers to, nearest first: those within its producer reach that want its material
// (spec 4.16: a site before any storehouse). production.js sends each unit to the first that still has room.
export function deliverySites(world, b) {
  const good = materialOf(b);
  if (!good) return [];
  return buildingsInReach(world, b, BUILDINGS[b.type].producerReach, (o) => wantsGood(world, o, good)).map((r) => r.b);
}

// Whether a quarry or brickworks is needed (ruling 237): a site that wants its material (open, still needing it, with
// room) lies in its producer reach, or within MONUMENT.supplyReach of a storehouse in its producer reach that accepts the
// material and has room. An idle one makes nothing (production.js: b.blocked 'idle'), employs nobody and pays no wages
// (labour.js; upkeep still runs, economy.js), its sheet says "Idle: no monument site needs stone within reach" and its
// art lays its tools down. true for any other building.
export function supplyNeeded(world, b) {
  const good = materialOf(b);
  if (!good) return true;
  if (deliverySites(world, b).length) return true;
  const stores = buildingsInReach(world, b, BUILDINGS[b.type].producerReach, (o) => storeAccepts(o, good) && hasSpace(o));
  return stores.some(({ b: s }) => buildingsInReach(world, s, MONUMENT.supplyReach, (o) => wantsGood(world, o, good)).length > 0);
}

// A site's own draw (spec 4.16, as a bazaar restocks): for each material, the whole units its stockpile has room for,
// from the stores within MONUMENT.supplyReach that hold some (accepting it or not, working or not), nearest first.
// Each unit drawn counts as delivered (tally stoneDelivered / bricksDelivered).
function drawFromStores(world, b) {
  for (const g of MATERIALS) {
    let want = Math.floor(stockRoom(b)[g] + EPS);
    if (want <= 0) continue;
    const holding = (o) => (BUILDINGS[o.type].stores || []).includes(g) && (o.store[g] || 0) > 0;
    for (const { b: src } of buildingsInReach(world, b, MONUMENT.supplyReach, holding)) {
      const take = Math.min(want, src.store[g]);
      src.store[g] -= take;
      b.site.stock[g] += take;
      world.tally[`${g}Delivered`] += take;
      want -= take;
      if (want <= 0) break;
    }
  }
}
