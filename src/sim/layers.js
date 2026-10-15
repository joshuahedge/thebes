// Version 5.0 (Task 3, rulings 540-549): what the three new layers show, worked out from the sim's own records and rules, never new ones: Home progress from each
// home's houseStatus (its checklist, the rows nextStep walks), Goods supply from the same checklist rows and what the stores and stalls hold, Workers from
// the labour record (assignLabour's staff, jobs and workforce). Pure and deterministic. Each list is worked out once and kept until the buildings, the
// roads or the day change (buildingsVersion, roadVersion, day: the same signature for all three), so a frame that draws a layer asks the sim nothing.
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { CRIME } from '../data/crime.js';
import { MIN_STAFF_RATIO } from '../data/labour.js';
import { LAYER_UNLOCK, SUPPLY_GOODS, JOBLESS_BANDS } from '../data/layers.js';
import { allBuildings, housesOf, buildingsVersion } from './world.js';
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

// One signature for every list: the buildings (placed or removed, or paused by the player: touchBuildings), the roads and the day (stocks, staff and tiers
// change when a day passes).
const caches = new WeakMap();   // world -> Map name -> { key, value }
function cached(world, name, build) {
  const key = `${buildingsVersion(world)}|${world.roadVersion}|${world.day}`;
  let m = caches.get(world);
  if (!m) caches.set(world, (m = new Map()));
  const c = m.get(name);
  if (c && c.key === key) return c.value;
  const value = build();
  m.set(name, { key, value });
  return value;
}

const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

// Every home's houseStatus, once per signature (Home progress and Goods supply share it): Map id -> { b, s, rows } where rows is the checklist as nextStep
// walks it (three kinds of food includes two, a Townhouse's square last).
function statuses(world) {
  return cached(world, 'status', () => {
    const out = new Map();
    for (const b of housesOf(world)) {
      const s = houseStatus(world, b);
      const rows = s.checklist.filter((c) => !(c.need === 'twoFoods' && s.checklist.some((r) => r.need === 'threeFoods')));
      if (s.merge.needed) rows.push({ need: 'merge', met: s.merge.ready });
      out.set(b.id, { b, s, rows });
    }
    return out;
  });
}

// ── Home progress ──

// Each home that has a next step or a need to keep, with how close it is: { id, x, y (centre), b, missing: [need...] in checklist order, n, state, first, tier }.
//   state 'ready'  every need met (it grows at the month's end, or keeps its top tier)
//         'one'    one need missing: `first` names it
//         'many'   two or more missing: `first` is the first of them (the one nextStep names), `n` how many
// An empty plot beside a road has nothing missing and nothing to show; a plot with no road is one need short (the road).
export function homeProgress(world) {
  return cached(world, 'progress', () => {
    const out = [];
    for (const { b, s, rows } of statuses(world).values()) {
      const missing = rows.filter((c) => !c.met).map((c) => c.need);
      if (b.tier === 0 && !missing.length) continue;
      const c = centreOf(b);
      out.push({ id: b.id, x: c.x, y: c.y, b, tier: s.tier, missing, n: missing.length, first: missing[0] || null, state: !missing.length ? 'ready' : missing.length === 1 ? 'one' : 'many' });
    }
    return out;
  });
}

// ── Goods supply ──

// The rows that mean a good in a checklist: the household good's own, or the three food rows.
const rowsOf = (good) => (good === 'food' ? ['food', 'twoFoods', 'threeFoods'] : [good]);
const goodsOf = (good) => (good === 'food' ? FOOD_GOODS : [good]);

// Where one good is: { good, homes: [{ id, x, y, b, has }], holders: [{ id, x, y, b, amount }] }.
//   homes    every home whose next tier (or its own) asks for the good: has = all its rows for it are met (a home that does not ask for it is left out)
//   holders  every store built to hold the good and every bazaar that sells it, with some of it (foods: all foods together); amount = what it holds
export function goodSupply(world, good) {
  return cached(world, `supply:${good}`, () => {
    const rows = rowsOf(good), goods = goodsOf(good);
    const homes = [];
    for (const { b, rows: list } of statuses(world).values()) {
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
      if (amount <= 0) continue;
      const c = centreOf(b);
      holders.push({ id: b.id, x: c.x, y: c.y, b, amount: Math.round(amount) });
    }
    return { good, homes, holders };
  });
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
