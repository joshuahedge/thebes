// Stage 4.6, Court track (rulings 336-339, 370-379): the court's favour, the capital's requests and the event cards, all arriving as
// letters. Track 0 laid out the shapes and the plan's decided numbers; the Court track owns this file and tunes it (recording any
// change as a ruling). A leaf data file: see src/data/river.js for what it may import (this one imports nothing).

// ── Favour (ruling 336) ──
// start: a new city's favour and a migrated one's; drift: points a month toward start; high / low: the thresholds (inclusive) for
// gifts and cheaper tribute, and for bigger raids and dearer tribute; giftEveryMonths: a gift at high favour this often;
// tributeHigh / tributeLow: the tribute multiplier at high and low favour (src/sim/court.js favourTributeFactor); raidStep: one size
// step at low favour is this share of the raid's size, at least one raider more and never past RAIDS.maxSize (favourRaidSize, ruling
// 370). Favour is never scored (ruling 344).
export const FAVOUR = { start: 50, min: 0, max: 100, drift: 1, high: 70, low: 30, giftEveryMonths: 6, tributeHigh: 0.8, tributeLow: 1.2, raidStep: 0.25 };

// ── When the court starts writing (ruling 371) ──
// from: the milestone the court needs; afterGoal: the goal whose completion (the trading post and a route) opens it; fallback: the
// milestone at which it opens anyway, for a city that never opened a route; guidedDelayDays: the guided letter comes this long after
// the court opens (and never before REQUESTS.firstYear); reminderMonths: a read request that is still open raises the alert row again
// this many months before its deadline; logMax: how many past letters the court sheet keeps.
export const COURT = { from: 'market_town', afterGoal: 'trade_route', fallback: 'city', guidedDelayDays: 10, reminderMonths: 2, logMax: 12 };

// ── Requests (ruling 337) ──
// firstYear: the first request comes in this game year; gapMonths, deadlineMonths, met, missed: [min, max] ranges drawn per request
// (met: favour gained; missed: favour lost, also on refusing); soldiersMonths: how long sent units stay at the capital.
// amounts: how much is asked, per kind. goods and food: [lo, hi] months of the city's output of the good (a working producer's
// monthly output, or an open route's yearly quota / 12 for a good it only trades for), rounded to `step`, at least `min`; gold: [lo,
// hi] months of taxes, at most `reserve` of the treasury; soldiers: [lo, hi] share of the units at home, at least 1, leaving at least
// 1 at home. Every amount but soldiers' is multiplied by the difficulty's cost (DIFFICULTIES in src/data/difficulty.js), so an easier
// level asks less and Hard asks more.
// rewards: gold paid when met: goods and food by `share` of the asked amount's value (GOOD_VALUE), gold requests by `gold` of the amount,
// soldiers `soldier` gold each; at least `min`.
// guided: the one easy letter after the trading goal (ruling 371): share of the stock it may be (of a household or raw good with at least
// 2 x min in store, else of a food with at least foodMin), its deadline, favour met and lost, its reward; a city with no stock to ask for is
// asked gold instead (goldShare of the treasury, goldMax, goldMin).
export const REQUESTS = {
  firstYear: 2, gapMonths: [8, 14], deadlineMonths: [6, 12], met: [10, 15], missed: [10, 20], soldiersMonths: 6,
  amounts: {
    goods: { months: [2, 4], min: 20, step: 5 },
    food: { months: [2, 4], min: 40, step: 10 },
    gold: { months: [1, 2], min: 100, step: 10, reserve: 0.5 },
    soldiers: { share: [0.25, 0.5] },
  },
  rewards: { share: [0.25, 0.5], gold: [0.2, 0.4], soldier: 50, min: 20 },
  guided: { stockShare: 0.4, min: 10, foodMin: 60, step: 5, deadlineMonths: 12, met: 10, missed: 5, reward: 50, goldShare: 0.1, goldMax: 100, goldMin: 40, goldStep: 10 },
};
// The request kinds, in the order a draw picks among them. 'soldiers' is served through the Armies track's interface
// (src/sim/armies.js: unitsAtHome, sendUnits), never by reading world.soldiers directly.
export const REQUEST_KINDS = ['goods', 'gold', 'food', 'soldiers'];

// What a unit of a good is worth, in gold, for sizing rewards and the caravan's price (the trade partners' prices where they have
// one). Every good that can be asked for needs a row (a test keeps them in step with GOODS, materials apart).
export const GOOD_VALUE = {
  grain: 1, figs: 3, game: 3, fish: 3, pottery: 8, beer: 10, linen: 14, jewellery: 20, clay: 2, barley: 3, flax: 3, gems: 9,
};

// ── Gifts at high favour (ruling 336) ──
// A gift every FAVOUR.giftEveryMonths months while favour is at FAVOUR.high or more: gold (months of taxes) or a household good
// (months of its output, else `min`), seeded; goods that find no room in a store come as gold. Rounded to `step`.
export const GIFTS = { gold: { months: [1, 2], min: 50, step: 10 }, goods: { months: [1, 2], min: 20, step: 5 } };

// ── Event cards (ruling 338) ──
// gapMonths: [min, max] between cards; none while a raid is under way. COURT_CARDS: { id, threat (off on Peaceful), choices:
// [{ id }, { id }] } in a fixed order; what each choice does lives in src/sim/court.js (cardChoices, one list of effects that is both
// worded and carried out) keyed by card and choice id, and its words in the Court track's text.js section. Cards that use another
// track's hook name it here: the lost herd calls src/sim/wildlife.js (herdArrives, herdLeaves) and the flood omen src/sim/flood.js
// (buyForecast); a card whose hook cannot act is not drawn.
export const CARDS = { gapMonths: [12, 18], retryDays: 30, raidRetryDays: 5 };
export const COURT_CARDS = [
  { id: 'sickness', threat: true, choices: [{ id: 'quarantine' }, { id: 'physicians' }] },
  { id: 'festival', threat: false, choices: [{ id: 'hold' }, { id: 'decline' }] },
  { id: 'caravan', threat: false, choices: [{ id: 'buy' }, { id: 'pass' }] },
  { id: 'deserters', threat: false, choices: [{ id: 'settle' }, { id: 'drive_off' }] },
  { id: 'temple_gift', threat: false, choices: [{ id: 'donate' }, { id: 'keep' }] },
  { id: 'lost_herd', threat: false, choices: [{ id: 'welcome' }, { id: 'send_away' }] },
  { id: 'craftsmen_dispute', threat: false, choices: [{ id: 'raise_wages' }, { id: 'let_it_stand' }] },
  { id: 'flood_omen', threat: false, choices: [{ id: 'pay_priests' }, { id: 'pass' }] },
];
export const COURT_CARD_IDS = COURT_CARDS.map((c) => c.id);

// The numbers behind each card's choices (every sentence on a card is built from these and from the sim's own rules).
//   sickness: feePerHome: physicians' fee per sick home (times the difficulty's cost, at least feeMin); quarantineDays: how long the
//     district's workplaces close (their workers stay home). Quarantine speeds the cure by HEALTH.coverFactor (src/data/health.js).
//   festival: declineFavour: favour lost by declining. Holding one is the temple festival (FESTIVAL in src/data/raids.js: its price,
//     mood and length), and so counts as the year's festival (ruling 372).
//   caravan: goods: the rare goods offered (in the order tried); units, discount: [lo, hi] drawn (discount: share of GOOD_VALUE).
//   deserters: band: [lo, hi] people; settleFavour (negative), driveFavour.
//   temple_gift: share: of the good's stock; min: the fewest units; stockMin: the stock the card needs; donateFavour.
//   lost_herd: sendFavour: favour for sending a herd of yours to the capital's hunting grounds.
//   craftsmen_dispute: raiseShare: of last month's wages, at least raiseMin, paid a month for raiseMonths months; strikeDays: how long
//     the workshop stands idle if the dispute is left to run.
//   flood_omen: price: the priests' fee (times the difficulty's cost).
export const CARD_NUMBERS = {
  sickness: { feePerHome: 20, feeMin: 30, quarantineDays: 30 },
  festival: { declineFavour: 3 },
  caravan: { goods: ['gems', 'jewellery', 'linen'], units: [20, 40], discount: [0.5, 0.7], roomMin: 10 },
  deserters: { band: [4, 10], settleFavour: -5, driveFavour: 4, roomMin: 4 },
  temple_gift: { share: 0.25, min: 10, stockMin: 40, donateFavour: 8 },
  lost_herd: { sendFavour: 6 },
  craftsmen_dispute: { raiseShare: 0.1, raiseMin: 10, raiseMonths: 12, strikeDays: 30 },
  flood_omen: { price: 80 },
};

// world.court: favour (FAVOUR.min..max); letters: the queue, oldest first, each { id, kind: 'request' | 'card', day, read, ... } (a
// card's letter also carries card: its id, and args: what it drew when it came); request: the active request (one at a time) or
// null, { id (its letter's), kind, good, amount, day, due, gold (reward), met, missed, guided }; cards: the card history, [{ id, day,
// choice }] oldest first; nextRequestDay, nextCardDay: when the next request and card are due (null until the court opens); nextId:
// the next letter's id. Added by the Court track: awake (the court has opened), guided ('pending' once it opens, 'issued' when its
// letter has gone out, 'answered' once that is met, refused or missed), nextGiftDay (a gift at high favour, or null), effects (what
// choices left running: { kind: 'pause', ids, until } and { kind: 'wages', perMonth, left }), log (the past letters, newest last, at
// most COURT.logMax: { day, kind: 'request' | 'card' | 'gift', ... }), lastCard (the last card drawn, so it does not come twice in
// a row). createWorld and the v6 -> v7 migration both start from this function.
export const newCourtState = () => ({
  favour: FAVOUR.start, letters: [], request: null, cards: [], nextRequestDay: null, nextCardDay: null, nextId: 1,
  awake: false, guided: null, nextGiftDay: null, effects: [], log: [], lastCard: null,
});
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isDay = (v) => v === null || Number.isInteger(v);
const GUIDED_STATES = [null, 'pending', 'issued', 'answered'];
export const isCourtState = (c) => isRecord(c) && Number.isFinite(c.favour) && c.favour >= FAVOUR.min && c.favour <= FAVOUR.max
  && Array.isArray(c.letters) && c.letters.every(isRecord) && (c.request === null || isRecord(c.request))
  && Array.isArray(c.cards) && c.cards.every(isRecord) && isDay(c.nextRequestDay) && isDay(c.nextCardDay) && Number.isInteger(c.nextId) && c.nextId >= 1
  && (c.awake === undefined || typeof c.awake === 'boolean') && (c.guided === undefined || GUIDED_STATES.includes(c.guided))
  && (c.nextGiftDay === undefined || isDay(c.nextGiftDay)) && (c.effects === undefined || (Array.isArray(c.effects) && c.effects.every(isRecord)))
  && (c.log === undefined || (Array.isArray(c.log) && c.log.every(isRecord)));

// ── The Court track's rows in the Stage 4.6 lists (src/data/s46.js joins them) ──
// Tallies: requests met and missed (refused counts as missed), gifts received, letters read, cards answered.
export const COURT_TALLY = ['requestsMet', 'requestsMissed', 'gifts', 'lettersRead', 'cardsPlayed'];
// The first letter, as a first; and one achievement for answering the court well (it never pays gold, spec 3.8).
export const COURT_FIRSTS = [{ id: 'first_letter', check: { kind: 'tally', key: 'lettersRead', n: 1 } }];
export const COURT_ACHIEVEMENTS = [{ id: 'friend_of_the_court', measure: { kind: 'tally', key: 'requestsMet', n: 5 } }];
export const COURT_TIPS = [{ id: 'court_letters', trigger: 'courtLetter', priority: false }];

// Salts for hash2(a, b, (world.seed + COURT_SALT.x) | 0): a = the request's or card's number (or the letter id), b = the day or month.
// Registered by Track 0 (unique across the game: tests/stage46/contract/salts.test.js); cardGood is the Court track's own, inside its range.
export const COURT_SALT = {
  requestGap: 4641, requestKind: 4642, requestAmount: 4643, requestGood: 4644, deadline: 4645, reward: 4646, favourMet: 4647,
  favourMissed: 4648, cardGap: 4649, cardPick: 4650, cardAmount: 4651, gift: 4652, giftKind: 4653, giftAmount: 4654, giftGood: 4655,
  spare1: 4656, spare2: 4657, cardGood: 4658,
};
