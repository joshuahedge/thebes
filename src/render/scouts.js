// Version 8.4, Track R (ruling 1487): the scouts on the horizon before a raid's warning. src/render/units.js unitsAt adds what scoutWalkers returns to the walkers
// list, each entry in unitsAt's own shape ({ id, kind, x, y, dir }) for the given time and view range. Drawn from the state alone (src/sim/scouts.js scoutsAt, which reads
// the warning's day and the entry the warning will use): two or three raiders on foot stand at the map edge where the raid will enter, facing in. They stand still, so
// Gentle and Still show them as Full does, and nothing is written back. A map with no scouts to draw (none due, Peaceful, the lesson) returns none.
import { scoutsAt, scoutCount } from '../sim/scouts.js';

// Walker ids: unitsAt's raiders and soldiers are UNIT_ID_BASE (100000) + a unit id, a building's walkers are small; scouts take 200000 and up.
export const SCOUT_ID_BASE = 200000;
// Where each scout stands round the entry tile's centre, in tiles (the first three are raiders' own slots, src/sim/raids.js SLOTS).
const SPOTS = [[0, 0], [0.25, 0.2], [-0.25, 0.2]];
// The way a scout faces, in unitsAt's dir numbers (0 towards -y, 1 towards +x, 2 towards +y, 3 towards -x): in from the edge it stands on.
const FACING = { east: 3, west: 1, north: 2, south: 0 };

export function scoutWalkers(world, timeDays, range = null) {
  const s = scoutsAt(world);
  if (!s) return [];
  const n = scoutCount(world), out = [];
  for (let k = 0; k < n; k++) {
    const x = s.entry.x + 0.5 + SPOTS[k][0], y = s.entry.y + 0.5 + SPOTS[k][1];
    if (range && !(x >= range.x0 && x <= range.x1 + 1 && y >= range.y0 && y <= range.y1 + 1)) continue;
    out.push({ id: SCOUT_ID_BASE + k, kind: 'raider', x, y, dir: FACING[s.dir] });
  }
  return out;
}
