// Version 7.0, Track T: the rules every caravan and boat obeys beyond a good's order, and what the Trade sheet reads to say them (rulings
// 870-899). Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) wired both into src/sim/trade.js caravan; Track T
// fills in what trade holds back for the great temple and the court (ruling 873), so a caravan never sells what is already owed.
// Pure: no memo, no rng; the sheet may call them as often as it likes. Each reads only what it is given, so a bare { trade } world works.
import { TRADE_SIDES } from '../data/trade.js';
import { greatWorkStatus } from './monuments.js';

// Whether a route may move this good on this side today: side is 'buys' (the partner buys it: the city sells) or 'sells' (the partner
// sells it: the city buys), as PARTNERS lists them. False only where the player switched it off.
export function tradeAllowed(world, partnerId, good, side) {
  if (!TRADE_SIDES.includes(side)) return false;
  const p = world.trade.switches[partnerId];
  return !(p && p[side] && p[side][good] === false);
}

// What the great temple's stage owes now, of this good (ruling 873): the whole offering (src/sim/monuments.js greatWorkStatus: owed from
// the moment its stage is reached until the stores hold all of it and it is taken), else 0. Nothing once the temple is finished.
export function templeOwes(world, good) {
  const id = world.reign ? world.reign.greatWork : null;
  const b = id === null || id === undefined || !world.buildings ? null : world.buildings[id];
  if (!b || !b.site || b.site.done !== null) return 0;
  const o = greatWorkStatus(world, b).offering;
  return o && o.good === good ? o.n : 0;
}

// What the court's accepted goods demands still ask of this good (src/sim/demands.js: each is sent whole, by Send, before its deadline).
// An offer not yet accepted holds nothing back.
export function courtOwes(world, good) {
  const open = world.demands && Array.isArray(world.demands.open) ? world.demands.open : [];
  return open.filter((d) => d.accepted && d.kind === 'goods' && d.good === good).reduce((n, d) => n + d.amount, 0);
}

// What trade must leave in the stores of a good, and why: { units, floor, temple, court }. units is the level caravans and boats never sell
// below (src/sim/trade.js sells only above the larger of it and the good's own keep); floor the player's "Keep at least"; temple what the
// great temple's waiting stage still needs; court what accepted court demands still need. They add up: the floor is what the player keeps
// for the city, on top of what is owed (ruling 873).
export function heldBack(world, good) {
  const floor = world.trade.floors[good] || 0;
  const temple = templeOwes(world, good), court = courtOwes(world, good);
  return { units: floor + temple + court, floor, temple, court };
}

// Track T's alerts (src/sim/v70.js v70Alerts): none. An arrival is a caption (src/ui/v70/trade.js); a missing Quay or a floor that starves
// trade is Advice's (Track A's 'quay' and 'trade_floor' items).
export const tradeAlerts = () => [];
