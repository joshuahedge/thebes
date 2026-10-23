import { TIERS, MAX_TIER, LEAVE_CAP, DOWNGRADE_AFTER_MONTHS, useOf } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS, FOOD_SLOTS, HOUSEHOLD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { touchesRoad, roadReach, reachDistance, buildingsInReach } from './reach.js';
import { isWorking } from './labour.js';
import { desirabilityField, houseDesirability } from './desirability.js';
import { splitHouse } from './merge.js';
import { LARGE_PLOT } from '../data/largePlots.js';
import { isLargePlot, isLot, isSmallTop, noteLargePlotUnlock } from './largePlots.js';
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

// How many people a home holds. Version 6.0 (Track C, ruling 704): a Large plot below a Manor holds as many as the four plots it stands in for would (a Manor that
// falls back keeps its people, as one that split into four Townhouses did); an empty one is judged at the Manor it opens as, any other empty plot at a Hut.
export function capacityOf(house) {
  if (house.tier >= 1) return TIERS[house.tier].capacity * (isLargePlot(house) && house.tier < LARGE_PLOT.opensTier ? LARGE_PLOT.size * LARGE_PLOT.size : 1);
  return isLot(house) ? TIERS[LARGE_PLOT.opensTier].capacity : TIERS[1].capacity;
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
// How many kinds of food a home has in stock (Stage 4.6, ruling 363): two kinds meet the 'twoFoods' need, whichever two; Stage 4.7 (ruling
// 471): three kinds meet the top two tiers' 'threeFoods'.
export const foodKinds = (house) => FOOD_GOODS.filter((g) => (house.stock[g] || 0) > 0).length;
// The kinds of food a home's wants ask for: 3 (threeFoods), 2 (twoFoods) or 1.
const kindsWanted = (wants) => (wants.includes('threeFoods') ? 3 : wants.includes('twoFoods') ? 2 : 1);
// The tier a home is stocked and judged for: the next one (a home stocks for the tier it grows into), the top tier its own.
const growingInto = (house) => Math.min(house.tier + 1, MAX_TIER);

// A house is judged on the residents it was stocked for: newcomers who arrived since the last delivery
// eat from the household's stock (so it may run out early) but do not make the house count as unfed.
// stockedFor 0 means no delivery has been recorded yet, so the house is judged on its current residents.
// Stage 4.7 (ruling 471): at the tier's own use of household goods, or at `tier`'s (the next tier's, for growing into it).
const needToMeet = (house, good, tier = house.tier) =>
  monthlyNeed({ residents: Math.min(house.residents, house.stockedFor || house.residents) }, good, tier);
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
// Stage 4.7 (ruling 471): also whether the stock would meet the next tier's use (`next`), which is what growing into it asks.
function consumeGood(house, good) {
  const needMet = needToMeet(house, good);
  const needNext = needToMeet(house, good, growingInto(house));
  const available = house.stock[good] || 0;
  house.stock[good] = available - Math.min(available, monthlyNeed(house, good));
  return { met: needMet > 0 && available >= needMet, next: needNext > 0 && available >= needNext };
}

export function monthlyHousing(world, events = null) {
  noteLargePlotUnlock(world);   // Version 6.0 (Track C): the Large plot card comes with the first Townhouse and stays
  const cov = computeCoverage(world);
  const bazaars = bazaarsByHouse(world);
  const field = desirabilityField(world);   // every home is judged on the street as it stood when the month ended
  for (const h of housesOf(world)) {
    if (world.buildings[h.id] !== h) continue;   // split into plots earlier in this check
    h.leftThisMonth = 0;
    if (h.tier === 0) continue;
    const wants = wantedNeeds(h);
    const met = {
      road: touchesRoad(world, h),
      water: cov.water.has(h.id),
      religion: cov.religion.has(h.id),
      entertainment: cov.entertainment.has(h.id),
      twoFoods: foodKinds(h) >= 2,   // two kinds of food in stock before the month's eating (Stage 4.6, ruling 363: any two of grain, figs, game, fish)
      threeFoods: foodKinds(h) >= 3,   // Stage 4.7 (ruling 471): three kinds, for a Villa and an Estate
      food: wants.includes('food') ? consumeFood(h) : false,
    };
    const metNext = {};   // household goods at the next tier's use (ruling 471): what growing into it asks
    for (const g of HOUSEHOLD_GOODS) if (wants.includes(g)) { const r = consumeGood(h, g); met[g] = r.met; metNext[g] = r.next; }
    h.met = met;
    topUpHouse(world, h, wantedGoods(h), bazaars.get(h.id), { kinds: kindsWanted(wants), tier: growingInto(h) });
    h.stockedFor = h.residents;

    // Tiers 6-9 also want a pleasant street (spec 4.6): rising needs the next tier's "to rise" desirability and
    // holding needs the tier's "to keep" value; between the two a home neither rises nor falls. Below "to keep"
    // starts the countdown like an unmet need. Read only for homes where a value applies, from the month's field.
    // Version 6.0 (Track C, ruling 616): a small plot stops at Townhouse (isSmallTop): it rises no further and no longer merges with the plots beside it;
    // a grand home grows on a Large plot, where a Manor opens (the lot, below) and climbs in place. Homes merged under the old rule rise and fall as before.
    const capped = isSmallTop(h);
    const keep = keepOf(h.tier);
    const next = h.tier + 1;
    const rise = riseOf(next);
    const value = keep !== null || (rise !== null && !capped) ? houseDesirability(world, h, field) : 0;
    const currentOk = met.road && needsOf(h.tier).every((n) => met[n]) && (keep === null || value >= keep);
    let home = h;
    if (currentOk) {
      h.downTimer = 0;
      if (!capped && next <= MAX_TIER && needsOf(next).every((n) => (n in metNext ? metNext[n] : met[n])) && (rise === null || value >= rise)) {
        if (events) events.push({ type: 'upgrade', id: h.id, from: h.tier, to: next });
        h.tier = next;
        world.tally.upgrades += 1;
      }
    } else {
      h.downTimer++;
      if (h.downTimer >= DOWNGRADE_AFTER_MONTHS) {
        h.downTimer = 0;
        if (h.tier > 1) {
          if (events) events.push({ type: 'downgrade', id: h.id, from: h.tier, to: h.tier - 1 });
          if (!isLargePlot(h) && TIERS[h.tier - 1].size < h.w) {
            // A merged Manor that drops a tier splits back into four Townhouses, residents shared out (spec 4.6). A Large plot never splits: it keeps its lot.
            splitHouse(world, h);
            if (events) events.push({ type: 'split', id: h.id });
            continue;
          }
          h.tier--;
        }
      }
    }

    const cap = capacityOf(home);
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
// Stage 4.7 (ruling 471): household goods are judged at the use of the tier the checklist is for (the next tier; the top tier its own), so
// a Fine manor's pottery row reads against a Villa's use; `now` judges them at the home's own tier (what it is missing now).
function liveNeeds(world, house, { now = false } = {}) {
  if (isLot(house)) return lotNeeds(world, house);
  const foodNeed = needToMeet(house, FOOD_GOODS[0]);
  const goodsTier = now ? house.tier : growingInto(house);
  const met = {
    road: touchesRoad(world, house),
    water: coveredBy(world, house, 'water'),
    religion: coveredBy(world, house, 'religion'),
    entertainment: coveredBy(world, house, 'entertainment'),
    food: foodNeed > 0 && foodOnHand(house) >= foodNeed,
    twoFoods: foodKinds(house) >= 2,
    threeFoods: foodKinds(house) >= 3,
  };
  for (const good of HOUSEHOLD_GOODS) {
    const n = needToMeet(house, good, goodsTier);
    met[good] = n > 0 && (house.stock[good] || 0) >= n;
  }
  const target = desirabilityTargetFor(house);
  if (target !== null) met.desirability = houseDesirability(world, house) >= target;
  return met;
}

// Version 6.0 (Track C, ruling 702): an empty Large plot's "Opens when" list, judged live like a home's checklist but with no household to stock: the Manor's
// needs (TIERS[LARGE_PLOT.opensTier]) met around the lot. A road touches it; water, a temple and entertainment reach it (coveredBy); food and pottery are
// at hand when a working bazaar reaching it has some on its stall or can draw it from a store in its supply reach (the 'next_delivery' cause the checklist
// already words); and its street is pleasant enough (the Manor's "to rise"). Every need reads from the rules a home's own row reads from, so the lot opens
// when its row says it will.
function lotNeeds(world, house) {
  const met = { road: touchesRoad(world, house) };
  for (const need of needsOf(LARGE_PLOT.opensTier)) {
    if (PROVIDER_KIND[need]) met[need] = coveredBy(world, house, need);
    else if (need === 'food') met.food = foodCause(world, house).code === 'next_delivery';
    else met[need] = goodCause(world, house, need).code === 'next_delivery';
  }
  const target = desirabilityTargetFor(house);
  if (target !== null) met.desirability = houseDesirability(world, house) >= target;
  return met;
}

// A lot that has just opened (immigration.js sets its tier and residents): its first household is stocked from the bazaars reaching it at once, as the
// month's check stocks every home ahead of the tier it grows into, so a Manor newly moved into is judged at the month's end on what it was stocked for
// (stockedFor), not on an empty larder it never had a delivery for.
export function stockLot(world, house) {
  const wants = wantedNeeds(house);
  topUpHouse(world, house, wantedGoods(house), bazaarsByHouse(world).get(house.id), { kinds: kindsWanted(wants), tier: growingInto(house) });
  house.stockedFor = house.residents;
}

// Whether an empty Large plot may be moved into now: every row of its "Opens when" list met. (immigration.js lets arrivals move in as a Manor.)
// Version 6.0 (Wave 4 fix): asked afresh every time. The needs read the bazaars' stalls, the stores' stock and the providers' staff, which move inside a day (the deserters card's
// draw asks mid-tick, after the carts have moved stock, and the court's sheet asks between ticks), so an answer kept across calls would let a sheet being open change the draw
// (ruling 445). vacancies() asks once per lot in a pass, so nothing is walked twice.
export function lotReady(world, house) {
  if (!isLot(house)) return false;
  return Object.values(lotNeeds(world, house)).every(Boolean);
}

// The desirability a home's checklist row asks of it (and the home sheet's "to keep" list for a plot at its top): a lot, the Manor's "to rise"; a Townhouse on
// a small plot, none (it grows no further, ruling 616); any other home, desirabilityTarget's own (the next tier's "to rise", the top tier's "to keep").
export function desirabilityTargetFor(house) {
  if (isLot(house)) return riseOf(LARGE_PLOT.opensTier);
  if (isSmallTop(house)) return null;
  return desirabilityTarget(house.tier);
}

// What the house sheet shows (spec 6.3): the next tier's checklist, with a desirability row { need: 'desirability',
// met, value, target, keep } from the Townhouse up (keep is the home's own "to keep" value, null for a Townhouse);
// what the home is missing now (with 'desirability' when it is below "to keep"); and the countdown.
// Version 6.0 (Track C): a Townhouse on a small plot has no next tier (next null: ruling 616); an empty Large plot (lot: true) shows the Manor's checklist as
// the list it opens on, and says so (large: true marks every Large plot, with or without people). merge is { needed: false, ready: false } for every home now.
export function houseStatus(world, house) {
  const tier = house.tier;
  const lot = isLot(house), small = isSmallTop(house);
  const info = tier >= 1 ? TIERS[tier] : null;
  const nextTier = lot ? LARGE_PLOT.opensTier : tier + 1;
  const next = small || nextTier > MAX_TIER ? null : { tier: nextTier, name: TIERS[nextTier].name };
  const met = liveNeeds(world, house);
  const checklistNeeds = ['road', ...needsOf(next ? next.tier : tier)];
  const checklist = checklistNeeds.map((need) => ({ need, met: Boolean(met[need]) }));
  const target = desirabilityTargetFor(house);
  const keep = keepOf(tier);
  const value = target !== null || keep !== null ? houseDesirability(world, house) : null;
  if (target !== null) checklist.push({ need: 'desirability', met: met.desirability, value, target, keep });
  const metNow = useOf(tier) === useOf(Math.min(tier + 1, MAX_TIER)) ? met : liveNeeds(world, house, { now: true });
  const missingNow = tier >= 1 ? ['road', ...needsOf(tier)].filter((n) => !metNow[n]) : [];
  if (keep !== null && value < keep) missingNow.push('desirability');
  return {
    tier,
    name: info ? info.name : lot ? LARGE_NAME : 'Empty plot',
    large: isLargePlot(house),
    lot,
    residents: house.residents,
    capacity: capacityOf(house),
    next,
    checklist,
    missingNow,
    downgradeIn: tier > 1 && house.downTimer > 0 ? DOWNGRADE_AFTER_MONTHS - house.downTimer : null,
    merge: { needed: false, ready: false },
  };
}
const LARGE_NAME = 'Large plot';

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
// Desirability below the row's target is low_desirability { value, target }; it does not depend on the road. (Version 6.0: a Townhouse has no square to
// join, so 'merge' and no_square are gone; an empty Large plot's rows are judged by lotNeeds, with the same causes.)
const PROVIDER_KIND = { water: 'well', religion: 'temple', entertainment: 'booth' };

export function needCause(world, house, need) {
  const met = liveNeeds(world, house);
  if (!(need in met) || met[need]) return null;
  if (need === 'desirability') return { code: 'low_desirability', id: null, value: houseDesirability(world, house), target: desirabilityTargetFor(house) };
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
  if (need === 'twoFoods' || need === 'threeFoods') return twoFoodsCause(world, house);
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
// one whose delivery is on its way, else (Stage 4.7) the first held only in a far store (a Fetch order fixes that), else the first one in order,
// so the words name the food the player can most easily bring. Also the cause for threeFoods.
function twoFoodsCause(world, house) {
  const missing = FOOD_SLOTS.filter((g) => FOOD_GOODS.includes(g) && !((house.stock[g] || 0) > 0));
  const causes = missing.map((g) => goodCause(world, house, g));
  return causes.find((c) => c.code === 'next_delivery') || causes.find((c) => c.code === 'good_far') || causes[0];
}

function goodCause(world, house, good) {
  const { cause, working } = bazaarsFor(world, house, [good]);
  if (cause) return cause;
  const holds = (b) => (b.store[good] || 0) > 0;
  const coming = working.find((bz) => holds(bz) || goodStoresFor(world, bz, good).some(holds));
  if (coming) return { code: 'next_delivery', id: coming.id, good };
  const far = farHolder(world, working, good);
  if (far) return far;
  const kept = working.find((bz) => goodStoresFor(world, bz, good).length);
  if (kept) return { code: 'good_unmade', good, id: kept.id };
  return { code: 'no_good', good, id: working[0].id };
}

// Stage 4.7 (Task 7, ruling 471): the good is held, but only in a store beyond every reaching bazaar's supply reach: good_far { good, id: the
// nearest such store by road from one of those bazaars (ties: the lower id), bazaar, len (road tiles) }. Its remedy is a Fetch order on a store
// near the bazaar (src/sim/carts.js, ruling 466); the house sheet's Show me selects the far store. null when no store linked by road holds it.
function farHolder(world, bazaars, good) {
  let best = null;
  for (const bz of bazaars) {
    const rm = roadReach(world, bz, Infinity);
    for (const s of allBuildings(world)) {
      if (!(BUILDINGS[s.type].stores || []).includes(good) || !((s.store[good] || 0) > 0)) continue;
      const len = reachDistance(rm, world, s);
      if (Number.isFinite(len) && (!best || len < best.len || (len === best.len && s.id < best.id))) best = { code: 'good_far', good, id: s.id, bazaar: bz.id, len };
    }
  }
  return best;
}

// Stage 4.7 (Task 8): the same 'good_far' cause for a good wherever it is wanted (the tribute quota's sheet), not for one home: no working bazaar that
// sells the good has it on its stall or a store of it within its supply reach, while a store holding it is linked by road to one of them. Returns
// { code: 'good_far', good, id, bazaar, len } or null (the good is within a bazaar's reach, nobody sells it, or no linked store holds it).
export function farHeld(world, good) {
  const bazaars = allBuildings(world).filter((b) => (BUILDINGS[b.type].sells || []).includes(good) && isWorking(world, b));
  if (!bazaars.length) return null;
  const holds = (b) => (b.store[good] || 0) > 0;
  if (bazaars.some((bz) => holds(bz) || goodStoresFor(world, bz, good).some(holds))) return null;
  return farHolder(world, bazaars, good);
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
export function goodStoresFor(world, bazaar, good) {
  const def = BUILDINGS[bazaar.type];
  return buildingsInReach(world, bazaar, def.supplyReach, (o) => (BUILDINGS[o.type].stores || []).includes(good)).map((e) => e.b);
}
