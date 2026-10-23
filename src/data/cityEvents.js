// Version 7.0, Track E (rulings 900-929): city events, one or two a year from Town, half welcome and half troublesome, each one card with at
// most three choices. Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) laid out the record; Track E owns this
// file, adds the kinds and their numbers, and may add fields inside the record (never remove these). A leaf data file: it imports nothing
// (src/data/v70.js joins its lists into the shared ones).

const isRec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ── When events come (ruling 900) ──
// from: no event before this rank, and never in the guided first city. firstMonths, firstJitter: the first event comes firstMonths (plus 0 to
// firstJitter more, seeded) months after the city first became a Town, so a new town is never met by an event on its first day. gapMonths: from one
// offer to the next, [min, max] months, drawn: one or two a year. dangerWithin, courtWithin: no event is offered while a raid is due or warned
// within dangerWithin days, nor while a court deadline (a demand, a request, the yearly tribute or the due) is under courtWithin days away.
// Welcome and troublesome kinds take turns (the offer's number's parity), so over a few years they are half and half.
export const CITY_EVENTS = {
  from: 'town', firstMonths: 6, firstJitter: 4, gapMonths: [5, 9], dangerWithin: 30, courtWithin: 30,
  advice: { welcome: 1.5, trouble: 3, soon: 2 },   // Advice weights (points: one home held back one tier is 1); soon is added in the last month
};

// ── The kinds ──
// id; welcome (true: a welcome kind) or troublesome; from: the rank it first comes at; months: how long it waits for an answer before the stated default is
// taken (game months); cooldown: the months before the same kind may come again (ruling 901); needs: what the city must have for it to be drawn at all,
// each a flag the sim reads (court: the court has opened, so favour means something; threats: not Peaceful: disease and crime are on); choices: the ids
// of its (at most three) choices, in the order the card lists them; default: the one taken if nothing is chosen, which never costs gold. What each choice
// does is a list of effects (src/sim/cityEvents.js eventChoices), words in src/ui/text.js CITY_EVENT_TEXT.
export const EVENT_DEFS = [
  { id: 'opet', welcome: true, from: 'town', months: 3, cooldown: 24, needs: [], choices: ['full', 'small', 'decline'], default: 'decline' },
  { id: 'envoy', welcome: true, from: 'market_town', months: 3, cooldown: 18, needs: ['court'], choices: ['feast', 'greet'], default: 'greet' },
  { id: 'bumper', welcome: true, from: 'town', months: 3, cooldown: 18, needs: [], choices: ['sell', 'store'], default: 'store' },
  { id: 'hoard', welcome: true, from: 'town', months: 3, cooldown: 24, needs: [], choices: ['bless', 'keep'], default: 'keep' },
  { id: 'scribes', welcome: true, from: 'market_town', months: 3, cooldown: 24, needs: ['court'], choices: ['forgive', 'collect'], default: 'collect' },
  { id: 'healer', welcome: true, from: 'town', months: 2, cooldown: 18, needs: ['threats'], choices: ['cure', 'send_away'], default: 'send_away' },
  { id: 'craftsman', welcome: true, from: 'market_town', months: 3, cooldown: 24, needs: [], choices: ['settle', 'pass'], default: 'pass' },
  { id: 'pilgrims', welcome: true, from: 'market_town', months: 3, cooldown: 24, needs: [], choices: ['lodge', 'camp'], default: 'camp' },
  { id: 'sandstorm', welcome: false, from: 'town', months: 2, cooldown: 18, needs: [], choices: ['sweep', 'weather'], default: 'weather' },
  { id: 'fever', welcome: false, from: 'town', months: 2, cooldown: 24, needs: ['threats'], choices: ['gate', 'let_in'], default: 'let_in' },
  { id: 'rumour', welcome: false, from: 'market_town', months: 2, cooldown: 24, needs: ['court'], choices: ['gift', 'ignore'], default: 'ignore' },
  { id: 'thief', welcome: false, from: 'market_town', months: 2, cooldown: 18, needs: ['threats'], choices: ['watch', 'let_run'], default: 'let_run' },
  { id: 'feud', welcome: false, from: 'market_town', months: 2, cooldown: 24, needs: ['threats'], choices: ['send_watch', 'let_be'], default: 'let_be' },
  { id: 'quarry_strike', welcome: false, from: 'city', months: 2, cooldown: 24, needs: [], choices: ['raise_wages', 'strike'], default: 'strike' },
  { id: 'workshop_quarrel', welcome: false, from: 'town', months: 2, cooldown: 24, needs: [], choices: ['settle_it', 'quarrel'], default: 'quarrel' },
  { id: 'lost_caravan', welcome: false, from: 'market_town', months: 2, cooldown: 24, needs: [], choices: ['search', 'write_off'], default: 'write_off' },
];
export const EVENT_KINDS = EVENT_DEFS.map((d) => d.id);

// ── The numbers behind each kind (ruling 902) ──
// A price in gold is max(min, share of last month's taxes) times the difficulty's cost, rounded to `step` (src/sim/cityEvents.js feeOf), so a bigger city is
// asked for more. A gain is never scaled by the difficulty.
//   fee { min, share, step }       the gold price of the choice that costs gold (every kind has at most one)
//   opet: beer { min, per, max, step }: the beer a full festival takes, a share `per` of the people, within [min, max]; small: the beer-only festival takes
//     this share of it; incense: the units the full festival takes; favour: what the full festival adds; beerMin: the stock the kind needs to be drawn
//   envoy: favour for the feast and for the greeting. bumper: surplus { months, min, max, step } of the month's grain, price: gold a unit sells for.
//   hoard: gold { min, share, step }. scribes: dues { min, share, step }, favour: forgiving them. healer: perHome: fee per ill home, homesMin.
//   craftsman: people [lo, hi], roomMin. pilgrims: people [lo, hi], roomMin, offering { min, share, step }.
//   sandstorm: lossShare of the stock of the good it spoils (the good with the most gold in the stores), min, step, stockMin; sweepKeeps: the share of that
//     loss a sweeping crew saves, price: the fee as a share of what it saves.
//   fever: homes [lo, hi], perHome: the physicians' price per home kept well. rumour: favour lost.
//   thief: lossMin, lossMax: units taken, coveredShare: the share taken when a staffed police post reaches the store, stockMin.
//   feud: thefts: bad-feeling days added to the mood row (CRIME_MOOD: each counts a theft), homesMin. quarry_strike, workshop_quarrel: days the works stop.
//   lost_caravan: share of the good's stock, min, step, stockMin.
export const EVENT_NUMBERS = {
  opet: { beer: { min: 20, per: 0.1, max: 60, step: 5 }, small: 0.5, incense: 10, favour: 4, beerMin: 20 },
  envoy: { fee: { min: 40, share: 0.4, step: 10 }, feast: 6, greet: 2 },
  bumper: { surplus: { months: 1.5, min: 30, max: 200, step: 10 }, price: 2, roomMin: 30 },
  hoard: { gold: { min: 60, share: 0.8, step: 10 } },
  scribes: { dues: { min: 50, share: 0.6, step: 10 }, favour: 4 },
  healer: { perHome: 15, feeMin: 30, step: 10, homesMin: 2 },
  craftsman: { fee: { min: 60, share: 0.5, step: 10 }, people: [4, 8], roomMin: 6 },
  pilgrims: { fee: { min: 50, share: 0.4, step: 10 }, people: [3, 6], roomMin: 4, offering: { min: 20, share: 0.15, step: 10 } },
  sandstorm: { fee: { min: 20, share: 0, step: 10 }, lossShare: 0.2, min: 10, step: 5, stockMin: 40, sweepKeeps: 0.5, price: 0.8 },
  fever: { homes: [2, 3], perHome: 15, feeMin: 30, step: 10, residentsMin: 4 },
  rumour: { fee: { min: 50, share: 0.5, step: 10 }, favour: 5 },
  thief: { fee: { min: 30, share: 0.2, step: 10 }, loss: [10, 20], step: 5, coveredShare: 0.5, stockMin: 20 },
  feud: { fee: { min: 40, share: 0.3, step: 10 }, thefts: 2, homesMin: 8 },
  quarry_strike: { fee: { min: 60, share: 0.3, step: 10 }, perQuarry: 30, days: 60 },
  workshop_quarrel: { fee: { min: 40, share: 0.2, step: 10 }, perShop: 20, days: 45, types: ['potter', 'brewery', 'weaver', 'jeweller'] },
  lost_caravan: { fee: { min: 30, share: 0.2, step: 10 }, lossShare: 0.25, min: 10, step: 5, stockMin: 20 },
};

// ── The record (world.cityEvents, world version 10; ruling 858) ──
//   nextDay    the first day the next event may be drawn (an integer; 0 for a new city: the rank gate and drawEvent's own rules decide)
//   cooldowns  kind -> the first day that kind may come again
//   waiting    null, or the one event waiting for an answer: { kind, day (offered), due (the day its default is taken), id (the offer's number), figs (the
//              figures it was offered with: its price, its amounts, the buildings it is about: so the card never changes under the player) }
// createWorld calls newEventState(); the v9 -> v10 migration newEventState(the save's day + EVENT_V9_WAIT), so a city from before 7.0 sees
// no event for a game year after it is loaded (ruling 856).
export const EVENT_V9_WAIT = 360;
export const newEventState = (nextDay = 0) => ({ nextDay, cooldowns: {}, waiting: null });
const isWaiting = (e) => e === null || (isRec(e) && typeof e.kind === 'string' && Number.isInteger(e.day) && Number.isInteger(e.due)
  && (e.id === undefined || Number.isInteger(e.id)) && (e.figs === undefined || isRec(e.figs)));
export const isEventState = (s) => isRec(s) && Number.isInteger(s.nextDay) && isRec(s.cooldowns) && Object.values(s.cooldowns).every(Number.isInteger)
  && isWaiting(s.waiting);

// Salts for hash2(a, b, (world.seed + EVENT_SALT.x) | 0) or createRng((world.seed ^ EVENT_SALT.x) >>> 0), Track E's range 6121-6149
// (tests/v70/contract keeps every salt unique). Rename the spares as they are used; never reuse a number.
//   first: the first event's jitter; gap: months to the next; kind: which kind of the pool; amount: how much (people, homes, goods); pick: which building
export const EVENT_SALT = { first: 6121, gap: 6122, kind: 6123, amount: 6124, pick: 6125, spare1: 6126, spare2: 6127 };

// Track E's rows for the shared lists (src/data/v70.js joins them): tallies, firsts, achievements and tips (words in Track E's text.js section).
// Tallies: events offered, answered by a choice, and left to take their default.
export const CITY_EVENT_TALLY = ['eventsOffered', 'eventsAnswered', 'eventsLapsed'];
export const CITY_EVENT_FIRSTS = [{ id: 'first_event', check: { kind: 'tally', key: 'eventsAnswered', n: 1 } }];
export const CITY_EVENT_ACHIEVEMENTS = [];
export const CITY_EVENT_TIPS = [{ id: 'city_events', trigger: 'cityEvent', priority: false }];   // the first event is offered
