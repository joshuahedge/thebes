// Version 9.2, Track Q, 3.6 (ruling 1793): the debt sheet's closed levers say why, from the sim's own answers, with Show me where there is something to show.
import { describe, it, expect } from '../../harness.js';
import { debtModel, taxClosed, sellClosed } from '../../../src/ui/v91/debtSheet.js';
import { setTaxRate } from '../../../src/sim/palace.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { openSheet } from '../../../src/ui/modes.js';
import { V91_R_TEXT as W } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';

function city({ palace = false, post = false, route = false, surplus = false } = {}) {
  const w = makeTestWorld({ gold: -200 });
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 31, 10, 31, 31);
  w.milestone = 'market_town';
  addRaw(w, 'house', 12, 9, { tier: 4, residents: 400 });
  addRaw(w, 'farm_grain', 2, 11);
  addRaw(w, 'granary', 6, 11);
  addRaw(w, 'bazaar', 9, 11);
  addRaw(w, 'well', 15, 11);
  const out = { w };
  if (palace) out.palace = addRaw(w, 'palace', 20, 12);
  if (post) { out.store = addRaw(w, 'storehouse', 16, 8); out.post = addRaw(w, 'trading_post', 20, 8); }
  if (route) { w.trade.routes.memphis = { since: 0, gifted: true }; w.day = 90; }
  if (surplus) out.store.store = { pottery: 200 };
  assignLabour(w);
  return out;
}

describe('v92 q debt: a closed lever says why', () => {
  it('no palace: taxes cannot be raised, nothing to show; a palace at High: already there, Show me the palace', () => {
    const none = city();
    expect(taxClosed(none.w)).toEqual({ reason: 'noPalace', show: null });
    const c = city({ palace: true });
    expect(taxClosed(c.w)).toBe(null);                               // Normal to High: the lever is open
    setTaxRate(c.w, c.palace.id, 'high');
    expect(taxClosed(c.w)).toEqual({ reason: 'taxTop', show: c.palace.id });
    expect(W.closed.noPalace).toBe('No palace yet: taxes cannot be raised.');
  });

  it('no route: nothing can be sold; a post and a route with nothing above the floors: Keep floors, Show me the trade sheet; with a surplus the lever is open', () => {
    expect(sellClosed(city().w)).toEqual({ reason: 'noRoute', show: null });
    const bare = city({ post: true, route: true });
    const closed = sellClosed(bare.w);
    expect([closed.reason, closed.show]).toEqual(['noSurplus', bare.post.id]);
    expect(W.closed.noSurplus).toBe('Nothing above your Keep floors to sell.');
    expect(sellClosed(city({ post: true, route: true, surplus: true }).w)).toBe(null);
  });

  it('the sheet lists the reasons with no palace and no route, a Show me only where there is one, and no "No other way" line', async () => {
    const c = city({ post: true, route: true });
    const r = await rigUI({ world: c.w });
    try {
      r.store.set(openSheet(r.store.get(), 'backToGold'));
      const s = r.root.querySelector('#sheet');
      const rows = [...s.querySelectorAll('.debt-lever-closed')];
      expect(rows.map((x) => x.querySelector('p').textContent)).toEqual([W.closed.noPalace, W.closed.noSurplus]);
      expect(rows.map((x) => Boolean(x.querySelector('button')))).toEqual([false, true]);
      expect(s.textContent.includes('No other way')).toBe(false);
      expect(debtModel(c.w).taxClosed.reason).toBe('noPalace');
      rows[1].querySelector('button').click();
      expect(r.store.get().sheet).toEqual({ kind: 'trade', id: c.post.id });
    } finally { r.cleanup(); }
  });
});
