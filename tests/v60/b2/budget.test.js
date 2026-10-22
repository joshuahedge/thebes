// Version 6.0 Track B2: a battle costs little to draw. On the stress city at Large (80) and Huge (112): the layers this track draws (the units' poses, the
// banner, the clash marks, sparks and arrows; flames, soot and smoke columns, smouldering rubble; the effects) cost under the 2 ms of the ambient layer's
// budget with a margin for a loaded machine, and the whole frame of a city in the thick of a battle stays inside the stress-frame budgets (50 ms at the
// default zoom, 120 ms zoomed all the way out: tests/render/stress.test.js) and within a few milliseconds of the same city at peace. The numbers were
// measured by tests/v60/b2/measure.js (see the Track B2 report): about 0.9 ms of layers and +2 ms of frame at the default zoom, +5 to +7 ms zoomed out.
import { describe, it, expect } from '../../harness.js';
import { stressWorld, stageBattle, measureBattle } from './measure.js';
import { unitsAt, drawUnitMarks } from '../../../src/render/units.js';
import { drawFires } from '../../../src/render/fire.js';
import { createEffects } from '../../../src/render/effects.js';
import { createCamera, visibleTileRange } from '../../../src/render/camera.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeCanvas } from '../../helpers/canvas.js';

const LAYER_BUDGET_MS = 3;       // the ambient layer's budget is 2 ms (Stage 3, ruling 133); the margin is for a machine under load
const FRAME_DEFAULT_MS = 50, FRAME_FAR_MS = 120;   // tests/render/stress.test.js

// The mean cost of one call, over n calls after a warm-up.
function cost(fn, n = 120) {
  for (let i = 0; i < 20; i++) fn(i);
  const t = performance.now();
  for (let i = 0; i < n; i++) fn(i);
  return (performance.now() - t) / n;
}

// Layers (ms a frame) of a battle on a stress city of this size, at each Motion level.
function layers(world, motion) {
  const fx = createEffects({ motionLevel: motion });
  const battle = stageBattle(world, fx, 5000);
  battle.hit();
  const g = makeDraw(makeCanvas(1280, 800).getContext('2d'), 2, 2);
  const cam = createCamera({ x: world.size / 2, y: world.size / 2, zoom: 1 }), range = visibleTileRange(cam, { width: 1280, height: 800 }, world.size);
  const at = (i) => ({ now: 5000 + i * 17, days: world.day + (i % 60) / 60 });
  return {
    units: cost((i) => { const t = at(i); unitsAt(world, t.days, range, { motion, now: t.now }); }),
    marks: cost((i) => { const t = at(i); drawUnitMarks(g, world, range, t.days, t.now, { motion }); }),
    fires: cost((i) => drawFires(g, world, range, at(i).now, { motion })),
    effects: cost((i) => fx.draw(g, 5000 + (i % 40) * 17, world)),
  };
}

describe('v60 b2 budget layers', () => {
  for (const size of [80, 112]) {
    it(`draws the battle's units, marks, fire and smoke, smouldering rubble and effects within the layer budget on a ${size}x${size} map`, () => {
      const built = stressWorld(size);
      for (const motion of ['full', 'gentle', 'still']) {
        const l = layers(structuredClone(built), motion);
        const total = l.units + l.marks + l.fires + l.effects;
        expect([size, motion, Math.round(total * 100) / 100 < LAYER_BUDGET_MS]).toEqual([size, motion, true]);
        expect([size, motion, 'fires', l.fires < LAYER_BUDGET_MS]).toEqual([size, motion, 'fires', true]);   // the dearest: a dozen alight and ten ruins smouldering
      }
    });
  }
});

describe('v60 b2 budget frame', () => {
  for (const size of [80, 112]) {
    it(`keeps the whole frame of a ${size}x${size} city in a battle inside the stress-frame budgets and close to the same city at peace`, () => {
      const built = stressWorld(size);
      const near = measureBattle(size, { zoom: 1, world: built, frames: 30 }), far = measureBattle(size, { zoom: 0.5, world: built, frames: 20 });
      expect([size, 'default zoom', near.battle.median < FRAME_DEFAULT_MS]).toEqual([size, 'default zoom', true]);
      expect([size, 'zoomed out', far.battle.median < FRAME_FAR_MS]).toEqual([size, 'zoomed out', true]);
      expect([size, 'default zoom delta', near.delta < 6]).toEqual([size, 'default zoom delta', true]);
      expect([size, 'zoomed out delta', far.delta < 15]).toEqual([size, 'zoomed out delta', true]);
      expect(near.objects).toBeGreaterThan(500);                                                        // a real city's worth on screen, not an empty frame
    });
  }
});
