// The Ferry tool's command (Version 7.1, Track F; ruling 1041): lays the two landings of a crossing that previewFerry (src/sim/ferries.js) accepts, charges
// for both, links them as one crossing and pushes one undo entry for the pair (undo takes both landings away and refunds what still stands, src/sim/undo.js).
// The landings start with nobody working them: the next labour step staffs them and, once both have a ferryman, the crossing runs (syncFerries).
import { makeBuilding, insertBuilding } from './world.js';
import { noteBuilt } from './oases.js';
import { spend } from './money.js';
import { pushUndo } from './undo.js';
import { previewFerry, FERRY_LANDING } from './ferries.js';

// tiles: the dragged line, as previewFerry takes it. Returns previewFerry's verdict, with ids: the two landings' ids (bank order along the drag) when laid.
export function drawFerry(world, tiles) {
  const p = previewFerry(world, tiles);
  if (!p.ok) return p;
  const landings = p.landings.map(([x, y]) => insertBuilding(world, makeBuilding(world, FERRY_LANDING, x, y)));
  const [a, b] = landings;
  a.ferry = { mate: b.id, water: p.water, run: false };
  b.ferry = { mate: a.id, water: p.water, run: false };
  for (const l of landings) noteBuilt(world, l);
  spend(world, p.cost);
  pushUndo(world, { kind: 'place', ids: [a.id, b.id], cost: p.cost, walls: [] });
  return { ...p, ids: [a.id, b.id] };
}
