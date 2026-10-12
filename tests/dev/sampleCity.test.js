import { describe, it, expect } from '../harness.js';
import { buildSampleCity, buildStressCity } from '../../src/dev/sampleCity.js';
import { createWorld, population, allBuildings, housesOf } from '../../src/sim/world.js';
import { serialize } from '../../src/save/serialize.js';
import { ECONOMY } from '../../src/data/economy.js';
import { TITLE_SEED } from '../../src/data/ui.js';
import { setMotion, monumentSpot, MOTIONS, STAGE4_SCENES } from '../../src/dev/scenes.js';
import { createSettings } from '../../src/ui/settings.js';
import { idx } from '../../src/sim/grid.js';
import { T as TERRAIN } from '../../src/sim/terrain.js';

const countType = (w, type) => allBuildings(w).filter((b) => b.type === type).length;

describe('sample city', () => {
  it('builds a living village through the commands, deterministically', () => {
    const a = buildSampleCity(createWorld({ seed: 1 }));
    const b = buildSampleCity(createWorld({ seed: 1 }));
    expect(serialize(a)).toBe(serialize(b));
    expect(population(a)).toBeGreaterThan(150);
    expect(housesOf(a).length).toBeGreaterThan(40);
    for (const type of ['well', 'bazaar', 'temple', 'granary', 'farm_grain']) expect(countType(a, type)).toBeGreaterThan(0);
    expect(a.gold).toBeLessThan(ECONOMY.startGold + 10000);
    expect(Number.isFinite(a.gold)).toBe(true);
    expect(a.day).toBe(600);                                   // 360 days as a village, then 240 with its Stage 2 buildings
  });
  it('gives the title backdrop Stage 2 buildings, Townhouses and Manors', () => {
    for (const seed of [TITLE_SEED, 1]) {
      const w = buildSampleCity(createWorld({ seed }));
      for (const type of ['storehouse', 'clay_pit', 'potter', 'booth', 'statue', 'garden']) expect([seed, type, countType(w, type) > 0]).toEqual([seed, type, true]);
      expect([seed, w.tally.made.pottery > 0]).toEqual([seed, true]);
      expect([seed, housesOf(w).filter((h) => h.tier === 5).length >= 5]).toEqual([seed, true]);
      expect([seed, housesOf(w).filter((h) => h.tier >= 6).length >= 1]).toEqual([seed, true]);
    }
    const village = buildSampleCity(createWorld({ seed: 1 }), { stageTwoDays: 0 });
    expect([countType(village, 'storehouse'), village.day]).toEqual([0, 360]);   // without the second phase it stays a Stage 1 village
  });
  it('builds a full stress city on a 64x64 map', () => {
    const w = buildStressCity(createWorld({ seed: 2 }));
    expect(housesOf(w).length).toBeGreaterThan(1200);
    expect(allBuildings(w).length - housesOf(w).length).toBeGreaterThan(80);
    expect(population(w)).toBeGreaterThan(5000);
    expect(housesOf(w).every((h) => h.tier >= 1)).toBe(true);
    for (const type of ['storehouse', 'potter', 'booth', 'brewery', 'weaver', 'jeweller', 'trading_post', 'garden', 'statue']) expect([type, countType(w, type) > 0]).toEqual([type, true]);
    expect(w.day).toBe(60);
  });
});

// tools/shots.ps1 -Stage4: the scenes, the two motions in today's settings, and where the monument scenes look.
describe('s4 infra', () => {
  it('sets Motion Full, or follows the device (Gentle where it asks for less motion), or chooses Gentle or Still', () => {
    expect(STAGE4_SCENES).toEqual(['title', 'tutorial', 'site', 'pyramid', 'capstone', 'procession', 'palace', 'sitesheet', 'motion']);
    expect(MOTIONS).toEqual(['full', 'reduced']);
    const settings = createSettings({ storage: null, root: document.createElement('div'), systemReducedMotion: () => true, watchSystem: () => () => {} });
    settings.set({ motion: 'still' });
    expect(setMotion(settings, 'full')).toBe('full');
    expect([settings.get().motion, settings.motionLevel(), settings.reducedMotion()]).toEqual(['full', 'full', false]);
    expect(setMotion(settings, 'reduced')).toBe('reduced');
    expect([settings.get().motion, settings.motionLevel(), settings.reducedMotion()]).toEqual(['system', 'gentle', true]);
    expect([setMotion(settings, 'still'), settings.motionLevel(), setMotion(settings, 'gentle'), settings.motionLevel()]).toEqual(['still', 'still', 'gentle', 'gentle']);
    expect(['reducedMotion' in settings.get(), 'ambient' in settings.get()]).toEqual([false, false]);   // Stage 3's mirrors are retired
    let error = null;
    try { setMotion(settings, 'calm'); } catch (e) { error = e.message; }
    expect(error).toBe('setMotion: no motion named calm (full, reduced, gentle, still)');
  });
  it('finds open desert east of the river for a great pyramid on the seed-11 sample city', () => {
    const w = buildSampleCity(createWorld({ seed: 11 }));
    const s = monumentSpot(w);
    expect(s.n).toBe(7);
    let riverEast = -1;
    for (let x = 0; x < w.size; x++) if (w.terrain[idx(w.size, x, w.focus.y)] === TERRAIN.WATER) riverEast = x;
    expect(s.x > riverEast).toBe(true);
    const tiles = [];
    for (let y = s.y; y < s.y + 7; y++) for (let x = s.x; x < s.x + 7; x++) tiles.push(idx(w.size, x, y));
    expect(tiles.every((i) => w.terrain[i] === TERRAIN.DESERT && !w.occ[i] && !w.road[i])).toBe(true);
    expect(monumentSpot(buildSampleCity(createWorld({ seed: 11 })))).toEqual(s);   // the same spot every time
  });
});
