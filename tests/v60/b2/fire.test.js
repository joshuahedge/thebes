// Version 6.0 Track B2: fire, smoke and rubble you can see: a burning roof chars, Still holds a still smoke column, and rubble that remembers what stood
// there smoulders for a while after a fire (smoke) or a wreck (dust).
import { describe, it, expect } from '../../harness.js';
import { drawFires, FLAME, SMOKE_PUFFS, BLAZE_SMOKE_PUFFS, GENTLE_SMOKE_RISE_PX } from '../../../src/render/fire.js';
import { SMOULDER, CHAR } from '../../../src/data/battle.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { ART_TEXT } from '../../../src/ui/text.js';

const BLAZE = { stage: 'blaze', days: 1, need: 2, fought: 0 }, FIRE = { stage: 'fire', days: 2, left: 9 };

function spy() {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = [];
  for (const k of ['line', 'stroke', 'poly', 'radial', 'path', 'circ', 'ell', 'text']) { const f = g[k]; g[k] = (...a) => { calls.push({ k, a }); return f(...a); }; }
  return { g, calls };
}
const run = (w, now, opts, range = null) => { const s = spy(); drawFires(s.g, w, range, now, opts); return s.calls; };
const puffs = (cs, colour) => cs.filter((c) => c.k === 'radial' && c.a[3] === colour).map((c) => c.a);

function rubbleOf(w, was, tiles) {
  return tiles.map(([x, y]) => { const r = makeBuilding(w, 'rubble', x, y); r.was = { ...was }; return insertBuilding(w, r); });
}

describe('v60 b2 fire still column', () => {
  it('holds a smoke column of the same puffs under Still as a fire would show at one instant, for a blaze and a fire, with no movement', () => {
    for (const [stage, n] of [['blaze', BLAZE_SMOKE_PUFFS], ['fire', SMOKE_PUFFS]]) {
      const w = makeTestWorld({ fertile: [] });
      addRaw(w, 'potter', 10, 10).fire = { ...(stage === 'fire' ? FIRE : BLAZE) };
      const at = (t) => puffs(run(w, t, { motion: 'still' }), FLAME.smoke);
      expect([stage, at(0).length]).toEqual([stage, n]);
      for (const t of [333, 1000, 987654]) expect(at(t)).toEqual(at(0));                          // the same puffs, the same places, whenever it is drawn
      const ys = at(0).map((p) => p[0][1]);
      expect(new Set(ys).size).toBe(n);                                                           // set up the column, one above another
      expect(ys.every((y, i) => i === 0 || y < ys[i - 1])).toBe(true);                            // each higher than the last
      const label = run(w, 0, { motion: 'still' }).find((c) => c.k === 'text');
      expect([label.a[1], Math.max(...ys) < label.a[0][1] - 4]).toEqual([ART_TEXT.burning, true]);   // above the "Burning" pill, as under Gentle
    }
  });

  it('keeps Full rising and Gentle fading in place, as before', () => {
    const w = makeTestWorld({ fertile: [] });
    addRaw(w, 'potter', 10, 10).fire = { ...FIRE };
    const series = (motion) => { const o = []; for (let t = 0; t < 3000; t += 100) o.push(puffs(run(w, t, { motion }), FLAME.smoke).map((p) => p[0])); return o; };
    const dy = (s) => Math.max(...s.map((r) => Math.max(...r.map((p) => p[1])))) - Math.min(...s.map((r) => Math.min(...r.map((p) => p[1]))));
    expect(dy(series('full'))).toBeGreaterThan(20);
    expect(series('gentle').every((r, i, all) => r.every((p, k) => Math.abs(p[0] - all[0][k][0]) < 1e-9 && Math.abs(p[1] - all[0][k][1]) <= GENTLE_SMOKE_RISE_PX + 1e-9))).toBe(true);
  });
});

describe('v60 b2 fire charred roofs', () => {
  it('chars a burning roof with soot, wider and darker for a fire than a blaze, at every level, and not an unburnt one', () => {
    const soot = (cs) => cs.filter((c) => c.k === 'radial' && c.a[3] === CHAR.soot).map((c) => c.a);
    const blaze = makeTestWorld({ fertile: [] }), fire = makeTestWorld({ fertile: [] }), none = makeTestWorld({ fertile: [] });
    addRaw(blaze, 'potter', 10, 10).fire = { ...BLAZE };
    addRaw(fire, 'potter', 10, 10).fire = { ...FIRE };
    addRaw(none, 'potter', 10, 10);
    for (const motion of ['full', 'gentle', 'still']) {
      const b = soot(run(blaze, 500, { motion })), f = soot(run(fire, 500, { motion }));
      expect([motion, b.length, f.length]).toEqual([motion, 1, 1]);
      expect([b[0][4], f[0][4]]).toEqual([CHAR.blaze, CHAR.fire]);
      expect(f[0][1]).toBeGreaterThan(b[0][1]);                                                   // a wider patch
      expect(soot(run(none, 500, { motion })).length).toBe(0);
    }
  });
});

describe('v60 b2 fire smouldering rubble', () => {
  const was = (w, cause, ago, extra = {}) => ({ type: 'storehouse', x: 10, y: 10, w: 2, d: 2, rot: 0, day: w.day - ago, cause, ...extra });
  const tiles2 = [[10, 10], [11, 10], [10, 11], [11, 11]];

  it('smoulders after a fire with a thin column of smoke, one column to a footprint at its origin tile, then goes quiet', () => {
    const w = makeTestWorld({ fertile: [] });
    w.day = 500;
    rubbleOf(w, was(w, 'fire', 5), tiles2);
    for (const motion of ['full', 'gentle']) expect([motion, puffs(run(w, 800, { motion }), FLAME.smoke).length]).toEqual([motion, SMOULDER.puffs]);   // four tiles, one column
    expect(puffs(run(w, 800, { motion: 'still' }), FLAME.smoke).length).toBe(SMOULDER.still);
    expect(puffs(run(w, 800, { motion: 'full' }), FLAME.dust).length).toBe(0);                    // smoke, not dust, after a fire
    w.day = 495 + SMOULDER.fireDays - 1;                                                          // the fire's day was 495: smoke for SMOULDER.fireDays days
    expect(puffs(run(w, 800, { motion: 'full' }), FLAME.smoke).length).toBe(SMOULDER.puffs);
    w.day = 495 + SMOULDER.fireDays;
    expect(puffs(run(w, 800, { motion: 'full' }), FLAME.smoke).length).toBe(0);
  });

  it('settles a haze of dust after a wreck for a shorter while, and thins as it ages', () => {
    const w = makeTestWorld({ fertile: [] });
    w.day = 500;
    rubbleOf(w, was(w, 'wreck', 2), tiles2);
    const dust = (t) => puffs(run(w, t, { motion: 'full' }), FLAME.dust);
    expect([dust(800).length, puffs(run(w, 800, { motion: 'full' }), FLAME.smoke).length]).toEqual([SMOULDER.puffs, 0]);
    const alpha = (day) => { w.day = day; return Math.max(...dust(0).map((p) => p[4])); };
    expect(alpha(503)).toBeGreaterThan(alpha(508));                                               // fresher: thicker
    w.day = 498 + SMOULDER.wreckDays;                                                             // wrecked on day 498
    expect(dust(800).length).toBe(0);
    expect(SMOULDER.wreckDays).toBeLessThan(SMOULDER.fireDays);
  });

  it('holds the column still under Still and in place under Gentle, and shows none for old rubble or off the view', () => {
    const w = makeTestWorld({ fertile: [] });
    w.day = 500;
    rubbleOf(w, was(w, 'fire', 3), tiles2);
    const at = (t, motion) => puffs(run(w, t, { motion }), FLAME.smoke).map((p) => p.slice(0, 3));
    expect(at(0, 'still')).toEqual(at(9999, 'still'));
    const g0 = at(0, 'gentle'), g1 = at(777, 'gentle');
    expect(g0.every((p, i) => p[0][0] === g1[i][0][0] && Math.abs(p[0][1] - g1[i][0][1]) <= GENTLE_SMOKE_RISE_PX + 1e-9)).toBe(true);
    const old = makeTestWorld({ fertile: [] });
    old.day = 500;
    insertBuilding(old, makeBuilding(old, 'rubble', 10, 10));                                     // rubble from before 6.0 (no was)
    expect(puffs(run(old, 0, { motion: 'full' }), FLAME.smoke).length + puffs(run(old, 0, { motion: 'full' }), FLAME.dust).length).toBe(0);
    expect(puffs(run(w, 0, { motion: 'full' }, { x0: 0, y0: 0, x1: 5, y1: 5 }), FLAME.smoke).length).toBe(0);
    expect(puffs(run(w, 0, { motion: 'full' }, { x0: 8, y0: 8, x1: 14, y1: 14 }), FLAME.smoke).length).toBe(SMOULDER.puffs);
  });

  it('draws no smoke for rubble a fire has just made when its fire is the building\'s own still burning', () => {
    const w = makeTestWorld({ fertile: [] });
    w.day = 500;
    addRaw(w, 'potter', 10, 10).fire = { ...BLAZE };
    const cs = run(w, 0, { motion: 'full' });
    expect(puffs(cs, FLAME.smoke).length).toBe(BLAZE_SMOKE_PUFFS);                                // the blaze's own column, nothing more
  });
});
