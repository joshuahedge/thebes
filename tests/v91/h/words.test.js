// Version 9.1 Track H (design 7.3, rulings 1712, 1713): the two words 9.0 left. The court's outputPerMonth reads the heir's rate as production does, and the
// Nilometer's rule on its sheet and its first says this city's own Low-flood numbers. Each set up both ways: the Steady (9.0's numbers) and the heir.
import { describe, it, expect } from '../../harness.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { floodLevelRow, preparedHarvest } from '../../../src/data/river.js';
import { outputPerMonth } from '../../../src/sim/court.js';
import { heirRate, produceDay } from '../../../src/sim/production.js';
import { levelHarvest } from '../../../src/sim/flood.js';
import { riverRows } from '../../../src/ui/s46/river.js';
import { S46_RIVER_TEXT as R, FIRST_TEXT } from '../../../src/ui/text.js';
import { HEIRS } from '../../../src/data/v90.js';
import { riverWorld, addFarm, addGranary, addRaw, dayOf } from '../../stage46/river/riverHelpers.js';

const text = (nodes) => nodes.map((n) => n.textContent).join(' | ');
function city(heir) {
  const w = riverWorld();
  w.heir = heir;
  const farm = addFarm(w, 22, 11);
  addGranary(w, 24, 11);
  const potter = addRaw(w, 'potter', 30, 11, { staff: BUILDINGS.potter.workers, store: {} });
  return { w, farm, potter };
}

describe('v91 h words: the court reckons the heir\'s output (ruling 1712)', () => {
  it('counts the Bountiful\'s farms 15% more and the Merchant\'s workshops 15% less, and every other city as 9.0', () => {
    const plain = city('steady');
    const grain = outputPerMonth(plain.w, 'grain'), pottery = outputPerMonth(plain.w, 'pottery');
    expect([grain > 0, pottery > 0]).toEqual([true, true]);
    for (const heir of HEIRS) {
      const c = city(heir);
      expect([heir, outputPerMonth(c.w, 'grain'), outputPerMonth(c.w, 'pottery')]).toEqual([heir, grain * heirRate(c.w, c.farm), pottery * heirRate(c.w, c.potter)]);
    }
    const f = city('bountiful'), m = city('merchant');
    expect([outputPerMonth(f.w, 'grain'), outputPerMonth(m.w, 'pottery')]).toEqual([grain * 1.15, pottery * 0.85]);
    expect([outputPerMonth(f.w, 'pottery'), outputPerMonth(m.w, 'grain')]).toEqual([pottery, grain]);
  });
  it('matches what the farm really makes in a month of days, for the Steady and the Bountiful', () => {
    for (const heir of ['steady', 'bountiful']) {
      const c = city(heir);
      c.w.day = dayOf(2, 8);
      c.w.flood.applied = 'fair';                                       // a plain year: the flood leaves the farm's rate alone (ruling 1713)
      const g = Object.values(c.w.buildings).find((b) => b.type === 'granary');
      for (let i = 0; i < 30; i++) produceDay(c.w);
      expect([heir, Math.abs((g.store.grain || 0) - outputPerMonth(c.w, 'grain')) <= 1]).toEqual([heir, true]);
    }
  });
});

describe('v91 h words: the Nilometer says this city\'s own Low flood (ruling 1712)', () => {
  it('says 60% becomes 73% for the Steady and every heir but the Bountiful, and 40% becomes 60% for the Bountiful, from the sim', () => {
    const low = floodLevelRow('low');
    for (const heir of HEIRS) {
      const c = city(heir);
      const without = Math.round(levelHarvest(c.w, low) * 100);          // no Nilometer yet: the loss as the farms take it unwarned
      const n = addRaw(c.w, 'nilometer', 19, 12, { staff: BUILDINGS.nilometer.workers });
      const prepared = Math.round(levelHarvest(c.w, low) * 100);
      const want = heir === 'bountiful' ? ['40%', '60%'] : ['60%', '73%'];
      expect([heir, `${without}%`, `${prepared}%`]).toEqual([heir, ...want]);
      const rule = `a Low flood's loss is cut by a third (${want[0]} becomes ${want[1]})`;
      expect([heir, R.nilometerNoteFor(c.w).includes(rule), FIRST_TEXT.first_nilometer.whyFor(c.w).includes(rule), text(riverRows(c.w, n)).includes(rule)]).toEqual([heir, true, true, true]);
      expect([heir, R.nilometerNoteFor(c.w).includes('top bar')]).toEqual([heir, true]);
    }
    // The Steady's words are 9.0's static ones, which How to play keeps.
    const s = city('steady');
    expect([R.nilometerNoteFor(s.w), FIRST_TEXT.first_nilometer.whyFor(s.w)]).toEqual([R.nilometerNote, FIRST_TEXT.first_nilometer.why]);
    expect(Math.round(preparedHarvest(low.harvest, true) * 100)).toBe(73);
  });
});
