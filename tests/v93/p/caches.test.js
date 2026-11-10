// Version 9.3 Track P (rulings 1935-1937, spec section 7): the caches by device, measured. The four looks, a home's three variants and a service's
// three states multiply the sprite slots, so the sprite budget rises from 9.1's 16 MB: a desktop and a phone each get their own (DEVICE_BUDGETS,
// spriteCache.js), by navigator.deviceMemory where the browser reports it, else by the screen's short side, and the terrain-plus-sprite cap rises
// with the sprites so the terrain is not starved. The test: on the stress city and the 112 map, in the Capital look and mid-rebuild, the camera's
// 600 frames (tests/v93/p/scenes.js) evict under 5% of the sprite draws on each device's budgets, and the terrain bakes stay at two a frame.
import { describe, it, expect } from '../../harness.js';
import { DEVICE_BUDGETS, deviceKind, SPRITE_BUDGET_BYTES, DEVICE_KIND } from '../../../src/render/spriteCache.js';
import { CACHES_BUDGET_BYTES, TERRAIN_BUDGET_BYTES, TERRAIN_FLOOR_BYTES, terrainBudgetFor } from '../../../src/render/terrainBaker.js';
import { sceneWorld, runScene, DESKTOP, PHONE } from './scenes.js';

const MB = 1024 * 1024;

describe('v93 p caches: the budgets by device', () => {
  it('tells a desktop from a phone by the memory reported, else by the screen', () => {
    expect(deviceKind({ deviceMemory: 8, screenWidth: 390, screenHeight: 844 })).toBe('desktop');
    expect(deviceKind({ deviceMemory: 4, screenWidth: 1920, screenHeight: 1080 })).toBe('phone');
    expect(deviceKind({ screenWidth: 390, screenHeight: 844 })).toBe('phone');
    expect(deviceKind({ screenWidth: 1280, screenHeight: 800 })).toBe('desktop');
    expect(deviceKind({ screenWidth: 1024, screenHeight: 700 })).toBe('phone');     // a short side under 768: a small tablet keeps the phone's
    expect(deviceKind({})).toBe('desktop');
  });
  it('gives each device its budgets, the sprites above 9.1\'s 16 MB and the terrain never starved', () => {
    expect([DEVICE_BUDGETS.desktop.sprites, DEVICE_BUDGETS.phone.sprites].map((b) => b / MB)).toEqual([32, 24]);
    for (const kind of ['desktop', 'phone']) {
      const { sprites, caches } = DEVICE_BUDGETS[kind];
      expect(caches - sprites).toBeGreaterThanOrEqual(TERRAIN_BUDGET_BYTES);   // with the sprites at their budget the terrain keeps its own
      expect(terrainBudgetFor(sprites, caches)).toBeGreaterThan(TERRAIN_FLOOR_BYTES);
    }
    expect([SPRITE_BUDGET_BYTES, CACHES_BUDGET_BYTES]).toEqual([DEVICE_BUDGETS[DEVICE_KIND].sprites, DEVICE_BUDGETS[DEVICE_KIND].caches]);
  });
});

describe('v93 p caches: the scenes', () => {
  // Mid-rebuild only: it holds three looks at once, a superset of the Capital look's slots (measured: the Capital look evicts fewer in every
  // scene, ruling 1935), and each run costs about a minute at DPR 2.
  for (const size of [64, 112]) {
    it(`evicts under 5% of the sprite draws on the ${size} map in the middle of the rebuild, desktop and phone at DPR 2`, () => {
      const world = sceneWorld(size, 'rebuild');
      for (const [kind, view] of [['desktop', DESKTOP], ['phone', PHONE]]) {
        const { sprites, caches } = DEVICE_BUDGETS[kind];
        const r = runScene(world, { view, dpr: 2, spriteBytes: sprites, cachesBytes: caches });
        expect([kind, r.draws]).toEqual([kind, r.draws > 0 ? r.draws : 'no draws']);
        const share = r.evicted / r.draws;
        expect([kind, share < 0.05 ? 'ok' : Math.round(share * 1000) / 10]).toEqual([kind, 'ok']);
        expect([kind, r.maxBakes]).toEqual([kind, Math.min(2, r.maxBakes)]);   // the two-a-frame cap holds
      }
    });
  }
});
