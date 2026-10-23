// Version 7.0 (Track 0): the tracks' daily, monthly, alert and advice hooks, called from src/sim/clock.js (tickDay, runMonth),
// src/sim/alerts.js (alertsFor) and src/sim/advice.js (cityAdvice), after Version 6.0's. Each call is to a function in a track-owned file
// (cityEvents.js: E; tradeRules.js: T; adviceFixes.js: A), so a track fills in its own function and never edits this file, clock.js or
// alerts.js. Trade's caravans keep their own month step (src/sim/trade.js tradeMonth, Track T's).
import { eventDay, eventMonth, eventAlerts, eventItems } from './cityEvents.js';
import { tradeAlerts } from './tradeRules.js';
import { adviceFixItems } from './adviceFixes.js';

// After Version 6.0's day (the demands, the dangers), before the day counts on.
export function v70Day(world, events = null) {
  eventDay(world, events);
}

// At the month's end, after Version 6.0's month and before mood, milestones and the alerts.
export function v70Month(world, events = null) {
  eventMonth(world, events);
}

// The tracks' alerts, after Version 6.0's: trade's, then the waiting event's.
export const v70Alerts = (world) => [...tradeAlerts(world), ...eventAlerts(world)];

// The tracks' advice items, pushed onto cityAdvice's list before it is ranked: the waiting event (E), then trade's (A).
export function v70Advice(world, alerts, out) {
  eventItems(world, alerts, out);
  adviceFixItems(world, alerts, out);
}
