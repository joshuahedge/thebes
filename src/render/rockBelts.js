// Rock belts on the ground (Stage 4.7, Task 3b). On a map with new land the rocky ground lies in long belts (src/sim/belts.js) with hills for their spines
// (src/sim/hills.js, drawn in src/render/hills.js), and it is drawn to read at phone zoom as one continuous, distinct landmark, not a brown stain on the sand:
//   - a three-value ladder from the edge in: scree (the sand a little darker, cooler), the body (about a quarter darker than sand, grey-beige: clay is
//     saturated terracotta and loam dark olive, so rock is told apart by value and by being desaturated), and the ground under a hill (about 40% darker);
//   - a crisp lit rim along the north-west edge, a lavender toe shadow cast on the sand along the south-east edge;
//   - strata: broken horizontal dashes snapped to a 6 art px grid, so a line runs on from tile to tile where two tiles both draw one;
//   - boulders (few, large, faceted, each with its own toe shadow) that thin out towards the edge, and a ragged debris line of pebbles along the toe.
// Every pass is ONE path over all the belt's tiles in range (the same wavering blobs as every layer), so there are no seams between tiles or chunks. Only new
// land draws this (terrainBaker.js calls it when hasNewLand); classic at Normal keeps its old look. Look only: nothing here writes the sim.
import { p } from './iso.js';
import { hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { SHADOW, TERRAIN } from './art/palette.js';

export const BELT = {
  scree: '#E0CDA2', edge: '#CDBE9B', body: TERRAIN.beltRock, hill: '#87806C',
  rim: '#F6EDD2', toe: '#6A5A78',
  boulder: '#A09282', boulderLit: '#D7CBB2', boulderShade: '#7D707E',
  strata: '#6C5F66', strataLit: '#F3E9CC',
};

const isRockT = (t) => t === T.ROCKY || t === T.HILLS;
const depths = new WeakMap();   // terrain -> Uint8Array: steps in from the belt's edge (4 directions; 1 at the edge, capped at 3; 0 off the rock)

// How far in from its edge each rock tile lies; once a world (terrain never changes in play).
export function rockDepth(world) {
  let d = depths.get(world.terrain);
  if (d) return d;
  const n = world.size, t = world.terrain;
  d = new Uint8Array(n * n);
  const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? 0 : d[y * n + x]);
  const seen = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? false : isRockT(t[y * n + x]));
  for (let pass = 1; pass <= 3; pass++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (!isRockT(t[i]) || d[i]) continue;
        const edge = pass === 1 ? ![[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => seen(x + dx, y + dy)) : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen(x + dx, y + dy) && at(x + dx, y + dy) === pass - 1);
        if (edge) d[i] = pass;
      }
    }
  }
  for (let i = 0; i < d.length; i++) if (isRockT(t[i]) && !d[i]) d[i] = 3;
  depths.set(world.terrain, d);
  return d;
}

// The belt's ground in one chunk's range: `helpers` are terrainBaker's blobFor and forTiles (passed in, so the two files never import each other).
export function drawBeltGround(g, world, range, { blobFor, forTiles }) {
  const n = world.size, ter = world.terrain, depth = rockDepth(world), ctx = g.ctx;
  const rock = [], hills = [];
  forTiles(world, range, (x, y, i) => { if (ter[i] === T.ROCKY) rock.push([x, y, depth[i]]); else if (ter[i] === T.HILLS) hills.push([x, y, depth[i]]); });
  if (!rock.length && !hills.length) return;
  const all = [...rock, ...hills];
  const onRock = (tx, ty) => isRockT(ter[ty * n + tx]);
  const inner = (tx, ty) => { const i = ty * n + tx; return isRockT(ter[i]) && depth[i] >= 2; };
  const onHill = (tx, ty) => ter[ty * n + tx] === T.HILLS;
  const pass = (list, expand, test, colour, alpha, dx = 0, dy = 0, salt = 1) => {
    ctx.beginPath();
    for (const [x, y] of list) {
      const pts = blobFor(world, x, y, -30 - salt, 30 + salt, expand, test);
      ctx.moveTo((pts[0][0] + dx) * g.scale, (pts[0][1] + dy) * g.scale);
      for (let k = 1; k < pts.length; k++) ctx.lineTo((pts[k][0] + dx) * g.scale, (pts[k][1] + dy) * g.scale);
      ctx.closePath();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.fill('nonzero');
    ctx.globalAlpha = 1;
  };
  pass(all, 0.5, onRock, BELT.scree, 0.5, 0, 0, 1);              // the scree fading out into the sand
  pass(all, 0.12, onRock, BELT.toe, 0.34, 3, 1.8, 2);            // the toe: the belt's shadow on the sand to its south-east
  pass(all, 0.02, onRock, BELT.rim, 0.9, -1.4, -0.9, 3);         // the lit rim along the north-west edge (the body covers the rest)
  pass(all, 0.02, onRock, BELT.edge, 1, 0, 0, 1);                // the belt
  const body = all.filter(([, , d]) => d >= 2);
  if (body.length) pass(body, -0.12, inner, BELT.body, 1, 0, 0, 4);   // the body, a value darker
  if (hills.length) pass(hills, 0.04, onHill, BELT.hill, 1, 0, 0, 5);   // the ground under a hill
}

// Strata, boulders and debris on one rocky tile (scatterTile calls it for a ROCKY tile of a map with new land; `i` its index).
export function beltScatter(g, world, x, y, i) {
  const n = world.size, ter = world.terrain, d = rockDepth(world)[i], seed = world.seed;
  const h = (k) => hash2(x, y, seed + 700 + k);
  const cq = p(x + 0.5, y + 0.5);
  // strata: one or two broken dashes on rows of a 6 art px grid, a dark line and a light one under it
  if (h(1) < 0.75) {
    const dashes = h(2) < 0.4 ? 2 : 1;
    for (let k = 0; k < dashes; k++) {
      const row = Math.round((cq[1] + (h(3 + k) - 0.5) * 9) / 6) * 6, w = 5 + h(5 + k) * 11, c = cq[0] + (h(7 + k) - 0.5) * 8;
      g.line([c - w, row], [c + w, row + 0.4], BELT.strata, 0.9, 0.2);
      g.line([c - w + 1, row + 1.1], [c + w + 1, row + 1.5], BELT.strataLit, 0.8, 0.26);
    }
  }
  // boulders thin out towards the edge: one a tile and a half deep in the body, one in seven at the edge
  if (h(10) < (d >= 3 ? 0.42 : d === 2 ? 0.3 : 0.12)) {
    const s = 0.75 + h(11) * h(11) * 1.7, q = p(x + 0.2 + h(12) * 0.6, y + 0.25 + h(13) * 0.5);
    boulder(g, q, s);
  }
  // the debris line along the toe: pebbles on a tile whose south-east neighbour is not rock
  const out = (dx, dy) => { const tx = x + dx, ty = y + dy; return tx >= 0 && ty >= 0 && tx < n && ty < n && !isRockT(ter[ty * n + tx]); };
  if (out(1, 0) || out(0, 1)) {
    const k = 2 + Math.floor(h(20) * 3);
    for (let j = 0; j < k; j++) {
      const u = h(21 + j), edgeX = out(1, 0) && (!out(0, 1) || h(30 + j) < 0.5);
      const q = edgeX ? p(x + 0.75 + h(40 + j) * 0.4, y + u) : p(x + u, y + 0.75 + h(40 + j) * 0.4);
      g.circ(q, 0.7 + h(50 + j) * 0.9, j % 2 ? '#B7A78A' : '#8C7F72', { alpha: 0.85 });
    }
  }
}

// Scree on a sand tile beside the belt: a few pebbles and, now and then, a small rock.
export function screeScatter(g, world, x, y) {
  const h = (k) => hash2(x, y, world.seed + 760 + k);
  const k = h(1) < 0.55 ? 2 : 1;
  for (let j = 0; j < k; j++) g.circ(p(x + h(2 + j), y + h(5 + j)), 0.7 + h(8 + j) * 0.7, j % 2 ? '#C9B898' : '#9C8F7C', { alpha: 0.8 });
  if (h(11) < 0.1) boulder(g, p(x + 0.2 + h(12) * 0.6, y + 0.3 + h(13) * 0.4), 0.6 + h(14) * 0.4);
}

// A boulder: a faceted stone with a lit top, a shaded side and its own toe shadow, `s` times the size of a scatter rock.
function boulder(g, q, s) {
  g.ell([q[0] + 2 * s, q[1] + 1 * s], 5.4 * s, 1.5 * s, SHADOW, { alpha: 0.2 });
  const P = (px, py) => [q[0] + px * s, q[1] + py * s];
  g.poly([P(-4.4, 0.2), P(-3.2, -3.8), P(0, -5.4), P(3.6, -3.6), P(4.8, 0.3), P(1.2, 1.5), P(-2.8, 1.3)], BELT.boulder, { outline: true });
  g.poly([P(-3.2, -3.8), P(0, -5.4), P(3.6, -3.6), P(0.6, -2.5)], BELT.boulderLit);
  g.poly([P(3.6, -3.6), P(4.8, 0.3), P(1.2, 1.5), P(0.6, -2.5)], BELT.boulderShade);
}
