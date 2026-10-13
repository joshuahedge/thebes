// Task 2 (ruling 311): a slower clock. At 1x a day is a second and a month is 30 seconds; every game-day timing stretches
// with it (the monuments' times, the danger table), and the block a crew lays still shows at least every 5 s at 1x.
import { describe, it, expect } from '../harness.js';
import { DAYS_PER_SECOND, DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../src/sim/time.js';
import { daysForSeconds } from '../../src/sim/clock.js';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT } from '../../src/data/monuments.js';
import { PALACE_STYLES } from '../../src/data/palace.js';
import { BLOCK_UNITS, blocksIn } from '../../src/render/art/monuments.js';

const secondsAt = (speed, days) => days / (speed * DAYS_PER_SECOND);

describe('s45 clock', () => {
  it('runs a day a second and a month 30 s at 1x, 10 s at 3x', () => {
    expect(DAYS_PER_SECOND).toBe(1);
    expect([secondsAt(1, DAYS_PER_MONTH), secondsAt(3, DAYS_PER_MONTH), secondsAt(1, DAYS_PER_MONTH * MONTHS_PER_YEAR)]).toEqual([30, 10, 360]);
    expect([daysForSeconds(1, 30), daysForSeconds(2, 30), daysForSeconds(3, 30)]).toEqual([30, 60, 90]);
  });
  it('stretches the monuments: the great pyramid takes about 90 min at 1x and 30 at 3x, the small obelisk 90 s', () => {
    const minutes = (k, speed) => secondsAt(speed, (MONUMENTS[k].crewMonths / MONUMENTS[k].crews) * DAYS_PER_MONTH) / 60;
    expect([minutes('pyramid_great', 1), minutes('pyramid_great', 3)]).toEqual([90, 30]);
    expect(minutes('obelisk_small', 1) * 60).toBe(90);
    expect(MONUMENT_KINDS.map((k) => Math.round(minutes(k, 1) * 10) / 10)).toEqual([1.5, 4.5, 12, 18, 30, 48, 90]);
  });
  it('stretches the palace works: 30, 60, 90, 120 days are 30 s, 1 min, 1 min 30 s, 2 min at 1x', () => {
    expect(PALACE_STYLES.map((s) => secondsAt(1, s.days))).toEqual([0, 30, 60, 90, 120]);
  });
  it('still lays a block at least every 5 s at 1x with one full crew (the cadence is real time)', () => {
    const unitsPerSecond = (MONUMENT.unitsPerCrewMonth / DAYS_PER_MONTH) * DAYS_PER_SECOND;
    for (const k of MONUMENT_KINDS) MONUMENTS[k].courses.forEach((c, i) => {
      expect([k, i, (c.stone + c.bricks) / blocksIn(k, i) / unitsPerSecond <= 5]).toEqual([k, i, true]);
    });
    expect(BLOCK_UNITS / unitsPerSecond).toBeLessThanOrEqual(5);
  });
});
