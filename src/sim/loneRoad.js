// Version 9.2 (Track L, ruling 1757, design 2.3): a lone road is a piece of road that joins nothing: no tile of it is the start road, on the map's edge (a way out), or beside a
// building. A drag laid with no connectivity check could leave one, which counted for nothing (in the lesson, ruling 1210) and cost gold; the map marks it (src/render/overlays.js:
// the roadless plots' amber outline and a road badge) and the toast says it joins nothing yet (src/ui/placement.js). Read from the roads and the buildings alone, kept while
// neither changes (roadVersion, buildingsVersion), never saved.
import { allBuildings, buildingsVersion } from './world.js';
import { adjacentRoadTiles } from './reach.js';
import { idx } from './grid.js';

const memo = new WeakMap();   // world -> { key, list }

// The lone pieces of road, [{ tiles: [index], x, y }] with (x, y) the tile of the piece nearest its middle, in index order of each piece's first tile.
export function loneRoads(world) {
  const key = `${world.roadVersion}|${buildingsVersion(world)}`;
  const m = memo.get(world);
  if (m && m.key === key) return m.list;
  const n = world.size, joined = new Set();
  for (const [x, y] of world.startRoad || []) joined.add(idx(n, x, y));
  for (const b of allBuildings(world)) for (const i of adjacentRoadTiles(world, b)) joined.add(i);
  const seen = new Uint8Array(n * n), list = [];
  for (let s = 0; s < n * n; s++) {
    if (!world.road[s] || seen[s]) continue;
    const tiles = [s];
    seen[s] = 1;
    let touches = false;
    for (let k = 0; k < tiles.length; k++) {
      const i = tiles[k], x = i % n, y = (i - x) / n;
      if (joined.has(i) || x === 0 || y === 0 || x === n - 1 || y === n - 1) touches = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const j = idx(n, nx, ny);
        if (world.road[j] && !seen[j]) { seen[j] = 1; tiles.push(j); }
      }
    }
    if (touches) continue;
    const mx = tiles.reduce((a, i) => a + (i % n), 0) / tiles.length, my = tiles.reduce((a, i) => a + Math.floor(i / n), 0) / tiles.length;
    let best = tiles[0], bd = Infinity;
    for (const i of tiles) { const d = Math.hypot((i % n) - mx, Math.floor(i / n) - my); if (d < bd) { bd = d; best = i; } }
    list.push({ tiles, x: best % n, y: Math.floor(best / n) });
  }
  memo.set(world, { key, list });
  return list;
}

// Whether any of these tiles ([x, y]) is on a lone piece of road.
export function laidLone(world, tiles) {
  const lone = new Set();
  for (const r of loneRoads(world)) for (const i of r.tiles) lone.add(i);
  return lone.size > 0 && (tiles || []).some(([x, y]) => lone.has(idx(world.size, x, y)));
}
