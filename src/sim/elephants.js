// Version 8.4, Track E (rulings 1500-1519): the war elephants' own rules, beyond the enemy table (src/data/armies.js ENEMY_TYPES.elephant,
// ELEPHANTS): the panic and the stampede, the ivory a felled one leaves, and what the raid's report says of them. combat.js calls panicDay
// once a day after the blows and elephantFell for each elephant that falls; src/sim/raids.js endRaid spreads raidReportExtras(active raid)
// into the raid's report.
//
// Fields on the raid under way (world.raid.active), each absent until it is first needed:
//   stampeded   elephants that stampeded off the map (they count as fallen for the retreat rule: they are not in `gone`, and never set
//               `left`, so a stampede never makes a raid lost)
//   trampled    raiders of its own band a stampede felled
//   felled      elephants felled (by your towers and units)
//   ivory       units of ivory put in the city's stores; ivoryLost: units no store had room for
// A raider elephant carries panicChecked: true once its panic has been drawn (it is drawn once, the first day it is below half).
// Draws: hash2(world.seed, the elephant's id, RAID_SALT.panic).
import { ENEMY_TYPES, ELEPHANTS } from '../data/armies.js';
import { RAID_SALT } from '../data/raids.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings } from './world.js';
import { isWorking } from './labour.js';
import { storeTotal } from './production.js';
import { hash2 } from './rng.js';

export const IVORY = 'ivory';
const isElephant = (r) => r.kind === 'elephant';
const alive = (r) => r.hp > 0;
const bandOf = (r) => (r.band ? 1 : 0);
// The arrows that may panic an elephant (ruling 1502): a tower's shot or an archer's.
export const PANIC_BY = ['tower', 'archer'];

// Whether this elephant would stampede if an arrow took it below half (its one seeded draw).
export const wouldStampede = (world, r) => hash2(world.seed, r.id, RAID_SALT.panic) < ELEPHANTS.panicChance;

// The day's panic (ruling 1502), after the day's blows: each elephant still standing that is below half its hit points for the first time
// draws once (panicChecked); if the last blow it took today was an arrow (lastBy: raider id -> 'tower' | 'archer' | 'soldier' | 'chariot')
// and the draw says so, it stampedes: its damage (ENEMY_TYPES.elephant.damage) to every other raider of its band still standing, through
// hurt(raider, damage, 'stampede'), and it leaves the raiders (combat.js drops every raider with stampede: true). Returns the stampeders;
// { type: 'stampede', id, x, y, to } tells the drawing (to: its band's entry, where it runs).
export function panicDay(world, a, lastBy, hurt, events = null) {
  const out = [];
  for (const r of a.raiders) {
    if (!isElephant(r) || !alive(r) || r.panicChecked || r.hp * 2 >= ENEMY_TYPES.elephant.hp) continue;
    r.panicChecked = true;
    if (!PANIC_BY.includes(lastBy.get(r.id)) || !wouldStampede(world, r)) continue;
    r.stampede = true;
    out.push(r);
    for (const o of a.raiders) if (o !== r && alive(o) && !o.stampede && bandOf(o) === bandOf(r)) hurt(o, ENEMY_TYPES.elephant.damage, 'stampede');
    a.stampeded = (a.stampeded || 0) + 1;
    if (world.tally.elephantsStampeded !== undefined) world.tally.elephantsStampeded += 1;
    const to = (r.band && a.second ? a.second : a).entry;
    if (events) events.push({ type: 'stampede', id: r.id, x: r.x, y: r.y, to: { x: to.x, y: to.y } });
  }
  return out;
}

// The building types that keep ivory (a storehouse: its stores include it), and one's room.
const ivoryStores = () => Object.keys(BUILDINGS).filter((t) => (BUILDINGS[t].stores || []).includes(IVORY));
const roomIn = (b) => Math.max(0, BUILDINGS[b.type].capacity - storeTotal(b));
// Where a felled elephant's ivory goes (ruling 1505): the working store with room nearest (straight line from its centre) to the point it
// fell, ties to the lower id; null when none has room.
export function ivoryStore(world, at) {
  const types = ivoryStores();
  let best = null, bd = Infinity;
  for (const b of allBuildings(world)) {
    if (!types.includes(b.type) || !isWorking(world, b) || roomIn(b) <= 0) continue;
    const d = Math.hypot(b.x + b.w / 2 - at.x, b.y + b.d / 2 - at.y);
    if (d < bd || (d === bd && b.id < best.id)) { bd = d; best = b; }
  }
  return best;
}

// An elephant has fallen to your towers or units (combat.js, as it is counted): ELEPHANTS.ivory units go to ivoryStore, as many as it has room
// for; the rest is lost. tally.elephantsFelled and ivoryTaken count it; { type: 'ivory', id, n, lost, x, y } tells the drawing (id: the
// store, or null when none had room; x, y: where it fell).
export function elephantFell(world, a, r, events = null) {
  a.felled = (a.felled || 0) + 1;
  if (world.tally.elephantsFelled !== undefined) world.tally.elephantsFelled += 1;
  const b = ivoryStore(world, r);
  const n = b ? Math.min(ELEPHANTS.ivory, roomIn(b)) : 0, lost = ELEPHANTS.ivory - n;
  if (n > 0) {
    b.store[IVORY] = (b.store[IVORY] || 0) + n;
    a.ivory = (a.ivory || 0) + n;
    if (world.tally.ivoryTaken !== undefined) world.tally.ivoryTaken += n;
  }
  if (lost > 0) a.ivoryLost = (a.ivoryLost || 0) + lost;
  if (events) events.push({ type: 'ivory', id: b ? b.id : null, n, lost, x: r.x, y: r.y });
}

// What the raid's report says of its elephants (ruling 1512), each key absent when it is 0: elephants (how many came), felled, stampeded,
// trampled (raiders their stampedes felled), ivory (units stored) and ivoryLost. A raid without elephants adds nothing.
export function raidReportExtras(a) {
  const n = a.mix && a.mix.elephant > 0 ? a.mix.elephant : 0;
  if (!n) return {};
  const out = { elephants: n };
  for (const k of ['felled', 'stampeded', 'trampled', 'ivory', 'ivoryLost']) if (a[k] > 0) out[k] = a[k];
  return out;
}
