// Version 6.0 (Track 0): the tracks' daily, monthly, alert and advice hooks, called from src/sim/clock.js (tickDay, runMonth),
// src/sim/alerts.js (alertsFor) and src/sim/advice.js (cityAdvice). Each call is to a function in a track-owned file (demands.js: A;
// hazards.js: B1), so a track fills in its own function and never edits this file, clock.js, alerts.js or advice.js's cityAdvice.
// Order: the court's demands, then the dangers.
import { demandDay, demandMonth, demandAlerts, demandItems } from './demands.js';
import { hazardDay, hazardMonth, hazardAlerts, hazardItems } from './hazards.js';

// After the day's fires, raids, illness, crime and the Stage 4.6 tracks (tickDay), before the day counts on.
export function v60Day(world, events = null) {
  demandDay(world, events);
  hazardDay(world, events);
}

// At the month's end (runMonth), after the yearly quota and before mood, milestones and the alerts.
export function v60Month(world, events = null) {
  demandMonth(world, events);
  hazardMonth(world, events);
}

// The tracks' alerts, after the Stage 4.6 tracks' (alertsFor).
export const v60Alerts = (world) => [...demandAlerts(world), ...hazardAlerts(world)];

// The tracks' advice items, pushed onto cityAdvice's list before it is ranked.
export function v60Advice(world, alerts, out) {
  demandItems(world, alerts, out);
  hazardItems(world, alerts, out);
}
