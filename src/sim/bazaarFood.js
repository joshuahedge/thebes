// Version 8.2.1 (rulings 1360-1366): the bazaar's food alert, raised only when it is true and given its cause. A player kept being told "Bazaar has
// no food: build a granary" with a granary right beside it: in 8.2 the alert fired whenever a working bazaar's shelf held no food, whatever the
// reason. alertsFor (src/sim/alerts.js) asks bazaarFoodProblem for every bazaar; the words are src/ui/text.js's, Show me src/ui/threatFix.js's.
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';
import { storeAccepts } from './production.js';
import { bazaarsByHouse, monthlyNeed } from './distribution.js';
import { graneriesFor, storesApart, wantedNeeds, foodShort } from './housing.js';

// What is wrong with a working bazaar that has no food on its shelf, for its alert; null when nothing is.
// The homes take their month the moment the bazaar restocks (runMonth: restockBazaars, then monthlyHousing), so a bazaar whose homes eat all it
// holds stands empty all month while every home is fed. So while a store in its supply reach holds food (restockBazaars takes from any, working or
// not) it is in trouble only when a home it serves (the home's nearest bazaar) holds less food than it eats at the month's end (consumeFood's rule:
// foodShort) and the next delivery (each food up to its stock level, from what the stores hold now) is less than its homes' month:
//   bazaar_sold_out { need, stock } when a food's shelf will be filled to its stock level (the shelf, not the store, runs short: a second bazaar);
//   bazaar_empty 'granary_low' { store, maker } when the stores hold less than the shelf would take.
// With no food in reach, bazaar_empty with reason 'granary_empty' { store, maker } (the nearest working store, empty), 'granary_idle' { store }
// (stores in reach, none working), 'granary_apart' { store } (one within its supply reach in a straight line that the roads do not bring within
// it), or no reason (no store near it at all: 8.2's alert, "build a granary"). maker says what fills the store (storeFillers): 'slow' (a maker
// works), 'idle' { makerId } (none works: the nearest) or 'none'. served() gives bazaarsByHouse's map (alertsFor asks it once for every bazaar).
export function bazaarFoodProblem(world, bz, served = () => bazaarsByHouse(world)) {
  const def = BUILDINGS[bz.type];
  if (!def.sells || !isWorking(world, bz) || FOOD_GOODS.some((g) => (bz.store[g] || 0) > 0)) return null;
  const stores = graneriesFor(world, bz);
  const foods = def.sells.filter((g) => FOOD_GOODS.includes(g));
  const held = (g) => stores.reduce((n, o) => n + (o.store[g] || 0), 0);
  if (foods.some((g) => held(g) > 0)) {
    const map = served();
    const homes = housesOf(world).filter((h) => {
      const list = map.get(h.id);
      return h.tier > 0 && list && list[0].b === bz && wantedNeeds(h).includes('food');
    });
    if (!homes.some(foodShort)) return null;
    const need = homes.reduce((n, h) => n + monthlyNeed(h, FOOD_GOODS[0]), 0);
    const stock = foods.reduce((n, g) => n + Math.min(def.stock[g] || 0, held(g)), 0);
    if (stock >= need) return null;
    if (foods.some((g) => def.stock[g] > 0 && held(g) >= def.stock[g])) return { code: 'bazaar_sold_out', id: bz.id, need, stock };
    const store = stores.find((o) => isWorking(world, o)) || stores[0];
    return { code: 'bazaar_empty', id: bz.id, reason: 'granary_low', store: store.id, ...fillOf(world, store) };
  }
  const live = stores.find((o) => isWorking(world, o));
  if (live) return { code: 'bazaar_empty', id: bz.id, reason: 'granary_empty', store: live.id, ...fillOf(world, live) };
  if (stores.length) return { code: 'bazaar_empty', id: bz.id, reason: 'granary_idle', store: stores[0].id };
  const [apart] = storesApart(world, bz);
  return apart ? { code: 'bazaar_empty', id: bz.id, reason: 'granary_apart', store: apart.id } : { code: 'bazaar_empty', id: bz.id };
}

// What fills a food store (bazaarFoodProblem's maker): a food maker whose made goods would go into it (produceDay's outputStores, from the maker's
// side: the store in the maker's producer reach by road, taking its good) and that works now ('slow': the store is still empty or low), else the
// nearest such maker ('idle': paused, short of workers or stopped), else 'none'.
function fillOf(world, store) {
  const makers = storeFillers(world, store);
  if (makers.some((m) => isWorking(world, m) && !m.blocked)) return { maker: 'slow' };
  return makers.length ? { maker: 'idle', makerId: makers[0].id } : { maker: 'none' };
}
function storeFillers(world, store) {
  const out = [];
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.produces || !FOOD_GOODS.includes(def.produces.good) || !storeAccepts(store, def.produces.good)) continue;
    const dist = reachDistance(roadReach(world, b, def.producerReach), world, store);
    if (dist <= def.producerReach) out.push({ b, dist });
  }
  out.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return out.map((e) => e.b);
}
