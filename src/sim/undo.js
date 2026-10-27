import { insertBuilding, removeBuilding } from './world.js';
import { footprint, idx } from './grid.js';
import { spend, refund } from './money.js';

export const UNDO_LIMIT = 10;

export function pushUndo(world, entry) {
  world.undo.push(entry);
  if (world.undo.length > UNDO_LIMIT) world.undo.shift();
}

export function clearUndo(world) { world.undo = []; }

// Whether a demolished building can go back on its tiles (spec 7.3): nothing else stands there, no road, and no wall
// (a tower may stand on a standing wall tile).
function footprintFree(world, snap) {
  for (const [x, y] of footprint(snap.x, snap.y, snap.w, snap.d)) {
    const i = idx(world.size, x, y);
    if (world.occ[i] || world.road[i]) return false;
    if (world.wall[i] && !(snap.type === 'tower' && world.wall[i] > 0)) return false;
  }
  return true;
}

// Undoes the last action. Stage 3 guards (spec 7.3): a placement refunds only what still stands (a building that has
// since burned, or a plot merged away, gives nothing back), and a demolish is refused, and dropped, when one of its
// buildings or roads would go back onto tiles something now uses. A placement that put a tower on a wall tile carries walls: [[tile index, old value]]. A road entry may carry walls: [[tile index, old value]] (the gates it made). Wall entries ({ kind: 'wall', tiles, before, cost },
// pushed by drawWall) put each tile's old value back.
export function undo(world) {
  const e = world.undo.pop();
  if (!e) return { ok: false, reason: 'nothing_to_undo' };
  if (e.kind === 'place') {
    // Stage 4 (ruling 236): a monument site is undone only before any work on it; once a course is done or a unit laid
    // the step is refused and dropped (it is already off the list), naming the site.
    const begun = e.ids.map((id) => world.buildings[id]).find((b) => b && b.site && (b.site.course > 0 || b.site.laid.stone + b.site.laid.bricks > 0));
    if (begun) return { ok: false, reason: 'work_begun', id: begun.id, type: begun.type };
    let standing = 0;
    for (const id of e.ids) if (removeBuilding(world, id)) standing++;
    // A tower placed on a wall tile took it to the tower's hit points; it goes back to the old value, or stays lower if
    // the tile has been damaged or breached since (never healed by an undo).
    if (standing && e.walls && e.walls.length) {
      for (const [t, v] of e.walls) if (world.wall[t] > 0) world.wall[t] = Math.min(world.wall[t], v);
      world.wallVersion++;
    }
    refund(world, e.ids.length ? Math.round((e.cost * standing) / e.ids.length) : 0);
    // Version 8.2.1 (ruling 1341): a ferry crossing's entry carries the road its stubs laid (roads: tile indices, roadCost): taken off and refunded with it.
    if (e.roads && e.roads.length) {
      for (const t of e.roads) world.road[t] = 0;
      world.roadVersion++;
      refund(world, e.roadCost || 0);
    }
  } else if (e.kind === 'road') {
    for (const t of e.tiles) world.road[t] = 0;
    world.roadVersion++;
    // Stage 4.5 (ruling 309): a road that crossed a wall made gates; each wall (or breach) goes back as it was.
    const walls = e.walls || [];
    for (const [t, v] of walls) world.wall[t] = v;
    if (walls.length) world.wallVersion++;
    refund(world, e.cost);
  } else if (e.kind === 'demolish') {
    const walls = e.walls || [];
    if (!e.buildings.every((snap) => footprintFree(world, snap)) || e.roads.some((t) => world.occ[t])) return { ok: false, reason: 'occupied' };
    for (const snap of e.buildings) insertBuilding(world, JSON.parse(JSON.stringify(snap)));
    for (const t of e.roads) world.road[t] = 1;
    if (e.roads.length) world.roadVersion++;
    for (const [t, v] of walls) world.wall[t] = v;
    if (walls.length) world.wallVersion++;
    spend(world, e.refund);
    const rubble = e.buildings.filter((s) => s.type === 'rubble').length;
    if (rubble) world.tally.rubbleCleared = Math.max(0, world.tally.rubbleCleared - rubble);
  } else if (e.kind === 'wall') {
    e.tiles.forEach((t, k) => { world.wall[t] = e.before[k]; });
    world.wallVersion++;
    world.tally.wallTiles = Math.max(0, world.tally.wallTiles - e.tiles.length);
    refund(world, e.cost);
  }
  return { ok: true, kind: e.kind };
}

// Version 8.0 (Track N, ruling 1165): the player's Undo is a safety net for the last action, not a time machine. It takes that step back, and then whatever is older is no longer
// offered: undone, refused or dropped, the stack ends empty, so a second press never walks back through earlier progress. The month's end already clears the stack (src/sim/clock.js),
// so the step also lapses when the next month starts. The toast's Undo, the bar's Undo, Ctrl+Z and Delete all reach this through placement.undo(); undo() above stays the one-step
// primitive that scripts (the balance runs' roll-backs) use.
export function undoLast(world) {
  const r = undo(world);
  clearUndo(world);
  return r;
}
