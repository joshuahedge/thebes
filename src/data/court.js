// Stage 4.6, Court track (rulings 336-339): Pharaoh's favour, the capital's requests and the event cards, all arriving as letters.
// Track 0 laid out the shapes and the plan's decided numbers; the Court track owns this file and tunes it (recording any change as a
// ruling). A leaf data file: see src/data/river.js for what it may import.

// ── Favour (ruling 336) ──
// start: a new city's favour and a migrated one's; drift: points a month toward start; high / low: the thresholds (inclusive) for
// gifts and cheaper tribute, and for bigger raids and dearer tribute; giftEveryMonths: a gift at high favour this often;
// tributeHigh / tributeLow: the tribute multiplier at high and low favour (src/sim/court.js favourTributeFactor). Favour is never
// scored (ruling 344).
export const FAVOUR = { start: 50, min: 0, max: 100, drift: 1, high: 70, low: 30, giftEveryMonths: 6, tributeHigh: 0.8, tributeLow: 1.2 };

// ── Requests (ruling 337) ──
// firstYear: the first request comes in this game year; gapMonths, deadlineMonths, met, missed: [min, max] ranges drawn per request
// (met: favour gained; missed: favour lost, also on refusing). Amounts scale with the city's output and the difficulty (the Court
// track sets the rule).
export const REQUESTS = { firstYear: 2, gapMonths: [8, 14], deadlineMonths: [6, 12], met: [10, 15], missed: [10, 20], soldiersMonths: 6 };
// The request kinds, in the order a draw picks among them. 'soldiers' is served through the Armies track's interface
// (src/sim/armies.js: unitsAtHome, sendUnits), never by reading world.soldiers directly.
export const REQUEST_KINDS = ['goods', 'gold', 'food', 'soldiers'];

// ── Event cards (ruling 338) ──
// gapMonths: [min, max] between cards; none while a raid is under way. COURT_CARDS: { id, threat (off on Peaceful), choices:
// [{ id }, { id }] } in a fixed order; what each choice does lives in src/sim/court.js keyed by card and choice id, and its words in
// the Court track's text.js section. Cards that use another track's hook name it here: the lost herd calls src/sim/wildlife.js
// (herdArrives, herdLeaves) and the flood omen src/sim/flood.js (buyForecast).
export const CARDS = { gapMonths: [12, 18] };
export const COURT_CARDS = [];

// world.court: favour (FAVOUR.min..max); letters: the queue, oldest first, each { id, kind: 'request' | 'card' | 'gift' | ..., day,
// ... } (the Court track fills in each kind's fields); request: the active request (one at a time) or null; cards: the card
// history, [{ id, day, choice }] oldest first; nextRequestDay, nextCardDay: when the next request and card are due (null until the
// schedule starts); nextId: the next letter's id. The Court track may add fields inside; createWorld and the v6 -> v7 migration both
// start from this function.
export const newCourtState = () => ({ favour: FAVOUR.start, letters: [], request: null, cards: [], nextRequestDay: null, nextCardDay: null, nextId: 1 });
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isDay = (v) => v === null || Number.isInteger(v);
export const isCourtState = (c) => isRecord(c) && Number.isFinite(c.favour) && c.favour >= FAVOUR.min && c.favour <= FAVOUR.max
  && Array.isArray(c.letters) && c.letters.every(isRecord) && (c.request === null || isRecord(c.request))
  && Array.isArray(c.cards) && c.cards.every(isRecord) && isDay(c.nextRequestDay) && isDay(c.nextCardDay) && Number.isInteger(c.nextId) && c.nextId >= 1;

// ── The Court track's rows in the Stage 4.6 lists (src/data/s46.js joins them) ──
// Tallies: requests met and missed (refused counts as missed), gifts received, letters read, cards answered.
export const COURT_TALLY = ['requestsMet', 'requestsMissed', 'gifts', 'lettersRead', 'cardsPlayed'];
export const COURT_FIRSTS = [];
export const COURT_ACHIEVEMENTS = [];
export const COURT_TIPS = [];

// Salts for hash2(a, b, (world.seed + COURT_SALT.x) | 0): a = the request's or card's number (or the letter id), b = the day or month.
// Registered by Track 0 (unique across the game: tests/stage46/contract/salts.test.js).
export const COURT_SALT = {
  requestGap: 4641, requestKind: 4642, requestAmount: 4643, requestGood: 4644, deadline: 4645, reward: 4646, favourMet: 4647,
  favourMissed: 4648, cardGap: 4649, cardPick: 4650, cardAmount: 4651, gift: 4652, giftKind: 4653, giftAmount: 4654, giftGood: 4655,
  spare1: 4656, spare2: 4657,
};
