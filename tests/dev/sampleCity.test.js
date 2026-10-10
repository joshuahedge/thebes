import { describe, it, expect } from '../harness.js';
import { buildSampleCity, buildStressCity } from '../../src/dev/sampleCity.js';
import { createWorld, population, allBuildings, housesOf } from '../../src/sim/world.js';
import { serialize } from '../../src/save/serialize.js';
import { ECONOMY } from '../../src/data/economy.js';

const countType = (w, type) => allBuildings(w).filter((b) => b.type === type).length;

describe('sample city', () => {
  it('builds a living village through the commands, deterministically', () => {
    const a = buildSampleCity(createWorld({ seed: 1 }));
    const b = buildSampleCity(createWorld({ seed: 1 }));
    expect(serialize(a)).toBe(serialize(b));
    expect(population(a)).toBeGreaterThan(150);
    expect(housesOf(a).length).toBeGreaterThan(40);
    for (const type of ['well', 'bazaar', 'temple', 'granary', 'farm_grain']) expect(countType(a, type)).toBeGreaterThan(0);
    expect(a.gold).toBeLessThan(ECONOMY.startGold + 5000);
    expect(Number.isFinite(a.gold)).toBe(true);
    expect(a.day).toBe(360);
  });
  it('builds a full stress city on a 64x64 map', () => {
    const w = buildStressCity(createWorld({ seed: 2 }));
    expect(housesOf(w).length).toBeGreaterThan(1200);
    expect(allBuildings(w).length - housesOf(w).length).toBeGreaterThan(80);
    expect(population(w)).toBeGreaterThan(5000);
    expect(housesOf(w).every((h) => h.tier >= 1)).toBe(true);
    expect(w.day).toBe(60);
  });
});
