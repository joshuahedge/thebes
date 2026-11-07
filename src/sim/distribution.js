import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS, LUXURY_GOODS } from '../data/goods.js';
import { useOf, TIERS, MAX_TIER } from '../data/housing.js';
import { GOOD_VALUE } from '../data/court.js';
import { INCENSE_GOOD } from '../data/trade.js';
import { EVENT_NUMBERS } from '../data/cityEvents.js';
import { FESTIVAL } from '../data/raids.js';
import { allBuildings, housesOf } from './world.js';
import { buildingsInReach, roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';

// A home's use of a good in a month, rounded up per home (spec 4.10). Every food has the same rate, so a home's
// food need is monthlyNeed(house, FOOD_GOODS[0]) whatever mix of foods meets it. Stage 4.7 (ruling 471): a household good's rate is
// times the tier's use (useOf: 1.5 a Villa, 2 an Estate, else 1); `tier` (default the home's own) asks it for another tier, so a home
// can be judged and stocked for the tier it is growing into.
// (The product is rounded to a millionth before it is rounded up when a use applies, so 150 x 0.04 x 1.5 is 9, not 10; the plain rate keeps
// its old sum exactly, so no home below a Villa moves.)
// Version 8.4 (Track G, ruling 1468): a luxury's rate takes the tier's use too, and every luxury has the same rate, so a home's luxury need is
// monthlyNeed(house, LUXURY_GOODS[0]) whatever mix of luxuries meets it (luxuryNeed).
const isHousehold = (good) => GOODS[good].kind === 'household' || Boolean(GOODS[good].luxury);   // (monthlyNeed reads GOODS[good] anyway)
export function monthlyNeed(house, good, tier = house.tier) {
  const use = isHousehold(good) ? useOf(tier || 0) : 1;
  const n = house.residents * GOODS[good].perResidentPerMonth;
  return use === 1 ? Math.ceil(n) : Math.ceil(Math.round(n * use * 1e6) / 1e6);
}

const foodOnHand = (house) => FOOD_GOODS.reduce((s, g) => s + (house.stock[g] || 0), 0);

// ── Version 8.4, Track G (design 2c, ruling 1468): the luxuries, one pool as the foods are ──
// The luxuries in the order a home takes and uses them: the cheapest by GOOD_VALUE first (incense, cedar, ivory), so the dearest is kept longest.
// Version 8.4 fix wave (ruling 1535): incense goes last whatever it is worth, so a home spends cedar and ivory first and the Opet festival's incense is not eaten.
export const LUXURY_ORDER = LUXURY_GOODS.slice().sort((a, b) => (a === INCENSE_GOOD) - (b === INCENSE_GOOD) || (GOOD_VALUE[a] || 0) - (GOOD_VALUE[b] || 0) || LUXURY_GOODS.indexOf(a) - LUXURY_GOODS.indexOf(b));
// The incense the stores keep back for the Opet festival (ruling 1535): its full festival takes EVENT_NUMBERS.opet.incense from the stores (cityEvents.js
// incenseReaches, CHOICES.opet), so the bazaars' top-up leaves that much while a working temple could be offered one.
const festivalIncense = (world) => (world.danger.festivalDay === null || world.day - world.danger.festivalDay >= FESTIVAL.every)
  && allBuildings(world).some((b) => b.type === 'temple' && isWorking(world, b)) ? EVENT_NUMBERS.opet.incense : 0;
// A home's luxuries in stock, of every kind.
export const luxuryOnHand = (house) => LUXURY_GOODS.reduce((s, g) => s + (house.stock[g] || 0), 0);
// A home's luxury need for a month at `tier`'s use (0.01 a resident x the use, rounded up per home: a Villa of 150 uses 3, an Estate of 180 uses 4).
export const luxuryNeed = (house, tier = house.tier) => monthlyNeed(house, luxuryRateGood(), tier);
// The luxury whose rate stands for them all (every luxury has the same): the first GOODS still has (a 7.0 test takes incense away for a while).
export const luxuryRateGood = () => LUXURY_GOODS.find((g) => GOODS[g]) || 'cedar';
// Whether a home at `tier` wants a luxury: its own or its next tier needs one (a Fine manor stocks for the Villa it grows into).
const wantsLuxury = (tier) => tier >= 1 && TIERS[Math.min(tier + 1, MAX_TIER)].needs.includes('luxury');

// Each working bazaar tops up every good it sells to its stock level for that good (data: bazaar.stock), from the
// stores within its supply reach that hold the good, nearest first (spec 4.10).
// Version 8.4: the luxuries only while some home in the city wants one, so a city with no Fine manor keeps its incense in its stores for festivals.
export function restockBazaars(world) {
  const luxuries = housesOf(world).some((h) => wantsLuxury(h.tier));
  for (const bz of allBuildings(world)) {
    const def = BUILDINGS[bz.type];
    if (!def.sells || !isWorking(world, bz)) continue;
    for (const good of def.sells) {
      if (!luxuries && LUXURY_GOODS.includes(good)) continue;
      let need = (def.stock[good] || 0) - (bz.store[good] || 0);
      if (need <= 0) continue;
      if (good === INCENSE_GOOD) {   // what the stores hold beyond the festival's incense, in the whole city
        const held = allBuildings(world).reduce((n, o) => n + ((BUILDINGS[o.type].stores || []).includes(good) ? o.store[good] || 0 : 0), 0);
        need = Math.min(need, held - festivalIncense(world));
        if (need <= 0) continue;
      }
      const sources = buildingsInReach(world, bz, def.supplyReach,
        (o) => (BUILDINGS[o.type].stores || []).includes(good) && (o.store[good] || 0) > 0);
      for (const { b: src } of sources) {
        const take = Math.min(need, src.store[good]);
        src.store[good] -= take;
        bz.store[good] = (bz.store[good] || 0) + take;
        need -= take;
        if (need <= 0) break;
      }
    }
  }
}

export function bazaarsByHouse(world) {
  const map = new Map();
  const houses = housesOf(world);
  for (const bz of allBuildings(world)) {
    const def = BUILDINGS[bz.type];
    if (!def.sells || !isWorking(world, bz)) continue;
    const rm = roadReach(world, bz, def.reach);
    for (const h of houses) {
      const d = reachDistance(rm, world, h);
      if (d > def.reach) continue;
      if (!map.has(h.id)) map.set(h.id, []);
      map.get(h.id).push({ b: bz, dist: d });
    }
  }
  for (const list of map.values()) list.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return map;
}

// Moves up to n of a good from the bazaars (nearest first) into the home's stock; returns how many moved.
function takeFrom(bazaars, house, good, n) {
  if (n <= 0) return 0;
  let left = n;
  for (const { b: bz } of bazaars || []) {
    if (left <= 0) break;
    const take = Math.min(left, bz.store[good] || 0);
    if (take > 0) {
      bz.store[good] -= take;
      house.stock[good] = (house.stock[good] || 0) + take;
      left -= take;
    }
  }
  return n - left;
}

const heldBy = (bazaars, good) => (bazaars || []).reduce((s, { b }) => s + (b.store[good] || 0), 0);

// Tops a home up to one month of each good in `goods` from the bazaars reaching it, nearest first (spec 4.10).
// Foods share one month's need, met by any mix, and topping up never takes the food on hand past that need. A home
// that wants two foods (twoFoods) first takes each food up to half the need (rounded up), then fills what is still
// short from whichever food is there, grain first. Any other home fills its need from the food its bazaars hold
// most of (ties go to grain), then from the other, so a surplus of one food is eaten down rather than left to fill
// the stores. Each household good is topped up to its own month's need.
// Stage 4.7 (ruling 471): a home that wants three kinds of food (kinds: 3) takes each food up to a third of the need first; `tier` is the
// tier whose use the household goods are topped up for (a home growing into a Villa stocks for one).
export function topUpHouse(world, house, goods, bazaars, { twoFoods = false, kinds = twoFoods ? 2 : 1, tier = house.tier } = {}) {
  let foods = goods.filter((g) => FOOD_GOODS.includes(g));
  if (foods.length) {
    const need = monthlyNeed(house, FOOD_GOODS[0]);
    if (kinds > 1) {
      const part = Math.ceil(need / kinds);
      for (const g of foods) takeFrom(bazaars, house, g, Math.min(part - (house.stock[g] || 0), need - foodOnHand(house)));
    } else {
      foods = foods.slice().sort((a, b) => heldBy(bazaars, b) - heldBy(bazaars, a));   // stable: ties keep grain first
    }
    let gap = need - foodOnHand(house);
    for (const g of foods) gap -= takeFrom(bazaars, house, g, gap);
  }
  for (const good of goods) {
    if (!FOOD_GOODS.includes(good) && !LUXURY_GOODS.includes(good)) takeFrom(bazaars, house, good, monthlyNeed(house, good, Math.max(tier, house.tier)) - (house.stock[good] || 0));
  }
  // Version 8.4 (ruling 1468): the luxuries share one month's need (at the tier it stocks for), met by any mix, the cheapest the bazaars hold first.
  const luxuries = LUXURY_ORDER.filter((g) => goods.includes(g));
  if (luxuries.length) {
    let gap = luxuryNeed(house, Math.max(tier, house.tier)) - luxuryOnHand(house);
    for (const g of luxuries) gap -= takeFrom(bazaars, house, g, gap);
  }
}
