// Version 7.0, Track E's test setup: a Capital with the court open and what the city events need (a temple, a quarry, a trading post, beer and linen in
// store, a physician, a police post), and a few helpers to offer and answer an event.
import { addRaw, staffAll } from '../../helpers/testWorld.js';
import { courtWorld, openCourt, MONTH, YEAR } from '../../stage46/court/courtHelpers.js';
import { allBuildings } from '../../../src/sim/world.js';
import { drawEvent, eventDay } from '../../../src/sim/cityEvents.js';
import { EVENT_DEFS } from '../../../src/data/cityEvents.js';
import { fallIll } from '../../../src/sim/health.js';

export { MONTH, YEAR };

// A city of 72 people in six homes, a farm, a granary (600 grain), a storehouse (pottery, gems, beer, linen), a potter, a physician, a temple, a quarry, a
// trading post, a bazaar, a brewery and a police post, all staffed; a Capital (the court open unless open is false); the day it became a Town on record.
export function eventWorld({ open = true, milestone = 'capital', gold = 3000, seed = 1, difficulty = 'normal', ill = 0 } = {}) {
  const w = courtWorld({ open, seed, difficulty });
  w.milestone = milestone;
  w.splits.town = 0;
  if (!open) w.day = 2 * YEAR;
  addRaw(w, 'house', 20, 9, { tier: 3, residents: 12 });                       // eight homes; two of them with room (Cottages hold 12)
  addRaw(w, 'house', 21, 9, { tier: 3, residents: 12 });
  const homes = allBuildings(w).filter((b) => b.type === 'house');
  homes[0].residents = 4;
  homes[1].residents = 4;
  w.buildings[allBuildings(w).find((b) => b.type === 'granary').id].store.grain = 300;   // room in the granary for a bumper harvest
  addRaw(w, 'temple', 17, 12);
  addRaw(w, 'quarry', 20, 12);
  addRaw(w, 'trading_post', 23, 12);
  addRaw(w, 'bazaar', 26, 12, { store: { grain: 40 } });
  addRaw(w, 'brewery', 29, 12);
  addRaw(w, 'police_post', 33, 11);
  const store = allBuildings(w).find((b) => b.type === 'storehouse');
  Object.assign(store.store, { beer: 100, linen: 80 });
  staffAll(w);
  w.gold = gold;
  w.court.guided = 'answered';
  w.court.nextRequestDay = w.day + 20 * YEAR;
  w.court.nextCardDay = w.day + 20 * YEAR;
  w.demands.nextDay = w.day + 20 * YEAR;
  w.cityEvents.nextDay = 0;
  for (const h of homes.slice(2, 2 + ill)) fallIll(w, h.id);                    // `ill` homes down with a fever (a healer is offered from two)
  return w;
}

export const storehouseOf = (w) => allBuildings(w).find((b) => b.type === 'storehouse');
export const idsOf = (w, type) => allBuildings(w).filter((b) => b.type === type).map((b) => b.id);

// Offers the kind now (a record as eventDay would write it): the figures its offer draws, or null when the kind's conditions do not hold. The kind's cooldown
// and the next gap are noted as eventDay does.
export function offer(w, kind) {
  const saved = EVENT_DEFS.slice();
  // Draw with only this kind eligible: put the others on cooldown for a day, then restore.
  w.cityEvents.waiting = null;                                                 // (replaces any event waiting)
  const before = { ...w.cityEvents.cooldowns };
  for (const d of saved) if (d.id !== kind) w.cityEvents.cooldowns[d.id] = w.day + 1;
  w.cityEvents.nextDay = 0;
  w.tally.eventsOffered = EVENT_DEFS.find((d) => d.id === kind).welcome ? 0 : 1;   // the turn that asks for this kind's side
  const ev = drawEvent(w);
  w.cityEvents.cooldowns = before;
  if (!ev) return null;
  if (ev.kind !== kind) throw new Error(`offered ${ev.kind}, not ${kind}`);
  w.cityEvents.waiting = ev;
  return ev;
}

// Runs the day's hook n times, a day apart (the clock's own order: the hook, then the day counts on).
export function days(w, n, events = null) { for (let i = 0; i < n; i++) { eventDay(w, events); w.day += 1; } }
