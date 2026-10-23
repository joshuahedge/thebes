// Version 7.0, Track A (rulings 960-974): the Advice fixes and the trade items, each set up both ways (the problem there and the fix the sim would honour, then the problem gone
// or the fix impossible and the advice saying so). A fix is never something the placing rule would refuse; every number is the sim's own function's.
//   towers   towerSpotsFor: tiles a road touches within DEFENCE.towerRange of the target, nearest first; with none the road (Route) that gives a tile its road, with none of either no fix
//   stranded strandedFix: a store spot by the bazaar when the nearest store holding the good is beyond a cart's sensible reach (a month's trips of CARTS.perTrip against a Fetch order)
//   trade    'quay' (a river route open, no Quay) and 'trade_floor' (Keep at least holding back sales while the treasury runs out)
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { EAST, warn, raidCity, street, tradeCity } from './helpers.js';
import { cityAdvice, nextStep } from '../../../src/sim/advice.js';
import { towerSpotsFor, towerFix, strandedFix, quaySpot, heldBackSales, cartMonthly, sensibleMonthly } from '../../../src/sim/adviceFixes.js';
import { checkTiles, canPlace, place } from '../../../src/sim/commands.js';
import { drawRoute } from '../../../src/sim/route.js';
import { towersNeeded, firstRaidTarget } from '../../../src/sim/raids.js';
import { needCause } from '../../../src/sim/housing.js';
import { goodStoresFor } from '../../../src/sim/housing.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { canAfford } from '../../../src/sim/money.js';
import { roundTripDays } from '../../../src/sim/carts.js';
import { touchesRoad } from '../../../src/sim/reach.js';
import { fitOf } from '../../../src/sim/fit.js';
import { setTradeOrder, setKeepAtLeast, tradeStock, quays } from '../../../src/sim/trade.js';
import { setTradeSwitch } from '../../../src/sim/trade.js';
import { showMeRefusal } from '../../../src/ui/adviceUi.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { stepWords } from '../../../src/ui/nextStepText.js';
import { act, setLegacyTowers } from '../../v50/grand/grandRun.js';
import { nearestFit } from '../../../src/ui/placement.js';
import { ADVICE_FIX_TEXT } from '../../../src/ui/text.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { ADVICE, ADVICE_KINDS } from '../../../src/data/advice.js';
import { ADVICE_FIX } from '../../../src/data/adviceFixes.js';
import { CARTS } from '../../../src/data/s47.js';
import { QUAY_TYPE } from '../../../src/data/trade.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { monthForecast } from '../../../src/sim/economy.js';

const ofKind = (w, kind) => cityAdvice(w).filter((a) => a.kind === kind);
const towerItem = (w) => ofKind(w, 'raid_towers')[0];
const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const tileCentre = (s) => ({ x: s.x + 0.5, y: s.y + 0.5 });

describe('v70 a towers: where a tower defends (ruling 960)', () => {
  it('towerSpotsFor is every tile the placing rule takes within the tower\'s range of the target that a road touches, in the order Show me\'s search finds them; none with no road in range', () => {
    const { w, post } = raidCity();
    const c = centre(post);
    const want = [];
    for (let y = 0; y < w.size; y++) for (let x = 0; x < w.size; x++) {
      const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
      if (d <= DEFENCE.towerRange && checkTiles(w, 'tower', x, y) === null) want.push({ x, y });
    }
    const spots = towerSpotsFor(w, post);
    expect(spots.length).toBeGreaterThan(3);
    const key = (s) => s.y * 100 + s.x;
    expect(spots.map(key).sort((a, b) => a - b)).toEqual(want.map(key).sort((a, b) => a - b));        // the same tiles, whatever the order
    // The order is the one Show me's own search uses (the rings round the tile a tower centred on the target starts on), so where it already lands a tower in range, the advice says that tile.
    const pick = nearestFit(w, { kind: 'building', type: 'tower' }, c.x - 0.5, c.y - 0.5, null, w.size);
    expect(spots[0]).toEqual({ x: pick.x, y: pick.y });
    for (const s of spots) expect([s.x, s.y, touchesRoad(w, { x: s.x, y: s.y, w: 1, d: 1 })]).toEqual([s.x, s.y, true]);
    expect(towerSpotsFor(w, c)).toEqual(spots);                                   // a point is the same as the building's centre
    // The same building a few tiles from every road: no tile in range has a road beside it.
    const far = raidCity(22);
    expect(towerSpotsFor(far.w, far.post)).toEqual([]);
    expect([towerSpotsFor(w, null), strandedFix(w, 'pottery', null)]).toEqual([[], null]);
  });

  it('puts the warned raid\'s tower on the first spot, with Show me not refused there; the item says where and costs a tower', () => {
    const { w, post } = raidCity();
    const a = towerItem(w);
    const first = towerSpotsFor(w, post)[0];
    expect([a.fix.item, a.fix.at, a.fix.target, a.cost, a.data.guard.id, a.data.spot, a.data.noSpot]).toEqual(['tower', 'near', tileCentre(first), costOf(w, 'tower'), post.id, first, false]);
    expect(a.data.buildN).toBe(towersNeeded(9));
    expect(a.data.buildCost).toBe(a.data.buildN * costOf(w, 'tower'));
    expect(showMeRefusal(w, 'tower', a.fix.target)).toBe(null);
    expect(checkTiles(w, 'tower', first.x, first.y)).toBe(null);
    expect(adviceWords(a, w).fix.endsWith(`. ${ADVICE_FIX_TEXT.towerWhere({ type: 'trading_post' })}`)).toBe(true);
    expect(adviceWords(a, w).fix).toContain(`within ${DEFENCE.towerRange} tiles of the trading post the raiders strike first`);
    // Build it: the next spot is the next tile, never the one taken.
    addRaw(w, 'tower', first.x, first.y, { staff: 4 });
    expect(towerItem(w).fix.target).toEqual(tileCentre(towerSpotsFor(w, post)[0]));
    expect(towerSpotsFor(w, post).some((s) => s.x === first.x && s.y === first.y)).toBe(false);
  });

  it('with no road in range the fix is the road: lay it to the tile the tower may then stand on, say how many tiles, and the next reading names the tower', () => {
    const { w, post } = raidCity(22);
    const a = towerItem(w);
    expect([a.fix.item, a.fix.at, a.fix.then, a.data.spot, a.data.noSpot]).toEqual(['road', 'near', 'tower', null, false]);
    const road = a.data.road;
    expect(road.tiles).toBeGreaterThan(0);
    expect(a.fix.tiles).toBe(road.tiles);
    expect(a.fix.target).toEqual(tileCentre(road));
    expect([a.cost, a.afford]).toEqual([roadCostOf(w), canAfford(w, roadCostOf(w))]);   // priced a tile; the words say how many tiles
    expect(w.road[idx(w.size, a.fix.from.x, a.fix.from.y)]).toBe(1);                      // it joins a road already there
    expect(Math.hypot(a.fix.spot.x + 0.5 - centre(post).x, a.fix.spot.y + 0.5 - centre(post).y)).toBeLessThanOrEqual(DEFENCE.towerRange);
    expect(checkTiles(w, 'tower', a.fix.spot.x, a.fix.spot.y)).toBe('needs_road');         // it lacks only the road
    expect(showMeRefusal(w, 'road', a.fix.target)).toBe(null);                              // Show me starts the road tool
    const t = adviceWords(a, w);
    expect(t.fix).toBe(ADVICE_FIX_TEXT.roadFirst(road.tiles, a.data.buildN, a.data.buildCost));
    expect(t.fix.startsWith(`Lay a road to here (${road.tiles} tiles), then build ${a.data.buildN} towers`)).toBe(true);
    expect(t.why).toBe(ADVICE_FIX_TEXT.towerNeedsRoad({ type: 'trading_post' }));
    expect([t.action.label, t.cost]).toEqual(['Show me', `Road: ${roadCostOf(w)} gold a tile`]);
    // Lay it as the road tool's Route would: exactly the tiles the item said, and the item is the tower's now.
    const before = w.road.reduce((n, v) => n + (v ? 1 : 0), 0);
    const laid = drawRoute(w, Math.floor(a.fix.target.x), Math.floor(a.fix.target.y), a.fix.from.x, a.fix.from.y);
    expect(laid.ok).toBe(true);
    expect(w.road.reduce((n, v) => n + (v ? 1 : 0), 0) - before).toBe(road.tiles);
    const b = towerItem(w);
    expect([b.fix.item, towerSpotsFor(w, post).length > 0, b.data.road]).toEqual(['tower', true, null]);
    expect(showMeRefusal(w, 'tower', b.fix.target)).toBe(null);
  });

  it('is a fix the balance runs\' player can do as the words say: the road first, then the tower on the spot a road now touches', () => {
    setLegacyTowers(false);                                                        // the runs keep 6.0's hand by default (grandRun.js); this is the 7.0 player
    try {
      const { w, post } = raidCity(22);
      const tried = new Set();
      const tiles = towerItem(w).fix.tiles;
      const road = act(w, towerItem(w).fix, null, tried);
      expect([road.road, road.tiles]).toEqual(['tower', tiles]);
      expect(towerSpotsFor(w, post).length).toBeGreaterThan(0);                    // a spot a road touches lies in range now
      const a = towerItem(w);
      expect([a.fix.item, a.fix.then]).toEqual(['tower', undefined]);
      w.labour.workforce = 100;                                                    // the driver builds no workplace the workforce cannot staff
      const built = act(w, a.fix, null, tried);
      expect([built.type, [built.x, built.y]]).toEqual(['tower', [a.fix.target.x - 0.5, a.fix.target.y - 0.5]]);
      expect(act(w, { item: 'road', then: 'tower', from: { x: 0, y: 13 }, target: { x: 5.5, y: 20.5 }, tiles: 7 }, null, new Set([`road:5.5:20.5`]))).toBe(null);   // asked twice in a month: once
    } finally { setLegacyTowers(true); }
  });

  it('the item carries the building it defends, and the balance runs\' driver keeps 6.0\'s hand through it: a tower where Show me lands from that building, no road first', () => {
    const { w, post } = raidCity(19);
    const a = towerItem(w);
    expect([a.fix.item, a.fix.then, a.fix.guard]).toEqual(['road', 'tower', post.id]);
    w.labour.workforce = 100;
    const pick = nearestFit(w, { kind: 'building', type: 'tower' }, centre(post).x - 0.5, centre(post).y - 0.5, null, w.size);   // where Show me lands from that building, asked before the driver builds there
    const built = act(w, a.fix, null, new Set());
    expect([built.type, built.road, [built.x, built.y]]).toEqual(['tower', undefined, [pick.x, pick.y]]);
    const near = raidCity();
    expect(towerItem(near.w).fix.guard).toBe(near.post.id);
  });

  it('with neither a spot nor a road to one, no fix: the words say there is no free tile in range', () => {
    const { w, post } = raidCity(22);
    const c = centre(post);
    // A paved square all round it: every free tile in range is road, so none takes a tower and none lacks only a road (the band walks the road to the post as ever).
    for (let y = 0; y < w.size; y++) for (let x = 0; x < w.size; x++) {
      if (Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) <= DEFENCE.towerRange + 1.5 && checkTiles(w, 'tower', x, y) !== 'occupied') w.road[idx(w.size, x, y)] = 1;
    }
    w.roadVersion++;
    expect([towerSpotsFor(w, post), towerFix(w, c)]).toEqual([[], null]);
    const a = towerItem(w);
    expect([a.fix, a.cost, a.afford, a.data.noSpot]).toEqual([null, null, null, true]);
    const t = adviceWords(a, w);
    expect([t.why, t.fix, t.action]).toEqual([ADVICE_FIX_TEXT.towerNoRoom({ type: 'trading_post' }), ADVICE_FIX_TEXT.towerNoRoomFix, null]);
    expect(t.why).toBe(`No free tile lies within ${DEFENCE.towerRange} tiles of the trading post the raiders strike first`);
  });

  it('before a warning the tower goes by the city\'s start, as ever (no first strike to defend yet); a band with nothing to strike gets the old fix beside its entry', () => {
    const w = makeTestWorld({ gold: 5000, raiderEntries: [EAST] });
    w.milestone = 'market_town';
    w.raid.clockDay = 0;
    const a = towerItem(w);
    expect([a.data.warned, a.data.guard, a.data.spot, a.data.noSpot, a.fix.item, a.fix.target]).toEqual([false, null, null, false, 'tower', { x: w.focus.x + 0.5, y: w.focus.y + 0.5 }]);
    warn(w, { target: 'storehouse' });                                                    // nothing of the kind, no building at all to strike
    expect(towerItem(w).fix.target).toEqual({ x: EAST.x + 0.5, y: EAST.y + 0.5 });
    expect(firstRaidTarget(w, EAST, 'storehouse')).toBe(null);
  });
});

describe('v70 a stranded: a store by the bazaar when a cart could not bring the good (ruling 961)', () => {
  it('names a valid store spot by the bazaar, with the road tiles to the store that holds the good and what one cart brings a month, from the sim\'s own trip days', () => {
    const { w, bazaar, home, store } = street();
    const c = needCause(w, home, 'pottery');
    expect([c.code, c.id, c.bazaar]).toEqual(['good_far', store.id, bazaar.id]);
    const far = strandedFix(w, 'pottery', bazaar);
    expect([far.item, far.len, far.store, far.maker]).toEqual(['storehouse', c.len, store.id, null]);
    expect(far.perMonth).toBe(CARTS.perTrip * Math.floor(30 / roundTripDays(c.len)));
    expect(far.perMonth).toBe(cartMonthly(c.len));
    expect(far.perMonth).toBeLessThan(sensibleMonthly());
    expect(sensibleMonthly()).toBe(ADVICE_FIX.strandedOrders * CARTS.defaultFetch);
    expect(checkTiles(w, 'storehouse', far.x, far.y)).toBe(null);                          // the placing rule takes it, with a road beside it
    const [a] = ofKind(w, 'stranded');
    expect([a.fix.item, a.fix.at, a.fix.near, a.fix.target, a.cost, a.afford]).toEqual(['storehouse', 'near', bazaar.id, { x: far.x + 1, y: far.y + 1 }, costOf(w, 'storehouse'), canAfford(w, costOf(w, 'storehouse'))]);
    expect(a.fix.far).toEqual({ len: far.len, perMonth: far.perMonth, store: store.id, maker: null });
    expect(showMeRefusal(w, 'storehouse', a.fix.target)).toBe(null);
    // The store really would be the bazaar's: placed there, the bazaar draws from it.
    expect(canPlace(w, 'storehouse', far.x, far.y).ok).toBe(true);
    const placed = place(w, 'storehouse', far.x, far.y);
    expect(goodStoresFor(w, bazaar, 'pottery').map((b) => b.id)).toContain(placed.id);
  });

  it('says the same in City advice and in the house sheet\'s next step, with the numbers', () => {
    const { w, bazaar, home } = street();
    const [a] = ofKind(w, 'stranded');
    const far = strandedFix(w, 'pottery', bazaar);
    const t = adviceWords(a, w);
    expect(t.fix).toBe(ADVICE_FIX_TEXT.strandedFix({ ...a.fix.far, item: 'storehouse' }));
    expect(t.fix).toBe(`Build a storehouse near this bazaar: one cart would bring only ${far.perMonth} a month from ${far.len} road tiles away, under the ${sensibleMonthly()} that one order asks`);
    expect([t.action.label, t.cost, t.short]).toEqual(['Show me', `Storehouse: ${costOf(w, 'storehouse')} gold`, false]);
    const step = nextStep(w, home);
    expect([step.reason, step.need, step.fix.item, step.fix.target, step.cost]).toEqual([null, 'pottery', 'storehouse', a.fix.target, costOf(w, 'storehouse')]);
    const words = stepWords(w, home, step);
    expect(words.rest).toBe(`a storehouse near the bazaar (${costOf(w, 'storehouse')} gold) keeps pottery where the bazaar draws it: one cart would bring only ${far.perMonth} a month from the store ${far.len} road tiles away`);
    expect(words.action.build).toEqual({ category: 'industry', item: 'storehouse', x: a.fix.target.x, y: a.fix.target.y });
  });

  it('prefers a spot a working maker of the good reaches (its producer reach), and says nothing of one when none does', () => {
    const { w, bazaar, maker } = street({ potter: true });
    const far = strandedFix(w, 'pottery', bazaar);
    expect(far.maker).toBe(maker.id);
    maker.paused = true;                                                                      // a paused maker fills nothing: the answer follows it, though the buildings are as they were
    expect(strandedFix(w, 'pottery', bazaar).maker).toBe(null);
    maker.paused = false;
    expect(strandedFix(w, 'pottery', bazaar).maker).toBe(maker.id);
    expect(adviceWords(ofKind(w, 'stranded')[0], w).fix).toContain(', where what is made can reach it:');
    const bare = street();
    expect(adviceWords(ofKind(bare.w, 'stranded')[0], bare.w).fix.includes('where what is made')).toBe(false);
  });

  it('is the Fetch order\'s when the store is within a cart\'s sensible reach, or once a store by the bazaar stands (gone once a store in reach holds it)', () => {
    const close = street({ farAt: 30 });
    const c = needCause(close.w, close.home, 'pottery');
    expect(cartMonthly(c.len)).toBeGreaterThanOrEqual(sensibleMonthly());                    // 22 road tiles: a cart brings an order's worth a month
    expect(strandedFix(close.w, 'pottery', close.bazaar)).toBe(null);
    expect(ofKind(close.w, 'stranded')[0].fix.select).toBe(close.store.id);                  // the old fix: no store near the bazaar can Fetch it yet: show the one that holds it
    // Beyond the sensible reach but with a store by the bazaar already: the Fetch order is next, set on that store.
    const laid = street({ near: true });
    expect(cartMonthly(needCause(laid.w, laid.home, 'pottery').len)).toBeLessThan(sensibleMonthly());
    expect(strandedFix(laid.w, 'pottery', laid.bazaar)).toBe(null);
    const [a] = ofKind(laid.w, 'stranded');
    expect([a.fix.select, a.fix.fetch]).toEqual([laid.nearStore.id, true]);
    laid.nearStore.store.pottery = 5;                                                         // and once a store in reach holds some, no stranded item at all
    expect(ofKind(laid.w, 'stranded')).toEqual([]);
  });
});

describe('v70 a quay: a river route open with no Quay to land at (ruling 962)', () => {
  it('names the open river partners and Show me aims at a bank the placing rule takes a Quay on; none with no river route open, or once one stands', () => {
    const { w } = tradeCity();
    expect(ofKind(w, 'quay')).toEqual([]);
    w.trade.routes.memphis = { since: 0, gifted: true };                                      // a road route needs no Quay
    expect(ofKind(w, 'quay')).toEqual([]);
    w.trade.routes.nubia = { since: 0, gifted: true };
    const [a] = ofKind(w, 'quay');
    expect([a.kind, a.weight, a.count, a.id, a.data.partners, a.data.noSpot, a.fix.item, a.fix.at, a.cost, a.afford]).toEqual(['quay', ADVICE_FIX.quay, 1, null, ['nubia'], false, QUAY_TYPE, 'near', costOf(w, QUAY_TYPE), true]);
    expect(ADVICE_KINDS).toContain('quay');
    const spot = quaySpot(w);
    expect([spot.road, checkTiles(w, QUAY_TYPE, spot.x, spot.y, spot.rot)]).toEqual([false, 'needs_road']);   // the bank has no road yet: it comes after, as the building tool allows
    expect(fitOf(w, QUAY_TYPE, spot.x, spot.y, spot.rot).wet).toBeGreaterThan(0);
    expect(showMeRefusal(w, QUAY_TYPE, a.fix.target)).toBe(null);
    const t = adviceWords(a, w);
    expect([t.what, t.fix, t.action.label]).toEqual(['Nubia has an open route and no Quay for its boats to land at', 'Build a Quay on the riverbank', 'Show me']);
    expect(t.why).toContain('Boats land only at a Quay: 2 by 1');
    // A bank with a road beside it comes first.
    setRoad(w, 12, 4, 24, 4);
    const roaded = quaySpot(w);
    expect([roaded.road, checkTiles(w, QUAY_TYPE, roaded.x, roaded.y, roaded.rot)]).toEqual([true, null]);
    // Place it: the item is gone.
    expect(place(w, QUAY_TYPE, roaded.x, roaded.y, { rot: roaded.rot }).ok).toBe(true);
    expect(quays(w).length).toBe(1);
    expect(ofKind(w, 'quay')).toEqual([]);
  });

  it('never aims at an oasis pool: the nearest water may be one, and the fit rule refuses a Quay there', () => {
    const { w } = tradeCity();
    for (let y = 20; y < 23; y++) for (let x = 14; x < 17; x++) w.terrain[idx(w.size, x, y)] = T.WATER;   // a pool south of the post, nearer than the river
    w.oases = [{ x: 15, y: 21, r: 2 }];
    w.trade.routes.nubia = { since: 0, gifted: true };
    const spot = quaySpot(w);
    expect(spot.y).toBeLessThan(5);                                                           // the river's bank, not the pool's
    expect(fitOf(w, QUAY_TYPE, spot.x, spot.y, spot.rot).wet).toBeGreaterThan(0);
    // With the river gone there is only the pool: no spot, no fix, and the words say so.
    for (let y = 0; y < 3; y++) for (let x = 0; x < w.size; x++) w.terrain[idx(w.size, x, y)] = T.DESERT;
    expect(quaySpot(w)).toBe(null);
    const [a] = ofKind(w, 'quay');
    expect([a.fix, a.cost, a.data.noSpot]).toEqual([null, null, true]);
    expect(adviceWords(a, w).fix).toBe(ADVICE_FIX_TEXT.quayNoRoom);
  });
});

describe('v70 a trade floor: Keep at least holding back sales while the treasury runs out (ruling 963)', () => {
  const sellPottery = (w, level) => { w.trade.routes.memphis = { since: 0, gifted: true }; setTradeOrder(w, 'pottery', 'sell', level); setKeepAtLeast(w, 'pottery', level); };

  it('weighs the gold the held-back sales would bring, from the caravan\'s own room and stock, only while the treasury runs out', () => {
    const { w, store, post } = tradeCity();
    sellPottery(w, 100);
    w.gold = 0;
    expect(monthForecast(w).runsOut).toBe(true);
    const [a] = ofKind(w, 'trade_floor');
    const g = a.data.goods[0];
    expect(tradeStock(w, 'pottery', post)).toBe(60);
    expect([g.good, g.partner, g.at, g.level, g.stock, g.blocked]).toEqual(['pottery', 'memphis', 'post', 100, 60, 50]);   // a visit sells 200 / 4 = 50 of what is over the level; with none held, 50 of the 60
    expect([g.price, g.gold]).toEqual([8, 400]);
    expect([a.kind, a.count, a.id, a.fix.view, a.fix.section, a.cost, a.data.gold]).toEqual(['trade_floor', 1, null, 'summary', 'trade', null, 400]);
    expect(a.weight).toBe(Math.max(1, Math.round(400 / 3 / ADVICE.goldPerPoint)) * (monthForecast(w).goesBelow ? ADVICE.goldSoon : 1));
    expect(heldBackSales(w)).toEqual(a.data.goods);
    // Lower the level: what is over it is sold, so nothing is held back; at 55 the caravan still sells the 5 over.
    setKeepAtLeast(w, 'pottery', 55);
    expect(heldBackSales(w)[0].blocked).toBe(45);
    setKeepAtLeast(w, 'pottery', 0);
    expect(heldBackSales(w)).toEqual([]);
    expect(ofKind(w, 'trade_floor')).toEqual([]);
    expect(store.store.pottery).toBe(60);
  });

  it('is not an item while the treasury is fine, the level is 0, the route or the good is off or the order is not Sell', () => {
    const { w } = tradeCity();
    sellPottery(w, 100);
    w.gold = 0;
    expect(ofKind(w, 'trade_floor').length).toBe(1);
    w.gold = 100000;
    expect(monthForecast(w).runsOut).toBe(false);
    expect(ofKind(w, 'trade_floor')).toEqual([]);                                             // a floor the player chose, with money to spare, is not a problem
    w.gold = 0;
    expect(setTradeSwitch(w, 'memphis', 'buys', 'pottery', false).ok).toBe(true);
    expect(ofKind(w, 'trade_floor')).toEqual([]);                                             // the route leaves the good alone whatever the level
    expect(setTradeSwitch(w, 'memphis', 'buys', 'pottery', true).ok).toBe(true);
    expect(ofKind(w, 'trade_floor').length).toBe(1);
    setTradeOrder(w, 'pottery', 'ignore', 100);
    expect(ofKind(w, 'trade_floor')).toEqual([]);
    setTradeOrder(w, 'pottery', 'sell', 100);
    delete w.trade.routes.memphis;
    expect(ofKind(w, 'trade_floor')).toEqual([]);                                             // no route open: nothing would sell
  });

  it('words it with the level, the stock where the caravan counts it, the partner and the gold, and Trade in the button\'s name', () => {
    const { w } = tradeCity();
    sellPottery(w, 100);
    w.gold = 0;
    const [a] = ofKind(w, 'trade_floor');
    const t = adviceWords(a, w);
    expect(t.what).toBe('Pottery: Keep at least 100 holds back 50 the caravan would sell');
    expect(t.why).toBe('60 in storage near the trading post; Memphis would pay 400 gold for 50. At this rate the treasury runs out in about 1 month');
    expect(t.fix).toBe('Open Trade and lower Keep at least for pottery');
    expect([t.action.label, t.action.aria]).toEqual(['View', `View: ${t.what}`]);
  });
});
