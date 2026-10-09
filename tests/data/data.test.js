import { describe, it, expect } from '../harness.js';
import { ECONOMY } from '../../src/data/economy.js';
import { GOODS, FOOD_GOODS } from '../../src/data/goods.js';
import { TIERS, MAX_TIER } from '../../src/data/housing.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { PRIORITY_LEVELS } from '../../src/data/labour.js';
import { MILESTONES } from '../../src/data/progression.js';

describe('data', () => {
  it('never lets an upgrade lower capacity or tax per tile', () => {
    for (let t = 1; t < MAX_TIER; t++) {
      const a = TIERS[t], b = TIERS[t + 1];
      const capA = a.capacity / (a.size * a.size), capB = b.capacity / (b.size * b.size);
      const taxA = (a.capacity * a.tax) / (a.size * a.size), taxB = (b.capacity * b.tax) / (b.size * b.size);
      expect(capB).toBeGreaterThanOrEqual(capA);
      expect(taxB).toBeGreaterThanOrEqual(taxA);
    }
  });
  it('makes each tier need everything the tier below needs', () => {
    for (let t = 1; t < MAX_TIER; t++) {
      for (const need of TIERS[t].needs) expect(TIERS[t + 1].needs).toContain(need);
    }
  });
  it('only unlocks buildings that exist', () => {
    for (const m of MILESTONES) for (const type of m.unlocks) expect(Boolean(BUILDINGS[type])).toBe(true);
  });
  it('orders milestones by population', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].population).toBeGreaterThan(MILESTONES[i - 1].population);
    }
  });
  it('gives every building a valid footprint, cost and priority', () => {
    for (const [type, b] of Object.entries(BUILDINGS)) {
      expect(b.w).toBeGreaterThanOrEqual(1);
      expect(b.d).toBeGreaterThanOrEqual(1);
      expect(b.cost).toBeGreaterThan(0);
      if (b.workers > 0) expect(PRIORITY_LEVELS).toContain(b.priority);
    }
  });
  it('only references goods that exist', () => {
    for (const b of Object.values(BUILDINGS)) {
      if (b.produces) expect(Boolean(GOODS[b.produces.good])).toBe(true);
      for (const g of b.stores || []) expect(Boolean(GOODS[g])).toBe(true);
      for (const g of b.sells || []) expect(Boolean(GOODS[g])).toBe(true);
    }
    expect(FOOD_GOODS).toContain('grain');
  });
  it('keeps economy constants sane', () => {
    expect(ECONOMY.startGold).toBe(2000);
    expect(ECONOMY.debtFloor).toBe(-500);
    expect(ECONOMY.workerShare).toBeGreaterThan(0);
    expect(ECONOMY.workerShare).toBeLessThan(1);
  });
});
