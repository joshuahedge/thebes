import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { useOf } from '../data/housing.js';
import { allBuildings, housesOf } from './world.js';
import { buildingsInReach, roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';

// A home's use of a good in a month, rounded up per home (spec 4.10). Every food has the same rate, so a home's
// food need is monthlyNeed(house, FOOD_GOODS[0]) whatever mix of foods meets it. Stage 4.7 (ruling 471): a household good's rate is
// times the tier's use (useOf: 1.5 a Villa, 2 an Estate, else 1); `tier` (default the home's own) asks it for another tier, so a home
// can be judged and stocked for the tier it is growing into.
// (The product is rounded to a millionth before it is rounded up when a use applies, so 150 x 0.04 x 1.5 is 9, not 10; the plain rate keeps
// its old sum exactly, so no home below a Villa moves.)
const isHousehold = (good) => GOODS[good].kind === 'household';
export function monthlyNeed(house, good, tier = house.tier) {
  const use = isHousehold(good) ? useOf(tier || 0) : 1;
  const n = house.residents * GOODS[good].perResidentPerMonth;
  return use === 1 ? Math.ceil(n) : Math.ceil(Math.round(n * use * 1e6) / 1e6);
}

const foodOnHand = (house) => FOOD_GOODS.reduce((s, g) => s + (house.stock[g] || 0), 0);

// Each working bazaar tops up every good it sells to its stock level for that good (data: bazaar.stock), from the
// stores within its supply reach that hold the good, nearest first (spec 4.10).
export function restockBazaars(world) {
  for (const bz of allBuildings(world)) {
    const def = BUILDINGS[bz.type];
    if (!def.sells || !isWorking(world, bz)) continue;
    for (const good of def.sells) {
      let need = (def.stock[good] || 0) - (bz.store[good] || 0);
      if (need <= 0) continue;
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
    if (!FOOD_GOODS.includes(good)) takeFrom(bazaars, house, good, monthlyNeed(house, good, Math.max(tier, house.tier)) - (house.stock[good] || 0));
  }
}
