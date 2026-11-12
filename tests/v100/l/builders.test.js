// Version 10.0, Track L (L.5, spec 5d, rulings 2215-2218): builders on the monuments' courses and on rising buildings' scaffolds; the month's rest beat;
// a mason's strike. Only on active sites, never a paused crew's.
import { describe, it, expect } from '../../harness.js';
import { gangLayout, buildersLayout, buildersFor, restDay, drawMonument, BUILDERS } from '../../../src/render/monuments.js';
import { buildersAt } from '../../../src/render/v100/builders.js';
import { siteLook, drawSite } from '../../../src/render/art/monuments.js';
import { noteBuilt, resetScaffolds } from '../../../src/render/v90/scaffold.js';
import { noteFrameTime } from '../../../src/render/v90/clock.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { LIFE } from '../../../src/data/ambient.js';
import { LIFE_IDS } from '../../../src/render/v100/life.js';
import { insertBuilding, makeBuilding } from '../../../src/sim/world.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { lifeContract } from './helpers.js';

function siteIn(w, type, x, y, { course = 0, frac = 0, crews = [], reason = null, paused = false } = {}) {
  const b = insertBuilding(w, makeBuilding(w, type, x, y));
  const c = MONUMENTS[type].courses[Math.min(course, MONUMENTS[type].courses.length - 1)];
  Object.assign(b.site, { course, laid: { stone: c.stone * frac, bricks: c.bricks * frac }, stock: { stone: 40, bricks: 20 }, crews, reason, done: null });
  b.paused = paused;
  return b;
}
const rampOf = (b) => drawSite(makeDraw(makeCanvas(4, 4).getContext('2d'), 1), b.x, b.y, b.w, b.d, siteLook(b));

// A home just placed (its scaffold up), in the frame's game time.
function rising() {
  const w = makeTestWorld();
  w.day = 40;
  noteFrameTime(w, 40.1);
  const h = addRaw(w, 'granary', 10, 10);
  noteBuilt(w, h.id);
  return { w, h, range: { x0: 0, y0: 0, x1: 31, y1: 31 } };
}

describe('v100 l builders: the contract (rising buildings)', () => {
  lifeContract(buildersAt, () => { const { w, range } = rising(); return { world: w, range, timeDays: 40.2, nowMs: 1000 }; }, 4 * 8);
});

describe('v100 l builders: on the monuments and the scaffolds', () => {
  it('puts LIFE.buildersPerSite builders on a working site, carrying, climbing and hammering on game time, none on a paused or stalled one', () => {
    const w = makeTestWorld({ size: 48 });
    const b = siteIn(w, 'pyramid_great', 4, 4, { course: 6, frac: 0.5, crews: [1, 2] });
    const look = siteLook(b), ramp = rampOf(b);
    expect(buildersFor(b)).toBe(LIFE.buildersPerSite[1]);
    const a = gangLayout(b, look, ramp, 10.2);
    expect(a.builders.length).toBe(4);
    const poses = new Set();
    for (let t = 10; t < 10 + BUILDERS.roundDays; t += 0.1) for (const m of gangLayout(b, look, ramp, t).builders) poses.add(m.pose);
    expect([...poses].sort()).toEqual(['carry', 'climb', 'mallet']);
    expect(JSON.stringify(gangLayout(b, look, ramp, 10.2))).toBe(JSON.stringify(a));   // held while paused
    const paused = siteIn(w, 'pyramid_small', 24, 4, { course: 3, crews: [3], paused: true });
    expect(gangLayout(paused, siteLook(paused), rampOf(paused), 10).builders).toEqual([]);
    const stalled = siteIn(w, 'pyramid_small', 24, 24, { course: 3, crews: [4], reason: 'no_stone' });
    expect(gangLayout(stalled, siteLook(stalled), rampOf(stalled), 10).builders).toEqual([]);
    const small = siteIn(w, 'obelisk_small', 40, 40, { course: 1, crews: [5] });
    expect(buildersFor(small)).toBe(LIFE.buildersPerSite[0]);
  });
  it('rests on the first day of each game month: the sleds stand, the haulers sit, nobody climbs', () => {
    const w = makeTestWorld({ size: 48 });
    const b = siteIn(w, 'pyramid_great', 4, 4, { course: 6, frac: 0.5, crews: [1, 2] });
    const look = siteLook(b), ramp = rampOf(b);
    expect([restDay(30.4), restDay(31), restDay(0.2), restDay(29.9)]).toEqual([true, false, true, false]);
    const r = gangLayout(b, look, ramp, 60.5);
    expect([r.resting, r.working, r.sleds.every((s) => !s.loaded), r.people.every((m) => m.pose === 'sit'), r.builders.every((m) => m.pose === 'rest')]).toEqual([true, false, true, true, true]);
    expect(JSON.stringify(gangLayout(b, look, ramp, 60.9).sleds)).toBe(JSON.stringify(r.sleds));
  });
  it('strikes a mason\'s mallet with a puff of dust under Full only', () => {
    const w = makeTestWorld({ size: 48 });
    const b = siteIn(w, 'pyramid_great', 4, 4, { course: 6, frac: 0.5, crews: [1, 2] });
    const shot = (now, motion) => {
      const c = makeCanvas(520, 400), ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 260, 60);
      drawMonument(makeDraw(ctx, 1), w, b, { now, timeDays: 10.2, motion });
      return c.toDataURL();
    };
    expect(shot(100, 'full') !== shot(BUILDERS.puffMs + 400, 'full')).toBe(true);        // a puff, then none
    expect(shot(100, 'gentle')).toBe(shot(BUILDERS.puffMs + 400, 'gentle'));
  });
  it('climbs a rising building\'s poles, on its front corners, fading with the poles; none on a paused building or in the lesson', () => {
    const { w, h, range } = rising();
    const list = buildersAt(w, 40.2, 0, range, 'full');
    expect(list.length).toBe(h.w * h.d <= 4 ? LIFE.buildersPerSite[0] : LIFE.buildersPerSite[1]);
    for (const e of list) expect([e.id >= LIFE_IDS.builders && e.id < LIFE_IDS.builders + 200000, /^builder/.test(e.kind)]).toEqual([true, true]);
    expect(buildersAt(w, 40.5, 0, range, 'full').some((e) => e.lift !== list.find((o) => o.id === e.id).lift)).toBe(true);
    h.paused = true;
    expect(buildersAt(w, 40.2, 0, range, 'full')).toEqual([]);
    h.paused = false;
    w.lesson = true;
    expect(buildersAt(w, 40.2, 0, range, 'full')).toEqual([]);
    resetScaffolds(w);
  });
});
