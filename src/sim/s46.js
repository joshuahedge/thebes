// Stage 4.6 (Track 0): the tracks' daily, monthly and alert hooks, called from src/sim/clock.js (tickDay, runMonth) and
// src/sim/alerts.js (alertsFor). Each call is to a function in a track-owned file (flood.js and wildlife.js: River; court.js: Court;
// armies.js: Armies), so a track fills in its own function and never edits this file, clock.js or alerts.js. The Map track has no
// tick; the Wonders track works inside src/sim/monuments.js (monumentDay, monumentMonth), which it owns.
//
// Order: the flood first (its season and level drive the harvest and the herds), then the herds, then the units' return (before the
// court reads them for a soldiers request), then the court.
import { floodDay, floodMonth, floodAlerts } from './flood.js';
import { wildlifeDay, wildlifeMonth, wildlifeAlerts } from './wildlife.js';
import { armyDay, armyMonth, armyAlerts } from './armies.js';
import { courtDay, courtMonth, courtAlerts } from './court.js';

// After the day's fires, raids, illness and crime (tickDay), before the day counts on.
export function s46Day(world, events = null) {
  floodDay(world, events);
  wildlifeDay(world, events);
  armyDay(world, events);
  courtDay(world, events);
}

// At the month's end (runMonth), after the raids' month and before mood, milestones and the alerts.
export function s46Month(world, events = null) {
  floodMonth(world, events);
  wildlifeMonth(world, events);
  armyMonth(world, events);
  courtMonth(world, events);
}

// The tracks' alerts, after the threats' and the monuments' (alertsFor).
export const s46Alerts = (world) => [...floodAlerts(world), ...wildlifeAlerts(world), ...armyAlerts(world), ...courtAlerts(world)];
