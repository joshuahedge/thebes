// Version 6.0, Track A (rulings 640-679): the court's demands with deadlines, and the reign's end. Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) fixed the names and shapes here; Track A implements the functions marked
// STUB (each does nothing until then, so a city plays as before) and may add private helpers. Draws are hash2(a, b, (world.seed +
// REIGN_SALT.x) | 0) (src/data/reign.js).
//
// State: world.demands = { open, nextDay, nextId, log } and world.reign = { greatWork, won, closed } (src/data/reign.js has the shapes).
import { DAYS_PER_MONTH } from './time.js';

// The demands the court has open, oldest first, each the record in world.demands.open with monthsLeft (whole game months to its
// deadline, rounded up; 0 once due): what the court sheet, the alert row and the advice read (ruling 612: every demand says its reward
// and its failure cost before it is accepted, so Track A keeps both on the record). A copy: changing it changes nothing.
export const courtDemands = (world) => world.demands.open.map((d) => ({ ...d, monthsLeft: Math.max(0, Math.ceil((d.due - world.day) / DAYS_PER_MONTH)) }));

// The great work's building (world.reign.greatWork), or null while none is founded (or it is gone).
export const greatWorkOf = (world) => (world.reign.greatWork === null ? null : world.buildings[world.reign.greatWork] || null);

// Whether the reign is won (the great work finished): the city plays on after.
export const reignWon = (world) => world.reign.won !== null;

// STUB (Track A): a day of the demands (src/sim/v60.js v60Day): a deadline passing, a demand met.
export function demandDay(world, events = null) {}

// STUB (Track A): the month's end (v60Month): a new demand offered (from Town, about once a game year), the great work's stage.
export function demandMonth(world, events = null) {}

// STUB (Track A): the demands' alerts (src/sim/alerts.js through v60Alerts): codes are Track A's, words ALERT_TEXT in its text.js section.
export const demandAlerts = (world) => [];

// STUB (Track A): the demands' advice items (cityAdvice through v60Advice), kind 'demand' (ADVICE_KINDS), weights in ADVICE.
export function demandItems(world, alerts, out) {}
