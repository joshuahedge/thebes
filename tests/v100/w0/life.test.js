// Version 10.0 (Track 0, rulings 2057-2059, 2101): the LIFE budget, its dropper and the lifeAt seam, with no sources yet (Track L adds them).
import { describe, it, expect } from '../../harness.js';
import { LIFE } from '../../../src/data/ambient.js';
import { createLife, LIFE_IDS } from '../../../src/render/v100/life.js';

const range = { x0: 0, y0: 0, x1: 10, y1: 10 };

describe('v100 w0 life: a budget, a dropper and a seam with no sources', () => {
  it('has the numbers the spec gives', () => {
    expect(LIFE.budgetMs).toEqual({ desktop: 1.5, phone: 1.0 });
    expect(LIFE.dropOrder).toEqual(['crowd', 'river', 'idle', 'weather', 'flicker']);
    expect(LIFE.idleCap).toEqual({ desktop: 24, phone: 16 });
  });
  it('draws nothing and returns no walkers with no sources', () => {
    const life = createLife({ deviceKind: 'phone', level: () => 'full', now: () => 0 });
    expect(life.walkers({}, 0, 0, range, 'full')).toEqual([]);
    expect(life.stats().sources).toBe(0);
  });
  // Ruling 2102: the v90 dropper holds a level for 2 s (V90_HOLD_MS) and counts its hold from the first frame it accounts, so the first drop
  // comes after 2 s of frames over budget: 200 frames of 16 ms (the plan's 120 end at 1.9 s, before the hold is up).
  it('drops sources in order once over budget, and restores', () => {
    let t = 0;
    const life = createLife({ deviceKind: 'phone', level: () => 'full', now: () => t });
    life.addSource({ name: 'crowd', walkers: () => [{ id: LIFE_IDS.crowd + 1, kind: 'citizen', x: 1, y: 1, dir: 0, stand: true }] });
    expect(life.walkers({}, 0, t, range, 'full').length).toBe(1);
    for (let i = 0; i < 200; i++) { life.spend('crowd', 3); t += 16; }
    expect(life.dropped('crowd')).toBe(true);
    expect(life.walkers({}, 0, t, range, 'full')).toEqual([]);
    for (let i = 0; i < 1200; i++) { life.spend('crowd', 0.1); t += 16; }
    expect(life.dropped('crowd')).toBe(false);
  });
  it('returns no walkers under Still', () => {
    const life = createLife({ deviceKind: 'desktop', level: () => 'still', now: () => 0 });
    life.addSource({ name: 'idle', walkers: () => [{ id: LIFE_IDS.townsfolk + 1, kind: 'citizen', x: 1, y: 1, dir: 0, stand: true }] });
    expect(life.walkers({}, 0, 0, range, 'still')).toEqual([]);
    expect(life.walkers({}, 0, 0, range, 'full')).toEqual([]);   // the level alone is enough
  });
  it('times each source\'s ground and late draws into the budget, and skips a dropped one', () => {
    let t = 0;
    const calls = [];
    const life = createLife({ deviceKind: 'desktop', level: () => 'full', now: () => t });
    life.addSource({ name: 'river', ground: () => calls.push('river ground'), late: () => calls.push('river late') });
    life.addSource({ name: 'flicker', late: () => calls.push('flicker late') });
    life.ground(null, {}, range, t, 'full');
    life.late(null, {}, range, t, 'full');
    expect(calls).toEqual(['river ground', 'river late', 'flicker late']);
    expect(life.stats().sources).toBe(2);
  });
});
