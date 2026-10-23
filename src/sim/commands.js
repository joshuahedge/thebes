import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { MONUMENTS } from '../data/monuments.js';
import { footprint, idx, inBounds, ring } from './grid.js';
import { T, TERRAIN_BY_NAME, buildable, groundRefusal } from './terrain.js';
import { makeBuilding, insertBuilding, removeBuilding, buildingAt, allBuildings, isFinished, isSite } from './world.js';
import { touchLayers } from './layerVersion.js';
import { touchesRoad, buildingsInReach } from './reach.js';
import { canAfford, spend, refund } from './money.js';
import { costOf, roadCostOf, rubbleCostOf, canPayNoDebt } from './costs.js';
import { isUnlocked } from './progression.js';
import { pushUndo } from './undo.js';
import { storeAccepts } from './production.js';
import { guildsNear, supplyNear, remainingNeed } from './monuments.js';
import { DEFENCE } from '../data/raids.js';
import { bridgeVerdicts } from './bridges.js';
import { tileBound, fitOf, fitReason, waterTilesOf } from './fit.js';
import { noteBuilt } from './oases.js';
import { onGoodSpot } from './spots.js';   // Stage 4.7 (Task 4): the spots' first; spots.js reads checkTiles from here, both only at call time
import { LARGE_PLOT } from '../data/largePlots.js';
import { largePlotUnlocked, makeLargePlot } from './largePlots.js';   // Version 6.0 (Track C): the Large plot card is laid as a house; largePlots.js reads canPlace from here, both only at call time
// Version 6.0 (Track C): the card that lays a Large plot is a type of its own to the placing rules, and a home (a plot) to everything after the laying.
const isLotCard = (type) => type === LARGE_PLOT.type;
// A housing plot's rules: a road may come later, and it asks for none.
const isPlotType = (type) => type === 'house' || isLotCard(type);
// Stage 4.7 (Task 4): every housing plot laid counts (world.tally.plotsLaid), so the next-house spots (src/sim/spots.js) stay unlocked once the first is placed.
// good: the plot went on a Good spot the player could see (the tool's mark, src/sim/spots.js), the tally of the first "A good spot" (goodSpotPlots).
const notePlot = (world, b, good = false) => {
  if (!b || b.type !== 'house') return;
  world.tally.plotsLaid = (world.tally.plotsLaid || 0) + 1;
  if (good) world.tally.goodSpotPlots = (world.tally.goodSpotPlots || 0) + 1;
};

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });
const storesAny = (o, goods) => (BUILDINGS[o.type].stores || []).some((g) => goods.includes(g));

const isTile = (x, y) => Number.isInteger(x) && Number.isInteger(y);

// Stage 4: what a type's placing pays, and whether it may take the treasury below the debt floor. A monument's founding
// never takes it below 0 (ruling 227); every other building may go down to ECONOMY.debtFloor.
export const canPay = (world, type, cost) => (BUILDINGS[type].monument ? canPayNoDebt(world, cost) : canAfford(world, cost));

// Why a building cannot go at x, y before any tile is looked at, else null.
function typeReason(world, type, x, y) {
  const def = BUILDINGS[type];
  if (isLotCard(type)) {   // the Large plot card: not a milestone's card but the first Townhouse's (largePlotUnlocked)
    if (!largePlotUnlocked(world)) return 'locked';
    return isTile(x, y) ? null : 'out_of_bounds';
  }
  if (!def || def.buildable === false) return 'unknown';   // rubble (and a gate) is never built
  if (!isUnlocked(world, type)) return 'locked';
  if (def.tile) return 'unknown';                          // walls are drawn as a line (drawWall, src/sim/defence.js), not placed
  if (def.oneOnly && allBuildings(world).some((b) => b.type === type)) return 'one_only';   // Stage 4: one palace a city (ruling 271)
  // A fractional tile would index between cells and leave ghost entries in occ and the save.
  if (!isTile(x, y)) return 'out_of_bounds';
  return null;
}

// Why one footprint tile cannot take the building, else null. Stage 4: a monument stands on any dry ground but the fields
// (ruling 226): a fertile tile refuses with 'not_on_fields'.
export function tileReason(world, type, tx, ty) {
  const def = BUILDINGS[type];
  if (!inBounds(world.size, tx, ty)) return 'out_of_bounds';
  const i = idx(world.size, tx, ty);
  const ground = groundRefusal(world, i);   // Stage 4.7: the one ground rule (src/sim/terrain.js buildable): water or hills
  if (ground) return ground;
  if (world.occ[i] || world.road[i]) return 'occupied';
  if (world.wall[i] && !(type === 'tower' && world.wall[i] > 0)) return 'occupied';   // a tower may stand on a standing wall tile (spec 4.13)
  // Stage 4.6: a building that needs every footprint tile on its ground refuses tile by tile; one with a looser rule (terrainMin, a
  // water rule) is judged on the whole footprint by src/sim/fit.js (checkTiles, conditionsFor).
  if (def.terrain && tileBound(type) && world.terrain[i] !== TERRAIN_BY_NAME[def.terrain]) return 'needs_' + def.terrain;
  if (def.monument && world.terrain[i] === TERRAIN_BY_NAME.fertile) return 'not_on_fields';
  return null;
}

// rot (Stage 4, ruling 234): 0, or 1 to turn a type that rotates a quarter (dimsOf); ignored by the rest.
export function checkTiles(world, type, x, y, rot = 0) {
  const first = typeReason(world, type, x, y);
  if (first) return first;
  const { w, d } = dimsOf(type, rot);
  for (const [tx, ty] of footprint(x, y, w, d)) {
    const reason = tileReason(world, type, tx, ty);
    if (reason) return reason;
  }
  const fit = fitReason(world, type, x, y, rot);        // Stage 4.6: the footprint's ground and water rule (src/sim/fit.js)
  if (fit) return fit;
  if (BUILDINGS[type].needsRoad && !touchesRoad(world, { x, y, w, d })) return 'needs_road';
  return null;
}

// Producers want a store in reach, sellers their supply: 'no_storage' / 'no_supply', else null. Either only delays it.
// Stage 4 (spec 4.16): a quarry's stone and a brickworks' bricks go to a monument site first, so a site that still needs
// the good counts as somewhere to send it.
function worksWarning(world, type, x, y, rot = 0) {
  const def = BUILDINGS[type];
  const probe = { id: -1, x, y, ...dimsOf(type, rot) };
  const takes = (o, good) => storeAccepts(o, good) || (isSite(o) && remainingNeed(o)[good] > 0);
  if (def.produces && !buildingsInReach(world, probe, def.producerReach, (o) => takes(o, def.produces.good)).length) return 'no_storage';
  if (def.sells && !buildingsInReach(world, probe, def.supplyReach, (o) => storesAny(o, def.sells)).length) return 'no_supply';
  return null;
}

// Stage 4 (ruling 230, spec 6.5): a monument's crew and supply, judged only once a road touches the footprint (both come by
// road). crew: { n } guilds within MONUMENT.crewReach (guildsNear), reason 'no_crew' when none; supply: the first course's
// materials: every material its recipe takes (goods: the first course's first, then the later courses'), each needing a maker
// in producer reach or a storehouse holding some in supply reach; missing: those with neither (ruling 300: the chip names
// every one), reason 'no_stone' or 'no_bricks' (the first missing, good names it). null for a type that is not a monument or
// a footprint with no road.
function monumentChecks(world, type, x, y, rot = 0) {
  if (!BUILDINGS[type].monument) return null;
  const probe = { x, y, ...dimsOf(type, rot) };
  if (!touchesRoad(world, probe)) return null;
  const guilds = guildsNear(world, probe);
  const { courses } = MONUMENTS[type];
  const goods = ['stone', 'bricks'].filter((g) => courses[0][g] > 0);
  for (const g of ['stone', 'bricks']) if (!goods.includes(g) && courses.some((c) => c[g] > 0)) goods.push(g);
  const missing = goods.filter((g) => !supplyNear(world, probe, g));
  const first = missing[0] || null;
  return {
    crew: { key: 'crew', state: guilds.length ? 'met' : 'later', reason: guilds.length ? null : 'no_crew', n: guilds.length },
    supply: { key: 'supply', state: first ? 'later' : 'met', reason: first ? `no_${first}` : null, good: first, goods, missing },
  };
}

// roadLater: canPlace let the building through without a road, so it carries the plot's warning.
export function placementWarnings(world, type, x, y, roadLater = false, rot = 0) {
  const { w, d } = dimsOf(type, rot);
  const warnings = [];
  // A plot can be placed off the road but no one moves in until one touches it; gardens and statues need none.
  if (roadLater || (isPlotType(type) && !touchesRoad(world, { x, y, w, d }))) warnings.push('needs_road');
  const works = worksWarning(world, type, x, y, rot);
  if (works) warnings.push(works);
  const m = monumentChecks(world, type, x, y, rot);
  if (m) for (const c of [m.crew, m.supply]) if (c.reason) warnings.push(c.reason);
  return warnings;
}

// roadLater (ruling P10): a building that fails only for want of a road is let through with a 'needs_road' warning, as
// a housing plot always is. It does nothing, pays no upkeep or wages (src/sim/economy.js) and counts for no "Build a"
// goal (src/sim/goals.js) until a road touches it. Only the player's placing passes it: by default (the sample city,
// the balance runs) a road is still required. Stage 4: rot turns a mastaba; a monument refuses on the fields
// ('not_on_fields'), before its prestige unlock ('locked') and when founding would take the treasury below 0 ('no_gold');
// a second palace refuses with 'one_only'. A monument's warnings add 'no_crew' and 'no_stone' / 'no_bricks' once a road
// touches it.
// Stage 4.6 (Track 0 for the Wonders track): style names a monument's style (src/data/wonders.js MONUMENT_STYLES); it reaches the
// price through costOf's options (src/sim/costs.js) and the building through makeBuilding. Ignored by every other type.
export function canPlace(world, type, x, y, { roadLater = false, rot = 0, style = null } = {}) {
  const reason = checkTiles(world, type, x, y, rot);
  const later = reason === 'needs_road' && roadLater;
  if (reason && !later) return fail(reason);
  if (!canPay(world, type, costOf(world, type, { style }))) return fail('no_gold');
  return { ok: true, warnings: placementWarnings(world, type, x, y, later, rot) };
}

// The placing preview's conditions (ruling P9): each one judged on its own, so the ghost and the confirm bar can show
// them all at once where canPlace gives only its first refusal.
//   ok, reason, warnings: what canPlace says for the same spot and options (reason null when ok).
//   state: the worst condition: 'ok' (all met), 'later' (it can be placed but will not work yet) or 'cant'.
//   conditions, in this order, each { key, state: 'met' | 'later' | 'cant', reason (null when met), ... }:
//     ground: every footprint tile free (on the map, dry, no building, road or wall); reason: the first tile's refusal,
//             as checkTiles gives it. A terrain building adds terrain ('fertile', 'rocky'), fit and of: how many of the
//             footprint's tiles are that terrain, out of how many. A monument adds fertile and of: how many of its tiles
//             are fields ("Not on the fields: 3 of 12 tiles are fertile").
//     road (buildings that need one, and housing plots): reason 'needs_road' while no road touches the footprint;
//             'later' for a plot, and for a building with roadLater, else 'cant'. joins: [[x, y], ...], the free tiles
//             beside the footprint where a road would touch it (empty once one does).
//     works (producers and sellers): 'later' with reason 'no_storage' / 'no_supply' while nothing in reach serves it.
//     crew, supply (Stage 4, monuments, only once a road touches it): 'later' with 'no_crew' (n guilds near) or
//             'no_stone' / 'no_bricks' (good) while nothing in reach would serve it (monumentChecks).
//     gold: cost and have (the treasury); 'cant' with reason 'no_gold' when paying would cross the debt floor (for a
//             monument, would take the treasury below 0, and its gold condition carries floor: 0).
//   tiles: [{ x, y, state: 'met' | 'cant', reason }], one per footprint tile in footprint order.
// A refusal before any tile (unknown, locked, one_only, a fractional spot) has state 'cant' and no conditions or tiles.
export function conditionsFor(world, type, x, y, { roadLater = false, rot = 0, style = null } = {}) {
  const first = typeReason(world, type, x, y);
  if (first) return { ok: false, reason: first, warnings: [], state: 'cant', conditions: [], tiles: [] };
  const def = BUILDINGS[type];
  const { w, d } = dimsOf(type, rot);
  const tiles = footprint(x, y, w, d).map(([tx, ty]) => {
    const reason = tileReason(world, type, tx, ty);
    return { x: tx, y: ty, state: reason ? 'cant' : 'met', reason };
  });
  const conditions = [];
  const blocked = tiles.find((t) => t.reason);
  const fitBlock = blocked ? null : fitReason(world, type, x, y, rot);   // Stage 4.6: the footprint's own rule, once every tile is free
  const ground = { key: 'ground', state: blocked || fitBlock ? 'cant' : 'met', reason: blocked ? blocked.reason : fitBlock };
  const terrainAt = (t) => inBounds(world.size, t.x, t.y) && world.terrain[idx(world.size, t.x, t.y)];
  if (def.terrain) {
    const want = TERRAIN_BY_NAME[def.terrain];
    Object.assign(ground, { terrain: def.terrain, fit: tiles.filter((t) => terrainAt(t) === want).length, of: tiles.length });
  }
  // Stage 4.6 (src/sim/fit.js): a looser ground rule says how many tiles it needs; a water rule how many water tiles count.
  if (def.terrain && !tileBound(type)) ground.need = fitOf(world, type, x, y, rot).need;
  if (def.water) Object.assign(ground, { water: def.water, wet: fitOf(world, type, x, y, rot).wet });
  if (def.monument) Object.assign(ground, { fertile: tiles.filter((t) => terrainAt(t) === TERRAIN_BY_NAME.fertile).length, of: tiles.length });
  conditions.push(ground);
  if (def.needsRoad || isPlotType(type)) {
    const probe = { x, y, w, d };
    const touches = touchesRoad(world, probe);
    const state = touches ? 'met' : (isPlotType(type) || roadLater ? 'later' : 'cant');
    conditions.push({ key: 'road', state, reason: touches ? null : 'needs_road', joins: touches ? [] : roadJoins(world, probe) });
  }
  if (def.produces || def.sells) {
    const works = worksWarning(world, type, x, y, rot);
    conditions.push({ key: 'works', state: works ? 'later' : 'met', reason: works });
  }
  const m = monumentChecks(world, type, x, y, rot);
  if (m) conditions.push(m.crew, m.supply);
  const cost = costOf(world, type, { style });
  const floor = def.monument ? { floor: 0 } : {};   // Stage 4: a monument's gold may not go below 0
  conditions.push(canPay(world, type, cost)
    ? { key: 'gold', state: 'met', reason: null, cost, have: world.gold, ...floor }
    : { key: 'gold', state: 'cant', reason: 'no_gold', cost, have: world.gold, ...floor });
  const refusal = conditions.find((c) => c.state === 'cant');
  const later = conditions.filter((c) => c.state === 'later');
  return {
    ok: !refusal,
    reason: refusal ? refusal.reason : null,
    warnings: refusal ? [] : later.map((c) => c.reason),
    state: refusal ? 'cant' : (later.length ? 'later' : 'ok'),
    conditions,
    tiles,
    more: placementMarks(world, type, x, y, rot, tiles, w, d),
  };
}

// What the placing preview draws beyond the conditions' own lines (Version 7.0, Track P, ruling 1008), each from the rule the sim applies, so the marks and the words agree:
//   on     per footprint tile (the tiles' order): whether it is the ground the building's terrain rule counts, null for a building with no terrain rule (the clay pit counts 2 of 4
//          tiles, so the other two are free ground the rule does not count)
//   wet    the water tiles that count for its water rule ([] without one); fitOf's `wet` is their number
//   roadAt the road tiles that touch a side (what touchesRoad counts); near whether a road lies a corner or a tile off without touching (it does not count), asked only when none touches
function placementMarks(world, type, x, y, rot, tiles, w, d) {
  const def = BUILDINGS[type];
  const want = def.terrain ? TERRAIN_BY_NAME[def.terrain] : null;
  const on = tiles.map((t) => (want === null ? null : inBounds(world.size, t.x, t.y) && world.terrain[idx(world.size, t.x, t.y)] === want));
  const probe = { x, y, w, d };
  const roadAt = def.needsRoad || isPlotType(type) ? roadTouching(world, probe) : [];
  return { on, wet: def.water ? waterTilesOf(world, type, x, y, rot) : [], roadAt, near: roadAt.length === 0 && (def.needsRoad || isPlotType(type)) ? roadNear(world, probe) : false };
}

// The road tiles that touch the footprint (a side, not a corner: the ring's own), as [x, y] pairs: what touchesRoad counts.
function roadTouching(world, b) {
  return ring(b.x, b.y, b.w, b.d).filter(([tx, ty]) => inBounds(world.size, tx, ty) && world.road[idx(world.size, tx, ty)]);
}
// Whether a road lies close without touching: on a corner of the footprint or one tile past a side. Only asked when none touches.
function roadNear(world, b) {
  const corners = [[b.x - 1, b.y - 1], [b.x + b.w, b.y - 1], [b.x - 1, b.y + b.d], [b.x + b.w, b.y + b.d]];
  const outer = ring(b.x - 1, b.y - 1, b.w + 2, b.d + 2);
  return [...corners, ...outer].some(([tx, ty]) => inBounds(world.size, tx, ty) && world.road[idx(world.size, tx, ty)]);
}

// The tiles beside a footprint where a road could be laid to touch it: on the map, dry, with no building or wall on them.
function roadJoins(world, b) {
  return ring(b.x, b.y, b.w, b.d).filter(([tx, ty]) => {
    if (!inBounds(world.size, tx, ty)) return false;
    const i = idx(world.size, tx, ty);
    return buildable(world, i) && !world.occ[i] && !world.wall[i];   // Stage 4.7: buildable (src/sim/terrain.js)
  });
}

// Stage 4: rot (0 or 1) turns a mastaba; the building keeps it (b.rot) and its swapped footprint. A monument is founded as a
// site (makeBuilding gives it an empty b.site); its undo entry is the same 'place' entry, which undo refuses once work has
// begun on it (src/sim/undo.js, ruling 236).
export function place(world, type, x, y, { roadLater = false, rot = 0, style = null } = {}) {
  const check = canPlace(world, type, x, y, { roadLater, rot, style });
  if (!check.ok) return check;
  const cost = costOf(world, type, { style });
  const good = type === 'house' && onGoodSpot(world, x, y);   // judged before the plot takes the tile
  // Version 6.0 (Track C): the Large plot card lays a house of 2x2 carrying large: true (an empty marked lot); undo takes it back like a plot.
  const b = insertBuilding(world, isLotCard(type) ? makeLargePlot(world, x, y) : makeBuilding(world, type, x, y, rot, { style }));
  noteBuilt(world, b);   // Stage 4.7: a building within 4 tiles of an oasis is the first's tally
  notePlot(world, b, good);
  if (isLotCard(type)) world.tally.largePlots = (world.tally.largePlots || 0) + 1;
  spend(world, cost);
  // A tower on a standing wall tile gives the tile its 80 hit points (spec 4.13); undo puts the old value back.
  const walls = [];
  if (type === 'tower') {
    for (const [tx, ty] of footprint(x, y, b.w, b.d)) {
      const i = idx(world.size, tx, ty);
      if (world.wall[i] > 0) { walls.push([i, world.wall[i]]); world.wall[i] = DEFENCE.towerOnWallHp; }
    }
    if (walls.length) world.wallVersion++;
  }
  pushUndo(world, { kind: 'place', ids: [b.id], cost, walls });
  const fresh = world.newItems.indexOf(type);       // its card stops saying "New" (spec 4.14)
  if (fresh >= 0) world.newItems.splice(fresh, 1);
  return { ok: true, id: b.id, warnings: check.warnings };
}

// A quarter of what the building costs in this city (difficulty included); plots refund nothing (spec 4.11). Clearing a
// rubble tile costs gold instead (spec 4.12): its "refund" is minus the clearing price, and the demolish that clears it
// is refused when that would take the treasury below the debt floor.
export const demolishRefundFor = (world, b) => {
  if (b.type === 'rubble') return -rubbleCostOf(world);
  return b.type === 'house' ? 0 : Math.floor(costOf(world, b.type, { style: b.style }) * ECONOMY.demolishRefund);
};

// One tile: a building (or a rubble tile), else a wall tile (a gate keeps its road), else a road. Walls and roads refund
// nothing. Undo entries: { kind: 'demolish', buildings: [snapshots], roads: [tile index], walls: [[tile index, value]],
// refund } (src/sim/undo.js).
export function demolishAt(world, x, y) {
  if (!isTile(x, y) || !inBounds(world.size, x, y)) return fail('out_of_bounds', { refund: 0 });
  const b = buildingAt(world, x, y);
  if (b) {
    const amount = demolishRefundFor(world, b);
    if (amount < 0 && !canAfford(world, -amount)) return fail('no_gold', { refund: 0 });
    const snap = JSON.parse(JSON.stringify(b));
    removeBuilding(world, b.id);
    // A tower's wall tile falls back from the tower's hit points to a plain wall's (undo puts the old value back).
    const walls = [];
    if (b.type === 'tower') {
      for (const [tx, ty] of footprint(b.x, b.y, b.w, b.d)) {
        const t = idx(world.size, tx, ty);
        if (world.wall[t] > DEFENCE.wallHp) { walls.push([t, world.wall[t]]); world.wall[t] = DEFENCE.wallHp; }
      }
      if (walls.length) world.wallVersion++;
    }
    refund(world, amount);
    if (b.type === 'rubble') world.tally.rubbleCleared += 1;
    pushUndo(world, { kind: 'demolish', buildings: [snap], roads: [], walls, refund: amount });
    return { ok: true, refund: amount, warnings: [] };
  }
  const i = idx(world.size, x, y);
  if (world.wall[i]) {
    const walls = [[i, world.wall[i]]];
    world.wall[i] = 0;
    world.wallVersion++;
    pushUndo(world, { kind: 'demolish', buildings: [], roads: [], walls, refund: 0 });
    return { ok: true, refund: 0, warnings: [] };
  }
  if (world.road[i]) {
    world.road[i] = 0;
    world.roadVersion++;
    pushUndo(world, { kind: 'demolish', buildings: [], roads: [i], walls: [], refund: 0 });
    return { ok: true, refund: 0, warnings: [] };
  }
  return fail('nothing_here', { refund: 0 });
}

export function setPaused(world, id, paused) {
  const b = world.buildings[id];
  if (!b) return fail('nothing_here');
  // Pausing stops staffing and upkeep, so a building with neither (a housing plot) has nothing to pause. Stage 4 (ruling 235):
  // a monument site pauses like any building (its work and work gold stop; monumentDay reads b.paused); a finished
  // monument has nothing to pause.
  const def = BUILDINGS[b.type];
  if (isFinished(b)) return fail('finished');
  if (!def.workers && !def.upkeep && !def.monument) return fail('not_pausable');
  // Ruling 987: a strike or quarrel (a city event's pause) holds until its day; Resume is refused, and the card's paid choice is the way out.
  const until = eventHoldUntil(world, b.id);
  if (!paused && until !== null) return fail('event_hold', { until });
  b.paused = Boolean(paused);
  if (b.paused) b.staff = 0;
  releaseHolds(world, b.id);
  touchLayers(world);   // the layers' caches (src/sim/layers.js) key on this counter; the chunk index and the roadless plots, which key on the footprints, are left alone (Version 6.0)
  return { ok: true, warnings: [] };
}

// The day a city event's strike or quarrel (src/sim/cityEvents.js, a court effect marked event: true) still holds this building, or null when none does
// (ruling 987). The sheet reads it for its Resume's reason.
export function eventHoldUntil(world, id) {
  const c = world.court;
  if (!c || !Array.isArray(c.effects)) return null;
  let until = null;
  for (const e of c.effects) if (e.event === true && e.kind === 'pause' && Array.isArray(e.ids) && e.ids.includes(id) && e.until > world.day) until = Math.max(until === null ? 0 : until, e.until);
  return until;
}

// Ruling 423: the player's own pause or resume takes a building back from whatever paused it for a while: a crocodile scare (world.wildlife.scares)
// and a court card's pause (a quarantine or a strike, world.court.effects). Neither lifts a pause afterwards that it did not set, so a workplace
// the player pauses during a scare (resume, then pause, even within one game day) stays paused when the scare's days are up.
// Ruling 987: a city event's strike or quarrel (event: true) is not let go here while it lasts (setPaused refuses the resume); one whose days are up is.
function releaseHolds(world, id) {
  const w = world.wildlife;
  if (w && Array.isArray(w.scares) && w.scares.some((s) => s.id === id)) w.scares = w.scares.filter((s) => s.id !== id);
  const c = world.court;
  if (c && Array.isArray(c.effects)) for (const e of c.effects) if (e.kind === 'pause' && Array.isArray(e.ids) && !(e.event === true && e.until > world.day)) e.ids = e.ids.filter((x) => x !== id);
}

export function setSpeed(world, speed) {
  if (![0, 1, 2, 3].includes(speed)) return fail('bad_speed');
  world.speed = speed;
  return { ok: true, warnings: [] };
}

// The guided start (early-game pass 3.2): Skip guide turns it off, Resume guide turns it back on.
export function setGuide(world, on) {
  world.guide.on = Boolean(on);
  return { ok: true, warnings: [] };
}

// A storehouse's switch for one good (spec 4.10). Refused, producers send the good to other stores or stop with
// no_storage; what the storehouse already holds stays and can still be drawn on. Only a storehouse has the switches,
// and only for the goods it stores. Accepting deletes the entry, so a storehouse that takes everything has accepts {}.
export function setAccept(world, id, good, accept) {
  const b = world.buildings[id];
  if (!b) return fail('nothing_here');
  if (b.type !== 'storehouse' || !(BUILDINGS[b.type].stores || []).includes(good)) return fail('not_storage');
  if (!b.accepts) b.accepts = {};
  if (accept) delete b.accepts[good];
  else b.accepts[good] = false;
  return { ok: true, warnings: [] };
}

function lineInto(ax, ay, bx, by, out) {
  const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
  let x = ax, y = ay;
  for (;;) {
    if (!out.some((p) => p[0] === x && p[1] === y)) out.push([x, y]);
    if (x === bx && y === by) break;
    x += dx; y += dy;
  }
}

export function roadPath(x0, y0, x1, y1, flip = false) {
  const out = [];
  // lineInto steps by whole tiles, so a fractional or NaN endpoint would never be reached.
  if (![x0, y0, x1, y1].every(Number.isInteger)) return out;
  if (!flip) { lineInto(x0, y0, x1, y0, out); lineInto(x1, y0, x1, y1, out); }
  else { lineInto(x0, y0, x0, y1, out); lineInto(x0, y1, x1, y1, out); }
  return out;
}

// The tiles of a list, each once, in the order given (a touch plan can name a tile twice).
function uniqueTiles(tiles) {
  const seen = new Set(), out = [];
  for (const t of tiles) { const k = `${t[0]},${t[1]}`; if (!seen.has(k)) { seen.add(k); out.push(t); } }
  return out;
}

// Why a road cannot be laid on one tile, else null. A wall tile is no obstacle (Stage 4.5, ruling 309: the road makes it a
// gate); in gate mode (gateOnly) a tile with no wall on it is refused with 'not_wall'. A water tile is refused here ('water')
// unless the caller has found it in a bridgeable run (bridgeOk, ruling 314).
function roadTileReason(world, x, y, gateOnly = false, bridgeOk = false) {
  if (!isTile(x, y) || !inBounds(world.size, x, y)) return 'out_of_bounds';
  const i = idx(world.size, x, y);
  const ground = groundRefusal(world, i);   // Stage 4.7: water or hills (src/sim/terrain.js); only water can take a bridge
  if (ground && !(ground === 'water' && bridgeOk)) return ground;
  if (world.occ[i]) return 'blocked';
  if (gateOnly && !world.wall[i]) return 'not_wall';
  return null;
}

// The road tool's core (placement review P3, P5): what laying road on a list of tiles would do. { ok, reason, warnings,
// tiles: the map indices that change (free tiles that get road, and wall or breach tiles that become gates, in order; a
// tile with road already is left as it is, a gate included), gates: the subset that are gates, bridges: the water tiles that get
// a bridge (Stage 4.5, ruling 314: a straight run of at most BRIDGE_MAX tiles of water with land at both ends, each tile at
// costOf(world, 'bridge'); a longer or bent run refuses with 'too_wide' (water: how many tiles of water it holds) or
// 'bridge_shape', and a touch plan skips its tiles with that reason), bridgeCost (the bridges' share of cost), cost, skipped:
// [{ x, y, reason }] }. Stage 4.5 (ruling 309): a road may cross a wall; each standing wall tile it crosses without a road,
// and each breach, becomes a gate at the gate price (costOf(world, 'gate')) instead of the road price. By default the
// first tile that cannot take a road refuses the lot ('out_of_bounds', 'water', 'blocked'), as the mouse's L does; with
// skipBlocked (a touch plan) such tiles are skipped and the rest is laid. With gateOnly (the Gate card) only wall and breach
// tiles are accepted ('not_wall' for the rest). Fails with 'no_gold' when the cost would cross the debt floor, keeping
// tiles, gates, cost and skipped.
export function previewRoadTiles(world, list, { skipBlocked = false, gateOnly = false } = {}) {
  const tiles = [], gates = [], bridges = [], skipped = [];
  const ordered = uniqueTiles(list);
  const verdicts = gateOnly ? [] : bridgeVerdicts(world, ordered);
  for (let k = 0; k < ordered.length; k++) {
    const [x, y] = ordered[k];
    const v = verdicts[k];
    const onWater = inBounds(world.size, x, y) && world.terrain[idx(world.size, x, y)] === T.WATER && !gateOnly;
    const reason = v ? v.reason : roadTileReason(world, x, y, gateOnly, onWater);
    if (reason) {
      if (!skipBlocked) return fail(reason, { tiles: [], gates: [], bridges: [], cost: 0, skipped: [], ...(v ? { water: v.water } : {}) });
      skipped.push({ x, y, reason });
      continue;
    }
    const i = idx(world.size, x, y);
    const wall = world.wall[i];
    if (wall < 0 || (wall > 0 && !world.road[i])) { tiles.push(i); gates.push(i); }
    else if (!wall && !world.road[i]) { tiles.push(i); if (onWater) bridges.push(i); }
  }
  const bridgeCost = bridges.length * costOf(world, 'bridge');
  const cost = (tiles.length - gates.length - bridges.length) * roadCostOf(world) + gates.length * costOf(world, 'gate') + bridgeCost;
  if (!canAfford(world, cost)) return fail('no_gold', { tiles, gates, bridges, bridgeCost, cost, skipped });
  return { ok: true, warnings: [], tiles, gates, bridges, bridgeCost, cost, skipped };
}

// Lays the preview's tiles, charges for them and pushes one undo entry for the whole list. A gate tile gets its road and its
// wall's full gate hit points; the entry { kind: 'road', tiles: the tiles that were given road, cost, walls: [[tile index,
// the wall's value before]] } lets undo take the road off again and put each wall (or breach) back.
// A bridge tile (ruling 314) is a tile of the list that is water: its road is set like any other, and undo takes it off again.
export function drawRoadTiles(world, list, options = {}) {
  const p = previewRoadTiles(world, list, options);
  if (!p.ok || p.tiles.length === 0) return p;
  const gates = new Set(p.gates);
  const walls = p.gates.map((t) => [t, world.wall[t]]);
  const laid = p.tiles.filter((t) => !world.road[t]);
  for (const t of p.tiles) world.road[t] = 1;
  for (const t of gates) world.wall[t] = DEFENCE.gateHp;
  world.roadVersion++;
  if (gates.size) world.wallVersion++;
  spend(world, p.cost);
  pushUndo(world, { kind: 'road', tiles: laid, cost: p.cost, walls });
  return p;
}

// The L from a start to an end (the mouse's road), or null when an end is fractional, NaN or off the map (lineInto would
// never reach a fractional end).
function lineTiles(world, x0, y0, x1, y1, flip) {
  if (![x0, y0, x1, y1].every(Number.isInteger) || !inBounds(world.size, x0, y0) || !inBounds(world.size, x1, y1)) return null;
  return roadPath(x0, y0, x1, y1, flip);
}

// The mouse's road: an L, refused whole when any tile of it is blocked. Thin wrappers on the tile-list core, with the
// shapes they always had.
export function previewRoad(world, x0, y0, x1, y1, flip = false, options = {}) {
  const tiles = lineTiles(world, x0, y0, x1, y1, flip);
  if (!tiles) return fail('out_of_bounds', { tiles: [], gates: [], bridges: [], cost: 0 });
  const { skipped, ...p } = previewRoadTiles(world, tiles, { ...options, skipBlocked: false });
  return p;
}

export function drawRoad(world, x0, y0, x1, y1, flip = false, options = {}) {
  const tiles = lineTiles(world, x0, y0, x1, y1, flip);
  if (!tiles) return fail('out_of_bounds', { tiles: [], gates: [], bridges: [], cost: 0 });
  const { skipped, ...p } = drawRoadTiles(world, tiles, { ...options, skipBlocked: false });
  return p;
}

// Tiles of the rectangle between two corners. Non-integer corners give no tiles. With a map size the
// rectangle is clamped to the map first, so a huge drag costs at most size * size steps.
export function rectTiles(x0, y0, x1, y1, size = Infinity) {
  const out = [];
  if (![x0, y0, x1, y1].every(Number.isInteger)) return out;
  const last = size - 1;
  const ax = Math.max(0, Math.min(x0, x1)), bx = Math.min(last, Math.max(x0, x1));
  const ay = Math.max(0, Math.min(y0, y1)), by = Math.min(last, Math.max(y0, y1));
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) out.push([x, y]);
  return out;
}

// The plots tool's core (placement review P3, P5): plots on a list of tiles. positions: the tiles that take a plot, in
// order; skipped: [{ x, y, reason }] for the rest (taken, water, off the map). Fails with 'nothing_to_place' when none
// fits and 'no_gold' when the cost would cross the debt floor; a needs_road warning when any plot has no road beside it.
export function previewHouseTiles(world, list) {
  const positions = [], skipped = [];
  for (const [x, y] of uniqueTiles(list)) {
    const reason = checkTiles(world, 'house', x, y);
    if (reason) skipped.push({ x, y, reason });
    else positions.push([x, y]);
  }
  const cost = positions.length * costOf(world, 'house');
  if (!positions.length) return fail('nothing_to_place', { positions, cost: 0, skipped });
  const warnings = positions.some(([x, y]) => !touchesRoad(world, { x, y, w: 1, d: 1 })) ? ['needs_road'] : [];
  if (!canAfford(world, cost)) return fail('no_gold', { positions, cost, warnings, skipped });
  return { ok: true, warnings, positions, cost, skipped };
}

// Paints the preview's plots, charges once and pushes one undo entry for them all.
export function paintHouseTiles(world, list) {
  const p = previewHouseTiles(world, list);
  if (!p.ok) return { ...p, ids: [] };
  const good = p.positions.map(([x, y]) => onGoodSpot(world, x, y));   // each judged before any plot of this drawing is laid
  const ids = p.positions.map(([x, y], k) => { const b = insertBuilding(world, makeBuilding(world, 'house', x, y)); noteBuilt(world, b); notePlot(world, b, good[k]); return b.id; });
  spend(world, p.cost);
  pushUndo(world, { kind: 'place', ids, cost: p.cost });
  return { ok: true, warnings: p.warnings, ids, cost: p.cost, skipped: p.skipped };
}

// The mouse's plots: the rectangle between two corners, taken tiles left out.
export function previewHouses(world, x0, y0, x1, y1) {
  const { skipped, ...p } = previewHouseTiles(world, rectTiles(x0, y0, x1, y1, world.size));
  return p;
}

export function paintHouses(world, x0, y0, x1, y1) {
  const { skipped, ...p } = paintHouseTiles(world, rectTiles(x0, y0, x1, y1, world.size));
  return p;
}

// Stage 4 (ruling 250, spec 7.3): plazas are painted like plots, one 1x1 building a tile. Complete in the contract; Track A
// owns it after. previewPlazaTiles: { ok, reason, warnings, positions, cost, skipped } as previewHouseTiles; refused with
// 'locked' before City, 'nothing_to_place' when no tile is free and 'no_gold' when the cost would cross the debt floor.
// A plaza needs no road, so it never warns of one.
export function previewPlazaTiles(world, list) {
  if (!isUnlocked(world, 'plaza')) return fail('locked', { positions: [], cost: 0, skipped: [] });
  const positions = [], skipped = [];
  for (const [x, y] of uniqueTiles(list)) {
    const reason = checkTiles(world, 'plaza', x, y);
    if (reason) skipped.push({ x, y, reason });
    else positions.push([x, y]);
  }
  const cost = positions.length * costOf(world, 'plaza');
  if (!positions.length) return fail('nothing_to_place', { positions, cost: 0, skipped });
  if (!canAfford(world, cost)) return fail('no_gold', { positions, cost, skipped });
  return { ok: true, warnings: [], positions, cost, skipped };
}

// Paints the preview's plazas, charges once and pushes one undo entry for them all ({ kind: 'place', ids, cost }).
export function paintPlazaTiles(world, list) {
  const p = previewPlazaTiles(world, list);
  if (!p.ok) return { ...p, ids: [] };
  const ids = p.positions.map(([x, y]) => { const b = insertBuilding(world, makeBuilding(world, 'plaza', x, y)); noteBuilt(world, b); return b.id; });
  spend(world, p.cost);
  pushUndo(world, { kind: 'place', ids, cost: p.cost });
  const fresh = world.newItems.indexOf('plaza');
  if (fresh >= 0) world.newItems.splice(fresh, 1);
  return { ok: true, warnings: [], ids, cost: p.cost, skipped: p.skipped };
}

// Everything on a list of tiles (the demolish tool's core, placement review P3): buildings (rubble among them), road tiles
// with no wall on them and wall tiles, each once; a tile off the map or fractional is passed over. refund is the buildings'
// refunds less the rubble's clearing (clearCost, rubble tiles x rubbleCostOf), so it is negative when clearing costs more
// than the rest gives back; ok is false (reason 'no_gold') when that would take the treasury below the debt floor.
export function previewDemolishTiles(world, list) {
  const buildingIds = [];
  const roadTiles = [];
  const wallTiles = [];
  for (const [x, y] of uniqueTiles(list)) {
    if (!isTile(x, y) || !inBounds(world.size, x, y)) continue;
    const i = idx(world.size, x, y);
    if (world.occ[i] && !buildingIds.includes(world.occ[i])) buildingIds.push(world.occ[i]);
    if (world.road[i] && !world.wall[i]) roadTiles.push(i);   // a gate (or a breach on a road) keeps its road, as demolishAt does
    if (world.wall[i]) wallTiles.push(i);
  }
  const rubble = buildingIds.filter((id) => world.buildings[id].type === 'rubble').length;
  const refundTotal = buildingIds.reduce((s, id) => s + demolishRefundFor(world, world.buildings[id]), 0);
  const ok = refundTotal >= 0 || canAfford(world, -refundTotal);
  return { buildingIds, roadTiles, wallTiles, rubble, clearCost: rubble * rubbleCostOf(world), refund: refundTotal, ok, reason: ok ? null : 'no_gold' };
}

// Clears the preview's buildings, roads and walls, with one undo entry that puts them all back.
export function demolishTiles(world, list) {
  const p = previewDemolishTiles(world, list);
  const count = p.buildingIds.length + p.roadTiles.length + p.wallTiles.length;
  if (!count) return fail('nothing_here', { count: 0, refund: 0 });
  if (!p.ok) return fail(p.reason, { count, refund: 0 });
  const snaps = p.buildingIds.map((id) => JSON.parse(JSON.stringify(world.buildings[id])));
  for (const id of p.buildingIds) removeBuilding(world, id);
  for (const t of p.roadTiles) world.road[t] = 0;
  if (p.roadTiles.length) world.roadVersion++;
  const walls = p.wallTiles.map((t) => [t, world.wall[t]]);
  for (const [t] of walls) world.wall[t] = 0;
  if (walls.length) world.wallVersion++;
  refund(world, p.refund);
  world.tally.rubbleCleared += p.rubble;
  pushUndo(world, { kind: 'demolish', buildings: snaps, roads: p.roadTiles, walls, refund: p.refund });
  return { ok: true, warnings: [], count, refund: p.refund };
}

// The mouse's demolish: everything in the rectangle between two corners.
export const previewDemolishArea = (world, x0, y0, x1, y1) => previewDemolishTiles(world, rectTiles(x0, y0, x1, y1, world.size));
export const demolishArea = (world, x0, y0, x1, y1) => demolishTiles(world, rectTiles(x0, y0, x1, y1, world.size));

// The clearRubble command (spec 4.12, 7.3): clears the rubble in the rectangle (one tile by default) and nothing else,
// charging rubbleCostOf a tile; undoable like a demolish. { ok: true, count, cost, warnings: [] }, or fails with
// 'no_rubble' or 'no_gold' (below the debt floor). The Demolish tool clears rubble through demolishAt and demolishArea,
// which charge the same price.
export function clearRubble(world, x0, y0, x1 = x0, y1 = y0) {
  const ids = [];
  for (const [x, y] of rectTiles(x0, y0, x1, y1, world.size)) {
    const b = buildingAt(world, x, y);
    if (b && b.type === 'rubble' && !ids.includes(b.id)) ids.push(b.id);
  }
  if (!ids.length) return fail('no_rubble', { count: 0, cost: 0 });
  const cost = ids.length * rubbleCostOf(world);
  if (!canAfford(world, cost)) return fail('no_gold', { count: ids.length, cost });
  const snaps = ids.map((id) => JSON.parse(JSON.stringify(world.buildings[id])));
  for (const id of ids) removeBuilding(world, id);
  spend(world, cost);
  world.tally.rubbleCleared += ids.length;
  pushUndo(world, { kind: 'demolish', buildings: snaps, roads: [], walls: [], refund: -cost });
  return { ok: true, warnings: [], count: ids.length, cost };
}

// The city's id for the device's records (spec 4.19), given once by the interface (the sim never reads the clock): a
// new city gets it in createWorld, a city from before Stage 3 at load. Refused once the city has one.
export function setCityId(world, id) {
  if (typeof id !== 'string' || !id) return fail('bad_id');
  if (world.cityId) return fail('has_id');
  world.cityId = id;
  return { ok: true, warnings: [] };
}
