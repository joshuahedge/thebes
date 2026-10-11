import { TIERS, MAX_TIER, LEAVE_CAP, DOWNGRADE_AFTER_MONTHS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { touchesRoad, roadReach, reachDistance, buildingsInReach } from './reach.js';
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

// How many housing plots (any tier, empty ones too) a service of this type placed at (x, y) would reach along
// the roads: the coveredBy rule applied to a building that is not there yet (early-game pass 2.6).
export function homesServedFrom(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def || !def.reach) return 0;
  const reach = roadReach(world, { x, y, w: def.w, d: def.d }, def.reach);
  let n = 0;
  for (const h of housesOf(world)) if (reachDistance(reach, world, h) <= def.reach) n++;
  return n;
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

export function monthlyHousing(world, events = null) {
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
      if (next <= MAX_TIER && needsOf(next).every((n) => met[n])) {
        if (events) events.push({ type: 'upgrade', id: h.id, from: h.tier, to: next });
        h.tier = next;
        world.tally.upgrades += 1;
      }
    } else {
      h.downTimer++;
      if (h.downTimer >= DOWNGRADE_AFTER_MONTHS) {
        if (h.tier > 1) {
          if (events) events.push({ type: 'downgrade', id: h.id, from: h.tier, to: h.tier - 1 });
          h.tier--;
        }
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

// Why a home lacks a need (early-game pass 2.10), judged by the same live rules as the checklist: null when it
// has the need (or the need is unknown), else { code, id }. A home that touches no road blames the road for
// every need, since nothing can reach it without one. Providers (a well, a bazaar, a temple) are looked for in
// reach whether or not they work, so a paused or unstaffed one is named (well_idle, bazaar_idle, temple_idle,
// id the building) rather than answered with "build another"; no_well, no_bazaar and no_temple mean nothing of
// that kind reaches the home at all. For food, a working bazaar in reach decides: one holding grain, or able to
// draw on a granary that holds some, means next_delivery (id the bazaar); else granary_empty (id the nearest
// working granary in its supply reach, which holds nothing), granary_idle (the same, but every such granary is
// paused or short of workers; id the nearest) or bazaar_empty (id the bazaar, no granary in reach at all).
// Before no_well, no_bazaar or no_temple: a provider of that kind that touches no road, within its reach of the home
// in a straight line, is named (well_no_road, bazaar_no_road, temple_no_road, id the nearest such), since it only
// needs a road, not a twin.
export function needCause(world, house, need) {
  const met = liveNeeds(world, house);
  if (!(need in met) || met[need]) return null;
  if (!met.road) return { code: 'no_road', id: null };
  if (need === 'water' || need === 'religion') {
    const matches = (def) => def.provides === need;
    const [near] = providersReaching(world, house, matches);
    const kind = need === 'water' ? 'well' : 'temple';
    if (near) return { code: `${kind}_idle`, id: near.id };
    const [roadless] = roadlessProvidersNear(world, house, matches);
    return roadless ? { code: `${kind}_no_road`, id: roadless.id } : { code: `no_${kind}`, id: null };
  }
  const reaching = providersReaching(world, house, (def) => def.sells);
  if (!reaching.length) {
    const [roadless] = roadlessProvidersNear(world, house, (def) => def.sells);
    return roadless ? { code: 'bazaar_no_road', id: roadless.id } : { code: 'no_bazaar', id: null };
  }
  const working = reaching.filter((bz) => isWorking(world, bz));
  if (!working.length) return { code: 'bazaar_idle', id: reaching[0].id };
  const supply = new Map(working.map((bz) => [bz.id, graneriesFor(world, bz)]));
  const holds = (b) => FOOD_GOODS.some((g) => (b.store[g] || 0) > 0);
  const coming = working.find((bz) => holds(bz) || supply.get(bz.id).some(holds));
  if (coming) return { code: 'next_delivery', id: coming.id };
  // Farms only fill working storage (storageFor), so an empty store that is paused or short of workers needs
  // resuming or staff, not a farm: granary_empty only when one of the bazaar's stores works.
  const live = working.find((bz) => supply.get(bz.id).some((o) => isWorking(world, o)));
  if (live) return { code: 'granary_empty', id: supply.get(live.id).find((o) => isWorking(world, o)).id };
  const bare = working.find((bz) => supply.get(bz.id).length);
  if (bare) return { code: 'granary_idle', id: supply.get(bare.id)[0].id };
  return { code: 'bazaar_empty', id: working[0].id };
}

// Buildings whose reach takes in the home and whose def passes `matches`, nearest first, working or not: the
// rule coveredBy and bazaarsByHouse use for reach, without their working test.
function providersReaching(world, house, matches) {
  const out = [];
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.reach || !matches(def)) continue;
    const dist = reachDistance(roadReach(world, b, def.reach), world, house);
    if (dist <= def.reach) out.push({ b, dist });
  }
  out.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return out.map((e) => e.b);
}

// Buildings whose def passes `matches`, that touch no road and whose footprint lies within their reach of the home's
// in a straight line (the gap between the two footprints, in tiles: 0 when they touch), nearest first.
function roadlessProvidersNear(world, house, matches) {
  const out = [];
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.reach || !matches(def) || touchesRoad(world, b)) continue;
    const dist = footprintGap(b, house);
    if (dist <= def.reach) out.push({ b, dist });
  }
  out.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return out.map((e) => e.b);
}

function footprintGap(a, b) {
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
  const dy = Math.max(0, a.y - (b.y + b.d), b.y - (a.y + a.d));
  return Math.hypot(dx, dy);
}

// The stores a bazaar draws its goods from (restockBazaars' rule): any store of what it sells within its supply
// reach, nearest first, holding goods or not.
function graneriesFor(world, bazaar) {
  const def = BUILDINGS[bazaar.type];
  return buildingsInReach(world, bazaar, def.supplyReach, (o) => (BUILDINGS[o.type].stores || []).some((g) => def.sells.includes(g))).map((e) => e.b);
}
