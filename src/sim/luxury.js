// Version 8.4, Track G (design 2c, rulings 1468, 1472, 1473): where a city's luxuries come from. Nothing in the city makes one: they are bought from a
// trade partner (cedar from Byblos, ivory from Nubia, incense from Punt; src/data/trade.js PARTNERS) or, ivory, left by a fallen war elephant. When no
// home's bazaar can reach one, the house sheet's Luxury row, a home's next step and City advice name the trade fix from here, so each names what the sim
// will honour: the route to open (its partner and price), the Buy order to set, or the caravan already on its way. Pure: no memo, no randomness.
import { PARTNERS, CARAVAN_EVERY_MONTHS, FLOOR_STEP } from '../data/trade.js';
import { LUXURY_GOODS } from '../data/goods.js';
import { TIERS, MAX_TIER } from '../data/housing.js';
import { luxuryNeed } from './distribution.js';
import { housesOf } from './world.js';
import { hasRiver } from '../data/map.js';
import { tradePrices, partnerUnlocked, byRiver, arrivalAt, arrivalBlocker, monthsToNextArrival, routeBlocker, quays } from './trade.js';
import { tradeAllowed } from './tradeRules.js';
import { allBuildings } from './world.js';

// The building a partner's caravans or boats land at, standing (working or not): the active one, else the first trading post or Quay; null with none.
export function landingOf(world, partner) {
  const at = arrivalAt(world, partner);
  if (at) return at;
  if (byRiver(partner)) return quays(world)[0] || null;
  return allBuildings(world).find((b) => b.type === 'trading_post') || null;
}

// Every partner selling a luxury, each with the luxury it sells cheapest today: [{ partner, good, price, open (its route is open), can (the city can trade
// with it: its milestone reached, and a river partner on a map with a river) }], in PARTNERS order.
export function luxurySellers(world) {
  const out = [];
  for (const partner of Object.keys(PARTNERS)) {
    const sells = tradePrices(world, partner).sells;
    const goods = LUXURY_GOODS.filter((g) => sells[g] !== undefined).sort((a, b) => sells[a] - sells[b]);
    if (!goods.length) continue;
    const can = partnerUnlocked(world, partner) && !(byRiver(partner) && !hasRiver(world.mapVariant));
    out.push({ partner, good: goods[0], price: sells[goods[0]], open: Boolean(world.trade.routes[partner]), can });
  }
  return out;
}

// The luxuries the city's homes use in a month: each home whose own tier needs one (a Villa, an Estate), at its tier's use (a Fine manor only keeps its
// month's stock, src/sim/housing.js consumeLuxury).
export function luxuryUse(world) {
  let n = 0;
  for (const h of housesOf(world)) if (h.tier >= 1 && TIERS[h.tier].needs.includes('luxury')) n += luxuryNeed(h);
  return n;
}
// The month's stock the homes keep on hand: every home that wants one (a Fine manor too) holds a month at the use of the tier it stocks for.
export function luxuryStock(world) {
  let n = 0;
  for (const h of housesOf(world)) {
    const into = Math.min(h.tier + 1, MAX_TIER);
    if (h.tier >= 1 && TIERS[into].needs.includes('luxury')) n += luxuryNeed(h, into);
  }
  return n;
}
// The Keep at least level that covers that use between two visits (CARAVAN_EVERY_MONTHS months) and the homes' month of stock, as the Trade sheet can set
// it: up in tens below 100, in fifties from 100 (src/ui/tradeSheet.js keepStepUp). 0 when no home wants one.
export function luxuryKeepFor(world) {
  const n = luxuryUse(world) * CARAVAN_EVERY_MONTHS + luxuryStock(world);
  if (n <= 0) return 0;
  return n < 100 ? Math.ceil(n / FLOOR_STEP) * FLOOR_STEP : Math.ceil(n / 50) * 50;
}

// Why no luxury reaches the city by trade, for a home none can reach (src/sim/housing.js luxuryCause, after its bazaar and store steps): { code, id, ... },
// id the partner's landing (its trading post or Quay) when one stands, else null:
//   luxury_short { good, partner, keep, want, use }      a route selling it is open and set to Buy, but at a level below the homes' use between two visits
//                                                       (luxuryKeepFor: want); keep is the level now, use the homes' use a month
//   luxury_ordered { good, partner, months, blocked }   a route selling it is open and its order is Buy with a level: the next caravan or boat brings it
//                                                       (months: monthsToNextArrival; blocked: arrivalBlocker, why none will come, or null)
//   luxury_not_bought { good, partner, price, off }     a route selling one is open, but its order is not Buy (or Buy at 0); off: the route's switch for it is Off
//   no_luxury_route { good, partner, price, block }     no route selling one is open: the cheapest partner the city can trade with, one whose landing
//                                                       stands first (block: routeBlocker's reason, or null when Open route works now)
//   no_luxury_route { good: null, partner, milestone }  no partner selling one is open to this city yet: partner the first, milestone its milestone
export function luxuryTradeCause(world) {
  const sellers = luxurySellers(world);
  const order = (g) => world.trade.orders[g] || { mode: 'ignore', keep: 0 };
  const landing = (s) => landingOf(world, s.partner);
  const idOf = (s) => (landing(s) ? landing(s).id : null);
  const open = sellers.filter((s) => s.open).sort((a, b) => a.price - b.price);
  const ordered = open.find((s) => order(s.good).mode === 'buy' && order(s.good).keep > 0 && tradeAllowed(world, s.partner, s.good, 'sells'));
  // Version 8.4 (ruling 1484): an order whose level is below the homes' use between two visits leaves them short every time: raise it.
  const want = luxuryKeepFor(world);
  if (ordered && order(ordered.good).keep < want) {
    return { code: 'luxury_short', id: idOf(ordered), good: ordered.good, partner: ordered.partner, keep: order(ordered.good).keep, want, use: luxuryUse(world) };
  }
  if (ordered) return { code: 'luxury_ordered', id: idOf(ordered), good: ordered.good, partner: ordered.partner, months: monthsToNextArrival(world), blocked: arrivalBlocker(world, ordered.partner) };
  if (open.length) {
    const s = open[0];
    return { code: 'luxury_not_bought', id: idOf(s), good: s.good, partner: s.partner, price: s.price, off: !tradeAllowed(world, s.partner, s.good, 'sells') };
  }
  const can = sellers.filter((s) => s.can).sort((a, b) => Number(!landing(a)) - Number(!landing(b)) || a.price - b.price);
  if (can.length) {
    const s = can[0];
    return { code: 'no_luxury_route', id: idOf(s), good: s.good, partner: s.partner, price: s.price, block: routeBlocker(world, s.partner) };
  }
  const first = sellers[0] || null;
  return { code: 'no_luxury_route', id: null, good: null, partner: first ? first.partner : null, milestone: first ? PARTNERS[first.partner].milestone : null };
}
