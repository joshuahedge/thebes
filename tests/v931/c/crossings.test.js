// Version 9.3.1 Group C (rulings 2035-2039): a crossing is drawn as one straight run. A road drag (Straight) whose path would cross water is laid straight
// along the way it went furthest, so a slightly diagonal drag over a narrow river lays a bridge and over a wide one a ferry; the Crossing card lays exactly
// the line dragged (never moved to another crossing; refused where it cannot be laid, with Show me); a road that meets no water keeps its L; a tap still picks.
import { describe, it, expect } from '../../harness.js';
import { ferryWorld, RIVER_X, ROW } from '../../v71/f/helpers.js';
import { addRaw } from '../../helpers/testWorld.js';
import { createPlacement, toolPreview, ghostsFor, lineOf } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { CROSSING_TEXT, FERRY_TEXT, V71_HELP } from '../../../src/ui/v71/ferryText.js';
import { previewCrossing } from '../../../src/sim/ferryFind.js';
import { landingsOf } from '../../../src/sim/ferries.js';
import { roadPath } from '../../../src/sim/commands.js';
import { idx } from '../../../src/sim/grid.js';

const rig = (world, tool) => {
  const store = createStore({ ...INITIAL_UI_STATE, inputType: 'touch' });
  const pl = createPlacement({ world, store });
  pl.start(tool, { x: RIVER_X, y: ROW });
  return { store, pl };
};
// A finger's drag from (x0, y0) to (x1, y1) that drifts sideways: one 'move' a tile along x, y following the slope (a phone drag at 390x844 is a few such moves).
function drift(pl, x0, y0, x1, y1) {
  pl.stroke(x0, y0, 'start');
  for (let k = 1; k <= x1 - x0; k++) pl.stroke(x0 + k, y0 + Math.round(((y1 - y0) * k) / (x1 - x0)), 'move');
  pl.stroke(x1, y1, 'end');
}
const rows = (tiles) => [...new Set(tiles.map((t) => t[1]))];
const roadAt = (w, x, y) => Boolean(w.road[idx(w.size, x, y)]);

describe('v931 c road: a drag across water runs straight along the way it went furthest', () => {
  it('a slightly diagonal drag across a 3-tile river lays a bridge on that row, banks where the line meets dry land', () => {
    const w = ferryWorld(3);
    const { store, pl } = rig(w, { kind: 'road' });
    drift(pl, RIVER_X - 2, ROW, RIVER_X + 4, ROW + 2);
    const s = store.get();
    expect(rows(s.plan.tiles)).toEqual([ROW]);
    expect(s.plan.tiles).toEqual(roadPath(RIVER_X - 2, ROW, RIVER_X + 4, ROW));
    const p = toolPreview(w, s);
    expect([p.state, p.text.startsWith(CROSSING_TEXT.bridge(3))]).toEqual(['ok', true]);
    expect(ghostsFor(w, s).filter((q) => q.x >= RIVER_X && q.x < RIVER_X + 3).map((q) => q.state)).toEqual(['bridge', 'bridge', 'bridge']);
    expect(pl.confirm().ok).toBe(true);
    expect([RIVER_X - 1, RIVER_X, RIVER_X + 1, RIVER_X + 2, RIVER_X + 3].map((x) => roadAt(w, x, ROW))).toEqual([true, true, true, true, true]);
    expect(roadAt(w, RIVER_X + 4, ROW + 2)).toBe(false);
  });

  it('a 7-tile river: the same drift lays a ferry, its landings on the drag\'s row at the first dry tile each side', () => {
    const w = ferryWorld(7);
    const { store, pl } = rig(w, { kind: 'road' });
    drift(pl, RIVER_X - 2, ROW, RIVER_X + 8, ROW + 3);
    expect(rows(store.get().plan.tiles)).toEqual([ROW]);
    const p = toolPreview(w, store.get());
    expect([p.state, p.ferries.length, p.text.startsWith(CROSSING_TEXT.ferry(7))]).toEqual(['ok', 1, true]);
    expect(pl.confirm().ok).toBe(true);
    expect(landingsOf(w).map((l) => [l.x, l.y])).toEqual([[RIVER_X - 1, ROW], [RIVER_X + 7, ROW]]);
  });

  it('a mouse\'s two ends across water: one straight run from the first, not the L (and the road lays it)', () => {
    const w = ferryWorld(3);
    const tool = { kind: 'road' };
    const l = { x0: RIVER_X - 2, y0: ROW, x1: RIVER_X + 4, y1: ROW + 2, flip: false };
    expect(lineOf(w, tool, l)).toEqual({ ...l, x1: RIVER_X + 4, y1: ROW });
    const store = createStore({ ...INITIAL_UI_STATE, mode: 'drawing', tool, line: l });
    const p = toolPreview(w, store.get());
    expect([p.state, rows(p.tiles), p.bridges.length]).toEqual(['ok', [ROW], 3]);
    // Route mode is not straightened (it finds its own way); the Gate card is not a crossing
    expect(lineOf(w, { kind: 'road', route: true }, l)).toBe(l);
    expect(lineOf(w, { kind: 'road', gate: true }, l)).toBe(l);
  });
});

describe('v931 c road: a drag that meets no water keeps its L', () => {
  it('a finger\'s L on dry land stays an L, and a mouse\'s L too', () => {
    const w = ferryWorld(7);
    const { store, pl } = rig(w, { kind: 'road' });
    pl.stroke(3, 3, 'start');
    for (let x = 4; x <= 8; x++) pl.stroke(x, 3, 'move');
    for (let y = 4; y <= 6; y++) pl.stroke(8, y, 'move');
    pl.stroke(8, 6, 'end');
    expect(store.get().plan.tiles).toEqual(roadPath(3, 3, 8, 6));
    expect(rows(store.get().plan.tiles).length).toBe(4);
    const l = { x0: 3, y0: 3, x1: 8, y1: 6, flip: true };
    expect(lineOf(w, { kind: 'road' }, l)).toBe(l);
    const p = toolPreview(w, createStore({ ...INITIAL_UI_STATE, mode: 'drawing', tool: { kind: 'road' }, line: l }).get());
    expect([p.state, p.tiles]).toEqual(['ok', roadPath(3, 3, 8, 6, true)]);
    // a road over a bridge already standing is no water to straighten
    const b = ferryWorld(3);
    for (let x = RIVER_X; x < RIVER_X + 3; x++) b.road[idx(b.size, x, ROW)] = 1;
    const over = { x0: RIVER_X - 2, y0: ROW, x1: RIVER_X + 4, y1: ROW + 2, flip: false };
    expect(lineOf(b, { kind: 'road' }, over)).toBe(over);
  });
});

describe('v931 c crossing: the Crossing card lays the line dragged, never another', () => {
  it('a drifting drag lays the crossing on its own row (a bridge over 3, a ferry over 7)', () => {
    for (const [width, kind] of [[3, 'bridge'], [7, 'ferry']]) {
      const w = ferryWorld(width);
      const { store, pl } = rig(w, { kind: 'ferry' });
      drift(pl, RIVER_X - 1, ROW + 2, RIVER_X + width + 1, ROW + 4);
      expect(rows(store.get().plan.tiles)).toEqual([ROW + 2]);
      const p = toolPreview(w, store.get());
      expect([width, p.state, p.kind, p.ends]).toEqual([width, 'ok', kind, [[RIVER_X - 1, ROW + 2], [RIVER_X + width, ROW + 2]]]);
      expect(pl.confirm().ok).toBe(true);
      if (kind === 'ferry') expect(landingsOf(w).map((l) => [l.x, l.y])).toEqual([[RIVER_X - 1, ROW + 2], [RIVER_X + 7, ROW + 2]]);
      else expect([RIVER_X, RIVER_X + 1, RIVER_X + 2].map((x) => roadAt(w, x, ROW + 2))).toEqual([true, true, true]);
    }
  });

  it('where the dragged line cannot land it is refused, with Show me, and nothing is laid: it is not moved to the next row (ruling 1347 snapped it)', () => {
    const w = ferryWorld(7);
    addRaw(w, 'well', RIVER_X + 7, ROW);                                   // the far bank's tile on the dragged row is built on
    const line = roadPath(RIVER_X - 2, ROW, RIVER_X + 8, ROW);
    expect(previewCrossing(w, line).snapped).toBe(true);                   // the sim's default still snaps (drawFerry and older callers unchanged)
    const { store, pl } = rig(w, { kind: 'ferry' });
    pl.stroke(RIVER_X - 2, ROW, 'start');
    for (let x = RIVER_X - 1; x <= RIVER_X + 8; x++) pl.stroke(x, ROW, 'move');
    pl.stroke(RIVER_X + 8, ROW, 'end');
    const p = toolPreview(w, store.get());
    expect([p.state, p.reason, p.text, p.showFit]).toEqual(['bad', 'ferry_no_land', FERRY_TEXT.refusal({ reason: 'ferry_no_land' }), true]);
    expect(ghostsFor(w, store.get()).every((q) => q.state === 'bad' && q.y === ROW)).toBe(true);
    expect(pl.confirm().ok).toBe(false);
    expect(landingsOf(w).length).toBe(0);
  });

  it('a new drag replaces the last line; a tap with no drag still picks the nearest crossing shown', () => {
    const w = ferryWorld(7);
    const { store, pl } = rig(w, { kind: 'ferry' });
    drift(pl, RIVER_X - 1, ROW + 2, RIVER_X + 8, ROW + 2);
    drift(pl, RIVER_X - 1, ROW + 5, RIVER_X + 8, ROW + 6);
    expect(rows(store.get().plan.tiles)).toEqual([ROW + 5]);
    pl.cancel();
    pl.start({ kind: 'ferry' }, { x: RIVER_X, y: ROW });
    const shown = pl.ferryChoices();
    expect(shown.length > 0).toBe(true);
    const c = toolPreview(w, store.get()).choices[0];
    pl.toggleTile(c.ends[0][0], c.ends[0][1]);
    expect(store.get().tool.pick).toBe(c.key);
  });
});

describe('v931 c words: How to play says a line that meets water runs straight', () => {
  it('names the straight run and both limits, and no longer says a bent line is refused', () => {
    const [help] = V71_HELP.f;
    for (const words of ['runs straight along the way you dragged most', 'up to 4 tiles of water it lays a bridge', '5 to 12 tiles, a ferry', 'teal for a bridge, blue for a ferry, coral', 'The Crossing card']) expect([words, help.text.includes(words)]).toEqual([words, true]);
    expect(help.text.includes('bent line')).toBe(false);
    expect(/Pharaoh/.test(help.text)).toBe(false);
  });
});
