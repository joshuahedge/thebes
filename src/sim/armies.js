// Armies beyond the barracks (Stage 4.6, Armies track, rulings 340-341, 380-389): the interface other tracks use to ask about and
// borrow the city's units (unitsAtHome, unitsAway, sendUnits, armyDay: the Court track's soldiers request codes against these names,
// arguments and return shapes, ruling 349), the chariots' horse feed (armyMonth) and its alert, the raid's seeded mix by enemy kind
// and the boats' landing (raids.js calls drawMix and boatLanding when it warns of a raid), and the raid sheet's counters, read from
// the matchup table (counterModel).
//
// Units: world.soldiers (every trained unit, each with kind: src/data/armies.js); away: world.army.away (newArmyState).
import { UNIT_KINDS, UNIT_TYPES, ENEMY_TYPES, ENEMY_KINDS, MIX, MATCHUPS, SITUATIONS, footMix } from '../data/armies.js';
import { RAID_SALT, UNITS } from '../data/raids.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings } from './world.js';
import { hash2 } from './rng.js';
import { riskOf } from './costs.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { T } from './terrain.js';

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const kindOf = (u) => u.kind || 'soldier';

// The hit points a unit of this kind has when trained or back from the capital (ruling 381).
export const unitHp = (kind) => (UNIT_TYPES[kind] || UNIT_TYPES.soldier).hp;

// The units at home now, by kind: { soldier, archer, chariot } (every UNIT_KINDS key, 0 when none). Wounded units have left the list.
export function unitsAtHome(world) {
  const out = Object.fromEntries(UNIT_KINDS.map((k) => [k, 0]));
  for (const u of world.soldiers) out[kindOf(u)] = (out[kindOf(u)] || 0) + 1;
  return out;
}

// The units away at the capital: [{ kind, n, back }] grouped by kind and return day, soonest first.
export function unitsAway(world) {
  const groups = new Map();
  for (const u of world.army.away) {
    const k = `${u.back}|${u.kind}`;
    if (!groups.has(k)) groups.set(k, { kind: u.kind, n: 0, back: u.back });
    groups.get(k).n++;
  }
  return [...groups.values()].sort((a, b) => a.back - b.back || UNIT_KINDS.indexOf(a.kind) - UNIT_KINDS.indexOf(b.kind));
}

// Sends n units to the capital for `days` days (the Court track's soldiers request; REQUESTS.soldiersMonths in src/data/court.js):
// units waiting at home leave, soldiers first, then archers, then chariots, the newest of a kind first. Returns { ok, reason, sent }
// (sent: kind -> n); fails with 'not_enough' (fewer than n waiting at home: nothing is sent) or 'raid' (a raid is under way). A unit
// away is not paid and does not fight (tally.unitsSent counts it); on its return day it is back at the building that trained it
// (armyDay), or leaves service if that building is gone.
export function sendUnits(world, n, days, events = null) {
  if (world.raid.active) return { ok: false, reason: 'raid', sent: {} };
  const home = world.soldiers.filter((u) => u.task === 'wait');
  if (!Number.isInteger(n) || n < 1 || home.length < n) return { ok: false, reason: 'not_enough', sent: {} };
  const order = [...home].sort((a, b) => UNIT_KINDS.indexOf(kindOf(a)) - UNIT_KINDS.indexOf(kindOf(b)) || b.id - a.id);
  const ids = new Set(order.slice(0, n).map((u) => u.id));
  const sent = {};
  for (const u of world.soldiers) {
    if (!ids.has(u.id)) continue;
    world.army.away.push({ id: u.id, kind: kindOf(u), barracks: u.barracks, back: world.day + days });
    sent[kindOf(u)] = (sent[kindOf(u)] || 0) + 1;
  }
  world.soldiers = world.soldiers.filter((u) => !ids.has(u.id));
  if (world.tally.unitsSent !== undefined) world.tally.unitsSent += n;
  if (events) events.push({ type: 'units_sent', sent, back: world.day + days });
  return { ok: true, reason: null, sent };
}

// One day: units whose return day has come are back, waiting at the building that trained them, unhurt (their kind's hit points,
// unitHp); a unit whose building is gone, or is no longer its kind's, leaves service.
export function armyDay(world, events = null, hpOf = unitHp) {
  if (!world.army.away.length) return;
  const back = world.army.away.filter((u) => u.back <= world.day);
  if (!back.length) return;
  world.army.away = world.army.away.filter((u) => u.back > world.day);
  const returned = {};
  for (const u of back) {
    const b = world.buildings[u.barracks];
    if (!b || b.type !== (UNIT_TYPES[u.kind] || UNIT_TYPES.soldier).building) continue;
    const c = centre(b);
    world.soldiers.push({ id: u.id, kind: u.kind, barracks: u.barracks, x: c.x, y: c.y, hp: hpOf(u.kind), hit: false, task: 'wait' });
    returned[u.kind] = (returned[u.kind] || 0) + 1;
  }
  world.soldiers.sort((a, b) => a.id - b.id);
  if (events && Object.keys(returned).length) events.push({ type: 'units_back', returned });
}

// ── Horses (ruling 385) ──
// The grain the chariots at home eat a month: UNIT_TYPES.chariot.grain each. Chariots away at the capital are fed there.
export const chariotsAtHome = (world) => world.soldiers.filter((u) => kindOf(u) === 'chariot').length;
export const horseGrainOf = (world) => chariotsAtHome(world) * UNIT_TYPES.chariot.grain;

// The grain the city holds where horses can be fed: every granary's and storehouse's grain.
const feedStores = (world) => allBuildings(world).filter((b) => (b.type === 'granary' || b.type === 'storehouse') && b.store && b.store.grain > 0)
  .sort((a, b) => (a.type === b.type ? a.id - b.id : a.type === 'granary' ? -1 : 1));
export const grainHeld = (world) => feedStores(world).reduce((s, b) => s + b.store.grain, 0);

// At the month's end the horses eat horseGrainOf(world) grain, from the granaries first (lowest id first), then the storehouses. If the
// stores hold less, they eat what there is and world.army.fed turns false: until a month's end feeds them in full, chariots deal
// ARMY.hungry of their damage (combat.js). Returns { need, ate }.
export function feedHorses(world) {
  const need = horseGrainOf(world);
  let left = need;
  for (const b of feedStores(world)) {
    if (left <= 0) break;
    const take = Math.min(left, b.store.grain);
    b.store.grain -= take;
    left -= take;
  }
  world.army.fed = left <= 0;
  return { need, ate: need - left };
}

// The month's army work: the horses' feed.
export function armyMonth(world, events = null) {
  if (!world.army) return;
  const r = feedHorses(world);
  if (events && r.need > 0 && r.ate < r.need) events.push({ type: 'horses_hungry', need: r.need, ate: r.ate });
}

// The army's alerts: { code: 'horses_hungry', id, need } while chariots at home went unfed at the last month's end (id: the first
// stables; need: the grain a month they eat).
export function armyAlerts(world) {
  if (!world.army || world.army.fed !== false || !chariotsAtHome(world)) return [];
  const stables = allBuildings(world).filter((b) => b.type === UNIT_TYPES.chariot.building).sort((a, b) => a.id - b.id)[0];
  return stables ? [{ code: 'horses_hungry', id: stables.id, need: horseGrainOf(world) }] : [];
}

// ── The raid's mix (rulings 341, 382) ──
// May a kind come with the raid at this 0-based index? From its fromRaid (raid fromRaid - 1 as an index) on.
export const enemyMayCome = (kind, index) => index >= ENEMY_TYPES[kind].fromRaid - 1;

// The composition of the raid at `index` with `size` raiders (MIX in src/data/armies.js): the first raid all on foot; each other kind
// from its raid, by its share, the difficulty and a seeded jitter (hash2(seed, index x 4 + the kind's place, RAID_SALT.mix)); boats
// only when `boats` (a raid from one side on a map whose river reaches an edge, with a bank to land on). Counts add up to size.
export function drawMix(world, index, size, { boats = false } = {}) {
  const mix = footMix(size);
  if (index === 0 || size < 1) return mix;
  const factor = MIX.riskFactor[0] + MIX.riskFactor[1] * riskOf(world);
  const others = ENEMY_KINDS.filter((k) => k !== 'foot');
  for (const k of others) {
    if (!enemyMayCome(k, index) || (k === 'boat' && !boats)) continue;
    const m = MIX[k], since = index - (ENEMY_TYPES[k].fromRaid - 1);
    const jitter = 1 - MIX.jitter + 2 * MIX.jitter * hash2(world.seed, index * 4 + ENEMY_KINDS.indexOf(k), RAID_SALT.mix);
    let n = Math.round(size * Math.min(m.max, m.base + m.perRaid * since) * factor * jitter);
    if (size >= MIX.minAtSize) n = Math.max(1, n);
    mix[k] = n;
  }
  const room = size - Math.ceil(size * MIX.footMin);
  while (others.reduce((s, k) => s + mix[k], 0) > room) {
    const big = others.reduce((best, k) => (mix[k] > mix[best] ? k : best), others[0]);
    mix[big] -= 1;
  }
  mix.foot = size - others.reduce((s, k) => s + mix[k], 0);
  return mix;
}

// Whether a mix has any enemy but foot.
export const isMixed = (mix) => Boolean(mix) && ENEMY_KINDS.some((k) => k !== 'foot' && mix[k] > 0);

// The kinds of a raid's raiders in the order they are made: a round-robin by share, so a two-band raid splits each kind between its
// bands (arrive in raids.js gives band 1 the odd places). Boats are left out (they are their own band).
export function raiderKinds(mix) {
  const land = ENEMY_KINDS.filter((k) => k !== 'boat');
  const keyed = [];
  for (const k of land) for (let i = 0; i < (mix[k] || 0); i++) keyed.push({ k, key: (i + 0.5) / mix[k], o: land.indexOf(k) });
  return keyed.sort((a, b) => a.key - b.key || a.o - b.o).map((e) => e.k);
}

// ── Boats (ruling 384) ──
// The river's mouths: water tiles on the map's edges whose water joins the river (every water tile 4-linked to them, bridges
// included: boats pass under), with the edge each is on.
function riverWater(world) {
  const n = world.size, seen = new Uint8Array(n * n), queue = [], mouths = [];
  const edge = (x, y) => x === 0 || y === 0 || x === n - 1 || y === n - 1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = idx(n, x, y);
    if (edge(x, y) && world.terrain[i] === T.WATER) { seen[i] = 1; queue.push(i); mouths.push({ x, y }); }
  }
  for (let q = 0; q < queue.length; q++) {
    const x = queue[q] % n, y = Math.floor(queue[q] / n);
    for (const [dx, dy] of NEIGHBOURS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(n, nx, ny)) continue;
      const j = idx(n, nx, ny);
      if (!seen[j] && world.terrain[j] === T.WATER) { seen[j] = 1; queue.push(j); }
    }
  }
  return { seen, mouths };
}

const edgeOf = (world, t) => (t.x >= world.size - 1 ? 'east' : t.x <= 0 ? 'west' : t.y <= 0 ? 'north' : 'south');

// Where a raid's boats would land now, or null: a river bank (open, buildable-looking land, 4-linked to river water that reaches a
// map edge) within ENEMY_TYPES.boat.landWithin tiles (square) of a building, picked by hash2(seed, index, RAID_SALT.boatBank); and
// the mouth they come in by: the edge picked by hash2(seed, index, RAID_SALT.boatEntry) among the river's edges, its water tile
// nearest the bank. { bank: { x, y }, from: { x, y }, dir }.
export function boatLanding(world, index) {
  const n = world.size, { seen, mouths } = riverWater(world);
  if (!mouths.length) return null;
  const near = new Uint8Array(n * n), r = ENEMY_TYPES.boat.landWithin;
  for (const b of allBuildings(world)) {
    if (b.type === 'rubble') continue;
    for (let y = Math.max(0, b.y - r); y < Math.min(n, b.y + b.d + r); y++) for (let x = Math.max(0, b.x - r); x < Math.min(n, b.x + b.w + r); x++) near[idx(n, x, y)] = 1;
  }
  const banks = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = idx(n, x, y);
    if (!near[i] || !landable(world, x, y)) continue;
    if (NEIGHBOURS4.some(([dx, dy]) => inBounds(n, x + dx, y + dy) && seen[idx(n, x + dx, y + dy)])) banks.push({ x, y });
  }
  if (!banks.length) return null;
  const bank = banks[Math.floor(hash2(world.seed, index, RAID_SALT.boatBank) * banks.length)];
  const edges = [...new Set(mouths.map((t) => edgeOf(world, t)))];
  const dir = edges[Math.floor(hash2(world.seed, index, RAID_SALT.boatEntry) * edges.length)];
  const from = mouths.filter((t) => edgeOf(world, t) === dir)
    .reduce((best, t) => (!best || Math.hypot(t.x - bank.x, t.y - bank.y) < Math.hypot(best.x - bank.x, best.y - bank.y) ? t : best), null);
  return { bank, from: { ...from }, dir };
}

// A tile raiders can land on and stand on: on the map, not water, no building, no wall or breach.
export function landable(world, x, y) {
  if (!inBounds(world.size, x, y)) return false;
  const i = idx(world.size, x, y);
  return world.terrain[i] !== T.WATER && !world.occ[i] && world.wall[i] === 0;
}

// ── The raid sheet's counters (ruling 341) ──
// What helps against each enemy kind in a mix, read from the matchup table and the enemy's own row, for the words (text.js):
// [{ kind, n, helps: [{ unit, situation, factor }] (factor > 1, biggest first), weak: [{ unit, situation, factor }] (factor < 1), traits }]
// traits: { turnedByWalls (it cannot break walls, ruling 383), noRocky (chariots), shootsTowers + range, lands + landWithin,
// speed (tiles a day for a band of this kind alone), pace (tiles a day of the band it rides in: raids.js bandSpeed, the slowest
// kind's, with boats a band of their own), footSpeed (raiders on foot, for the comparison) }.
// Kinds with none in the mix are left out; the order is ENEMY_KINDS'.
const enemySpeed = (kind) => Math.min(ENEMY_TYPES[kind].speed, UNITS.raider.speed * 4);   // raids.js bandSpeed's cap
export function counterModel(mix) {
  const out = [];
  const land = ENEMY_KINDS.filter((k) => k !== 'boat' && mix && mix[k] > 0);
  const landPace = land.length ? Math.min(...land.map(enemySpeed)) : 0;
  for (const kind of ENEMY_KINDS) {
    if (!mix || !(mix[kind] > 0)) continue;
    const helps = [], weak = [];
    for (const unit of UNIT_KINDS) {
      const cell = (MATCHUPS[unit] && MATCHUPS[unit][kind]) || {};
      for (const situation of SITUATIONS) {
        const f = cell[situation];
        if (!Number.isFinite(f) || f === 1) continue;
        (f > 1 ? helps : weak).push({ unit, situation, factor: f });
      }
    }
    helps.sort((a, b) => b.factor - a.factor || UNIT_KINDS.indexOf(a.unit) - UNIT_KINDS.indexOf(b.unit));
    const e = ENEMY_TYPES[kind];
    out.push({ kind, n: mix[kind], helps, weak, traits: {
      turnedByWalls: !e.breaksWalls, noRocky: Number.isFinite(e.charge), shootsTowers: Number.isFinite(e.range), range: e.range || 0,
      lands: Number.isFinite(e.landWithin), landWithin: e.landWithin || 0,
      speed: enemySpeed(kind), pace: kind === 'boat' ? enemySpeed(kind) : landPace, footSpeed: enemySpeed('foot'),
    } });
  }
  return out;
}

// The building that trains a kind, and its row (for sheets and words).
export const unitBuildingOf = (kind) => BUILDINGS[(UNIT_TYPES[kind] || UNIT_TYPES.soldier).building];
