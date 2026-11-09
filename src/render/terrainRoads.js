// Roads as continuous stroked paths through tile centres with round joins (spec 5.2): a soft shadow for
// worn edges, an edge tone, the top, two wheel ruts and seeded pebbles. Segments are listed in a fixed
// order so a chunk bakes identically every time.
import { p } from './iso.js';
import { hash2 } from '../sim/rng.js';
import { idx, inBounds } from '../sim/grid.js';
import { T } from '../sim/terrain.js';
import { TERRAIN, SHADOW } from './art/palette.js';

export const KERB = { drop: 2.4, width: 11, alpha: 0.3 };            // Version 9.2 (Track V): art px the low side's shadow drops, its width and its strength
export const CART_TRACK = { width: 4.6, alpha: 0.3 };                  // the darker centre: art px wide, and the strength of the road's edge tone over the top

const isRoad =(world, x, y) => inBounds(world.size, x, y) && Boolean(world.road[idx(world.size, x, y)]);

export function roadSegments(world, range) {
  const segs = [], dots = [];
  for (let y = range.y0 - 1; y <= range.y1 + 1; y++) {
    for (let x = range.x0 - 1; x <= range.x1 + 1; x++) {
      if (!isRoad(world, x, y)) continue;
      const e = isRoad(world, x + 1, y), s = isRoad(world, x, y + 1);
      if (e) segs.push([x, y, x + 1, y]);
      if (s) segs.push([x, y, x, y + 1]);
      if (!e && !s && !isRoad(world, x - 1, y) && !isRoad(world, x, y - 1)) dots.push([x, y]);
    }
  }
  return { segs, dots };
}

export function drawRoads(g, world, range) {
  const { segs, dots } = roadSegments(world, range);
  if (!segs.length && !dots.length) return;
  const path = [];
  for (const [ax, ay, bx, by] of segs) path.push(['M', p(ax + 0.5, ay + 0.5)], ['L', p(bx + 0.5, by + 0.5)]);
  // Version 9.2 (Track V, ruling 1846): the far zoom has no room for ruts and pebbles, so the road reads from two broad strokes baked into the chunk (never drawn per frame): a kerb shadow
  // on the low side (the stroke shifted down the screen, so only the lower edge shows it) and, over the top, a darker centre where the carts run.
  if (path.length) g.stroke(path.map(([c, q]) => [c, [q[0], q[1] + KERB.drop]]), SHADOW, KERB.width, KERB.alpha);
  for (const [x, y] of dots) { const q = p(x + 0.5, y + 0.5); g.circ([q[0], q[1] + KERB.drop], 6 * 0.6, SHADOW, { alpha: KERB.alpha }); }
  for (const [c, w, a] of [[SHADOW, 15, 0.12], [TERRAIN.roadEdge, 12, 1], [TERRAIN.road, 10, 1]]) {
    if (path.length) g.stroke(path, c, w, a);
    for (const [x, y] of dots) g.circ(p(x + 0.5, y + 0.5), w / 2 * 0.6, c, { alpha: a });
  }
  if (path.length) g.stroke(path, TERRAIN.roadEdge, CART_TRACK.width, CART_TRACK.alpha);
  const ruts = [];
  for (const [ax, ay, bx, by] of segs) {
    const alongX = ay === by;
    for (const o of [-0.12, 0.12]) {
      const ox = alongX ? 0 : o, oy = alongX ? o : 0;
      ruts.push(['M', p(ax + 0.5 + ox, ay + 0.5 + oy)], ['L', p(bx + 0.5 + ox, by + 0.5 + oy)]);
    }
  }
  if (ruts.length) g.stroke(ruts, TERRAIN.roadEdge, 0.7, 0.7);
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (!isRoad(world, x, y) || world.terrain[idx(world.size, x, y)] === T.WATER) continue;   // a bridge has its deck instead (terrainBridges.js)
      for (let j = 0; j < 2; j++) {
        g.circ(p(x + 0.2 + hash2(x, y, 20 + j) * 0.6, y + 0.2 + hash2(x, y, 30 + j) * 0.6), 0.6, j ? TERRAIN.roadPebbleLight : TERRAIN.roadPebble);
      }
    }
  }
}
