// Version 7.0, Track E (rulings 900-929): city events, one or two a year from Town, half welcome and half troublesome, each one card with at
// most three choices. Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) laid out the record; Track E owns this
// file, adds the kinds and their numbers, and may add fields inside the record (never remove these). A leaf data file: it imports nothing
// (src/data/v70.js joins its lists into the shared ones).

const isRec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ── The kinds ──
// Each kind's id, in the order the pool lists them (Track E: about 16, gated by rank, each with at most three choices, a duration in
// months and a stated default that never costs gold). Empty until Track E fills it, so nothing is drawn.
export const EVENT_KINDS = [];

// ── The record (world.cityEvents, world version 10; ruling 858) ──
//   nextDay    the first day the next event may be drawn (an integer; 0 for a new city: the rank gate and drawEvent's own rules decide)
//   cooldowns  kind -> the first day that kind may come again
//   waiting    null, or the one event waiting for an answer: at least { kind, day (offered), due (the day its default is taken) }; Track E
//              adds what it needs (its choices' figures as offered, so the card never changes under the player)
// createWorld calls newEventState(); the v9 -> v10 migration newEventState(the save's day + EVENT_V9_WAIT), so a city from before 7.0 sees
// no event for a game year after it is loaded (ruling 856).
export const EVENT_V9_WAIT = 360;
export const newEventState = (nextDay = 0) => ({ nextDay, cooldowns: {}, waiting: null });
const isWaiting = (e) => e === null || (isRec(e) && typeof e.kind === 'string' && Number.isInteger(e.day) && Number.isInteger(e.due));
export const isEventState = (s) => isRec(s) && Number.isInteger(s.nextDay) && isRec(s.cooldowns) && Object.values(s.cooldowns).every(Number.isInteger)
  && isWaiting(s.waiting);

// Salts for hash2(a, b, (world.seed + EVENT_SALT.x) | 0) or createRng((world.seed ^ EVENT_SALT.x) >>> 0), Track E's range 6121-6149
// (tests/v70/contract keeps every salt unique). Rename the spares as they are used; never reuse a number.
export const EVENT_SALT = { spare1: 6121, spare2: 6122, spare3: 6123 };

// Track E's rows for the shared lists (src/data/v70.js joins them): tallies, firsts, achievements and tips (words in Track E's text.js section).
export const CITY_EVENT_TALLY = [];
export const CITY_EVENT_FIRSTS = [];
export const CITY_EVENT_ACHIEVEMENTS = [];
export const CITY_EVENT_TIPS = [];
