import { describe, it, expect } from '../harness.js';
import { assignLabour, staffRatio, isWorking } from '../../src/sim/labour.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

function town(residents) {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 20, 11, { tier: 4, residents });
  return w;
}

describe('labour', () => {
  it('derives the workforce from population', () => {
    const w = town(100);
    assignLabour(w);
    expect(w.labour.workforce).toBe(40);
  });
  it('fills essential jobs before services', () => {
    const w = town(40); // 16 workers
    const farm = addRaw(w, 'farm_grain', 2, 8);
    const granary = addRaw(w, 'granary', 5, 8);
    const temple = addRaw(w, 'temple', 12, 8);
    assignLabour(w);
    expect(farm.staff).toBe(10);
    expect(granary.staff).toBe(6);
    expect(temple.staff).toBe(0);
    expect(w.labour.shortLevels).toEqual(['services']);
    expect(w.labour.jobs).toBe(22);
  });
  it('shares a short level proportionally', () => {
    const w = town(20); // 8 workers
    const farm = addRaw(w, 'farm_grain', 2, 8);
    const granary = addRaw(w, 'granary', 5, 8);
    assignLabour(w);
    expect(farm.staff + granary.staff).toBe(8);
    expect(farm.staff).toBeGreaterThan(granary.staff);
  });
  it('skips paused and roadless buildings', () => {
    const w = town(100);
    const paused = addRaw(w, 'temple', 12, 8, { paused: true });
    const roadless = addRaw(w, 'temple', 12, 20);
    assignLabour(w);
    expect(paused.staff).toBe(0);
    expect(roadless.staff).toBe(0);
  });
  it('treats a quarter staffing as the working threshold', () => {
    const w = town(0);
    const t = addRaw(w, 'temple', 12, 8);
    t.staff = 1;
    expect(isWorking(w, t)).toBe(false);
    t.staff = 2;
    expect(staffRatio(w, t)).toBe(2 / 6);
    expect(isWorking(w, t)).toBe(true);
    const well = addRaw(w, 'well', 3, 11);
    expect(isWorking(w, well)).toBe(true);
  });
});
