// Version 5.0 (Task 0, contract docs/superpowers/notes/2026-10-15-version-5-0-contract.md): knowing what holds the city back. Built only from
// the sim's own rules (houseStatus, needCause, alertsFor, monthForecast, the labour record, the stores and last month's goods record, the
// fire/health/crime causes and the raid's quote), so every number the advice sheet (Task 1) and a house sheet's next step (Task 2) say is the
// sim's, and a fix is never something the sim would refuse: a building is named only once it is unlocked, with its price and whether the
// treasury can pay it (canAfford, the placing rule). Pure and deterministic: no randomness, no clock; ties break on fixed orders and ids.
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS, HOUSEHOLD_GOODS } from '../data/goods.js';
import { MILESTONES } from '../data/progression.js';
import { ADVICE, ADVICE_KINDS } from '../data/advice.js';
import { allBuildings, housesOf } from './world.js';
import { houseStatus, needCause, needsOf } from './housing.js';
import { alertsFor } from './alerts.js';
import { monthForecast, biggestCost } from './economy.js';
import { isUnlocked } from './progression.js';
import { costOf, roadCostOf, raidsOn } from './costs.js';
import { canAfford } from './money.js';
import { fireCause } from './fire.js';
import { healthCause } from './health.js';
import { crimeCause } from './crime.js';
import { tributeQuote, towersNeeded, workingTowers, raidSize } from './raids.js';
import { DAYS_PER_MONTH } from './time.js';
import { buildingsInReach } from './reach.js';
import { storeAccepts } from './production.js';
import { isStore, canStaff, findSource } from './carts.js';

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
  low_desirability: { item: 'garden', at: 'home' },
  no_square: { item: 'house', at: 'home' },
  // No store for the good near the bazaar: that store beside the bazaar, while it and the good's makers are unlocked (a store would stay empty).
  no_good: (world, cause) => {
    const item = storeFor(cause.good);
    return item && isUnlocked(world, item) && goodMakers(cause.good).every((t) => isUnlocked(world, t)) ? { item, at: 'building' } : null;
  },
  good_far: { select: true },
  good_unmade: (world, cause) => unmadeFix(world, cause),
};

// The fix for a good nothing makes: its first maker the city has none of (else its last), or null while a maker is locked.
export function unmadeFix(world, cause) {
  const makers = goodMakers(cause.good);
  if (!makers.length || makers.some((t) => !isUnlocked(world, t))) return null;
  const item = makers.find((t) => !allBuildings(world).some((b) => b.type === t)) || makerOf(cause.good);
  return { item, at: BUILDINGS[item].terrain ? 'terrain' : 'building' };
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
  if (f.item !== 'road' && !isUnlocked(world, f.item)) return { locked: { item: f.item, milestone: (milestoneOf(f.item) || { id: null }).id } };
  return { fix: { item: f.item, at: f.at === 'terrain' ? 'terrain' : 'near', target: centreOf(f.at !== 'home' && b ? b : home) } };
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
  if (!s.next) return { ...base, reason: 'kept' };
  return s.tier === 0 ? { ...base, reason: 'empty' } : { ...base, reason: 'ready', days: daysToDelivery(world) };
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
    g.points += step.next ? step.next.tier : step.tier;
  }
  for (const g of groups.values()) {
    const { step } = g, c = step.cause;
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
    const fixed = make && isUnlocked(world, make.item)
      ? priced(world, { item: make.item, at: BUILDINGS[make.item].terrain ? 'terrain' : 'near', target: centreOf(store) })
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
// are on the map. The fix: a tower by the warned raid's entry, else by the city's start.
function towerItem(world, out) {
  if (!raidsOn(world) || !isUnlocked(world, 'tower') || world.raid.active) return;
  const q = tributeQuote(world);
  if (!q && world.raid.clockDay === null) return;
  const size = q ? q.size : raidSize(world);
  const need = q ? q.towersNeeded : towersNeeded(size), have = q ? q.towersHave : workingTowers(world);
  const buildN = Math.max(0, need - have);
  if (!buildN) return;
  const at = q ? world.raid.warning.entry : world.focus;
  const fixed = priced(world, { item: 'tower', at: 'near', target: { x: at.x + 0.5, y: at.y + 0.5 } });
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
  return out.sort(compareAdvice);
}
