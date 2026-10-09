import { describe, it, expect } from '../harness.js';
import { advanceDays, dateParts, daysForSeconds } from '../../src/sim/clock.js';
import { pushUndo } from '../../src/sim/undo.js';
import { population } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

describe('clock', () => {
  it('counts days, months and years from 1', () => {
    const w = makeTestWorld();
    expect(dateParts(w)).toEqual({ year: 1, month: 1, day: 1 });
    advanceDays(w, 30);
    expect(dateParts(w)).toEqual({ year: 1, month: 2, day: 1 });
    advanceDays(w, 330);
    expect(dateParts(w)).toEqual({ year: 2, month: 1, day: 1 });
  });
  it('converts real seconds to game days by speed', () => {
    expect(daysForSeconds(1, 20)).toBe(30);
    expect(daysForSeconds(3, 2)).toBe(9);
    expect(daysForSeconds(0, 10)).toBe(0);
  });
  it('clears undo history at the month tick', () => {
    const w = makeTestWorld();
    pushUndo(w, { kind: 'road', tiles: [], cost: 0 });
    advanceDays(w, 29);
    expect(w.undo.length).toBe(1);
    advanceDays(w, 1);
    expect(w.undo.length).toBe(0);
  });
  it('brings the first arrivals on day 10', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 5, 11);
    advanceDays(w, 9);
    expect(population(w)).toBe(0);
    advanceDays(w, 1);
    expect(population(w)).toBe(5);
  });
});