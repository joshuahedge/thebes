import { TIERS, MAX_TIER, LEAVE_CAP, DOWNGRADE_AFTER_MONTHS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS, FOOD_SLOTS, HOUSEHOLD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { touchesRoad, roadReach, reachDistance, buildingsInReach } from './reach.js';
import { isWorking } from './labour.js';
import { desirabilityField, houseDesirability } from './desirability.js';
import { MERGE_TIER, mergeSquare, mergeHouses, splitHouse } from './merge.js';
import { computeCoverage as computeCoverageByReach } from './coverage.js';
import { bazaarsByHouse, topUpHouse, monthlyNeed } from './distribution.js';

export const needsOf = (tier) => (tier >= 1 && tier <= MAX_TIER ? TIERS[tier].needs : []);

export function wantedNeeds(house) {
  const out = [...needsOf(house.tier)];
  for (const n of needsOf(Math.min(house.tier + 1, MAX_TIER))) if (!out.includes(n)) out.push(n);
  return out;
}

// The goods a home tops up at the bazaar (spec 4.10): every food once its current or next tier needs food, and each
// household good (pottery, beer, linen, jewellery) that its current or next tier needs.
export function wantedGoods(house) {
  const wants = wantedNeeds(house);
  return [...(wants.includes('food') ? FOOD_GOODS : []), ...HOUSEHOLD_GOODS.filter((g) => wants.includes(g))];
}

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

// The month's coverage of every home (the coveredBy rule for all of them at once): worked from the providers' road reach, src/sim/coverage.js
// (Stage 4.6, ruling 410), so the month end no longer asks every building about every home.
export const computeCoverage = computeCoverageByReach;

// How many housing plots (any tier, empty ones too) a service of this type placed at (x, y) would reach along
// the roads: the coveredBy rule applied to a building that is not there yet (early-game pass 2.6). Uncached, so a
// ghost moved tile by tile leaves nothing behind in the reach cache.
export function homesServedFrom(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def || !def.reach) return 0;
  const reach = roadReach(world, { x, y, w: def.w, d: def.d }, def.reach, { cache: false });
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
// How many kinds of food a home has in stock (Stage 4.6, ruling 363): two kinds meet the 'twoFoods' need, whichever two.
const foodKinds = (house) => FOOD_GOODS.filter((g) => (house.stock[g] || 0) > 0).length;

// A house is judged on the residents it was stocked for: newcomers who arrived since the last delivery
// eat from the household's stock (so it may run out early) but do not make the house count as unfed.
// stockedFor 0 means no delivery has been recorded yet, so the house is judged on its current residents.
const needToMeet = (house, good) =>
  monthlyNeed({ residents: Math.min(house.residents, house.stockedFor || house.residents) }, good);
const foodNeedToMeet = (house) => needToMeet(house, FOOD_GOODS[0]);

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

// A household good is met when the stock covers the month's use at the monthly check (spec 4.10), judged like food
// on the residents it was stocked for; the month's use is then taken from the stock.
function consumeGood(house, good) {
  const needMet = needToMeet(house, good);
  const available = house.stock[good] || 0;
  house.stock[good] = available - Math.min(available, monthlyNeed(house, good));
  return needMet > 0 && available >= needMet;
}

export function monthlyHousing(world, events = null) {
  const cov = computeCoverage(world);
  const bazaars = bazaarsByHouse(world);
  const field = desirabilityField(world);   // every home is judged on the street as it stood when the month ended
  for (const h of housesOf(world)) {
    if (world.buildings[h.id] !== h) continue;   // merged into a neighbour's Manor earlier in this check
    h.leftThisMonth = 0;
    if (h.tier === 0) continue;
    const wants = wantedNeeds(h);
    const met = {
      road: touchesRoad(world, h),
      water: cov.water.has(h.id),
      religion: cov.religion.has(h.id),
      entertainment: cov.entertainment.has(h.id),
      twoFoods: foodKinds(h) >= 2,   // two kinds of food in stock before the month's eating (Stage 4.6, ruling 363: any two of grain, figs, game, fish)
      food: wants.includes('food') ? consumeFood(h) : false,
    };
    for (const g of HOUSEHOLD_GOODS) if (wants.includes(g)) met[g] = consumeGood(h, g);
    h.met = met;
    topUpHouse(world, h, wantedGoods(h), bazaars.get(h.id), { twoFoods: wants.includes('twoFoods') });
    h.stockedFor = h.residents;

    // Tiers 6-9 also want a pleasant street (spec 4.6): rising needs the next tier's "to rise" desirability and
    // holding needs the tier's "to keep" value; between the two a home neither rises nor falls. Below "to keep"
    // starts the countdown like an unmet need. Read only for homes where a value applies, from the month's field.
    const keep = keepOf(h.tier);
    const next = h.tier + 1;
    const rise = riseOf(next);
    const value = keep !== null || rise !== null ? houseDesirability(world, h, field) : 0;
    const currentOk = met.road && needsOf(h.tier).every((n) => met[n]) && (keep === null || value >= keep);
    let home = h;
    if (currentOk) {
      h.downTimer = 0;
      if (next <= MAX_TIER && needsOf(next).every((n) => met[n]) && (rise === null || value >= rise)) {
        if (TIERS[next].size > h.w) {
          // A Townhouse becomes a Manor only by joining a 2x2 square (spec 4.6); with no square it waits.
          const origin = mergeSquare(world, h);
          if (origin) {
            home = mergeHouses(world, h, origin);
            if (events) events.push({ type: 'merge', id: home.id }, { type: 'upgrade', id: home.id, from: next - 1, to: next });
            world.tally.upgrades += 1;
          }
        } else {
          if (events) events.push({ type: 'upgrade', id: h.id, from: h.tier, to: next });
          h.tier = next;
          world.tally.upgrades += 1;
        }
      }
    } else {
      h.downTimer++;
      if (h.downTimer >= DOWNGRADE_AFTER_MONTHS) {
        h.downTimer = 0;
        if (h.tier > 1) {
          if (events) events.push({ type: 'downgrade', id: h.id, from: h.tier, to: h.tier - 1 });
          if (TIERS[h.tier - 1].size < h.w) {
            // A Manor that drops a tier splits back into four Townhouses, residents shared out (spec 4.6).
            splitHouse(world, h);
            if (events) events.push({ type: 'split', id: h.id });
            continue;
          }
          h.tier--;
        }
      }
    }

    const cap = TIERS[home.tier].capacity;
    let leave = met.road ? Math.max(0, home.residents - cap) : home.residents;
    leave = Math.min(leave, leaveCap(home));
    if (leave > 0) removeResidents(home, leave);
    if (home.residents === 0 && home.w > 1) splitHouse(world, home);   // an emptied 2x2 home becomes four empty plots
  }
}

// The desirability a tier asks for: "to rise" into it, "to keep" it (spec 4.6); null where it asks for none.
const riseOf = (tier) => (tier >= 1 && tier <= MAX_TIER && TIERS[tier].desirability ? TIERS[tier].desirability.rise : null);
const keepOf = (tier) => (tier >= 1 && tier <= MAX_TIER && TIERS[tier].desirability ? TIERS[tier].desirability.keep : null);

// The value the checklist's desirability row measures against: the next tier's "to rise", or for the top tier
// its own "to keep"; null for homes whose next tier asks for none (tiers 0-4).
export function desirabilityTarget(tier) {
  if (tier + 1 <= MAX_TIER) return riseOf(tier + 1);
  return keepOf(tier);
}

// The checklist is judged live from the world as it is now, not from the snapshot the last monthly tick
// stored in house.met, so a plot beside a road or a brand-new hut is never shown as missing what it has.
// Only the downgrade countdown is timer-based. Household goods count as met while the stock covers the month's
// use (the monthly check's rule); two kinds of food means any two of the foods are in stock (Stage 4.6, ruling 363). desirability is
// there only for homes whose checklist has the row; merge is false only for a Townhouse with no square to join.
function liveNeeds(world, house) {
  const foodNeed = needToMeet(house, FOOD_GOODS[0]);
  const met = {
    road: touchesRoad(world, house),
    water: coveredBy(world, house, 'water'),
    religion: coveredBy(world, house, 'religion'),
    entertainment: coveredBy(world, house, 'entertainment'),
    food: foodNeed > 0 && foodOnHand(house) >= foodNeed,
    twoFoods: foodKinds(house) >= 2,
  };
  for (const good of HOUSEHOLD_GOODS) {
    const n = needToMeet(house, good);
    met[good] = n > 0 && (house.stock[good] || 0) >= n;
  }
  const target = desirabilityTarget(house.tier);
  if (target !== null) met.desirability = houseDesirability(world, house) >= target;
  met.merge = house.tier !== MERGE_TIER - 1 || mergeSquare(world, house) !== null;
  return met;
}

// What the house sheet shows (spec 6.3): the next tier's checklist, with a desirability row { need: 'desirability',
// met, value, target, keep } from the Townhouse up (keep is the home's own "to keep" value, null for a Townhouse);
// what the home is missing now (with 'desirability' when it is below "to keep"); the countdown; and for a
// Townhouse whether it needs a 2x2 square to grow and whether one can form.
export function houseStatus(world, house) {
  const tier = house.tier;
  const info = tier >= 1 ? TIERS[tier] : null;
  const next = tier + 1 <= MAX_TIER ? { tier: tier + 1, name: TIERS[tier + 1].name } : null;
  const met = liveNeeds(world, house);
  const checklistNeeds = ['road', ...needsOf(next ? next.tier : tier)];
  const checklist = checklistNeeds.map((need) => ({ need, met: Boolean(met[need]) }));
  const target = desirabilityTarget(tier);
  const keep = keepOf(tier);
  const value = target !== null || keep !== null ? houseDesirability(world, house) : null;
  if (target !== null) checklist.push({ need: 'desirability', met: met.desirability, value, target, keep });
  const missingNow = tier >= 1 ? ['road', ...needsOf(tier)].filter((n) => !met[n]) : [];
  if (keep !== null && value < keep) missingNow.push('desirability');
  const mergeNeeded = tier === MERGE_TIER - 1;
  return {
    tier,
    name: info ? info.name : 'Empty plot',
    residents: house.residents,
    capacity: info ? info.capacity : TIERS[1].capacity,
    next,
    checklist,
    missingNow,
    downgradeIn: tier > 1 && house.downTimer > 0 ? DOWNGRADE_AFTER_MONTHS - house.downTimer : null,
    merge: { needed: mergeNeeded, ready: mergeNeeded && met.merge },
  };
}

// Why a home lacks a need (early-game pass 2.10), judged by the same live rules as the checklist: null when it
// has the need (or the need is unknown), else { code, id, ... }. A home that touches no road blames the road for
// every need that comes along the roads, since nothing can reach it without one. Providers (a well, a temple, a
// booth, a bazaar) are looked for in reach whether or not they work, so a paused or unstaffed one is named
// (well_idle, temple_idle, booth_idle, bazaar_idle, id the building) rather than answered with "build another";
// no_well, no_temple, no_booth and no_bazaar mean nothing of that kind reaches the home at all. Before those, a
// provider of that kind that touches no road, within its reach of the home in a straight line, is named
// (well_no_road, temple_no_road, booth_no_road, bazaar_no_road, id the nearest such), since it only needs a road.
// For food, a working bazaar in reach decides: one holding food, or able to draw on a granary that holds some,
// means next_delivery (id the bazaar); else granary_empty (id the nearest working granary in its supply reach,
// which holds nothing), granary_idle (the same, but every such granary is paused or short of workers; id the
// nearest) or bazaar_empty (id the bazaar, no granary in reach at all).
// For a household good (pottery, beer, linen, jewellery) and for two kinds of food (traced through the first food
// the home has none of), the same bazaar steps, then: next_delivery { good } when a working bazaar in reach has the
// good or a store within its supply reach holds some (the bazaar restocks at the month's end); good_unmade { good,
// id: bazaar } when stores for the good lie in that reach but none holds any; no_good { good, id: bazaar } when no
// store for the good lies in that reach at all.
// Desirability below the row's target is low_desirability { value, target }; a Townhouse with no 2x2 square to
// join lacks 'merge' with no_square. Neither depends on the road.
const PROVIDER_KIND = { water: 'well', religion: 'temple', entertainment: 'booth' };

export function needCause(world, house, need) {
  const met = liveNeeds(world, house);
  if (!(need in met) || met[need]) return null;
  if (need === 'desirability') return { code: 'low_desirability', id: null, value: houseDesirability(world, house), target: desirabilityTarget(house.tier) };
  if (need === 'merge') return { code: 'no_square', id: null };
  if (!met.road) return { code: 'no_road', id: null };
  const kind = PROVIDER_KIND[need];
  if (kind) {
    const matches = (def) => def.provides === need;
    const [near] = providersReaching(world, house, matches);
    if (near) return { code: `${kind}_idle`, id: near.id };
    const [roadless] = roadlessProvidersNear(world, house, matches);
    return roadless ? { code: `${kind}_no_road`, id: roadless.id } : { code: `no_${kind}`, id: null };
  }
  if (need === 'food') return foodCause(world, house);
  if (need === 'twoFoods') return twoFoodsCause(world, house);
  return goodCause(world, house, need);
}

// The bazaars reaching the home that sell `good` (any of FOOD_GOODS for food): no_bazaar, bazaar_no_road or
// bazaar_idle when none of them can serve it, else the working ones, nearest first.
function bazaarsFor(world, house, goods) {
  const sells = (def) => (def.sells || []).some((g) => goods.includes(g));
  const reaching = providersReaching(world, house, sells);
  if (!reaching.length) {
    const [roadless] = roadlessProvidersNear(world, house, sells);
    return { cause: roadless ? { code: 'bazaar_no_road', id: roadless.id } : { code: 'no_bazaar', id: null } };
  }
  const working = reaching.filter((bz) => isWorking(world, bz));
  if (!working.length) return { cause: { code: 'bazaar_idle', id: reaching[0].id } };
  return { working };
}

function foodCause(world, house) {
  const { cause, working } = bazaarsFor(world, house, FOOD_GOODS);
  if (cause) return cause;
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

// The second food a home lacks (Stage 4.6, ruling 363): of the foods it has none of (in FOOD_SLOTS order: grain, figs, game, fish), the first
// one whose delivery is on its way, else the first one in order, so the words name the food the player can most easily bring.
function twoFoodsCause(world, house) {
  const missing = FOOD_SLOTS.filter((g) => FOOD_GOODS.includes(g) && !((house.stock[g] || 0) > 0));
  const causes = missing.map((g) => goodCause(world, house, g));
  return causes.find((c) => c.code === 'next_delivery') || causes[0];
}

function goodCause(world, house, good) {
  const { cause, working } = bazaarsFor(world, house, [good]);
  if (cause) return cause;
  const holds = (b) => (b.store[good] || 0) > 0;
  const coming = working.find((bz) => holds(bz) || goodStoresFor(world, bz, good).some(holds));
  if (coming) return { code: 'next_delivery', id: coming.id, good };
  const kept = working.find((bz) => goodStoresFor(world, bz, good).length);
  if (kept) return { code: 'good_unmade', good, id: kept.id };
  return { code: 'no_good', good, id: working[0].id };
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

// The stores a bazaar draws its food from (restockBazaars' rule): any store of a food it sells within its supply
// reach, nearest first, holding food or not. A storehouse holds no food, so it is never named for an empty granary.
function graneriesFor(world, bazaar) {
  const def = BUILDINGS[bazaar.type];
  const foods = def.sells.filter((g) => FOOD_GOODS.includes(g));
  return buildingsInReach(world, bazaar, def.supplyReach, (o) => (BUILDINGS[o.type].stores || []).some((g) => foods.includes(g))).map((e) => e.b);
}

// The stores a bazaar draws one good from (restockBazaars' rule): any store of that good within its supply reach,
// nearest first, holding it or not. Household goods and the second food are traced through these.
function goodStoresFor(world, bazaar, good) {
  const def = BUILDINGS[bazaar.type];
  return buildingsInReach(world, bazaar, def.supplyReach, (o) => (BUILDINGS[o.type].stores || []).includes(good)).map((e) => e.b);
}
