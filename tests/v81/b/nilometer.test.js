// Version 8.1 Track B: the Nilometer does something (Josh's option (a), rulings 1221-1222). With a staffed Nilometer standing, the next flood shows on the top
// bar all year, and the floodplain farms prepare: a Low flood's loss is cut by a third. Every rule is tested both ways, with and without a working Nilometer.
import { describe, it, expect } from '../../harness.js';
import { FLOOD_LEVELS, NILOMETER, floodLevelRow, preparedHarvest } from '../../../src/data/river.js';
import { floodHarvestFactor, floodLook, floodOutlook, levelOfYear, nextFlood } from '../../../src/sim/flood.js';
import { produceDay } from '../../../src/sim/production.js';
import { costOf } from '../../../src/sim/costs.js';
import { riverRows } from '../../../src/ui/s46/river.js';
import { S46_RIVER_TEXT as R, TIP_TEXT, TIP_HELP_TEXT, FIRST_TEXT } from '../../../src/ui/text.js';
import { V81_B_TEXT as B } from '../../../src/ui/v81/bText.js';
import { explainStat, statState } from '../../../src/ui/v81/stats.js';
import { riverWorld, addFarm, addGranary, addRaw, stepRiver, dayOf, MONTH } from '../../stage46/river/riverHelpers.js';

function farmsWorld({ month = 8, year = 2, nilometer = false, staffed = true } = {}) {
  const w = riverWorld();
  const on = addFarm(w, 22, 11), off = addFarm(w, 26, 11);
  addGranary(w, 24, 11);
  const n = nilometer ? addRaw(w, 'nilometer', 19, 12) : null;
  if (n) n.staff = staffed ? 2 : 0;
  w.day = dayOf(year, month);
  return { w, on, off, n };
}
const monthOutput = (w) => { const g = Object.values(w.buildings).find((b) => b.type === 'granary'); const was = g.store.grain || 0; for (let i = 0; i < MONTH; i++) produceDay(w); return (g.store.grain || 0) - was; };
const text = (nodes) => nodes.map((n) => n.textContent).join(' | ');

describe('v81 b nilometer: the farms prepare (ruling 1221)', () => {
  it('cuts a Low flood\'s loss by a third on a floodplain farm while a staffed Nilometer stands, and leaves every other level alone', () => {
    expect(NILOMETER.lossCut).toBe(1 / 3);
    const low = floodLevelRow('low');
    expect(Math.round(preparedHarvest(low.harvest, true) * 1000)).toBe(733);           // 1 - 0.4 x 2/3
    for (const l of FLOOD_LEVELS) {
      const without = farmsWorld(), staffed = farmsWorld({ nilometer: true }), idle = farmsWorld({ nilometer: true, staffed: false });
      for (const x of [without, staffed, idle]) x.w.flood.applied = l.id;
      const want = l.harvest < 1 ? 1 - (1 - l.harvest) * (2 / 3) : l.harvest;
      expect([l.id, floodHarvestFactor(without.w, without.on), floodHarvestFactor(idle.w, idle.on), Math.abs(floodHarvestFactor(staffed.w, staffed.on) - want) < 1e-9, floodHarvestFactor(staffed.w, staffed.off)])
        .toEqual([l.id, l.harvest, l.harvest, true, 1]);                                    // off the floodplain: 1 either way
    }
  });
  it('makes the farms grow more in a Low year with the Nilometer, by the sim\'s own month of work', () => {
    const without = farmsWorld(), staffed = farmsWorld({ nilometer: true });
    for (const x of [without, staffed]) x.w.flood.applied = 'low';
    const a = monthOutput(without.w), b = monthOutput(staffed.w);
    const perFarm = 30;                                                                      // a staffed grain farm makes 30 a month; the second farm is off the floodplain
    expect([Math.abs(a - (perFarm * 0.6 + perFarm)) <= 1, Math.abs(b - (perFarm * preparedHarvest(0.6, true) + perFarm)) <= 1, b > a]).toEqual([true, true, true]);
  });
  it('says so on the farm\'s sheet, the summary\'s river line and the food forecast, from the same numbers', () => {
    const without = farmsWorld(), staffed = farmsWorld({ nilometer: true });
    for (const x of [without, staffed]) x.w.flood.applied = 'low';
    const lookA = floodLook(without.w), lookB = floodLook(staffed.w);
    expect([lookA.factor, lookA.prepared, Math.round(lookB.factor * 100), lookB.prepared]).toEqual([0.6, false, 73, true]);
    expect(text(riverRows(without.w, without.on))).toContain('60%');
    expect(text(riverRows(staffed.w, staffed.on))).toContain('73%');
    expect(text(riverRows(staffed.w, staffed.on))).toContain("the Nilometer's warning cut the loss by a third");
    expect(R.floodLine(lookB)).toContain('73%');
    expect(R.floodLine(lookA)).toContain('60%');
    expect(floodOutlook(staffed.w).now > floodOutlook(without.w).now).toBe(true);
  });
  it('states the rule on the Nilometer\'s sheet, its first, its tip and How to play, from the data', () => {
    const rule = "a Low flood's loss is cut by a third (60% becomes 73%)";
    for (const words of [R.nilometerNote, FIRST_TEXT.first_nilometer.why]) {
      expect([words.includes(rule), words.includes('top bar')]).toEqual([true, true]);
    }
    // How to play (20 words at most): the same two numbers.
    expect([TIP_HELP_TEXT.nilometer_forecast.includes('a Low flood gives floodplain farms 73%, not 60%'), TIP_HELP_TEXT.nilometer_forecast.includes('top bar'), TIP_HELP_TEXT.nilometer_forecast.split(/\s+/).length <= 20]).toEqual([true, true, true]);
    expect([TIP_TEXT.nilometer_forecast.includes("a Low flood's loss by a third"), TIP_TEXT.nilometer_forecast.includes('top bar'), TIP_TEXT.nilometer_forecast.split(/\s+/).length <= 20]).toEqual([true, true, true]);
    expect(R.forecastCaption('low', true)).toContain('73%');
    expect(R.forecastCaption('low')).toContain('60%');
    expect(R.forecastCaption('high', true)).toBe(R.forecastCaption('high'));              // nothing to cut in a rich year
  });
});

describe('v81 b nilometer: the next flood all year (ruling 1222)', () => {
  it('names the next rise\'s level all year with a staffed Nilometer, and only what the city knows without one', () => {
    for (const month of [1, 2, 5, 11, 12]) {
      const staffed = farmsWorld({ nilometer: true, month: 1 }), without = farmsWorld({ month: 1 });
      for (const x of [staffed, without]) stepRiver(x.w, dayOf(2, month) + 2 - x.w.day);   // the river's days, the rise included
      const target = month < 7 ? 2 : 3;
      const a = nextFlood(staffed.w), b = nextFlood(without.w);
      expect([month, a.on, a.year, a.level && a.level.id, a.nilometer, a.monthsTo]).toEqual([month, true, target, staffed.w.flood.year === target ? staffed.w.flood.level : levelOfYear(staffed.w, target), true, month < 7 ? 7 - month : 12 - month + 7]);
      // Without one the level is unknown before month 4's reading could have come (nothing reads it), and stays unknown.
      expect([month, b.level, b.nilometer]).toEqual([month, null, false]);
    }
  });
  it('reads, never writes: the world is the same after asking', () => {
    const { w } = farmsWorld({ nilometer: true, month: 11 });
    const before = JSON.stringify(w.flood);
    nextFlood(w); nextFlood(w);
    expect(JSON.stringify(w.flood)).toBe(before);
  });
  it('is off before the river floods in the city (a Town)', () => {
    const w = riverWorld({ milestone: 'village' });
    expect([nextFlood(w).on, nextFlood(w).level]).toEqual([false, null]);
  });
  it('shows on the date icon (the gauge) and in its explainer, and the Nilometer\'s sheet names it outside the water\'s months', () => {
    const staffed = farmsWorld({ nilometer: true, month: 1 }), without = farmsWorld({ month: 1 });
    for (const x of [staffed, without]) stepRiver(x.w, dayOf(2, 11) + 2 - x.w.day);
    const want = levelOfYear(staffed.w, 3);
    const s = statState(staffed.w), t = statState(without.w);
    expect([s.date.level, t.date.level]).toEqual([FLOOD_LEVELS.findIndex((l) => l.id === want), -1]);
    expect(s.date.words).toContain(`next flood ${R.levelName(want)}`);
    expect(t.date.words.includes('next flood')).toBe(false);
    const ex = explainStat(staffed.w, 'date'), ey = explainStat(without.w, 'date');
    expect(ex.notes.join(' ')).toContain(`Next flood: ${R.levelName(want)}`);
    expect(ey.notes.join(' ')).toContain('Its level is not known');
    expect(text(riverRows(staffed.w, staffed.n))).toContain(R.nilometerKnown(want));
  });
  it('offers to build a Nilometer from the date\'s explainer when the city has none, and to show the one with no workers', () => {
    const shown = [], selected = [];
    const deps = { advice: { showMe: (t) => shown.push(t.item), fix() {} }, selectBuilding: (id) => selected.push(id), openSummary() {} };
    const none = farmsWorld({ month: 11 });
    const a = explainStat(none.w, 'date', deps);
    expect([a.action.kind, a.action.label]).toEqual(['build', B.nilometerBuild(costOf(none.w, 'nilometer'))]);
    a.action.run();
    const idle = farmsWorld({ nilometer: true, staffed: false, month: 11 });
    const b = explainStat(idle.w, 'date', deps);
    b.action.run();
    expect([shown, selected, b.notes.includes(B.date.idle)]).toEqual([['nilometer'], [idle.n.id], true]);
  });
});
