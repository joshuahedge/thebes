// Version 8.4 docs step, the re-review's two small faults: "Rushed: no crew today" keys on the pace (no crew at work), not on the days to go;
// and the countdown chip's dot never starts a line.
import { describe, it, expect } from '../../harness.js';
import { rushQuote, setRush } from '../../../src/sim/monuments.js';
import { rushRows } from '../../../src/ui/monumentSheet.js';
import { addRaw } from '../../helpers/testWorld.js';
import { rushCity } from '../g/fixtures.js';
import { DANGER_UI_TEXT as D, V84_G_TEXT } from '../../../src/ui/text.js';

describe('v84 fix a rushed site says "no crew today" by its pace', () => {
  it('has a pace of 0 with no crew, and a pace above 0 with one, whatever the days to go', () => {
    const { w, site } = rushCity();
    setRush(w, site.id, true);
    expect(rushQuote(w, site.id).rate > 0).toBe(true);
    const lone = addRaw(w, 'obelisk_small', 55, 9);
    lone.site.rush = true;
    expect([rushQuote(w, lone.id).rate, rushRows(w, lone)[0].text]).toEqual([0, V84_G_TEXT.rushedNoCrew]);
  });
  it('with a crew at work but a course laid (0 days to count) does not say no crew', () => {
    const { w, site } = rushCity();
    setRush(w, site.id, true);
    site.site.laid.stone = 1e9;                                   // the course under way is already laid: nothing left to count days by
    const q = rushQuote(w, site.id);
    expect([q.daysRushed <= 0, q.rate > 0]).toEqual([true, true]);
    expect(rushRows(w, site)[0].text === V84_G_TEXT.rushedNoCrew).toBe(false);
  });
});

describe('v84 fix the countdown chip keeps its dot with the words before it', () => {
  it('puts a non-breaking space before the dot, so "· 2 m 10 d" never starts a line', () => {
    const chip = D.chip('east', 70);
    expect(chip).toBe('Raid from the east · 2 m 10 d');
    expect(chip.includes(' ·')).toBe(false);
    expect(D.chip(['east', 'north'], 7)).toBe('Raid from the east and north · 7 d');
  });
});
