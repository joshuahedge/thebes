// Tools and their previews (spec 6.5). The world changes only through src/sim/commands.js here, followed
// by assignLabour so derived state is fresh while paused (1a follow-up).
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { MONUMENTS, MONUMENT, MONUMENT_PLACING } from '../data/monuments.js';
import {
  canPlace, conditionsFor, place, previewRoad, drawRoad, roadPath, previewHouses, paintHouses, previewDemolishArea, demolishArea, demolishAt, rectTiles,
  previewRoadTiles, drawRoadTiles, previewHouseTiles, paintHouseTiles, previewDemolishTiles, demolishTiles, previewPlazaTiles, paintPlazaTiles,
} from '../sim/commands.js';
import { undo as undoCommand } from '../sim/undo.js';
import { assignLabour } from '../sim/labour.js';
import { startTool as startToolPatch, cancelTool, select } from './modes.js';
import { palaceOf } from '../sim/palace.js';
import { AUTO_OVERLAY, NEAREST_FIT_RADIUS } from '../data/ui.js';
import { homesServedFrom } from '../sim/housing.js';
import { desirabilityField, desirabilityPreview } from '../sim/desirability.js';
import { housesOf } from '../sim/world.js';
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
import { buildingName, reasonText, warningText, effectText, plural, nicerText, conditionText, plotsPlacedText, CONDITION_MARKS, CONDITION_STATE_WORDS, CONDITION_TEXT, DRAW_TEXT, T, DANGER_UI_TEXT, UI4_TEXT, ui4ConditionText, S45_TEXT } from './text.js';

// A building tool's footprint in its rotation (Stage 4: tool.rot 1 turns a mastaba a quarter, dimsOf; ruling 234).
const footprintOf = (tool) => (tool.kind === 'building' ? dimsOf(tool.type, tool.rot || 0) : { w: 1, d: 1 });
const rotOf = (tool) => (tool && tool.rot) || 0;
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
export function nearestFit(world, tool, x, y, maxR = null) {
  const start = snapGhost(world, tool, x, y);
  if (!tool || tool.kind !== 'building') return start;
  if (maxR === null) maxR = fitRadiusOf(tool.type);
  const rot = rotOf(tool);
  let warned = null;
  const scan = (from, to) => {
    for (let r = from; r <= to; r++) {
      for (const [tx, ty] of ringTiles(start.x, start.y, r)) {
        const c = canPlace(world, tool.type, tx, ty, { roadLater: true, rot });   // off-map origins fail here as out_of_bounds
        if (!c.ok) continue;
        if (!c.warnings.length) return { x: tx, y: ty };
        if (!warned || c.warnings.length < warned.n) warned = { x: tx, y: ty, n: c.warnings.length };
      }
    }
    return null;
  };
  const clean = scan(0, maxR);
  if (clean) return clean;
  if (!warned && BUILDINGS[tool.type].terrain) { const far = scan(maxR + 1, maxR * 3); if (far) return far; }
  return warned ? { x: warned.x, y: warned.y } : start;
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

function basePreview(world, state) {
  const { tool } = state;
  if (!tool) return null;
  if (tool.kind === 'building') {
    const def = BUILDINGS[tool.type];
    if (!state.ghost) return idle('');
    const { x, y } = state.ghost;
    const cost = costOf(world, tool.type);
    // Every condition on its own (P9); a building that lacks only a road can still be placed, in amber (P10).
    const c = conditionsFor(world, tool.type, x, y, { roadLater: true, rot: rotOf(tool) });
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
    if (!c.ok) return { ...bad(c.reason, cost, 1), ...extra };
    const warn = c.warnings.length > 0;
    // A service says how many homes it would reach from here (early-game pass 2.6); a firehouse, how many buildings that
    // can burn (Stage 3); other buildings say nothing.
    const effect = tool.type === 'firehouse' ? DANGER_UI_TEXT.firehouseCovers(firehouseReachFrom(world, x, y))
      : def.reach ? effectText(tool.type, homesServedFrom(world, tool.type, x, y)) : '';
    const text = !warn ? '' : c.warnings[0] === 'needs_road' && joins.length ? CONDITION_TEXT.roadHint : warningLine(world, tool.type, x, y, c.warnings[0]);
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: c.warnings, text, effect, cost, count: 1, tiles: [], refund: 0, ...extra };
  }
  if (state.plan && state.plan.tiles.length) return planPreview(world, tool, state.plan.tiles);
  // Before anything is drawn the first line says how: a finger or pen drags or taps tiles; a mouse clicks a start and an end.
  const touch = state.inputType === 'touch' || state.inputType === 'pen';
  if (isLine(tool)) {
    const l = state.line;
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
  return demolishPreview(previewDemolishArea(world, a.x0, a.y0, a.x1, a.y1), rectTiles(a.x0, a.y0, a.x1, a.y1, world.size));
}

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
  return demolishPreview(previewDemolishTiles(world, tiles), tiles);
}

// Stage 4 (ruling 250): the plaza tool's preview, a rectangle's or a plan's (tiles: the plan's, else the plazas'). Track C
// words it fully; the contract counts them like plots.
function plazaPreview(r, tiles = r.positions) {
  if (!r.ok) return bad(r.reason, r.cost, r.positions.length, tiles);
  return { state: 'ok', reason: null, warnings: [], text: plural(r.positions.length, 'plaza', 'plazas'), effect: '', cost: r.cost, count: r.positions.length, tiles, refund: 0 };
}

// Demolish's preview, a rectangle's or a plan's: what it would take up, and its refund (or, Stage 3, what clearing rubble costs).
function demolishPreview(r, tiles) {
  const count = r.buildingIds.length + r.roadTiles.length + r.wallTiles.length;
  if (!count) return bad('nothing_here', 0, 0, tiles);
  // Clearing rubble would cross the debt floor (Stage 3, spec 4.12): the bar says so in the rule's words.
  if (!r.ok) return bad(r.reason, -r.refund, count, tiles, DANGER_UI_TEXT.wouldPassDebt(-ECONOMY.debtFloor));
  // Rubble is cleared, not refunded: "Clear 4 rubble: 20 gold", beside the other items when there are any.
  const others = count - r.rubble;
  const text = r.rubble
    ? [others ? plural(others, 'item', 'items') : '', DANGER_UI_TEXT.clearRubble(r.rubble, r.clearCost)].filter(Boolean).join(' · ')
    : `${plural(count, 'item', 'items')} · ${T.refund} ${r.refund}`;
  return { state: 'ok', reason: null, warnings: [], text, effect: '', cost: -r.refund, count, tiles, refund: r.refund };
}

// The preview a tool shows. A building that can go where its ghost is also says what it would do to the homes around it
// (spec 4.7): nicer is "Makes 6 homes nicer" (or '') and nicerTone 'better', 'worse', 'mixed' or ''.
export function toolPreview(world, state) {
  const p = basePreview(world, state);
  if (!p) return p;
  p.nicer = '';
  p.nicerTone = '';
  p.score = '';                                         // Stage 3: the parts it would change, "+3 Culture" (scoreUi.js)
  p.line = '';                                          // Stage 4: a monument's line, the score's part first (monumentLine)
  p.upkeep = '';                                        // Stage 4.5 (Task 4b): "Costs 46 a month · 10 workers" and "Monthly balance becomes -89"
  p.balance = '';
  p.balanceNet = 0;
  if (state.tool.kind === 'building' && isMonumentType(state.tool.type) && (p.state === 'ok' || p.state === 'warn')) {
    p.score = scoreLineFor(world, state.tool.type, state.ghost.x, state.ghost.y);
    p.line = [p.score, monumentLine(world, state.tool.type, state.ghost.x, state.ghost.y, rotOf(state.tool))].filter(Boolean).join(' · ');
  } else if (state.tool.kind === 'building' && (p.state === 'ok' || p.state === 'warn')) {
    const d = nicerFor(world, state.tool.type, state.ghost.x, state.ghost.y);
    p.nicer = nicerText(d.better, d.worse);
    p.nicerTone = d.better && d.worse ? 'mixed' : d.better ? 'better' : d.worse ? 'worse' : '';
    p.score = scoreLineFor(world, state.tool.type, state.ghost.x, state.ghost.y);
  }
  if (state.tool.kind === 'building' && p.state !== 'idle') {
    const bill = monthlyBill(state.tool.type);
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
export function monumentLine(world, type, x, y, rot = 0) {
  const field = desirabilityField(world);
  // "One of each kind counts" is true only once the standing one holds the kind's whole share (it is finished): while it is
  // unfinished, paused or at course 0, a second that gets further earns prestige up to the difference. Its state is in the key.
  const first = prestigeByKind(world)[type];
  const standing = first.id !== null ? world.buildings[first.id] : null;
  const held = Boolean(standing && standing.site && standing.site.done !== null);
  const key = `${type}|${x}|${y}|${rot}|${world.difficulty}|${world.nextId}|${held}`;
  const m = lineMemo.get(world);
  if (m && m.field === field && m.key === key) return m.value;
  const U = UI4_TEXT;
  const parts = [];
  if (held) parts.push(U.oneOfEach);
  parts.push(U.crewGold(workGoldPerUnit(world) * MONUMENT.unitsPerCrewMonth));
  const done = desirabilityPreview(world, type, x, y, { rot });
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
  return { id: -1, type: tool.type, x: ghost.x, y: ghost.y, w, d, rot: rotOf(tool), staff: 0, paused: false, store: {}, site };
}

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
  // A touch plan's skipped tiles are coral with a cross (P5); the rest show the plan's state, a gate its own mark.
  const skipped = new Set((preview.skipped || []).map(tileKey));
  const gates = new Set(tool.kind === 'wall' || tool.kind === 'road' ? preview.gates || [] : []);
  return preview.tiles.map(([x, y]) => ({ x, y, w: 1, d: 1, state: skipped.has(tileKey([x, y])) ? 'bad' : gates.has(y * world.size + x) ? 'gate' : visual }));
}

export function createPlacement({ world, store, afterCommand = () => {}, effects = null, now = () => performance.now() }) {
  // The stroke a finger is drawing: the plan before it (base), where it went down (x0, y0), the tiles it has followed (path, roads
  // and walls) and the tile it is on (at). Gone when the finger lifts, or with the tool.
  let stroke = null;
  const inMap = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < world.size && y < world.size;
  const drawingTool = (s) => Boolean(s.tool) && s.tool.kind !== 'building';
  const setPlan = (tiles) => store.set({ plan: tiles.length ? { tiles } : null, line: null, area: null });
  const somethingAt = (x, y) => { const i = y * world.size + x; return Boolean(world.occ[i] || world.road[i] || world.wall[i]); };
  // The tiles of a stroke the plan takes: all of them, except that demolish takes only a tile with something on it, as a tap does.
  const marked = (tool, tiles) => (tool.kind === 'demolish' ? tiles.filter(([x, y]) => somethingAt(x, y)) : tiles);
  const api = {
    start(tool, centre = null) {
      stroke = null;
      // Stage 4 (spec 4.20, ruling 271): while a palace stands its card selects it (its sheet opens) instead of starting a tool.
      const palace = tool.kind === 'building' && tool.type === 'palace' ? palaceOf(world) : null;
      if (palace) { store.set(select(store.get(), palace.id)); return; }
      store.set(startToolPatch(store.get(), tool));
      if (tool.kind === 'building') {
        setPlacingRot(world, rotOf(tool));                                     // Stage 4: the Ground overlay's room follows the turn
        if (centre) { const at = nearestFit(world, tool, centre.x, centre.y); api.moveGhost(at.x, at.y); }   // early-game pass 2.6
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
      if (phase === 'start') { store.set(isLine(s.tool) ? { line: { x0: x, y0: y, x1: null, y1: null, flip: false }, plan: null } : { area: { x0: x, y0: y, x1: null, y1: null }, plan: null }); return; }
      if (isLine(s.tool) && s.line) store.set({ line: { ...s.line, x1: x, y1: y } });
      else if (!isLine(s.tool) && s.area) store.set({ area: { ...s.area, x1: x, y1: y } });
    },
    flip() { const s = store.get(); if (s.line) store.set({ line: { ...s.line, flip: !s.line.flip } }); },
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
            : t.kind === 'houses' ? paintHouseTiles(world, tiles) : t.kind === 'plazas' ? paintPlazaTiles(world, tiles) : demolishTiles(world, tiles);
        const xs = tiles.map((q) => q[0]), ys = tiles.map((q) => q[1]);
        cx = (Math.min(...xs) + Math.max(...xs)) / 2 + 0.5; cy = (Math.min(...ys) + Math.max(...ys)) / 2 + 0.5;
        text = t.kind === 'road' ? roadDoneText(t, result) : t.kind === 'wall' ? T.wallBuilt : t.kind === 'houses' ? '' : t.kind === 'plazas' ? UI4_TEXT.plazasLaid(result.ok ? result.ids.length : 0) : T.demolished;
      } else if (t.kind === 'building') {
        const def = footprintOf(t);
        result = place(world, t.type, s.ghost.x, s.ghost.y, { roadLater: true, rot: rotOf(t) });   // only the player's placing waits for a road (P10)
        cx = s.ghost.x + def.w / 2; cy = s.ghost.y + def.d / 2;
        // Stage 4 (ruling 233): a monument is founded, "Small obelisk founded · Undo" ("· needs a road" with none).
        text = isMonumentType(t.type) ? UI4_TEXT.founded(t.type) : `${buildingName(t.type)} ${T.placed.toLowerCase()}`;
        if (result.ok && t.type !== 'house' && result.warnings.includes('needs_road')) text += ` · ${CONDITION_TEXT.placedNoRoad}`;
      } else if (isLine(t)) {
        result = t.kind === 'road' ? drawRoad(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip, roadOptions(t)) : drawWall(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip);
        cx = s.line.x1 + 0.5; cy = s.line.y1 + 0.5;
        text = t.kind === 'road' ? roadDoneText(t, result) : T.wallBuilt;
      } else {
        const a = s.area;
        result = t.kind === 'houses' ? paintHouses(world, a.x0, a.y0, a.x1, a.y1)
          : t.kind === 'plazas' ? paintPlazaTiles(world, rectTiles(a.x0, a.y0, a.x1, a.y1, world.size)) : demolishArea(world, a.x0, a.y0, a.x1, a.y1);
        cx = (a.x0 + a.x1) / 2 + 0.5; cy = (a.y0 + a.y1) / 2 + 0.5;
        text = t.kind === 'houses' ? '' : t.kind === 'plazas' ? UI4_TEXT.plazasLaid(result.ok ? result.ids.length : 0) : T.demolished;
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
