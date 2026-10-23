// Version 7.0, Track E (rulings 900-929): city events. Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left
// stubs that draw nothing, so a city plays exactly as in 6.0.1 until Track E fills them; Track E owns this file. The record is world.cityEvents
// (src/data/cityEvents.js newEventState; not world.events: `events` is every sim function's per-tick list). Deterministic: draws come from the world's seed through EVENT_SALT (src/data/cityEvents.js), never
// Math.random or the clock; no memo may outlive one tick unless its key covers every input it reads (the card calls these too).
//
//   drawEvent(world)                   -> null, or the event to offer today: at least { kind, day, due } (pure: eventDay stores it)
//   eventChoices(world, event)         -> at most three choices, each at least { id, label key, gold (its cost, 0 for none), ok, reason
//                                         (why not, or null), default (true on exactly one, which never costs gold) }
//   applyChoice(world, event, choiceId, events) -> { ok, reason, warnings }; on ok the event's effects are applied through the existing sim
//                                         functions and the record cleared
// Hooks (src/sim/v70.js calls them; Track E never edits clock.js, alerts.js or advice.js):
//   eventDay(world, events), eventMonth(world, events), eventAlerts(world) -> [alert], eventItems(world, alerts, out) (the waiting event's
//   Advice item, ruling 866)

export const drawEvent = () => null;
export const eventChoices = () => [];
export const applyChoice = () => ({ ok: false, reason: 'no_event', warnings: [] });

export function eventDay() {}
export function eventMonth() {}
export const eventAlerts = () => [];
export function eventItems() {}
