// Version 8.4, Track G (design section 5): the tax rate and a rush are saved on their buildings (palace.tax, site.rush; absent is Normal and not rushed),
// so a city saved at Low with a rushed site loads as it stood, and an 8.3 (v10) city loads at Normal with nothing rushed.
import { describe, it, expect } from '../../harness.js';
import { setTaxRate, taxRateOf } from '../../../src/sim/palace.js';
import { rushQuote, setRush } from '../../../src/sim/monuments.js';
import { createWorld, allBuildings, STAGE84_TALLY } from '../../../src/sim/world.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';

// The seed-11 sample Capital (a palace, and a colossus under way with its two crews) after 30 days.
function sample() {
  const w = createWorld({ seed: 11 });
  buildSampleCity(w);
  advanceDays(w, 30);
  const palace = allBuildings(w).find((b) => b.type === 'palace');
  const site = allBuildings(w).find((b) => b.type === 'colossus');
  return { w, palace, site };
}

describe('v84 g save: the tax rate and a rush', () => {
  it('saves and loads a city at Low with a rushed site, and the loaded city plays on as the one saved', () => {
    const { w, palace, site } = sample();
    w.gold = 50000;
    expect(setTaxRate(w, palace.id, 'low').ok).toBe(true);
    expect(rushQuote(w, site.id).reason).toBe(null);
    expect(setRush(w, site.id, true).ok).toBe(true);
    const loaded = deserialize(serialize(w));
    expect([taxRateOf(loaded), loaded.buildings[palace.id].tax, loaded.buildings[site.id].site.rush]).toEqual(['low', 'low', true]);
    expect(loaded).toEqual(w);
    advanceDays(w, 60);
    advanceDays(loaded, 60);
    expect(loaded).toEqual(w);
    expect(w.tally.taxLowMonths).toBeGreaterThan(0);
  });

  it('loads an 8.3 (v10) city at Normal with nothing rushed', () => {
    const { w } = sample();
    const v10 = JSON.parse(serialize(w));
    delete v10.luxuryFrom;
    for (const k of STAGE84_TALLY) delete v10.tally[k];
    v10.version = 10;
    const loaded = deserialize(JSON.stringify(v10));
    expect(taxRateOf(loaded)).toBe('normal');
    expect(allBuildings(loaded).some((b) => 'tax' in b || (b.site && 'rush' in b.site))).toBe(false);
    advanceDays(loaded, 90);
    expect([taxRateOf(loaded), loaded.tally.taxLowMonths, loaded.tally.taxHighMonths, loaded.tally.coursesRushed, loaded.tally.rushGold]).toEqual(['normal', 0, 0, 0, 0]);
  });
});
