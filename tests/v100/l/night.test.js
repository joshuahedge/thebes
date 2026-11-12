// Version 10.0, Track L (L.6, spec 5e, rulings 2220-2224): doors glowing at dusk, hearth smoke, the lamps' flicker under Full only, the palace's
// windows lighting in a sweep, a festival's hearths lit early; drawLight's share holds (tests/v70/s/budget.test.js).
import { describe, it, expect } from '../../harness.js';
import { drawNightLife, doorsLit, doorPoints, NIGHT_LIFE, DOOR_INSET } from '../../../src/render/v100/night.js';
import { flickerOf, FLICKER, setLightClock } from '../../../src/render/light.js';
import { LIGHT } from '../../../src/data/seasons.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { p } from '../../../src/render/iso.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { bazaarCity, deepFreeze, DAY, NIGHT } from './helpers.js';

function draw(w, range, l, motion = 'full', now = 5000, only = null) {
  const c = makeCanvas(640, 480), ctx = c.getContext('2d'), mid = p((range.x0 + range.x1) / 2, (range.y0 + range.y1) / 2);
  ctx.setTransform(1, 0, 0, 1, 320 - mid[0] * 2, 240 - mid[1] * 2);
  const g = makeDraw(ctx, 2, 2);
  const n = drawNightLife(g, w, range, now, motion, l, only);
  return { n, url: c.toDataURL() };
}

function draw2(w, range, only, deviceKind) {
  const c = makeCanvas(640, 480), ctx = c.getContext('2d'), mid = p((range.x0 + range.x1) / 2, (range.y0 + range.y1) / 2);
  ctx.setTransform(1, 0, 0, 1, 320 - mid[0] * 2, 240 - mid[1] * 2);
  return { n: drawNightLife(makeDraw(ctx, 2, 2), w, range, 5000, 'full', NIGHT, only, deviceKind), url: c.toDataURL() };
}

describe('v100 l night: doors, hearths, lamps and the palace', () => {
  it('lights every lived-in home\'s door at night (capped, nearest first), nothing by day, nothing under Still, never writing the world', () => {
    const { w, range } = bazaarCity(10);
    expect(draw(w, range, DAY).n).toBe(0);
    const night = draw(w, range, NIGHT);
    expect(night.n).toBeGreaterThan(5);
    expect(draw(w, range, NIGHT, 'still').n).toBe(0);
    expect(doorPoints(w, { x0: 0, y0: 0, x1: w.size, y1: w.size }, null).length <= NIGHT_LIFE.doors).toBe(true);
    deepFreeze(w);
    expect(draw(w, range, NIGHT).url).toBe(night.url);                           // the same from a frozen world: it reads only
  });
  it('stands each door on its home\'s wall line, inside the wall footprint, not on the yard before it (ruling 2326)', () => {
    const { w, range } = bazaarCity(10);
    const doors = doorPoints(w, range, null);
    expect(doors.length).toBeGreaterThan(3);
    for (const d of doors) {
      expect(d.y <= d.b.y + d.b.d - DOOR_INSET + 1e-9).toBe(true);
      expect(d.y > d.b.y && d.x > d.b.x && d.x < d.b.x + d.b.w).toBe(true);
    }
    expect(DOOR_INSET >= 0.15 && DOOR_INSET <= 0.2).toBe(true);
  });
  it('flickers a lamp by +-8% over 1 to 2 s under Full; Gentle\'s doors are steady', () => {
    let lo = 2, hi = 0;
    for (let t = 0; t < 4000; t += 50) { const f = flickerOf(10, 20, t); lo = Math.min(lo, f); hi = Math.max(hi, f); }
    expect(hi <= 1 + FLICKER.amp + 1e-9 && lo >= 1 - FLICKER.amp - 1e-9 && hi - lo > FLICKER.amp).toBe(true);
    let flips = 0, prev = flickerOf(10, 20, 0) > 1;
    for (let t = 0; t < 10000; t += 20) { const up = flickerOf(10, 20, t) > 1; if (up !== prev) flips++; prev = up; }
    expect(flips <= 2 * 10 + 1).toBe(true);                                      // never faster than a turn about a second
    const { w, range } = bazaarCity(10);
    const doors = new Set(['doors']);
    expect(draw(w, range, NIGHT, 'gentle', 100, doors).url).toBe(draw(w, range, NIGHT, 'gentle', 700, doors).url);
    expect(draw(w, range, NIGHT, 'full', 100, doors).url !== draw(w, range, NIGHT, 'full', 600, doors).url).toBe(true);
  });
  it('holds the door and hearth caps per device (desktop, phone) and is the same twice', () => {
    const { w, range } = bazaarCity(40);
    const parts = (kind, only) => draw2(w, range, only, kind);
    for (const [kind, cap] of [['desktop', NIGHT_LIFE], ['phone', NIGHT_LIFE.phone]]) {
      expect(parts(kind, new Set(['doors'])).n <= cap.doors).toBe(true);
      expect(parts(kind, new Set(['hearths'])).n <= cap.hearths).toBe(true);
    }
    expect(parts('phone', new Set(['doors'])).n <= parts('desktop', new Set(['doors'])).n).toBe(true);
    expect(doorPoints(w, range, null, 5).length <= 5).toBe(true);
    expect(parts('desktop', null).url).toBe(parts('desktop', null).url);
  });
  it('lights the hearths a minute before dusk on a festival day', () => {
    const { w } = bazaarCity(10);
    const before = LIGHT.day * LIGHT.cycleMs - NIGHT_LIFE.festivalLeadMs / 2;
    setLightClock(w, before);
    const l = { phase: 'day', u: 0.5, dark: 0, warm: 0, lamps: 0 };
    expect(doorsLit(w, l)).toBe(0);
    w.danger.festivalDay = w.day;
    expect(doorsLit(w, l) > 0.2).toBe(true);
    setLightClock(w, 1000);
    expect(doorsLit(w, l)).toBe(0);
  });
});
