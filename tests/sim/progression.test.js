import { describe, it, expect } from '../harness.js';
import { updateMilestone, isUnlocked, atLeast } from '../../src/sim/progression.js';
import { canAfford, spend, refund } from '../../src/sim/money.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

describe('progression', () => {
  it('starts as a Village with Stage 1 buildings unlocked', () => {
    const w = makeTestWorld();
    expect(w.milestone).toBe('village');
    expect(isUnlocked(w, 'temple')).toBe(true);
    expect(isUnlocked(w, 'nonexistent')).toBe(false);
  });
  it('becomes a Town at 150 people and never goes back', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 1, 1, { tier: 4, residents: 150 });
    expect(updateMilestone(w)).toBe(true);
    expect(w.milestone).toBe('town');
    expect(atLeast(w, 'town')).toBe(true);
    h.residents = 10;
    expect(updateMilestone(w)).toBe(false);
    expect(w.milestone).toBe('town');
  });
});

describe('money', () => {
  it('allows spending down to the debt floor and no further', () => {
    const w = makeTestWorld({ gold: 100 });
    expect(canAfford(w, 600)).toBe(true);
    expect(canAfford(w, 601)).toBe(false);
    spend(w, 50);
    expect(w.gold).toBe(50);
    refund(w, 25);
    expect(w.gold).toBe(75);
  });
});
