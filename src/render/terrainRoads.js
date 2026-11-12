// Roads as continuous stroked paths through tile centres with round joins (spec 5.2): a soft shadow for
// worn edges, an edge tone, the top, two wheel ruts and seeded pebbles. Segments are listed in a fixed
// order so a chunk bakes identically every time.
import { p } from './iso.js';
import { hash2 } from '../sim/rng.js';
import { idx, inBounds } from '../sim/grid.js';
import { T } from '../sim/terrain.js';
import { TERRAIN, SHADOW, STONE, GOLD, LEAF, LEAF2, TRUNK, PINK } from './art/palette.js';
import { lookReader } from './groundLooks.js';
import { wallCode } from './terrainWalls.js';

export const KERB = { drop: 2.4, width: 11, alpha: 0.3 };            // Version 9.2 (Track V): art px the low side's shadow drops, its width and its strength
export const WEAR = { offset: 0.1, width: 1.1, alpha: 0.2 };             // Version 10.0 (Track Q, ruling 2144): the paved streets' wheel tracks: tiles either side of the axis, art px wide, and the strength
export const CART_TRACK = { width: 4.6, alpha: 0.3 };                  // the darker centre: art px wide, and the strength of the road's edge tone over the top

const isRoad = (world, x, y) => inBounds(world.size, x, y) && Boolean(world.road[idx(world.size, x, y)]);

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

// Version 9.3 (Track G, rulings 1915-1917): a road is drawn in the look of its tile (lookAt of the tile's centre, so a road changes with the city's rank as the front of the
// rebuild reaches it). Village: the dirt track of today, fraying into the sand with wheel dust. Town: gravel with a firm edge. City: stone kerbs, and paved where the road runs
// between buildings. Capital: paved avenues with a gold centre line. From the City look, trees line built-up roads (Capital: lamps too). All baked, all seeded.
export const roadLook = (world, x, y) => lookReader(world).tile(x, y);
const occupied = (world, x, y) => inBounds(world.size, x, y) && world.occ[idx(world.size, x, y)] > 0;
// Whether a building stands within a tile of the road tile (x, y): the street is built up there.
export function builtUp(world, x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && occupied(world, x + dx, y + dy)) return true;
  return false;
}
// The surface of a road tile at a look: 'dirt', 'gravel', 'kerbed' (stone kerbs round gravel, a City street with no buildings along it) or 'paved'.
export function surfaceOf(world, look, x, y) {
  if (look === 0) return 'dirt';
  if (look === 1) return 'gravel';
  return builtUp(world, x, y) ? 'paved' : 'kerbed';   // 9.3 fix wave (G1): a Capital road too is paved only where it is built up (ruling 1916 said always); the rest keeps its kerbs
}

const SURFACES = {
  dirt: { rim: null, top: TERRAIN.road, edge: TERRAIN.roadEdge },
  gravel: { rim: TERRAIN.pebble, top: TERRAIN.road, edge: TERRAIN.roadEdge },
  kerbed: { rim: STONE[2], top: TERRAIN.road, edge: TERRAIN.roadEdge },
  paved: { rim: STONE[2], top: STONE[1], edge: STONE[2] },
};
// 9.3 fix wave (known item 4): a Capital street reads as its own at play zoom. Its stone is a warm sandstone cream (the City's is a cool white), its kerb is a gold-brown, and it is laid in
// staggered slabs in three lanes (the City's has one joint across every tile), with a gold centre line, palms, planters and lamps along it.
export const CAPITAL_STONE = { rim: '#C9A860', top: '#F2E6C8', edge: '#D9C79A', joint: '#C4AE80' };
const surfaceFor = (kind, look) => (look === 3 && kind === 'paved' ? { rim: CAPITAL_STONE.rim, top: CAPITAL_STONE.top, edge: CAPITAL_STONE.edge }
  : look === 3 && kind === 'kerbed' ? { ...SURFACES.kerbed, rim: CAPITAL_STONE.edge } : SURFACES[kind]);

export function drawRoads(g, world, range) {
  const { segs, dots } = roadSegments(world, range);
  if (!segs.length && !dots.length) return;
  // The segments and lone tiles are grouped by surface (the look, and for a City whether the street is built up there); a group draws as one set of strokes.
  const groups = new Map();
  const into = (x, y) => {
    const look = roadLook(world, x, y), kind = surfaceOf(world, look, x, y), key = `${look}:${kind}`;
    let grp = groups.get(key);
    if (!grp) { grp = { look, kind, segs: [], dots: [] }; groups.set(key, grp); }
    return grp;
  };
  for (const s of segs) into(s[0], s[1]).segs.push(s);
  for (const d of dots) into(d[0], d[1]).dots.push(d);
  for (const grp of [...groups.values()].sort((a, b) => a.look - b.look || (a.kind < b.kind ? -1 : 1))) drawGroup(g, world, grp);
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (!isRoad(world, x, y) || world.terrain[idx(world.size, x, y)] === T.WATER) continue;   // a bridge has its deck instead (terrainBridges.js)
      if (surfaceOf(world, roadLook(world, x, y), x, y) === 'paved') continue;                  // paving has joints, not pebbles
      for (let j = 0; j < 2; j++) {
        g.circ(p(x + 0.2 + hash2(x, y, 20 + j) * 0.6, y + 0.2 + hash2(x, y, 30 + j) * 0.6), 0.6, j ? TERRAIN.roadPebbleLight : TERRAIN.roadPebble);
      }
    }
  }
}

function drawGroup(g, world, { look, kind, segs, dots }) {
  const surf = surfaceFor(kind, look), paved = kind === 'paved';
  const path = [];
  for (const [ax, ay, bx, by] of segs) path.push(['M', p(ax + 0.5, ay + 0.5)], ['L', p(bx + 0.5, by + 0.5)]);
  // Version 9.2 (Track V, ruling 1846): the far zoom has no room for ruts and pebbles, so the road reads from two broad strokes baked into the chunk (never drawn per frame): a kerb shadow
  // on the low side (the stroke shifted down the screen, so only the lower edge shows it) and, over the top, a darker centre where the carts run.
  if (path.length) g.stroke(path.map(([c, q]) => [c, [q[0], q[1] + KERB.drop]]), SHADOW, KERB.width, KERB.alpha);
  for (const [x, y] of dots) { const q = p(x + 0.5, y + 0.5); g.circ([q[0], q[1] + KERB.drop], 6 * 0.6, SHADOW, { alpha: KERB.alpha }); }
  if (look === 0) {   // wheel dust: a wide soft fringe of the track's edge tone that frays into the sand
    if (path.length) g.stroke(path, TERRAIN.roadEdge, 18, 0.22);
    for (const [x, y] of dots) g.circ(p(x + 0.5, y + 0.5), 18 / 2 * 0.6, TERRAIN.roadEdge, { alpha: 0.22 });
  }
  const layers = [[SHADOW, 15, 0.12]];
  if (surf.rim) layers.push([surf.rim, paved || kind === 'kerbed' ? 13 : 11.6, 1]);
  layers.push([paved ? (look === 3 ? surf.edge : STONE[1]) : surf.edge, 12, 1], [surf.top, paved ? 11 : 10, 1]);
  for (const [c, w, a] of layers) {
    if (path.length) g.stroke(path, c, w, a);
    for (const [x, y] of dots) g.circ(p(x + 0.5, y + 0.5), w / 2 * 0.6, c, { alpha: a });
  }
  if (paved) {   // joints across the street at every tile, and a gold centre line on an avenue
    for (const [ax, ay, bx, by] of segs) {
      const alongX = ay === by, c = [ax + 0.5, ay + 0.5];
      const at = (a, o) => p(c[0] + (alongX ? a : o), c[1] + (alongX ? o : a));   // a along the street, o across it, from the tile's centre
      if (look !== 3) { g.line(at(0, -0.44), at(0, 0.44), STONE[2], 0.45, 0.45); continue; }
      // the Capital's slabs: a joint down each lane edge, the middle lane's cross joints at the tile's centre and the outer lanes' half a tile along, so no joint runs straight across
      for (const o of [-0.17, 0.17]) g.line(at(0, o), at(bx - ax + by - ay, o), CAPITAL_STONE.joint, 0.4, 0.55);
      g.line(at(0, -0.17), at(0, 0.17), CAPITAL_STONE.joint, 0.4, 0.55);
      for (const o of [-0.44, 0.44]) g.line(at(0.5, o), at(0.5, o * 0.39), CAPITAL_STONE.joint, 0.4, 0.55);
    }
    // Version 10.0 (Track Q, ruling 2144): the wear of the street, baked: two darker tracks along the road's axis where the carts' wheels pass, either side of its middle.
    const wear = [];
    for (const [ax, ay, bx, by] of segs) {
      const alongX = ay === by;
      for (const o of [-WEAR.offset, WEAR.offset]) wear.push(['M', p(ax + 0.5 + (alongX ? 0 : o), ay + 0.5 + (alongX ? o : 0))], ['L', p(bx + 0.5 + (alongX ? 0 : o), by + 0.5 + (alongX ? o : 0))]);
    }
    if (wear.length) g.stroke(wear, SHADOW, WEAR.width, WEAR.alpha);
    if (look === 3 && path.length) g.stroke(path, GOLD, 0.8, 0.6);
    return;
  }
  if (path.length) g.stroke(path, surf.edge, CART_TRACK.width, CART_TRACK.alpha);
  const ruts = [];
  for (const [ax, ay, bx, by] of segs) {
    const alongX = ay === by;
    for (const o of [-0.12, 0.12]) {
      const ox = alongX ? 0 : o, oy = alongX ? o : 0;
      ruts.push(['M', p(ax + 0.5 + ox, ay + 0.5 + oy)], ['L', p(bx + 0.5 + ox, by + 0.5 + oy)]);
    }
  }
  if (ruts.length) g.stroke(ruts, surf.edge, 0.7, 0.7);
  if (look === 0) {   // dust flecked along both edges of the track, seeded by the tile
    for (const [ax, ay, , by] of segs) {
      const alongX = ay === by;
      for (let j = 0; j < 3; j++) {
        const t = hash2(ax, ay, 40 + j), u = 0.5 + (j % 2 ? 1 : -1) * (0.34 + hash2(ax, ay, 50 + j) * 0.18);
        g.circ(p(ax + (alongX ? t : u), ay + (alongX ? u : t)), 0.7 + hash2(ax, ay, 60 + j) * 0.7, TERRAIN.roadEdge, { alpha: 0.3 });
      }
    }
  }
}

// Street trees (City) and lamps (Capital) along built-up roads: on the verge, at the road's edge, spaced along the street. Baked after the roads.
export function drawStreetFurniture(g, world, range) {
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (!isRoad(world, x, y) || world.terrain[idx(world.size, x, y)] === T.WATER || wallCode(world, x, y)) continue;
      const look = roadLook(world, x, y);
      if (look < 2 || !builtUp(world, x, y)) continue;
      const rx = isRoad(world, x - 1, y) || isRoad(world, x + 1, y), ry = isRoad(world, x, y - 1) || isRoad(world, x, y + 1);
      if (rx === ry) continue;   // a junction or a lone tile: leave it clear
      const step = look === 3 ? 4 : 3, along = rx ? x : y, k = along % step;
      const wantTree = look === 2 ? k === 0 : k === 2, wantLamp = look === 3 && k === 0, wantPlanter = look === 3 && k === 1;
      if (!wantTree && !wantLamp && !wantPlanter) continue;
      const sides = (rx ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]).filter(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return inBounds(world.size, nx, ny) && !world.occ[idx(world.size, nx, ny)] && !isRoad(world, nx, ny) && world.terrain[idx(world.size, nx, ny)] !== T.WATER;
      });
      if (!sides.length) continue;
      const [dx, dy] = sides[hash2(x, y, 70) < 0.5 ? 0 : sides.length - 1];
      const q = p(x + 0.5 + dx * 0.62, y + 0.5 + dy * 0.62);
      if (wantLamp) {
        g.ell([q[0] + 0.5, q[1] + 0.3], 2.4, 0.9, SHADOW, { alpha: 0.2 });
        g.line(q, [q[0], q[1] - 9], STONE[2], 0.9);
        g.circ([q[0], q[1] - 9.6], 2.6, GOLD, { alpha: 0.22 });
        g.circ([q[0], q[1] - 9.6], 1.2, GOLD);
      } else if (wantPlanter) {   // a low stone planter with flowers (the Capital's street garden)
        g.ell([q[0] + 0.8, q[1] + 0.5], 4.6, 1.6, SHADOW, { alpha: 0.2 });
        g.poly([[q[0] - 3.2, q[1] - 1.6], [q[0], q[1] - 3.2], [q[0] + 3.2, q[1] - 1.6], [q[0] + 3.2, q[1] + 0.4], [q[0], q[1] + 2], [q[0] - 3.2, q[1] + 0.4]], CAPITAL_STONE.edge);
        g.poly([[q[0] - 3.2, q[1] - 1.6], [q[0], q[1] - 3.2], [q[0] + 3.2, q[1] - 1.6], [q[0], q[1] - 0.1]], LEAF);
        for (const [dx, dy, c] of [[-1.6, -2.6, PINK], [0.4, -3, GOLD], [1.8, -2, '#FFFFFF']]) g.circ([q[0] + dx, q[1] + dy], 0.9, c);
      } else if (look === 3) {   // a palm: a leaning trunk and a crown of fronds
        g.ell([q[0] + 1, q[1] + 0.4], 4.2, 1.5, SHADOW, { alpha: 0.22 });
        g.line(q, [q[0] + 0.8, q[1] - 8], TRUNK, 1.2);
        const top = [q[0] + 0.8, q[1] - 8.4];
        for (const [dx, dy] of [[-5, 1.2], [-3.4, -2.2], [0, -3], [3.6, -2], [5, 1.4]]) g.line(top, [top[0] + dx, top[1] + dy], dx < 0 || dy < -2.5 ? LEAF : LEAF2, 1.5);
      } else {
        g.ell([q[0] + 1, q[1] + 0.4], 4.2, 1.5, SHADOW, { alpha: 0.22 });
        g.line(q, [q[0], q[1] - 5], TRUNK, 1.1);
        g.circ([q[0] - 0.8, q[1] - 6.4], 3.2, LEAF);
        g.circ([q[0] + 1.2, q[1] - 7.4], 2.8, LEAF2);
      }
    }
  }
}
