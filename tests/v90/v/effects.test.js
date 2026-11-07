// Version 9.0 Track V (rulings 1600-1619): the frame's caps and each new effect's drawing, as the drawing calls it makes (the existing effect tests'
// way), its caps, and the dropper's order, hold and restore. Every effect is Full only (ruling 1601): there is no Gentle or Still form to test.
import { describe, it, expect } from '../../harness.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createRenderer, DPR_CAP } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { createFrameGate, smokeBase, SMOKE_FROM, V90_SMOKE, drawFlow, FLOW, riverRows } from '../../../src/render/ambient.js';
import { createGameLoop } from '../../../src/render/loop.js';
import { ART } from '../../../src/render/art/registry.js';
import { walkSlotFor, stepped, WALK, WALK_VARIANTS, FIGURE_KINDS, UNIT_KINDS, FACES_LEFT } from '../../../src/render/art/figures.js';
import { unitsAt, UNIT_ID_BASE, GLIDE_DAYS, fightOf } from '../../../src/render/units.js';
import { noteFrameTime, frameTimeOf } from '../../../src/render/v90/clock.js';
import { noteBuilt, noteUpgrade, scaffoldsAt, drawScaffold, resetScaffolds, SCAFFOLD, poleHeight } from '../../../src/render/v90/scaffold.js';
import { beatenRaidOnMap, drawRaidMoment } from '../../../src/render/v90/raidMoment.js';
import { momentOf, startMoment, endMoment } from '../../../src/render/v90/moment.js';
import { dustSources, drawDust, DUST, firesFought, drawFireFought, festiveParts, drawFestive, cloudsAt, drawWeather, WEATHER, desertEdge } from '../../../src/render/v90/layers.js';
import { drawWake } from '../../../src/render/v90/wakes.js';
import { createDropper, v90Dropper, resetV90Dropper, V90_HOLD_MS, V90_RESTORE_MS } from '../../../src/render/v90/dropper.js';
import { drawV90, effectsV90 } from '../../../src/render/v90/effects.js';
import { createEffects } from '../../../src/render/effects.js';
import { AMBIENT } from '../../../src/data/ambient.js';
import { MOMENT } from '../../../src/data/battle.js';
import { SEASONS } from '../../../src/data/tips.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { riverWorld } from '../../helpers/renderWorld.js';
import { drawLight, setLightClock } from '../../../src/render/light.js';
import { LIGHT } from '../../../src/data/seasons.js';
import { DEFAULT_SETTINGS } from '../../../src/ui/settings.js';

const ALL = { x0: 0, y0: 0, x1: 31, y1: 31 };
function spyDraw() {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = [];
  for (const k of ['line', 'stroke', 'poly', 'polys', 'radial', 'path', 'circ', 'ell']) {
    const f = g[k];
    g[k] = (...a) => { calls.push({ k, a }); return f(...a); };
  }
  return { g, calls };
}
const raidWorld = (spots) => {
  const w = makeTestWorld();
  w.raid.active = { index: 1, entry: { x: 31, y: 10 }, dir: 'east', size: spots.length, phase: 'march', raiders: spots.map(([x, y], i) => ({ id: i + 1, kind: 'foot', x, y, hp: 10 })), shots: [], struck: [], fires: [], burnedKinds: [], towerIds: [] };
  return w;
};

describe('v90 v the frame', () => {
  it('draws the map canvas at most at DPR 2: a DPR-3 phone gets a 2x canvas (V0a, ruling 1600)', () => {
    expect(DPR_CAP).toBe(2);
    const canvas = makeCanvas(10, 10);
    const r = createRenderer({ canvas, dpr: 3, spriteCache: createSpriteCache(), maxBakesPerFrame: Infinity });
    r.renderFrame(makeTestWorld(), createCamera({ x: 16, y: 16, zoom: 1 }), { view: { width: 200, height: 100 } });
    expect([r.dpr, canvas.width, canvas.height]).toEqual([2, 400, 200]);
    const one = makeCanvas(10, 10);
    createRenderer({ canvas: one, dpr: 1.5 }).renderFrame(makeTestWorld(), createCamera({ x: 16, y: 16, zoom: 1 }), { view: { width: 200, height: 100 } });
    expect(one.width).toBe(300);                                                    // under the cap: as before
  });
  it('draws a running game at most 60 frames a second: a 120 Hz screen draws every second frame, a 60 Hz one all (V0b), and paused and idle 30 as before', () => {
    const count = (hz, frames, paused, from = 0, gate = createFrameGate()) => { let n = 0; for (let i = 0; i < frames; i++) if (gate.allow(from + (i * 1000) / hz, paused)) n++; return n; };
    expect([AMBIENT.runningFpsCap, count(120, 120, false), count(60, 60, false)]).toEqual([60, 60, 60]);
    // ruling 1637: the due time steps by a period, so 90, 120 and 144 Hz screens each draw close to 60 a second (not 45 or 72)
    for (const hz of [90, 120, 144]) {
      const n = count(hz, hz * 4, false) / 4;
      expect([hz, n >= 55 && n <= 61]).toEqual([hz, true]);
    }
    let jitter = 0;                                                                // a 60 Hz screen whose frames come up to 1.5 ms early or late still draws nearly all
    const gate60 = createFrameGate();
    let drawn60 = 0;
    for (let i = 0; i < 240; i++) { jitter = (jitter * 7 + 3) % 11; if (gate60.allow((i * 1000) / 60 + (jitter / 10) * 3 - 1.5, false)) drawn60++; }
    expect(drawn60 / 4 >= 55 && drawn60 / 4 <= 61).toBe(true);
    const gate = createFrameGate();
    gate.noteInput(0);
    expect(count(120, 120, true, 0, gate)).toBe(60);                               // paused but just touched: the running cap
    expect(count(60, 60, true, 5000, gate)).toBe(30);                              // paused and idle: 30
  });
  it('runs the sim on every frame even when the gate holds the drawing back, and notes the frame\'s game time for the effects', () => {
    const world = makeTestWorld();
    world.speed = 1;
    let drawn = 0;
    const gate = createFrameGate();
    const loop = createGameLoop({ world, render: () => { drawn++; }, allowFrame: (t) => gate.allow(t, false), raf: () => 0, caf: () => {} });
    for (let i = 0; i <= 240; i++) loop.tick(i * (1000 / 120));
    expect([world.day, drawn]).toEqual([2, 121]);                                  // two seconds at 1x: two days; 120 Hz drawn at 60
    expect(frameTimeOf(world)).toBeGreaterThanOrEqual(2);
    noteFrameTime(world, 1.5);
    expect(frameTimeOf(world)).toBe(world.day);                                    // a stale note (another day) reads the world's day
  });
});

describe('v90 v walk cycle and facing (V1)', () => {
  it('gives every walking kind two step poses and a mirrored copy of each, and the chariots and the elephant a mirrored copy', () => {
    for (const kind of [...FIGURE_KINDS, ...UNIT_KINDS, 'archer', 'raider_archer', 'raider_boat', 'chief', 'raider_sack']) {
      for (const v of WALK_VARIANTS) expect([kind, v, Boolean(ART[`fig.${kind}${v}`])]).toEqual([kind, v, true]);
    }
    for (const kind of ['chariot', 'raider_chariot', 'raider_elephant']) expect([kind, Boolean(ART[`fig.${kind}.m`]), Boolean(ART[`fig.${kind}.w0`])]).toEqual([kind, true, false]);
    expect(ART['fig.raider_elephant.m'].bounds).toEqual([-28, -64, 24, 10]);       // the box mirrored with the drawing
  });
  it('picks the pose from the distance walked, mirrored when heading left on screen, and the plain drawing for a figure standing', () => {
    const o = (x, y, dir, extra = {}) => ({ slot: 'fig.citizen', x, y, dir, ...extra });
    const poses = [];
    for (let x = 3.5; x < 5.5; x += 0.25) poses.push(walkSlotFor(o(x, 7.5, 1), ART));
    expect(poses).toEqual(['fig.citizen.w0', 'fig.citizen.w0', 'fig.citizen.w1', 'fig.citizen.w1', 'fig.citizen.w0', 'fig.citizen.w0', 'fig.citizen.w1', 'fig.citizen.w1']);
    expect(WALK.stepsPerTile).toBe(2);                                              // a step change every half tile
    expect([walkSlotFor(o(3.5, 7.5, 3), ART), walkSlotFor(o(3.5, 7.5, 2), ART), walkSlotFor(o(3.5, 7.5, 0), ART)]).toEqual(['fig.citizen.w0m', 'fig.citizen.w0m', 'fig.citizen.w0']);
    expect([walkSlotFor(o(3.5, 7.5, 1, { stand: true }), ART), walkSlotFor(o(3.5, 7.5, 3, { stand: true }), ART)]).toEqual(['fig.citizen', 'fig.citizen.m']);
    expect(walkSlotFor({ slot: 'fig.raider_chariot', x: 3, y: 3, dir: 1 }, ART)).toBe('fig.raider_chariot.m');   // drawn facing left: mirrored heading right
    expect(FACES_LEFT.has('fig.raider_chariot')).toBe(true);
    expect(walkSlotFor({ slot: 'fig.soldier_a_r', x: 3, y: 3, dir: 3 }, ART)).toBe('fig.soldier_a_r');           // a fighting pose keeps its own facing
    expect(walkSlotFor({ slot: 'fig.cart_grain', x: 3, y: 3, dir: 3 }, ART)).toBe('fig.cart_grain');
  });
  it('steps by moving the feet out (the stride) or in with a pixel\'s bob (the passing step), never the shadow', () => {
    const a = spyDraw(), b = spyDraw();
    stepped(a.g, 0).line([0.9, 0], [0.9, -3.4], '#000');
    stepped(b.g, 1).line([0.9, 0], [0.9, -3.4], '#000');
    expect(a.calls[0].a.slice(0, 2)).toEqual([[0.9 + WALK.spread, 0], [0.9, -3.4]]);
    expect(b.calls[0].a.slice(0, 2)).toEqual([[0.9 + WALK.together, 0], [0.9, -3.4 - WALK.bob]]);
    stepped(a.g, 1).ell([0, 0], 3, 1.1, '#000');
    expect(a.calls[1].a[0]).toEqual([0, 0]);                                        // the shadow stays on the ground
  });
  it('draws a walker heading left from its mirrored slot, and warms every walk slot of a kind at once', () => {
    const counter = {}, cache = createSpriteCache({ counter }), got = [];
    const get = cache.get;
    cache.get = (slot, ...r) => { got.push(slot); return get(slot, ...r); };
    const world = makeTestWorld();
    const r = createRenderer({ canvas: makeCanvas(10, 10), dpr: 1, spriteCache: cache, maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    r.renderFrame(world, cam, { view: { width: 300, height: 200 }, walkers: [{ id: 1, kind: 'water', x: 16.5, y: 16.5, dir: 3 }] });
    for (const v of WALK_VARIANTS) expect(got.includes(`fig.water${v}`)).toBe(true);
    const misses = counter.misses;
    r.renderFrame(world, cam, { view: { width: 300, height: 200 }, walkers: [{ id: 1, kind: 'water', x: 16.75, y: 16.5, dir: 1 }] });
    expect(counter.misses).toBe(misses);                                            // turned and stepped: no new sprite
  });
});

describe('v90 v units in step (V2)', () => {
  it('reaches the sim\'s tile GLIDE_DAYS into the day it moved, steps while gliding and stands once there', () => {
    const w = raidWorld([[20, 10]]);
    unitsAt(w, 4.2);
    w.raid.active.raiders[0].x = 19;
    w.day = 5;
    const at = (t) => unitsAt(w, t).find((u) => u.id === UNIT_ID_BASE + 1);
    expect(GLIDE_DAYS).toBe(0.6);
    expect([at(5.05).stand, Math.round(at(5 + GLIDE_DAYS).x * 100) / 100, at(5.7).stand, at(5.9).x]).toEqual([undefined, 19.5, true, 19.5]);
  });
});

describe('v90 v a building goes up (V3)', () => {
  it('stands a placed building behind scaffold poles for one game day with a dust puff, an upgrade for half a day; drawing only', () => {
    const w = makeTestWorld();
    resetScaffolds(w);
    setRoad(w, 10, 9, 20, 9);
    const b = addRaw(w, 'potter', 12, 10);
    noteFrameTime(w, w.day + 0.1);
    const fx = createEffects({ motionLevel: 'full' });
    fx.draw(spyDraw().g, 0, w);                                                    // the game's effects have drawn this city
    fx.rise(b.id, b.x, b.y, b.w, b.d, 0);                                           // the interface's own call on a placing
    const s = scaffoldsAt(w);
    expect([s.length, s[0].b.id, s[0].days]).toEqual([1, b.id, SCAFFOLD.placedDays]);
    const spy = spyDraw();
    drawScaffold(spy.g, w, s[0]);
    expect([spy.calls.filter((c) => c.k === 'stroke').length, spy.calls.filter((c) => c.k === 'circ').length]).toEqual([1, 5]);   // poles, ledgers and braces in one stroke; the puff
    const before = JSON.stringify(w.buildings[b.id]);
    noteFrameTime(w, w.day + 0.6);
    const later = scaffoldsAt(w)[0], spy2 = spyDraw();
    drawScaffold(spy2.g, w, later);
    expect([Math.round(later.t * 10) / 10, spy2.calls.filter((c) => c.k === 'circ').length]).toEqual([0.5, 0]);   // the puff is over; the poles stand
    w.day += 1;
    noteFrameTime(w, w.day + 0.15);
    expect(scaffoldsAt(w)).toEqual([]);                                             // a day on: gone
    expect(JSON.stringify(w.buildings[b.id])).toBe(before);
    const h = addRaw(w, 'house', 16, 10, { tier: 2, residents: 3 });
    noteUpgrade(w, h);
    noteFrameTime(w, w.day + 0.4);
    expect(scaffoldsAt(w).map((k) => [k.b.id, k.days])).toEqual([[h.id, SCAFFOLD.upgradeDays]]);
    noteFrameTime(w, w.day + 0.55);
    expect(scaffoldsAt(w)).toEqual([]);
  });
  it('holds at most eight sites at once, the newest, and none on a monument or rubble, or once the building is gone', () => {
    const w = makeTestWorld();
    resetScaffolds(w);
    noteFrameTime(w, w.day);
    const ids = [];
    for (let i = 0; i < 10; i++) { const b = addRaw(w, 'well', 2 + (i % 5) * 2, 2 + Math.floor(i / 5) * 2); ids.push(b.id); noteUpgrade(w, b); w.day += 0; }
    expect(scaffoldsAt(w).length).toBe(SCAFFOLD.cap);
    const rubble = addRaw(w, 'rubble', 20, 20);
    noteUpgrade(w, rubble);
    expect(scaffoldsAt(w).some((s) => s.b.id === rubble.id)).toBe(false);
    resetScaffolds(w);
    noteBuilt(w, ids[0]);
    delete w.buildings[ids[0]];
    expect(scaffoldsAt(w)).toEqual([]);
  });
  it('keeps a placing to the city it was made in: a city loaded after it never scaffolds its own building of the same id (ruling 1614)', () => {
    const a = makeTestWorld(), b = makeTestWorld();
    const pa = addRaw(a, 'well', 4, 4), pb = addRaw(b, 'well', 6, 6);
    expect(pa.id).toBe(pb.id);
    const fx = createEffects({ motionLevel: 'full' });
    fx.rise(pa.id, 4, 4, 1, 1, 0);                                                  // no frame drawn yet: no city to scaffold
    expect([scaffoldsAt(a).length, scaffoldsAt(b).length]).toEqual([0, 0]);
    fx.draw(spyDraw().g, 0, a);
    fx.rise(pa.id, 4, 4, 1, 1, 0);
    expect([scaffoldsAt(a).length, scaffoldsAt(b).length]).toEqual([1, 0]);         // the city loaded next has none
    for (let t = 0; t < 30000; t += 100) v90Dropper.account(50, t);
    expect(v90Dropper.stats.dropped.length).toBeGreaterThan(0);
    createEffects({ motionLevel: 'full' });                                         // a new city's effects: V's dropper starts afresh
    expect(v90Dropper.stats.dropped).toEqual([]);
  });
  it('makes the poles nine tenths of the art\'s height, from 8 to 48 art px', () => {
    expect([poleHeight(20), poleHeight(40), poleHeight(4), poleHeight(80)]).toEqual([18, 36, SCAFFOLD.minHeight, SCAFFOLD.maxHeight]);
    expect([SCAFFOLD.share, SCAFFOLD.minHeight, SCAFFOLD.maxHeight]).toEqual([0.9, 8, 48]);
  });
  it('draws the poles in the building\'s depth slot, so a building standing in front is drawn over them (ruling 1612)', () => {
    const w = makeTestWorld();
    const back = addRaw(w, 'potter', 14, 14), front = addRaw(w, 'granary', 17, 17);
    noteFrameTime(w, w.day + 0.1);
    noteUpgrade(w, back);
    const log = [], cache = createSpriteCache(), get = cache.get;
    cache.get = (slot, ...r) => { log.push(slot); return get(slot, ...r); };
    const canvas = makeCanvas(10, 10);
    const r = createRenderer({ canvas, dpr: 1, spriteCache: cache, maxBakesPerFrame: Infinity });
    const ctx = canvas.getContext('2d'), stroke = ctx.stroke.bind(ctx);
    ctx.stroke = (...a) => { if (log.length) log.push('STROKE'); return stroke(...a); };   // a stroke on the map's canvas once the sprites have begun
    r.renderFrame(w, createCamera({ x: 16, y: 16, zoom: 1 }), { view: { width: 400, height: 300 } });
    const at = (k) => log.findIndex((s) => s.startsWith(k));
    expect([at('potter') >= 0, at('granary') >= 0, at('STROKE') >= 0]).toEqual([true, true, true]);
    expect(at('potter') < at('STROKE') && at('STROKE') < at('granary')).toBe(true);   // the back building, its poles, then the one in front
  });
});

describe('v90 v smoke from every workshop (V4)', () => {
  it('puffs from the weaver, jeweller and builders\' guild while staffed and working, and they go with V\'s dropper', () => {
    expect(['weaver', 'jeweller', 'builders_guild'].every((t) => SMOKE_FROM[t] && V90_SMOKE.has(t))).toBe(true);
    const w = makeTestWorld();
    setRoad(w, 10, 9, 20, 9);
    const wv = addRaw(w, 'weaver', 12, 10);
    expect(smokeBase(w, wv)).toBe(null);                                            // unstaffed: cold
    staffAll(w);
    expect(Array.isArray(smokeBase(w, wv))).toBe(true);
    wv.blocked = 'no_input';
    expect(smokeBase(w, wv)).toBe(null);
    wv.blocked = null;
    const d = createDropper({ budgetMs: 1 });
    for (let t = 0; t < 30000; t += 100) d.account(50, t);
    expect(d.stats.dropped.includes('smoke')).toBe(true);
    const pt = addRaw(w, 'potter', 15, 10);
    staffAll(w);
    resetV90Dropper();
    for (let t = 0; t < 30000; t += 100) v90Dropper.account(50, t);
    expect([smokeBase(w, wv), Array.isArray(smokeBase(w, pt))]).toEqual([null, true]);   // the potter is ambient's own: it stays
    resetV90Dropper();
  });
});

describe('v90 v the beaten raid on the map (V5)', () => {
  it('stands at the last fight for the moment\'s days: the fallen banner, the gold sparkle, the dust to the edge, the soldiers\' raised spears', () => {
    const w = raidWorld([[16, 10], [16, 11]]);
    w.soldiers = [{ id: 9, kind: 'soldier', barracks: 999, x: 15, y: 10, hp: 12, task: 'out' }];
    unitsAt(w, 3, null, { now: 0 });                                                // they meet: blows traded at the spot
    w.raid.active.raiders = [{ id: 1, kind: 'foot', x: 16, y: 10, hp: 10, chief: true }];
    unitsAt(w, 3.1, null, { now: 10 });                                             // one raider falls
    w.raid.active = null;
    w.raid.last = { won: true, day: w.day };
    beatenRaidOnMap(w, { won: true, dir: 'east', chiefsFell: 0 });
    unitsAt(w, 3.2, null, { now: 20 });                                             // the last one falls, seen the frame after
    const spy = spyDraw();
    noteFrameTime(w, w.day + 0.5);
    expect(drawRaidMoment(spy.g, w, ALL, 1000)).toBe(true);
    const m = momentOf(w);
    expect([Math.round(m.x), m.edge.x]).toEqual([16, 31]);                          // east: the dust runs to the east edge
    expect(spy.calls.filter((c) => c.k === 'poly').length).toBe(5);                 // five gold diamonds
    expect(spy.calls.filter((c) => c.k === 'circ').length).toBe(5);                 // the dust
    const cheer = unitsAt(w, 3.3, null, { now: 30 }).find((u) => u.id === UNIT_ID_BASE + 9);
    expect(cheer.kind).toBe('soldier_cheer');
    w.day += MOMENT.days;
    expect([momentOf(w), drawRaidMoment(spyDraw().g, w, ALL, 0)]).toEqual([null, false]);
  });
  it('notes the fight and a fall where the sim has the units, not where their glide is drawn (ruling 1613)', () => {
    const w = raidWorld([[17, 10]]);
    w.soldiers = [{ id: 9, kind: 'soldier', barracks: 999, x: 15, y: 10, hp: 12, task: 'back' }];
    unitsAt(w, 3.2, null, { now: 0 });
    w.raid.active.raiders[0].x = 15;                                                // the sim moves the raider two tiles, onto the soldier's
    w.day = 4;
    const drawn = unitsAt(w, 4.3, null, { now: 10 }).find((u) => u.id === UNIT_ID_BASE + 1);
    expect(Math.round(drawn.x * 100) / 100).toBe(16.5);                              // half way through its glide, a tile behind the sim
    expect(fightOf(w).clash).toEqual({ x: 15.5, y: 10.5, day: 4 });                // the clash at the sim's spots
    w.raid.active.raiders = [];
    unitsAt(w, 4.35, null, { now: 20 });
    expect([fightOf(w).fall.x, fightOf(w).fall.y]).toEqual([15.5, 10.5]);          // and the fall where the sim had it
  });
  it('has nothing on the map for a lost raid, and ends when the next raid is warned', () => {
    const w = makeTestWorld();
    beatenRaidOnMap(w, { won: false, dir: 'west' });
    expect(momentOf(w)).toBe(null);
    startMoment(w, { day: w.day, x: 5, y: 5, edge: { x: 0, y: 5 }, chief: null });
    expect(Boolean(momentOf(w))).toBe(true);
    w.raid.warning = { day: w.day };
    expect(momentOf(w)).toBe(null);
    endMoment(w);
  });
});

describe('v90 v dust, fire fought, the festival and the weather (V6, V7, V9, V10)', () => {
  it('kicks up dust behind raiders walking and carts on sand, not behind one standing, fighting or on green land, at most DUST.cap', () => {
    const w = makeTestWorld();
    const u = (id, kind, extra = {}) => ({ id: UNIT_ID_BASE + id, kind, x: 20.5, y: 5.5, dir: 1, ...extra });
    const list = [u(1, 'raider'), u(2, 'raider', { stand: true }), u(3, 'raider_a_r'), u(4, 'soldier'),
      { id: 3000001, kind: 'cart_grain', x: 20.5, y: 6.5, dir: 1, cart: true }, { id: 3000002, kind: 'cart_grain', x: 2.5, y: 6.5, dir: 1, cart: true }];
    expect(w.terrain[idx(32, 2, 6)]).toBe(T.FERTILE);
    expect(dustSources(w, list).map((s) => s.id)).toEqual([UNIT_ID_BASE + 1, 3000001]);
    const many = Array.from({ length: 50 }, (_, i) => u(i + 10, 'raider'));
    expect(dustSources(w, many).length).toBe(DUST.cap);
    const spy = spyDraw();
    drawDust(spy.g, w, list, ALL, 500);
    expect(spy.calls.filter((c) => c.k === 'circ').length).toBe(4);                // two puffs each
  });
  it('throws water from a staffed firehouse that reaches a burning building, and lets steam rise where it went out', () => {
    const w = makeTestWorld();
    setRoad(w, 8, 9, 24, 9);
    const fh = addRaw(w, 'firehouse', 10, 10);
    const b = addRaw(w, 'potter', 14, 10);
    staffAll(w);
    b.fire = { stage: 'blaze', days: 1, need: 2, fought: 0 };
    const f = firesFought(w, ALL);
    expect(f.out.map((k) => [k.b.id, k.f.id])).toEqual([[b.id, fh.id]]);
    const spy = spyDraw();
    drawFireFought(spy.g, w, ALL, 100);
    expect([spy.calls.filter((c) => c.k === 'stroke').length, spy.calls.filter((c) => c.k === 'circ').length]).toEqual([2, 2]);   // two arcs, a drop on each
    b.fire = null;
    const spy2 = spyDraw();
    drawFireFought(spy2.g, w, ALL, 200);
    expect(spy2.calls.filter((c) => c.k === 'circ').length).toBe(3);               // the steam
    fh.staff = 0;
    b.fire = { stage: 'blaze', days: 1, need: 2, fought: 0 };
    expect(firesFought(w, ALL).out).toEqual([]);                                    // no staff, no water
  });
  it('hangs lamps on a festival\'s temples at night and lets petals fall round its procession; pennants on the palace for a Victory', () => {
    const w = makeTestWorld();
    setRoad(w, 8, 9, 24, 9);
    const t = addRaw(w, 'temple', 12, 10);
    const pal = addRaw(w, 'palace', 18, 10);
    staffAll(w);
    expect(festiveParts(w, [], ALL)).toEqual({ temples: [], palaces: [], marchers: [] });
    w.danger.festivalDay = w.day;
    w.raid.last = { won: true, day: w.day };
    const marchers = [{ id: 200000 + 16 * t.id, kind: 'standard', x: 13, y: 9.5, dir: 1 }, { id: 200001 + 16 * t.id, kind: 'dancer', x: 12.2, y: 9.5, dir: 1 }];
    const parts = festiveParts(w, marchers, ALL);
    expect([parts.temples.map((b) => b.id), parts.palaces.map((b) => b.id), parts.marchers.length]).toEqual([[t.id], [pal.id], 2]);
    const night = (LIGHT.day + LIGHT.dusk + LIGHT.night / 2) * LIGHT.cycleMs, canvas = makeCanvas(64, 64);
    setLightClock(w, night, 0);
    drawLight(makeDraw(canvas.getContext('2d'), 1), w, ALL, { ctx: canvas.getContext('2d'), W: 64, H: 64, ox: 0, oy: 0, dpr: 1 }, 0, 'full', DEFAULT_SETTINGS);
    const spy = spyDraw();
    drawFestive(spy.g, w, marchers, ALL, 1300);
    expect(spy.calls.filter((c) => c.k === 'ell').length).toBe(3 + 4);             // three lamps, two petals for each marcher
    expect(spy.calls.filter((c) => c.k === 'poly').length).toBe(3);                // three pennants
    setLightClock(w, 0, 0);
    drawLight(makeDraw(canvas.getContext('2d'), 1), w, ALL, { ctx: canvas.getContext('2d'), W: 64, H: 64, ox: 0, oy: 0, dpr: 1 }, 0, 'full', DEFAULT_SETTINGS);
    const day = spyDraw();
    drawFestive(day.g, w, marchers, ALL, 1300);
    expect(day.calls.filter((c) => c.k === 'ell').length).toBe(4);                 // by day: the petals, no lamps
  });
  it('drifts three cloud shadows each under a quarter dark, and in Shemu only gusts of sand along the desert edge, at most twelve', () => {
    const w = makeTestWorld();
    expect(WEATHER.alpha).toBeLessThan(0.25);
    expect(cloudsAt(w, ALL, 0).length).toBe(3);
    const a = cloudsAt(w, ALL, 0)[0], b = cloudsAt(w, ALL, 4000)[0];
    expect(Math.round(Math.hypot(b.x - a.x, b.y - a.y) * 100) / 100).toBe(WEATHER.tilesPerSecond * 4);
    expect(desertEdge(w).length).toBe(32);                                          // the desert's column beside the green strip
    w.day = SEASONS.indexOf('akhet') * DAYS_PER_MONTH + 3;
    const wet = spyDraw();
    drawWeather(wet.g, w, ALL, 0);
    expect([wet.calls.filter((c) => c.k === 'ell').length, wet.calls.filter((c) => c.k === 'stroke').length]).toEqual([WEATHER.clouds * (2 * WEATHER.soft - 1), 0]);
    for (const c of wet.calls) if (c.k === 'ell') expect(c.a[4].alpha).toBeLessThan(0.25);
    // soft edges: each lobe's layers shrink inward, every layer far fainter than the whole
    const ells = wet.calls.filter((c) => c.k === 'ell');
    expect(ells[1].a[1]).toBeLessThan(ells[0].a[1]);
    for (const c of ells) expect(c.a[4].alpha).toBeLessThan(WEATHER.alpha / 2);
    w.lesson = true;                                                                // no clouds over the lesson's dimming
    const les = spyDraw();
    drawWeather(les.g, w, ALL, 0);
    expect(les.calls.filter((c) => c.k === 'ell').length).toBe(0);
    w.lesson = false;
    w.day = SEASONS.indexOf('shemu') * DAYS_PER_MONTH + 3;
    let gusts = 0;
    for (let now = 900; now < 40000; now += 1800) {                                 // mid-window, where a gust is at its fullest
      const hot = spyDraw();
      drawWeather(hot.g, w, ALL, now);
      for (const c of hot.calls) if (c.k === 'stroke') gusts = Math.max(gusts, c.a[0].length / 2);
    }
    expect(gusts > 0 && gusts <= WEATHER.gusts).toBe(true);
  });
});

describe('v90 v wakes and the river (V8, V11)', () => {
  it('trails a V behind a boat, the other way to its heading', () => {
    const spy = spyDraw();
    drawWake(spy.g, 10, 10, 1, 0, 0);
    const [first] = spy.calls;
    expect(first.k).toBe('stroke');
    const [, stern] = first.a[0];
    const ends = [first.a[0][0][1], first.a[0][2][1]];
    for (const e of ends) expect(e[0] < stern[1][0]).toBe(true);                  // heading +x (right and down on screen): the V opens back left
  });
  it('draws the river\'s current in three alpha steps over its rows in view, drifting downstream', () => {
    const w = riverWorld();
    const rows = riverRows(w, 0, 31), spy = spyDraw();
    drawFlow(spy.g, w, rows, ALL, 1000);
    const strokes = spy.calls.filter((c) => c.k === 'stroke');
    expect(strokes.length).toBeLessThanOrEqual(3);
    expect(strokes.reduce((n, c) => n + c.a[0].length / 2, 0)).toBe(rows.size * FLOW.perRow);
  });
});

describe('v90 v the dropper (ruling 1602)', () => {
  it('sheds the river\'s flow, the weather, the dust, the smoke and the festival in that order, one at a time, and brings them back after a calm spell', () => {
    expect(AMBIENT.v90DropOrder).toEqual(['flow', 'weather', 'dust', 'smoke', 'festival']);
    expect(AMBIENT.v90BudgetMs).toBe(2);
    const d = createDropper();
    d.account(1, 0);
    let t = 0;
    const until = (n) => { while (d.stats.dropped.length < n && t < 60000) { t += 100; d.account(5, t); } return t; };
    const first = until(1);
    expect([d.stats.dropped, first >= V90_HOLD_MS]).toEqual([['flow'], true]);
    const second = until(2);
    expect([d.stats.dropped, second - first >= V90_HOLD_MS]).toEqual([['flow', 'weather'], true]);
    until(5);
    expect([d.off('festival'), d.off('flow')]).toEqual([true, true]);
    const calm = t;
    while (d.stats.dropped.length === 5 && t < calm + 60000) { t += 100; d.account(0.2, t); }
    expect([d.stats.dropped.length, t - calm >= V90_RESTORE_MS]).toEqual([4, true]);
    expect(d.off('festival')).toBe(false);                                          // the last shed is the first back
  });
  it('keeps every layer drawn while it holds the budget, and draws the shed ones no more', () => {
    const w = makeTestWorld();
    const off = new Set(['weather']);
    const spy = spyDraw();
    drawV90(spy.g, w, { range: ALL, now: 0 }, (k) => off.has(k));
    expect(spy.calls.filter((c) => c.k === 'ell').length).toBe(0);                // the clouds are shed
    const on = spyDraw();
    drawV90(on.g, w, { range: ALL, now: 0 });
    expect(on.calls.filter((c) => c.k === 'ell').length).toBe(WEATHER.clouds * (2 * WEATHER.soft - 1));   // the soft clouds' layers
    resetV90Dropper();
    effectsV90(spyDraw().g, { width: 100, height: 100 }, w, { range: ALL, now: 0 });
    expect(v90Dropper.stats.dropped).toEqual([]);
  });
});
