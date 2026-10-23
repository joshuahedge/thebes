// Trade (spec 4.15, tunable). A partner opens once the city reaches its milestone and the player pays routeCost
// (scaled by difficulty: routeCostOf in src/sim/costs.js). buys: what it pays for the player's goods; sells: what it
// asks for its own; each good with a yearly quota, a quarter of which each caravan carries. A new route's first
// caravan brings a gift of the first good on its sale list. A good with `from` is listed only once the city has reached
// that milestone (Stage 4: Memphis's stone from City, ruling 255; Track A gates it in src/sim/trade.js); no partner buys
// stone or bricks.
export const PARTNERS = {
  memphis: {
    name: 'Memphis', milestone: 'market_town', routeCost: 300,
    buys: { grain: { price: 1, quota: 300 }, pottery: { price: 8, quota: 200 }, beer: { price: 10, quota: 160 } },
    sells: { clay: { price: 2, quota: 300 }, figs: { price: 3, quota: 200 }, barley: { price: 3, quota: 200 }, stone: { price: 6, quota: 200, from: 'city' } },
    gift: { good: 'clay', n: 40 },
  },
  byblos: {
    name: 'Byblos', milestone: 'great_city', routeCost: 600,
    buys: { pottery: { price: 8, quota: 120 }, linen: { price: 14, quota: 120 }, jewellery: { price: 20, quota: 80 } },
    sells: { flax: { price: 3, quota: 160 }, gems: { price: 9, quota: 100 }, beer: { price: 14, quota: 100 } },
    gift: { good: 'flax', n: 40 },
  },
};

export const CARAVAN_EVERY_MONTHS = 3;   // a caravan from each open route every three game-months
export const PRICE_DRIFT = 0.1;          // prices drift by up to ±10% a year (seeded)
export const TRADE_REACH = 16;           // road tiles from the trading post to the stores its caravans use
export const ARBITRAGE_MARGIN = 1.25;    // no partner sells a good for less than this times what any partner pays

// ── Version 7.0 (Track 0 contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md; Track T owns this whole file) ──
// This file stays a leaf: it imports nothing (src/data/v70.js joins its lists into the shared ones, and goods.js and buildings.js read them).

// Reserved ids (ruling 859): the Quay, a 2x1 building on a riverbank tile with a road, and incense, the good only Punt sells and only
// festivals use. Track T adds their rows to TRADE_BUILDINGS and TRADE_GOODS below with everything a row needs elsewhere (art, fire risk,
// desirability, a raid's hit points, the cart's load, the court's value, the unlock), so each arrives whole.
export const QUAY_TYPE = 'quay';
export const QUAY_SIZE = { w: 2, d: 1 };
export const INCENSE_GOOD = 'incense';

// world.trade's two Version 7.0 maps (world version 10; createWorld and the v9 -> v10 migration both start from newTradeSettings):
//   switches  partnerId -> { buys: { good: false }, sells: { good: false } }: a good switched off on that side of that route. The sides are
//             PARTNERS' own lists: 'buys' (the partner buys it: the city sells) and 'sells' (the partner sells it: the city buys). Absent
//             means on, so a v9 city has every switch on with an empty map.
//   floors    good -> units: the city-wide "Keep at least": trade never sells a good below it. Absent means no floor.
// src/sim/tradeRules.js tradeAllowed and heldBack read them; Track T may add fields here and tighten isTradeSettings, never remove these.
export const TRADE_SIDES = ['buys', 'sells'];
export const newTradeSettings = () => ({ switches: {}, floors: {} });
const isRec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isSwitchSide = (goods) => isRec(goods) && Object.values(goods).every((v) => typeof v === 'boolean');
const isSwitches = (s) => isRec(s) && Object.values(s).every((p) => isRec(p) && Object.entries(p).every(([side, goods]) => TRADE_SIDES.includes(side) && isSwitchSide(goods)));
const isFloors = (f) => isRec(f) && Object.values(f).every((n) => Number.isInteger(n) && n >= 0);
export const isTradeSettings = (t) => isRec(t) && isSwitches(t.switches) && isFloors(t.floors);

// Salts for hash2(a, b, (world.seed + TRADE_SALT.x) | 0), Track T's range 6101-6119 (tests/v70/contract keeps every salt unique). The
// boats' and caravans' looks are render only. Rename the spares as they are used; never reuse a number. (The yearly drift keeps its own 7349.)
export const TRADE_SALT = { spare1: 6101, spare2: 6102 };

// Track T's rows for the shared lists (src/data/v70.js joins them): tallies (new and migrated cities start them at 0), building rows (the
// Quay), goods (incense), firsts, achievements, tips (words in Track T's text.js section), goals and event goals.
export const TRADE_TALLY = [];
export const TRADE_BUILDINGS = {};
export const TRADE_GOODS = {};
export const TRADE_FIRSTS = [];
export const TRADE_ACHIEVEMENTS = [];
export const TRADE_TIPS = [];
export const TRADE_GOALS = [];
export const TRADE_EVENT_GOALS = [];
