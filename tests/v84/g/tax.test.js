// Version 8.4, Track G (design 2a, rulings 1465, 1466): the tax rate on the palace. Low takes x0.75 of the month's taxes and gives +8 mood, High x1.25 and -8;
// with no palace the rate is Normal; the score's taxes term reads the Normal rate, so the rate never moves the score.
import { describe, it, expect } from '../../harness.js';
import { TAX_RATES, TAX_ORDER } from '../../../src/data/palace.js';
import { setTaxRate, taxRateOf, taxMood } from '../../../src/sim/palace.js';
import { monthFigures, monthlyEconomy, monthForecast } from '../../../src/sim/economy.js';
import { updateMood } from '../../../src/sim/mood.js';
import { scoreOf } from '../../../src/sim/score.js';
import { removeBuilding } from '../../../src/sim/world.js';
import { demolishAt } from '../../../src/sim/commands.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A town of three homes (Normal taxes 7 x 2 + 2 x 1 + ... ) and, with palace true, a palace by the road.
function town({ palace = true } = {}) {
  const w = makeTestWorld({ size: 32, gold: 5000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'town';
  addRaw(w, 'house', 10, 11, { tier: 3, residents: 7 });    // 7 x 2 = 14
  addRaw(w, 'house', 11, 11, { tier: 2, residents: 5 });    // 5 x 1 = 5
  addRaw(w, 'house', 12, 11, { tier: 4, residents: 11 });   // 11 x 2 = 22: 41 in all at Normal
  const p = palace ? addRaw(w, 'palace', 14, 11, { style: 0, works: null }) : null;
  return { w, p };
}

describe('v84 g the tax rate: data and the command', () => {
  it('has the design\'s three rates (Q1) in the sheet\'s order', () => {
    expect(TAX_ORDER).toEqual(['low', 'normal', 'high']);
    expect(TAX_RATES).toEqual({ low: { factor: 0.75, mood: 8 }, normal: { factor: 1, mood: 0 }, high: { factor: 1.25, mood: -8 } });
  });

  it('sets the palace\'s rate, refuses what is not a palace or not a rate, and keeps Normal as no field at all', () => {
    const { w, p } = town();
    const house = Object.values(w.buildings).find((b) => b.type === 'house');
    expect(taxRateOf(w)).toBe('normal');
    expect(setTaxRate(w, house.id, 'low')).toEqual({ ok: false, reason: 'not_palace', warnings: [] });
    expect(setTaxRate(w, 9999, 'low').reason).toBe('not_palace');
    expect(setTaxRate(w, p.id, 'lowest')).toEqual({ ok: false, reason: 'bad_rate', warnings: [] });
    expect(setTaxRate(w, p.id, 'toString').reason).toBe('bad_rate');
    const gold = w.gold;
    expect(setTaxRate(w, p.id, 'low')).toEqual({ ok: true, warnings: [], rate: 'low' });
    expect([taxRateOf(w), p.tax, w.gold]).toEqual(['low', 'low', gold]);              // needs no gold
    expect(setTaxRate(w, p.id, 'high').ok).toBe(true);
    expect(taxRateOf(w)).toBe('high');
    expect(setTaxRate(w, p.id, 'normal').ok).toBe(true);
    expect([taxRateOf(w), 'tax' in p]).toEqual(['normal', false]);                     // Normal is the absent field (an 8.3 palace)
  });

  it('is Normal with no palace, and back to Normal once the palace is demolished', () => {
    const { w } = town({ palace: false });
    expect([taxRateOf(w), taxMood(w)]).toEqual(['normal', 0]);
    const { w: w2, p } = town();
    setTaxRate(w2, p.id, 'high');
    expect(taxRateOf(w2)).toBe('high');
    expect(demolishAt(w2, p.x, p.y).ok).toBe(true);
    expect([taxRateOf(w2), taxMood(w2), monthFigures(w2).taxes]).toEqual(['normal', 0, 41]);
    const { w: w3, p: p3 } = town();
    setTaxRate(w3, p3.id, 'low');
    removeBuilding(w3, p3.id);
    expect(taxRateOf(w3)).toBe('normal');
  });
});

describe('v84 g the tax rate: gold', () => {
  it('takes the month\'s taxes at the rate, rounded to whole gold once for the city, and keeps the Normal-rate taxes beside them', () => {
    const { w, p } = town();
    const at = (rate) => { setTaxRate(w, p.id, rate); const f = monthFigures(w); return [f.taxes, f.taxesNormal]; };
    expect(at('normal')).toEqual([41, 41]);
    expect(at('low')).toEqual([31, 41]);                                               // 30.75, rounded once (per home it would be 11 + 4 + 17 = 32)
    expect(at('high')).toEqual([51, 41]);                                              // 51.25
    const f = monthFigures(w);
    expect(f.net).toBe(f.taxes - f.wages - f.upkeep - f.soldiers);
    expect(monthForecast(w).taxes).toBe(51);                                           // the forecast reads the same figures
  });

  it('pays the rate in force at the month\'s end, records taxesNormal, and counts the month at Low or High (for 9.0)', () => {
    const { w, p } = town();
    setTaxRate(w, p.id, 'low');
    const gold = w.gold, f = monthFigures(w);
    monthlyEconomy(w);
    expect(w.gold).toBe(gold + f.net);
    expect([w.stats.lastMonth.taxes, w.stats.lastMonth.taxesNormal, w.stats.lastMonth.rush, w.stats.lastMonth.luxuries]).toEqual([31, 41, 0, 0]);
    expect([w.tally.taxLowMonths, w.tally.taxHighMonths]).toEqual([1, 0]);
    setTaxRate(w, p.id, 'high');
    monthlyEconomy(w);
    setTaxRate(w, p.id, 'normal');
    monthlyEconomy(w);
    expect([w.tally.taxLowMonths, w.tally.taxHighMonths]).toEqual([1, 1]);
  });

  it('counts the month\'s end in a running city at the rate then in force', () => {
    const { w, p } = town();
    setTaxRate(w, p.id, 'high');
    advanceDays(w, DAYS_PER_MONTH * 2);
    expect(w.tally.taxHighMonths).toBe(2);
    expect(w.stats.lastMonth.taxes).toBe(Math.round(w.stats.lastMonth.taxesNormal * 1.25));
  });
});

describe('v84 g the tax rate: mood and the score', () => {
  it('adds a Taxes row to the mood breakdown, +8 at Low and -8 at High, and none at Normal', () => {
    const { w, p } = town();
    updateMood(w);
    const base = w.mood;
    expect('taxes' in w.moodBreakdown).toBe(false);
    setTaxRate(w, p.id, 'low');
    updateMood(w);
    expect([w.moodBreakdown.taxes, w.mood]).toEqual([8, Math.min(100, base + 8)]);
    setTaxRate(w, p.id, 'high');
    updateMood(w);
    expect([w.moodBreakdown.taxes, w.mood]).toEqual([-8, Math.max(0, base - 8)]);
    expect(taxMood(w)).toBe(TAX_RATES.high.mood);
  });

  it('scores a city the same at Low, Normal and High in the same month (ruling 1466)', () => {
    const scores = TAX_ORDER.map((rate) => {
      const { w, p } = town();
      setTaxRate(w, p.id, rate);
      monthlyEconomy(w);
      return scoreOf(w);
    });
    expect(scores[0]).toEqual(scores[1]);
    expect(scores[2]).toEqual(scores[1]);
  });

  it('reads an 8.3 record\'s taxes when it has no taxesNormal (they were Normal)', () => {
    const { w } = town();
    monthlyEconomy(w);
    const now = scoreOf(w);
    delete w.stats.lastMonth.taxesNormal;
    expect(scoreOf(w)).toEqual(now);
  });
});
