// Version 9.1 fix wave (ruling 1739): Back to gold lists buildings of one kind as one row with a count, so no two rows read alike; Pause stops all of that kind, and the
// words are the sim's own (monthFigures).
import { describe, it, expect } from '../../harness.js';
import { topCosts } from '../../../src/ui/v91/debtSheet.js';
import { monthFigures } from '../../../src/sim/economy.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { openSheet } from '../../../src/ui/modes.js';
import { V91_R_TEXT as W, buildingName } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';

function twoFarms() {
  const w = makeTestWorld({ gold: -200 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'market_town';
  addRaw(w, 'house', 12, 9, { tier: 4, residents: 800 });
  addRaw(w, 'farm_grain', 2, 11);
  addRaw(w, 'farm_grain', 4, 11);
  addRaw(w, 'granary', 6, 11);
  assignLabour(w);
  return w;
}

describe('v91 fix debt: one row to a kind (ruling 1739)', () => {
  it('two buildings of one kind are one row with a count and the sum of their costs', () => {
    const w = twoFarms();
    const rows = topCosts(w, 10);
    const farms = rows.filter((r) => r.type === 'farm_grain');
    expect(farms.length).toBe(1);
    expect([farms[0].count, farms[0].ids.length, new Set(rows.map((r) => r.type)).size === rows.length]).toEqual([2, 2, true]);
    expect(W.kindName('farm_grain', 2)).toBe('2 Grain farms');
    expect(W.kindName('granary', 1)).toBe(buildingName('granary'));
  });

  it('the sheet says "2 Grain farms: N a month" once, and Pause stops both and takes the row\'s whole cost off the month', async () => {
    const w = twoFarms();
    const r = await rigUI({ world: w });
    try {
      r.ui.store.set(openSheet(r.ui.store.get(), 'backToGold'));
      const row = topCosts(w, 3).find((x) => x.type === 'farm_grain');
      const lines = [...r.root.querySelectorAll('#sheet .debt-cost strong')].map((n) => n.textContent);
      expect([lines.filter((t) => t === W.costRow('2 Grain farms', row.cost)).length, new Set(lines).size === lines.length]).toEqual([1, true]);
      // The row says before the tap that Pause stops both (fix wave re-review).
      const farmLi = [...r.root.querySelectorAll('#sheet .debt-cost')].find((li) => li.dataset.id === String(row.id));
      expect(farmLi.querySelector('p').textContent).toBe((row.exact ? W.pauseSaves : W.pauseSavesUpTo)(row.cost, 2));
      expect(farmLi.querySelector('p').textContent.includes('all 2')).toBe(true);
      const before = monthFigures(w).net;
      [...r.root.querySelectorAll('#sheet .debt-cost')].find((li) => li.dataset.id === String(row.id)).querySelector('.debt-pause').click();
      expect(row.ids.map((id) => w.buildings[id].paused)).toEqual([true, true]);
      expect(monthFigures(w).net - before).toBe(row.cost);
      expect(r.root.querySelector('#sheet .debt-note').textContent).toBe(W.pausedNote('2 Grain farms', row.cost));
    } finally { r.cleanup(); }
  });

  it('a refusal part-way through a row pauses none of it (all or none)', async () => {
    const w = twoFarms();
    const r = await rigUI({ world: w });
    try {
      r.ui.store.set(openSheet(r.ui.store.get(), 'backToGold'));
      const row = topCosts(w, 3).find((x) => x.type === 'farm_grain');
      delete w.buildings[row.ids[1]];   // the second farm is gone when Pause runs, so setPaused refuses it ('nothing_here')
      [...r.root.querySelectorAll('#sheet .debt-cost')].find((li) => li.dataset.id === String(row.id)).querySelector('.debt-pause').click();
      expect(w.buildings[row.ids[0]].paused).toBe(false);
    } finally { r.cleanup(); }
  });
});
