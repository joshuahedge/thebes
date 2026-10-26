// Version 8.2 (Track G, rulings 1300-1305): the Great oasis layout. No river anywhere: one great lake in the desert (an ellipse with a wobbling,
// noisy edge and one or two lobes that give its shore bays and points), its bank, and a wide fertile ring, the same band every river has
// (MAP.fertileBase less the river's half-width, plus the noise); then 2-4 small spring pools a few tiles beyond its edge, each with a bank
// and a fertile ring. generateMap (src/sim/mapgen.js) calls drawGreatOasis in place of a river, as it calls drawCourse for the 7.1 layouts,
// and lays everything else the same way (clay, the desert oases, rock belts, hills, the meadow, the resource repair on the start's own land,
// dunes and wadis; a Great oasis map always has at least one wadi). The draws are one createRng stream keyed by the seed with
// MAP_SALT.greatOasis, so the map is a function of (seed, size, layout) alone and no other layout moves.
//
// The flood (ruling 1305): the floodplain is, as on every map, the fertile land within FLOOD.reach of water (src/sim/flood.js floodplainOf),
// so the lake's fertile ring floods and harvests exactly as a river's does. The spring pools are listed as oases (world.oases): a wharf, a
// Nilometer or a Quay may not use them (ruling 463). The lake keeps MAP.greatOasis.edge tiles from every edge, so no boat reaches it.
import { createRng, valueNoise } from './rng.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { T } from './terrain.js';
import { MAP, MAP_SALT } from '../data/map.js';

const round2 = (n) => Math.round(n * 100) / 100;
const isDry = (t) => t === T.DESERT || t === T.FERTILE || t === T.MEADOW;

// Draws the lake and the springs on `terrain` (all desert before) and returns what drawCourse returns (ex: the trade road's column on the
// south edge; focus: the start area's centre; ranges: the x ranges rock belts may use; course: params.course) and the springs as oases
// ([{ x, y, r }]).
export function drawGreatOasis(terrain, size, seed) {
  const G = MAP.greatOasis, S = size - 1;
  const rng = createRng((seed ^ MAP_SALT.greatOasis) >>> 0);
  const at = (n) => (size === MAP.size ? n : Math.round((n * size) / MAP.size));
  const fy = size + MAP.focusOffset.y;   // the start area's row, as on every map
  const r = rng.range(G.r[0], G.r[1]) * Math.sqrt(size / MAP.size), aspect = rng.range(G.aspect[0], G.aspect[1]);
  const rx = r * Math.sqrt(aspect), ry = r / Math.sqrt(aspect);
  const cx = S / 2 + rng.range(-1, 1) * at(G.dx), cy = fy - ry - rng.range(G.gap[0], G.gap[1]);
  const blobs = [{ x: cx, y: cy, rx, ry }];
  const inlets = G.inlets[0] + rng.int(G.inlets[1] - G.inlets[0] + 1);
  for (let k = 0; k < inlets; k++) {
    const a = rng.range(-Math.PI * 0.95, -Math.PI * 0.05), ir = rng.range(G.inletR[0], G.inletR[1]);   // on the north half of the shore, never facing the start
    blobs.push({ x: cx + Math.cos(a) * rx * 0.95, y: cy + Math.sin(a) * ry * 0.95, rx: ir, ry: ir });
  }
  // Each tile's distance past the lake's edge (any blob), the edge wavering with the noise; the edge clamp keeps all water off the map's rim.
  const fertile = MAP.fertileBase - MAP.waterHalfWidth;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let e = 99;
      for (const b of blobs) e = Math.min(e, (Math.hypot((x - b.x) / b.rx, (y - b.y) / b.ry) - 1) * Math.min(b.rx, b.ry));
      e += (valueNoise(x, y, seed + 71, 3) - 0.5) * G.wobble;
      const rim = Math.min(x, y, S - x, S - y);
      let t = T.DESERT;
      if (e <= 0 && rim >= G.edge) t = T.WATER;
      else if (e <= 1) t = T.BANK;
      else if (e <= fertile + valueNoise(x, y, seed, MAP.fertileNoiseScale) * MAP.fertileNoise) t = T.FERTILE;
      terrain[idx(size, x, y)] = t;
    }
  }
  // where the noise steepens the edge, a dry tile beside the water would skip the bank: the bank ring is whole
  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] === T.WATER || terrain[i] === T.BANK) continue;
    const x = i % size, y = (i - x) / size;
    if (NEIGHBOURS4.some(([dx, dy]) => inBounds(size, x + dx, y + dy) && terrain[idx(size, x + dx, y + dy)] === T.WATER)) terrain[i] = T.BANK;
  }
  const ex = Math.round(cx + rng.range(-3, 3)), focus = { x: ex + (rng.chance(0.5) ? -MAP.courses.focusOff : MAP.courses.focusOff), y: fy };
  const springs = drawSprings(terrain, size, rng, { focus, ex });
  return { ex, focus, ranges: [[at(3), S - at(3)]], course: { lake: { x: round2(cx), y: round2(cy), rx: round2(rx), ry: round2(ry) }, inlets, springs: springs.length }, springs };
}

// The spring pools: each a centre tile and 1-4 of its 4-neighbours (2-5 tiles of water), a bank round it (the tiles beside it, 8 ways) and a
// fertile ring one tile beyond, springFrom tiles out from the lake's edge in a seeded direction; refused (and tried again) unless every pool
// tile keeps 3 tiles from other water and the edge clamp from the map's rim, and it keeps off the start area and the trade road's corridor.
function drawSprings(terrain, size, rng, { focus, ex }) {
  const G = MAP.greatOasis, S = size - 1, out = [];
  const want = G.springs[0] + rng.int(G.springs[1] - G.springs[0] + 1);
  // Chebyshev distance to the nearest water, out to 12
  const wet = (x, y, d) => { for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (inBounds(size, x + dx, y + dy) && terrain[idx(size, x + dx, y + dy)] === T.WATER) return true; return false; };
  const lakeEdge = [];
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.WATER) lakeEdge.push(i);
  for (let tries = 0; tries < 80 && out.length < want; tries++) {
    const from = lakeEdge[rng.int(lakeEdge.length)], a = rng.range(0, Math.PI * 2), d = rng.range(G.springFrom[0], G.springFrom[1]);
    const sx = Math.round((from % size) + Math.cos(a) * d), sy = Math.round(Math.floor(from / size) + Math.sin(a) * d);
    const n = G.springTiles[0] - 1 + rng.int(G.springTiles[1] - G.springTiles[0] + 1);
    const pool = [[sx, sy]], order = NEIGHBOURS4.map((nb) => [nb, rng.next()]).sort((p, q) => p[1] - q[1]).map(([nb]) => nb);
    for (let k = 0; k < n; k++) pool.push([sx + order[k][0], sy + order[k][1]]);
    const ok = pool.every(([x, y]) => x >= G.edge && y >= G.edge && x <= S - G.edge && y <= S - G.edge && isDry(terrain[idx(size, x, y)]) && !wet(x, y, 3))
      && Math.hypot(sx - focus.x, sy - focus.y) >= 7 && !(Math.abs(sx - ex) <= 4 && sy >= size - 15)
      && out.every((o) => Math.hypot(sx - o.x, sy - o.y) >= 6);
    if (!ok) continue;
    for (const [x, y] of pool) terrain[idx(size, x, y)] = T.WATER;
    for (const ring of [1, 2]) {
      for (const [px, py] of pool) {
        for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
          if (!inBounds(size, px + dx, py + dy)) continue;
          const i = idx(size, px + dx, py + dy);
          if (ring === 1 && isDry(terrain[i])) terrain[i] = T.BANK;
          else if (ring === 2 && (terrain[i] === T.DESERT || terrain[i] === T.MEADOW)) terrain[i] = T.FERTILE;
        }
      }
    }
    out.push({ x: sx, y: sy, r: 1.5 });
  }
  return out;
}
