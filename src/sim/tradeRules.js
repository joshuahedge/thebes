// Version 7.0, Track T (rulings 870-899): the rules every caravan and boat obeys beyond a good's order, and what the Trade sheet reads to
// say them. Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) wired both into src/sim/trade.js caravan and left
// them reading only world.trade.switches and floors (empty in every city until Track T's commands write them), so trade runs exactly as in
// 6.0.1. Track T owns this file and fills them in: the temple's waiting offering and the accepted court demands held back (ruling 854).
// Pure: no memo, no rng; the sheet may call them as often as it likes.
import { TRADE_SIDES } from '../data/trade.js';

// Whether a route may move this good on this side today: side is 'buys' (the partner buys it: the city sells) or 'sells' (the partner
// sells it: the city buys), as PARTNERS lists them. False only where the player switched it off.
export function tradeAllowed(world, partnerId, good, side) {
  if (!TRADE_SIDES.includes(side)) return false;
  const p = world.trade.switches[partnerId];
  return !(p && p[side] && p[side][good] === false);
}

// What trade must leave in the stores of a good, and why: { units, floor, temple, court }. units is the level caravans never sell below
// (src/sim/trade.js sells only above the larger of it and the good's own keep); floor the player's "Keep at least"; temple what the great
// temple's waiting stage still needs; court what accepted court demands still need. Track 0's version knows only the floor.
export function heldBack(world, good) {
  const floor = world.trade.floors[good] || 0;
  const temple = 0, court = 0;
  return { units: floor + temple + court, floor, temple, court };
}

// Track T's alerts (src/sim/v70.js v70Alerts): none yet.
export const tradeAlerts = () => [];
