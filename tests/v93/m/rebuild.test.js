import { describe, it, expect } from '../../harness.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createEffects } from '../../../src/render/effects.js';
import { REBUILD_DAYS } from '../../../src/render/looks.js';
import { noteFrameTime } from '../../../src/render/v90/clock.js';
import { scaffoldsAt, watchLooks, drawScaffold, resetScaffolds, SCAFFOLD, LOOK_SCAFFOLD_DAYS } from '../../../src/render/v90/scaffold.js';
import { noteSweep, sweepAt, drawSweep, bringsNewLook, SWEEP } from '../../../src/render/v93/sweep.js';
import { v90Dropper, resetV90Dropper } from '../../../src/render/v90/dropper.js';
import { drawV90 } from '../../../src/render/v90/effects.js';
import { M93_TEXT } from '../../../src/ui/text.js';

const put = (w, type, x, y) => { const b = makeBuilding(w, type, x, y); insertBuilding(w, b); return b; };
const objs = (...bs) => bs.map((b) => ({ id: b.id }));
function spy() {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1), calls = [];
  for (const k of ['poly', 'circ', 'stroke']) { const f = g[k]; g[k] = (...a) => { calls.push({ k, a }); return f(...a); }; }
  return { g, calls };
}
// a city with a centre house, and a far house 10 tiles out (dMax 10): the front reaches the far one REBUILD_DAYS after a rank-up
const city = () => {
  const w = makeTestWorld();
  resetScaffolds(w);
  const near = put(w, 'house', 20, 10), far = put(w, 'house', 30, 10), other = put(w, 'house', 10, 10);
  noteFrameTime(w, w.day);
  for (const b of [near, far, other]) delete b.day;                     // standing before any rank-up (a placed-after building starts current)
  return { w, near, far, other };
};
const rankUp = (w, id) => { w.milestone = id; w.splits[id] = w.day; };
// play `days` game days in whole-day frames (the sim's day is an integer; a frame sees each), watching the buildings `list` each frame (the renderer's own per-frame call)
const run = (w, days, list) => { for (let d = 0; d < days; d += 1) { w.day += 1; noteFrameTime(w, w.day); watchLooks(w, list); } };

describe('v93 m scaffolds when a building\'s look changes (M.1)', () => {
  it('a building whose front passes shows poles for one day, with no dust', () => {
    const { w, far } = city();
    w.milestone = 'town'; w.splits.town = w.day - 1;                    // Town is a day old
    watchLooks(w, objs(far));                                            // the far house is seen in the Village look
    expect(scaffoldsAt(w)).toEqual([]);
    run(w, REBUILD_DAYS - 2, objs(far));                               // the front is 2 days short of it
    expect(scaffoldsAt(w)).toEqual([]);
    let s = [];
    for (let i = 0; i < 12 && !s.length; i++) { run(w, 1, objs(far)); s = scaffoldsAt(w); }   // then it reaches it
    expect(w.day - w.splits.town <= REBUILD_DAYS).toBe(true);
    expect([s.length, s[0].b.id, s[0].days, s[0].look]).toEqual([1, far.id, LOOK_SCAFFOLD_DAYS, true]);
    const sp = spy();
    drawScaffold(sp.g, w, s[0]);
    expect(sp.calls.filter((c) => c.k === 'circ').length).toBe(0);      // it has stood all along: no dust
    w.day += 1.5; noteFrameTime(w, w.day);
    expect(scaffoldsAt(w)).toEqual([]);                                  // a day on: gone
  });
  it('a building off-screen when its front passes shows none when it is seen later', () => {
    const { w, near, far } = city();
    rankUp(w, 'town');
    watchLooks(w, objs(near, far));                                      // both seen now: the far one is still Village
    run(w, REBUILD_DAYS + 1, objs(near));                              // only the near one is on screen while the front passes the far one
    watchLooks(w, objs(far));                                          // the far one is scrolled to, days after its front passed
    expect(scaffoldsAt(w).some((s) => s.b.id === far.id)).toBe(false);
  });
  it('a load, a rank inside the same look, and a first sight raise no poles', () => {
    const { w, far } = city();
    w.milestone = 'town'; w.splits.town = w.day - 100;
    watchLooks(w, objs(far));                                            // first sight: fully rebuilt, noted silently
    w.milestone = 'market_town'; w.splits.market_town = w.day;
    run(w, 3, objs(far));
    expect(scaffoldsAt(w)).toEqual([]);
  });
  it('on-screen sites go first within the 8-site cap', () => {
    const w = makeTestWorld();
    resetScaffolds(w);
    const hs = [];
    for (let i = 0; i < 12; i++) hs.push(put(w, 'house', 2 + (i % 6) * 4, 2 + Math.floor(i / 6) * 4));
    noteFrameTime(w, w.day);
    watchLooks(w, objs(...hs));                                          // all seen in the Village look
    w.milestone = 'city'; w.splits.town = w.day - 500; w.splits.city = w.day - 500;   // the ranks arrive and every building switches in one frame
    watchLooks(w, objs(...hs));
    expect(scaffoldsAt(w).length).toBe(SCAFFOLD.cap);
    const range = { x0: 21, y0: 0, x1: 30, y1: 8 };                      // only the last column's houses are on screen
    const onScreen = hs.filter((b) => b.x >= 22).map((b) => b.id);
    const shown = scaffoldsAt(w, range);
    expect(shown.length).toBe(SCAFFOLD.cap);
    expect(shown.slice(0, onScreen.length).every((s) => onScreen.includes(s.b.id))).toBe(true);
  });
});

describe('v93 m the gold sweep (M.2)', () => {
  const clocked = (w, now) => { const { g, calls } = spy(); drawV90(g, w, { now }, () => false); return calls; };
  it('knows which ranks bring a new look', () => {
    expect(['town', 'city', 'capital'].map(bringsNewLook)).toEqual([true, true, true]);
    expect(['village', 'market_town', 'great_city', 'great_capital', 'seat'].map(bringsNewLook)).toEqual([false, false, false, false, false]);
  });
  it('spreads one ring from the centre outward over about 3 s, never flashing', () => {
    const { w } = city();
    resetV90Dropper();
    expect(noteSweep(w, 'town', 1000, 'full')).toBe(true);
    const radii = [], alphas = [];
    for (let t = 1000; t < 1000 + SWEEP.ms; t += 100) { const s = sweepAt(w, t); radii.push(s.radius); alphas.push(s.alpha); }
    expect(radii.every((r, i) => i === 0 || r >= radii[i - 1])).toBe(true);
    expect(alphas.every((a, i) => i === 0 || Math.abs(a - alphas[i - 1]) < 0.35)).toBe(true);   // eased, no jumps
    expect(Math.max(...alphas) <= 1 && alphas[0] < 0.2).toBe(true);
    expect(clocked(w, 2000).filter((c) => c.k === 'poly').length).toBe(2);   // the halo and the ring
    expect(sweepAt(w, 1000 + SWEEP.ms + 1)).toBe(null);
    expect(clocked(w, 5000).length).toBe(0);
  });
  it('is skipped under reduced motion and under Gentle', () => {
    const { w } = city();
    const fx = createEffects({ motionLevel: 'still' });
    fx.fromEvents(w, [{ type: 'milestone', id: 'town' }], 1000);
    expect(sweepAt(w, 1500)).toBe(null);
    const gentle = createEffects({ motionLevel: 'gentle' });
    gentle.fromEvents(w, [{ type: 'milestone', id: 'town' }], 1000);
    expect(sweepAt(w, 1500)).toBe(null);
    const full = createEffects({ motionLevel: 'full' });
    full.fromEvents(w, [{ type: 'milestone', id: 'town' }], 1000);
    expect(sweepAt(w, 1500) !== null).toBe(true);
  });
  it('is skipped for a rank inside the same look', () => {
    const { w } = city();
    const fx = createEffects({ motionLevel: 'full' });
    for (const id of ['market_town', 'great_city', 'great_capital', 'seat']) fx.fromEvents(w, [{ type: 'milestone', id }], 1000);
    expect(sweepAt(w, 1500)).toBe(null);
  });
  it('is shed first when the effects run over budget, and never moves the camera or writes the world', () => {
    const { w } = city();
    resetV90Dropper();
    noteSweep(w, 'city', 0, 'full');
    const before = JSON.stringify(w.buildings);
    for (let i = 0; i < 10; i++) v90Dropper.account(5, i * 100);       // a running average well over the budget, before any kind is dropped
    expect(v90Dropper.stats.dropped).toEqual([]);
    expect(clocked(w, 1500).length).toBe(0);
    resetV90Dropper();
    expect(clocked(w, 1500).length).toBeGreaterThan(0);
    expect(JSON.stringify(w.buildings)).toBe(before);
    expect(drawSweep.length).toBe(3);
  });
});

describe('v93 m the notice line (M.3)', () => {
  it('says the city rebuilds, in at most 90 characters, only for a rank that brings a look', () => {
    expect(M93_TEXT.rebuilds).toBe('The city rebuilds in the new style over the next months.');
    expect(M93_TEXT.rebuilds.length <= 90).toBe(true);
    expect(M93_TEXT.rebuilds.includes('Pharaoh')).toBe(false);
  });
});
