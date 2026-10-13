// Armies beyond the barracks (Stage 4.6, Armies track, ruling 340): the interface other tracks use to ask about and borrow the city's
// units. Track 0 wrote a minimal working version so the Court track's soldiers request can be built and tested before the Armies track
// lands; the Armies track owns this file and may rewrite the insides, keeping these names, arguments and return shapes.
//
// Units: world.soldiers (every trained unit, each with kind: src/data/armies.js); away: world.army.away (newArmyState).
import { UNIT_KINDS } from '../data/armies.js';
import { UNITS } from '../data/raids.js';

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const kindOf = (u) => u.kind || 'soldier';

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
// away is not paid and does not fight; on its return day it is back at the building that trained it (armyDay), or leaves service if
// that building is gone.
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
  if (events) events.push({ type: 'units_sent', sent, back: world.day + days });
  return { ok: true, reason: null, sent };
}

// One day: units whose return day has come are back, waiting at the building that trained them, unhurt (the hit points the Armies
// track gives each kind; UNITS in src/data/raids.js until then); a unit whose building is gone leaves service.
export function armyDay(world, events = null, hpOf = (kind) => (UNITS[kind] || UNITS.soldier).hp) {
  if (!world.army.away.length) return;
  const back = world.army.away.filter((u) => u.back <= world.day);
  if (!back.length) return;
  world.army.away = world.army.away.filter((u) => u.back > world.day);
  const returned = {};
  for (const u of back) {
    const b = world.buildings[u.barracks];
    if (!b) continue;
    const c = centre(b);
    world.soldiers.push({ id: u.id, kind: u.kind, barracks: u.barracks, x: c.x, y: c.y, hp: hpOf(u.kind), hit: false, task: 'wait' });
    returned[u.kind] = (returned[u.kind] || 0) + 1;
  }
  world.soldiers.sort((a, b) => a.id - b.id);
  if (events && Object.keys(returned).length) events.push({ type: 'units_back', returned });
}

// STUB (Armies): the month's army work.
export function armyMonth(world, events = null) {}

// STUB (Armies): the army's alerts.
export const armyAlerts = (world) => [];
