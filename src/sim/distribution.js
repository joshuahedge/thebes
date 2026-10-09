import { BUILDINGS } from '../data/buildings.js';
import { GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { buildingsInReach, roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';

export const monthlyNeed = (house, good) => Math.ceil(house.residents * GOODS[good].perResidentPerMonth);

export function restockBazaars(world) {
  for (const bz of allBuildings(world)) {
    const def = BUILDINGS[bz.type];
    if (!def.sells || !isWorking(world, bz)) continue;
    for (const good of def.sells) {
      let need = def.capacity - (bz.store[good] || 0);
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

export function topUpHouse(world, house, goods, bazaars) {
  for (const good of goods) {
    let need = monthlyNeed(house, good) - (house.stock[good] || 0);
    for (const { b: bz } of bazaars || []) {
      if (need <= 0) break;
      const take = Math.min(need, bz.store[good] || 0);
      if (take > 0) {
        bz.store[good] -= take;
        house.stock[good] = (house.stock[good] || 0) + take;
        need -= take;
      }
    }
  }
}
