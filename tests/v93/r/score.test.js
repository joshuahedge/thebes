// Version 9.3 Track R (ruling 1964): decreeMeasure, bonusPart and decreeScore; scoreOf is untouched.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { scoreOf, decreeMeasure, bonusPart, decreeScore, decreeMedals } from '../../../src/sim/score.js';
import { DECREES, DECREE_ORDER, PAIR_MEDALS } from '../../../src/data/decrees.js';

const dw = (...ids) => createWorld({ seed: 4, decree: { week: '2026-47', ids } });

describe('v93 r the decree score', () => {
  it('reads each decree\'s measure from its place', () => {
    const w = dw('low_nile');
    Object.assign(w.tally, { raidsBeaten: 3, fedMonths: 7, wellMonths: 8, fireSafeMonths: 9, stoneLaid: 100, bricksLaid: 50, requestsMet: 4, elephantsFelled: 2, tradeGold: 30, billsPaid: 20 });
    const m = Object.fromEntries(DECREE_ORDER.map((id) => [id, decreeMeasure(w, id)]));
    expect(m).toEqual({ sea_peoples: 3, low_nile: 7, plague: 8, stone_famine: 150, vizier_levy: 4, open_city: 3, golden_caravans: 1.5, fire_season: 9, southern_host: 2 });
  });
  it('gives the bonus part as min(100, round(100 x measure / bar)), the mean on a pair week, and 0 with no decree', () => {
    const w = dw('low_nile');
    w.tally.fedMonths = 25;
    expect(bonusPart(w)).toBe(Math.round((100 * 25) / DECREES.low_nile.bar));
    w.tally.fedMonths = 5000;
    expect(bonusPart(w)).toBe(100);
    const p = dw('low_nile', 'golden_caravans');
    p.tally.fedMonths = DECREES.low_nile.bar; p.tally.tradeGold = 1; p.tally.billsPaid = 2;
    expect(bonusPart(p)).toBe(75);
    expect(bonusPart(createWorld({ seed: 4 }))).toBe(0);
  });
  it('adds the bonus to the five parts for a total out of 600, with the decree\'s medal scale, and leaves scoreOf alone', () => {
    const w = dw('plague');
    w.tally.wellMonths = DECREES.plague.bar;
    const s = decreeScore(w), five = scoreOf(w);
    expect(Object.keys(s.parts)).toEqual([...Object.keys(five.parts), 'bonus']);
    expect([s.parts.bonus, s.version]).toEqual([100, 3]);
    expect(s.total).toBe(Object.values(five.parts).reduce((n, v) => n + v, 0) + 100);
    expect(five.version).toBe(3);
    expect(Object.hasOwn(five.parts, 'bonus')).toBe(false);
    expect(decreeMedals(w)).toEqual(DECREES.plague.medals);
    expect(decreeMedals(dw('golden_caravans', 'low_nile'))).toEqual(PAIR_MEDALS[0]);
    expect(decreeMedals(dw('plague', 'fire_season'))).toBe(null);
    expect(s.medal).toBe(null);
  });
});
