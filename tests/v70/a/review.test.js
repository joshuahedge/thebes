// Version 7.0, wave 3 (the final review's fixes, Batch 2): the Advice words match what the sim does. Stranded advice with no maker in reach names the Fetch order and its real
// monthly amount (ruling 989); the held-back sales walk the partners in the caravans' order with two running stocks (ruling 990); the first-route tip says what to do.
import { describe, it, expect } from '../../harness.js';
import { addRaw, setRoad, staffAll } from '../../helpers/testWorld.js';
import { street, tradeCity } from './helpers.js';
import { cityAdvice, nextStep } from '../../../src/sim/advice.js';
import { strandedFix, heldBackSales, cartMonthly, sensibleMonthly } from '../../../src/sim/adviceFixes.js';
import { setTradeOrder, setKeepAtLeast, tradePrices } from '../../../src/sim/trade.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { stepWords } from '../../../src/ui/nextStepText.js';
import { TIP_TEXT } from '../../../src/ui/text.js';
import { PARTNERS, QUAY_TYPE } from '../../../src/data/trade.js';

const ofKind = (w, kind) => cityAdvice(w).filter((a) => a.kind === kind);
// Version 8.3 (ruling 1426): the order is to keep the good stocked; the card knows no good ("the good"), the step names it.
const FETCH = 'then set it to keep the good stocked: one cart brings about', FETCH_STEP = 'then set it to keep pottery stocked: one cart brings about';

describe('v70 a review: stranded advice names the Fetch order when no maker is in reach (ruling 989)', () => {
  it('with no maker the card and the step both add the Fetch clause with the cart\'s real monthly amount (cartMonthly) and name the maker', () => {
    const { w, bazaar, home } = street();
    const far = strandedFix(w, 'pottery', bazaar);
    expect(far.maker).toBe(null);
    const perMonth = cartMonthly(far.len);
    expect(far.perMonth).toBe(perMonth);
    expect(perMonth > 0 && perMonth < sensibleMonthly()).toBe(true);
    const card = adviceWords(ofKind(w, 'stranded')[0], w).fix;
    expect(card).toContain(`${FETCH} ${perMonth} a month from ${far.len} road tiles away`);
    expect(card.endsWith('a maker in reach fills it faster')).toBe(true);
    expect(card.includes('where what is made')).toBe(false);
    const step = stepWords(w, home, nextStep(w, home)).rest;
    expect(step).toContain(`${FETCH_STEP} ${perMonth} a month from the store ${far.len} road tiles away`);
    expect(step.endsWith('; a potter in reach fills it faster')).toBe(true);                  // the step knows the good, so it names the maker
    expect(step.includes('keeps pottery where the bazaar draws it')).toBe(false);             // the store fills only by that order: it is not said to keep the good
  });

  it('with a maker in reach the clause is absent, in the card and in the step', () => {
    const { w, bazaar, home, maker } = street({ potter: true });
    expect(strandedFix(w, 'pottery', bazaar).maker).toBe(maker.id);
    const card = adviceWords(ofKind(w, 'stranded')[0], w).fix;
    expect([card.includes('to keep the good stocked'), card.includes('fills it faster'), card.includes(', where what is made can reach it:')]).toEqual([false, false, true]);   // Version 8.3: no order clause
    const step = stepWords(w, home, nextStep(w, home)).rest;
    expect([step.includes('stocked:'), step.includes('fills it faster'), step.includes('keeps pottery where the bazaar draws it')]).toEqual([false, false, true]);
  });
});

describe('v70 a review: held-back sales walk the partners in the caravans\' order (ruling 990)', () => {
  // The city of tradeCity with a Quay on the bank joined by road to the main street, so Punt's boats land too; Memphis, Byblos and Punt open.
  function threeRoutes(stock) {
    const { w, store } = tradeCity();
    setRoad(w, 16, 4, 24, 4);
    setRoad(w, 16, 4, 16, 10);
    addRaw(w, QUAY_TYPE, 20, 3);
    staffAll(w);
    for (const id of ['memphis', 'byblos', 'punt']) w.trade.routes[id] = { since: 0, gifted: true };
    delete store.store.pottery;
    return { w, store };
  }
  const sell = (w, good, level) => { setTradeOrder(w, good, 'sell', level); setKeepAtLeast(w, good, level); };

  it('jewellery stock 20 at level 10 with Byblos and Punt open: Byblos is held back 10, for its price, and Punt nothing', () => {
    const { w, store } = threeRoutes();
    delete w.trade.routes.memphis;
    store.store.jewellery = 20;
    sell(w, 'jewellery', 10);
    const price = tradePrices(w, 'byblos').buys.jewellery;
    const [g] = heldBackSales(w);
    expect([g.good, g.partner, g.at, g.stock, g.blocked, g.partners]).toEqual(['jewellery', 'byblos', 'post', 20, 10, 1]);
    expect([g.price, g.gold]).toEqual([price, 10 * price]);
    expect(PARTNERS.byblos.buys.jewellery.quota / 4).toBeGreaterThanOrEqual(20);              // Byblos's room is not what limits it: the level is
    if (price === 20) expect(g.gold).toBe(200);
    expect(heldBackSales(w).length).toBe(1);
  });

  it('pottery stock 100 at level 40 with three partners: 40 held back in all, gold summed over the partners, the largest named', () => {
    const { w, store } = threeRoutes();
    store.store.pottery = 100;
    sell(w, 'pottery', 40);
    const [g] = heldBackSales(w);
    // Memphis (room 50) takes 50 either way; Byblos (room 30) could take 30 but is left 10 over the level; Punt (room 30) 0 but would take 20: 20 and 20.
    const p = (id) => tradePrices(w, id).buys.pottery;
    expect(g.blocked).toBe(40);
    expect(g.partners).toBe(2);
    expect(g.gold).toBe(20 * p('byblos') + 20 * p('punt'));
    expect(g.partner).toBe(p('punt') > p('byblos') ? 'punt' : 'byblos');                      // the larger of the two (the earlier on a tie: PARTNERS' order)
    expect(g.at).toBe(g.partner === 'punt' ? 'quay' : 'post');
    expect(g.price).toBe(p(g.partner));
    // Level 0: nothing held back, whoever sells.
    sell(w, 'pottery', 0);
    expect(heldBackSales(w)).toEqual([]);
  });
});

describe('v70 a review: the first-route tip', () => {
  it('says to switch goods off in Trade and set Keep at least so trade never sells what the city needs, in twenty words or fewer', () => {
    expect(TIP_TEXT.trade_levels).toBe('In Trade, switch off goods to leave alone; set Keep at least so trade never sells what the city needs.');
    expect(TIP_TEXT.trade_levels.split(/\s+/).length).toBeLessThanOrEqual(20);
  });
});
