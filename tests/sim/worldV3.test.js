import { describe, it, expect } from '../harness.js';
import { createWorld, WORLD_VERSION } from '../../src/sim/world.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../src/data/difficulty.js';

describe('world v3', () => {
  it('creates a version 3 world with a difficulty, no trade, no new items and the new tallies at zero', () => {
    const w = createWorld({ seed: 4 });
    expect(WORLD_VERSION).toBe(3);
    expect(w.version).toBe(3);
    expect(w.difficulty).toBe('normal');
    expect(w.trade).toEqual({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });
    expect(w.newItems).toEqual([]);
    expect(w.tally).toEqual({
      harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0,
      made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0,
    });
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
  it('starts a city at the difficulty it is given, and at Normal for anything that is not a level', () => {
    for (const d of DIFFICULTY_ORDER) expect(createWorld({ seed: 4, difficulty: d }).difficulty).toBe(d);
    expect(createWorld({ seed: 4, difficulty: 'nightmare' }).difficulty).toBe('normal');
    expect(createWorld({ seed: 4, difficulty: 'toString' }).difficulty).toBe('normal');   // the levels' own keys only
    expect(createWorld({ seed: 4, difficulty: null }).difficulty).toBe('normal');
  });
  it('changes nothing else with the difficulty: the same map, gold and start road', () => {
    const a = createWorld({ seed: 9, difficulty: 'relaxed' }), b = createWorld({ seed: 9, difficulty: 'hard' });
    const { difficulty: da, ...restA } = a;
    const { difficulty: db, ...restB } = b;
    expect([da, db]).toEqual(['relaxed', 'hard']);
    expect(restA).toEqual(restB);
  });
  it('gives each new world its own trade state and lists', () => {
    const a = createWorld({ seed: 4 }), b = createWorld({ seed: 4 });
    a.trade.routes.memphis = { opened: 1 };
    a.newItems.push('booth');
    a.tally.made.pottery = 3;
    expect(b.trade.routes).toEqual({});
    expect(b.newItems).toEqual([]);
    expect(b.tally.made).toEqual({});
  });
});

describe('data difficulty', () => {
  it('lists Relaxed, Normal and Hard with the spec 4.18 multipliers', () => {
    expect(DIFFICULTY_ORDER).toEqual(['relaxed', 'normal', 'hard']);
    expect(Object.keys(DIFFICULTIES).sort()).toEqual([...DIFFICULTY_ORDER].sort());
    expect(DIFFICULTIES).toEqual({ relaxed: { cost: 0.8, risk: 0.5 }, normal: { cost: 1, risk: 1 }, hard: { cost: 1.25, risk: 1.5 } });
  });
});
