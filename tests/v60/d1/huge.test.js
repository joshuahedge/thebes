// Version 6.0 Track D1 (rulings 740, 741, 743): the Huge map, 112 tiles a side. Offered after Large; terrain and the start guarantees hold; a new city,
// a save, a share link and a record all carry it; the zoom floor keeps its frame within 1.25 x Large's; a phone is told it suits a bigger screen.
import { describe, it, expect } from '../../harness.js';
import { MAP_SIZE_TABLE, MAP_SIZES, HUGE_MAP_SIZE, MAP_VARIANTS, DEFAULT_MAP_SIZE, isMapSize } from '../../../src/data/map.js';
import { createWorld } from '../../../src/sim/world.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { resourceCounts } from '../../../src/sim/resources.js';
import { resourceReach, RESOURCES } from '../../../src/data/s47.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';
import { createRecords } from '../../../src/save/records.js';
import { shareLink, parseShareLink } from '../../../src/ui/share.js';
import { createCamera, zoomAt, minZoomFor, frameTiles, zoomFloor, MIN_ZOOM, MAX_ZOOM, FRAME_RATIO_OVER_LARGE } from '../../../src/render/camera.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

describe('v60 d1 huge map: the size table and the start guarantees', () => {
  it('offers Huge as the fourth size, 112 tiles, marked for a bigger screen, and every offered size is a size', () => {
    expect(MAP_SIZE_TABLE.map((r) => [r.id, r.size, r.offered, r.bigScreen])).toEqual([['small', 48, true, false], ['normal', 64, true, false], ['large', 80, true, false], ['huge', 112, true, true]]);
    expect([HUGE_MAP_SIZE, MAP_SIZES.huge, isMapSize(112), isMapSize(96), DEFAULT_MAP_SIZE]).toEqual([112, 112, true, false, 64]);
  });
  it('holds the start guarantees on every layout and 12 seeds: a free start area, land entries that reach it, the road on the south edge, clay, a mine and farms in reach', () => {
    const bad = [];
    for (const variant of MAP_VARIANTS) {
      for (let seed = 1; seed <= 12; seed++) {
        const m = generateMap(seed, HUGE_MAP_SIZE, variant), tag = `${variant} #${seed}`;
        const at = (x, y) => m.terrain[idx(112, x, y)];
        let free = 0;
        for (let y = m.focus.y - 3; y <= m.focus.y + 3; y++) for (let x = m.focus.x - 3; x <= m.focus.x + 3; x++) if (![T.WATER, T.ROCKY].includes(at(x, y))) free++;
        if (free !== 49) bad.push(`${tag}: start area ${free} of 49`);
        if (m.size !== 112 || m.terrain.length !== 112 * 112) bad.push(`${tag}: size`);
        if (m.startRoad[0][0] !== m.tradeEntry.x || m.startRoad[0][1] !== 111) bad.push(`${tag}: start road`);
        for (const [x, y] of m.startRoad) if (at(x, y) === T.WATER) bad.push(`${tag}: road on water`);
        if (m.raiderEntries.length < 2) bad.push(`${tag}: ${m.raiderEntries.length} entries`);
        for (const e of m.raiderEntries) if (at(e.x, e.y) === T.WATER) bad.push(`${tag}: entry in water`);
        const c = resourceCounts({ size: 112, terrain: m.terrain, focus: m.focus, startRoad: m.startRoad }, resourceReach(112));
        if (variant !== 'classic' && (c.clay.near < RESOURCES.clay || c.mine.near < RESOURCES.mine || c.farm.near < RESOURCES.farm)) bad.push(`${tag}: ${JSON.stringify(c)}`);
        if (variant === 'classic' && (c.clay.near < RESOURCES.clay || c.farm.near < RESOURCES.farm)) bad.push(`${tag}: classic ${JSON.stringify(c)}`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
  it('lays a Huge map from (seed, layout) alone: the same twice, another seed another map', () => {
    const a = generateMap(7, 112, 'island'), b = generateMap(7, 112, 'island'), c = generateMap(8, 112, 'island');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a.terrain) === JSON.stringify(c.terrain)).toBe(false);
  });
  it('plays: a new Huge city runs a game year, saves and loads as the same city, and its records and link carry 112', () => {
    const w = createWorld({ seed: 11, size: 112, mapVariant: 'classic', cityId: 'huge-1' });
    expect([w.size, w.mapSize, w.terrain.length, w.occ.length]).toEqual([112, 112, 12544, 12544]);
    advanceDays(w, 360);
    expect(w.day).toBe(360);
    const back = unpackSave(packSave(w, { savedAt: 1, lastSpeed: 1 })).world;
    expect([back.size, back.mapSize, back.day, back.terrain.length]).toEqual([112, 112, 360, 12544]);
    const link = shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {}, size: 112 });
    expect(link.endsWith('&size=112')).toBe(true);
    expect(parseShareLink(new URL(link).hash).size).toBe(112);
    const records = createRecords({ storage: memory() });
    w.history = [{ day: 30, people: 0, gold: 0, mood: 60, score: 200, parts: PARTS }];
    w.splits = { town: 100 };
    records.noteCity(w, 1);
    expect(records.bestFor(11, 'normal', { version: 1, size: 112 }).score).toBe(200);
    expect(records.bestFor(11, 'normal', { version: 1 })).toBe(null);                       // not a Normal best
  });
});

describe('v60 d1 huge map: the zoom floor keeps the frame within 1.25 x Large\'s (ruling 741)', () => {
  const VIEWS = [[390, 844], [844, 390], [1024, 768], [1280, 800], [1920, 1080], [2560, 1440], [3840, 2160]].map(([width, height]) => ({ width, height }));
  const LARGE_TILES = 80 * 80;
  it('leaves every map up to Large at 0.5 on every screen, and Huge at 0.5 on every screen up to 1920 x 1080 (to a hair)', () => {
    for (const v of VIEWS) for (const size of [48, 64, 80]) expect([v.width, v.height, size, minZoomFor(size, v)]).toEqual([v.width, v.height, size, MIN_ZOOM]);
    for (const v of VIEWS.filter((x) => x.width * x.height <= 1280 * 800)) expect([v.width, v.height, minZoomFor(112, v)]).toEqual([v.width, v.height, MIN_ZOOM]);
    expect(minZoomFor(112, { width: 1920, height: 1080 })).toBeLessThan(0.51);
  });
  it('holds Huge\'s frame at its floor within 1.25 x the frame Large shows at 0.5 (its whole map, 6,400 tiles, at most), on every screen', () => {
    expect(FRAME_RATIO_OVER_LARGE).toBe(1.25);
    for (const v of VIEWS) {
      const large = Math.min(frameTiles(v, MIN_ZOOM), LARGE_TILES);
      const huge = frameTiles(v, minZoomFor(112, v));
      expect([v.width, v.height, huge <= FRAME_RATIO_OVER_LARGE * large + 1e-6]).toEqual([v.width, v.height, true]);
    }
    const big = minZoomFor(112, { width: 3840, height: 2160 });
    expect(big).toBeGreaterThan(0.9);                                                      // a 4K window cannot zoom a Huge map out far
    expect(big).toBeLessThanOrEqual(MAX_ZOOM);
  });
  it('stops zoomAt, the zoom step and the next tick at the floor of a camera that knows its map is Huge, and never moves a smaller map\'s', () => {
    const view = { width: 3840, height: 2160 };
    const floor = minZoomFor(112, view);
    const huge = createCamera({ x: 56, y: 56, zoom: 1, size: 112 });
    expect([huge.mapSize, zoomFloor(huge, view)]).toEqual([112, floor]);
    for (let i = 0; i < 30; i++) zoomAt(huge, view, 0.8, 1920, 1080);
    expect(Math.abs(huge.zoom - floor) < 1e-9).toBe(true);
    const small = createCamera({ x: 32, y: 32, zoom: 1, size: 64 });
    for (let i = 0; i < 30; i++) zoomAt(small, view, 0.8, 1920, 1080);
    expect(small.zoom).toBe(MIN_ZOOM);
    expect(createCamera({ x: 1, y: 1, zoom: 1 })).toEqual({ x: 1, y: 1, zoom: 1 });         // a camera that is told no size has none (as before)
    const cam = createCamera({ x: 56, y: 56, zoom: 1, size: 112 });
    const cc = createCameraControl({ cam, view: () => view, reducedMotion: () => true, now: () => 0 });
    for (let i = 0; i < 30; i++) cc.zoomStep(0.8, 1920, 1080);
    expect(Math.abs(cam.zoom - floor) < 1e-9).toBe(true);
    cc.zoomTo(0.5);                                                                          // asked for less than the floor
    expect(Math.abs(cam.zoom - floor) < 1e-9).toBe(true);
    const wide = { width: 1280, height: 800 };
    const cc2 = createCameraControl({ cam: { ...cam, zoom: 0.5 }, view: () => wide, reducedMotion: () => true, now: () => 0 });
    expect(cc2.tick(0)).toBe(false);
    const grown = { x: 56, y: 56, zoom: 0.5, mapSize: 112 };                                 // a bigger window raised the floor under a view that was further out
    const cc3 = createCameraControl({ cam: grown, view: () => view, reducedMotion: () => true, now: () => 0 });
    cc3.tick(0);
    expect(Math.abs(grown.zoom - floor) < 1e-9).toBe(true);
  });
});

describe('v60 d1 huge map: choosing it on the title starts a Huge city with its camera floor', () => {
  const noStorage = { getItem: (k) => (k === 'thebes.settings' ? '{"cardsSeen":true}' : null), setItem: () => {} };
  async function open(params = '', width = 1280, height = 800) {
    const shell = await mountShell(width, height);
    const history = fakeHistory();
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params), now: () => 0, clock: () => 1760000000000, storage: noStorage,
      platform: {}, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    return { api, shell, close() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
  }
  it('starts a 112 city from the picker, with a camera that knows the size, and from ?size=112', async () => {
    const g = await open();
    try {
      fire(g.shell.root.querySelector('#title .choice.mapsize[data-value="huge"]'), 'click');
      fire(g.shell.root.querySelector('#title .new-city'), 'click');
      const game = g.api.game();
      expect([game.world.size, game.world.mapSize, game.cam.mapSize]).toEqual([112, 112, 112]);
    } finally { g.close(); }
    const f = await open('skipTitle=1&size=112&seed=3');
    try { expect([f.api.game().world.size, f.api.game().cam.mapSize]).toEqual([112, 112]); } finally { f.close(); }
    const n = await open('skipTitle=1&seed=3');
    try { expect([n.api.game().world.size, n.api.game().cam.mapSize]).toEqual([64, 64]); } finally { n.close(); }
  });
  it('tells a phone "Best on a tablet or computer" on the real title and a laptop nothing', async () => {
    const phone = await open('', 390, 844);
    try {
      fire(phone.shell.root.querySelector('#title .choice.mapsize[data-value="huge"]'), 'click');
      expect(phone.shell.root.querySelector('#title .size-note').textContent).toBe('Best on a tablet or computer');
    } finally { phone.close(); }
    const laptop = await open('', 1280, 800);
    try {
      fire(laptop.shell.root.querySelector('#title .choice.mapsize[data-value="huge"]'), 'click');
      expect(laptop.shell.root.querySelector('#title .size-note').hidden).toBe(true);
    } finally { laptop.close(); }
  });
});
