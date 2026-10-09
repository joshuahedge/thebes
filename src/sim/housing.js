import { TIERS, MAX_TIER, LEAVE_CAP, DOWNGRADE_AFTER_MONTHS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { touchesRoad, roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';
import { bazaarsByHouse, topUpHouse } from './distribution.js';

export const needsOf = (tier) => (tier >= 1 && tier <= MAX_TIER ? TIERS[tier].needs : []);

export function wantedNeeds(house) {
  const out = [...needsOf(house.tier)];
  for (const n of needsOf(Math.min(house.tier + 1, MAX_TIER))) if (!out.includes(n)) out.push(n);
  return out;
}

export const wantedGoods = (house) => (wantedNeeds(house).includes('food') ? FOOD_GOODS.slice() : []);

export function computeCoverage(world) {
  const cov = { water: new Set(), religion: new Set() };
  const houses = housesOf(world);
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.provides || !cov[def.provides] || !isWorking(world, b)) continue;
    const rm = roadReach(world, b, def.reach);
    for (const h of houses) if (reachDistance(rm, world, h) <= def.reach) cov[def.provides].add(h.id);
  }
  return cov;
}

export function removeResidents(house, n) {
  const k = Math.min(n, house.residents);
  house.residents -= k;
  house.leftThisMonth += k;
  if (house.residents <= 0) {
    house.residents = 0;
    house.tier = 0;
    house.stock = {};
    house.downTimer = 0;
  }
}

function consumeFood(house) {
  let need = Math.ceil(house.residents * GOODS[FOOD_GOODS[0]].perResidentPerMonth);
  if (need === 0) return false;
  for (const g of FOOD_GOODS) {
    const take = Math.min(need, house.stock[g] || 0);
    house.stock[g] = (house.stock[g] || 0) - take;
    need -= take;
  }
  return need === 0;
}

export function monthlyHousing(world) {
  const cov = computeCoverage(world);
  const bazaars = bazaarsByHouse(world);
  for (const h of housesOf(world)) {
    h.leftThisMonth = 0;
    if (h.tier === 0) continue;
    const met = {
      road: touchesRoad(world, h),
      water: cov.water.has(h.id),
      religion: cov.religion.has(h.id),
      food: wantedNeeds(h).includes('food') ? consumeFood(h) : false,
    };
    h.met = met;
    topUpHouse(world, h, wantedGoods(h), bazaars.get(h.id));

    const currentOk = met.road && needsOf(h.tier).every((n) => met[n]);
    if (currentOk) {
      h.downTimer = 0;
      const next = h.tier + 1;
      if (next <= MAX_TIER && needsOf(next).every((n) => met[n])) h.tier = next;
    } else {
      h.downTimer++;
      if (h.downTimer >= DOWNGRADE_AFTER_MONTHS) {
        if (h.tier > 1) h.tier--;
        h.downTimer = 0;
      }
    }

    const cap = TIERS[h.tier].capacity;
    let leave = met.road ? Math.max(0, h.residents - cap) : h.residents;
    leave = Math.min(leave, Math.ceil(h.residents * LEAVE_CAP));
    if (leave > 0) removeResidents(h, leave);
  }
}

export function houseStatus(world, house) {
  const tier = house.tier;
  const info = tier >= 1 ? TIERS[tier] : null;
  const next = tier + 1 <= MAX_TIER ? { tier: tier + 1, name: TIERS[tier + 1].name } : null;
  const met = house.met || {};
  const checklistNeeds = ['road', ...needsOf(next ? next.tier : tier)];
  const checklist = checklistNeeds.map((need) => ({ need, met: Boolean(met[need]) }));
  const missingNow = tier >= 1 ? ['road', ...needsOf(tier)].filter((n) => !met[n]) : [];
  return {
    tier,
    name: info ? info.name : 'Empty plot',
    residents: house.residents,
    capacity: info ? info.capacity : TIERS[1].capacity,
    next,
    checklist,
    missingNow,
    downgradeIn: house.downTimer > 0 ? DOWNGRADE_AFTER_MONTHS - house.downTimer : null,
  };
}
