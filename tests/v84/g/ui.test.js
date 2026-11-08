// Version 8.4, Track G: the interface of gold's jobs. The palace's Taxes radio group (each choice's effect before the tap), Rush on a site's sheet (its days and
// gold, the question, the rushed row and Cancel), the house sheet's Luxury row and its Show me to the Trade sheet, the Trade sheet's luxury marks, City advice's
// words for the luxury fix and for gold piling up, and the map's "Rushed" label. Every number on screen is the sim's own, set up both ways.
import { describe, it, expect } from '../../harness.js';
import { rushQuote, setRush } from '../../../src/sim/monuments.js';
import { setTaxRate, taxRateOf } from '../../../src/sim/palace.js';
import { monthFigures } from '../../../src/sim/economy.js';
import { openRoute, tradePrices } from '../../../src/sim/trade.js';
import { routeCostOf } from '../../../src/sim/costs.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { taxModel, rushRows } from '../../../src/ui/monumentSheet.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { drawRushLabel } from '../../../src/render/monuments.js';
import { V84_G_TEXT, MOOD_NAMES, NEED_NAMES } from '../../../src/ui/text.js';
import { openSheet } from '../../../src/ui/modes.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { add, rushCity, luxuryStreet } from './fixtures.js';

// A town with three homes (41 gold a month at Normal) and a palace by the road.
function palaceTown(gold = 5000) {
  const w = makeTestWorld({ size: 32, gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'town';
  addRaw(w, 'house', 10, 11, { tier: 3, residents: 7 });
  addRaw(w, 'house', 11, 11, { tier: 2, residents: 5 });
  addRaw(w, 'house', 12, 11, { tier: 4, residents: 11 });
  addRaw(w, 'well', 13, 11);
  const p = addRaw(w, 'palace', 14, 11, { style: 0, works: null });
  staffAll(w);
  return { w, p };
}
const sheetOf = (r) => r.root.querySelector('#sheet');

describe('v84 g the palace\'s Taxes', () => {
  it('words each rate\'s effect on this month\'s taxes and mood from the sim, against Normal', () => {
    const { w, p } = palaceTown();
    const m = taxModel(w);
    expect([m.normal, m.rate]).toEqual([monthFigures(w).taxesNormal, 'normal']);
    expect(m.choices.map((c) => [c.rate, c.line, c.checked])).toEqual([
      ['low', '10 gold a month less, mood +8', false],
      ['normal', '41 gold a month in taxes, no change to mood', true],
      ['high', '10 gold a month more, mood −8', false],
    ]);
    setTaxRate(w, p.id, 'high');
    expect(taxModel(w).choices.map((c) => c.checked)).toEqual([false, false, true]);
    expect(V84_G_TEXT.rateLine('low', 9240)).toBe('2,310 gold a month less, mood +8');   // the design's example
    expect([MOOD_NAMES.taxes, NEED_NAMES.luxury]).toEqual(['Taxes', 'Luxury']);
  });

  it('is one radio group of three 44 px choices on the palace\'s sheet; a tap sets the rate, and the summary\'s forecast names it (390 x 844)', async () => {
    const { w, p } = palaceTown();
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'info', p.id));
      const group = () => sheetOf(r).querySelector('.tax-choices');
      expect([group().getAttribute('role'), group().getAttribute('aria-label')]).toEqual(['radiogroup', 'Taxes']);
      const radios = () => [...group().querySelectorAll('[role="radio"]')];
      expect(radios().map((b) => [b.dataset.rate, b.getAttribute('aria-checked'), b.querySelector('.tile-name').textContent])).toEqual([
        ['low', 'false', 'Low'], ['normal', 'true', 'Normal ✓ (now)'], ['high', 'false', 'High'],
      ]);
      for (const b of radios()) expect(b.getBoundingClientRect().height >= 44).toBe(true);
      expect(radios()[0].getAttribute('aria-label')).toBe('Taxes Low: 10 gold a month less, mood +8');
      fire(radios()[0], 'click');
      expect(taxRateOf(w)).toBe('low');
      expect(radios()[0].getAttribute('aria-checked')).toBe('true');
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(sheetOf(r).textContent.includes('Taxes (low)')).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('v84 g Rush on the site\'s sheet', () => {
  it('offers Rush with the quote\'s days and gold, says what it does, and says why not when it cannot be had', () => {
    const { w, site } = rushCity();
    const q = rushQuote(w, site.id);
    const rows = rushRows(w, site);
    expect(rows.map((x) => x.key)).toEqual(['rush', 'rush-how']);
    expect([q.saved, q.extra]).toEqual([45, 1560]);
    expect(rows[0].text).toBe(`Rush this course: about 45 days sooner, about 1,560 gold more`);   // 120 stone, two crews: 90 days or 45; 120 x 13 gold (9.2: the sphinx, was the colossus's 160)
    expect(rows[1].text.startsWith('Crews work twice as fast on this course; each unit costs 3x the work gold. Stone and bricks must keep up.')).toBe(true);
    const poor = rushCity({ gold: 10 });
    const pq = rushQuote(poor.w, poor.site.id);
    expect(rushRows(poor.w, poor.site)).toEqual([{ key: 'rush', text: `Rush: a rushed day costs about ${pq.dayGold} gold; you have 10. It can't put the treasury below 0` }]);
    const lone = addRaw(w, 'obelisk_small', 55, 9);
    expect(rushRows(w, lone)).toEqual([]);                                       // no crew: nothing to hurry (the crews row and the cause say so)
    setRush(w, site.id, true);
    expect(rushRows(w, site)).toEqual([{ key: 'rush', text: 'Rushed: about 45 days to go on this course', cancel: true }]);
    site.site.rushShort = 'stone';
    expect(rushRows(w, site)[0].text).toBe('Rushed: waiting for stone');
  });

  it('asks first with the price and the days, rushes on yes, then shows the rushed row with Cancel (390 x 844)', async () => {
    const { w, site } = rushCity();
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'info', site.id));
      const btn = sheetOf(r).querySelector('.row-rush .rush');
      expect(btn.textContent).toBe('Rush this course: about 45 days sooner, about 1,560 gold more');
      expect(btn.getBoundingClientRect().height >= 44).toBe(true);
      fire(btn, 'click');
      const d = r.store.get().confirmDialog;
      expect(d.text).toBe('Rush the course under way at the great sphinx? About 45 days sooner for about 1,560 gold more, paid day by day as the units are laid (3x the work gold). It ends with the course; cancel it at any time and nothing more is paid.');
      expect(site.site.rush).toBe(undefined);
      d.onConfirm();
      expect(site.site.rush).toBe(true);
      expect(sheetOf(r).querySelector('.row-rush .text').textContent.startsWith('Rushed:')).toBe(true);
      const cancel = sheetOf(r).querySelector('.row-rush .rush-cancel');
      expect(cancel.textContent).toBe('Cancel the rush');
      fire(cancel, 'click');
      expect(site.site.rush).toBe(undefined);
    } finally { r.cleanup(); }
  });

  it('labels a rushed site "Rushed" on the map, in words', () => {
    const { site } = rushCity();
    const texts = [];
    const g = { path: () => {}, text: (q, s) => texts.push(s) };
    drawRushLabel(g, site);
    expect(texts).toEqual(['Rushed']);
  });
});

describe('v84 g the Luxury row, the Trade sheet and City advice', () => {
  it('says why a Fine manor has no luxury and what to do, and its Show me opens the Trade sheet (390 x 844)', async () => {
    const { world, home } = luxuryStreet({ tier: 7 });
    add(world, 'trading_post', 30, 8);
    const r = await rigUI({ width: 390, height: 844, world });
    try {
      r.store.set(openSheet(r.store.get(), 'info', home.id));
      const row = sheetOf(r).querySelector('li[data-need="luxury"]');
      expect(row.querySelector('.name').textContent).toBe('Luxury');
      expect(row.querySelector('.cause').textContent).toBe('No luxury is bought: none reaches its bazaar');
      const price = tradePrices(world, 'byblos').sells.cedar;
      expect(row.querySelector('.fix .muted').textContent).toBe(`Open a route to Byblos (${routeCostOf(world, 'byblos')} gold) and buy cedar (${price} gold each)`);   // ruling 1539: the route's price in the fix
      const step = sheetOf(r).querySelector('.step-line');
      expect(step.textContent.includes(`open a route to Byblos and buy cedar for this home's luxury (${routeCostOf(world, 'byblos')} gold for the route)`)).toBe(true);
      fire(row.querySelector('.show-me'), 'click');
      expect(r.store.get().sheet.kind).toBe('trade');
    } finally { r.cleanup(); }
  });

  it('marks the luxuries on the Trade sheet in words', async () => {
    const { world } = luxuryStreet({ tier: 7 });
    add(world, 'trading_post', 30, 8);
    openRoute(world, 'byblos');
    const r = await rigUI({ width: 1280, height: 800, world });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      const marks = [...r.root.querySelectorAll('.luxury-mark')].map((m) => [m.closest('[data-good]').dataset.good, m.textContent]);
      const mark = 'Luxury: Villas and Estates need one';
      expect(marks).toEqual([['ivory', mark], ['cedar', mark], ['cedar', mark], ['ivory', mark]]);   // Byblos's card (it buys ivory, sells cedar) and the Keep at least list
    } finally { r.cleanup(); }
  });

  it('words City advice\'s luxury fix with the route\'s price, and gold piling up with Show me to the palace', () => {
    const { world } = luxuryStreet();
    add(world, 'trading_post', 30, 8);
    const a = cityAdvice(world).find((x) => x.data && x.data.need === 'luxury');
    const words = adviceWords(a, world);
    expect([words.action.label, words.cost]).toEqual(['Show me', `Route to Byblos: ${routeCostOf(world, 'byblos')} gold`]);
    const { w, p } = palaceTown(100000);
    const spare = cityAdvice(w).find((x) => x.kind === 'gold_spare');
    expect([spare.fix.select, spare.data.months]).toEqual([p.id, Math.floor(100000 / 41)]);
    const sw = adviceWords(spare, w);
    expect([sw.what, sw.fix, sw.action.label]).toEqual([`Gold is piling up: 100,000 gold, ${Math.floor(100000 / 41)} months of taxes`, 'Lower taxes at the palace for mood', 'Show me']);   // no site stands: nothing to rush (ruling 1539)
    setTaxRate(w, p.id, 'low');
    expect(cityAdvice(w).some((x) => x.kind === 'gold_spare')).toBe(false);   // already Low: the player has acted
    w.gold = 12 * 41;
    setTaxRate(w, p.id, 'normal');
    expect(cityAdvice(w).some((x) => x.kind === 'gold_spare')).toBe(false);   // not more than 12 months
  });
});
