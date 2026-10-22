// Version 5.0 (Task 3, rulings 540-549): what the three new layers show, worked out from the sim's own records and rules, never new ones: Home progress from each
// home's houseStatus (its checklist, the rows nextStep walks), Goods supply from the same checklist rows and what the stores and stalls hold, Workers from
// the labour record (assignLabour's staff, jobs and workforce). Pure and deterministic. Each list is worked out once and kept until the buildings, the
// roads or the day change (buildingsVersion, roadVersion, day: the same signature for all three), so a frame that draws a layer asks the sim nothing; the one
// costly list (every home's status) is built a slice of homes at a time when the caller gives a budget.
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { CRIME } from '../data/crime.js';
import { MIN_STAFF_RATIO } from '../data/labour.js';
import { LAYER_UNLOCK, SUPPLY_GOODS, JOBLESS_BANDS } from '../data/layers.js';
import { allBuildings, housesOf, buildingsVersion, getBuilding } from './world.js';
import { layersVersion } from './layerVersion.js';
import { houseStatus } from './housing.js';
import { atLeast, isUnlocked } from './progression.js';
import { touchesRoad } from './reach.js';
import { crewPlan, hasMonumentWork } from './monuments.js';
import { makerOf } from './advice.js';

// ── When a layer is offered ──

// True once the layer's milestone is reached (or, for Home progress, the first home is placed).
export function layerUnlocked(world, kind) {
  const u = LAYER_UNLOCK[kind];
  if (!u) return true;
  if (u.home) return housesOf(world).length > 0;
  return atLeast(world, u.milestone);
}

// The goods the supply layer's picker offers now: a household good once its maker can be built, foods always.
export const supplyGoods = (world) => SUPPLY_GOODS.filter((g) => g === 'food' || isUnlocked(world, makerOf(g)));

// ── The cache ──

// One signature for every list: the buildings (placed or removed), a pause or resume (layersVersion: a change a layer must see at once that moves no footprint), the roads and the day (stocks, staff and tiers
// change when a day passes).
const caches = new WeakMap();   // world -> Map name -> { key, value }
const structure = (world) => `${buildingsVersion(world)}|${layersVersion(world)}|${world.roadVersion}`;
function cached(world, name, build, also = '') {
  const key = `${structure(world)}|${world.day}|${also}`;
  let m = caches.get(world);
  if (!m) caches.set(world, (m = new Map()));
  const c = m.get(name);
  if (c && c.key === key) return c.value;
  const value = build();
  m.set(name, { key, value });
  return value;
}

const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

// ── Every home's status, in slices ──

// houseStatus costs about half a millisecond a home, so a city of hundreds of homes cannot be worked out inside one frame. Home progress and Goods supply share one
// list, Map id -> { b, s, rows } (rows is the checklist as nextStep walks it: three kinds of food includes two, a Townhouse's square last), built `budget` homes at
// a time by whoever draws (src/render/layers.js sets the budget from how long a slice took; the sim only counts homes, never time). The list last completed is kept
// and drawn until the next one finishes, then swapped in whole. With no budget the whole list is built in one call (the tests, and any caller that wants it now).
//   a new list starts when the buildings or roads have changed since the last one began, or the day has passed since the last completed one;
//   a list under way is dropped when the buildings or roads change (it would walk homes that are gone), and kept across a new day (it finishes, and the next begins);
//   when the buildings or roads change, the list kept loses the homes that are gone at once (a demolished home does not stay washed), and the rest wait for their new status;
//   before the first list has completed, what has been worked out so far is what there is (the homes arrive a slice at a time).
const states = new WeakMap();   // world -> { done: { map, key }, job: { homes, i, map, struct }, gen }
export const statusWork = { calls: 0 };   // houseStatus calls made for these lists, for the test that no frame does more than its budget

function entryOf(world, b) {
  statusWork.calls++;
  const s = houseStatus(world, b);
  const rows = s.checklist.filter((c) => !(c.need === 'twoFoods' && s.checklist.some((r) => r.need === 'threeFoods')));
  if (s.merge.needed) rows.push({ need: 'merge', met: s.merge.ready });
  return { b, s, rows };
}

// Advance the status list by at most `budget` homes; returns { map, gen } where gen names the list (changes whenever the list's content does).
export function statuses(world, budget = Infinity) {
  let st = states.get(world);
  if (!st) states.set(world, (st = { done: null, job: null, gen: 0 }));
  const struct = structure(world), key = `${struct}|${world.day}`;
  if (st.done && st.done.struct !== struct) {   // the buildings or roads changed: homes that are gone leave the list kept
    const alive = new Set(housesOf(world).map((b) => b.id));
    st.done = { map: new Map([...st.done.map].filter(([id, e]) => alive.has(id) && getBuilding(world, id) === e.b)), key: st.done.key, struct };
    st.gen++;
  }
  if (st.job && st.job.struct !== struct) st.job = null;
  if (st.done && st.done.key === key) return { map: st.done.map, gen: st.gen };
  if (!st.job) st.job = { homes: housesOf(world), i: 0, map: new Map(), struct, key };
  const j = st.job;
  for (let n = 0; j.i < j.homes.length && n < budget; n++, j.i++) j.map.set(j.homes[j.i].id, entryOf(world, j.homes[j.i]));
  if (j.i >= j.homes.length) {
    st.done = { map: j.map, key: j.key, struct: j.struct };
    st.job = null;
    st.gen++;
    return { map: j.map, gen: st.gen };
  }
  if (st.done) return { map: st.done.map, gen: st.gen };
  return { map: j.map, gen: -j.map.size - 1 };   // nothing complete yet: what is worked out so far
}

// ── Home progress ──

// Each home that has a next step or a need to keep, with how close it is: { id, x, y (centre), b, missing: [need...] in checklist order, n, state, first, tier }.
//   state 'ready'  every need met (it grows at the month's end, or keeps its top tier)
//         'one'    one need missing: `first` names it
//         'many'   two or more missing: `first` is the first of them (the one nextStep names), `n` how many
// An empty plot beside a road has nothing missing and nothing to show; a plot with no road is one need short (the road). Version 6.0 (Track C): an empty
// Large plot is shown like a home, its "Opens when" rows as the needs: an icon for the first it waits on (a number when more), a tick when it is ready.
export function homeProgress(world, budget) {
  const { map, gen } = statuses(world, budget);
  return cached(world, 'progress', () => {
    const out = [];
    for (const { b, s, rows } of map.values()) {
      const missing = rows.filter((c) => !c.met).map((c) => c.need);
      if (b.tier === 0 && !missing.length && !s.lot) continue;   // an empty plot beside a road has nothing to show; an empty Large plot with every need met shows its tick (ready: people move in), Version 6.0
      const c = centreOf(b);
      out.push({ id: b.id, x: c.x, y: c.y, b, tier: s.tier, missing, n: missing.length, first: missing[0] || null, state: !missing.length ? 'ready' : missing.length === 1 ? 'one' : 'many' });
    }
    return out;
  }, gen);
}

// ── Goods supply ──

// The rows that mean a good in a checklist: the household good's own, or the three food rows.
const rowsOf = (good) => (good === 'food' ? ['food', 'twoFoods', 'threeFoods'] : [good]);
const goodsOf = (good) => (good === 'food' ? FOOD_GOODS : [good]);

// Where one good is: { good, homes: [{ id, x, y, b, has }], holders: [{ id, x, y, b, amount }] }.
//   homes    every home whose next tier (or its own) asks for the good: has = all its rows for it are met (a home that does not ask for it is left out)
//   holders  every store built to hold the good and every bazaar that sells it, with at least one of it (foods: all foods together); amount = what it holds, rounded
export function goodSupply(world, good, budget) {
  const { map, gen } = statuses(world, budget);
  return cached(world, `supply:${good}`, () => {
    const rows = rowsOf(good), goods = goodsOf(good);
    const homes = [];
    for (const { b, rows: list } of map.values()) {
      const mine = list.filter((c) => rows.includes(c.need));
      if (!mine.length) continue;
      const c = centreOf(b);
      homes.push({ id: b.id, x: c.x, y: c.y, b, has: mine.every((r) => r.met) });
    }
    const holders = [];
    for (const b of allBuildings(world)) {
      const def = BUILDINGS[b.type];
      if (!(def.stores || []).some((g) => goods.includes(g)) && !(def.sells || []).some((g) => goods.includes(g))) continue;
      const amount = goods.reduce((sum, g) => sum + ((b.store && b.store[g]) || 0), 0);
      if (Math.round(amount) < 1) continue;   // the label says whole numbers: a store with less than half of one has nothing to show
      const c = centreOf(b);
      holders.push({ id: b.id, x: c.x, y: c.y, b, amount: Math.round(amount) });
    }
    return { good, homes, holders };
  }, gen);
}

// ── Workers ──

// The workplaces short of staff, and the districts the jobless live in: { shorts, districts, jobless, jobs, workforce }.
//   shorts     { id, x, y, b, workers, staff, short, stopped } for each workplace whose jobs the sim counts (not paused, a road beside it, a monuments workplace only with work)
//              that has fewer staff than workers; stopped: below MIN_STAFF_RATIO, so it does not work at all
//   districts  the jobless (workforce less employed, the labour record) shared out over the districts (squares of CRIME.districtTiles) by how many people live
//              in each, the largest remainder to the districts with the larger fraction (ties: the lower cell): { cx, cy, x0, y0, x1, y1 (tiles), residents, jobless, band }
export function workersState(world) {
  return cached(world, 'workers', () => {
    const shorts = [];
    let plan = null;
    for (const b of allBuildings(world)) {
      const def = BUILDINGS[b.type];
      if (!def.workers || b.paused || !touchesRoad(world, b)) continue;
      if (def.priority === 'monuments' && !hasMonumentWork(world, b, plan || (plan = crewPlan(world)))) continue;
      const staff = b.staff || 0;
      if (staff >= def.workers) continue;
      const c = centreOf(b);
      shorts.push({ id: b.id, x: c.x, y: c.y, b, workers: def.workers, staff, short: def.workers - staff, stopped: staff / def.workers < MIN_STAFF_RATIO });
    }
    const L = world.labour || { workforce: 0, employed: 0, jobs: 0 };
    const jobless = Math.max(0, L.workforce - L.employed);
    return { shorts, districts: jobless > 0 ? joblessDistricts(world, jobless) : [], jobless, jobs: L.jobs, workforce: L.workforce };
  });
}

// The band a district's jobless count falls in: the index of the last JOBLESS_BANDS row it reaches (0 for a count below the first).
export const joblessBand = (n) => JOBLESS_BANDS.reduce((k, band, i) => (n >= band.from ? i : k), 0);

function joblessDistricts(world, jobless) {
  const T = CRIME.districtTiles, cells = new Map();
  let total = 0;
  for (const b of housesOf(world)) {
    if (!(b.residents > 0)) continue;
    const cx = Math.floor(b.x / T), cy = Math.floor(b.y / T), key = `${cx},${cy}`;
    let d = cells.get(key);
    if (!d) cells.set(key, (d = { cx, cy, residents: 0 }));
    d.residents += b.residents;
    total += b.residents;
  }
  if (!total) return [];
  const list = [...cells.values()].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  for (const d of list) { const exact = (jobless * d.residents) / total; d.jobless = Math.floor(exact); d.frac = exact - d.jobless; }
  let left = jobless - list.reduce((s, d) => s + d.jobless, 0);
  for (const d of [...list].sort((a, b) => b.frac - a.frac || a.cy - b.cy || a.cx - b.cx)) { if (left <= 0) break; d.jobless++; left--; }
  return list.filter((d) => d.jobless > 0).map((d) => ({
    cx: d.cx, cy: d.cy, x0: d.cx * T, y0: d.cy * T, x1: Math.min(world.size, (d.cx + 1) * T) - 1, y1: Math.min(world.size, (d.cy + 1) * T) - 1,
    residents: d.residents, jobless: d.jobless, band: joblessBand(d.jobless),
  }));
}

// The good the supply layer shows: the one picked when the picker offers it, else the first the picker offers (pottery from Town, foods before it).
export function resolveSupplyGood(world, picked) {
  const goods = supplyGoods(world);
  return goods.includes(picked) ? picked : goods[0] || 'food';
}
