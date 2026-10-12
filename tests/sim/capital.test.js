import { describe, it, expect } from '../harness.js';
import { housesOf, population, allBuildings } from '../../src/sim/world.js';
import { ECONOMY } from '../../src/data/economy.js';
import { GOALS, EVENT_GOALS, GUIDE_REWARD } from '../../src/data/goals.js';
import { FIRSTS, FIRST_REWARD } from '../../src/data/firsts.js';
import { canBurn, staffedCover } from '../../src/sim/fire.js';
import { touchesRoad } from '../../src/sim/reach.js';
import { capitalRun, CAPITAL_SCRIPT } from '../stage4/balance/capitalRun.js';

// The Stage 2 balance run (spec 9, 11): the city, its script and the run live in tests/stage4/balance/capitalRun.js
// (Stage 4 added the monument programme there); this file checks what the run promised before Stage 4, and
// tests/stage4/balance/capital.test.js what spec 9 adds. Both read one shared run.
const share = (list, test) => list.filter(test).length / Math.max(1, list.length);

describe('capital run', () => {
  it('grows from the starting treasury to Capital through the public commands, stays solvent, and keeps its chains and homes supplied', () => {
    const r = capitalRun();
    const { w } = r;
    expect(r.insane).toEqual([]);                                                // every month end sane
    expect(r.steps).toBe(CAPITAL_SCRIPT.length);                               // every step found its place and its gold
    expect(w.milestone).toBe('capital');
    expect(r.capitalMonth).toBeLessThanOrEqual(36);                             // Capital within three game-years
    expect(r.lowestGold).toBeGreaterThan(0);                                    // never in debt at a month end
    expect(population(w)).toBeGreaterThanOrEqual(1000);
    expect(w.mood).toBeGreaterThanOrEqual(30);                                  // nobody is leaving
    // No money from nowhere: the treasury is at most the starting gold plus each month's net (taxes less wages and
    // upkeep), the trade income and every gold goal and first, less what the script spent and the monuments' work,
    // gilding and capstone gold (paid daily, outside net); it falls short of that only by the goals and firsts not yet
    // earned (and by tribute, festivals and rubble, which this run never pays).
    const rewards = [...GOALS, ...EVENT_GOALS].reduce((n, g) => n + g.reward, 0) + GUIDE_REWARD + FIRSTS.length * FIRST_REWARD;
    const monumentGold = r.months.reduce((n, m) => n + m.monuments, 0);
    expect(w.gold).toBeLessThanOrEqual(ECONOMY.startGold + r.net + w.tally.tradeIncome + rewards - r.spent - monumentGold);
    // No stuck chain: in the last year every chain kept making its goods, at least a workshop's steady output.
    const yearAgo = r.made[r.made.length - 13];
    const lastYear = (good) => (w.tally.made[good] || 0) - (yearAgo[good] || 0);
    expect(lastYear('clay')).toBeGreaterThanOrEqual(12 * 30);
    expect(lastYear('pottery')).toBeGreaterThanOrEqual(12 * 30);
    expect(lastYear('barley')).toBeGreaterThanOrEqual(12 * 15);
    expect(lastYear('beer')).toBeGreaterThanOrEqual(12 * 15);
    expect(lastYear('grain') + lastYear('figs')).toBeGreaterThanOrEqual(12 * 250);
    // ...and the homes got them: the fed homes, and the Townhouses and up with their pottery, at the last monthly check.
    const homes = housesOf(w);
    expect(share(homes.filter((h) => h.tier >= 3), (h) => h.met.food)).toBeGreaterThanOrEqual(0.95);
    expect(share(homes.filter((h) => h.tier >= 5), (h) => h.met.pottery)).toBeGreaterThanOrEqual(0.9);
    expect(homes.filter((h) => h.tier >= 6).length).toBeGreaterThanOrEqual(2);   // Manors merged on the pleasant block
    expect(w.tally.caravans).toBeGreaterThanOrEqual(4);
    expect(w.tally.sold).toBeGreaterThan(0);
    // Stage 3: every building that can burn and stands on a road has a staffed firehouse in reach (spec 4.12), and the
    // fires and raids leave the Capital standing (measured with Stage 4's monument programme: 37 blazes, 36 put out and
    // the last still being fought when the run ends, nothing burned; two raids, the second of 12 from the north, both
    // beaten). The bounds leave room for retuning. Stage 4's works quarter has its own two firehouses.
    const uncovered = allBuildings(w).filter((b) => canBurn(b) && touchesRoad(w, b) && !staffedCover(w, b));
    expect(uncovered.map((b) => `${b.type} ${b.x},${b.y}`)).toEqual([]);
    expect(w.tally.burned).toBeLessThanOrEqual(6);
    expect(w.tally.raidsLost).toBe(0);
    expect(r.elapsed).toBeLessThan(5000);
  });
});
