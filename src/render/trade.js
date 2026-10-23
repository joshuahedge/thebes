// Version 7.0, Track T (rulings 870-899): trade you can see. Caravans walk the entry road to the trading post and boats sail the river to the
// Quay and back, sampled from trade's own arrival schedule (src/sim/trade.js nextCaravanDay and the open routes): render only, never in the
// sim or the save (ruling 852's rule for render state). Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left
// both empty; Track T owns this file (src/render/v70.js calls them from createUI's frame).
//   tradeWalkers(world, timeDays, range, motion)       figures joined to the walkers and depth-sorted with them, each { id, kind, x, y } with an
//                                                       art slot Track T registers, ids from TRADE_ID_BASE up; Still: none moving
//   drawTradeGround(g, world, range, now, motion)      in art px with the art origin set, over the terrain and under the shadows: a boat's wake
export const TRADE_ID_BASE = 4000000;   // after the carts (3000000 + store id)

export const tradeWalkers = () => [];
export function drawTradeGround() {}
