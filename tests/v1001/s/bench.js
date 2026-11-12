// Version 10.0.1, Track S (S.3, ruling 2366): the raid bench. A small defended town (a barracks to the west, an archery range to the east, stables to the
// south, two towers, the four target kinds and a row of homes) meets five fixed raids, one at a time, each on a fresh copy; each raid is run day by day
// (raidDay alone, as the Stage 3 raid tests run it) until it ends. What it returns per raid and in total is the S.3 balance measure: buildings struck,
// gold stolen, food taken, residents fled, defenders lost (units wounded and towers brought down), the days it lasted and whether it was beaten.
import { raidDay } from '../../../src/sim/raids.js';
import { UNIT_TYPES, footMix } from '../../../src/data/armies.js';
import { RAIDS } from '../../../src/data/raids.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

const N = 40;
export const BENCH_ENTRIES = { east: { x: N - 1, y: 20 }, north: { x: 20, y: 0 }, west: { x: 0, y: 20 }, south: { x: 20, y: N - 1 } };
// The five raids: entry and mix ({ foot, archer, chariot }).
export const BENCH_RAIDS = [
  { dir: 'east', mix: { foot: 6 } },
  { dir: 'north', mix: { foot: 6, archer: 2, chariot: 2 } },
  { dir: 'west', mix: { foot: 8, archer: 3, chariot: 3 } },
  { dir: 'south', mix: { foot: 10, archer: 4, chariot: 4 } },
  { dir: 'east', mix: { foot: 12 } },
];

// The town, its units trained and waiting at home.
export function benchTown() {
  const w = makeTestWorld({ size: N, gold: 5000, raiderEntries: Object.values(BENCH_ENTRIES) });
  w.milestone = 'market_town';
  setRoad(w, 0, 20, N - 1, 20);
  addRaw(w, 'storehouse', 14, 16, { store: { grain: 40, bricks: 20 } });
  addRaw(w, 'granary', 18, 16, { store: { grain: 60 } });
  addRaw(w, 'bazaar', 22, 16);
  addRaw(w, 'temple', 26, 16);
  for (const x of [12, 15, 18, 21, 24, 27, 30]) addRaw(w, 'house', x, 23, { residents: 6, tier: 2 });
  addRaw(w, 'tower', 11, 18);
  addRaw(w, 'tower', 29, 18);
  const homes = [addRaw(w, 'barracks', 6, 24), addRaw(w, 'archery_range', 32, 15), addRaw(w, 'stables', 20, 28)];
  staffAll(w);
  for (const b of homes) {
    const kind = { barracks: 'soldier', archery_range: 'archer', stables: 'chariot' }[b.type], def = UNIT_TYPES[kind];
    for (let n = 0; n < def.perBuilding; n++) w.soldiers.push({ id: w.nextUnitId++, kind, barracks: b.id, x: b.x + b.w / 2, y: b.y + b.d / 2, hp: def.hp, hit: false, task: 'wait' });
  }
  return w;
}

// One raid on a fresh town: { won, struck, gold, food, fled, wounded, towersLost, days }. scale: the raid's mix times this (1: as listed).
export function benchRaid({ dir, mix }, { scale = 1 } = {}) {
  const w = benchTown();
  const m = { ...footMix(0) };
  for (const [k, n] of Object.entries(mix)) m[k] = Math.round(n * scale);
  const size = Object.values(m).reduce((s, n) => s + n, 0);
  const entry = BENCH_ENTRIES[dir];
  w.raid.index = 3;
  w.day = 2000;
  w.raid.warning = { index: 2, entry: { ...entry }, dir, size, tribute: 240, target: 'storehouse', day: w.day - RAIDS.warningDays, arrives: w.day, first: false, mix: m };
  const events = [];
  raidDay(w, events);
  const start = w.day;
  for (let k = 0; k < 400 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
  const end = events.find((e) => e.type === 'raid_end');
  const strikes = events.filter((e) => e.type === 'raid_strike');
  const rep = end ? end.report : {};
  return {
    won: end ? end.won : null, struck: strikes.length, gold: rep.stolen || 0, food: rep.foodStolen || 0, fled: rep.fled || 0,
    wounded: w.tally.soldiersWounded, towersLost: rep.towersLost || 0, days: w.day - start,
  };
}

// Every bench raid and the totals: { raids: [...], total: { struck, gold, food, fled, defenders, lost } }.
export function raidBench(opts = {}) {
  const raids = BENCH_RAIDS.map((r) => benchRaid(r, opts));
  const sum = (k) => raids.reduce((s, r) => s + r[k], 0);
  return { raids, total: { struck: sum('struck'), gold: sum('gold'), food: sum('food'), fled: sum('fled'), defenders: sum('wounded') + sum('towersLost'), lost: raids.filter((r) => r.won === false).length } };
}
