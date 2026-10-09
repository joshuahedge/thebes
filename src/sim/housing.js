import { TIERS, MAX_TIER, LEAVE_CAP, DOWNGRADE_AFTER_MONTHS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { touchesRoad, roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';
import { bazaarsByHouse, topUpHouse, monthlyNeed } from './distribution.js';

export const needsOf = (tier) => (tier >= 1 && tier <= MAX_TIER ? TIERS[tier].needs : []);

export function wantedNeeds(house) {
  const out = [...needsOf(house.tier)];
  for (const n of needsOf(Math.min(house.tier + 1, MAX_TIER))) if (!out.includes(n)) out.push(n);
  return out;
}

export const wantedGoods = (house) => (wantedNeeds(house).includes('food') ? FOOD_GOODS.slice() : []);

// True if any working building that provides `need` reaches the house along the roads.
// The one rule for water and religion coverage: the monthly tick and the house checklist both use it.
export function coveredBy(world, house, need) {
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (def.provides !== need || !isWorking(world, b)) continue;
    if (reachDistance(roadReach(world, b, def.reach), world, house) <= def.reach) return true;
  }
  return false;
}

export function computeCoverage(world) {
  const cov = { water: new Set(), religion: new Set() };
  for (const h of housesOf(world)) {
    for (const need of Object.keys(cov)) if (coveredBy(world, h, need)) cov[need].add(h.id);
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
    house.met = {};
    house.stockedFor = 0;
  }
}

// Most residents who can leave in one month: a quarter, but at least one so tiny houses can still empty.
export function leaveCap(house) {
  return Math.max(1, Math.floor(house.residents * LEAVE_CAP));
}

const foodOnHand = (house) => FOOD_GOODS.reduce((s, g) => s + (house.stock[g] || 0), 0);

// A house is judged on the residents it was stocked for: newcomers who arrived since the last delivery
// eat from the household's stock (so it may run out early) but do not make the house count as unfed.
// stockedFor 0 means no delivery has been recorded yet, so the house is judged on its current residents.
const foodNeedToMeet = (house) =>
  monthlyNeed({ residents: Math.min(house.residents, house.stockedFor || house.residents) }, FOOD_GOODS[0]);

function consumeFood(house) {
  const needAll = monthlyNeed(house, FOOD_GOODS[0]);
  if (needAll === 0) return false;
  const needMet = foodNeedToMeet(house);
  const available = foodOnHand(house);
  let need = needAll;
  for (const g of FOOD_GOODS) {
    const take = Math.min(need, house.stock[g] || 0);
    house.stock[g] = (house.stock[g] || 0) - take;
    need -= take;
  }
  return needMet > 0 && available >= needMet;
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
    h.stockedFor = h.residents;

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
    leave = Math.min(leave, leaveCap(h));
    if (leave > 0) removeResidents(h, leave);
  }
}

// The checklist is judged live from the world as it is now, not from the snapshot the last monthly tick
// stored in house.met, so a plot beside a road or a brand-new hut is never shown as missing what it has.
// Only the downgrade countdown is timer-based.
function liveNeeds(world, house) {
  const foodNeed = foodNeedToMeet(house);
  return {
    road: touchesRoad(world, house),
    water: coveredBy(world, house, 'water'),
    religion: coveredBy(world, house, 'religion'),
    food: foodNeed > 0 && foodOnHand(house) >= foodNeed,
  };
}

export function houseStatus(world, house) {
  const tier = house.tier;
  const info = tier >= 1 ? TIERS[tier] : null;
  const next = tier + 1 <= MAX_TIER ? { tier: tier + 1, name: TIERS[tier + 1].name } : null;
  const met = liveNeeds(world, house);
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
    downgradeIn: tier > 1 && house.downTimer > 0 ? DOWNGRADE_AFTER_MONTHS - house.downTimer : null,
  };
}
