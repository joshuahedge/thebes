// Stage 4, Track E: festival and dedication processions (spec 5.7 items 3 and 4, rulings 214, 246, 257), walkers on game
// time under every Motion level: a festival's grows from 4 figures to 12; a dedication walks from the nearest temple to a
// finished monument for one game-month; on screen only, at most three, dropped when the ambient budget has dropped all
// it can; the festival temple's streamers flutter under Full only; the procession dev scene.
import { describe, it, expect } from '../../harness.js';
import {
  processionsAt, walkersAt, WALKER_CAP, walkerLoop, festivalOn, festivalSize, dedicationsOn, dedicationLoop, figureKind,
  PROCESSION_ID_BASE, DEDICATION_ID_BASE, STREAMER_ID_BASE,
} from '../../../src/render/walkers.js';
import { createAmbient, drawAmbientLate, ambientState, LEVEL_HOLD_MS } from '../../../src/render/ambient.js';
import { PROCESSION, AMBIENT } from '../../../src/data/ambient.js';
import { FESTIVAL } from '../../../src/data/raids.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { ART } from '../../../src/render/art/registry.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createRenderer, collectObjects } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { roadReach, adjacentRoadTiles } from '../../../src/sim/reach.js';
import { idx } from '../../../src/sim/grid.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { devScene } from '../../../src/dev/scenes.js';
import { createWorld } from '../../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const DAY = 100;
// A street along y = 10 with a working temple on it (its road tiles y = 10, x 12-13), a festival held on DAY.
function street({ festival = true } = {}) {
  const w = makeTestWorld({ gold: 5000, fertile: [] });
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 20, 0, 20, 9);
  const temple = addRaw(w, 'temple', 12, 8);
  staffAll(w);
  w.day = DAY;
  if (festival) w.danger.festivalDay = DAY;
  return { w, temple };
}
const mine = (base, id) => (wk) => wk.id >= base + id * 16 && wk.id < base + id * 16 + 16;
const onRoad = (w, wk) => Boolean(w.road[idx(w.size, Math.floor(wk.x), Math.floor(wk.y))]);

describe('s4 motion festival processions', () => {
  it('files out of its working temple on the festival\'s day and walks the roads in its reach while the festival lasts', () => {
    const { w, temple } = street({ festival: false });
    expect([festivalOn(w), processionsAt(w, DAY).length]).toEqual([false, 0]);
    w.danger.festivalDay = DAY;
    expect(festivalOn(w)).toBe(true);
    const figures = (t) => processionsAt(w, t).filter(mine(PROCESSION_ID_BASE, temple.id));
    expect(figures(DAY).length).toBe(1);                                         // the leader steps out first
    expect(figures(DAY + PROCESSION.spacing * 2 + 0.01).length).toBe(3);         // then the rest, one by one
    const n = festivalSize(w);
    const out = figures(DAY + 12);
    expect([n, out.length]).toEqual([PROCESSION.start + 1, n]);                   // four, and one for its temple
    const reach = roadReach(w, temple, BUILDINGS.temple.reach);
    for (const f of out) {
      expect(onRoad(w, f)).toBe(true);
      expect(reach.has(idx(w.size, Math.floor(f.x), Math.floor(f.y)))).toBe(true);
    }
    expect(out.map((f) => f.kind)).toEqual(PROCESSION.order.slice(0, n).map(figureKind));
    expect(PROCESSION.order.slice(0, 4)).toEqual(['priest', 'shrine', 'musician', 'dancer']);
    expect(walkersAt(w, DAY + 12).filter(mine(PROCESSION_ID_BASE, temple.id)).length).toBe(n);   // among the game's walkers
    w.day = DAY + FESTIVAL.days - 1;
    expect(figures(w.day).length).toBe(n);
    w.day = DAY + FESTIVAL.days;
    expect([festivalOn(w), processionsAt(w, w.day).length]).toEqual([false, 0]);   // over with the festival's mood
    w.day = DAY + 10;
    temple.staff = 0;                                                            // a temple not at work holds none
    expect(processionsAt(w, w.day).length).toBe(0);
  });
  it('grows by one figure for each temple, booth and finished monument, up to 12', () => {
    const { w } = street();
    expect(festivalSize(w)).toBe(5);
    addRaw(w, 'booth', 15, 9);
    expect(festivalSize(w)).toBe(6);
    const site = addRaw(w, 'colossus', 22, 8);
    expect(festivalSize(w)).toBe(6);                                            // a site under way does not count
    site.site.done = 40;
    expect(festivalSize(w)).toBe(7);
    for (let x = 0; x < 10; x += 2) addRaw(w, 'temple', x, 11);
    expect(festivalSize(w)).toBe(PROCESSION.max);
  });
  it('walks on game time: the same day shows the same procession, it holds still while paused, and never writes the world', () => {
    const { w, temple } = street();
    const before = JSON.stringify(w);
    const at = (t) => processionsAt(w, t).filter(mine(PROCESSION_ID_BASE, temple.id));
    expect(JSON.stringify(at(DAY + 7.25))).toBe(JSON.stringify(at(DAY + 7.25)));
    const a = at(DAY + 7), b = at(DAY + 7.5);
    const moved = a.map((f, i) => Math.abs(b[i].x - f.x) + Math.abs(b[i].y - f.y));
    for (const m of moved) expect(Math.abs(m - 0.5 * PROCESSION.tilesPerDay) < 1e-9 || m < 0.5).toBe(true);   // half a tile in half a day
    expect(moved.some((m) => Math.abs(m - 0.5) < 1e-9)).toBe(true);
    expect(JSON.stringify(w)).toBe(before);
  });
  it('stands streamers at the festival temple\'s two front corners, in front of it in depth, fluttering under Full only', () => {
    const { w, temple } = street();
    const poles = (t) => processionsAt(w, t).filter((wk) => wk.id >= STREAMER_ID_BASE);
    expect(poles(DAY + 1).map((s) => [s.kind, s.x, s.y])).toEqual([['streamer', 12.12, 9.88], ['streamer', 13.88, 8.12]]);
    expect(['fig.streamer', 'fig.streamer2'].every((s) => ART[s] && typeof ART[s].draw === 'function')).toBe(true);
    const range = { x0: 0, y0: 0, x1: 31, y1: 31 };
    const objs = collectObjects(w, range, poles(DAY + 1));
    const key = (id) => objs.findIndex((o) => o.id === id);
    expect(key(2e6 + STREAMER_ID_BASE + temple.id * 2)).toBeGreaterThan(key(temple.id));
    expect(key(2e6 + STREAMER_ID_BASE + temple.id * 2 + 1)).toBeGreaterThan(key(temple.id));
    const frame = (a, now) => { const g = makeDraw(makeCanvas(32, 32).getContext('2d'), 1); a.draw(g, w, range, now); drawAmbientLate(g); };
    const kinds = (level) => {
      const a = createAmbient({ enabled: () => level !== 'still', level: () => level });
      return [500, 1500, 2500].map((now) => { frame(a, now); return poles(DAY + 1)[0].kind; });
    };
    expect(kinds('full')).toEqual(['streamer', 'streamer2', 'streamer']);        // once a second
    expect(kinds('gentle')).toEqual(['streamer', 'streamer', 'streamer']);
    expect(kinds('still')).toEqual(['streamer', 'streamer', 'streamer']);
  });
});

describe('s4 motion dedication processions', () => {
  it('walks from the nearest temple to a finished monument and back for one game-month, from state', () => {
    const { w, temple } = street({ festival: false });
    const far = addRaw(w, 'temple', 2, 8);
    staffAll(w);
    const m = addRaw(w, 'colossus', 22, 8);                                     // its road tiles: y = 10 and x = 20
    expect(dedicationsOn(w).length).toBe(0);
    m.site.done = DAY;
    expect(dedicationsOn(w)).toEqual([m]);
    const loop = dedicationLoop(w, m);
    const beside = (b, t) => adjacentRoadTiles(w, b).includes(idx(w.size, t.x, t.y));
    const turn = loop[Math.floor(loop.length / 2)];
    expect([beside(temple, loop[0]), beside(far, loop[0]), beside(m, turn)]).toEqual([true, false, true]);   // the nearer temple, out to the monument
    const ded = (t) => processionsAt(w, t).filter(mine(DEDICATION_ID_BASE, m.id));
    expect(ded(DAY + 10).length).toBe(PROCESSION.dedicationFigures);
    for (const f of ded(DAY + 10)) expect(onRoad(w, f)).toBe(true);
    const reloaded = deserialize(serialize(w));                                 // a reload shows the same dedication
    expect(JSON.stringify(processionsAt(reloaded, DAY + 10))).toBe(JSON.stringify(processionsAt(w, DAY + 10)));
    w.day = DAY + PROCESSION.dedicationDays - 1;
    expect(ded(w.day).length).toBe(PROCESSION.dedicationFigures);
    w.day = DAY + PROCESSION.dedicationDays;
    expect(ded(w.day).length).toBe(0);                                          // one game-month
  });
  it('walks the monument\'s own road when no temple\'s reach meets it', () => {
    const w = makeTestWorld({ gold: 5000, fertile: [] });
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'temple', 0, 0);                                                   // no road: its reach meets nothing
    const m = addRaw(w, 'obelisk_small', 20, 9);
    m.site.done = w.day;
    expect(dedicationLoop(w, m)).toEqual(walkerLoop(w, m, PROCESSION.ownReach));
    expect(processionsAt(w, w.day + 8).filter(mine(DEDICATION_ID_BASE, m.id)).length).toBeGreaterThan(0);
  });
});

describe('s4 motion processions on screen', () => {
  it('shows only processions near the view, the three nearest its middle', () => {
    const { w } = street();
    for (const x of [2, 22, 26]) addRaw(w, 'temple', x, 8);
    staffAll(w);
    const hosts = (range) => new Set(processionsAt(w, DAY + 12, range).filter((wk) => wk.id < STREAMER_ID_BASE).map((wk) => Math.floor((wk.id - PROCESSION_ID_BASE) / 16)));
    expect(hosts(null).size).toBe(PROCESSION.maxOnScreen);
    const left = { x0: 0, y0: 4, x1: 8, y1: 14 };
    const ids = [...hosts(left)];
    expect(ids.includes(Object.values(w.buildings).find((b) => b.type === 'temple' && b.x === 2).id)).toBe(true);
    expect(ids.includes(Object.values(w.buildings).find((b) => b.type === 'temple' && b.x === 26).id)).toBe(false);
    expect(processionsAt(w, DAY + 12, { x0: 0, y0: 28, x1: 3, y1: 31 }).length).toBe(0);
  });
  it('drops once the ambient budget has dropped all it can, and is back when it brings them back', () => {
    const { w } = street();
    let cost = 3, t = 0, now = 0;
    const a = createAmbient({ enabled: () => true, level: () => 'full', clock: () => (t += cost) });
    const run = (ms) => { for (let n = 0; n < ms; n += 16) { now += 16; const g = makeDraw(makeCanvas(16, 16).getContext('2d'), 1); a.draw(g, w, { x0: 0, y0: 0, x1: 31, y1: 31 }, now); drawAmbientLate(g); } };
    run(LEVEL_HOLD_MS + 200);
    expect(ambientState(w).dropped).toEqual(['rare']);
    expect(processionsAt(w, DAY + 12).length).toBeGreaterThan(0);               // rare life alone: they stay
    run(LEVEL_HOLD_MS * 2 + 200);
    run(16);
    expect(ambientState(w).dropped).toEqual(AMBIENT.dropOrder);
    expect(processionsAt(w, DAY + 12).length).toBe(0);
    cost = 0.1;
    run(30000);
    expect(processionsAt(w, DAY + 12).length).toBeGreaterThan(0);
  });
  it('keeps its procession in a crowd already at the walker cap (40 working wells in view)', () => {
    const w = makeTestWorld({ size: 64, gold: 5000, fertile: [] });
    for (let y = 2; y < 62; y += 4) setRoad(w, 0, y, 63, y);
    for (let y = 2; y < 62; y += 4) for (let x = 1; x < 63; x += 6) addRaw(w, 'well', x, y + 1);
    addRaw(w, 'temple', 12, 3);
    staffAll(w);
    w.day = DAY;
    w.danger.festivalDay = DAY;
    const all = walkersAt(w, DAY + 12);
    expect(all.filter((wk) => wk.id < PROCESSION_ID_BASE).length).toBe(WALKER_CAP);   // the services alone fill the cap
    expect(all.filter((wk) => wk.id >= PROCESSION_ID_BASE).length).toBeGreaterThan(0);
    const view = walkersAt(w, DAY + 12, { x0: 0, y0: 0, x1: 63, y1: 63 });
    expect(view.filter((wk) => wk.id >= PROCESSION_ID_BASE).length).toBeGreaterThan(0);
  });
  it('walks under every Motion level: a layer switched off after the budget dropped everything does not leave the procession dropped', () => {
    const { w } = street();
    let cost = 3, t = 0, now = 0, on = true;
    const a = createAmbient({ enabled: () => on, level: () => 'full', clock: () => (t += cost) });
    const run = (ms) => { for (let n = 0; n < ms; n += 16) { now += 16; const g = makeDraw(makeCanvas(16, 16).getContext('2d'), 1); a.draw(g, w, { x0: 0, y0: 0, x1: 31, y1: 31 }, now); drawAmbientLate(g); } };
    run(LEVEL_HOLD_MS * 3 + 400);
    run(16);
    expect(ambientState(w).dropped).toEqual(AMBIENT.dropOrder);
    expect(processionsAt(w, DAY + 12).length).toBe(0);
    on = false;                                                                  // Motion Still: the layer does not draw at all
    run(16);
    expect(ambientState(w).dropped).toEqual([]);
    expect(processionsAt(w, DAY + 12).length).toBeGreaterThan(0);
  });
  it('draws its figures through the walker slots in the depth pass', () => {
    const { w } = street();
    const renderer = createRenderer({ canvas: makeCanvas(400, 300), dpr: 1 });
    const cam = createCamera({ x: 13, y: 10, zoom: 1 });
    const view = { width: 400, height: 300 };
    const plain = renderer.renderFrame(w, cam, { view, walkers: [] }).sprites;
    const list = processionsAt(w, DAY + 12);
    const withThem = renderer.renderFrame(w, cam, { view, walkers: list }).sprites;
    expect(withThem - plain).toBe(list.length);
    expect(['priest', 'nosuch'].map(figureKind)).toEqual(['priest', 'priest']);   // a figure the registry lacks walks as a priest
  });
});

describe('s4 motion procession scene', () => {
  it('holds a festival on the seed-11 sample city and frames its carried shrine out on the road', async () => {
    const shell = await mountShell(390, 844);
    const history = fakeHistory();
    const noStorage = { getItem: () => null, setItem: () => {} };
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''),
      now: () => 0, clock: () => 1760000000000, storage: noStorage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      const g = api.startGame(deserialize(serialize(buildSampleCity(createWorld({ seed: 11 })))));
      const said = await devScene(api, 'procession');
      const [, id, , day, , n] = said.split(' ');
      const temple = g.world.buildings[Number(id)];
      expect([temple.type, Number(day) < g.world.day, Number(n)]).toEqual(['temple', true, festivalSize(g.world)]);
      const shrine = processionsAt(g.world, g.world.day).find((wk) => wk.id === PROCESSION_ID_BASE + temple.id * 16 + PROCESSION.order.indexOf('shrine'));
      expect([Boolean(shrine), g.cam.zoom]).toEqual([true, 1.5]);
      expect([Math.abs(g.cam.x - shrine.x) < 4, Math.abs(g.cam.y - shrine.y) < 4]).toEqual([true, true]);   // the view is on it
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
  });
});
