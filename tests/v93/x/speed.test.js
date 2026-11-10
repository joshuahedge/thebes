// Version 9.3 fix wave, the speed fix (rulings 1940-1944): slotFor answers from a per-building look and a table of keys, and must name the very slot it did before.
import { describe, it, expect } from '../../harness.js';
import { slotFor, slotForFresh, FAR_ZOOM } from '../../../src/render/art/registry.js';
import { lookOfBuilding, lookOfBuildingFresh } from '../../../src/render/looks.js';
import { createWorld, allBuildings, insertBuilding, removeBuilding } from '../../../src/sim/world.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { deviceKind } from '../../../src/render/spriteCache.js';
import { sceneWorld } from '../p/scenes.js';

// Every building of the world, asked both ways, in both zoom bands, with and without a world.
function compare(world) {
  let n = 0, bad = null;
  for (const b of allBuildings(world)) {
    for (const far of [false, true]) {
      const a = slotFor(b, world, { far }), e = slotForFresh(b, world, { far });
      if (a !== e && !bad) bad = `${b.type}#${b.id} far=${far}: ${a} vs ${e}`;
      n++;
    }
    if (lookOfBuilding(world, b) !== lookOfBuildingFresh(world, b) && !bad) bad = `look of ${b.type}#${b.id}`;
    if (slotFor(b) !== slotForFresh(b) && !bad) bad = `${b.type}#${b.id} without a world`;
  }
  return { n, bad };
}

describe('v93 x speed: the cached slot is the slot it was', () => {
  const worlds = {
    'the stress city (a village)': () => buildStressCity(createWorld({ seed: 3 })),
    'a Capital': () => sceneWorld(64, 'capital'),
    'a mid-rebuild Capital': () => sceneWorld(64, 'rebuild'),
  };
  for (const [name, make] of Object.entries(worlds)) {
    it(`${name} names the same slot for every building over six months of days, staffing and rank`, () => {
      const world = make(), list = allBuildings(world);
      expect(list.length).toBeGreaterThan(200);
      for (let month = 0; month < 6; month++) {
        const r = compare(world);
        expect(r.bad).toBe(null);
        expect(r.n).toBeGreaterThan(400);
        world.day += DAYS_PER_MONTH;                                  // a month on: the rebuild's front moves
        list.forEach((b, i) => {                                      // staffing moves the state
          if (i % 5 === month % 5) b.staff = (b.staff || 0) > 0 ? 0 : 99;
          if (i % 11 === month) b.paused = !b.paused;
        });
        if (month === 3) world.milestone = 'city';                    // and a rank change
        if (month === 4) world.splits = { ...(world.splits || {}), capital: world.day - 1 };
      }
    });
  }
  it('a building placed after its rank arrived starts current, and a changed day or rank is not held back', () => {
    const world = sceneWorld(64, 'rebuild');
    const b = allBuildings(world).find((x) => x.type === 'house');
    const before = lookOfBuilding(world, b);
    world.splits.capital = world.day + 1000;                          // the front has not begun: the old look holds
    expect(lookOfBuilding(world, b)).toBe(lookOfBuildingFresh(world, b));
    world.splits.capital = 0; world.splits.city = 0; world.splits.town = 0;
    expect(lookOfBuilding(world, b)).toBe(3);
    expect(before).toBeLessThan(4);
    b.day = world.day;                                                // placed after: current at once
    world.splits.capital = world.day - 400;
    expect(lookOfBuilding(world, b)).toBe(lookOfBuildingFresh(world, b));
  });
  it('a building placed or pulled down after the rank day moves the look of no other building (M1)', () => {
    const world = sceneWorld(64, 'rebuild');
    world.day += 7;
    const list = allBuildings(world);
    const looks = () => list.map((b) => lookOfBuilding(world, b));
    const before = looks();
    expect(new Set(before).size).toBeGreaterThan(1);                  // the front is mid-way: more than one look stands
    const far = { id: 9000001, type: 'well', x: 63, y: 63, w: 1, d: 1, day: world.day, tier: 0 };
    insertBuilding(world, far);                                       // placed at the edge, after the rank day
    expect(looks()).toEqual(before);
    expect(compare(world).bad).toBe(null);
    removeBuilding(world, far.id);
    expect(looks()).toEqual(before);
    expect(compare(world).bad).toBe(null);
    world.day += 20;                                                  // and the front still moves on game days
    expect(looks()).toEqual(list.map((b) => lookOfBuildingFresh(world, b)));
  });
  it('FAR_ZOOM is still the far band', () => { expect(FAR_ZOOM).toBe(0.6); });
});

describe('v93 x speed: a touch device with no memory figure is a phone (P1)', () => {
  it('an iPad (768 wide, touch, no deviceMemory) gets the phone budgets; a desktop without touch keeps its own', () => {
    expect(deviceKind({ screenWidth: 820, screenHeight: 1180, maxTouchPoints: 5 })).toBe('phone');
    expect(deviceKind({ screenWidth: 1920, screenHeight: 1080, maxTouchPoints: 0 })).toBe('desktop');
    expect(deviceKind({ screenWidth: 1920, screenHeight: 1080 })).toBe('desktop');
    expect(deviceKind({ deviceMemory: 8, screenWidth: 1280, screenHeight: 800, maxTouchPoints: 10 })).toBe('desktop');   // a memory figure still decides
  });
});
