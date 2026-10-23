// Version 7.0, Track A (wave 2, rulings 960-974): the two Advice fixes from 6.0 (raid towers only where they defend the first target;
// stranded goods answered with a storehouse near the bazaar) and the words for trade and events. Track 0 (contract,
// docs/superpowers/notes/2026-10-23-version-7-0-contract.md) laid out the lists; Track A owns this file. A leaf data file: it imports
// nothing (src/data/v70.js joins its tips).

// Salts, Track A's range 6161-6169 (tests/v70/contract keeps every salt unique): none is used; Advice is deterministic from the world alone.
export const ADVICE_FIX_SALT = { spare1: 6161 };

// The numbers Track A's fixes and items weigh by (all tunable here; src/sim/adviceFixes.js reads them).
export const ADVICE_FIX = {
  // A tower is placed where it defends: within DEFENCE.towerRange of the building the first band strikes (towerSpotsFor). With no tile beside a
  // road in range, the fix is the road: the free tiles in range that lack only a road are tried, the `endsTried` nearest a road first, each with the
  // `roadsTried` nearest road tiles within `roadSearch` tiles of it, the road being the road tool's Route (src/sim/route.js) from the tile to the road.
  roadSearch: 24,
  endsTried: 5,
  roadsTried: 2,
  // A good held only in a store far from the bazaar that needs it is answered with a storehouse by the bazaar when one cart could not bring a month
  // of an order from it: a cart brings CARTS.perTrip a trip and a round trip takes (roundTripDays) days, so it brings CARTS.perTrip x the trips a
  // month; "sensible" is at least this many of CARTS.defaultFetch (the amount a new Fetch order asks) a month.
  strandedOrders: 1,
  // Points (src/data/advice.js ADVICE: one point is one home held back one tier): a river route open with no Quay for its boats to land at (the weight
  // of the Manor a Large plot opens, ADVICE.largePlot). The Keep at least item weighs the gold of the sales it holds back, spread over the months
  // between visits, in ADVICE.goldPerPoint (src/sim/adviceFixes.js floorItem), as the treasury item does.
  quay: 6,
};

// Track A's tips (words in Track A's text.js section): the first Quay placed, and the first route opened (what the Trade sheet holds). Events have
// Track E's own (city_events); the Trade sheet's How to play entries are Track T's and Track A's.
export const ADVICE_FIX_TIPS = [
  { id: 'quay_boats', trigger: 'quayPlaced', priority: false },       // a Quay was placed
  { id: 'trade_levels', trigger: 'routeOpened', priority: false },    // a trade route was opened
];
