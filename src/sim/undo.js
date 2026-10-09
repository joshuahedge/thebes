import { insertBuilding, removeBuilding } from './world.js';
import { spend, refund } from './money.js';

export const UNDO_LIMIT = 10;

export function pushUndo(world, entry) {
  world.undo.push(entry);
  if (world.undo.length > UNDO_LIMIT) world.undo.shift();
}

export function clearUndo(world) { world.undo = []; }

export function undo(world) {
  const e = world.undo.pop();
  if (!e) return { ok: false, reason: 'nothing_to_undo' };
  if (e.kind === 'place') {
    for (const id of e.ids) removeBuilding(world, id);
    refund(world, e.cost);
  } else if (e.kind === 'road') {
    for (const t of e.tiles) world.road[t] = 0;
    world.roadVersion++;
    refund(world, e.cost);
  } else if (e.kind === 'demolish') {
    for (const snap of e.buildings) insertBuilding(world, JSON.parse(JSON.stringify(snap)));
    for (const t of e.roads) world.road[t] = 1;
    if (e.roads.length) world.roadVersion++;
    spend(world, e.refund);
  }
  return { ok: true, kind: e.kind };
}
