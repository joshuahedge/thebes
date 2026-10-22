// Version 6.0, Track C: the 5.0 loose ends (rulings 706-709), each set up both ways. The Route preview draws bridge tiles apart from road; the Layers picker shows a layer the
// city has not reached greyed with the rank that unlocks it; pausing rebuilds neither the chunk index nor the roadless plots (the layers still see it); a farm area marks the
// ground it has but too little of for one more farm, apart from the ground the sim refuses. (The Estate trick, the fifth, is in tests/v60/c/estate.test.js.)
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { makeCanvas, pixelAt, canvasHash } from '../../helpers/canvas.js';
import { mount, fire } from '../../helpers/dom.js';
import { createPlacement, ghostsFor, toolPreview } from '../../../src/ui/placement.js';
import { createLayersPicker } from '../../../src/ui/layersPicker.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { drawGhost, roadlessPlots } from '../../../src/render/overlays.js';
import { chunkIndex } from '../../../src/render/chunkIndex.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { WOOD, UI } from '../../../src/render/art/palette.js';
import { p } from '../../../src/render/iso.js';
import { routeRoad } from '../../../src/sim/route.js';
import { previewRoad, setPaused, rectTiles } from '../../../src/sim/commands.js';
import { previewAreaTiles } from '../../../src/sim/areas.js';
import { homeProgress, workersState } from '../../../src/sim/layers.js';
import { buildingsVersion } from '../../../src/sim/world.js';
import { layersVersion } from '../../../src/sim/layerVersion.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { OVERLAYS, LAYER_OVERLAYS } from '../../../src/render/overlays.js';
import { OVERLAY_NAMES, LAYERS_LOCKED_TEXT } from '../../../src/ui/text.js';
import { AREA_TEXT } from '../../../src/ui/areaText.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { LAYER_UNLOCK } from '../../../src/data/layers.js';

const lay = (w, terrain, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.terrain[idx(w.size, x, y)] = terrain; };

// ── The Route preview over a bridge ──
function riverRig() {
  const world = makeTestWorld({ fertile: [], gold: 5000 });
  lay(world, T.WATER, 18, 0, 20, 31);                                       // a river 3 wide: a bridge spans it
  const store = createStore({ ...INITIAL_UI_STATE, inputType: 'mouse' });
  const pl = createPlacement({ world, store, afterCommand: () => {}, effects: null, now: () => 0, roadMode: { get: () => 'route', set: () => {} } });
  return { world, store, pl };
}
// A canvas with art origin at device (120, 60), 2 device px per art px, tile (tx, ty) there: the overlays tests' scene.
function scene(tx, ty) {
  const c = makeCanvas(240, 200);
  const ctx = c.getContext('2d');
  const [ax, ay] = p(tx, ty);
  ctx.translate(120 - 2 * ax, 60 - 2 * ay);
  return { c, g: makeDraw(ctx, 2) };
}
const near = (px, hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255; return px[3] > 200 && Math.abs(px[0] - r) < 40 && Math.abs(px[1] - gg) < 40 && Math.abs(px[2] - b) < 40; };
const countNear = (c, hex) => { let n = 0; for (let x = 0; x < 240; x++) for (let y = 0; y < 200; y++) if (near(pixelAt(c, x, y), hex)) n++; return n; };

describe('v60 c route preview draws bridges', () => {
  it('a routed road across the river: its water tiles are bridge tiles in the ghost, the rest road, and the bridges are the sim\'s own', () => {
    const { world, store, pl } = riverRig();
    pl.start({ kind: 'road' });
    pl.setRoute(true);
    pl.pointAt(4, 14);
    pl.pointAt(26, 14);
    const r = routeRoad(world, 4, 14, 26, 14);
    expect([r.ok, r.crossings, r.bridges.length]).toEqual([true, 1, 3]);
    const shapes = ghostsFor(world, store.get());
    expect(shapes.length).toBe(r.path.length);
    const bridges = shapes.filter((s) => s.state === 'bridge');
    expect(bridges.map((s) => [s.x, s.y]).sort((a, b) => a[0] - b[0])).toEqual([[18, 14], [19, 14], [20, 14]]);
    expect(bridges.length).toBe(toolPreview(world, store.get()).bridges.length);          // exactly the tiles the bar counts and prices
    expect(shapes.filter((s) => s.state !== 'bridge').every((s) => s.state === 'ok')).toBe(true);
    for (const s of bridges) expect(world.terrain[idx(world.size, s.x, s.y)]).toBe(T.WATER);
  });
  it('a straight L across it does the same, and with no water in the way there is no bridge tile; a road that is refused shows none', () => {
    const { world, store, pl } = riverRig();
    pl.setRoute(false);
    pl.start({ kind: 'road' });
    pl.pointAt(4, 14);
    pl.pointAt(26, 14);
    expect(previewRoad(world, 4, 14, 26, 14).ok).toBe(true);
    const shapes = ghostsFor(world, store.get());
    expect(shapes.filter((s) => s.state === 'bridge').length).toBe(3);
    pl.cancel();
    pl.start({ kind: 'road' });
    pl.pointAt(4, 20);
    pl.pointAt(14, 20);                                                                   // all sand
    expect(ghostsFor(world, store.get()).filter((s) => s.state === 'bridge').length).toBe(0);
    lay(world, T.WATER, 18, 0, 26, 31);                                                   // 9 wide: too wide to bridge, refused
    pl.cancel();
    pl.start({ kind: 'road' });
    pl.pointAt(4, 14);
    pl.pointAt(30, 14);
    expect(toolPreview(world, store.get()).state).toBe('bad');
    expect(ghostsFor(world, store.get()).filter((s) => s.state === 'bridge').length).toBe(0);
  });
  it('draws a bridge tile with planks and a wave mark, apart from a road tile\'s tick, and the same twice (nothing moves)', () => {
    const a = scene(5, 5), b = scene(5, 5), c = scene(5, 5);
    drawGhost(a.g, { x: 5, y: 5, w: 1, d: 1, state: 'bridge' });
    drawGhost(b.g, { x: 5, y: 5, w: 1, d: 1, state: 'ok' });
    drawGhost(c.g, { x: 5, y: 5, w: 1, d: 1, state: 'bridge' });
    expect(canvasHash(a.c) === canvasHash(b.c)).toBe(false);
    expect(canvasHash(a.c)).toBe(canvasHash(c.c));
    expect([countNear(a.c, WOOD) > 20, countNear(b.c, WOOD)]).toEqual([true, 0]);        // planks are on the bridge, never on the road tile
    expect(countNear(a.c, UI.ok) > 20).toBe(true);                                        // and it is still the blue ghost of a thing that can be placed
  });
});

// ── Locked layers greyed, with the rank ──
const cityAt = (milestone, { homes = true } = {}) => {
  const w = makeTestWorld();
  w.milestone = milestone;
  setRoad(w, 0, 10, 31, 10);
  if (homes) addRaw(w, 'house', 12, 11, { tier: 1, residents: 4 });
  return w;
};
function pickerRig(world) {
  const { root, cleanup } = mount();
  const store = createStore(INITIAL_UI_STATE);
  const picker = createLayersPicker({ store, world, restoreFocus: () => {} });
  root.append(picker.node);
  return { root, store, picker, cleanup() { picker.destroy(); cleanup(); } };
}

describe('v60 c locked layers', () => {
  it('shows Goods supply and Workers greyed before Town, each with its rank and a label for a screen reader, and offers them from Town', () => {
    const r = pickerRig(cityAt('village'));
    try {
      r.store.set({ layersOpen: true });
      const btn = (k) => r.picker.node.querySelector(`[data-layer="${k}"]`);
      const town = MILESTONES.find((m) => m.id === LAYER_UNLOCK.supply.milestone).name;
      for (const k of ['supply', 'workers']) {
        const b = btn(k);
        expect([k, b.hidden, b.classList.contains('locked'), b.getAttribute('aria-disabled')]).toEqual([k, false, true, 'true']);
        expect([k, b.querySelector('.lock').textContent, b.querySelector('.lock').hidden]).toEqual([k, `From ${town}`, false]);   // short on the button, in full for a screen reader and the tooltip
        expect([b.getAttribute('aria-label'), b.title]).toEqual([`${OVERLAY_NAMES[k]}, locked: Unlocks at ${town}`, `Unlocks at ${town}`]);
      }
      expect([btn('progress').classList.contains('locked'), btn('progress').hasAttribute('aria-disabled'), btn('progress').hasAttribute('aria-label')]).toEqual([false, false, false]);
      expect(btn('water').classList.contains('locked')).toBe(false);                      // an older layer is always on offer
      expect(LAYER_OVERLAYS.filter((k) => btn(k).classList.contains('locked'))).toEqual(['supply', 'workers']);
      fire(btn('supply'), 'click');                                                       // a locked one cannot be picked: nothing changes and the popover stays
      expect([r.store.get().overlay, r.store.get().layersOpen]).toEqual([null, true]);
      fire(btn('progress'), 'click');
      expect([r.store.get().overlay, r.store.get().layersOpen]).toEqual(['progress', false]);
    } finally { r.cleanup(); }
    const t = pickerRig(cityAt('town'));
    try {
      t.store.set({ layersOpen: true });
      expect(OVERLAYS.filter((k) => t.picker.node.querySelector(`[data-layer="${k}"]`).classList.contains('locked'))).toEqual([]);
      expect(t.picker.node.querySelector('[data-layer="supply"]').hasAttribute('aria-disabled')).toBe(false);
    } finally { t.cleanup(); }
  });
  it('says "First home" for Home progress before any home stands (in full: "Unlocks with your first home"), and turns it off when one does', () => {
    const w = cityAt('village', { homes: false });
    const r = pickerRig(w);
    try {
      r.store.set({ layersOpen: true });
      const b = r.picker.node.querySelector('[data-layer="progress"]');
      expect([b.classList.contains('locked'), b.querySelector('.lock').textContent]).toEqual([true, LAYERS_LOCKED_TEXT.rank('progress')]);
      expect([LAYERS_LOCKED_TEXT.rank('progress'), LAYERS_LOCKED_TEXT.words('progress')]).toEqual(['First home', 'Unlocks with your first home']);
      addRaw(w, 'house', 12, 11);
      r.store.set({ layersOpen: false });
      r.store.set({ layersOpen: true });
      expect(b.classList.contains('locked')).toBe(false);
      expect(b.querySelector('.lock').hidden).toBe(true);
    } finally { r.cleanup(); }
  });
  it('keeps the layer in use shown as offered even when the city would not offer it (as before)', () => {
    const r = pickerRig(cityAt('village'));
    try {
      r.store.set({ layersOpen: true, overlay: 'supply' });
      expect(r.picker.node.querySelector('[data-layer="supply"]').classList.contains('locked')).toBe(false);
    } finally { r.cleanup(); }
  });
});

// ── Pausing rebuilds neither the chunk index nor the roadless plots ──
describe('v60 c pausing', () => {
  it('leaves the buildings\' version, the chunk index and the roadless plots as they were, and still tells the layers', () => {
    const w = makeTestWorld();
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    addRaw(w, 'house', 12, 3);                                                            // a plot far from the road: a roadless plot
    const well = addRaw(w, 'well', 14, 9);
    staffAll(w);
    const index = chunkIndex(w), roadless = roadlessPlots(w), progress = homeProgress(w), workers = workersState(w);
    expect(roadless.length).toBe(1);
    const [bv, lv] = [buildingsVersion(w), layersVersion(w)];
    expect(setPaused(w, well.id, true).ok).toBe(true);
    expect([buildingsVersion(w), layersVersion(w)]).toEqual([bv, lv + 1]);
    expect(chunkIndex(w)).toBe(index);                                                    // not rebuilt
    expect(roadlessPlots(w)).toBe(roadless);                                              // not rebuilt
    expect(homeProgress(w) === progress).toBe(false);                                     // the layers see it at once
    expect(homeProgress(w).find((x) => x.id === home.id).missing.includes('water')).toBe(true);
    expect(workersState(w) === workers).toBe(false);
    setPaused(w, well.id, false);
    expect([buildingsVersion(w), layersVersion(w)]).toEqual([bv, lv + 2]);                // resuming counts too, and still moves no footprint
    expect(homeProgress(w).find((x) => x.id === home.id).missing.includes('water')).toBe(false);
    addRaw(w, 'garden', 5, 5);                                                            // a placing still rebuilds them
    expect(chunkIndex(w) === index).toBe(false);
  });
});

// ── Farm-area leftovers ──
describe('v60 c farm area leftovers', () => {
  const rect = (w, x0, y0, x1, y1) => rectTiles(x0, y0, x1, y1, w.size);
  const farmWorld = () => { const w = makeTestWorld({ gold: 100000 }); w.milestone = 'capital'; setRoad(w, 0, 10, 31, 10); return w; };
  it('marks the fertile ground too small for one more farm, apart from the ground the sim refuses', () => {
    const w = farmWorld();
    const r = previewAreaTiles(w, 'farm_grain', rect(w, 0, 2, 4, 3));                     // 5 x 2 fertile tiles: two 2x2 farms and a column of two left
    expect([r.ok, r.positions.length, r.skipped.length]).toEqual([true, 2, 0]);
    expect(r.leftover.map((t) => [t.x, t.y]).sort()).toEqual([[4, 2], [4, 3]]);
    lay(w, T.WATER, 4, 3, 4, 3);
    const s = previewAreaTiles(w, 'farm_grain', rect(w, 0, 2, 4, 3));
    expect([s.skipped.map((k) => [k.x, k.y, k.reason]), s.leftover.map((t) => [t.x, t.y])]).toEqual([[[4, 3, 'water']], [[4, 2]]]);   // the water is skipped, the tile beside it left over
    expect(previewAreaTiles(w, 'farm_grain', rect(w, 0, 2, 3, 3)).leftover).toEqual([]);   // an even fit leaves nothing
    expect(previewAreaTiles(w, 'garden', rect(w, 0, 2, 4, 3)).leftover).toEqual([]);        // a lattice of gardens has no leftover: every tile is its own
  });
  it('puts every tile of any rectangle in exactly one place: a farm, skipped or left over', () => {
    const w = farmWorld();
    lay(w, T.WATER, 3, 5, 3, 6);
    lay(w, T.DESERT, 6, 1, 6, 1);
    addRaw(w, 'well', 1, 7);
    for (const [x0, y0, x1, y1] of [[0, 0, 6, 8], [0, 1, 5, 3], [1, 4, 7, 9], [0, 5, 4, 7], [2, 2, 2, 6]]) {
      const tiles = rect(w, x0, y0, x1, y1);
      const r = previewAreaTiles(w, 'farm_grain', tiles);
      const farm = new Set(), seen = new Map();
      for (const [x, y] of r.positions) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) farm.add(`${x + dx},${y + dy}`);
      for (const [x, y] of tiles) seen.set(`${x},${y}`, [farm.has(`${x},${y}`), false, false]);
      for (const k of r.skipped) seen.get(`${k.x},${k.y}`)[1] = true;
      for (const k of r.leftover) seen.get(`${k.x},${k.y}`)[2] = true;
      for (const [key, [f, s, l]] of seen) expect([key, [f, s, l].filter(Boolean).length]).toEqual([key, 1]);
    }
  });
  it('says so in the bar ("3 left over, too small for a farm") and draws them hatched amber, apart from a skipped tile', () => {
    const w = farmWorld();
    lay(w, T.WATER, 4, 3, 4, 3);
    const store = createStore({ ...INITIAL_UI_STATE, inputType: 'mouse' });
    const pl = createPlacement({ world: w, store, afterCommand: () => {}, effects: null, now: () => 0 });
    pl.start({ kind: 'areas', type: 'farm_grain' });
    pl.pointAt(0, 2);
    pl.pointAt(4, 3);
    const r = previewAreaTiles(w, 'farm_grain', rect(w, 0, 2, 4, 3));
    const p = toolPreview(w, store.get());
    expect(p.leftover).toEqual([[4, 2]]);
    expect(p.text).toContain(AREA_TEXT.leftover('farm_grain', 1));
    expect(p.text).toContain(AREA_TEXT.skipped(r.skipped));
    expect(AREA_TEXT.leftover('farm_grain', 1)).toBe('1 left over, too small for a farm');
    expect(AREA_TEXT.leftover('farm_fig', 3)).toBe('3 left over, too small for an orchard');
    const g = ghostsFor(w, store.get());
    expect([g.filter((s) => s.state === 'left').map((s) => [s.x, s.y]), g.filter((s) => s.state === 'bad').map((s) => [s.x, s.y])]).toEqual([[[4, 2]], [[4, 3]]]);
    const a = scene(5, 5), b = scene(5, 5);
    drawGhost(a.g, { x: 5, y: 5, w: 1, d: 1, state: 'left' });
    drawGhost(b.g, { x: 5, y: 5, w: 1, d: 1, state: 'bad' });
    expect(canvasHash(a.c) === canvasHash(b.c)).toBe(false);
    expect([countNear(a.c, UI.warn) > 20, countNear(a.c, UI.bad)]).toEqual([true, 0]);   // amber, none of the coral
  });
});
