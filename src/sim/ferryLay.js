// The Ferry tool's command (Version 7.1, Track F; ruling 1041): lays the two landings of a crossing that previewFerry (src/sim/ferries.js) accepts, charges
// for both, links them as one crossing and pushes one undo entry for the pair (undo takes both landings away and refunds what still stands, src/sim/undo.js).
// The landings start with nobody working them: the next labour step staffs them and, once both have a ferryman, the crossing runs (syncFerries).
// Version 8.2.1 (rulings 1341-1343): a crossing also lays the road stubs its landings need (src/sim/ferryFind.js), charged with it and in the same undo step.
// Version 8.3 (Track X, ruling 1391): layLandings is the one way two landings go down, for this tool and for a road stroke that crosses wide water
// (drawRoadTiles, src/sim/commands.js), so a road-laid ferry is the same pair. A bridge the Crossing card offers is laid by drawRoadTiles over its tiles.
import { makeBuilding, insertBuilding } from './world.js';
import { noteBuilt } from './oases.js';
import { spend } from './money.js';
import { pushUndo } from './undo.js';
import { idx } from './grid.js';
import { costOf } from './costs.js';
import { previewFerry, FERRY_LANDING } from './ferries.js';
import { judgeCrossing } from './ferryFind.js';
import { drawRoadTiles } from './commands.js';   // a bridge plan's road (commands.js imports layLandings from here: each reads the other only when called)

// Puts the two landings of a crossing down at `landings` ([[x, y], [x, y]]), linked as one ({ mate, water, run: false } each), and counts them as built.
// Charges nothing and pushes no undo: the caller does both. Returns the two ids in the order given.
export function layLandings(world, landings, water) {
  const [a, b] = landings.map(([x, y]) => insertBuilding(world, makeBuilding(world, FERRY_LANDING, x, y)));
  a.ferry = { mate: b.id, water, run: false };
  b.ferry = { mate: a.id, water, run: false };
  noteBuilt(world, a);
  noteBuilt(world, b);
  return [a.id, b.id];
}

// Lays a crossing judgeCrossing or previewFerry accepted (verdict.ok): the landings, the stubs' road, one charge and one undo entry ({ kind: 'place', ids,
// cost: the landings', walls: [], roads: the tiles given road, roadCost }). Returns the verdict with ids: the two landings' ids, in the verdict's order.
export function layCrossing(world, p) {
  if (!p || !p.ok) return p;
  const ids = layLandings(world, p.landings, p.water);
  const roads = (p.roads || []).map(([x, y]) => idx(world.size, x, y)).filter((t) => !world.road[t]);
  for (const t of roads) world.road[t] = 1;
  if (roads.length) world.roadVersion++;
  const landingCost = 2 * costOf(world, FERRY_LANDING);
  spend(world, p.cost);
  pushUndo(world, { kind: 'place', ids, cost: landingCost, walls: [], roads, roadCost: p.cost - landingCost });
  return { ...p, ids };
}

// tiles: the dragged line, as previewFerry takes it. Returns previewFerry's verdict, with ids: the two landings' ids (bank order along the drag) when laid.
export function drawFerry(world, tiles) {
  return layCrossing(world, previewFerry(world, tiles));
}

// A crossing the finder offered (ferryChoices, or Version 8.3's crossingChoices), judged again now and laid: what the Crossing tool's ✓ does for a picked
// crossing. A bridge plan (kind 'bridge') is a road over its tiles, laid by drawRoadTiles with its one 'road' undo entry; the answer then carries the plan's
// fields with drawRoadTiles' verdict (ok, reason, cost, bridges).
export function buildCrossing(world, plan) {
  if (plan && plan.kind === 'bridge') {
    const v = judgeCrossing(world, plan);
    if (!v.ok) return v;
    const r = drawRoadTiles(world, plan.tiles);
    return { ...v, ...r, ok: r.ok, reason: r.ok ? null : r.reason };
  }
  return layCrossing(world, judgeCrossing(world, plan));
}
