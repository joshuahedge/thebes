// tests/v93/d0/rules.test.js
import { describe, it, expect } from '../../harness.js';
import { ruleFactor, ruleCost, ruleRate, ruleUnitPay, ruleReach, ruleElephantsFrom, ruleBoatShare, ruleForbids, isDecreeRun, decreeEnded } from '../../../src/sim/rules.js';
import { heirFactor } from '../../../src/sim/dynasty.js';
import { createWorld } from '../../../src/sim/world.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';

describe('v93 d0 rules', () => {
  it('gives today\'s numbers with no decree', () => {
    const w = createWorld({ seed: 7, heir: 'builder' });
    expect(w.decree).toBe(undefined);
    for (const lever of ['crews', 'taxes', 'farms', 'raidGap', 'fireStart']) expect(ruleFactor(w, lever)).toBe(heirFactor(w, lever));
    expect(ruleCost(w, 'wall')).toBe(1); expect(ruleRate(w, 'quarry')).toBe(1); expect(ruleUnitPay(w, 'archer')).toBe(1);
    expect(ruleReach(w, 'firehouse', 8)).toBe(8); expect(ruleElephantsFrom(w, 5)).toBe(5); expect(ruleBoatShare(w, 0.2)).toBe(0.2);
    expect(ruleForbids(w, 'wall')).toBe(false); expect(isDecreeRun(w)).toBe(false); expect(decreeEnded(w)).toBe(false);
  });
  it('bends the numbers under a decree, the Steady heir and Normal for everyone', () => {
    const w = createWorld({ seed: 202647, heir: 'builder', difficulty: 'hard', decree: { week: '2026-47', ids: ['sea_peoples', 'fire_season'] } });
    expect(w.heir).toBe('steady'); expect(w.difficulty).toBe('normal');
    expect(w.decree).toEqual({ week: '2026-47', ids: ['sea_peoples', 'fire_season'], endDay: 2160, ended: false });
    expect(ruleFactor(w, 'raidGap')).toBe(0.5); expect(ruleFactor(w, 'fireStart')).toBe(3);
    expect(ruleCost(w, 'wall')).toBe(0.5); expect(ruleReach(w, 'firehouse', 8)).toBe(12); expect(ruleBoatShare(w, 0.2)).toBe(0.5);
    expect(isDecreeRun(w)).toBe(true);
  });
  it('forbids walls in an open city and ignores unknown ids', () => {
    const w = createWorld({ seed: 1, decree: { week: '2026-52', ids: ['open_city', 'nonsense'] } });
    expect(ruleForbids(w, 'wall')).toBe(true); expect(ruleForbids(w, 'gate')).toBe(true); expect(ruleForbids(w, 'tower')).toBe(false);
    expect(w.decree.ids).toEqual(['open_city']);
  });
  it('saves and loads a decree world, and a plain world has no decree key', () => {
    const w = createWorld({ seed: 3, decree: { week: '2026-47', ids: ['low_nile'] } });
    const back = unpackSave(packSave(w)).world;
    expect(back.decree).toEqual({ week: '2026-47', ids: ['low_nile'], endDay: 2160, ended: false });
    expect(Object.hasOwn(unpackSave(packSave(createWorld({ seed: 3 }))).world, 'decree')).toBe(false);
  });
});
