// Version 6.0, the balance pass (wave 4; ruling 783): the new dangers on, in the long runs. The older runs keep the dangers' grace from ever ending (tests/v60/b1/grace.js, ruling
// 689: they measure the game as it was); these two, played by a steady player who answers the dangers as Advice and the sheets say (./respond.js), measure it with them:
//   - the late run: the capital run from day 0 with a new city's three-year grace, then the late run to year 15 on Normal. Every kind the sim has fires at least once (raids that wreck,
//     fires, plague, a low Nile, locusts and blight), none of the new ones before day 1,080 (three game years), each is warned before it strikes with its item in Advice's top three,
//     and the city stands: the treasury above 0 from the day the grace ends to year 15, the people there, the raids beaten.
//   - the grand district run to year 10 with the dangers on: the same of what it meets (it also loots: the late city's raids never reach a stocked store).
// Measured on v60-balance (docs/superpowers/notes/2026-10-22-v60-a-balance.md, "Wave 4"): late run, strikes locusts day 1,260 (year 4), plague 1,470, a low Nile 1,980, blight 2,220, plague
// 2,700, locusts 3,240, a low Nile 3,780, plague 3,870, locusts 3,930, locusts 4,920; 5 raids all beaten, 4 wrecked; 21,067 gold at year 15 (the same city with the dangers off: 24,307), the
// lowest 17,618 from year 7.
import { describe, it, expect } from '../../harness.js';
import { lateDangerRun, grandDangerRun } from './dangerRuns.js';
import { lateRun } from '../../stage47/pressure/lateRun.js';
import { GRACE_DAYS } from '../../../src/data/hazards.js';
import { population } from '../../../src/sim/world.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';

const YEAR_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const NEW_EVENTS = ['plague_warning', 'plague_start', 'drought_warning', 'drought_start', 'locusts_warning', 'locusts_strike', 'raid_wreck', 'raid_loot'];
const STARTS = { plague_warning: 'plague', drought_warning: 'drought', locusts_warning: 'locusts' };

// Each warning event's matching strike (the world's own record of what began): the strike is at least the warning's lead after it, and no new danger came before the grace ended.
function checkGrace(rec) {
  const seen = rec.seen.filter((e) => NEW_EVENTS.includes(e.type));
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.filter((e) => e.monthEnd <= GRACE_DAYS)).toEqual([]);            // not one new danger's event in a month that ended on or before day 1,080
  expect(rec.strikes.filter((s) => s.day < GRACE_DAYS)).toEqual([]);
  for (const s of rec.strikes) {
    const kind = s.kind === 'blight' ? 'locusts' : s.kind;
    const warned = rec.seen.filter((e) => STARTS[e.type] === kind && e.monthEnd <= s.day);
    expect([s.kind, s.day, warned.length > 0]).toEqual([s.kind, s.day, true]);   // every strike was warned before it came
  }
}

// Advice at each warning: the danger's item in the top three, and nothing among the top items that the sim would refuse (Show me, Harvest now, a building that is gone).
function checkAdvice(rec) {
  expect(rec.warnings.length).toBeGreaterThan(0);
  for (const wn of rec.warnings) {
    expect([wn.type, wn.monthEnd, wn.rank >= 0 && wn.rank <= 2]).toEqual([wn.type, wn.monthEnd, true]);
    for (const a of wn.top) expect([wn.type, wn.monthEnd, a.kind, a.refused]).toEqual([wn.type, wn.monthEnd, a.kind, null]);
  }
  for (const rows of Object.values(rec.snapshots)) for (const a of rows) expect([a.kind, a.refused]).toEqual([a.kind, null]);
}

describe('v60 balance dangers late run', () => {
  it('meets plague, a low Nile, locusts and blight, raids that wreck, and fire, none before year 3, each warned first with its Advice item in the top three', () => {
    const { r, rec } = lateDangerRun();
    expect(r.insane).toEqual([]);
    expect(r.w.day).toBe(15 * YEAR_DAYS);
    const t = r.w.tally;
    expect(t.plagues).toBeGreaterThanOrEqual(1);
    expect(t.droughts).toBeGreaterThanOrEqual(1);
    expect(t.swarms).toBeGreaterThanOrEqual(1);
    expect(t.blights).toBeGreaterThanOrEqual(1);
    expect(t.wrecked).toBeGreaterThanOrEqual(1);
    expect(t.raids).toBeGreaterThanOrEqual(3);
    expect(t.fires).toBeGreaterThanOrEqual(1);
    expect(new Set(rec.strikes.map((s) => s.kind))).toEqual(new Set(['plague', 'drought', 'locusts', 'blight']));
    checkGrace(rec);
    checkAdvice(rec);
  });

  it('survives a steady player\'s answers: the treasury above 0 from the grace\'s end, the people and the rank kept, every raid beaten, and not a ruin beside the same city with the dangers off', () => {
    const { r, rec } = lateDangerRun();
    const off = lateRun();
    expect(r.lowestGold).toBeGreaterThan(0);
    for (let y = 7; y <= 15; y++) expect([y, r.yearly[y].gold > 0]).toEqual([y, true]);
    expect(population(r.w)).toBeGreaterThanOrEqual(1000);
    expect(r.w.milestone).toBe('capital');
    expect(r.w.tally.raidsLost).toBe(0);
    expect(r.yearly[15].gold).toBeGreaterThanOrEqual(0.5 * off.yearly[15].gold);
    expect(population(r.w)).toBeGreaterThanOrEqual(0.9 * population(off.w));
    expect(r.elapsed).toBeLessThan(60000);
    // the player's answers were made, each through the sim's own commands
    expect(rec.did.harvest).toBeGreaterThan(0);
    expect(rec.did.physician).toBeGreaterThan(0);
    expect(rec.did.rebuilt).toBeGreaterThan(0);
    expect(rec.did.rebuildFailed).toBe(0);
  });
});

describe('v60 balance dangers grand district run', () => {
  it('meets and survives the dangers to year 10: plague, a low Nile, locusts and blight, a wreck and a looting, none before year 3, all raids beaten, the treasury above 0', () => {
    const { g, rec } = grandDangerRun();
    const t = g.w.tally;
    expect(t.plagues).toBeGreaterThanOrEqual(1);
    expect(t.droughts).toBeGreaterThanOrEqual(1);
    expect(t.swarms + t.blights).toBeGreaterThanOrEqual(1);
    expect(t.wrecked).toBeGreaterThanOrEqual(1);
    expect(t.looted).toBeGreaterThanOrEqual(1);
    checkGrace(rec);
    checkAdvice(rec);
    expect(g.lowestGold).toBeGreaterThan(0);
    expect([Math.min(...g.months.map((m) => m.gold)) > 0, Math.min(...g.months.map((m) => m.people)) >= 800, population(g.w) >= 1100]).toEqual([true, true, true]);
    expect(t.raidsLost).toBe(0);
    expect(g.w.day).toBe(10 * YEAR_DAYS);
  });
});
