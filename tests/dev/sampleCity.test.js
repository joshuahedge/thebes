import { describe, it, expect } from '../harness.js';
import { buildSampleCity, buildStressCity } from '../../src/dev/sampleCity.js';
import { createWorld, population, allBuildings, housesOf } from '../../src/sim/world.js';
import { serialize } from '../../src/save/serialize.js';
import { ECONOMY } from '../../src/data/economy.js';
import { TITLE_SEED } from '../../src/data/ui.js';

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
