// tests/v93/d0/week.test.js
import { describe, it, expect } from '../../harness.js';
import { isoWeek, weekKey, weeklySeed, isWeekKey, weekIndex, decreesOfWeek, isPairWeek } from '../../../src/ui/week.js';
import { DECREES, DECREE_ORDER, DECREE_PAIRS } from '../../../src/data/decrees.js';

describe('v93 d0 the week', () => {
  it('reads ISO weeks across a 53-week year', () => {
    expect(weekKey(new Date(2026, 10, 10))).toBe('2026-46');
    expect(weekKey(new Date(2026, 10, 16))).toBe('2026-47');
    expect(weekKey(new Date(2026, 11, 31))).toBe('2026-53');
    expect(weekKey(new Date(2027, 0, 1))).toBe('2026-53');
    expect(weekKey(new Date(2027, 0, 4))).toBe('2027-01');
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 });
  });
  it('gives the seed and checks keys', () => {
    expect(weeklySeed('2026-47')).toBe(202647);
    expect(isWeekKey('2026-53')).toBe(true);
    expect(isWeekKey('2027-53')).toBe(false);
    expect(isWeekKey('2026-00')).toBe(false);
    expect(isWeekKey('26-47')).toBe(false);
  });
  it('counts weeks from the epoch', () => {
    expect(weekIndex('2026-47')).toBe(0);
    expect(weekIndex('2026-46')).toBe(-1);
    expect(weekIndex('2026-53')).toBe(6);
    expect(weekIndex('2027-01')).toBe(7);
  });
  it('turns the decrees, a pair every fourth week', () => {
    expect(decreesOfWeek('2026-47')).toEqual(['sea_peoples']);
    expect(decreesOfWeek('2026-48')).toEqual(['low_nile']);
    expect(decreesOfWeek('2026-49')).toEqual(['plague']);
    expect(decreesOfWeek('2026-50')).toEqual(['low_nile', 'golden_caravans']);
    expect(isPairWeek('2026-50')).toBe(true);
    expect(decreesOfWeek('2026-51')).toEqual(['stone_famine']);
    expect(decreesOfWeek('2026-46')).toEqual(['plague', 'low_nile']);
  });
  it('repeats no decree within nine single weeks, before and after the epoch', () => {
    for (const start of [-40, -9, 0, 13, 101]) {
      const seen = [];
      for (let i = start; seen.length < 9; i++) if (((i % 4) + 4) % 4 !== 3) seen.push(decreesOfWeek(keyOfIndex(i))[0]);
      expect(new Set(seen).size).toBe(9);
    }
  });
  it('keeps the table whole', () => {
    expect(DECREE_ORDER.length).toBe(9);
    for (const id of DECREE_ORDER) expect(typeof DECREES[id].measure).toBe('string');
    for (const [a, b] of DECREE_PAIRS) { expect(Boolean(DECREES[a] && DECREES[b])).toBe(true); expect(a === b).toBe(false); }
  });
});

// The key of the week `i` weeks from the epoch (test helper: walks Mondays from 2026-11-16).
function keyOfIndex(i) { return weekKey(new Date(2026, 10, 16 + 7 * i)); }
