import { describe, it, expect } from '../../harness.js';
import { allBuildings, isFinished, isSite } from '../../../src/sim/world.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { capitalRun, CAPITAL_YEARS } from './capitalRun.js';

// Spec 9's Stage 4 promises for the capital run (the run and its monument programme: ./capitalRun.js; the Stage 2-3
// promises: tests/sim/capital.test.js). Measured on the merged branch (Tracks A-H) with the work gold at 6.4 a unit (128 a
// crew-month, src/data/monuments.js): Capital in month 19; the small obelisk finished on day 557, the colossus on day 1,253
// and the small mastaba on day 1,966 (year 6 ends on day 2,160); four crews at work at every month end of the last 24; 68.2%
// of taxes on wages, upkeep, soldiers' pay and monument work over those months; 58,949 gold at year 6; unemployment at
// most 13.8% at a month end while four crews work. The writer's figures on Track A's scratch sim at 6.5 were 68.4% and
// 58,341 gold. On the merged branch 6.5 holds 59,319 gold but months 64 and 65 read 17.4% unemployment: all three quarries
// are idle then (a quarry no site needs employs nobody, ruling 2) and 76 jobs drop out. That swing is chaotic in the work
// gold (the last 24 months stay at or under 15% at 5.5, 6, 6.25, 6.4, 6.6, 6.9, 7, 7.25 and 7.5, not at 6.5, 6.75 or 7.1),
// so 6.4 is chosen for its room on both bands: 1.8 points under 70%, 1,051 gold under 60,000, the small mastaba 194 days
// before year 6 ends.
const YEAR_6 = CAPITAL_YEARS * MONTHS_PER_YEAR * DAYS_PER_MONTH;
const WINDOW = 24;                                                                // the last two years of the run
const of = (w, type) => allBuildings(w).filter((b) => b.type === type);
const spending = (m) => m.wages + m.upkeep + m.soldiers + m.monuments;

describe('s4 balance capital run', () => {
  it('lays the monument programme through the commands and finishes the small obelisk, the colossus and the small mastaba by year 6', () => {
    const { w, lowestGold } = capitalRun();
    expect(['builders_guild', 'quarry', 'brickworks'].map((t) => of(w, t).length)).toEqual([4, 3, 2]);
    expect(lowestGold).toBeGreaterThanOrEqual(0);                              // every month-end treasury is 0 or above
    for (const type of ['obelisk_small', 'colossus', 'mastaba_small']) {
      const b = of(w, type)[0];
      expect([type, isFinished(b), b.site.done <= YEAR_6]).toEqual([type, true, true]);
    }
    expect(isUnlocked(w, 'pyramid_small')).toBe(true);                          // 100 prestige reached
    expect(['mastaba_large', 'pyramid_small'].map((t) => isSite(of(w, t)[0]))).toEqual([true, true]);   // under way
  });

  it('spends 60-70% of its taxes on wages, upkeep, soldiers\' pay and monument work over the last 24 months, while four crews work', () => {
    const last = capitalRun().months.slice(-WINDOW);
    expect(last.map((m) => m.crews)).toEqual(last.map(() => 4));                // four crews at every month end
    const taxes = last.reduce((n, m) => n + m.taxes, 0);
    const share = last.reduce((n, m) => n + spending(m), 0) / taxes;
    expect(share).toBeGreaterThanOrEqual(0.6);
    expect(share).toBeLessThanOrEqual(0.7);
    // The work gold is the lever (spec 4.11): the same months without it spend under 60%.
    expect(last.reduce((n, m) => n + spending(m) - m.monuments, 0) / taxes).toBeLessThan(0.6);
  });

  it('holds at most 60,000 gold at year 6, and keeps unemployment at or under 15% while its crews work', () => {
    const { w, months } = capitalRun();
    expect(months.length).toBe(CAPITAL_YEARS * MONTHS_PER_YEAR);
    expect(w.gold).toBeLessThanOrEqual(60000);
    const idle = months.slice(-WINDOW).map((m) => (m.workforce - m.employed) / m.workforce);
    expect(Math.max(...idle)).toBeLessThanOrEqual(0.15);
  });
});
