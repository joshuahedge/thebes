// Version 8.4, Track G (design 2c, rulings 1468, 1471-1473): luxury imports. A Villa and an Estate need one luxury of any kind in stock (incense, cedar, ivory),
// 0.01 a resident a month times the tier's use (3 for a Villa of 150, 4 for an Estate of 180); a missing one is like any missing need (a Fine manor does
// not rise; a Villa falls after two months). Bazaars sell them; a home tops up as one pool; nothing makes one, so the causes name the trade fix.
import { describe, it, expect } from '../../harness.js';
import { TIERS, DOWNGRADE_AFTER_MONTHS } from '../../../src/data/housing.js';
import { LUXURY_GOODS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { PARTNERS } from '../../../src/data/trade.js';
import { monthlyHousing, needCause, houseStatus, wantedGoods, luxuryGrace } from '../../../src/sim/housing.js';
import { luxuryNeed, luxuryOnHand, topUpHouse, bazaarsByHouse, restockBazaars, LUXURY_ORDER } from '../../../src/sim/distribution.js';
import { luxuryTradeCause, luxurySellers, luxuryUse, luxuryStock, luxuryKeepFor } from '../../../src/sim/luxury.js';
import { nextStep, priceOf, cityAdvice } from '../../../src/sim/advice.js';
import { setTradeOrder, tradeMonth, tradePrices, openRoute } from '../../../src/sim/trade.js';
import { routeCostOf } from '../../../src/sim/costs.js';
import { allBuildings, STAGE84_TALLY } from '../../../src/sim/world.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { add, luxuryStreet } from './fixtures.js';

const month = (world) => { monthlyHousing(world); world.day += DAYS_PER_MONTH; };

describe('v84 g luxury: the need', () => {
  it('is a need of the Villa and the Estate only, after their other needs (the Estate\'s before jewellery), and never asked below', () => {
    expect(TIERS.filter((t) => t && t.needs.includes('luxury')).map((t) => t.name)).toEqual(['Villa', 'Estate']);
    expect(TIERS[8].needs.slice(-1)).toEqual(['luxury']);
    expect(TIERS[9].needs.slice(-2)).toEqual(['luxury', 'jewellery']);
    const { world, home } = luxuryStreet({ tier: 6 });
    expect(wantedGoods(home).some((g) => LUXURY_GOODS.includes(g))).toBe(false);   // a Manor neither needs nor stocks one
    home.tier = 7;
    expect(LUXURY_GOODS.every((g) => wantedGoods(home).includes(g))).toBe(true);  // a Fine manor stocks for the Villa it grows into
    expect(houseStatus(world, home).checklist.map((c) => c.need)).toContain('luxury');
  });

  it('uses 0.01 a resident a month times the tier\'s use, rounded up per home: a Villa 3, an Estate 4 (Q4)', () => {
    expect(luxuryNeed({ residents: 150, tier: 8 })).toBe(3);
    expect(luxuryNeed({ residents: 180, tier: 9 })).toBe(4);
    expect(luxuryNeed({ residents: 125, tier: 7 }, 8)).toBe(2);                   // a full Fine manor stocks a Villa's use: 125 x 0.01 x 1.5 = 1.875
    expect(luxuryNeed({ residents: 125, tier: 7 })).toBe(2);                      // 1.25 at its own use
  });

  it('counts a luxury of any kind, and any mix, taking cedar and ivory before incense (ruling 1535)', () => {
    expect(LUXURY_ORDER).toEqual(['cedar', 'ivory', 'incense']);
    for (const good of LUXURY_GOODS) {
      const { world, home } = luxuryStreet({ luxury: { [good]: 3 } });
      expect([good, needCause(world, home, 'luxury')]).toEqual([good, null]);
      month(world);
      expect([good, home.met.luxury, home.tier]).toEqual([good, true, 8]);
    }
    const { world, home } = luxuryStreet({ luxury: { incense: 1, cedar: 1, ivory: 4 } });
    month(world);
    expect([home.met.luxury, home.stock.incense, home.stock.cedar, home.stock.ivory]).toEqual([true, 1, 0, 2]);   // ruling 1535: the incense is kept (3 used: the cedar, then two ivory)
  });

  it('downgrades a Villa after two months without a luxury, as any missing need', () => {
    const { world, home } = luxuryStreet();
    month(world);
    expect([home.met.luxury, home.tier, home.downTimer]).toEqual([false, 8, 1]);
    expect(houseStatus(world, home).missingNow).toEqual(['luxury']);
    month(world);
    expect(DOWNGRADE_AFTER_MONTHS).toBe(2);
    expect(home.tier).toBe(7);
  });

  it('keeps a Fine manor from rising to a Villa without one, and lets it rise once the bazaar has some (the home stocks for the Villa)', () => {
    const { world, home, bazaar } = luxuryStreet({ tier: 7 });
    month(world);
    expect([home.tier, home.met.luxury, home.downTimer]).toEqual([7, false, 0]);  // a Fine manor wants it to rise, but does not need it to stay
    bazaar.store.cedar = 10;
    month(world);                                                                 // the month's top-up brings it (2 for a Villa's use of 125)
    expect(home.stock.cedar).toBe(2);
    expect(houseStatus(world, home).checklist.filter((c) => !c.met)).toEqual([]);   // the cedar the month brought was all it lacked
    month(world);
    expect(home.tier).toBe(8);
  });

  it('counts as met before world.luxuryFrom (the grace of a city begun before 8.4), and not after', () => {
    const { world, home } = luxuryStreet();
    world.luxuryFrom = world.day + 2 * DAYS_PER_MONTH;
    expect([luxuryGrace(world), needCause(world, home, 'luxury')]).toEqual([true, null]);
    month(world); month(world);
    expect([home.tier, home.downTimer]).toEqual([8, 0]);
    expect(luxuryGrace(world)).toBe(false);
    month(world); month(world);
    expect(home.tier).toBe(7);
  });

  it('gives a migrated 8.3 city with a Villa 12 months before the need counts, so nothing falls on load', () => {
    const { world, home } = luxuryStreet();
    const v10 = JSON.parse(serialize(world));
    delete v10.luxuryFrom;
    for (const k of STAGE84_TALLY) delete v10.tally[k];
    v10.version = 10;
    const loaded = deserialize(JSON.stringify(v10));
    expect(loaded.luxuryFrom).toBe(world.day + 360);
    const villa = loaded.buildings[home.id];
    for (let m = 0; m < 12; m++) month(loaded);
    expect([villa.tier, villa.downTimer]).toEqual([8, 0]);
    month(loaded); month(loaded);
    expect(villa.tier).toBe(7);
  });
});

describe('v84 g luxury: the bazaar and the top-up', () => {
  it('sells the luxuries, 40 of each at most, and draws them from its stores only while some home wants one', () => {
    expect(LUXURY_GOODS.every((g) => BUILDINGS.bazaar.sells.includes(g) && BUILDINGS.bazaar.stock[g] === 40)).toBe(true);
    const { world, home, bazaar } = luxuryStreet({ tier: 6 });
    const store = allBuildings(world).find((b) => b.type === 'storehouse');
    store.store.incense = 100;
    restockBazaars(world);
    expect([bazaar.store.incense || 0, store.store.incense]).toEqual([0, 100]);  // no Fine manor, Villa or Estate: the incense stays for the festivals
    home.tier = 7;
    restockBazaars(world);
    expect([bazaar.store.incense, store.store.incense]).toEqual([40, 60]);
  });

  it('tops a home up as one pool to the month\'s need, the cheapest the bazaars hold first', () => {
    const { world, home, bazaar } = luxuryStreet({ stall: { ivory: 10, cedar: 1 } });
    topUpHouse(world, home, wantedGoods(home), bazaarsByHouse(world).get(home.id), { tier: 9 });
    expect([home.stock.cedar, home.stock.ivory, luxuryOnHand(home)]).toEqual([1, 2, 3]);   // at an Estate's use (the tier it grows into): 150 x 0.01 x 2 = 3
    expect([bazaar.store.cedar, bazaar.store.ivory]).toEqual([0, 8]);
  });
});

describe('v84 g luxury: the causes and their fixes', () => {
  const tradingPost = (world) => add(world, 'trading_post', 30, 8);

  it('says the next delivery brings one when the bazaar or a store in its reach holds one', () => {
    const { world, home } = luxuryStreet({ stall: { ivory: 5 } });
    expect(needCause(world, home, 'luxury')).toEqual({ code: 'next_delivery', id: allBuildings(world).find((b) => b.type === 'bazaar').id, good: 'ivory' });
    const s2 = luxuryStreet({ tier: 7 });                                         // a Fine manor: luxury is the last of a Villa's needs, so the step waits on it
    allBuildings(s2.world).find((b) => b.type === 'storehouse').store.cedar = 4;
    expect(needCause(s2.world, s2.home, 'luxury').code).toBe('next_delivery');
    expect(nextStep(s2.world, s2.home).reason).toBe('waiting');
  });

  it('names the cheapest partner to open a route to when none is open: Byblos and its cedar at Capital, with the route\'s price (Show me: the Trade sheet)', () => {
    const { world, home } = luxuryStreet();
    const post = tradingPost(world);
    const c = needCause(world, home, 'luxury');
    expect(c).toEqual({ code: 'no_luxury_route', id: post.id, good: 'cedar', partner: 'byblos', price: tradePrices(world, 'byblos').sells.cedar, block: null });
    const step = nextStep(world, home);
    expect([step.need, step.fix.trade, step.fix.select]).toEqual(['luxury', { partner: 'byblos', good: 'cedar', open: true }, post.id]);
    expect([step.cost, priceOf(world, step.fix)]).toEqual([routeCostOf(world, 'byblos'), routeCostOf(world, 'byblos')]);
    expect(luxurySellers(world).map((s) => s.partner)).toEqual(['byblos', 'nubia', 'punt']);
  });

  it('builds the trading post first when none stands (Open route would refuse with no_post)', () => {
    const { world, home } = luxuryStreet();
    const c = needCause(world, home, 'luxury');
    expect([c.code, c.id, c.partner, c.block]).toEqual(['no_luxury_route', null, 'byblos', 'no_post']);
    const step = nextStep(world, home);
    expect([step.fix.item, step.fix.target]).toEqual(['trading_post', { x: home.x + 1, y: home.y + 1 }]);
  });

  it('asks for the Buy order once a route that sells one is open, and waits for the caravan once it is set', () => {
    const { world, home } = luxuryStreet({ tier: 7 });
    const post = tradingPost(world);
    expect(openRoute(world, 'byblos').ok).toBe(true);
    const c = needCause(world, home, 'luxury');
    expect([c.code, c.id, c.good, c.partner, c.off]).toEqual(['luxury_not_bought', post.id, 'cedar', 'byblos', false]);
    const step = nextStep(world, home);
    expect([step.fix.trade, step.cost]).toEqual([{ partner: 'byblos', good: 'cedar', open: false }, null]);
    setTradeOrder(world, 'cedar', 'buy', 0);
    expect(needCause(world, home, 'luxury').code).toBe('luxury_not_bought');      // Buy at 0 buys nothing
    setTradeOrder(world, 'cedar', 'buy', 20);
    const ordered = needCause(world, home, 'luxury');
    expect([ordered.code, ordered.good, ordered.blocked]).toEqual(['luxury_ordered', 'cedar', null]);
    expect(nextStep(world, home).reason).toBe('waiting');
  });

  it('asks for a higher Keep at least when the order\'s level is below the homes\' use between two visits (ruling 1484)', () => {
    const { world, home } = luxuryStreet({ tier: 8 });
    tradingPost(world);
    for (const x of [26, 29]) add(world, 'house', x, 11, { tier: 9, w: 2, d: 2, residents: 180, stockedFor: 180, stock: {} });   // two Estates beside the Villa
    openRoute(world, 'byblos');
    // 11 a month (the Villa 3, each Estate 4), 33 between visits, and a month's stock on hand (the Villa stocks an Estate's 3, the Estates 4 each): 44, so 50.
    expect([luxuryUse(world), luxuryStock(world), luxuryKeepFor(world)]).toEqual([3 + 4 + 4, 3 + 4 + 4, 50]);
    setTradeOrder(world, 'cedar', 'buy', 20);
    const c = needCause(world, home, 'luxury');
    expect([c.code, c.keep, c.want, c.use]).toEqual(['luxury_short', 20, 50, 11]);
    const step = nextStep(world, home);
    expect([step.need, step.fix.trade]).toEqual(['luxury', { partner: 'byblos', good: 'cedar', open: false, keep: 50 }]);
    setTradeOrder(world, 'cedar', 'buy', 50);
    expect(needCause(world, home, 'luxury').code).toBe('luxury_ordered');
  });

  it('points at a luxury held only in a far store (good_far), as for any good', () => {
    const { world, home } = luxuryStreet();
    add(world, 'storehouse', 34, 11, { store: { ivory: 6 } });                   // beyond the bazaar's 16 road tiles
    const c = needCause(world, home, 'luxury');
    expect([c.code, c.good]).toEqual(['good_far', 'ivory']);
  });

  it('offers no fix before any partner selling one is open to the city (Byblos comes with Great city)', () => {
    const { world, home } = luxuryStreet();
    world.milestone = 'city';
    const c = luxuryTradeCause(world);
    expect([c.code, c.partner, c.good, c.milestone]).toEqual(['no_luxury_route', 'byblos', null, PARTNERS.byblos.milestone]);
    expect(needCause(world, home, 'luxury').code).toBe('no_luxury_route');
  });

  it('has City advice group the homes on it with the same fix', () => {
    const { world, home } = luxuryStreet();
    const post = tradingPost(world);
    const a = cityAdvice(world).find((x) => x.kind === 'home_need' && x.data.need === 'luxury');
    expect([a.data.cause.code, a.fix.select, a.fix.trade, a.data.homes]).toEqual(['no_luxury_route', post.id, { partner: 'byblos', good: 'cedar', open: true }, [home.id]]);
  });
});

describe('v84 g luxury: the caravan buys to keep', () => {
  it('buys cedar up to the Keep at least level into the stores near the post, counting the units and the gold', () => {
    const { world } = luxuryStreet();
    add(world, 'trading_post', 30, 8);
    const store = add(world, 'storehouse', 33, 8);
    world.gold = 10000;
    openRoute(world, 'byblos');
    world.trade.routes.byblos.gifted = true;
    setTradeOrder(world, 'cedar', 'buy', 40);
    world.stats.lastMonth = { taxes: 0, wages: 0, upkeep: 0, soldiers: 0, net: 0, monuments: 0, taxesNormal: 0, rush: 0, luxuries: 0 };
    world.day = 3 * DAYS_PER_MONTH;
    const gold = world.gold;
    tradeMonth(world);
    const price = tradePrices(world, 'byblos').sells.cedar;                       // this year's price, as the caravan asked it
    const n = Math.min(40, Math.floor(PARTNERS.byblos.sells.cedar.quota / 4));
    expect([store.store.cedar, world.tally.luxuryBought, world.stats.lastMonth.luxuries, gold - world.gold]).toEqual([n, n, n * price, n * price]);
  });
});
