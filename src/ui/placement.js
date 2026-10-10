// Tools and their previews (spec 6.5). The world changes only through src/sim/commands.js here, followed
// by assignLabour so derived state is fresh while paused (1a follow-up).
import { BUILDINGS } from '../data/buildings.js';
import {
  canPlace, place, previewRoad, drawRoad, roadPath, previewHouses, paintHouses, previewDemolishArea, demolishArea, demolishAt, rectTiles,
} from '../sim/commands.js';
import { undo as undoCommand } from '../sim/undo.js';
import { assignLabour } from '../sim/labour.js';
import { startTool as startToolPatch, cancelTool } from './modes.js';
import { AUTO_OVERLAY } from '../data/ui.js';
import { buildingName, reasonText, warningText, plural, T } from './text.js';

const footprintOf = (tool) => (tool.kind === 'building' ? { w: BUILDINGS[tool.type].w, d: BUILDINGS[tool.type].d } : { w: 1, d: 1 });

export function snapGhost(world, tool, x, y) {
  const { w, d } = footprintOf(tool);
  return { x: Math.max(0, Math.min(world.size - w, Math.round(x))), y: Math.max(0, Math.min(world.size - d, Math.round(y))) };
}

const idle = (text, tiles = []) => ({ state: 'idle', reason: null, warnings: [], text, cost: 0, count: 0, tiles, refund: 0 });
const bad = (reason, cost, count, tiles = []) => ({ state: 'bad', reason, warnings: [], text: reasonText(reason), cost, count, tiles, refund: 0 });

export function toolPreview(world, state) {
  const { tool } = state;
  if (!tool) return null;
  if (tool.kind === 'building') {
    const def = BUILDINGS[tool.type];
    if (!state.ghost) return idle('');
    const r = canPlace(world, tool.type, state.ghost.x, state.ghost.y);
    if (!r.ok) return bad(r.reason, def.cost, 1);
    const warn = r.warnings.length > 0;
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningText(r.warnings[0]) : '', cost: def.cost, count: 1, tiles: [], refund: 0 };
  }
  if (tool.kind === 'road') {
    const l = state.line;
    if (!l) return idle(T.tapStart);
    if (l.x1 === null) return idle(T.tapEnd, [[l.x0, l.y0]]);
    const tiles = roadPath(l.x0, l.y0, l.x1, l.y1, l.flip);
    const r = previewRoad(world, l.x0, l.y0, l.x1, l.y1, l.flip);
    if (!r.ok) return bad(r.reason, r.cost, r.tiles.length, tiles);
    if (!r.tiles.length) return bad('nothing_to_place', 0, 0, tiles);
    return { state: 'ok', reason: null, warnings: [], text: plural(r.tiles.length, 'tile', 'tiles'), cost: r.cost, count: r.tiles.length, tiles, refund: 0 };
  }
  const a = state.area;
  if (!a) return idle(T.tapStart);
  if (a.x1 === null) return idle(T.tapCorner, [[a.x0, a.y0]]);
  if (tool.kind === 'houses') {
    const r = previewHouses(world, a.x0, a.y0, a.x1, a.y1);
    const tiles = r.positions.map(([x, y]) => [x, y]);
    if (!r.ok) return bad(r.reason, r.cost, r.positions.length, tiles);
    const warn = r.warnings.length > 0;
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningText(r.warnings[0]) : plural(r.positions.length, 'plot', 'plots'), cost: r.cost, count: r.positions.length, tiles, refund: 0 };
  }
  const r = previewDemolishArea(world, a.x0, a.y0, a.x1, a.y1);
  const count = r.buildingIds.length + r.roadTiles.length;
  const tiles = rectTiles(a.x0, a.y0, a.x1, a.y1, world.size);
  if (!count) return bad('nothing_here', 0, 0, tiles);
  return { state: 'ok', reason: null, warnings: [], text: `${plural(count, 'item', 'items')} · ${T.refund} ${r.refund}`, cost: -r.refund, count, tiles, refund: r.refund };
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
        if (centre) api.moveGhost(centre.x, centre.y);
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
      if (s.tool.kind === 'road') {
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
      if (phase === 'start') { store.set(s.tool.kind === 'road' ? { line: { x0: x, y0: y, x1: null, y1: null, flip: false } } : { area: { x0: x, y0: y, x1: null, y1: null } }); return; }
      if (s.tool.kind === 'road' && s.line) store.set({ line: { ...s.line, x1: x, y1: y } });
      else if (s.tool.kind !== 'road' && s.area) store.set({ area: { ...s.area, x1: x, y1: y } });
    },
    flip() { const s = store.get(); if (s.line) store.set({ line: { ...s.line, flip: !s.line.flip } }); },
    preview: () => toolPreview(world, store.get()),
    ghosts: () => ghostsFor(world, store.get()),
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
      } else if (t.kind === 'road') {
        result = drawRoad(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip);
        cx = s.line.x1 + 0.5; cy = s.line.y1 + 0.5;
        text = T.roadLaid;
      } else {
        const a = s.area;
        result = t.kind === 'houses' ? paintHouses(world, a.x0, a.y0, a.x1, a.y1) : demolishArea(world, a.x0, a.y0, a.x1, a.y1);
        cx = (a.x0 + a.x1) / 2 + 0.5; cy = (a.y0 + a.y1) / 2 + 0.5;
        text = t.kind === 'houses' ? T.plotsPainted : T.demolished;
      }
      if (!result.ok) return result;
      assignLabour(world);
      if (effects) effects.puff(cx, cy, now());
      if (t.kind === 'road') store.set({ line: null });
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
