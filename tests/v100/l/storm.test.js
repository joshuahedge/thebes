// Version 10.0, Track L (L.7, spec 5f, rulings 2232-2236): the rare sandstorm: seeded, never in the first year or the lesson, 20 to 40 s of real time,
// haze only under Gentle, nothing under Still; the V layers stay within their budget with a storm up.
import { describe, it, expect } from '../../harness.js';
import { stormsOf, stormAt, forceStorm, stormLean, stormSwing, drawStorm, STORM, YEAR_DAYS } from '../../../src/render/v100/weather.js';
import { drawV90 } from '../../../src/render/v90/effects.js';
import { seasonAt } from '../../../src/sim/seasons.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createCamera, visibleTileRange } from '../../../src/render/camera.js';
import { p } from '../../../src/render/iso.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { LIFE } from '../../../src/data/ambient.js';
import { deepFreeze } from './helpers.js';

describe('v100 l storm: the rare sandstorm', () => {
  it('is seeded: the same storms for the same seed and year, none in the first year, 1 or 2 a year after, in Shemu, 20 to 40 s', () => {
    expect(stormsOf(11, 0)).toEqual([]);
    for (let seed = 1; seed < 40; seed++) {
      for (let year = 1; year < 4; year++) {
        const s = stormsOf(seed, year);
        expect(JSON.stringify(s)).toBe(JSON.stringify(stormsOf(seed, year)));
        expect(s.length >= 1 && s.length <= 2).toBe(true);
        for (const o of s) {
          expect([Math.floor(o.startDay / YEAR_DAYS), seasonAt({ day: o.startDay }).season]).toEqual([year, 'shemu']);
          expect(o.seconds >= 20 && o.seconds <= 40).toBe(true);
        }
      }
    }
  });
  it('runs from the first frame on its day for its seconds of real time, rising and falling over 5 s; never in the lesson; the sim reads none of it', () => {
    const w = createWorld({ seed: 5 }), s = stormsOf(5, 1)[0];
    w.day = s.startDay - 1;
    expect(stormAt(w, 1000).on).toBe(false);
    w.day = s.startDay;
    const before = JSON.stringify(w);
    expect(stormAt(w, 10000)).toEqual({ on: true, k: 0, el: 0, seconds: s.seconds });
    expect(stormAt(w, 10000 + STORM.rampMs + 100).k).toBe(1);
    expect(stormAt(w, 10000 + s.seconds * 1000 + 10).on).toBe(false);
    expect(JSON.stringify(w)).toBe(before);
    const late = createWorld({ seed: 5 });
    late.day = s.startDay + STORM.catchDays;                                     // a load days later never shows it late
    expect(stormAt(late, 0).on).toBe(false);
    const lesson = createWorld({ seed: 5 });
    lesson.day = s.startDay; lesson.lesson = true;
    expect(stormAt(lesson, 0).on).toBe(false);
  });
  it('swings the wind, leans the figures (Full only) and draws the haze; Gentle the haze only; Still nothing', () => {
    const w = createWorld({ seed: 5 });
    forceStorm(w, 0, 30);
    expect(Math.abs(stormSwing(w, 10000) - Math.PI / 3) < 1e-9).toBe(true);
    expect(Math.abs(Math.abs(stormLean(w, 10000, 'full')) - (4 * Math.PI) / 180) < 1e-9).toBe(true);
    expect([stormLean(w, 10000, 'gentle'), stormLean(w, 10000, 'still')]).toEqual([0, 0]);
    const range = { x0: 10, y0: 10, x1: 40, y1: 40 }, mid = p(25, 25);
    const shot = (motion) => {
      const c = makeCanvas(400, 300), ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 200 - mid[0], 150 - mid[1]);
      const n = drawStorm(makeDraw(ctx, 1), w, range, 10000 + 450, motion);
      return { n, url: c.toDataURL() };
    };
    const full = shot('full'), gentle = shot('gentle'), still = shot('still');
    expect(full.n > 1 && gentle.n === 1 && still.n === 0).toBe(true);
    expect(full.url !== gentle.url && gentle.url !== still.url).toBe(true);
    forceStorm(w, null);
  });
  it('holds LIFE.storm.dustCap, is the same twice, never writes a deep-frozen world, and keeps stormsOf cached (the same list for the same seed and year)', () => {
    expect(stormsOf(5, 1)).toBe(stormsOf(5, 1));
    for (let s = 1; s < 30; s++) stormsOf(s, 1);                               // past the cache's bound: still right
    expect(JSON.stringify(stormsOf(5, 1))).toBe(JSON.stringify(stormsOf(5, 1)));
    const w = createWorld({ seed: 5 }), range = { x0: 10, y0: 10, x1: 40, y1: 40 }, mid = p(25, 25);
    forceStorm(w, 0, 30);
    const shot = (world, now, motion = 'full') => {
      const c = makeCanvas(400, 300), ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 200 - mid[0], 150 - mid[1]);
      return { n: drawStorm(makeDraw(ctx, 1), world, range, now, motion), url: c.toDataURL() };
    };
    for (const now of [3000, 10000, 17000, 29000]) expect(shot(w, now).n <= 1 + LIFE.storm.dustCap).toBe(true);
    const a = shot(w, 10000);
    expect(shot(w, 10000).url).toBe(a.url);
    deepFreeze(w);
    let b = null, err = null;
    try { b = shot(w, 10000); shot(w, 10000, 'gentle'); } catch (e) { err = String(e); }
    expect(err).toBe(null);
    expect(b.url).toBe(a.url);
    forceStorm(w, null);
  });
  it('keeps the V layers within their budget with a storm up (the storm scene\'s stress city)', () => {
    const world = buildStressCity(createWorld({ seed: 11 }));
    world.day = YEAR_DAYS + 9 * 30 + 10;
    forceStorm(world, 0, 40);
    const view = { width: 1280, height: 800 }, cam = createCamera(world.size);
    cam.x = world.size / 2; cam.y = world.size / 2; cam.zoom = 1;
    const range = visibleTileRange(cam, view, world.size), c = makeCanvas(1280, 800), ctx = c.getContext('2d');
    const g = makeDraw(ctx, 1, 1);
    const times = [];
    for (let i = 0; i < 40; i++) {
      const t0 = performance.now();
      drawV90(g, world, { range, cam, now: 8000 + i * 16, walkers: [], motion: 'full' });
      drawStorm(g, world, range, 8000 + i * 16, 'full');
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[20] <= 2 * 1.2).toBe(true);                                      // V's 2 ms (AMBIENT.v90BudgetMs), with the life budget's headroom
    forceStorm(world, null);
  });
});
