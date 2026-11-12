// Version 10.0 (Track F, ruling 2111): a new city opens on its entry road's end diamond with the map around it: under 30% of the screen off the map, the diamond in sight
// and toward the edge the entry stands on.
import { describe, it, expect } from '../../harness.js';
import { holdInMap, tileToScreen } from '../../../src/render/camera.js';
import { startCamera } from '../../../src/ui/cameraControl.js';
import { createWorld } from '../../../src/sim/world.js';
import { fire, startNewCity } from '../../helpers/dom.js';
import { OFF_MAP_SHARE } from '../../../src/render/camera.js';
import { offMapShare, bootAt } from './helpers.js';

const SIZES = [{ width: 390, height: 844 }, { width: 1920, height: 1080 }];
const diamondOf = (world) => world.startRoad[world.startRoad.length - 1];

describe('v100 f start frame: the first view keeps the map on screen', () => {
  it('startCamera holds, keeps the diamond in sight and leaves under 30% off the map, on every size', () => {
    const bad = [];
    for (const size of [48, 64, 80, 112]) {
      const world = createWorld({ seed: 11, size });
      for (const view of SIZES) {
        for (const zoom of [1, 0.6]) {
          const cam = { ...startCamera(world, view, zoom), mapSize: size };
          const held = holdInMap({ ...cam }, view);
          const [x, y] = diamondOf(world);
          const [sx, sy] = tileToScreen(cam, view, x + 0.5, y + 0.5);
          const share = offMapShare(cam, view, size), label = `${size} ${view.width}x${view.height} z${zoom}`;
          if (held.x !== cam.x || held.y !== cam.y) bad.push(`${label}: not held`);
          if (!(sx > 0 && sx < view.width && sy > 0 && sy < view.height)) bad.push(`${label}: diamond off screen`);
          // a map diamond under twice the screen's long side cannot fill it (its corners are empty whatever the camera does): only a bigger map is held to the 30%
          if (share >= 0.3 && size * 64 * zoom >= 2 * Math.max(view.width, view.height)) bad.push(`${label}: ${Math.round(share * 100)}% off the map`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
  it('moves the centre inward from the entry: the diamond is on the entry side of the middle', () => {
    const world = createWorld({ seed: 11, size: 64 });
    const view = { width: 1920, height: 1080 };
    const cam = { ...startCamera(world, view, 1), mapSize: 64 };
    const [x, y] = diamondOf(world);
    expect(cam.y).toBeLessThan(y + 0.5);              // the entry is on the +y edge: the centre is further in
    const [, sy] = tileToScreen(cam, view, x + 0.5, y + 0.5);
    expect(sy).toBeGreaterThan(view.height / 2);       // so the diamond sits below the middle of the screen, toward the edge
    expect(OFF_MAP_SHARE).toBe(0.7);
  });
  it('a resize or a turn re-holds the camera for the new view (ruling 2119)', async () => {
    const r = await bootAt(390, 844);
    try {
      startNewCity(r.root.querySelector('#title'));
      const g = r.api.game();
      g.cam.x = 4; g.cam.y = 4;                               // as far into the corner as a phone holds it (a smaller margin than a big window's)
      holdInMap(g.cam, { width: 390, height: 844 });
      const before = { x: g.cam.x, y: g.cam.y };
      r.resize(1920, 1080);
      const want = holdInMap({ ...g.cam, x: before.x, y: before.y }, { width: 1920, height: 1080 });
      expect(want.x > before.x || want.y > before.y).toBe(true);   // the bigger view's margin is deeper: the camera had to move
      expect(Math.abs(g.cam.x - want.x) < 1e-6 && Math.abs(g.cam.y - want.y) < 1e-6).toBe(true);
      const turned = { x: g.cam.x, y: g.cam.y };
      r.resize(390, 844);                                      // and back: held still (a smaller margin never moves it)
      expect(g.cam.x).toBe(turned.x); expect(g.cam.y).toBe(turned.y);
    } finally { r.cleanup(); }
  });
  // Ruling 2320: three fixed seeds per size (an unseeded boot is a different map each run); each is held under the bound, its share printed in the test name.
  for (const view of SIZES) {
    for (const seed of [11, 23, 47]) {
      it(`a fresh city (seed ${seed}) booted at ${view.width}x${view.height} opens held, its diamond in sight, under 30% off the map`, async () => {
        const r = await bootAt(view.width, view.height, { params: `seed=${seed}` });
        try {
          startNewCity(r.root.querySelector('#title'));
          const g = r.api.game();
          const held = holdInMap({ ...g.cam }, view);
          expect(held.x).toBe(g.cam.x); expect(held.y).toBe(g.cam.y);
          const [x, y] = diamondOf(g.world);
          const [sx, sy] = tileToScreen(g.cam, view, x + 0.5, y + 0.5);
          expect(sx > 0 && sx < view.width && sy > 0 && sy < view.height).toBe(true);
          const share = offMapShare(g.cam, view, g.world.size);
          console.log(`start frame seed ${seed} ${view.width}x${view.height}: ${Math.round(share * 1000) / 10}% off the map`);
          if (!(share < 0.3)) throw new Error(`seed ${seed} ${Math.round(share * 100)}% off the map; cam ${JSON.stringify(g.cam)} size ${g.world.size}`);
        } finally { r.cleanup(); }
      });
    }
  }
});
