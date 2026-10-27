// The Ferry tool's command (Version 7.1, Track F; ruling 1041): lays the two landings of a crossing that previewFerry (src/sim/ferries.js) accepts, charges
// for both, links them as one crossing and pushes one undo entry for the pair (undo takes both landings away and refunds what still stands, src/sim/undo.js).
// The landings start with nobody working them: the next labour step staffs them and, once both have a ferryman, the crossing runs (syncFerries).
// Version 8.2.1 (rulings 1341-1343): a crossing also lays the road stubs its landings need (src/sim/ferryFind.js), charged with it and in the same undo step.
import { makeBuilding, insertBuilding } from './world.js';
import { noteBuilt } from './oases.js';
import { spend } from './money.js';
import { pushUndo } from './undo.js';
import { idx } from './grid.js';
import { costOf } from './costs.js';
import { previewFerry, FERRY_LANDING } from './ferries.js';
import { judgeCrossing } from './ferryFind.js';

// Lays a crossing judgeCrossing or previewFerry accepted (verdict.ok): the landings, the stubs' road, one charge and one undo entry ({ kind: 'place', ids,
// cost: the landings', walls: [], roads: the tiles given road, roadCost }). Returns the verdict with ids: the two landings' ids, in the verdict's order.
export function layCrossing(world, p) {
  if (!p || !p.ok) return p;
  const landings = p.landings.map(([x, y]) => insertBuilding(world, makeBuilding(world, FERRY_LANDING, x, y)));
  const [a, b] = landings;
  a.ferry = { mate: b.id, water: p.water, run: false };
  b.ferry = { mate: a.id, water: p.water, run: false };
  for (const l of landings) noteBuilt(world, l);
  const roads = (p.roads || []).map(([x, y]) => idx(world.size, x, y)).filter((t) => !world.road[t]);
  for (const t of roads) world.road[t] = 1;
  if (roads.length) world.roadVersion++;
  const landingCost = 2 * costOf(world, FERRY_LANDING);
  spend(world, p.cost);
  pushUndo(world, { kind: 'place', ids: [a.id, b.id], cost: landingCost, walls: [], roads, roadCost: p.cost - landingCost });
  return { ...p, ids: [a.id, b.id] };
}

// tiles: the dragged line, as previewFerry takes it. Returns previewFerry's verdict, with ids: the two landings' ids (bank order along the drag) when laid.
export function drawFerry(world, tiles) {
  return layCrossing(world, previewFerry(world, tiles));
}

// A crossing the finder offered (ferryChoices), judged again now and laid: what the Ferry tool's ✓ does for a picked crossing.
export function buildCrossing(world, plan) {
  return layCrossing(world, judgeCrossing(world, plan));
}
