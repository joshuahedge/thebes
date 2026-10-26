// Version 6.0, Track D2 (rulings 760-779): the guided first city's rules, read from the sim and nothing else. The steps are data
// (src/data/lesson.js); this file builds the lesson's city, says whether a step is done (stepDone: only what the sim shows, so a step
// advances when the city is as the step asks and not before), sets up what a step stages (STAGES), and holds the scripted walk-through
// (LESSON_SCRIPT: the commands a player gives for each step, which the tests and the resume replay).
//
// The lesson's city is a city like any other (the same sim, the same rules), on a fixed map, and is never saved (src/boot.js). Three
// steps stage something a city this young would not have, and each says so in its words: the Large plot card (a Townhouse opens it in a real
// city), a small blaze in the bazaar, and the Market town's tower with the raid clock (a real city meets raiders at 250 people).
import { LESSON, LESSON_STEPS, LESSON_PLACES, LESSON_CHAPTERS } from '../data/lesson.js';
import { LARGE_PLOT } from '../data/largePlots.js';
import { MILESTONES } from '../data/progression.js';
import { BUILDINGS } from '../data/buildings.js';
import { createWorld, housesOf, population, allBuildings } from './world.js';
import { drawRoad, paintHouses, place, setGuide, setSpeed } from './commands.js';
import { goalMet } from './goals.js';
import { idx } from './grid.js';
import { touchesRoad, buildingsInReach } from './reach.js';
import { isWorking } from './labour.js';
import { igniteBuilding, staffedCover, burning } from './fire.js';
import { workingTowers, towersNeeded, raidTargetKind, firstRaidTarget } from './raids.js';
import { tickDay, monthIndex } from './clock.js';
import { milestoneIndex } from './progression.js';

export const LESSON_LENGTH = LESSON_STEPS.length;

// Version 8.1 (Track T, ruling 1202): the chapter a step belongs to, by the step's place in LESSON_STEPS: { index, id, first (the chapter's first step: its card opens it),
// k (the step's place in the chapter, from 1), of (the chapter's steps) }, or null past the end.
export const LESSON_CHAPTER_COUNT = LESSON_CHAPTERS.length;
export function chapterAt(at) {
  const step = LESSON_STEPS[at];
  if (!step) return null;
  const index = LESSON_CHAPTERS.findIndex((c) => c.steps.includes(step.id));
  if (index < 0) return null;
  const c = LESSON_CHAPTERS[index], k = c.steps.indexOf(step.id) + 1;
  return { index, id: c.id, first: k === 1, k, of: c.steps.length };
}

// The lesson's city: the fixed map, the guide off (the lesson is the guide), nothing built. world.lesson marks it (never saved): the court makes no demand of it
// (src/sim/demands.js demandsOn), since the lesson's one row is the only guidance and a demand's tip and alert would be a second.
export function lessonWorld() {
  const world = createWorld({ seed: LESSON.seed, size: LESSON.size, difficulty: LESSON.difficulty, mapVariant: LESSON.variant });
  setGuide(world, false);
  world.lesson = true;
  return world;
}

// Version 8.1 (Track T, ruling 1210): the road the first step asks for is road joined to the village gate: the tiles laid beyond the start road that a cart can reach from it
// along the roads. A stray piece laid while tapping around (and not taken back) is no part of it, so the step reads the road as it stands, never the order of the taps.
export function gateRoadTiles(world) {
  const n = world.size, start = new Set(world.startRoad.map(([x, y]) => idx(n, x, y)));
  const seen = new Set(), queue = [...start].filter((i) => world.road[i]);
  for (const i of queue) seen.add(i);
  let laid = 0;
  while (queue.length) {
    const i = queue.pop(), x = i % n, y = (i - x) / n;
    if (!start.has(i)) laid++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = idx(n, nx, ny);
      if (world.road[j] && !seen.has(j)) { seen.add(j); queue.push(j); }
    }
  }
  return laid;
}

// The first building of a type, or null.
export const firstOf = (world, type) => allBuildings(world).find((b) => b.type === type) || null;

// Homes with a road beside them (a plot off the road stays empty).
export const homesOnRoad = (world) => housesOf(world).filter((h) => touchesRoad(world, h)).length;

// The homes a building of this type reaches along the roads, at the most any one of them reaches (the well's and the bazaar's own reach).
export function homesReached(world, type) {
  let best = 0;
  for (const b of allBuildings(world)) {
    if (b.type !== type || !BUILDINGS[type].reach) continue;
    best = Math.max(best, buildingsInReach(world, b, BUILDINGS[type].reach, (o) => o.type === 'house').length);
  }
  return best;
}

// The types of `types` that have a working building (staffed to the sim's minimum, not paused, not in the fire stage).
export const workingTypes = (world, types) => types.filter((t) => allBuildings(world).some((b) => b.type === t && isWorking(world, b)));

// The raid warned, or null.
export const warnedRaid = (world) => world.raid.warning || null;

// Whether the step's work is done, from the sim alone. Every kind is named in src/data/lesson.js.
export function stepDone(world, step) {
  const c = step.check;
  switch (c.kind) {
    case 'roadTiles': return gateRoadTiles(world) >= c.n;
    case 'homesOnRoad': return homesOnRoad(world) >= c.n;
    case 'served': return homesReached(world, c.type) >= c.homes;
    case 'people': return goalMet(world, { kind: 'people', n: c.n });
    case 'building': return goalMet(world, { kind: 'building', type: c.type, n: 1 });
    case 'working': return workingTypes(world, c.types).length === c.types.length;
    case 'months': return monthIndex(world) >= c.n;
    case 'tally': return (world.tally[c.key] || 0) >= c.n;
    case 'tallyAny': return c.keys.some((k) => (world.tally[k] || 0) >= c.n) || fireOver(world);   // a blaze put out, or the fire over some other way (it burned)
    case 'covered': { const b = firstOf(world, c.type); return Boolean(b) && staffedCover(world, b); }
    case 'towers': return towersReady(world) || Boolean(world.raid.active) || Boolean(world.raid.last);
    case 'raidOver': return Boolean(world.raid.last);
    default: return false;
  }
}

// The lesson's fire is over: one was staged (tally.fires) and nothing burns now.
export const fireOver = (world) => world.tally.fires >= 1 && burning(world).length === 0;

// Staffed towers enough for the raid warned (the sim's own count, src/sim/raids.js).
export function towersReady(world) {
  const w = warnedRaid(world);
  return Boolean(w) && workingTowers(world) >= towersNeeded(w.size);
}

// How far a counting step has got, { n, of }, for the row's chip; null for a step that counts nothing.
export function stepProgress(world, step) {
  const c = step.check;
  const clip = (n, of) => ({ n: Math.max(0, Math.min(n, of)), of });
  switch (c.kind) {
    case 'roadTiles': return clip(gateRoadTiles(world), c.n);
    case 'homesOnRoad': return clip(homesOnRoad(world), c.n);
    case 'served': return clip(homesReached(world, c.type), c.homes);
    case 'people': return clip(population(world), c.n);
    case 'working': return clip(workingTypes(world, c.types).length, c.types.length);
    case 'months': return clip(monthIndex(world), c.n);
    default: return null;
  }
}

// Version 7.0 (Track P, ruling 1002): how a step and the game's clock go together (src/data/lesson.js `play`). 'card': the step only waits on the game, so its card
// plays on; 'act': the player builds first and the game plays again once actionDone; null: the step is done the moment the player has built what it asks.
// A 'warning' step (the tower) is a 'card' until the raid is warned, then an 'act'.
export function playWhen(world, step) {
  if (!step || !step.play) return null;
  if (step.play === 'warning') return warnedRaid(world) ? 'act' : 'card';
  return step.play;
}

// What an 'act' step measures its own part against: how many housing plots stand as the step begins (a plot painted after is the player's part of "paint more homes").
export const actionBase = (world) => ({ homes: housesOf(world).length });

// Whether the player's own part of an 'act' step is done (what lets the game play again by itself), from the sim alone: a plot painted since `base`, the building
// the step asks for standing, or as many towers built as the raid warned needs (staffed or not: their crews come with time, which is what the playing is for).
export function actionDone(world, step, base = actionBase(world)) {
  const a = step && step.act;
  if (!a) return false;
  switch (a.kind) {
    case 'plots': return housesOf(world).length > base.homes;
    case 'building': return Boolean(firstOf(world, a.type));
    case 'towers': { const w = warnedRaid(world); return Boolean(w) && allBuildings(world).filter((b) => b.type === 'tower').length >= towersNeeded(w.size); }
    default: return false;
  }
}

// What the map should light for a step, as a footprint { x, y, w, d } in tiles, or null: the step's own `at`, or the footprint of the
// first building of the type it names.
export function stepSpot(world, step) {
  const at = step.at;
  if (!at) return null;
  if (at.of === 'raidTarget') { const t = raidTarget(world); return t.building ? { x: t.building.x, y: t.building.y, w: t.building.w, d: t.building.d } : null; }
  if (at.of) { const b = firstOf(world, at.of); return b ? { x: b.x, y: b.y, w: b.w, d: b.d } : null; }
  return { x: at.x, y: at.y, w: at.w, d: at.d };
}

// Version 8.2 (Track L, ruling 1320): what the raid is after, from the sim's own raid: { kind, building, entry }. kind is the warning's own target (RAIDS.targets' kind, or 'building'), else the raid under
// way's, else what a warning raised now would name; building is the one the band strikes first (src/sim/raids.js firstRaidTarget, chosen as the band chooses it; the band's own while it is on the map), null
// when none can be reached; entry is where it comes in, or null. The lesson's raid step lights this building and says its kind, so the ring is never a surprise.
export function raidTarget(world) {
  const w = world.raid.warning, a = world.raid.active;
  const kind = w ? w.target : a ? a.target : raidTargetKind(world), entry = w ? w.entry : a ? a.entry : null;
  let building = a && !w && a.targetId ? world.buildings[a.targetId] || null : null;
  if (!building && entry) building = firstRaidTarget(world, entry, kind);
  if (!building && kind !== 'building') building = firstOf(world, kind);
  return { kind, building, entry };
}

// Version 8.2 (Track L, ruling 1321): the box the camera frames for a step, { x, y, w, d } in tiles, or null for a step that frames its own spot: the raid step frames the target, the towers that stand
// and the side the raiders come from (a point up to RAID_FRAME_REACH tiles from the target towards their entry), so what is under attack, what defends it and where the danger comes from are in
// one view. The ring stays on the target (src/ui/v60/lesson.js ensureVisible keeps it in view).
export const RAID_FRAME_REACH = 6;
export function stepFrame(world, step) {
  if (!step.at || step.at.of !== 'raidTarget') return null;
  const t = raidTarget(world);
  if (!t.building) return null;
  const b = t.building, cx = b.x + b.w / 2, cy = b.y + b.d / 2;
  const pts = [[b.x, b.y], [b.x + b.w, b.y + b.d]];
  for (const tw of allBuildings(world)) if (tw.type === 'tower') pts.push([tw.x, tw.y], [tw.x + tw.w, tw.y + tw.d]);
  if (t.entry) {
    const dx = t.entry.x - cx, dy = t.entry.y - cy, len = Math.hypot(dx, dy) || 1, k = Math.min(RAID_FRAME_REACH, len) / len;
    pts.push([cx + dx * k, cy + dy * k]);
  }
  const x0 = Math.min(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), x1 = Math.max(...pts.map((p) => p[0])), y1 = Math.max(...pts.map((p) => p[1]));
  return { x: x0, y: y0, w: x1 - x0, d: y1 - y0 };
}

// Sets up what a step stages (each idempotent, so entering a step twice does no harm). The lesson's own city is changed, never a player's.
export const STAGES = {
  // The Large plot card, which a real city opens with its first Townhouse (src/sim/largePlots.js noteLargePlotUnlock does the same, with the "New" tag).
  largePlot(world) {
    world.tally.largeUnlocked = 1;
    if (!(world.tally.largePlots > 0) && !world.newItems.includes(LARGE_PLOT.type)) world.newItems.push(LARGE_PLOT.type);
  },
  // A small blaze in the bazaar (a firehouse already reaches it: the step before asked for one), as a spark in a Town would start it. Version 6.0.1
  // (ruling 820): it is marked staged, so its outcome is the lesson's: it goes out in a day or two even if the firehouse is undone, demolished, paused or
  // short of staff after it was lit (src/sim/fire.js blazeDay), so the step always ends and never turns into a month of fire with the game paused.
  fire(world) {
    const b = firstOf(world, 'bazaar');
    if (b && world.tally.fires === 0 && igniteBuilding(world, b.id)) b.fire.staged = true;
  },
  // The Market town's cards (the tower comes with it, as updateMilestone gives them: "New" tags and all), and the raid clock started today so
  // the first warning is raised on the next day. A real city starts both at 250 people.
  raid(world) {
    const to = milestoneIndex('market_town'), from = milestoneIndex(world.milestone);
    if (from < to) {
      for (let k = from + 1; k <= to; k++) {
        for (const type of MILESTONES[k].unlocks) if (!world.newItems.includes(type)) world.newItems.push(type);
        if (!Number.isInteger(world.splits[MILESTONES[k].id])) world.splits[MILESTONES[k].id] = world.day;
      }
      world.milestone = 'market_town';
    }
    if (world.raid.clockDay === null) { world.raid.clockDay = world.day; world.raid.nextWarnDay = world.day; }
  },
};

// A step begins: whatever it stages is set up.
export function enterStep(world, step) {
  if (step && step.stage && STAGES[step.stage]) STAGES[step.stage](world);
}

// The step the city is at, from `from` on: enters each step it reaches and passes every one the sim already shows done (a player who built the
// well before it was asked for it is not asked again). LESSON_LENGTH when every step is done.
export function lessonAt(world, from = 0) {
  let i = Math.max(0, from);
  if (i < LESSON_LENGTH) enterStep(world, LESSON_STEPS[i]);
  while (i < LESSON_LENGTH && stepDone(world, LESSON_STEPS[i])) {
    i++;
    if (i < LESSON_LENGTH) enterStep(world, LESSON_STEPS[i]);
  }
  return i;
}

// ── The scripted walk-through ────────────────────────────────────────────────────────────────────────────────────────────
// Each step's script is what a player gives the city for it: commands, and days run through io.tick (the tests pass one that also lets the interface
// see the day). io.did() runs after each command (the interface's afterCommand). A script returns once the step is done, or throws.
const defaultIo = (world) => ({ tick: () => tickDay(world), did() {} });
function until(world, io, done, cap = 400) {
  for (let d = 0; d < cap && !done(); d++) io.tick();
  if (!done()) throw new Error('lesson script: the wait ran out');
}
const P = LESSON_PLACES;
const put = (world, io, type, [x, y]) => {
  const r = place(world, type, x, y);
  if (!r || r.ok === false) throw new Error(`lesson script: no ${type} at ${x},${y} (${r && r.reason})`);
  io.did();
  return r;
};
const stepById = (id) => LESSON_STEPS.find((s) => s.id === id);

export const LESSON_SCRIPT = {
  road(world, io) { drawRoad(world, ...P.road.from, ...P.road.to); io.did(); },
  homes(world, io) { paintHouses(world, ...P.homes); io.did(); },
  well(world, io) { put(world, io, 'well', P.well); },
  families(world, io) { setSpeed(world, 1); io.did(); until(world, io, () => stepDone(world, stepById('families'))); },
  farm(world, io) { put(world, io, 'farm_grain', P.farm); },
  granary(world, io) { put(world, io, 'granary', P.granary); },
  bazaar(world, io) { put(world, io, 'bazaar', P.bazaar); },
  workers(world, io) { paintHouses(world, ...P.moreHomes); io.did(); setSpeed(world, 1); io.did(); until(world, io, () => stepDone(world, stepById('workers'))); },
  month(world, io) { setSpeed(world, 1); io.did(); until(world, io, () => stepDone(world, stepById('month'))); },
  largeplot(world, io) { put(world, io, LARGE_PLOT.type, P.largePlot); },
  firehouse(world, io) { put(world, io, 'firehouse', P.firehouse); setSpeed(world, 1); io.did(); until(world, io, () => stepDone(world, stepById('firehouse'))); },
  fire(world, io) { setSpeed(world, 1); io.did(); until(world, io, () => stepDone(world, stepById('fire'))); },
  tower(world, io) {
    setSpeed(world, 1); io.did();
    until(world, io, () => Boolean(world.raid.warning));            // the first warning pauses the game
    put(world, io, 'tower', P.tower);
    setSpeed(world, 1); io.did();
    until(world, io, () => stepDone(world, stepById('tower')));
  },
  raid(world, io) { setSpeed(world, 3); io.did(); until(world, io, () => stepDone(world, stepById('raid')), 600); },
};

// The lesson's city as it stands once steps 0 .. n - 1 are done (the resume of a lesson left part-way: the player's own streets are not kept,
// ruling 626; these are). Throws if a step does not finish, so a change to the rules that breaks the walk-through is heard here.
export function replayTo(world, n, io = defaultIo(world)) {
  let at = lessonAt(world, 0);
  while (at < Math.min(n, LESSON_LENGTH)) {
    const step = LESSON_STEPS[at];
    LESSON_SCRIPT[step.id](world, io);
    if (!stepDone(world, step)) throw new Error(`lesson replay: step ${step.id} is not done`);
    at = lessonAt(world, at + 1);
  }
  setSpeed(world, 0);
  return at;
}
