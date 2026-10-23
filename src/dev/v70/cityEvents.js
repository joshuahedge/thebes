// Version 7.0, Track E's dev scenes (src/dev/v70/index.js joins them): city events. Track 0 left minimal worlds (the seed-11 sample Capital, the record
// as a new city's); Track E owns this file and refines them. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
//   v70-event      an event waiting, its card open. { kind } any of EVENT_KINDS (default: the quarry's strike); { poor: true } leaves the treasury unable to
//                  pay the price (the choice that costs gold is off, with its reason and Show me); { open: false } leaves the card shut (the alert list's entry
//                  and the Advice item show it); { sheet: 'minimap' | 'advice' | 'summary' } opens that sheet instead of the card
//   v70-festival   the Festival of Opet offered. { incense: true } puts 40 incense (Track T's good) in a storehouse, so the full festival's choice can be
//                  taken; without it the full festival is listed but off, short of incense, and the beer-only festival (without favour) is the one that can
// Every scene takes { quick } (no settling wait). The sample Capital is given what a kind needs (a quarry, beer, a temple...) through the sim's own commands.
import { allBuildings } from '../../sim/world.js';
import { place, canPlace } from '../../sim/commands.js';
import { offerFor, waitingEvent } from '../../sim/cityEvents.js';
import { stockOf } from '../../sim/court.js';
import { CITY_EVENTS, EVENT_KINDS } from '../../data/cityEvents.js';
import { INCENSE_GOOD } from '../../data/trade.js';
import { openSheet } from '../../ui/modes.js';
import { sampleCity, look, wait } from './base.js';

const recordSaid = (world) => `next ${world.cityEvents.nextDay}, ${world.cityEvents.waiting ? `waiting ${world.cityEvents.waiting.kind}` : 'none waiting'}`;

// A storehouse that takes beer (and incense), with room: the first the city has.
const storehouse = (world) => allBuildings(world).find((b) => b.type === 'storehouse') || null;

// The sample Capital, made ready for a kind: the court open, the Town day on record, what the kind reads in the stores and the works. Returns the world.
function ready(world, kind, options) {
  if (!Number.isInteger(world.splits.town)) world.splits.town = 0;
  world.cityEvents.nextDay = world.day + 5 * 30;
  world.court.awake = true;
  const store = storehouse(world);
  if (store) { if (stockOf(world, 'beer') < 60) store.store.beer = (store.store.beer || 0) + 80; }
  if (kind === 'quarry_strike' && !allBuildings(world).some((b) => b.type === 'quarry')) {
    for (let r = 4; r < 30; r++) {
      const x = Math.round(world.focus.x) + r, y = Math.round(world.focus.y) + 2;
      if (canPlace(world, 'quarry', x, y, { roadLater: true }).ok && place(world, 'quarry', x, y).ok) break;
    }
  }
  if (Number.isFinite(options.gold)) world.gold = options.gold;
  return world;
}

async function eventsScene(api, name, named, options) {
  const world = sampleCity(api, name, options);
  ready(world, named || 'quarry_strike', options);
  const kind = named || TROUBLE.find((k) => offerFor(world, k));
  const ev = kind ? offerFor(world, kind) : null;
  if (!ev) throw new Error(`devScene ${name}: this city cannot be offered ${named || 'any of ' + TROUBLE.join(', ')}`);
  world.cityEvents.waiting = ev;
  world.cityEvents.cooldowns[kind] = world.day + 18 * 30;
  world.tally.eventsOffered += 1;
  if (options.poor) world.gold = 0;
  const g = api.game();
  g.ui.refresh();
  const sheet = options.sheet || (options.open === false ? null : 'cityEvent');
  if (sheet) g.ui.store.set(openSheet(g.ui.store.get(), sheet));
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const w = waitingEvent(world);
  return `${name}: ${world.milestone}, ${recordSaid(world)}, ${w.def.welcome ? 'welcome' : 'troublesome'}, ${w.monthsLeft} months to answer, gold ${world.gold}`;
}

// The kinds the scene tries when none is named: a troublesome one whose choice costs gold, the first this city can be offered.
const TROUBLE = ['quarry_strike', 'workshop_quarrel', 'sandstorm', 'lost_caravan', 'rumour'];
export const eventScene = (api, options = {}) => eventsScene(api, 'v70-event', options.kind && EVENT_KINDS.includes(options.kind) ? options.kind : null, options);

// The festival: with { incense: true } 40 incense is put in a storehouse (a raw good the storehouse keeps).
export async function festivalScene(api, options = {}) {
  const world = sampleCity(api, 'v70-festival', options);
  if (options.incense === true) {
    const store = storehouse(world);
    if (store) store.store[INCENSE_GOOD] = Math.max(store.store[INCENSE_GOOD] || 0, 40);
  }
  ready(world, 'opet', options);
  world.danger.festivalDay = null;
  const ev = offerFor(world, 'opet');
  if (!ev) throw new Error('devScene v70-festival: this city cannot be offered the Festival of Opet');
  world.cityEvents.waiting = ev;
  world.tally.eventsOffered += 1;
  const g = api.game();
  g.ui.refresh();
  if (options.open !== false) g.ui.store.set(openSheet(g.ui.store.get(), 'cityEvent'));
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const w = waitingEvent(world);
  return `v70-festival: ${w.kind}, incense ${stockOf(world, INCENSE_GOOD)}, ${CITY_EVENTS.from} on, ${recordSaid(world)}`;
}
