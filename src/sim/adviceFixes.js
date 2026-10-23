// Version 7.0, Track A (wave 2, rulings 960-974): the two Advice fixes from 6.0 and the Advice items for trade. Track 0 (contract,
// docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left stubs nothing calls yet, so Advice is exactly 6.0.1's; Track A owns this
// file and src/sim/advice.js in wave 2, and wires these into towerItem and homeItems there.
//
//   towerSpotsFor(world, target)        -> [{ x, y }]: the tiles a tower may stand on that a road reaches (so it can be staffed) and that lie
//                                          within DEFENCE.towerRange of the target (firstRaidTarget's building), best first; [] when none
//   strandedFix(world, good, bazaar)    -> null, or { item: 'storehouse', x, y }: a valid storehouse spot near the bazaar that needs the good,
//                                          when the good is stored beyond a cart's sensible reach of it
//   adviceFixItems(world, alerts, out)  the trade Advice items (a floor that starves the city's income; a Quay missing for an open river
//                                          partner), pushed onto cityAdvice's list (src/sim/v70.js v70Advice)

export const towerSpotsFor = () => [];
export const strandedFix = () => null;
export function adviceFixItems() {}
