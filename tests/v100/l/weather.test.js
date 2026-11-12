// Version 10.0, Track L (L.7, spec 5f, rulings 2230, 2231): the wind drifts, and the heat shimmer (Shemu, around noon, over far sand, Full only, never in
// the lesson).
import { describe, it, expect } from '../../harness.js';
import { windAt, windOf, WIND_DRIFT_DEG } from '../../../src/render/ambient.js';
import { farSand, shimmerOn, SHIMMER } from '../../../src/render/v90/layers.js';
import { LIFE } from '../../../src/data/ambient.js';
import { T } from '../../../src/sim/terrain.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';

const angle = (v) => Math.atan2(v.y, v.x);
const diffDeg = (a, b) => { let d = ((a - b) * 180) / Math.PI; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

describe('v100 l weather: the wind drifts', () => {
  it('turns the seed\'s wind by a slow sine of 25 degrees over about four minutes, the same at time 0 as before', () => {
    const w = { seed: 11 };
    expect(windAt(w, 0)).toEqual(windOf(w));
    let most = 0;
    for (let t = 0; t < LIFE.windDriftMs; t += 5000) most = Math.max(most, Math.abs(diffDeg(angle(windAt(w, t)), angle(windOf(w)))));
    expect(most > WIND_DRIFT_DEG - 1 && most <= WIND_DRIFT_DEG + 1e-6).toBe(true);
    expect(Math.abs(diffDeg(angle(windAt(w, 1000)), angle(windAt(w, 0)))) < 1).toBe(true);   // slow: under a degree a second
  });
});

describe('v100 l weather: the heat shimmer', () => {
  it('finds open sand farther than SHIMMER.fromWater tiles from water, and shimmers only under Full, never in the lesson', () => {
    const world = buildStressCity(createWorld({ seed: 11 }));
    const far = farSand(world), n = world.size;
    expect(far.some((v) => v === 1)).toBe(true);
    for (let i = 0; i < n * n; i++) {
      if (!far[i]) continue;
      expect(world.terrain[i]).toBe(T.DESERT);
      const x = i % n, y = (i - x) / n;
      for (let dy = -SHIMMER.fromWater; dy <= SHIMMER.fromWater; dy++) for (let dx = -SHIMMER.fromWater; dx <= SHIMMER.fromWater; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > SHIMMER.fromWater) continue;
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < n && yy < n) expect(world.terrain[yy * n + xx] === T.WATER).toBe(false);
      }
    }
    expect([shimmerOn(world, 'gentle'), shimmerOn(world, 'still')]).toEqual([false, false]);
    world.lesson = true;
    expect(shimmerOn(world, 'full')).toBe(false);
  });
});
