// Version 7.0, Track A (rulings 964-966), the wave 1 minors: the words the sheets said made exact. The Keep at least line says where the stock is counted (near the trading post
// for a road route, the Quay for a river one), Nubia's prices are said per good, a closed accordion head carries no aria-controls, an oasis pool is never the Quay's aim, the
// beer-only festival is "without favour" (the same mood, no favour), the card's refusal caption is in the text file, and a waiting event's View is named for the event.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { tradeCity } from './helpers.js';
import { eventWorld, offer, YEAR } from '../e/helpers.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { setTradeOrder } from '../../../src/sim/trade.js';
import { openSheet } from '../../../src/ui/modes.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { quayHint } from '../../../src/ui/tradeSheet.js';
import { V70_HELP, V70_TRADE_TEXT as W, CITY_EVENT_TEXT as C } from '../../../src/ui/text.js';
import { PARTNERS } from '../../../src/data/trade.js';
import { T as TERRAIN } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

describe('v70 a words: wave 1 made exact', () => {
  it('says Nubia\'s prices per good: stone for less than Memphis, gems for less than Byblos, never "than Memphis and Byblos"', () => {
    const text = V70_HELP.t.find((h) => h.head === 'Trade by river').text;
    expect(text).toContain('it sells stone for less than Memphis and gems for less than Byblos');
    expect(text.includes('less than Memphis and Byblos')).toBe(false);
    expect(W.help[0].text).toBe(text);
    // True of the list prices the words speak of: each good against the partner that sells it too.
    expect(PARTNERS.nubia.sells.stone.price).toBeLessThan(PARTNERS.memphis.sells.stone.price);
    expect(PARTNERS.nubia.sells.gems.price).toBeLessThan(PARTNERS.byblos.sells.gems.price);
    expect([PARTNERS.byblos.sells.stone, PARTNERS.memphis.sells.gems]).toEqual([undefined, undefined]);
  });

  it('the Keep at least line says where the stock is counted: near the trading post for a road route, the Quay for a river one, both when both buy it', async () => {
    const { w } = tradeCity();
    w.trade.routes.memphis = { since: 0, gifted: true };
    w.trade.routes.nubia = { since: 0, gifted: true };
    setTradeOrder(w, 'pottery', 'sell', 0);                     // Memphis alone buys pottery
    setTradeOrder(w, 'linen', 'sell', 0);                       // Nubia alone buys linen
    setTradeOrder(w, 'grain', 'sell', 0);                       // both buy grain
    setTradeOrder(w, 'stone', 'buy', 40);                       // both sell stone (Memphis's from the City)
    setTradeOrder(w, 'gems', 'buy', 40);                        // Nubia alone sells gems (Byblos's route is not open)
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      const line = (g) => r.root.querySelector(`#sheet .trade-good[data-good="${g}"] .keep-help`).textContent;
      expect([line('pottery'), line('linen'), line('grain'), line('stone'), line('gems')]).toEqual([
        'Sells only what is over 0 near the trading post', 'Sells only what is over 0 near the Quay', 'Sells only what is over 0 near the trading post or the Quay', 'Buys until 40 are near the trading post or the Quay', 'Buys until 40 are near the Quay']);
      expect([W.sellHelp(5), W.buyHelp(5), W.sellHelp(5, ['post', 'quay'])]).toEqual(['Sells only what is over 5 near the trading post', 'Buys until 5 are near the trading post', 'Sells only what is over 5 near the trading post or the Quay']);
    } finally { r.cleanup(); }
  });

  it('a closed route head carries no aria-controls, an open one names its panel', async () => {
    const { w } = tradeCity();
    w.trade.routes.memphis = { since: 0, gifted: true };
    w.trade.routes.nubia = { since: 0, gifted: true };
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      const head = (id) => r.root.querySelector(`#sheet .route-head[data-partner="${id}"]`);
      expect([head('memphis').getAttribute('aria-expanded'), head('memphis').getAttribute('aria-controls'), head('nubia').getAttribute('aria-expanded'), head('nubia').getAttribute('aria-controls')]).toEqual(['true', 'trade-route-memphis', 'false', null]);
      expect(Boolean(r.root.querySelector('#trade-route-memphis'))).toBe(true);
      fire(head('nubia'), 'click');
      expect([head('nubia').getAttribute('aria-controls'), head('memphis').getAttribute('aria-controls')]).toEqual(['trade-route-nubia', null]);
      expect(r.root.querySelector('#trade-route-nubia').id).toBe(head('nubia').getAttribute('aria-controls'));
    } finally { r.cleanup(); }
  });

  it('Show me for a missing Quay never aims at an oasis pool', () => {
    const { w } = tradeCity();
    for (let y = 20; y < 23; y++) for (let x = 14; x < 17; x++) w.terrain[idx(w.size, x, y)] = TERRAIN.WATER;   // a pool nearer the trading post than the river
    const nearest = () => quayHint(w);
    expect(nearest().y).toBeGreaterThan(18);                                                                     // not an oasis yet: it is the nearest water
    w.oases = [{ x: 15, y: 21, r: 2 }];
    expect(nearest().y).toBeLessThan(4);                                                                         // the river's bank now
  });

  it('the Festival of Opet\'s beer-only festival is "without favour", never smaller, in its card, its choice and How to play', async () => {
    const w = eventWorld({ gold: 5000 });
    w.day = 3 * YEAR;
    w.speed = 0;
    offer(w, 'opet');
    w.trade.routes.punt = { since: 0, gifted: true };                                                                // incense reaches the city, so the full festival is offered (wave 3, ruling 988)
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'cityEvent'));
      const small = r.root.querySelector('#sheet .event-choice[data-choice="small"]');
      expect(small.querySelector('button').textContent).toBe('Hold it without favour, beer only');
      expect(small.querySelector('.consequence').textContent.includes('favour')).toBe(false);                    // the sim's list: mood and the beer, no favour
      expect(r.root.querySelector('#sheet .event-choice[data-choice="full"] .consequence').textContent).toContain('favour +4');
    } finally { r.cleanup(); }
    expect(V70_HELP.e[0].text).toContain('it offers the festival with beer alone, without favour');
    for (const text of [V70_HELP.e[0].text, C.label('opet', 'small'), C.body({ kind: 'opet', figs: {} }, w)]) expect(text.toLowerCase().includes('smaller')).toBe(false);
  });

  it('a card that no longer matches the city says so from the text file', async () => {
    const w = eventWorld({ gold: 5000 });
    w.day = 3 * YEAR;
    w.speed = 0;
    offer(w, 'envoy');
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'cityEvent'));
      w.cityEvents.waiting.figs.fee += 7;                                          // the city changed after the card was drawn
      fire(r.root.querySelector('#sheet .event-choice[data-choice="feast"] > button'), 'click');
      expect(C.changed).toBe('The city changed: the card shows the new figures');
      expect(r.ui.celebrations.recent().map((x) => x.text || x)).toContain(C.changed);
    } finally { r.cleanup(); }
  });

  it('a waiting event\'s View is named for the event, not "See who works where"', async () => {
    const ev = eventWorld({ gold: 5000 });
    ev.day = 3 * YEAR;
    ev.speed = 0;
    offer(ev, 'sandstorm');
    const r = await rigUI({ world: ev });
    try {
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'advice'));
      const aw = adviceWords(cityAdvice(ev).find((a) => a.kind === 'event'), ev);
      const b = [...r.root.querySelectorAll('#sheet .advice-item')].find((x) => x.dataset.kind === 'event').querySelector('button');
      expect(b.getAttribute('aria-label')).toBe(`View: ${aw.what}`);
      expect(b.getAttribute('aria-label')).toBe('View: A sandstorm: waiting for your answer');
      expect(b.getAttribute('aria-label').includes('See who works where')).toBe(false);
      fire(b, 'click');
      expect(r.store.get().sheet.kind).toBe('cityEvent');
    } finally { r.cleanup(); }
  });
});
