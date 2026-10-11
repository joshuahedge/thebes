// Tools and their previews (spec 6.5). The world changes only through src/sim/commands.js here, followed
// by assignLabour so derived state is fresh while paused (1a follow-up).
import { BUILDINGS } from '../data/buildings.js';
import {
  canPlace, place, previewRoad, drawRoad, roadPath, previewHouses, paintHouses, previewDemolishArea, demolishArea, demolishAt, rectTiles,
} from '../sim/commands.js';
import { undo as undoCommand } from '../sim/undo.js';
import { assignLabour } from '../sim/labour.js';
import { startTool as startToolPatch, cancelTool } from './modes.js';
import { AUTO_OVERLAY, NEAREST_FIT_RADIUS } from '../data/ui.js';
import { homesServedFrom } from '../sim/housing.js';
import { desirabilityField, desirabilityPreview } from '../sim/desirability.js';
import { costOf } from '../sim/costs.js';
import { refusingStores } from '../sim/production.js';
import { previewWall, drawWall } from '../sim/defence.js';
import { scoreLineFor } from './scoreUi.js';
import { buildingName, reasonText, warningText, effectText, plural, nicerText, T } from './text.js';

const footprintOf = (tool) => (tool.kind === 'building' ? { w: BUILDINGS[tool.type].w, d: BUILDINGS[tool.type].d } : { w: 1, d: 1 });

// Tools drawn as a line from a start to an end, in an L that can be flipped (spec 6.4 Drawing mode): roads and walls.
export const LINE_TOOLS = ['road', 'wall'];
const isLine = (tool) => Boolean(tool) && LINE_TOOLS.includes(tool.kind);

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

// Where a picked building's ghost lands (early-game pass 2.6): the nearest origin, in rings out to maxR
// tiles around the snapped point, where it can be placed. A clean fit anywhere in reach beats a fit with a
// warning; with no fit at all the snapped point stays, so the bar can say why. Line and area tools only snap.
export function nearestFit(world, tool, x, y, maxR = NEAREST_FIT_RADIUS) {
  const start = snapGhost(world, tool, x, y);
  if (!tool || tool.kind !== 'building') return start;
  let warned = null;
  for (let r = 0; r <= maxR; r++) {
    for (const [tx, ty] of ringTiles(start.x, start.y, r)) {
      const c = canPlace(world, tool.type, tx, ty);           // off-map origins fail here as out_of_bounds
      if (!c.ok) continue;
      if (!c.warnings.length) return { x: tx, y: ty };
      if (!warned) warned = { x: tx, y: ty };
    }
  }
  return warned || start;
}

const idle = (text, tiles = []) => ({ state: 'idle', reason: null, warnings: [], text, effect: '', cost: 0, count: 0, tiles, refund: 0 });
const bad = (reason, cost, count, tiles = []) => ({ state: 'bad', reason, warnings: [], text: reasonText(reason), effect: '', cost, count, tiles, refund: 0 });

// A ghost's first warning in words. A producer with no store in reach that takes its good names the store it needs; when a
// store there is built to hold the good but refuses it, the line says so, so the accept switch is not hidden.
function warningLine(world, type, x, y, code) {
  const def = BUILDINGS[type];
  const refused = code === 'no_storage' && refusingStores(world, { id: -1, x, y, w: def.w, d: def.d }, def.produces.good, def.producerReach).length > 0;
  return warningText(refused ? 'store_refuses' : code, type);
}

// What a ghost would do to the desirability around it (spec 4.7), memoised per ghost tile: desirabilityField is memoised
// on the city's buildings, so while it hands back the same field nothing has changed and the last answer stands. A ghost
// moved a tile asks once; a frame that only redraws asks nothing.
const nicerMemo = new WeakMap();   // world -> { field, type, x, y, value }
export function nicerFor(world, type, x, y) {
  const field = desirabilityField(world);
  const m = nicerMemo.get(world);
  if (m && m.field === field && m.type === type && m.x === x && m.y === y) return m.value;
  const value = desirabilityPreview(world, type, x, y);
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
    const r = canPlace(world, tool.type, x, y);
    if (!r.ok) return bad(r.reason, cost, 1);
    const warn = r.warnings.length > 0;
    // A service says how many homes it would reach from here (early-game pass 2.6); other buildings say nothing.
    const effect = def.reach ? effectText(tool.type, homesServedFrom(world, tool.type, x, y)) : '';
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningLine(world, tool.type, x, y, r.warnings[0]) : '', effect, cost, count: 1, tiles: [], refund: 0 };
  }
  if (isLine(tool)) {
    const l = state.line;
    if (!l) return idle(T.tapStart);
    if (l.x1 === null) return idle(T.tapEnd, [[l.x0, l.y0]]);
    const tiles = roadPath(l.x0, l.y0, l.x1, l.y1, l.flip);
    const r = (tool.kind === 'road' ? previewRoad : previewWall)(world, l.x0, l.y0, l.x1, l.y1, l.flip);
    if (!r.ok) return bad(r.reason, r.cost, r.tiles.length, tiles);
    if (!r.tiles.length) return bad('nothing_to_place', 0, 0, tiles);
    return { state: 'ok', reason: null, warnings: [], text: plural(r.tiles.length, 'tile', 'tiles'), effect: '', cost: r.cost, count: r.tiles.length, tiles, refund: 0 };
  }
  const a = state.area;
  if (!a) return idle(T.tapStart);
  if (a.x1 === null) return idle(T.tapCorner, [[a.x0, a.y0]]);
  if (tool.kind === 'houses') {
    const r = previewHouses(world, a.x0, a.y0, a.x1, a.y1);
    const tiles = r.positions.map(([x, y]) => [x, y]);
    if (!r.ok) return bad(r.reason, r.cost, r.positions.length, tiles);
    const warn = r.warnings.length > 0;
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningText(r.warnings[0]) : plural(r.positions.length, 'plot', 'plots'), effect: '', cost: r.cost, count: r.positions.length, tiles, refund: 0 };
  }
  const r = previewDemolishArea(world, a.x0, a.y0, a.x1, a.y1);
  const count = r.buildingIds.length + r.roadTiles.length + r.wallTiles.length;
  const tiles = rectTiles(a.x0, a.y0, a.x1, a.y1, world.size);
  if (!count) return bad('nothing_here', 0, 0, tiles);
  if (!r.ok) return bad(r.reason, -r.refund, count, tiles);                     // clearing rubble would cross the debt floor
  return { state: 'ok', reason: null, warnings: [], text: `${plural(count, 'item', 'items')} · ${T.refund} ${r.refund}`, effect: '', cost: -r.refund, count, tiles, refund: r.refund };
}

// The preview a tool shows. A building that can go where its ghost is also says what it would do to the homes around it
// (spec 4.7): nicer is "Makes 6 homes nicer" (or '') and nicerTone 'better', 'worse', 'mixed' or ''.
export function toolPreview(world, state) {
  const p = basePreview(world, state);
  if (!p) return p;
  p.nicer = '';
  p.nicerTone = '';
  p.score = '';                                         // Stage 3: the parts it would change, "+3 Culture" (scoreUi.js)
  if (state.tool.kind === 'building' && (p.state === 'ok' || p.state === 'warn')) {
    const d = nicerFor(world, state.tool.type, state.ghost.x, state.ghost.y);
    p.nicer = nicerText(d.better, d.worse);
    p.nicerTone = d.better && d.worse ? 'mixed' : d.better ? 'better' : d.worse ? 'worse' : '';
    p.score = scoreLineFor(world, state.tool.type, state.ghost.x, state.ghost.y);
  }
  return p;
}

// Ghost shapes for drawGhost. Demolish marks only the tiles that have something on them.
export function ghostsFor(world, state, preview = toolPreview(world, state)) {
  const { tool } = state;
  if (!tool || !preview) return [];
  const visual = preview.state === 'idle' ? 'ok' : preview.state;
  if (tool.kind === 'building') {
    if (!state.ghost) return [];
    const { w, d } = footprintOf(tool);
    return [{ x: state.ghost.x, y: state.ghost.y, w, d, state: visual }];
  }
  if (tool.kind === 'demolish') {
    return preview.tiles
      .filter(([x, y]) => world.occ[y * world.size + x] || world.road[y * world.size + x])
      .map(([x, y]) => ({ x, y, w: 1, d: 1, state: 'demolish' }));
  }
  return preview.tiles.map(([x, y]) => ({ x, y, w: 1, d: 1, state: visual }));
}

export function createPlacement({ world, store, afterCommand = () => {}, effects = null, now = () => performance.now() }) {
  const api = {
    start(tool, centre = null) {
      store.set(startToolPatch(store.get(), tool));
      if (tool.kind === 'building') {
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
        store.set({ line: !l || l.x1 !== null ? { x0: x, y0: y, x1: null, y1: null, flip: false } : { ...l, x1: x, y1: y } });
        return;
      }
      const a = s.area;
      store.set({ area: !a || a.x1 !== null ? { x0: x, y0: y, x1: null, y1: null } : { ...a, x1: x, y1: y } });
    },
    // A mouse drag: 'start' sets the start, 'move' and 'end' set the end.
    dragTo(x, y, phase) {
      const s = store.get();
      if (!s.tool || s.tool.kind === 'building') return;
      if (phase === 'start') { store.set(isLine(s.tool) ? { line: { x0: x, y0: y, x1: null, y1: null, flip: false } } : { area: { x0: x, y0: y, x1: null, y1: null } }); return; }
      if (isLine(s.tool) && s.line) store.set({ line: { ...s.line, x1: x, y1: y } });
      else if (!isLine(s.tool) && s.area) store.set({ area: { ...s.area, x1: x, y1: y } });
    },
    flip() { const s = store.get(); if (s.line) store.set({ line: { ...s.line, flip: !s.line.flip } }); },
    preview: () => toolPreview(world, store.get()),
    ghosts: () => ghostsFor(world, store.get()),
    // The desirability tint under a building's ghost (spec 4.7): the tiles it would change, while it can go there.
    tint() {
      const s = store.get();
      if (!s.tool || s.tool.kind !== 'building' || !s.ghost) return [];
      const p = toolPreview(world, s);
      return p.state === 'ok' || p.state === 'warn' ? nicerFor(world, s.tool.type, s.ghost.x, s.ghost.y).tiles : [];
    },
    confirm() {
      const s = store.get();
      const p = toolPreview(world, s);
      if (!p || p.state === 'bad' || p.state === 'idle') return { ok: false, reason: p ? p.reason : 'nothing_to_place' };
      const t = s.tool;
      let result, text, cx, cy;
      if (t.kind === 'building') {
        const def = BUILDINGS[t.type];
        result = place(world, t.type, s.ghost.x, s.ghost.y);
        cx = s.ghost.x + def.w / 2; cy = s.ghost.y + def.d / 2;
        text = `${buildingName(t.type)} ${T.placed.toLowerCase()}`;
      } else if (isLine(t)) {
        result = (t.kind === 'road' ? drawRoad : drawWall)(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip);
        cx = s.line.x1 + 0.5; cy = s.line.y1 + 0.5;
        text = t.kind === 'road' ? T.roadLaid : T.wallBuilt;
      } else {
        const a = s.area;
        result = t.kind === 'houses' ? paintHouses(world, a.x0, a.y0, a.x1, a.y1) : demolishArea(world, a.x0, a.y0, a.x1, a.y1);
        cx = (a.x0 + a.x1) / 2 + 0.5; cy = (a.y0 + a.y1) / 2 + 0.5;
        text = t.kind === 'houses' ? T.plotsPainted : T.demolished;
      }
      if (!result.ok) return result;
      assignLabour(world);
      if (effects) {
        const at = now();
        effects.puff(cx, cy, at);
        if (t.kind === 'building') effects.rise(result.id, s.ghost.x, s.ghost.y, BUILDINGS[t.type].w, BUILDINGS[t.type].d, at);   // the work-gang settle
      }
      if (isLine(t)) store.set({ line: null });
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
    undo() {
      const r = undoCommand(world);
      if (r.ok) { assignLabour(world); afterCommand({ kind: 'undo', result: r, text: T.undo, undoable: false }); }
      return r;
    },
    cancel() { store.set(cancelTool(store.get())); },
  };
  return api;
}
