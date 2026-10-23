// Version 5.0 (Task 0, contract docs/superpowers/notes/2026-10-15-version-5-0-contract.md): knowing what holds the city back. Built only from
// the sim's own rules (houseStatus, needCause, alertsFor, monthForecast, the labour record, the stores and last month's goods record, the
// fire/health/crime causes and the raid's quote), so every number the advice sheet (Task 1) and a house sheet's next step (Task 2) say is the
// sim's, and a fix is never something the sim would refuse: a building is named only once it is unlocked, with its price and whether the
// treasury can pay it (canAfford, the placing rule). Pure and deterministic: no randomness, no clock; ties break on fixed orders and ids.
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { FOOD_GOODS, HOUSEHOLD_GOODS } from '../data/goods.js';
import { MILESTONES } from '../data/progression.js';
import { ADVICE, ADVICE_KINDS } from '../data/advice.js';
import { allBuildings, housesOf, buildingsVersion } from './world.js';
import { houseStatus, needCause, needsOf, desirabilityTargetFor, goodStoresFor } from './housing.js';
import { LARGE_PLOT } from '../data/largePlots.js';
import { isLargePlot, isLot, isSmallTop, largePlotUnlocked } from './largePlots.js';
import { alertsFor } from './alerts.js';
import { monthForecast, biggestCost } from './economy.js';
import { isUnlocked } from './progression.js';
import { costOf, roadCostOf, raidsOn } from './costs.js';
import { canAfford } from './money.js';
import { fireCause } from './fire.js';
import { healthCause } from './health.js';
import { crimeCause } from './crime.js';
import { tributeQuote, towersNeeded, workingTowers, raidSize, firstRaidTarget } from './raids.js';
import { DAYS_PER_MONTH } from './time.js';
import { buildingsInReach, roadReach, reachDistance } from './reach.js';
import { storeAccepts } from './production.js';
import { isStore, canStaff, findSource } from './carts.js';
import { desirabilityField, houseDesirability, scoreWith } from './desirability.js';
import { DESIRABILITY } from '../data/desirability.js';
import { checkTiles } from './commands.js';
import { v60Advice } from './v60.js';

// ── The goods' makers (moved here from src/ui/text.js, which re-exports them) ──

// The building that makes a good, and the store that keeps it (the first in the data's order), or null.
export const makerOf = (good) => Object.keys(BUILDINGS).find((t) => BUILDINGS[t].produces && BUILDINGS[t].produces.good === good) || null;
export const storeFor = (good) => Object.keys(BUILDINGS).find((t) => (BUILDINGS[t].stores || []).includes(good)) || null;
// The buildings that make a good, in the order they are built: the raw producer, then the workshop ("clay pit, potter"; figs: "fig orchard").
export function goodMakers(good) {
  const maker = makerOf(good);
  if (!maker) return [];
  const input = BUILDINGS[maker].consumes;
  return [input ? makerOf(input) : null, maker].filter(Boolean);
}
const milestoneOf = (type) => MILESTONES.find((m) => m.unlocks.includes(type)) || null;
const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

// ── What fixes each needCause code (moved here from src/ui/sheets.js, which reads it) ──

// { item, at } builds item near the home (at 'home') or near the building the cause names (at 'building'), or for a maker that needs fertile
// or rocky ground at the nearest free tile of it (at 'terrain'); { view: true } selects the building the cause names, which is in reach but
// paused, short of workers or without a road (its own sheet says how to fix it); { select: true } selects it too, for an action there (a good
// held only in a far store: Fetch, ruling 471). null: nothing to build or view (next_delivery), or the good's makers or store are not
// unlocked yet. No unlock check here beyond the goods' (the house sheet's rows as they were); nextStep and cityAdvice add it.
const VIEW = { view: true };
const CAUSE_FIX = {
  no_road: { item: 'road', at: 'home' },
  no_well: { item: 'well', at: 'home' },
  no_bazaar: { item: 'bazaar', at: 'home' },
  bazaar_empty: { item: 'granary', at: 'building' },
  granary_empty: { item: 'farm_grain', at: 'building' },
  no_temple: { item: 'temple', at: 'home' },
  well_idle: VIEW, granary_idle: VIEW, bazaar_idle: VIEW, temple_idle: VIEW, booth_idle: VIEW,
  well_no_road: VIEW, bazaar_no_road: VIEW, temple_no_road: VIEW, booth_no_road: VIEW,
  no_booth: { item: 'booth', at: 'home' },
  low_desirability: { item: 'garden', at: 'home' },   // Version 5.0 (Task 7): nextStep and the rows name desirabilityFix's decoration and tile; this is the fallback when none helps
  // No store for the good near the bazaar: that store beside the bazaar, while it and the good's makers are unlocked (a store would stay empty).
  no_good: (world, cause) => {
    const item = storeFor(cause.good);
    return item && isUnlocked(world, item) && goodMakers(cause.good).every((t) => isUnlocked(world, t)) ? { item, at: 'building' } : null;
  },
  good_far: { select: true },
  good_unmade: (world, cause) => unmadeFix(world, cause),
};

// The fix for a good nothing makes: its first maker the city has none of, or null while a maker is locked; with every maker standing, the step
// the chain lacks (moreOf), with near: the id of the building it goes beside.
export function unmadeFix(world, cause) {
  const makers = goodMakers(cause.good);
  if (!makers.length || makers.some((t) => !isUnlocked(world, t))) return null;
  const missing = makers.find((t) => !allBuildings(world).some((b) => b.type === t));
  const holder = missing ? inputHolder(world, missing) : null;
  // Version 6.0 (Track C, ruling 586): a workshop the city lacks goes beside the store holding its input, unless no room is left there: then the Estate trick (openWorkshop).
  const trick = missing ? openWorkshop(world, missing, holder) : undefined;
  const more = missing ? (trick === undefined ? { item: missing, near: holder } : trick) : moreOf(world, cause.good);
  if (!more) return null;   // a maker that stands cannot work: the workers item is the fix, not another maker
  const out = { item: more.item, at: BUILDINGS[more.item].terrain ? 'terrain' : 'building' };
  if (more.near !== null) out.near = more.near;
  if (more.open) out.open = more.open;
  return out;
}

// ── The Estate trick (Version 6.0, Track C: ruling 586's piece of hand-play, said by the advice) ──
// A workshop (the weaver, the jeweller) takes its input from a store within its producer reach by road. When the store holding the input has no room beside it for the workshop,
// Show me's nearest spot lies beyond that reach and the workshop would stand idle. What works is the workshop in the open with a store of its own beside it that Fetches the input
// (Stage 4.7's carts). The advice says it in two steps, read from the world: the store first (fix.item the store's type, near the holder), then the workshop beside that store
// (fix.item the maker, near the store); the Fetch order is the words' last clause, and once a store beside the holder-less spot stands there is nothing more to build.
// fix.open = { maker, input, store: the store's type, step: 'store' | 'maker', holder: the id of the store that holds the input, by: the satellite store's id (step 'maker') }.

// The free spot nearest `holder` (straight distance between centres, then reading order) where a `type` (a workshop) could stand and take its input from it: { x, y } its origin, or null.
// A tile the placing rule accepts with a road touching it (checkTiles) and whose road distance to the holder is within the workshop's producer reach. Read from the holder's own road
// reach, so one walk answers every candidate. It is also where the plain fix aims Show me, so the ghost lands where the workshop has its input (fixFor).
const roomMemo = new WeakMap();   // world -> { key, spots: Map 'type|holder id' -> spot }: one answer per place while nothing that decides it has changed
export function roomFor(world, type, holder) {
  const key = `${buildingsVersion(world)}|${world.roadVersion}|${world.wallVersion}|${world.milestone}`;
  let m = roomMemo.get(world);
  if (!m || m.key !== key) { m = { key, spots: new Map() }; roomMemo.set(world, m); }
  const k = `${type}|${holder.id}|${holder.x},${holder.y}`;
  if (!m.spots.has(k)) m.spots.set(k, searchRoom(world, type, holder));
  return m.spots.get(k);
}
function searchRoom(world, type, holder) {
  const def = BUILDINGS[type];
  const reach = def.producerReach;
  const rm = roadReach(world, holder, reach);
  if (!rm.size) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of rm.keys()) { const tx = t % world.size, ty = (t - tx) / world.size; x0 = Math.min(x0, tx); y0 = Math.min(y0, ty); x1 = Math.max(x1, tx); y1 = Math.max(y1, ty); }
  const { w, d } = dimsOf(type);
  const cx = holder.x + holder.w / 2, cy = holder.y + holder.d / 2;
  let best = null, bestD = Infinity;
  for (let y = y0 - d; y <= y1 + 1; y++) {
    for (let x = x0 - w; x <= x1 + 1; x++) {
      const dd = (x + w / 2 - cx) ** 2 + (y + d / 2 - cy) ** 2;
      if (dd >= bestD || checkTiles(world, type, x, y) !== null) continue;
      if (reachDistance(rm, world, { x, y, w, d }) <= reach) { bestD = dd; best = { x, y }; }
    }
  }
  return best;
}
export const roomBeside = (world, type, holder) => roomFor(world, type, holder) !== null;

// The store the player has laid for the trick: a store of the input's kind, not the holder, holding none of the input, the nearest to the holder (ties: the lower id); or null.
function satelliteOf(world, storeType, input, holder) {
  let best = null, bestD = Infinity;
  for (const b of allBuildings(world)) {
    if (b.id === holder.id || b.type !== storeType || (b.store[input] || 0) > 0) continue;
    const dd = (b.x - holder.x) ** 2 + (b.y - holder.y) ** 2;
    if (dd < bestD) { bestD = dd; best = b; }
  }
  return best;
}

// The trick's next step for a workshop `maker` whose input lies in `holder` (a building, or its id): { item, near, open } for the step; undefined when the trick does not apply (no
// holder, the store's kind not unlocked, or room beside the holder: the plain fix then); null when a store is laid and the workshop stands beside it (nothing more to build: the
// Fetch order is the player's, and the words said so).
export function openWorkshop(world, maker, holder) {
  const h = typeof holder === 'number' ? world.buildings[holder] : holder;
  const input = BUILDINGS[maker].consumes;
  const storeType = input ? storeFor(input) : null;
  if (!h || !storeType || !isUnlocked(world, storeType) || roomBeside(world, maker, h)) return undefined;
  const sat = satelliteOf(world, storeType, input, h);
  const open = { maker, input, store: storeType, holder: h.id };
  if (!sat) return { item: storeType, near: h.id, open: { ...open, step: 'store' } };
  const reach = BUILDINGS[maker].producerReach, rm = roadReach(world, sat, reach);
  if (allBuildings(world).some((b) => b.type === maker && reachDistance(rm, world, b) <= reach)) return null;   // the workshop stands by it
  return { item: maker, near: sat.id, open: { ...open, step: 'maker', by: sat.id } };
}

// Version 5.0 (Task 7): the store holding most of a workshop's input (a weaver goes beside the storehouse where the flax is, as it takes its input
// from a store within its producer reach), the lower id on a tie; null for a maker with no input, or while no store holds any.
export function inputHolder(world, type) {
  const input = BUILDINGS[type].consumes;
  if (!input) return null;
  let best = null;
  for (const b of allBuildings(world)) if (isStore(b) && (b.store[input] || 0) > 0 && (!best || b.store[input] > best.store[input])) best = b;
  return best ? best.id : null;
}

// Version 5.0 (Task 7): with every maker of a good standing, where its chain is stuck, read from the sim's own blocks (b.blocked): a maker with
// nowhere to put what it makes ('no_storage', or its stores filled: 'storage_full') wants the good's store beside it; a workshop idle for want of its input ('no_input') wants a store
// beside the input's producer when that one has nowhere to put it, else another workshop beside a store where the input lies unused (out of the
// idle one's reach), else more of the input (another barley farm, not a brewery that would wait too). A maker that is paused, short of workers or (a
// lodge) with no game to take is not stuck for want of another: null, the city's workers item (and the maker's own sheet) says why. Otherwise another
// workshop (or the good's only maker). { item, near: the id of the building it goes beside, or null }, or null.
export function moreOf(world, good) {
  const maker = makerOf(good);
  const all = allBuildings(world);
  const stuckAt = (type) => all.find((b) => b.type === type && (b.blocked === 'no_storage' || b.blocked === 'storage_full'));
  const storeBy = (g, b) => (b && storeFor(g) && isUnlocked(world, storeFor(g)) ? { item: storeFor(g), near: b.id } : null);
  const full = storeBy(good, stuckAt(maker));
  if (full) return full;
  const input = BUILDINGS[maker].consumes;
  const idle = input && makerOf(input) ? all.find((b) => b.type === maker && b.blocked === 'no_input') : null;
  if (idle) {
    const raw = storeBy(input, stuckAt(makerOf(input)));
    if (raw) return raw;
    const held = inputHolder(world, maker);
    if (held !== null) { const trick = openWorkshop(world, maker, held); return trick === undefined ? { item: maker, near: held } : trick; }   // Version 6.0: or the trick when no room is left beside the store that holds it (null: nothing more to build)
    return { item: makerOf(input), near: idle.id };
  }
  if (all.some((b) => b.type === maker && (b.paused || b.blocked === 'understaffed' || b.blocked === 'no_game'))) return null;
  return { item: maker, near: null };
}

// Version 5.0 (Task 3 review fix): the store that should set the Fetch order for a good held only in a far store (a good_far cause): the nearest store
// to the cause's bazaar, within its supply reach, that is built to hold the good, works, takes it and could draw it from the far store (the sim's own
// setFetch tests: storeAccepts, findSource), or null when no store stands near the bazaar. The lower id breaks a tie in distance.
export function fetchStoreFor(world, cause) {
  const bazaar = cause && cause.code === 'good_far' ? world.buildings[cause.bazaar] : null;
  if (!bazaar) return null;
  const near = buildingsInReach(world, bazaar, BUILDINGS[bazaar.type].supplyReach, (o) => isStore(o) && BUILDINGS[o.type].stores.includes(cause.good) && o.id !== cause.id);
  const hit = near.find(({ b }) => canStaff(world, b) && storeAccepts(b, cause.good) && findSource(world, b, cause.good));
  return hit ? hit.b : null;
}

// Version 5.0 (Task 7): which decoration lifts a low street, and where. Of ADVICE.decor's buildings that are unlocked, each is tried at every
// free tile within its reach of the home (the placing rule's own tile check) and kept at the one that raises the home's score most (ties: the
// nearer tile, then the first in reading order). The pick is the cheapest that lifts the home to its target on its own, else the one that lifts
// it most (ties: the cheaper, then ADVICE.decor's order). Returns { item, at: 'near', target (the tile's centre), spot: { x, y }, dist (tiles
// from the home, 1 = beside it), from, to, needs } or null when the street is high enough or nothing unlocked has a tile that lifts it.
export function desirabilityFix(world, house) {
  const needs = house.tier >= 1 || isLot(house) ? desirabilityTargetFor(house) : null;   // Version 6.0: an empty Large plot's street (the Manor's "to rise") is a fix too
  if (needs === null) return null;
  const field = desirabilityField(world);
  const from = houseDesirability(world, house, field);
  if (from >= needs) return null;
  const options = [];
  for (const type of ADVICE.decor) {
    if (!BUILDINGS[type] || !isUnlocked(world, type)) continue;
    const spot = decorSpot(world, house, type, field, from);
    if (spot) options.push({ type, cost: costOf(world, type), ...spot });
  }
  if (!options.length) return null;
  const closing = options.filter((o) => from + o.gain >= needs).sort((a, b) => a.cost - b.cost)[0];
  const pick = closing || options.slice().sort((a, b) => b.gain - a.gain || a.cost - b.cost)[0];
  return { item: pick.type, at: 'near', target: { x: pick.x + 0.5, y: pick.y + 0.5 }, spot: { x: pick.x, y: pick.y }, dist: pick.dist, from, to: from + pick.gain, needs };
}

// The free tile within reach of the home where one `type` raises its score most: { x, y, gain, dist }, or null when none raises it.
function decorSpot(world, house, type, field, from) {
  const r = (DESIRABILITY[type] || []).length;
  const { w, d } = dimsOf(type);
  let best = null;
  for (let y = house.y - r - d + 1; y <= house.y + house.d - 1 + r; y++) {
    for (let x = house.x - r - w + 1; x <= house.x + house.w - 1 + r; x++) {
      const dist = Math.max(house.x - (x + w - 1), x - (house.x + house.w - 1), house.y - (y + d - 1), y - (house.y + house.d - 1));
      if (dist < 1 || dist > r) continue;
      const gain = scoreWith(world, house, type, x, y, field) - from;
      if (gain <= 0 || (best && (gain < best.gain || (gain === best.gain && dist >= best.dist)))) continue;
      if (checkTiles(world, type, x, y) !== null) continue;
      best = { x, y, gain, dist };
    }
  }
  return best;
}

// Version 5.0 (Task 7): the herd nearest a place (the hunting lodge's fix aims at it: hunters take game from herds within HUNTING.reach of the
// lodge), as its centre tile's centre, or null when the city has no herd.
export function herdNear(world, from) {
  let best = null, bestD = Infinity;
  for (const h of (world.wildlife && world.wildlife.herds) || []) {
    const dd = (h.x + 0.5 - from.x) ** 2 + (h.y + 0.5 - from.y) ** 2;
    if (dd < bestD) { bestD = dd; best = { x: h.x + 0.5, y: h.y + 0.5 }; }
  }
  return best;
}

// The CAUSE_FIX record for a needCause result, or null.
export function causeFix(world, cause) {
  const f = cause ? CAUSE_FIX[cause.code] : null;
  return typeof f === 'function' ? f(world, cause) : f || null;
}

// The building a cause's fix waits on, when the fix is null for want of an unlock: { item, milestone } (the milestone's id), else null. The
// goods' order is the house sheet words' (text.js goodWords): the makers first, then the store.
function lockedOf(world, cause, need) {
  const good = cause.good || need;
  const types = cause.code === 'no_good' ? [...goodMakers(good), storeFor(good)] : cause.code === 'good_unmade' ? goodMakers(good) : [];
  const item = types.find((t) => t && !isUnlocked(world, t));
  return item ? { item, milestone: (milestoneOf(item) || { id: null }).id } : null;
}

// What a build fix costs: a road per tile (roadCostOf), else the building's costOf; null for a fix that builds nothing.
export function priceOf(world, fix) {
  if (!fix || !fix.item) return null;
  return fix.item === 'road' ? roadCostOf(world) : costOf(world, fix.item);
}
const priced = (world, fix) => {
  const cost = priceOf(world, fix);
  return { fix, cost, afford: cost === null ? null : canAfford(world, cost) };
};

// A cause, made into the advice's fix shape (contract section 2): { fix } with
//   { item, at: 'near' | 'terrain', target: { x, y } }   build item near target (at 'terrain': the nearest free tile of its ground from there)
//   { select: id, target: { x, y }, why: code }          select that building (why: the cause code, e.g. 'well_idle', 'good_far')
// or { waiting: true } (next_delivery), { locked: { item, milestone } }, or {} when nothing can be offered.
function fixFor(world, cause, home, need) {
  if (cause.code === 'next_delivery') return { waiting: true };
  const f = causeFix(world, cause);
  if (!f) { const locked = lockedOf(world, cause, need); return locked ? { locked } : {}; }
  const b = cause.id !== null && cause.id !== undefined ? world.buildings[cause.id] || null : null;
  if (cause.code === 'good_far') {   // Show me opens the store that should set the Fetch order (near the bazaar) when there is one, else the store that holds the good
    const near = fetchStoreFor(world, cause);
    if (near) return { fix: { select: near.id, target: centreOf(near), why: cause.code, fetch: true } };
  }
  if (f.view || f.select) return b ? { fix: { select: b.id, target: centreOf(b), why: cause.code } } : {};
  if (cause.code === 'low_desirability') {   // Task 7: the decoration that lifts it most, at its tile (the garden near the home only when none has a tile that helps)
    const d = desirabilityFix(world, home);
    if (d) return { fix: d };
  }
  if (f.item !== 'road' && !isUnlocked(world, f.item)) return { locked: { item: f.item, milestone: (milestoneOf(f.item) || { id: null }).id } };
  const by = f.near !== undefined ? world.buildings[f.near] || null : null;   // Task 7: the building the chain is stuck at (moreOf)
  if (by) {
    // Version 6.0 (Track C): a workshop goes beside the building holding its input, and Show me aims at the free spot where it has the input in its reach (roomFor), not at the holder
    // (the nearest fit to which can lie beyond the reach); the Estate trick's step rides on the fix.
    const room = BUILDINGS[f.item].consumes ? roomFor(world, f.item, by) : null;
    const { w, d } = dimsOf(f.item);
    return { fix: { item: f.item, at: f.at === 'terrain' ? 'terrain' : 'near', target: room ? { x: room.x + w / 2, y: room.y + d / 2 } : centreOf(by), near: by.id, ...(f.open ? { open: f.open } : {}) } };
  }
  const near = centreOf(f.at !== 'home' && b ? b : home);
  if (BUILDINGS[f.item] && BUILDINGS[f.item].hunts) {   // Task 7: a hunting lodge goes by the herd nearest the bazaar, where its hunters find game
    const herd = herdNear(world, near);
    if (herd) return { fix: { item: f.item, at: 'near', target: herd, herd: true } };
  }
  if (cause.code === 'good_unmade' && f.at === 'building' && b) {   // Task 7: a workshop goes by the store the bazaar draws the good from, which it fills (and takes its input from)
    const [store] = goodStoresFor(world, b, cause.good);
    if (store) return { fix: { item: f.item, at: 'near', target: centreOf(store), store: store.id } };
  }
  return { fix: { item: f.item, at: f.at === 'terrain' ? 'terrain' : 'near', target: near } };
}

// Version 5.0 (Task 7): a cause's build fix as nextStep and the advice give it (the item and where: a low street's decoration at its tile, a
// workshop by the store it works with, a lodge by a herd), for the house sheet's checklist rows, so a row's Show me and the next step agree.
// { item, at, target, ... } or null when the fix builds nothing or waits on an unlock.
export function buildFixFor(world, house, cause, need) {
  const r = cause ? fixFor(world, cause, house, need) : {};
  return r.fix && r.fix.item ? r.fix : null;
}

// Version 5.0 (final review): the build fix a cause would make when its item is not unlocked yet, { item, milestone }, else null: a checklist row says what the next step
// says (Locked: it comes with the milestone) instead of offering a Show me the sim would refuse.
export function lockedFixFor(world, house, cause, need) {
  const r = cause ? fixFor(world, cause, house, need) : {};
  return r.locked || null;
}

// ── A home's next step (Task 2) ──

// Three kinds of food includes two (the house sheet's rule), so a list with the first leaves the second out.
const withoutTwoFoods = (rows) => (rows.some((c) => c.need === 'threeFoods') ? rows.filter((c) => c.need !== 'twoFoods') : rows);
// Days until goods next reach the homes: the bazaars restock and the homes top up at the month's end (src/sim/clock.js runMonth).
export const daysToDelivery = (world) => DAYS_PER_MONTH - (world.day % DAYS_PER_MONTH);

// The one thing to do next for a home: the first unmet row of its checklist (the house sheet's order: road, the next tier's needs, the
// desirability row, then a Townhouse's square) that has a fix. Returns
//   { reason: null, need, cause, fix, cost, afford }   cost: priceOf the fix (a road per tile; null for a select); afford: canAfford(cost)
// or, when no row has a fix, the reason there is none, from the first unmet row:
//   'waiting'  its goods come at the next delivery (days: daysToDelivery)
//   'locked'   its fix is not unlocked yet (locked: { item, milestone })
// or, when every row is met:
//   'kept'     the top tier with all it needs to keep it
//   'ready'    rises a tier at the month's end (days: daysToDelivery)
//   'empty'    a plot beside a road: people move in as the city draws them
// Every result also has tier, next (houseStatus's) and downgradeIn; keys that do not apply are null.
export function nextStep(world, house) {
  const s = houseStatus(world, house);
  const base = { tier: s.tier, next: s.next, downgradeIn: s.downgradeIn, need: null, cause: null, fix: null, cost: null, afford: null, days: null, locked: null };
  const rows = withoutTwoFoods(s.merge.needed ? [...s.checklist, { need: 'merge', met: s.merge.ready }] : s.checklist);
  let held = null;
  for (const row of rows) {
    if (row.met) continue;
    const cause = needCause(world, house, row.need);
    if (!cause) continue;
    const r = fixFor(world, cause, house, row.need);
    if (r.fix) return { ...base, reason: null, need: row.need, cause, ...priced(world, r.fix) };
    if (!held && r.waiting) held = { ...base, reason: 'waiting', need: row.need, cause, days: daysToDelivery(world) };
    if (!held && r.locked) held = { ...base, reason: 'locked', need: row.need, cause, locked: r.locked };
  }
  if (held) return held;
  if (rows.some((c) => !c.met)) return { ...base, reason: 'waiting', days: daysToDelivery(world) };   // unmet with no cause: the month's check decides
  // Version 6.0 (Track C, ruling 703): a Townhouse on a small plot grows no further. Where the city has no Large plot yet, the grand home is the remedy: a Large
  // plot beside it (the placing rule's own price), with a Show me; once one stands (an empty lot waits on its own list), the Townhouse is simply kept.
  if (isSmallTop(house) && !hasLargePlot(world)) {
    const fix = largePlotFix(world, house);
    if (fix) return { ...base, reason: null, need: 'large', cause: { code: 'no_large', id: null }, ...priced(world, fix) };
  }
  if (!s.next) return { ...base, reason: 'kept' };
  return s.tier === 0 ? { ...base, reason: 'empty' } : { ...base, reason: 'ready', days: daysToDelivery(world) };
}

// Whether the city has a Large plot: an empty lot or a home on one. Asked once per Townhouse by the advice, so it is kept while the buildings stand as they are
// (a plot is laid or goes only through insertBuilding and removeBuilding).
const largeMemo = new WeakMap();   // world -> { version, has }
export function hasLargePlot(world) {
  const version = buildingsVersion(world), m = largeMemo.get(world);
  if (m && m.version === version) return m.has;
  const has = housesOf(world).some(isLargePlot);
  largeMemo.set(world, { version, has });
  return has;
}

// The Large plot fix for a Townhouse: the card, beside the home (Show me finds the nearest tile where one fits), or null while the card is locked.
export function largePlotFix(world, house) {
  if (!largePlotUnlocked(world)) return null;
  return { item: LARGE_PLOT.type, at: 'near', target: centreOf(house) };
}

// ── City advice (Task 1) ──

const round2 = (n) => Math.round(n * 100) / 100;
const item = (key, kind, weight, count, id, data, fixed = { fix: null, cost: null, afford: null }) => ({ key, kind, weight: round2(weight), count, id, data, ...fixed });

// Homes held back: each home's next step, grouped by need, cause code and the building the cause names. A home weighs the tier it would
// rise to (a top-tier home: the tier it would keep); a group whose fix is locked weighs ADVICE.locked of that. A good held only in a far
// store is its own kind, 'stranded', grouped by good and store (its fix selects the store, where Fetch is set up). Waiting homes are left
// out: nothing to do but wait.
function homeItems(world, out) {
  const groups = new Map();
  for (const h of housesOf(world)) {
    const step = nextStep(world, h);
    if (step.reason !== null && step.reason !== 'locked') continue;
    const c = step.cause;
    const stranded = c.code === 'good_far';
    const key = stranded ? `stranded:${c.good}:${c.id}` : `home_need:${step.need}:${c.code}:${c.id === null || c.id === undefined ? '-' : c.id}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, kind: stranded ? 'stranded' : 'home_need', step, homes: [], points: 0 }));
    g.homes.push(h.id);
    g.points += step.need === 'large' ? 0 : step.next ? step.next.tier : step.tier;
  }
  for (const g of groups.values()) {
    const { step } = g, c = step.cause;
    if (step.need === 'large') g.points = ADVICE.largePlot;   // Version 6.0 (Track C): the Townhouses wait on one Large plot, not on one each: it weighs a Manor, whatever their count
    const data = { need: step.need, cause: c, homes: g.homes, points: g.points, locked: step.locked };
    if (g.kind === 'stranded') Object.assign(data, { good: c.good, store: c.id, bazaar: c.bazaar, len: c.len });
    out.push(item(g.key, g.kind, g.points * (step.reason === 'locked' ? ADVICE.locked : 1), g.homes.length, g.homes[0], data,
      { fix: step.fix, cost: step.cost, afford: step.afford }));
  }
}

// A home good running short: what the stores and the bazaars' stalls hold, against last month's net use (used less made, the summary's
// goods record). Counted when they hold some and less than ADVICE.runOutMonths of it, and homes whose own tier needs it would lose a tier
// when it runs out (each weighs its tier). Food is one need over every food. The fix makes more: a grain farm for food, else the good's
// first maker the city has none of (unmadeFix), near the store holding most of it.
function runningOutItems(world, out) {
  const last = world.stats.lastMonth;
  if (!last || !last.used) return;
  for (const [need, goods] of [['food', FOOD_GOODS], ...HOUSEHOLD_GOODS.map((g) => [g, [g]])]) {
    let held = 0, store = null, most = 0;
    for (const b of allBuildings(world)) {
      const def = BUILDINGS[b.type];
      if (!def.stores && !def.sells) continue;
      const n = goods.reduce((s, g) => s + (b.store[g] || 0), 0);
      held += n;
      if (n > most) { most = n; store = b; }
    }
    const used = goods.reduce((s, g) => s + (last.used[g] || 0), 0), made = goods.reduce((s, g) => s + ((last.made || {})[g] || 0), 0);
    const drain = used - made;
    if (held <= 0 || drain <= 0 || held / drain >= ADVICE.runOutMonths) continue;
    const homes = housesOf(world).filter((h) => h.tier >= 1 && needsOf(h.tier).includes(need));
    if (!homes.length) continue;
    const make = need === 'food' ? { item: 'farm_grain', at: 'terrain' } : unmadeFix(world, { good: need });
    // Review fix: the fix goes beside the building the chain is stuck at (make.near: a store beside the maker with nowhere to put its goods) when unmadeFix names one.
    const by = make && make.near !== undefined ? world.buildings[make.near] || null : null;
    const fixed = make && isUnlocked(world, make.item)
      ? priced(world, { item: make.item, at: BUILDINGS[make.item].terrain ? 'terrain' : 'near', target: centreOf(by || store), ...(by ? { near: by.id } : {}), ...(make.open ? { open: make.open } : {}) })
      : undefined;
    const data = { need, goods, held, used, made, monthsLeft: Math.round((held / drain) * 10) / 10, homes: homes.map((h) => h.id), store: store.id };
    out.push(item(`running_out:${need}`, 'running_out', homes.reduce((s, h) => s + h.tier, 0), homes.length, store.id, data, fixed));
  }
}

const SUMMARY = (section) => ({ fix: { view: 'summary', section, target: null }, cost: null, afford: null });

// Workers short (jobs the workforce cannot fill: the labour record) and jobless (once the sim counts unemployment: its alert).
function labourItems(world, alerts, out) {
  const L = world.labour;
  const short = L.jobs - L.employed;
  if (short > 0) {
    const ids = alerts.filter((a) => a.code === 'understaffed').map((a) => a.id);
    out.push(item('workers_short', 'workers_short', short * ADVICE.workerShort, short, ids.length ? ids[0] : null,
      { short, jobs: L.jobs, workforce: L.workforce, levels: [...(L.shortLevels || [])], ids }, SUMMARY('employment')));
  }
  if (alerts.some((a) => a.code === 'unemployment')) {
    const jobless = L.workforce - L.employed;
    out.push(item('jobless', 'jobless', jobless * ADVICE.jobless, jobless, null, { jobless, workforce: L.workforce, jobs: L.jobs }, SUMMARY('employment')));
  }
}

// The treasury runs out within FORECAST.amberMonths at this month's balance (the forecast's runsOut, the top bar's amber).
function treasuryItem(world, out) {
  const f = monthForecast(world);
  if (!f.active || !f.runsOut) return;
  const weight = Math.max(1, Math.round(-f.net / ADVICE.goldPerPoint)) * (f.goesBelow ? ADVICE.goldSoon : 1);
  out.push(item('treasury', 'treasury', weight, 1, null, { net: f.net, gold: f.gold, monthsLeft: f.monthsLeft, soon: f.goesBelow, biggest: biggestCost(world) }, SUMMARY('forecast')));
}

// The fix for a building a service does not cover (fireCause's and coverCause's codes): 'none' builds the service by it, 'no_road' a road by
// it; a service that reaches it but is short of workers, paused or burning is selected.
function coverFix(world, cause, serviceId, type, b) {
  if (cause === 'none') return isUnlocked(world, type) ? priced(world, { item: type, at: 'near', target: centreOf(b) }) : undefined;
  if (cause === 'no_road') return priced(world, { item: 'road', at: 'near', target: centreOf(b) });
  const s = serviceId !== null ? world.buildings[serviceId] : null;
  return s ? { fix: { select: s.id, target: centreOf(s), why: cause }, cost: null, afford: null } : undefined;
}

// Danger uncovered: fire (burning and High risk with no staffed firehouse: fire's alerts), illness and crime (their alerts' homes). One item
// each; its fix is for the first building (a burning one before one at risk; else the lowest id), by that danger's own cause.
function dangerItems(world, alerts, out) {
  const fires = alerts.filter((a) => a.code === 'fire'), risks = alerts.filter((a) => a.code === 'fire_risk');
  if (fires.length + risks.length) {
    const ids = [...fires, ...risks].map((a) => a.id).sort((a, b) => a - b);
    const first = world.buildings[fires.length ? Math.min(...fires.map((a) => a.id)) : ids[0]];   // a burning one first, the lowest id of them (alert order is not id order)
    const c = fireCause(world, first);
    out.push(item('fire', 'fire', fires.length * ADVICE.burning + risks.length * ADVICE.fireRisk, ids.length, first.id,
      { burning: fires.length, atRisk: risks.length, ids, cause: c.cause, service: c.firehouse }, coverFix(world, c.cause, c.firehouse, 'firehouse', first)));
  }
  for (const [kind, code, causeOf, type, each] of [['illness', 'illness', healthCause, 'physician', ADVICE.ill], ['crime', 'crime_risk', crimeCause, 'police_post', ADVICE.crime]]) {
    const list = alerts.filter((a) => a.code === code);
    if (!list.length) continue;
    const ids = list.flatMap((a) => a.ids).sort((a, b) => a - b);
    const first = world.buildings[list[0].id];
    const c = causeOf(world, first);
    out.push(item(kind, kind, ids.length * each, ids.length, first.id, { ids, districts: list.length, cause: c.cause, service: c.service }, coverFix(world, c.cause, c.service, type, first)));
  }
}

// Towers short of what a raid needs: while one is warned, the raid card's own quote (tributeQuote: its size, towers needed and working);
// otherwise, once the raid clock runs, a raid warned now (raidSize). Only when raids are on and the tower is unlocked; none while raiders
// are on the map. The fix: a tower by the warned band's first strike (firstRaidTarget), else by its entry, else by the city's start.
function towerItem(world, out) {
  if (!raidsOn(world) || !isUnlocked(world, 'tower') || world.raid.active) return;
  const q = tributeQuote(world);
  if (!q && world.raid.clockDay === null) return;
  const size = q ? q.size : raidSize(world);
  const need = q ? q.towersNeeded : towersNeeded(size), have = q ? q.towersHave : workingTowers(world);
  const buildN = Math.max(0, need - have);
  if (!buildN) return;
  // Version 6.0 (Wave 4 fix, ruling 787): a tower beside the entry on the map's edge has no road and no workers; the band's first strike is where a tower guards.
  const w = q ? world.raid.warning : null;
  const first = w ? firstRaidTarget(world, w.entry, w.target) : null;
  const at = first ? { x: first.x + first.w / 2, y: first.y + first.d / 2 } : w ? { x: w.entry.x + 0.5, y: w.entry.y + 0.5 } : { x: world.focus.x + 0.5, y: world.focus.y + 0.5 };
  const fixed = priced(world, { item: 'tower', at: 'near', target: at });
  out.push(item('raid_towers', 'raid_towers', buildN * ADVICE.tower * (q ? ADVICE.towerWarned : 1), buildN, null,
    { size, need, have, buildN, buildCost: buildN * fixed.cost, warned: Boolean(q), dirs: q ? q.dirs : null }, fixed));
}

const kindRank = (k) => ADVICE_KINDS.indexOf(k);
// Heaviest first; a tie goes to the kind first in ADVICE_KINDS, then the lower id (an item with none after), then the key.
export const compareAdvice = (a, b) => b.weight - a.weight || kindRank(a.kind) - kindRank(b.kind)
  || (a.id === null ? Infinity : a.id) - (b.id === null ? Infinity : b.id) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

// The city's problems, ranked (contract section 1): [{ key, kind, weight, count, id, data, fix, cost, afford }]. key is stable while the
// problem lasts (the advice button's dot compares keys); id the first home or building it concerns (null for a city-wide one); data what the
// words need; fix and cost as nextStep's (fix null when nothing can be offered: the data says why). Read on demand (opening the sheet, the
// month's end), never every frame: it asks every home for its next step.
export function cityAdvice(world) {
  const alerts = alertsFor(world);
  const out = [];
  homeItems(world, out);
  runningOutItems(world, out);
  labourItems(world, alerts, out);
  treasuryItem(world, out);
  dangerItems(world, alerts, out);
  towerItem(world, out);
  v60Advice(world, alerts, out);                       // Version 6.0: the court's demands and the dangers (Tracks A and B1, src/sim/v60.js)
  return out.sort(compareAdvice);
}
