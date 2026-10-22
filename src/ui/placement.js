// Tools and their previews (spec 6.5). The world changes only through src/sim/commands.js here, followed
// by assignLabour so derived state is fresh while paused (1a follow-up).
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { MONUMENTS, MONUMENT, MONUMENT_PLACING } from '../data/monuments.js';
import { MONUMENT_STYLES, MONUMENT_STYLE_PICK_DEFAULT } from '../data/wonders.js';
import {
  canPlace, conditionsFor, place, previewRoad, drawRoad, roadPath, previewHouses, paintHouses, previewDemolishArea, demolishArea, demolishAt, rectTiles,
  previewRoadTiles, drawRoadTiles, previewHouseTiles, paintHouseTiles, previewDemolishTiles, demolishTiles, previewPlazaTiles, paintPlazaTiles,
} from '../sim/commands.js';
import { undo as undoCommand } from '../sim/undo.js';
import { previewAreaTiles, paintAreaTiles } from '../sim/areas.js';
import { routeRoad, drawRoute } from '../sim/route.js';
import { ROUTE_TEXT } from './routeText.js';
import { applySettings, settingsThatApply } from '../sim/another.js';
import { areaKindOf, AREA_SPACINGS, AREA_SPACING_DEFAULT } from '../data/areas.js';
import { AREA_TEXT, ANOTHER_TEXT, SPACING_NAMES } from './areaText.js';
import { assignLabour } from '../sim/labour.js';
import { startTool as startToolPatch, cancelTool, select } from './modes.js';
import { palaceOf } from '../sim/palace.js';
import { AUTO_OVERLAY, NEAREST_FIT_RADIUS } from '../data/ui.js';
import { homesServedFrom } from '../sim/housing.js';
import { homesCoveredBy } from '../sim/health.js';
import { crimeHomesCoveredBy } from '../sim/crime.js';
import { desirabilityField, desirabilityPreview } from '../sim/desirability.js';
import { housesOf, buildingsVersion } from '../sim/world.js';
import { unitsAwayFrom } from '../sim/armies.js';
import { costOf, workGoldPerUnit } from '../sim/costs.js';
import { monthlyBill, balanceWith } from '../sim/economy.js';
import { prestigeByKind } from '../sim/prestige.js';
import { setPlacingRot } from '../render/overlays.js';
import { refusingStores } from '../sim/production.js';
import { previewWall, drawWall, previewWallTiles, drawWallTiles } from '../sim/defence.js';
import { canBurn } from '../sim/fire.js';
import { roadReach, adjacentRoadTiles, touchesRoad } from '../sim/reach.js';
import { FIRE } from '../data/fire.js';
import { ECONOMY } from '../data/economy.js';
import { scoreLineFor } from './scoreUi.js';
import { LARGE_PLOT } from '../data/largePlots.js';
import { LARGE_TEXT, buildingName, reasonText, warningText, effectText, plural, nicerText, conditionText, plotsPlacedText, goodName, CONDITION_MARKS, CONDITION_STATE_WORDS, CONDITION_TEXT, DRAW_TEXT, T, DANGER_UI_TEXT, UI4_TEXT, ui4ConditionText, S45_TEXT, S46_MAP_TEXT, S46_COURT_TEXT } from './text.js';
import { bridgeSpot } from '../sim/bridges.js';
import { styleChoices } from './s46/wonders.js';

// A building tool's footprint in its rotation (Stage 4: tool.rot 1 turns a mastaba a quarter, dimsOf; ruling 234).
const footprintOf = (tool) => (tool.kind === 'building' ? dimsOf(tool.type, tool.rot || 0) : { w: 1, d: 1 });
const rotOf = (tool) => (tool && tool.rot) || 0;
// Stage 4.6 (Wonders track, ruling 343): the style a monument's tool carries (the bar's picker sets it, createPlacement.start gives it the last
// one chosen), null for anything else. A tool made without one reads as the picker's default.
const styleOfTool = (tool) => (tool && tool.kind === 'building' && BUILDINGS[tool.type].monument ? (MONUMENT_STYLES[tool.style] && MONUMENT_STYLES[tool.style].pick ? tool.style : MONUMENT_STYLE_PICK_DEFAULT) : null);
const isMonumentType = (type) => Boolean(BUILDINGS[type] && BUILDINGS[type].monument);
// How far a picked building's ghost looks for a fit (spec 6.5, ruling 232): 16 tiles for footprints of 3x3 and up
// (MONUMENT_PLACING.bigArea tiles: the 4x3 mastaba, the pyramids and the palace), else NEAREST_FIT_RADIUS.
export const fitRadiusOf = (type) => (BUILDINGS[type] && BUILDINGS[type].w * BUILDINGS[type].d >= MONUMENT_PLACING.bigArea ? MONUMENT_PLACING.fitRadius : NEAREST_FIT_RADIUS);

// Tools drawn as a line from a start to an end, in an L that can be flipped (spec 6.4 Drawing mode): roads and walls.
export const LINE_TOOLS = ['road', 'wall'];

// Stage 4.5 (ruling 309): the Gate card is the road tool with tool.gate set; it takes wall and breach tiles only. A road
// through a wall makes gates at the gate price, and the bar says so, in the price function's numbers.
const roadOptions = (tool) => (tool.gate ? { gateOnly: true } : {});
// Ruling 314: a road over water makes bridge tiles at the bridge price, and a crossing wider than the rule allows is refused with
// how much water it holds ("Too wide to bridge here (6 tiles of water)"): the sim's own run length and price.
function roadText(world, r) {
  const gates = (r.gates || []).length, bridges = (r.bridges || []).length, roads = r.tiles.length - gates - bridges;
  if (!gates && !bridges) return plural(r.tiles.length, 'tile', 'tiles');
  const parts = [];
  if (roads) parts.push(plural(roads, 'tile', 'tiles'));
  if (gates) parts.push(S45_TEXT.gateNote(gates, costOf(world, 'gate')));
  if (bridges) parts.push(S45_TEXT.bridgeNote(bridges, r.bridgeCost));
  return parts.join(' · ');
}
const roadRefusalText = (r) => (r.reason === 'too_wide' ? S45_TEXT.tooWide(r.water) : reasonText(r.reason));
const roadDoneText = (tool, result) => (tool.gate ? S45_TEXT.gateBuilt
  : result.ok && result.bridges && result.bridges.length ? S45_TEXT.roadLaidBridge(result.bridges.length)
    : result.ok && result.gates && result.gates.length ? S45_TEXT.roadLaidGates(result.gates.length) : T.roadLaid);
const isLine = (tool) => Boolean(tool) && LINE_TOOLS.includes(tool.kind);
// Version 5.0 (Task 5): the road tool in Route mode (tool.route; the Gate card never routes): two ends, and the cheapest way between them.
const ROUTE_END_MS = 16;   // Version 5.0 (Task 6): the least time between two ends of a dragged route (one frame)
const isRoute = (tool) => Boolean(tool) && tool.kind === 'road' && !tool.gate && Boolean(tool.route);

// A touch plan (placement review P3, P5): what a finger or pen has drawn and tapped in a drawing tool since it started, stroke by
// stroke, until the tick. state.plan is { tiles: [[x, y], ...] }, each tile once, in the order it was added. Roads and walls
// follow the finger tile by tile; plots and Demolish paint the rectangle from where the finger went down to where it is. A tap
// adds one tile or takes it off. The mouse keeps its line (click a start, click an end, or drag) and Flip.
const sameTile = (a, b) => Boolean(a) && Boolean(b) && a[0] === b[0] && a[1] === b[1];
const tileKey = (t) => `${t[0]},${t[1]}`;

// base, then the tiles of more not already in it.
function joinTiles(base, more) {
  const seen = new Set(base.map(tileKey));
  const out = base.slice();
  for (const t of more) { const k = tileKey(t); if (!seen.has(k)) { seen.add(k); out.push(t); } }
  return out;
}

// The tiles a finger crossed between two tiles it was seen on (a quick finger skips some): four-way steps, along the axis it
// moved most first, then the other. The first tile is left out, the last is in.
export function fourWaySteps(x0, y0, x1, y1) {
  const out = [];
  let x = x0, y = y0;
  const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
  const alongX = () => { while (x !== x1) { x += sx; out.push([x, y]); } };
  const alongY = () => { while (y !== y1) { y += sy; out.push([x, y]); } };
  if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) { alongX(); alongY(); } else { alongY(); alongX(); }
  return out;
}

// A road or wall stroke goes on to tile t: each tile the finger crossed is added once; stepping back from the stroke's end onto
// the tile before it takes the end off again (dragging back over the last tiles undoes them). Crossing a tile the stroke
// already has (a loop) adds nothing and takes nothing off.
function followFinger(stroke, t) {
  for (const step of fourWaySteps(stroke.at[0], stroke.at[1], t[0], t[1])) {
    const n = stroke.path.length;
    if (n > 1 && sameTile(stroke.at, stroke.path[n - 1]) && sameTile(step, stroke.path[n - 2])) stroke.path.pop();
    else if (!stroke.path.some((q) => sameTile(q, step))) stroke.path.push(step);
    stroke.at = step;
  }
}

export function snapGhost(world, tool, x, y) {
  const { w, d } = footprintOf(tool);
  return { x: Math.max(0, Math.min(world.size - w, Math.round(x))), y: Math.max(0, Math.min(world.size - d, Math.round(y))) };
}

// The tiles at Chebyshev distance r from (cx, cy): nearest first, then the upper row, then the left column, so
// the search below is deterministic.
function ringTiles(cx, cy, r) {
  if (r === 0) return [[cx, cy]];
  const out = [];
  for (let k = -r; k <= r; k++) out.push([k, -r], [k, r]);
  for (let k = -r + 1; k <= r - 1; k++) out.push([-r, k], [r, k]);
  out.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]) || a[1] - b[1] || a[0] - b[0]);
  return out.map(([dx, dy]) => [cx + dx, cy + dy]);
}

// Where a picked building's ghost lands (early-game pass 2.6, placement review P10 and P15): the nearest origin, in rings out to
// maxR tiles around the snapped point, where it can be placed. A building that only lacks a road counts as a fit with a
// warning (the player's placing passes roadLater, as the preview does), so a farm picked in a new city lands on fertile
// land beside the town instead of where nothing fits. A clean fit anywhere in reach beats a fit with a warning, and among
// fits with warnings the one with the fewest wins, the nearest of those (a farm beside a road with no granary yet beats a
// nearer one with no road either); a building
// that needs fertile or rocky ground, with no fit at all within reach, looks on out to three times as far, since the
// ground it needs can lie beyond the town; with none, the snapped point stays, so the bar can say why. Line and area
// tools only snap.
// Stage 4 (Track C): a monument or the palace searches fitRadiusOf (16) in its rotation; a monument's crew and supply count as
// "later" conditions like the road (canPlace's warnings), so a spot near a guild and a quarry wins; monuments have no terrain,
// so no three-times reach.
// One turn's search: the nearest origin about `start` where the tool fits with that turn, ranked as the search finds it: tier 0 a clean fit
// within maxR, 1 a fit with warnings within maxR (the fewest), 2 a clean fit further out, 3 a fit with warnings further out; r is its ring.
// null when nothing fits.
function fitSearch(world, tool, start, rot, maxR, farR) {
  let warned = null;
  const scan = (from, to, far) => {
    for (let r = from; r <= to; r++) {
      for (const [tx, ty] of ringTiles(start.x, start.y, r)) {
        const c = canPlace(world, tool.type, tx, ty, { roadLater: true, rot, style: styleOfTool(tool) });   // off-map origins fail here as out_of_bounds
        if (!c.ok) continue;
        if (!c.warnings.length) return { x: tx, y: ty, tier: far ? 2 : 0, r, n: 0 };
        if (!warned || c.warnings.length < warned.n) warned = { x: tx, y: ty, tier: far ? 3 : 1, r, n: c.warnings.length };
      }
    }
    return null;
  };
  const clean = scan(0, maxR, false);
  if (clean) return clean;
  if (!warned && (BUILDINGS[tool.type].terrain || BUILDINGS[tool.type].water)) { const far = scan(maxR + 1, farR === null ? maxR * 3 : farR, true); if (far) return far; }   // farR (Stage 4.6, ruling 331): Show me and the pick look the whole map over, where the ground it needs may lie
  return warned;
}

// The nearest spot that fits: { x, y }, and rot for a building that turns. Ruling 424: a building that turns (a fishing wharf, a mastaba) is
// searched in both turns, and the other turn wins only with a better kind of fit (a clean fit before one with warnings, a near one before a far
// one, anything before none); the turn in hand keeps a fit of the same kind even a ring or two further, so a mastaba is not turned under the
// player for a tile. A wharf picked or shown beside a river running the other way lands turned to fit instead of refused. Callers take rot with
// x and y when it is there.
export function nearestFit(world, tool, x, y, maxR = null, farR = null) {
  const start = snapGhost(world, tool, x, y);
  if (!tool || tool.kind !== 'building') return start;
  if (maxR === null) maxR = fitRadiusOf(tool.type);
  const rot = rotOf(tool);
  const rots = BUILDINGS[tool.type].rotates ? [rot, rot ? 0 : 1] : [rot];
  let best = null;
  for (const r of rots) {
    if (best && best.tier === 0) break;                                       // a clean near fit in the turn in hand: nothing beats it
    const t = r === rot ? tool : { ...tool, rot: r };
    const found = fitSearch(world, t, r === rot ? start : snapGhost(world, t, x, y), r, maxR, farR);
    if (found && (!best || found.tier < best.tier)) best = { ...found, rot: r };
  }
  const turns = rots.length > 1;
  if (!best) return turns ? { x: start.x, y: start.y, rot } : { x: start.x, y: start.y };
  return turns ? { x: best.x, y: best.y, rot: best.rot } : { x: best.x, y: best.y };
}

// conditions: a building's chips for the confirm bar ([] for lines and areas); footprint: each of its tiles' own state; joins: the
// free tiles where a road would touch it (placement review P9, P10).
const idle = (text, tiles = []) => ({ state: 'idle', reason: null, warnings: [], text, effect: '', cost: 0, count: 0, tiles, refund: 0, conditions: [], footprint: [], joins: [] });
const bad = (reason, cost, count, tiles = [], text = reasonText(reason)) => ({ state: 'bad', reason, warnings: [], text, effect: '', cost, count, tiles, refund: 0, conditions: [], footprint: [], joins: [] });

// Stage 3 (Track D, spec 4.12): the buildings that can burn a firehouse at (x, y) would reach: fireCoverage's own test
// (src/sim/fire.js: a road tile next to the building within FIRE.reach road tiles of the firehouse), counted as if it
// were staffed. Uncached, like homesServedFrom, so a moving ghost leaves nothing in the reach cache.
export function firehouseReachFrom(world, x, y) {
  const def = BUILDINGS.firehouse;
  const reach = roadReach(world, { x, y, w: def.w, d: def.d }, FIRE.reach, { cache: false });
  if (!reach.size) return 0;
  let n = 0;
  for (const b of Object.values(world.buildings)) if (canBurn(b) && adjacentRoadTiles(world, b).some((t) => reach.has(t))) n++;
  return n;
}

// The homes a service would reach from the ghost's spot, counted as its own sheet will count them: the physician and the police
// post count homes with people in them (homesCoveredBy, crimeHomesCoveredBy: the sheets' "Covers N homes"), so the bar and the
// sheet agree; the water, food, faith and play services count every housing plot (homesServedFrom). Uncached either way.
export function serviceHomesFrom(world, type, x, y) {
  const def = BUILDINGS[type];
  const p = { x, y, w: def.w, d: def.d };
  if (type === 'physician') return homesCoveredBy(world, p, { cache: false });
  if (type === 'police_post') return crimeHomesCoveredBy(world, p, { cache: false });
  return homesServedFrom(world, type, x, y);
}

// A ghost's first warning in words. A producer with no store in reach that takes its good names the store it needs; when a
// store there is built to hold the good but refuses it, the line says so, so the accept switch is not hidden.
function warningLine(world, type, x, y, code) {
  const def = BUILDINGS[type];
  const refused = code === 'no_storage' && refusingStores(world, { id: -1, x, y, w: def.w, d: def.d }, def.produces.good, def.producerReach).length > 0;
  return warningText(refused ? 'store_refuses' : code, type);
}

// What a ghost would do to the desirability around it (spec 4.7), memoised per ghost tile: desirabilityField is memoised
// on the city's buildings and roads, so while it hands back the same field nothing has changed and the last answer stands.
// A ghost moved a tile asks once; a frame that only redraws asks nothing. `near` says whether any home or plot lies on the
// tiles it would change: the tint is there to show which homes get nicer or worse, so with none it is not drawn (a farm
// out on the fertile land would otherwise sit in coral hatching that reads as "can't").
const nicerMemo = new WeakMap();   // world -> { field, type, x, y, value }
export function nicerFor(world, type, x, y) {
  const field = desirabilityField(world);
  const m = nicerMemo.get(world);
  if (m && m.field === field && m.type === type && m.x === x && m.y === y) return m.value;
  const preview = desirabilityPreview(world, type, x, y);
  const on = new Set(preview.tiles.map((t) => t.y * world.size + t.x));
  const near = on.size > 0 && housesOf(world).some((h) => {
    for (let ty = h.y; ty < h.y + h.d; ty++) for (let tx = h.x; tx < h.x + h.w; tx++) if (on.has(ty * world.size + tx)) return true;
    return false;
  });
  const value = { ...preview, near };
  nicerMemo.set(world, { field, type, x, y, value });
  return value;
}

// Stage 4.6 (UX rule 6, ruling 352): a building bound to its ground (terrain or water) offers Show me for every refusal that is about
// the spot (ground, water, taken, off the map), not only the ones that quote the rule; a locked or one-only refusal has no spot to find.
const SPOT_REFUSALS = ['occupied', 'water', 'hills', 'out_of_bounds'];   // Stage 4.7: hills too (ruling 464)
const groundBoundRefusal = (def, reason) => Boolean(def && (def.terrain || def.water) && (SPOT_REFUSALS.includes(reason) || /^needs_/.test(reason)));

function basePreview(world, state) {
  const { tool } = state;
  if (!tool) return null;
  if (tool.kind === 'building') {
    const def = BUILDINGS[tool.type];
    if (!state.ghost) return idle('');
    const { x, y } = state.ghost;
    const cost = costOf(world, tool.type, { style: styleOfTool(tool) });
    // Every condition on its own (P9); a building that lacks only a road can still be placed, in amber (P10).
    const c = conditionsFor(world, tool.type, x, y, { roadLater: true, rot: rotOf(tool), style: styleOfTool(tool) });
    const refused = c.warnings.includes('no_storage') && refusingStores(world, { id: -1, x, y, w: def.w, d: def.d }, def.produces.good, def.producerReach).length > 0;
    const chips = c.conditions.filter((k) => k.key !== 'gold' || k.state !== 'met').map((k) => {
      // Stage 4 (Track C, spec 6.5, ruling 230): a monument's chips say its own words (ground, road, crew, supply, founding).
      const text = def.monument ? ui4ConditionText(k, tool.type) : conditionText(k, tool.type, { refused: refused && k.reason === 'no_storage' });
      return { key: k.key, state: k.state, mark: CONDITION_MARKS[k.state], text, label: `${CONDITION_STATE_WORDS[k.state]}: ${text}` };
    });
    const road = c.conditions.find((k) => k.key === 'road');
    const ground = c.conditions.find((k) => k.key === 'ground');
    // The tiles where a road would join are shown only while the spot itself is fine: a footprint on water has no use for them.
    const joins = road && road.state === 'later' && ground.state === 'met' ? road.joins : [];
    const extra = { conditions: chips, footprint: c.tiles.map(({ x: tx, y: ty, state: st }) => ({ x: tx, y: ty, state: st })), joins };
    // Stage 4.6 (ruling 331): a ground or water refusal says why in the rule's own numbers ("Needs 2 of 4 tiles on clay (this spot has 1)") and offers Show me.
    if (!c.ok) { const line = S46_MAP_TEXT.refusalLine(c.reason, ground, def); return { ...bad(c.reason, cost, 1, [], line || reasonText(c.reason)), showFit: Boolean(line) || groundBoundRefusal(def, c.reason), ...extra }; }
    const warn = c.warnings.length > 0;
    // A service says how many homes it would reach from here (early-game pass 2.6); a firehouse, how many buildings that
    // can burn (Stage 3); other buildings say nothing.
    const effect = tool.type === 'firehouse' ? DANGER_UI_TEXT.firehouseCovers(firehouseReachFrom(world, x, y))
      : def.reach ? effectText(tool.type, serviceHomesFrom(world, tool.type, x, y)) : '';
    // Version 6.0 (Track C): a Large plot says what it will do before the tap: it opens as a Manor when its needs are met nearby (the sheet lists them).
    const text = !warn ? (tool.type === LARGE_PLOT.type ? LARGE_TEXT.bar : '') : c.warnings[0] === 'needs_road' && joins.length ? CONDITION_TEXT.roadHint : warningLine(world, tool.type, x, y, c.warnings[0]);
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: c.warnings, text, effect, cost, count: 1, tiles: [], refund: 0, ...extra };
  }
  if (state.plan && state.plan.tiles.length) return planPreview(world, tool, state.plan.tiles);
  // Before anything is drawn the first line says how: a finger or pen drags or taps tiles; a mouse clicks a start and an end.
  const touch = state.inputType === 'touch' || state.inputType === 'pen';
  if (isLine(tool)) {
    const l = state.line;
    if (isRoute(tool)) {                                                                          // Version 5.0 (Task 5): the routed road, two ends and the search between them
      if (!l) return idle(touch ? ROUTE_TEXT.idleTouch : ROUTE_TEXT.idleMouse);
      if (l.x1 === null) return idle(T.tapEnd, [[l.x0, l.y0]]);
      return routePreview(world, l);
    }
    if (!l) return idle(touch ? DRAW_TEXT.idle : T.tapStart);
    if (l.x1 === null) return idle(T.tapEnd, [[l.x0, l.y0]]);
    const tiles = roadPath(l.x0, l.y0, l.x1, l.y1, l.flip);
    const r = tool.kind === 'road' ? previewRoad(world, l.x0, l.y0, l.x1, l.y1, l.flip, roadOptions(tool)) : previewWall(world, l.x0, l.y0, l.x1, l.y1, l.flip);
    if (!r.ok) return bad(r.reason, r.cost, r.tiles.length, tiles, roadRefusalText(r));
    if (!r.tiles.length) return bad('nothing_to_place', 0, 0, tiles);
    if (tool.kind === 'wall') {
      // Stage 3 (spec 4.13, 6.4): only the tiles that get wall (standing wall is skipped), the gates among them marked, and
      // the count says how many are gates on roads (previewWall: tiles and gates are map indices).
      const at = (i) => [i % world.size, Math.floor(i / world.size)];
      const gates = r.gates || [];
      return { state: 'ok', reason: null, warnings: [], text: DANGER_UI_TEXT.wallCount(r.tiles.length, gates.length), effect: '', cost: r.cost, count: r.tiles.length, tiles: r.tiles.map(at), gates, refund: 0 };
    }
    return { state: 'ok', reason: null, warnings: [], text: roadText(world, r), effect: '', cost: r.cost, count: r.tiles.length, tiles, gates: r.gates || [], bridges: r.bridges || [], refund: 0 };
  }
  const a = state.area;
  if (!a) return idle(touch ? DRAW_TEXT.idle : T.tapStart);
  if (a.x1 === null) return idle(T.tapCorner, [[a.x0, a.y0]]);
  if (tool.kind === 'houses') {
    const r = previewHouses(world, a.x0, a.y0, a.x1, a.y1);
    const tiles = r.positions.map(([x, y]) => [x, y]);
    if (!r.ok) return bad(r.reason, r.cost, r.positions.length, tiles);
    const warn = r.warnings.length > 0;
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningText(r.warnings[0]) : plural(r.positions.length, 'plot', 'plots'), effect: '', cost: r.cost, count: r.positions.length, tiles, refund: 0 };
  }
  if (tool.kind === 'plazas') return plazaPreview(previewPlazaTiles(world, rectTiles(a.x0, a.y0, a.x1, a.y1, world.size)));   // Stage 4 (ruling 250)
  if (tool.kind === 'areas') return areaPreview(world, tool, rectTiles(a.x0, a.y0, a.x1, a.y1, world.size));                  // Version 5.0 (Task 4)
  return demolishPreview(previewDemolishArea(world, a.x0, a.y0, a.x1, a.y1), rectTiles(a.x0, a.y0, a.x1, a.y1, world.size), world);
}

// Version 5.0 (Task 5, rulings 560-569): the routed road's preview between two ends (routeRoad, src/sim/route.js: its cost is previewRoadTiles' own for the tiles it
// chose, so the bar's price is what drawRoute charges). tiles are every tile of the way (the ghost draws them, existing road too); a refusal says why and carries `at`,
// the first tile of what is in the way, for Show me. A route nothing is dear enough to refuse still shows, with the treasury's verdict ('no_gold').
function routePreview(world, l) {
  const r = routeRoad(world, l.x0, l.y0, l.x1, l.y1);
  const tiles = r.path.length ? r.path : [[l.x0, l.y0]];
  if (!r.ok && r.reason !== 'no_gold') return { ...bad(r.reason, 0, 0, tiles, ROUTE_TEXT.refusal(world, r)), at: r.at, water: r.water, routed: true };
  if (!r.ok) return { ...bad('no_gold', r.cost, r.tiles.length, tiles, [ROUTE_TEXT.summary(r), reasonText('no_gold')].join(' · ')), bridges: r.bridges, gates: r.gates, at: null, routed: true };
  if (!r.tiles.length) return { ...bad('nothing_to_place', 0, 0, tiles), at: null, routed: true };
  return { state: 'ok', reason: null, warnings: [], text: ROUTE_TEXT.summary(r), effect: '', cost: r.cost, count: r.tiles.length, tiles, gates: r.gates, bridges: r.bridges, crossings: r.crossings, used: r.used, refund: 0, at: null, routed: true };
}

// Stage 4.6 (ruling 350): until a road is drawn the bar's cost line (empty then) says that a road can cross water, and what a bridge costs (the sim's price).
const bridgeNote = (world, tool) => (tool.kind === 'road' && !tool.gate ? S46_MAP_TEXT.bridgeBar(costOf(world, 'bridge')) : '');
const WATER_REFUSALS = ['water', 'too_wide', 'bridge_shape'];

// A touch plan's preview (P3, P5): it lays every tile it can and skips the blocked ones. tiles are all the plan's tiles (the
// ghost draws them), skipped the ones it passes over ([x, y], drawn coral with a cross), and the words count both: "8 tiles ·
// 2 skipped: something is in the way". Gold short for the lot refuses it, as a line or an area does.
function planPreview(world, tool, tiles) {
  const skippedOf = (r) => (r.skipped || []).map((k) => [k.x, k.y]);
  const withSkips = (text, r) => (r.skipped && r.skipped.length ? `${text} · ${DRAW_TEXT.skipped(r.skipped)}` : text);
  // Nothing laid: the skipped tiles' reason when every tile was skipped, else nothing new to place.
  const nothing = (r) => {
    const skipped = skippedOf(r);
    if (skipped.length === tiles.length) { const reasons = [...new Set(r.skipped.map((k) => k.reason))]; return { ...bad(reasons.length === 1 ? reasons[0] : 'blocked', 0, 0, tiles), skipped }; }
    return { ...bad('nothing_to_place', 0, 0, tiles), skipped };
  };
  if (tool.kind === 'road' || tool.kind === 'wall') {
    const wall = tool.kind === 'wall';
    const r = (wall ? previewWallTiles : previewRoadTiles)(world, tiles, wall ? { skipBlocked: true } : { skipBlocked: true, ...roadOptions(tool) });
    if (r.reason === 'nothing_to_place' || (r.ok && !r.tiles.length)) return nothing(r);
    if (!r.ok) return { ...bad(r.reason, r.cost, r.tiles.length, tiles), skipped: skippedOf(r) };
    const gates = r.gates || [];
    const text = wall ? DANGER_UI_TEXT.wallCount(r.tiles.length, gates.length) : roadText(world, r);
    return { state: 'ok', reason: null, warnings: [], text: withSkips(text, r), effect: '', cost: r.cost, count: r.tiles.length, tiles, gates, bridges: r.bridges || [], skipped: skippedOf(r), refund: 0 };
  }
  if (tool.kind === 'houses') {
    const r = previewHouseTiles(world, tiles);
    if (r.reason === 'nothing_to_place') return nothing(r);
    if (!r.ok) return { ...bad(r.reason, r.cost, r.positions.length, tiles), skipped: skippedOf(r) };
    const warn = r.warnings.length > 0;
    const text = warn ? warningText(r.warnings[0]) : plural(r.positions.length, 'plot', 'plots');
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: withSkips(text, r), effect: '', cost: r.cost, count: r.positions.length, tiles, skipped: skippedOf(r), refund: 0 };
  }
  if (tool.kind === 'plazas') {                                                                   // Stage 4 (ruling 250): as plots
    const r = previewPlazaTiles(world, tiles);
    if (r.reason === 'nothing_to_place') return nothing(r);
    return { ...plazaPreview(r, tiles), skipped: skippedOf(r) };
  }
  if (tool.kind === 'areas') return areaPreview(world, tool, tiles);
  return demolishPreview(previewDemolishTiles(world, tiles), tiles, world);
}

// previewAreaTiles runs for the tool and for each spacing button on every bar render; the answer depends only on the tiles, the type, the spacing and the world
// (buildings, roads, the treasury, the day), so it is kept per rectangle and spacing while those hold (ruling 560: one call, not four, per render).
const areaMemo = new WeakMap();
export function areaPreviewOf(world, type, tiles, spacing) {
  const sig = `${buildingsVersion(world)}|${world.roadVersion}|${world.gold}|${world.day}`;
  let m = areaMemo.get(world);
  if (!m || m.sig !== sig) { m = { sig, map: new Map() }; areaMemo.set(world, m); }
  let h = tiles.length;
  for (let i = 0; i < tiles.length; i++) h = (Math.imul(h, 31) + tiles[i][0] * 4099 + tiles[i][1]) | 0;
  const key = `${type}|${spacing || 0}|${tiles.length}|${h}`;
  let r = m.map.get(key);
  if (!r) { if (m.map.size > 24) m.map.clear(); r = previewAreaTiles(world, type, tiles, { spacing }); m.map.set(key, r); }
  return r;
}

// Version 5.0 (Task 4, rulings 550-559): a farm, garden or statue area's preview, a rectangle's or a plan's tiles (previewAreaTiles, src/sim/areas.js: the count, the price,
// the tiles the ground refuses). boxes are the buildings it would lay (ghostsFor draws each at its own size); skipped the refused tiles. The cost line says
// "6 farms · 240 gold"; a treasury that cannot pay the lot refuses it, saying how many it can pay for (the sim lays all or nothing, as plots do).
function areaPreview(world, tool, tiles) {
  const r = areaPreviewOf(world, tool.type, tiles, tool.spacing);
  const skipped = r.skipped.map((k) => [k.x, k.y]);
  const { w, d } = dimsOf(tool.type, 0);
  const boxes = r.positions.map(([x, y]) => ({ x, y, w, d }));
  const n = r.positions.length;
  const costText = n ? AREA_TEXT.costLine(tool.type, n, r.cost) : '';
  if (r.reason === 'nothing_to_place') return { ...bad('nothing_to_place', 0, 0, [], AREA_TEXT.nothing(tool.type, r.skipped)), skipped, boxes: [] };
  if (!r.ok && r.reason !== 'no_gold') return { ...bad(r.reason, 0, 0, tiles), skipped, boxes: [] };
  const skipText = r.skipped.length ? AREA_TEXT.skipped(r.skipped) : '';
  if (r.reason === 'no_gold') return { ...bad('no_gold', r.cost, n, r.positions, [AREA_TEXT.noGold(tool.type, r), skipText].filter(Boolean).join(' · ')), skipped, boxes, costText };
  const warn = r.warnings.length > 0;
  const text = [warn ? warningText(r.warnings[0], tool.type) : '', skipText].filter(Boolean).join(' · ');
  return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text, effect: '', cost: r.cost, count: n, tiles: r.positions, skipped, boxes, costText, refund: 0, conditions: [], footprint: [], joins: [] };
}

// Stage 4 (ruling 250): the plaza tool's preview, a rectangle's or a plan's (tiles: the plan's, else the plazas'). Track C
// words it fully; the contract counts them like plots.
function plazaPreview(r, tiles = r.positions) {
  if (!r.ok) return bad(r.reason, r.cost, r.positions.length, tiles);
  return { state: 'ok', reason: null, warnings: [], text: plural(r.positions.length, 'plaza', 'plazas'), effect: '', cost: r.cost, count: r.positions.length, tiles, refund: 0 };
}

// Demolish's preview, a rectangle's or a plan's: what it would take up, and its refund (or, Stage 3, what clearing rubble costs).
function demolishPreview(r, tiles, world = null) {
  const count = r.buildingIds.length + r.roadTiles.length + r.wallTiles.length;
  if (!count) return bad('nothing_here', 0, 0, tiles);
  // Clearing rubble would cross the debt floor (Stage 3, spec 4.12): the bar says so in the rule's words.
  if (!r.ok) return bad(r.reason, -r.refund, count, tiles, DANGER_UI_TEXT.wouldPassDebt(-ECONOMY.debtFloor));
  // Rubble is cleared, not refunded: "Clear 4 rubble: 20 gold", beside the other items when there are any.
  const others = count - r.rubble;
  const text = r.rubble
    ? [others ? plural(others, 'item', 'items') : '', DANGER_UI_TEXT.clearRubble(r.rubble, r.clearCost)].filter(Boolean).join(' · ')
    : `${plural(count, 'item', 'items')} · ${T.refund} ${r.refund}`;
  // Stage 4.6 (ruling 443): units away at the capital whose building this takes leave service on their return: the bar warns in amber.
  const away = world && world.army ? r.buildingIds.reduce((n, id) => n + unitsAwayFrom(world, id), 0) : 0;
  if (away > 0) return { state: 'warn', reason: null, warnings: [], text: `${text} · ${S46_COURT_TEXT.demolishAwayShort(away)}`, effect: '', cost: -r.refund, count, tiles, refund: r.refund };
  return { state: 'ok', reason: null, warnings: [], text, effect: '', cost: -r.refund, count, tiles, refund: r.refund };
}

// The preview a tool shows. A building that can go where its ghost is also says what it would do to the homes around it
// (spec 4.7): nicer is "Makes 6 homes nicer" (or '') and nicerTone 'better', 'worse', 'mixed' or ''.
export function toolPreview(world, state) {
  const p = basePreview(world, state);
  if (!p) return p;
  if (state.tool.kind === 'road' && !state.tool.gate && p.state === 'bad' && (WATER_REFUSALS.includes(p.reason) || (p.routed && p.at))) p.showFit = true;   // Stage 4.6 (ruling 350): Show me finds a crossing; Version 5.0 (Task 5): a routed road's refusal shows what is in the way
  p.note = p.state === 'idle' ? bridgeNote(world, state.tool) : '';
  p.nicer = '';
  p.nicerTone = '';
  p.score = '';                                         // Stage 3: the parts it would change, "+3 Culture" (scoreUi.js)
  p.line = '';                                          // Stage 4: a monument's line, the score's part first (monumentLine)
  p.upkeep = '';                                        // Stage 4.5 (Task 4b): "Costs 46 a month · 10 workers" and "Monthly balance becomes -89"
  p.balance = '';
  p.balanceNet = 0;
  if (state.tool.kind === 'building' && isMonumentType(state.tool.type) && (p.state === 'ok' || p.state === 'warn')) {
    p.score = scoreLineFor(world, state.tool.type, state.ghost.x, state.ghost.y);
    p.line = [p.score, monumentLine(world, state.tool.type, state.ghost.x, state.ghost.y, rotOf(state.tool), styleOfTool(state.tool))].filter(Boolean).join(' · ');
  } else if (state.tool.kind === 'building' && state.tool.type !== LARGE_PLOT.type && (p.state === 'ok' || p.state === 'warn')) {   // a Large plot is an empty lot: it changes no street and no score
    const d = nicerFor(world, state.tool.type, state.ghost.x, state.ghost.y);
    p.nicer = nicerText(d.better, d.worse);
    p.nicerTone = d.better && d.worse ? 'mixed' : d.better ? 'better' : d.worse ? 'worse' : '';
    p.score = scoreLineFor(world, state.tool.type, state.ghost.x, state.ghost.y);
  }
  // Version 5.0 (Task 4): Build another's copied settings are said before the tick (ruling 505); an area says what its buildings cost a month together.
  p.copy = state.tool.kind === 'building' && state.tool.copy ? ANOTHER_TEXT.copy(settingsThatApply(state.tool.type, state.tool.copy), goodName) : '';   // only what applySettings would write
  if (state.tool.kind === 'areas' && p.count > 0 && (p.state === 'ok' || p.state === 'warn')) {
    const bill = monthlyBill(state.tool.type, world);
    if (bill.bill > 0) {
      p.upkeep = AREA_TEXT.upkeepFor(bill, p.count);
      if (!p.warnings.includes('needs_road')) { p.balanceNet = balanceWith(world, state.tool.type, p.count); p.balance = S45_TEXT.balanceLine(p.balanceNet); }
    }
  }
  if (state.tool.kind === 'building' && p.state !== 'idle') {
    const bill = monthlyBill(state.tool.type, world);
    if (bill.bill > 0) {
      p.upkeep = S45_TEXT.upkeepLine(bill);
      // A building no road touches costs nothing until one does (monthFigures), so its balance waits for the road; a spot that cannot
      // be built on has no balance. The bar keeps the line's room either way (confirmBar.js), so it never grows as the ghost moves.
      if ((p.state === 'ok' || p.state === 'warn') && !p.warnings.includes('needs_road')) {
        p.balanceNet = balanceWith(world, state.tool.type);
        p.balance = S45_TEXT.balanceLine(p.balanceNet);
      }
    }
  }
  return p;
}

// Stage 4 (Track C, spec 6.5, ruling 251): what a monument will cost and do, all from the sim, after the score's "+N Monuments
// when finished" (Track D's scoreLineFor): a second of a kind says one of each kind counts once the first is finished; then the
// work gold a full crew is paid a month (workGoldPerUnit x MONUMENT.unitsPerCrewMonth), the homes the finished monument makes
// nicer and the homes the site makes less pleasant (desirabilityPreview, finished and as a site). Parts that are 0 are left out. Memoised per ghost
// spot on the desirability field, as nicerFor is.
const lineMemo = new WeakMap();   // world -> { field, key, value }
export function monumentLine(world, type, x, y, rot = 0, style = null) {
  const field = desirabilityField(world);
  // "One of each kind counts" is true only once the standing one holds the kind's whole share (it is finished): while it is
  // unfinished, paused or at course 0, a second that gets further earns prestige up to the difference. Its state is in the key.
  const first = prestigeByKind(world)[type];
  const standing = first.id !== null ? world.buildings[first.id] : null;
  const held = Boolean(standing && standing.site && standing.site.done !== null);
  const key = `${type}|${x}|${y}|${rot}|${style}|${world.difficulty}|${world.nextId}|${held}`;
  const m = lineMemo.get(world);
  if (m && m.field === field && m.key === key) return m.value;
  const U = UI4_TEXT;
  const parts = [];
  if (held) parts.push(U.oneOfEach);
  parts.push(U.crewGold(workGoldPerUnit(world, style) * MONUMENT.unitsPerCrewMonth));   // Stage 4.6: a gilded site pays 10% more a crew
  const done = desirabilityPreview(world, type, x, y, { rot, style });
  if (done.better) parts.push(U.finishedNicer(done.better));
  const site = desirabilityPreview(world, type, x, y, { rot, site: true });
  if (site.worse) parts.push(U.whileBuilding(site.worse));
  const value = parts.join(' · ');
  lineMemo.set(world, { field, key, value });
  return value;
}

// The finished monument a ghost stands for: a building record of the contract's shape (a site with every course done), never in
// the world, so the live draw shows its final form.
function finishedGhost(tool, ghost, w, d) {
  const m = MONUMENTS[tool.type];
  const site = {
    course: m.courses.length, laid: { stone: 0, bricks: 0 }, stock: { stone: 0, bricks: 0 }, carry: 0, extraPaid: Boolean(m.extra), crews: [], idle: 0, reason: null,
    month: { units: 0, gold: 0, crews: 0, crewDays: 0, starvedDays: 0 }, last: null, starved: false, done: 0,
  };
  return { id: -1, type: tool.type, x: ghost.x, y: ghost.y, w, d, rot: rotOf(tool), staff: 0, paused: false, store: {}, site, style: styleOfTool(tool) };   // Stage 4.6: the silhouette wears the style picked
}

const AREA_SKIP_DRAWN = 600;

// Ghost shapes for drawGhost. Demolish marks only the tiles that have something on them.
export function ghostsFor(world, state, preview = toolPreview(world, state)) {
  const { tool } = state;
  if (!tool || !preview) return [];
  const visual = preview.state === 'idle' ? 'ok' : preview.state;
  if (tool.kind === 'building') {
    if (!state.ghost) return [];
    const { w, d } = footprintOf(tool);
    const shape = { x: state.ghost.x, y: state.ghost.y, w, d, state: visual, badge: true };   // a building's mark is a fixed-size badge (P13)
    // Where the footprint is part right, part wrong (the loam's edge), each tile shows its own state (P9).
    const foot = preview.footprint || [];
    if (foot.some((t) => t.state === 'cant') && foot.some((t) => t.state === 'met')) shape.tiles = foot;
    if (preview.joins && preview.joins.length) shape.joins = preview.joins;
    // Stage 4 (spec 6.5): a monument's ghost also shows the finished monument's silhouette at MONUMENT_PLACING.silhouetteAlpha,
    // so the player sees its eventual size (drawGhost draws it through render/monuments.js drawMonument).
    if (isMonumentType(tool.type)) shape.silhouette = { world, b: finishedGhost(tool, state.ghost, w, d) };
    return [shape];
  }
  if (tool.kind === 'demolish') {
    return preview.tiles
      .filter(([x, y]) => world.occ[y * world.size + x] || world.road[y * world.size + x] || world.wall[y * world.size + x])
      .map(([x, y]) => ({ x, y, w: 1, d: 1, state: 'demolish' }));
  }
  // Version 5.0 (Task 4): an area draws each building it would lay at its own size, and the tiles the ground refused as skipped (coral with a cross; the
  // first AREA_SKIP_DRAWN of them, the bar's words count them all).
  if (tool.kind === 'areas' && preview.boxes) {
    return [...preview.boxes.map((b) => ({ ...b, state: visual })), ...(preview.skipped || []).slice(0, AREA_SKIP_DRAWN).map(([x, y]) => ({ x, y, w: 1, d: 1, state: 'bad' }))];
  }
  // A touch plan's skipped tiles are coral with a cross (P5); the rest show the plan's state, a gate its own mark.
  const skipped = new Set((preview.skipped || []).map(tileKey));
  const gates = new Set(tool.kind === 'wall' || tool.kind === 'road' ? preview.gates || [] : []);
  return preview.tiles.map(([x, y]) => ({ x, y, w: 1, d: 1, state: skipped.has(tileKey([x, y])) ? 'bad' : gates.has(y * world.size + x) ? 'gate' : visual }));
}

// Stage 4.6 (ruling 331, 350): where Show me goes from a refused spot: a terrain or water building, the nearest origin where it fits on the
// whole map (nearestFit, the one search the pick and every Show me use) or null when none does; the road tool, the nearest crossing of the water
// (bridgeSpot) from the road's end. Returns { kind: 'building', item, x, y } with the footprint's centre, { kind: 'bridge', x, y } or null.
export function fitTarget(world, state) {
  const { tool } = state;
  if (!tool) return null;
  if (tool.kind === 'building') {
    const g = state.ghost || world.focus, def = BUILDINGS[tool.type];
    const at = nearestFit(world, tool, g.x, g.y, null, world.size);
    const rot = at.rot === undefined ? rotOf(tool) : at.rot;                  // ruling 424: the turn it fits in, which may not be the one in hand
    if (!canPlace(world, tool.type, at.x, at.y, { roadLater: true, rot, style: styleOfTool(tool) }).ok) return null;
    const { w, d } = dimsOf(tool.type, rot);
    return { kind: 'building', item: tool.type, x: at.x + w / 2, y: at.y + d / 2, def, rot };
  }
  if (tool.kind === 'road') {
    if (isRoute(tool) && state.line && state.line.x1 !== null) {                  // Version 5.0 (Task 5): a routed road's refusal shows what is in the way (too wide: where a bridge fits, below)
      const p = toolPreview(world, state);
      if (p.routed && p.state === 'bad' && p.reason !== 'too_wide' && p.at) return { kind: 'spot', x: p.at[0] + 0.5, y: p.at[1] + 0.5 };
    }
    const l = state.line, tiles = state.plan ? state.plan.tiles : [];
    const from = tiles.length ? { x: tiles[tiles.length - 1][0], y: tiles[tiles.length - 1][1] } : l ? { x: l.x0, y: l.y0 } : world.focus;
    const spot = bridgeSpot(world, from);
    return spot ? { kind: 'bridge', x: spot.x + 0.5, y: spot.y + 0.5, spot } : null;
  }
  return null;
}

export function createPlacement({ world, store, afterCommand = () => {}, effects = null, now = () => performance.now(), roadMode = null }) {
  // The stroke a finger is drawing: the plan before it (base), where it went down (x0, y0), the tiles it has followed (path, roads
  // and walls) and the tile it is on (at). Gone when the finger lifts, or with the tool.
  let stroke = null;
  const lastSpacing = {};   // Version 5.0 (Task 4): the spacing last chosen for a garden or statue area, by type
  let lastRoad = 'straight';   // Version 5.0 (Task 5): the road bar's shape when no settings hold it (a test's stand-in): 'straight' or 'route'
  const roadShape = () => (roadMode ? roadMode.get() : lastRoad);
  // Version 5.0 (Task 6): a routed road's end follows a drag, and each new end is a search (15-42 ms on a desktop, about four times that on a phone). So the end a drag
  // reaches is only noted (pendingEnd), and applied when a frame's time has passed since the last one and twice what that last one cost (a drag never gives the search more than
  // a third of the thread), at the next frame's settle() or on lift, always on the tile the finger lifts on. The line keeps its last end until then, so the preview is the
  // last route found.
  let pendingEnd = null, lastEndAt = -Infinity, endCost = 0;
  const applyEnd = (x, y) => {
    pendingEnd = null;
    const s = store.get();
    if (!s.line || (s.line.x1 === x && s.line.y1 === y)) return;
    const began = now();
    store.set({ line: { ...s.line, x1: x, y1: y } });    // the store's listeners ask for the preview here, and the search runs
    lastEndAt = now(); endCost = lastEndAt - began;
  };
  const settle = () => { if (pendingEnd && now() - lastEndAt >= Math.max(ROUTE_END_MS, 2 * endCost)) applyEnd(pendingEnd[0], pendingEnd[1]); };
  const followEnd = (x, y) => { pendingEnd = [x, y]; settle(); };
  const dropEnd = () => { pendingEnd = null; lastEndAt = -Infinity; };
  let lastStyle = null;   // Stage 4.6: the style the player last picked for a monument, which the next monument's tool starts on
  const inMap = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < world.size && y < world.size;
  const drawingTool = (s) => Boolean(s.tool) && s.tool.kind !== 'building';
  const setPlan = (tiles) => store.set({ plan: tiles.length ? { tiles } : null, line: null, area: null });
  const somethingAt = (x, y) => { const i = y * world.size + x; return Boolean(world.occ[i] || world.road[i] || world.wall[i]); };
  // The tiles of a stroke the plan takes: all of them, except that demolish takes only a tile with something on it, as a tap does.
  const marked = (tool, tiles) => (tool.kind === 'demolish' ? tiles.filter(([x, y]) => somethingAt(x, y)) : tiles);
  const api = {
    // Version 5.0 (Task 4, rulings 550-559): the area tool for a farm, garden or statue (tool { kind: 'areas', type, spacing }): dragged like plots, laid as one
    // undo step. The spacing is the last one chosen for the type (gardens and statues; a farm's is the building's own size). false for any other type.
    startArea(type) {
      if (!areaKindOf(type)) return false;
      stroke = null;
      store.set(startToolPatch(store.get(), { kind: 'areas', type, spacing: lastSpacing[type] || AREA_SPACING_DEFAULT }));
      if (AUTO_OVERLAY[type]) store.set({ overlay: AUTO_OVERLAY[type] });
      return true;
    },
    // The type an area could be laid of with the tool in hand (a farm, garden or statue tool, single or as an area), else null: the bar's Drag an area / Place one.
    areaType() {
      const t = store.get().tool;
      return t && (t.kind === 'areas' || t.kind === 'building') && areaKindOf(t.type) ? t.type : null;
    },
    setSpacing(gap) {
      const s = store.get();
      if (!s.tool || s.tool.kind !== 'areas' || areaKindOf(s.tool.type) !== 'spread' || !AREA_SPACINGS.includes(gap)) return false;
      lastSpacing[s.tool.type] = gap;
      store.set({ tool: { ...s.tool, spacing: gap } });
      return true;
    },
    // The spacing buttons for a garden or statue area ([{ gap, name, active, label }]), each label what that spacing would lay in the area drawn now (the
    // sim's count and price), or its rule while nothing is drawn; null for any other tool.
    spacingChoices() {
      const s = store.get(), t = s.tool;
      if (!t || t.kind !== 'areas' || areaKindOf(t.type) !== 'spread') return null;
      const a = s.area;
      const tiles = s.plan && s.plan.tiles.length ? s.plan.tiles : a && a.x1 !== null ? rectTiles(a.x0, a.y0, a.x1, a.y1, world.size) : null;
      return AREA_SPACINGS.map((gap) => ({ gap, name: SPACING_NAMES[gap], active: (t.spacing || AREA_SPACING_DEFAULT) === gap, label: AREA_TEXT.spacingLabel(gap, t.type, tiles ? areaPreviewOf(world, t.type, tiles, gap) : null) }));
    },
    start(tool, centre = null) {
      if (tool.kind === 'areas') { api.startArea(tool.type); if (tool.spacing) api.setSpacing(tool.spacing); return; }
      stroke = null; dropEnd();
      if (tool.kind === 'road' && !tool.gate && !tool.route && roadShape() === 'route') tool = { ...tool, route: true };   // Version 5.0 (Task 5): the road bar starts in the shape last chosen
      if (tool.kind === 'building' && BUILDINGS[tool.type].monument && !tool.style) tool = { ...tool, style: lastStyle || MONUMENT_STYLE_PICK_DEFAULT };
      // Stage 4 (spec 4.20, ruling 271): while a palace stands its card selects it (its sheet opens) instead of starting a tool.
      const palace = tool.kind === 'building' && tool.type === 'palace' ? palaceOf(world) : null;
      if (palace) { store.set(select(store.get(), palace.id)); return; }
      store.set(startToolPatch(store.get(), tool));
      if (tool.kind === 'building') {
        setPlacingRot(world, rotOf(tool));                                     // Stage 4: the Ground overlay's room follows the turn
        if (centre) {
          const at = nearestFit(world, tool, centre.x, centre.y, null, world.size);
          if (at.rot !== undefined && at.rot !== rotOf(tool)) { store.set({ tool: { ...store.get().tool, rot: at.rot } }); setPlacingRot(world, at.rot); }   // ruling 424: land turned to fit
          api.moveGhost(at.x, at.y);
        }   // Stage 4.6 (ruling 331): the whole map for the ground a building is bound to   // early-game pass 2.6
        if (AUTO_OVERLAY[tool.type]) store.set({ overlay: AUTO_OVERLAY[tool.type] });
      }
    },
    moveGhost(x, y) {
      const s = store.get();
      if (!s.tool || s.tool.kind !== 'building') return;
      store.set({ ghost: snapGhost(world, s.tool, x, y) });
    },
    // A tap on the map: moves the ghost, or sets the line/area start, then its end.
    pointAt(x, y) {
      const s = store.get();
      if (!s.tool) return;
      if (s.tool.kind === 'building') { api.moveGhost(x, y); return; }
      if (isLine(s.tool)) {
        dropEnd();
        const l = s.line;
        store.set({ line: !l || l.x1 !== null ? { x0: x, y0: y, x1: null, y1: null, flip: false } : { ...l, x1: x, y1: y }, plan: null });
        return;
      }
      const a = s.area;
      store.set({ area: !a || a.x1 !== null ? { x0: x, y0: y, x1: null, y1: null } : { ...a, x1: x, y1: y }, plan: null });
    },
    // A finger's or pen's tap in a drawing tool (P3): adds the tile to the plan, or takes it off if it is there. Demolish adds only
    // a tile with something on it, so the plan never holds a tile nothing marks.
    toggleTile(x, y) {
      const s = store.get();
      if (!drawingTool(s) || !inMap(x, y)) return;
      if (isRoute(s.tool)) { api.pointAt(x, y); return; }                    // Version 5.0 (Task 5): in Route a tap sets the start, then the end
      const tiles = s.plan ? s.plan.tiles : [];
      const has = tiles.some((t) => sameTile(t, [x, y]));
      if (!has && s.tool.kind === 'demolish' && !somethingAt(x, y)) return;
      setPlan(has ? tiles.filter((t) => !sameTile(t, [x, y])) : [...tiles, [x, y]]);
    },
    // A finger's or pen's drag in a drawing tool (P3): 'start' on the tile it went down on, 'move' and 'end' on the tile it is
    // on, 'cancel' when a second finger turned it into a pan (the stroke is taken back; the plan's earlier strokes stay).
    stroke(x, y, phase) {
      const s = store.get();
      if (!drawingTool(s)) { stroke = null; return; }
      if (isRoute(s.tool)) {                                                 // Version 5.0 (Task 5): in Route a finger's drag is a mouse's: down is the start, where it is now the end
        if (phase === 'start') { if (inMap(x, y)) { dropEnd(); stroke = { was: s.line }; store.set({ line: { x0: x, y0: y, x1: null, y1: null, flip: false }, plan: null }); } return; }
        if (!stroke) return;
        if (phase === 'cancel') { const { was } = stroke; stroke = null; dropEnd(); store.set({ line: was || null }); return; }
        if (phase === 'end') {                                               // Task 6: the lift settles the route, on the tile the finger lifts on
          stroke = null;
          if (inMap(x, y)) applyEnd(x, y); else if (pendingEnd) applyEnd(pendingEnd[0], pendingEnd[1]);
          return;
        }
        if (inMap(x, y) && s.line) followEnd(x, y);
        return;
      }
      if (phase === 'start') {
        if (!inMap(x, y)) return;
        stroke = { base: s.plan ? s.plan.tiles : [], x0: x, y0: y, path: [[x, y]], at: [x, y] };
        setPlan(joinTiles(stroke.base, marked(s.tool, stroke.path)));
        return;
      }
      if (!stroke) return;
      if (phase === 'cancel') { const { base } = stroke; stroke = null; setPlan(base); return; }
      if (inMap(x, y) && !sameTile(stroke.at, [x, y])) {
        if (isLine(s.tool)) followFinger(stroke, [x, y]);
        else { stroke.at = [x, y]; stroke.path = rectTiles(stroke.x0, stroke.y0, x, y, world.size); }
        setPlan(joinTiles(stroke.base, marked(s.tool, stroke.path)));
      }
      if (phase === 'end') stroke = null;
    },
    // A mouse drag: 'start' sets the start, 'move' and 'end' set the end.
    dragTo(x, y, phase) {
      const s = store.get();
      if (!s.tool || s.tool.kind === 'building') return;
      if (phase === 'start') { dropEnd(); store.set(isLine(s.tool) ? { line: { x0: x, y0: y, x1: null, y1: null, flip: false }, plan: null } : { area: { x0: x, y0: y, x1: null, y1: null }, plan: null }); return; }
      if (isRoute(s.tool) && s.line) { if (phase === 'end') applyEnd(x, y); else followEnd(x, y); }   // Version 5.0 (Task 6): the routed road's end is found once a frame, and on lift
      else if (isLine(s.tool) && s.line) store.set({ line: { ...s.line, x1: x, y1: y } });
      else if (!isLine(s.tool) && s.area) store.set({ area: { ...s.area, x1: x, y1: y } });
    },
    // Version 5.0 (Task 6): once a frame, the end a routed drag has reached since the last one (a frame's time and twice the last search's having passed). Nothing pending: nothing happens.
    settle,
    flip() { const s = store.get(); if (s.line) store.set({ line: { ...s.line, flip: !s.line.flip } }); },
    // Version 5.0 (Task 5, rulings 560-569): the road bar's Route / Straight toggle. routeMode() is 'route', 'straight', or null for any tool that is not the road (the
    // Gate card has no shapes). setRoute(on) switches the road in hand and remembers the choice (settings, per device); the two ends carry over (a Straight plan's first and last
    // tile become Route's start and end), so nothing already drawn is lost. false for any other tool.
    routeMode() {
      const t = store.get().tool;
      return t && t.kind === 'road' && !t.gate ? (t.route ? 'route' : 'straight') : null;
    },
    setRoute(on) {
      const s = store.get(), t = s.tool;
      if (!t || t.kind !== 'road' || t.gate) return false;
      on = Boolean(on);
      if (Boolean(t.route) === on) return true;
      stroke = null; dropEnd();
      lastRoad = on ? 'route' : 'straight';
      if (roadMode) roadMode.set(lastRoad);
      const { route, ...rest } = t;
      const tool = on ? { ...rest, route: true } : rest;
      const plan = s.plan && s.plan.tiles.length ? s.plan.tiles : null;
      if (on && plan) store.set({ tool, plan: null, line: { x0: plan[0][0], y0: plan[0][1], x1: plan.length > 1 ? plan[plan.length - 1][0] : null, y1: plan.length > 1 ? plan[plan.length - 1][1] : null, flip: false } });
      else store.set({ tool });
      return true;
    },
    // Stage 4 (Track C, spec 6.5, ruling 234): ⟳ and R turn a mastaba's ghost a quarter about its centre tile, swapping its
    // footprint (tool.rot 0 or 1); the Ground overlay's room is worked out again for the new turn. The camera does not move. Any
    // other tool, or a building that does not rotate, is left as it is (false).
    rotate() {
      const s = store.get();
      if (!s.tool || s.tool.kind !== 'building' || !BUILDINGS[s.tool.type].rotates) return false;
      const was = footprintOf(s.tool);
      const tool = { ...s.tool, rot: rotOf(s.tool) ? 0 : 1 };
      setPlacingRot(world, tool.rot);
      if (!s.ghost) { store.set({ tool }); return true; }
      const now = footprintOf(tool);
      const cx = s.ghost.x + Math.floor((was.w - 1) / 2), cy = s.ghost.y + Math.floor((was.d - 1) / 2);
      store.set({ tool, ghost: snapGhost(world, tool, cx - Math.floor((now.w - 1) / 2), cy - Math.floor((now.d - 1) / 2)) });
      return true;
    },
    // Stage 4.6 (Wonders track, ruling 343): the confirm bar's style picker for a monument. style() is the one in force (null for any other tool);
    // setStyle(id) takes one of the offered styles (MONUMENT_STYLES pick: true) and the silhouette, the price and the lines follow it.
    style: () => styleOfTool(store.get().tool),
    // The picker's choices ([{ id, name, active, line }], with the consequence of each in words) for a monument tool, else null.
    styleChoices() {
      const t = store.get().tool, style = styleOfTool(t);
      return style === null ? null : styleChoices(world, t.type, style);
    },
    setStyle(id) {
      const s = store.get();
      if (!s.tool || styleOfTool(s.tool) === null || !MONUMENT_STYLES[id] || !MONUMENT_STYLES[id].pick) return false;
      lastStyle = id;
      store.set({ tool: { ...s.tool, style: id } });
      return true;
    },
    preview: () => toolPreview(world, store.get()),
    ghosts: () => ghostsFor(world, store.get()),
    // The desirability tint under a building's ghost (spec 4.7): the tiles it would change, while it can go there and a
    // home or plot lies on them.
    tint() {
      const s = store.get();
      if (!s.tool || s.tool.kind !== 'building' || !s.ghost) return [];
      const p = toolPreview(world, s);
      if (p.state !== 'ok' && p.state !== 'warn') return [];
      const d = nicerFor(world, s.tool.type, s.ghost.x, s.ghost.y);
      return d.near ? d.tiles : [];
    },
    confirm() {
      const s = store.get();
      const p = toolPreview(world, s);
      if (!p || p.state === 'bad' || p.state === 'idle') return { ok: false, reason: p ? p.reason : 'nothing_to_place' };
      const t = s.tool;
      let result, text, cx, cy;
      if (s.plan && t.kind !== 'building') {
        // A touch plan lays what it can (P5): one command, one undo entry, for every stroke and tap since the tool started.
        const tiles = s.plan.tiles;
        result = t.kind === 'road' ? drawRoadTiles(world, tiles, { skipBlocked: true, ...roadOptions(t) })
          : t.kind === 'wall' ? drawWallTiles(world, tiles, { skipBlocked: true })
            : t.kind === 'houses' ? paintHouseTiles(world, tiles) : t.kind === 'plazas' ? paintPlazaTiles(world, tiles) : t.kind === 'areas' ? paintAreaTiles(world, t.type, tiles, { spacing: t.spacing }) : demolishTiles(world, tiles);
        const xs = tiles.map((q) => q[0]), ys = tiles.map((q) => q[1]);
        cx = (Math.min(...xs) + Math.max(...xs)) / 2 + 0.5; cy = (Math.min(...ys) + Math.max(...ys)) / 2 + 0.5;
        text = t.kind === 'road' ? roadDoneText(t, result) : t.kind === 'wall' ? T.wallBuilt : t.kind === 'houses' ? '' : t.kind === 'plazas' ? UI4_TEXT.plazasLaid(result.ok ? result.ids.length : 0) : t.kind === 'areas' ? AREA_TEXT.laid(t.type, result.ok ? result.ids.length : 0) : T.demolished;
      } else if (t.kind === 'building') {
        const def = footprintOf(t);
        result = place(world, t.type, s.ghost.x, s.ghost.y, { roadLater: true, rot: rotOf(t), style: styleOfTool(t) });   // only the player's placing waits for a road (P10)
        if (result.ok && t.copy) applySettings(world, result.id, t.copy);                                              // Version 5.0 (Task 4, ruling 505): Build another's settings, shown in the bar before the tick
        cx = s.ghost.x + def.w / 2; cy = s.ghost.y + def.d / 2;
        // Stage 4 (ruling 233): a monument is founded, "Small obelisk founded · Undo" ("· needs a road" with none).
        text = isMonumentType(t.type) ? UI4_TEXT.founded(t.type) : `${buildingName(t.type)} ${T.placed.toLowerCase()}`;
        if (result.ok && t.type !== 'house' && result.warnings.includes('needs_road')) text += ` · ${CONDITION_TEXT.placedNoRoad}`;
      } else if (isLine(t)) {
        result = isRoute(t) ? drawRoute(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1)                    // Version 5.0 (Task 5): the route the bar showed, laid as one command
          : t.kind === 'road' ? drawRoad(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip, roadOptions(t)) : drawWall(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip);
        cx = s.line.x1 + 0.5; cy = s.line.y1 + 0.5;
        text = isRoute(t) ? ROUTE_TEXT.laid(result) : t.kind === 'road' ? roadDoneText(t, result) : T.wallBuilt;
      } else {
        const a = s.area;
        result = t.kind === 'houses' ? paintHouses(world, a.x0, a.y0, a.x1, a.y1)
          : t.kind === 'plazas' ? paintPlazaTiles(world, rectTiles(a.x0, a.y0, a.x1, a.y1, world.size))
          : t.kind === 'areas' ? paintAreaTiles(world, t.type, rectTiles(a.x0, a.y0, a.x1, a.y1, world.size), { spacing: t.spacing }) : demolishArea(world, a.x0, a.y0, a.x1, a.y1);
        cx = (a.x0 + a.x1) / 2 + 0.5; cy = (a.y0 + a.y1) / 2 + 0.5;
        text = t.kind === 'houses' ? '' : t.kind === 'plazas' ? UI4_TEXT.plazasLaid(result.ok ? result.ids.length : 0) : t.kind === 'areas' ? AREA_TEXT.laid(t.type, result.ok ? result.ids.length : 0) : T.demolished;
      }
      if (!result.ok) return result;
      // Plots say how many were laid and, when a road is missing, that (placement review P14): counted after the paint, from the world.
      if (t.kind === 'houses') text = plotsPlacedText(result.ids.length, result.ids.filter((id) => !touchesRoad(world, world.buildings[id])).length);
      assignLabour(world);
      if (effects) {
        const at = now();
        effects.puff(cx, cy, at);
        if (t.kind === 'building') { const f = footprintOf(t); effects.rise(result.id, s.ghost.x, s.ghost.y, f.w, f.d, at); }   // the work-gang settle
      }
      if (s.plan) store.set({ plan: null });
      else if (isLine(t)) store.set({ line: null });
      else if (t.kind !== 'building') store.set({ area: null });
      afterCommand({ kind: t.kind, result, text, undoable: true });
      return result;
    },
    demolishOne(x, y) {
      const r = demolishAt(world, x, y);
      if (r.ok) { assignLabour(world); afterCommand({ kind: 'demolish', result: r, text: T.demolished, undoable: true }); }
      return r;
    },
    canUndo: () => world.undo.length > 0,
    // Undoing a paint after people moved in removes them (spec 6.5 allows it); ask first (1a follow-up).
    undoNeedsConfirm() {
      const e = world.undo[world.undo.length - 1];
      if (!e || e.kind !== 'place') return false;
      return e.ids.some((id) => { const b = world.buildings[id]; return Boolean(b && b.type === 'house' && b.residents > 0); });
    },
    // Stage 4 (ruling 236): undo refuses a site once work has begun on it and drops that step; the interfaces hear of it as an
    // 'undo_refused' command (the monuments interface names the site in a toast).
    undo() {
      const r = undoCommand(world);
      if (r.ok) { assignLabour(world); afterCommand({ kind: 'undo', result: r, text: T.undo, undoable: false }); }
      else if (r.reason === 'work_begun') afterCommand({ kind: 'undo_refused', result: r, undoable: false });
      return r;
    },
    cancel() { stroke = null; store.set(cancelTool(store.get())); },
  };
  return api;
}
