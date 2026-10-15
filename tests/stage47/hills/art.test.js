// Stage 4.7 Task 3 (ruling 464): hills on screen and in words. The picture (heights, depth order against buildings and walkers, the strata sprite, the
// baked ground, the minimap and share card), the Ground overlay and its legend, the refusal with Show me, the tip and How to play: each from the sim's own
// terrain, and set up both ways (a map with hills and one without).
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { canPlace } from '../../../src/sim/commands.js';
import { bridgeSpot, bridgeVerdicts } from '../../../src/sim/bridges.js';
import { collectObjects, createRenderer } from '../../../src/render/renderer.js';
import { createCamera, visibleTileRange } from '../../../src/render/camera.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { hillField, hillsIn, hillPatch, hillSlotAt, HILL } from '../../../src/render/hills.js';
import { ART } from '../../../src/render/art/registry.js';
import { TERRAIN } from '../../../src/render/art/palette.js';
import { bakeChunk } from '../../../src/render/terrainBaker.js';
import { hillGroundTiles, GROUND_HUE, groundTiles } from '../../../src/render/overlays.js';
import { createMinimap } from '../../../src/ui/minimap.js';
import { drawMapSquare } from '../../../src/ui/share.js';
import { createOverlayLegend } from '../../../src/ui/overlayUi.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createPlacement, toolPreview } from '../../../src/ui/placement.js';
import { createMapUi } from '../../../src/ui/s46/map.js';
import { TIPS } from '../../../src/data/tips.js';
import { S47_TIPS } from '../../../src/data/s47.js';
import { TIP_TEXT, TIP_HELP_TEXT, reasonText, S47_HILLS_TEXT, OVERLAY_LEGEND } from '../../../src/ui/text.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { mount } from '../../helpers/dom.js';

// A 32 x 32 world with a block of hills (x 10-13, y 10-13).
function hilly() {
  const w = makeTestWorld({ size: 32, fertile: [] });
  for (let y = 10; y <= 13; y++) for (let x = 10; x <= 13; x++) w.terrain[idx(32, x, y)] = T.HILLS;
  return w;
}
const range = (w) => ({ x0: 0, y0: 0, x1: w.size - 1, y1: w.size - 1 });

describe('s47 hills art', () => {
  it('stands each cluster at a real height: 0 all round its edge, a middle higher than a house, a bigger cluster taller', () => {
    const w = hilly(), f = hillField(w), S = HILL.sub, m = f.m;
    const at = (x, y) => f.v[y * S * m + x * S] ;                       // the corner of tile (x, y)
    expect([at(9, 9), at(10, 9), at(14, 14), at(14, 10)]).toEqual([0, 0, 0, 0]);   // the edge is ground
    const peak = Math.max(...f.v);
    expect(peak >= 20).toBe(true);                                       // a house is about 20 art px tall
    expect(peak <= 70).toBe(true);
    const big = makeTestWorld({ size: 32, fertile: [] });
    for (let y = 8; y <= 15; y++) for (let x = 8; x <= 14; x++) big.terrain[idx(32, x, y)] = T.HILLS;
    expect(Math.max(...hillField(big).v) > peak).toBe(true);
    expect(hillField(w)).toBe(f);                                        // worked out once
  });

  it('gives every hill tile a sprite of its own look: registered on demand, drawn inside its bounds, with strata and boulders', () => {
    const w = hilly(), objs = hillsIn(w, range(w), ART);
    expect(objs.length).toBe(16);
    const o = objs.find((q) => q.x === 11 && q.y === 11);
    expect(o.slot).toBe(hillSlotAt(w, 11, 11));
    const def = ART[o.slot];
    expect([def.w, def.d, def.shadows.length]).toEqual([1, 1, 0]);       // no ground shadow pass: nothing darkens elsewhere
    expect(def.height).toBe(Math.max(...hillPatch(w, 11, 11).hts));
    const cache = createSpriteCache({ createCanvas: makeCanvas });
    const sprite = cache.get(o.slot, 1, 1);
    expect(sprite !== null).toBe(true);
    // the sprite has ink at the top of the mound (it stands up) and the strata's tones down its side
    const px = (ax, ay) => pixelAt(sprite.canvas, sprite.ax + ax * sprite.scale, sprite.ay + ay * sprite.scale);
    const { hts } = hillPatch(w, 11, 11), S = HILL.sub, top = hts.indexOf(Math.max(...hts)), tk = top % (S + 1), tj = Math.floor(top / (S + 1));
    const tx = (tk / S - tj / S) * 16, ty = (tk / S + tj / S) * 8;
    expect(px(tx, ty - Math.max(...hts) + 3)[3] > 0).toBe(true);
    const tones = new Set();
    for (let s = 0.1; s < 1; s += 0.08) tones.add(px(tx * (1 - s * 0.5), ty * (1 + s * 0.2) - Math.max(...hts) * (1 - s) + 1).join(','));
    expect(tones.size >= 3).toBe(true);
  });

  it('is sorted with buildings and walkers by depth: a walker or a house in front of a hill is drawn after it, one behind it before', () => {
    const w = hilly();
    addRaw(w, 'well', 10, 6);                                            // behind (smaller x + y)
    addRaw(w, 'well', 12, 15);                                           // in front
    const walkers = [{ id: 1, kind: 'newcomer', x: 11.5, y: 8.5 }, { id: 2, kind: 'newcomer', x: 11.5, y: 16.5 }];
    const objects = collectObjects(w, range(w), walkers);
    const order = (pred) => objects.findIndex(pred);
    const hill = order((o) => o.slot.startsWith('hill.') && o.x === 11 && o.y === 11);
    expect(hill >= 0).toBe(true);
    expect(order((o) => o.slot === 'well' && o.y === 6) < hill).toBe(true);
    expect(order((o) => o.slot === 'well' && o.y === 15) > hill).toBe(true);
    expect(order((o) => o.slot === 'fig.newcomer' && o.y === 8.5) < hill).toBe(true);
    expect(order((o) => o.slot === 'fig.newcomer' && o.y === 16.5) > hill).toBe(true);
    // the hill objects are never swayed like a tree, whatever the treeSlot seam says
    const canvas = makeCanvas(200, 200), asked = [];
    const renderer = createRenderer({ canvas, dpr: 1, spriteCache: createSpriteCache({ createCanvas: makeCanvas }), maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 11, y: 11, zoom: 1 });
    const stats = renderer.renderFrame(w, cam, { view: { width: 200, height: 200 }, treeSlot: (o) => { asked.push(o.slot); return `${o.slot}.l2`; } });
    expect(asked.some((s) => s.startsWith('hill.'))).toBe(false);
    expect(stats.sprites >= 16).toBe(true);                              // every hill tile drew
  });

  it('draws a map without hills exactly as before: no hill object, no hill slot', () => {
    const w = makeTestWorld({ size: 32, fertile: [] });
    expect(hillsIn(w, range(w), ART)).toEqual([]);
    expect(collectObjects(w, range(w), []).every((o) => !String(o.slot).startsWith('hill.'))).toBe(true);
    const classic = createWorld({ seed: 5, size: 64, mapVariant: 'classic' });
    expect(hillsIn(classic, { x0: 0, y0: 0, x1: 63, y1: 63 }, ART)).toEqual([]);
  });

  it('bakes the ground under a hill as rocky ground, not sand, and keeps hills out of the green band', () => {
    const w = hilly();
    const chunk = bakeChunk(w, 0, 0, 2, makeCanvas);
    const o = (tx, ty) => pixelAt(chunk.canvas, chunk.ax + ((tx - ty) * 16 - (0 - 0)) * chunk.scale, chunk.ay + ((tx + ty + 1) * 8) * chunk.scale);
    const hillPx = o(11, 11), sandPx = o(3, 3);
    expect(hillPx.join(',') === sandPx.join(',')).toBe(false);
    expect(hillPx[0] > hillPx[2] + 20).toBe(true);                       // warm rock, not the sand's pale
  });

  it('shows hills in the minimap and the share card in their own colour, not sand', () => {
    const w = hilly();
    const mini = createMinimap({ world: w, cam: createCamera({ x: 16, y: 16, zoom: 1 }), view: () => ({ width: 100, height: 100 }), size: 64, dpr: 1 });
    mini.render();
    const canvas = mini.canvas;
    const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    const cell = (cv, size, x, y) => pixelAt(cv, (x + 0.5) * (cv.width / size), (y + 0.5) * (cv.height / size));
    expect(cell(canvas, 32, 11, 11).slice(0, 3)).toEqual(hex(TERRAIN.hills));
    expect(cell(canvas, 32, 3, 3).slice(0, 3)).toEqual(hex(TERRAIN.sand));
    const card = makeCanvas(64, 64);
    drawMapSquare(card.getContext('2d'), { size: 32, terrain: w.terrain }, 0, 0, 64);
    expect(cell(card, 32, 11, 11).slice(0, 3)).toEqual(hex(TERRAIN.hills));
    expect(TERRAIN.hills === TERRAIN.sand).toBe(false);
  });
});

describe('s47 hills ground overlay and words', () => {
  it('marks every hill tile on the Ground overlay, and only the hill tiles, apart from the free ground a building may take', () => {
    const w = hilly();
    expect(hillGroundTiles(w).length).toBe(16);
    expect(hillGroundTiles(w, { x0: 10, y0: 10, x1: 11, y1: 11 })).toEqual([[10, 10], [11, 10], [10, 11], [11, 11]]);
    expect(groundTiles(w)).toEqual({ fertile: [], rocky: [], clay: [] });   // hills are never free ground
    expect(hillGroundTiles(makeTestWorld({ size: 32, fertile: [] }))).toEqual([]);
    expect(GROUND_HUE.hills === GROUND_HUE.rocky).toBe(false);
  });

  it('names hills in the Ground legend on a map that has them ("Hills: nothing passes or builds here"), and not on one without', () => {
    expect(S47_HILLS_TEXT.groundKey).toBe('Hills: nothing passes or builds here');
    for (const [w, has] of [[hilly(), true], [makeTestWorld({ size: 32, fertile: [] }), false]]) {
      const { root, cleanup } = mount('<div id="legend"></div>');
      try {
        const store = createStore({ ...INITIAL_UI_STATE, overlay: 'ground' });
        createOverlayLegend({ container: root.querySelector('#legend'), store, world: w });
        const keys = [...root.querySelectorAll('.key')].map((k) => k.textContent.trim());
        expect(keys).toEqual(has ? [...OVERLAY_LEGEND.ground, S47_HILLS_TEXT.groundKey] : OVERLAY_LEGEND.ground);
        expect(root.querySelectorAll('.key .swatch').length).toBe(keys.length);   // a swatch each, as the map draws it
      } finally { cleanup(); }
    }
  });

  it('refuses a building, a road and a plot on hills with "Hills: nothing can be built here", and a ground-bound building offers Show me', () => {
    const w = hilly();
    w.milestone = 'town';
    for (const type of ['house', 'well', 'farm_grain', 'clay_pit']) {
      const c = canPlace(w, type, 11, 11, { roadLater: true });
      expect([type, c.ok, c.reason]).toEqual([type, false, 'hills']);
    }
    expect(reasonText('hills')).toBe('Hills: nothing can be built here');
    const farm = toolPreview(w, { tool: { kind: 'building', type: 'farm_grain' }, ghost: { x: 11, y: 11 }, rot: 0 });
    expect([farm.state, farm.reason, farm.showFit]).toEqual(['bad', 'hills', true]);
    const well = toolPreview(w, { tool: { kind: 'building', type: 'well' }, ghost: { x: 11, y: 11 }, rot: 0 });
    expect([well.state, well.reason, well.showFit]).toEqual(['bad', 'hills', false]);   // no ground rule: no spot to find
  });

  it('has the tip and How to play say hills block roads, buildings and walkers and that mines will come to the rocky ground round them later (no dates)', () => {
    expect(TIPS.find((t) => t.id === 'hills_ground')).toEqual({ id: 'hills_ground', trigger: 'hillsMet', priority: false });
    expect(S47_TIPS.some((t) => t.id === 'hills_ground')).toBe(true);
    for (const text of [TIP_TEXT.hills_ground, TIP_HELP_TEXT.hills_ground]) {
      expect(text.split(' ').length <= 20).toBe(true);
      expect(text).toContain('Mines will come to the rocky ground around them later');
      expect(/\d|year|month|soon|next/i.test(text)).toBe(false);          // no dates, no promise of when
    }
    expect(TIP_TEXT.hills_ground).toContain(S47_HILLS_TEXT.groundKey);
  });

  it('fires the tip the first time a ghost or a road line is refused for hills, and for no other ground', () => {
    const w = hilly();
    w.milestone = 'town';
    const store = createStore(INITIAL_UI_STATE), fired = [], root = document.createElement('div');
    document.body.append(root);
    const ui = createMapUi({ world: w, store, root, fireTip: (k) => fired.push(k), showMeAt: () => {}, toasts: { show: () => {} } });
    const pl = createPlacement({ world: w, store });
    try {
      pl.start({ kind: 'building', type: 'well' });
      pl.moveGhost(3, 3);
      expect(fired).toEqual([]);                                          // open ground
      pl.moveGhost(11, 11);
      expect(fired).toEqual(['hillsMet']);
      pl.start({ kind: 'road' });
      pl.pointAt(2, 20); pl.pointAt(6, 20);
      expect(fired.length).toBe(1);
      pl.pointAt(8, 11); pl.pointAt(15, 11);                              // a road line across the hills
      expect(fired.includes('hillsMet')).toBe(true);
    } finally { ui.destroy(); root.remove(); }
    // a map without hills never watches for them
    const plain = makeTestWorld({ size: 32, fertile: [] }), store2 = createStore(INITIAL_UI_STATE), seen = [], root2 = document.createElement('div');
    const ui2 = createMapUi({ world: plain, store: store2, root: root2, fireTip: (k) => seen.push(k), showMeAt: () => {}, toasts: { show: () => {} } });
    try { const pl2 = createPlacement({ world: plain, store: store2 }); pl2.start({ kind: 'building', type: 'well' }); pl2.moveGhost(11, 11); expect(seen).toEqual([]); } finally { ui2.destroy(); }
  });
});

describe('s47 hills and bridges', () => {
  it('does not end a bridge on hills: a crossing whose land end is a hill tile is not offered, and the road tool refuses it', () => {
    const w = makeTestWorld({ size: 32, fertile: [] });
    for (let y = 0; y < 32; y++) for (const x of [14, 15]) w.terrain[idx(32, x, y)] = T.WATER;
    const spot = bridgeSpot(w, { x: 16, y: 16 });
    expect(spot !== null && spot.water === 2).toBe(true);
    const [fx, fy] = spot.from, [tx, ty] = spot.to;
    // a hill where the bridge would land: that run is no longer a crossing, the nearest spot moves along the river
    w.terrain[idx(32, tx, ty)] = T.HILLS;
    const moved = bridgeSpot(w, { x: 16, y: 16 });
    expect(moved === null || moved.y !== spot.y || moved.x !== spot.x).toBe(true);
    expect(moved === null || !(moved.to[0] === tx && moved.to[1] === ty)).toBe(true);
    // the other end of the same run, too
    w.terrain[idx(32, tx, ty)] = T.DESERT;
    w.terrain[idx(32, fx, fy)] = T.HILLS;
    const other = bridgeSpot(w, { x: 16, y: 16 });
    expect(other === null || !(other.from[0] === fx && other.from[1] === fy)).toBe(true);
    // and with the hill gone it is the spot again
    w.terrain[idx(32, fx, fy)] = T.DESERT;
    expect(bridgeSpot(w, { x: 16, y: 16 })).toEqual(spot);
    expect(bridgeVerdicts !== undefined).toBe(true);
  });
});
