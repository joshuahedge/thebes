import { describe, it, expect } from '../harness.js';
import { PARTNERS } from '../../src/data/trade.js';
import { GOALS } from '../../src/data/goals.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { routeCostOf } from '../../src/sim/costs.js';
import { tradePrices, nextCaravanDay } from '../../src/sim/trade.js';
import { dateParts } from '../../src/sim/clock.js';
import { settle } from '../../src/sim/settle.js';
import { housesOf } from '../../src/sim/world.js';
import { routeBlock, tradedGoods } from '../../src/ui/tradeSheet.js';
import { select } from '../../src/ui/modes.js';
import { T, TIP_TEXT, caravanText, dateText, partnerName } from '../../src/ui/text.js';
import { setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { fire, key } from '../helpers/dom.js';
import { rigUI, uiWorld } from '../helpers/uiWorld.js';

// The test city at Market town with a staffed trading post south of the road (uiWorld's road runs along y = 10).
function tradeWorld({ milestone = 'market_town', joined = true } = {}) {
  const w = uiWorld();
  w.milestone = milestone;
  const post = addRaw(w, 'trading_post', 17, 11);
  if (joined) setRoad(w, 31, 10, w.tradeEntry.x, w.tradeEntry.y);                // the road runs on to the trade entry
  staffAll(w);
  return { w, post };
}
const openTrade = (r, post) => {
  r.store.set(select(r.store.get(), post.id));
  fire(r.root.querySelector('#sheet .trade'), 'click');
};
const route = (r, id) => r.root.querySelector(`#sheet .route[data-partner="${id}"]`);
const good = (r, g) => r.root.querySelector(`#sheet .trade-good[data-good="${g}"]`);

describe('ui trade sheet', () => {
  it("opens from the trading post's sheet as one panel, and Back returns to the post", async () => {
    const { w, post } = tradeWorld();
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), post.id));
      const trade = r.root.querySelector('#sheet .trade');
      expect(trade.textContent).toBe(T.trade);
      expect(trade.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      fire(trade, 'click');
      expect(r.store.get().sheet).toEqual({ kind: 'trade', id: post.id });
      expect(r.root.querySelector('#sheet h2').textContent).toBe(T.trade);
      expect(r.root.querySelectorAll('#sheet').length).toBe(1);
      key(r.root, 'Escape');
      expect(r.store.get().sheet).toEqual({ kind: 'info', id: post.id });
      expect(r.root.querySelector('#sheet .trade')).toBeTruthy();
    } finally { r.cleanup(); }
  });
  it('says why a route cannot open, in words, and opens one through the sim at the scaled cost', async () => {
    const { w, post } = tradeWorld({ milestone: 'town' });
    settle(w, []);                                                                   // pay what the test city has already earned,
    w.goals.completed = GOALS.map((g) => g.id);                                      // and leave no goal (a trade route goal) to pay out,
    w.guide.on = false;                                                              // so only the route moves the gold
    const r = await rigUI({ world: w });
    try {
      openTrade(r, post);
      const memphis = () => route(r, 'memphis').querySelector('.open-route');
      expect(memphis().disabled).toBe(true);
      expect(route(r, 'memphis').querySelector('.reason').textContent).toBe('Opens at Market town');
      expect(route(r, 'byblos').querySelector('.reason').textContent).toBe('Opens at Great city');
      w.milestone = 'market_town';
      w.gold = routeCostOf(w, 'memphis') - 1;
      r.ui.refresh();
      expect(memphis().disabled).toBe(true);
      expect(route(r, 'memphis').querySelector('.reason').textContent).toBe(`Needs ${routeCostOf(w, 'memphis')} gold`);
      w.gold = 5000;
      w.difficulty = 'hard';
      r.ui.refresh();
      const cost = routeCostOf(w, 'memphis');
      expect(cost).toBe(Math.round(PARTNERS.memphis.routeCost * 1.25));
      expect([memphis().disabled, memphis().textContent, memphis().getAttribute('aria-label')]).toEqual([false, `Open route, ${cost} gold`, `Open route, ${cost} gold: Memphis`]);
      expect(route(r, 'memphis').querySelector('.reason')).toBe(null);
      expect(r.root.querySelector('#sheet .trade-goods')).toBe(null);                // one step at a time: no goods before a route
      expect(r.root.querySelector('#sheet').textContent).toContain(T.openRouteFirst);
      fire(memphis(), 'click');
      expect(Boolean(w.trade.routes.memphis)).toBe(true);
      expect(w.gold).toBe(5000 - cost);
      expect(route(r, 'memphis').textContent).toBe(`${partnerName('memphis')}${T.routeOpen}`);
      expect(routeBlock(w, 'byblos')).toBe('locked');
    } finally { r.cleanup(); }
  });
  it('lists a row per good an open partner trades, with its prices and only the choices that partner allows', async () => {
    const { w, post } = tradeWorld();
    w.trade.routes.memphis = { day: 0, gifted: true };
    addRaw(w, 'storehouse', 20, 11, { store: { pottery: 40 } });
    const r = await rigUI({ world: w });
    try {
      openTrade(r, post);
      const rows = [...r.root.querySelectorAll('#sheet .trade-good')].map((li) => li.dataset.good);
      expect(rows).toEqual(['grain', 'figs', 'pottery', 'beer', 'clay', 'barley']);
      expect(tradedGoods(w)).toEqual(rows);
      const prices = tradePrices(w, 'memphis');
      expect(good(r, 'pottery').querySelector('.prices').textContent).toBe(`Memphis pays ${prices.buys.pottery}`);
      expect(good(r, 'clay').querySelector('.prices').textContent).toBe(`Memphis asks ${prices.sells.clay}`);
      expect(good(r, 'pottery').textContent).toContain('40 in storage');
      const modes = (g) => [...good(r, g).querySelectorAll('.mode')].map((b) => b.dataset.mode);
      expect([modes('pottery'), modes('clay')]).toEqual([['sell', 'ignore'], ['buy', 'ignore']]);
      expect(good(r, 'pottery').querySelector('.mode.ignore').getAttribute('aria-pressed')).toBe('true');
      expect(good(r, 'pottery').querySelector('.choices').getAttribute('role')).toBe('group');
      expect(good(r, 'pottery').querySelector('.keep')).toBe(null);                    // nothing to keep while ignored
      w.milestone = 'great_city';
      w.trade.routes.byblos = { day: 0, gifted: true };
      r.ui.refresh();
      expect(modes('beer')).toEqual(['buy', 'sell', 'ignore']);                        // Memphis buys beer, Byblos sells it
      expect(good(r, 'pottery').querySelector('.prices').textContent).toBe(`Memphis pays ${prices.buys.pottery} · Byblos pays ${tradePrices(w, 'byblos').buys.pottery}`);
    } finally { r.cleanup(); }
  });
  it('sets what to do with a good and the level to keep through the sim, in steps of 10, with 44 px buttons', async () => {
    const { w, post } = tradeWorld();
    w.trade.routes.memphis = { day: 0, gifted: true };
    const r = await rigUI({ world: w });
    try {
      openTrade(r, post);
      fire(good(r, 'pottery').querySelector('.mode.sell'), 'click');
      expect(w.trade.orders.pottery).toEqual({ mode: 'sell', keep: 0 });
      expect(good(r, 'pottery').querySelector('.mode.sell').getAttribute('aria-pressed')).toBe('true');
      const less = () => good(r, 'pottery').querySelector('.keep-less'), more = () => good(r, 'pottery').querySelector('.keep-more');
      expect([less().textContent, more().textContent, less().disabled]).toEqual(['−10', '+10', true]);
      expect(more().getAttribute('aria-label')).toBe('+10: keep more pottery');
      for (const b of [less(), more()]) {
        const box = b.getBoundingClientRect();
        expect([box.width >= 44, box.height >= 44]).toEqual([true, true]);
      }
      more().focus();
      fire(more(), 'click');
      fire(more(), 'click');
      expect(w.trade.orders.pottery).toEqual({ mode: 'sell', keep: 20 });
      expect(document.activeElement).toBe(more());                                      // the rebuilt sheet keeps keyboard focus
      expect(good(r, 'pottery').querySelector('.keep-value').textContent).toBe('Keep 20');
      expect(good(r, 'pottery').querySelector('.keep-help').textContent).toBe('Sells what is over 20 in storage');
      fire(less(), 'click');
      expect(w.trade.orders.pottery.keep).toBe(10);
      fire(good(r, 'clay').querySelector('.mode.buy'), 'click');
      expect(good(r, 'clay').querySelector('.keep-help').textContent).toBe('Buys until 0 are in storage');
      fire(good(r, 'pottery').querySelector('.mode.ignore'), 'click');
      expect(w.trade.orders.pottery).toEqual({ mode: 'ignore', keep: 10 });             // the level is kept for next time
      expect(good(r, 'pottery').querySelector('.keep')).toBe(null);
    } finally { r.cleanup(); }
  });
  it("warns with Show me when no road joins the post to the trade entry, and shows the next caravan's date", async () => {
    const { w, post } = tradeWorld({ joined: false });
    w.trade.routes.memphis = { day: 0, gifted: false };
    const r = await rigUI({ world: w });
    try {
      openTrade(r, post);
      const warning = r.root.querySelector('#sheet .trade-warning');
      expect(warning.textContent).toContain(T.postNotJoined);
      fire(warning.querySelector('.show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'road' });
      expect(r.store.get().sheet).toBe(null);
      setRoad(w, 31, 10, w.tradeEntry.x, w.tradeEntry.y);                           // joined: caravans can come
      openTrade(r, post);
      expect(r.root.querySelector('#sheet .trade-warning')).toBe(null);
      const day = nextCaravanDay(w);
      expect(Number.isFinite(day) && day > w.day).toBe(true);
      expect(r.root.querySelector('#sheet .next-caravan').textContent).toBe(`${T.nextCaravan}${dateText(dateParts({ day }))}`);
    } finally { r.cleanup(); }
  });
  it('tells the city about each caravan in a caption: what it bought and sold, any gift, and the gold', async () => {
    expect(caravanText({ partner: 'memphis', sold: { pottery: 30 }, bought: {}, income: 240 }).text).toBe('A caravan from Memphis bought 30 pottery: +240 gold');
    expect(caravanText({ partner: 'memphis', sold: {}, bought: { clay: 20 }, gift: { good: 'clay', n: 40 }, income: 0 }).text)
      .toBe('A caravan from Memphis sold you 20 clay and brought a gift of 40 clay');
    expect(caravanText({ partner: 'byblos', sold: { linen: 10, jewellery: 5 }, bought: { flax: 25 }, income: 240 }).text)
      .toBe('A caravan from Byblos bought 10 linen and 5 jewellery and sold you 25 flax: +240 gold');
    const idle = caravanText({ partner: 'memphis', sold: {}, bought: {}, income: 0 });
    expect([idle.text, idle.why]).toEqual(['A caravan from Memphis found nothing to trade', T.caravanIdleWhy]);
    const r = await rigUI();
    try {
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'caravan', partner: 'memphis', sold: { pottery: 30 }, bought: {}, income: 240 }]);
      expect(r.root.querySelector('#cheer .cheer .text').textContent).toBe('A caravan from Memphis bought 30 pottery: +240 gold');
    } finally { r.cleanup(); }
  });
  it('brings the trade tip once the first trading post is placed and the tool closes', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t });
    try {
      settle(r.world, []);
      r.world.milestone = 'market_town';
      t = TIP_FIRST_DELAY_MS;
      r.ui.placement.start({ kind: 'building', type: 'trading_post' }, { x: 17, y: 11 });
      expect(r.ui.placement.confirm().ok).toBe(true);
      r.ui.placement.cancel();
      const tip = TIPS.find((x) => x.trigger === 'tradingPostPlaced');
      expect(r.ui.tips.current()).toBe(tip.id);
      expect(r.root.querySelector('#tip .text').textContent).toBe(TIP_TEXT[tip.id]);
    } finally { r.cleanup(); }
  });
  it("sends the trade route goal's Show me to the trading post card until a post stands, then to its trade sheet", async () => {
    const goal = GOALS.find((g) => g.id === 'trade_route');
    const cityAtTradeRoute = (withPost) => {
      const { w, post } = tradeWorld({ joined: false });
      if (!withPost) delete w.buildings[post.id];
      w.goals.completed = GOALS.slice(0, GOALS.indexOf(goal)).map((g) => g.id);    // the trade route is the open goal
      w.guide.on = false;
      return { w, post };
    };
    const without = cityAtTradeRoute(false);
    const r1 = await rigUI({ world: without.w });
    try {
      expect(r1.root.querySelector('#goals .goal-strip .text').textContent).toBe(goal.text);
      fire(r1.root.querySelector('#goals .show-me'), 'click');
      expect([r1.store.get().tool, r1.store.get().sheet]).toEqual([{ kind: 'building', type: 'trading_post' }, null]);
    } finally { r1.cleanup(); }
    const withPost = cityAtTradeRoute(true);
    const r2 = await rigUI({ world: withPost.w });
    try {
      expect(r2.root.querySelector('#goals .goal-strip .text').textContent).toBe(goal.text);
      r2.store.set(select(r2.store.get(), housesOf(withPost.w)[0].id));            // another sheet is open: Show me replaces it
      fire(r2.root.querySelector('#goals .show-me'), 'click');
      const s = r2.store.get();
      expect([s.sheet, s.selectedId, s.tool]).toEqual([{ kind: 'trade', id: withPost.post.id }, withPost.post.id, null]);
      expect(r2.root.querySelector('#sheet h2').textContent).toBe(T.trade);
      expect(r2.root.querySelectorAll('#sheet').length).toBe(1);
    } finally { r2.cleanup(); }
  });
});
