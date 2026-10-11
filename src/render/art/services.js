// Service buildings, farms and the Stage 2 homes' neighbours, ported from the approved mock-up where it has them
// (well, granary, bazaar, temple, fieldTile, gardenT, the colossus) and drawn in its style where it does not.
// Farms are a fenced 2x2 of crop tiles (grain, barley, flax) or fig trees with a small farmhouse in the near corner.
// Each service and farm carries a small pennant in its emblem colour (spec 5.3) so it reads at phone zoom.
// Granaries and bazaars show their stock and farms their crop (early-game pass 2.2, 2.3): each draws a stage
// chosen by stages.js, and SERVICE_ART registers one slot per stage beside the plain type slot.
import { box, tb, qd, crs, door, fence, pots, awn, col, rug, bed, pool, tile, p, U, quad, hs } from './primitives.js';
import { palmAt, tufts } from './nature.js';
import { fig } from './figures.js';
import {
  WASH, WASH2, MUD2, STONE, THATCH, GOLDC, TEAL, TEAL_DARK, BLUE, RED, RED_DARK, GOLD, PINK, ORANGE, GREEN, GREEN_DARK,
  LEAF, LEAF2, LEAF3, TRUNK, WOOD, DOOR, SHADOW, TERRAIN, INDUSTRY_TINT,
} from './palette.js';
import { boundsFor } from '../iso.js';

export const SERVICE_EMBLEM = {
  well: BLUE, farm_grain: LEAF2, granary: GREEN, bazaar: RED, temple: GOLD,
  farm_fig: LEAF2, farm_barley: INDUSTRY_TINT, farm_flax: INDUSTRY_TINT, booth: PINK,
};

export function pennant(g, q, h, color) {
  g.line(q, U(q, h), WOOD, 0.7);
  g.poly([U(q, h), [q[0] + 6, q[1] - h + 1.5], U(q, h - 3)], color);
}

// A field tile: crop colour with straight rows of stalks: green grain, golden barley, or flax with blue flowers.
export function fieldTile(g, x, y, k) {
  tile(g, x, y, { grain: TERRAIN.field, barley: '#D7BF62', flax: '#80AA52' }[k], { stroke: TERRAIN.fieldEdge, strokeWidth: 0.6, strokeAlpha: 0.35 });
  for (let v = 0.14; v < 0.95; v += 0.18) {
    for (let u = 0.08; u < 0.98; u += 0.11) {
      const q = p(x + u, y + v), hh = 2.2 + hs(x * 7 + u, y * 3 + v, 1) * 1.2;
      if (k === 'grain') {
        g.line(q, [q[0] - 0.3, q[1] - hh], '#4F7A2C', 0.7);
        g.line(q, [q[0] + 0.6, q[1] - hh * 0.8], '#A6CC5E', 0.6);
      } else if (k === 'barley') {
        g.line(q, [q[0] + 0.2, q[1] - hh], '#A88E3A', 0.7);
        g.circ([q[0] + 0.2, q[1] - hh], 0.55, '#F2DE90');
      } else {
        g.line(q, [q[0], q[1] - hh], '#4F7A2C', 0.6);
        if (hs(x + u, y + v, 4) > 0.45) g.circ([q[0], q[1] - hh], 0.6, '#8DB8EE');
      }
    }
  }
}

// Well: a stone drum of water with a wooden frame, a rope and a bucket, and a blue pennant.
export function well(g, x, y) {
  const gx = x + 0.5, gy = y + 0.5;
  const F = box(g, gx - 0.22, gy - 0.22, 0.44, 0.44, 4, 0, STONE);
  crs(g, F, 4, '#A89AA8', 1.6);
  g.poly(quad(gx - 0.15, gy - 0.15, 0.3, 0.3, 4), TERRAIN.water);
  const a = U(p(gx - 0.2, gy), 4), b = U(p(gx + 0.2, gy), 4);
  g.line(a, U(a, 8), WOOD, 0.9);
  g.line(b, U(b, 8), WOOD, 0.9);
  g.line(U(a, 8), U(b, 8), WOOD, 0.9);
  const m = U(p(gx, gy), 12);
  g.line(m, U(m, 4.6), '#8C7B5C', 0.4);
  g.ell(U(p(gx, gy), 6.8), 1, 1.2, '#7A5530');
  pennant(g, U(b, 8), 6, SERVICE_EMBLEM.well);
}

// Granary: a whitewashed block with a teal band, four domed silos and grain sacks by the door. `stage`
// (granaryStage) shows the stock so it reads at map zoom on a phone: 0 empty, dark hatches and a bare yard;
// 1 grain in the front silo and two sacks; 2 grain in two silos, a row of sacks and a small heap at the door;
// 3 every silo heaped, six sacks and a big heap, about a quarter of a tile across, at the door.
const GRAIN = GOLD, GRAIN_LIGHT = GOLDC[0], GRAIN_SHADE = GOLDC[2], GRAIN_SPECK = ORANGE;
const SACKS = ['#D8B47A', '#C8A068'], SACK_TIE = '#9C7A54';
const SILO_RANK = [1, 2, 3, 0];                    // each silo's turn to fill (back, right, left, front): front first
const SILOS_FILLED = [0, 1, 2, 4];
const SACK_SPOTS = [0.46, 0.6, 0.74, 1.4, 1.53, 1.66]; // tile x along the lit face's foot, left then right of the door
const SACKS_AT = [0, 2, 3, 6];
const YARD_HEAP = [null, null, [3.2, 2.8], [5, 4.6]];   // [half-width, height] in art px of the heap at the door

// A heap of loose grain standing on the art point q, rx half-width and h tall, lit from the upper left.
function grainHeap(g, q, rx, h) {
  const [x, y] = q, ry = rx * 0.45, left = [x - rx, y], right = [x + rx, y], peak = [x - rx * 0.1, y - h];
  g.ell([x + rx * 0.3, y + ry * 0.3], rx * 1.1, ry * 1.2, SHADOW, { alpha: 0.18 });             // its shadow on the ground
  g.path([['M', left], ['Q', [x - rx * 0.6, y - h * 1.05], peak], ['Q', [x + rx * 0.45, y - h * 1.05], right], ['Q', [x, y + ry * 2], left], ['Z']], GRAIN, { outline: true });
  g.path([['M', peak], ['Q', [x + rx * 0.45, y - h * 1.05], right], ['Q', [x + rx * 0.6, y + ry * 1.6], [x + rx * 0.25, y + ry * 0.9]], ['Q', [x + rx * 0.15, y - h * 0.35], peak], ['Z']], GRAIN_SHADE, { alpha: 0.5 });
  g.ell([x - rx * 0.4, y - h * 0.45], rx * 0.28, h * 0.2, GRAIN_LIGHT, { alpha: 0.9 });
  for (const [a, b] of [[-0.5, -0.1], [0.05, -0.55], [0.35, 0.1], [-0.15, 0.3]]) g.circ([x + a * rx, y + b * h * 0.6], 0.35, GRAIN_SPECK, { alpha: 0.7 });
}

function sack(g, q, color) {
  g.ell(U(q, 1.4), 1.8, 1.5, color, { outline: true });
  g.ell(U(q, 3), 0.8, 0.45, SACK_TIE);
}

export function granary(g, X, Y, stage = 3) {
  const F = box(g, X + 0.1, Y + 0.1, 1.8, 1.8, 9, 0, WASH);
  door(g, F, 0.42, 0.58, 6);
  qd(g, F.L, 0, 1, 7.4, 8.4, TEAL);
  qd(g, F.R, 0, 1, 7.4, 8.4, TEAL_DARK);
  [[0.6, 0.6], [1.4, 0.6], [0.6, 1.4], [1.4, 1.4]].forEach(([u, v], i) => {
    const c = U(p(X + u, Y + v), 9);
    g.dome(c, 8, 8.5, 4, { outline: true });
    const top = [c[0], c[1] - 8.2];
    if (SILO_RANK[i] >= SILOS_FILLED[stage]) { g.circ(top, 1.3, '#5A4A5A'); return; }
    g.ell(top, 4.4, 2.2, GRAIN_SHADE, { outline: true });                   // the open hatch, full of grain
    if (stage === 3) { grainHeap(g, [top[0], top[1] + 0.3], 4, 3.8); return; }     // heaped above the brim
    g.ell([top[0] - 0.2, top[1] - 0.2], 3.8, 1.8, GRAIN);
    g.ell([top[0] - 1.2, top[1] - 0.7], 1.8, 0.7, GRAIN_LIGHT);
  });
  SACK_SPOTS.slice(0, SACKS_AT[stage]).forEach((x, i) => sack(g, p(X + x, Y + 2.06), SACKS[i % 2]));
  if (YARD_HEAP[stage]) grainHeap(g, p(X + 1, Y + 2.16), ...YARD_HEAP[stage]);   // spilling from the door
  pennant(g, U(p(X + 1.85, Y + 0.15), 9), 7, SERVICE_EMBLEM.granary);
}

// Bazaar: four stalls, each a counter of goods under a striped awning in its own colour. The awnings hide the
// counter tops at map zoom, so the stock shows on the ground in front of each counter. `stage` (bazaarStage):
// 0 bare, with an empty basket by each stall; 1 a heaped basket in front of each counter; 2 piled: two heaped
// baskets and a jar in front of each counter and full baskets beside them.
const GOODS = [[0.3, '#C9552F'], [0.55, GOLD], [0.8, '#6E9E3A']];
const BASKET = '#B08436';
function heapedBasket(g, q, color) {
  g.ell(U(q, 0.9), 2.3, 1.35, BASKET, { outline: true });
  g.ell(U(q, 1.9), 1.8, 1.05, color, { outline: true });
}
export function bazaar(g, X, Y, stage = 2) {
  const cs = [[RED, '#933E2B'], [GOLD, '#B08436'], [BLUE, '#245A88'], [GREEN, GREEN_DARK]];
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => {
    const x = X + i, y = Y + j;
    box(g, x + 0.24, y + 0.3, 0.52, 0.4, 3.2, 0, ['#D9B47A', '#C49E66', '#A08478']);
    if (stage > 0) for (const [u, c] of GOODS) g.ell(U(p(x + 0.24 + 0.52 * u, y + 0.55), 3.4), 1.4, 0.9, c, { outline: true });
    const side = U(p(x + 0.88, y + 0.5), 1);
    if (stage === 2) g.ell(side, 1.6, 1, '#D9B060', { outline: true });
    else g.ell(side, 1.6, 1, 'none', { stroke: '#A08478', strokeWidth: 0.6 });
    if (stage >= 1) heapedBasket(g, p(x + 0.5, y + 0.9), GOODS[k % 3][1]);
    if (stage === 2) {
      heapedBasket(g, p(x + 0.74, y + 0.9), GOODS[(k + 1) % 3][1]);
      pots(g, p(x + 0.24, y + 0.88), 1);
    }
    awn(g, x + 0.1, y + 0.1, 0.8, 0.8, 7.5, cs[k][0], cs[k][1]);
  });
  pennant(g, U(p(X + 1.9, Y + 0.1), 8.7), 7, SERVICE_EMBLEM.bazaar);
}

// Temple: a stone platform, a hall with painted columns on both faces, two pylons with banded cornices
// and painted figures, a gold-topped gateway between teal columns, and flags (one in the emblem gold).
export function temple(g, X, Y) {
  box(g, X + 0.05, Y + 0.05, 1.9, 1.9, 2, 0, STONE);
  const Hh = box(g, X + 0.25, Y + 0.2, 1.5, 1, 13, 2, STONE);
  qd(g, Hh.R, 0, 1, 1, 11.5, '#9A8CA0');
  qd(g, Hh.L, 0, 1, 1, 11.5, '#A99AA6');
  for (let i = 0; i < 6; i++) {
    const u = 0.05 + i * 0.17;
    qd(g, Hh.R, u, u + 0.08, 1, 10, '#F4EDDF');
    qd(g, Hh.R, u, u + 0.08, 4, 5, TEAL);
    qd(g, Hh.R, u - 0.015, u + 0.095, 10, 11.5, GREEN);
  }
  for (let i = 0; i < 7; i++) {
    const u = 0.04 + i * 0.14;
    qd(g, Hh.L, u, u + 0.07, 1, 10, '#F4EDDF');
    qd(g, Hh.L, u, u + 0.07, 4, 5, TEAL);
    qd(g, Hh.L, u - 0.015, u + 0.085, 10, 11.5, GREEN);
  }
  box(g, X + 0.2, Y + 0.15, 1.6, 1.1, 1.6, 15, STONE);
  const pyl = (px) => {
    const F = tb(g, px, Y + 1.2, 0.75, 0.7, 21, 2, 0.1, STONE);
    for (const [a, b, c] of [[18.6, 19.8, TEAL], [17.6, 18.6, RED], [16.8, 17.6, GOLD]]) {
      qd(g, F.L, 0, 1, a, b, c);
      qd(g, F.R, 0, 1, a, b, c, { alpha: 0.8 });
    }
    qd(g, F.L, 0.22, 0.78, 4, 15, '#F7F1E4');
    qd(g, F.L, 0.42, 0.58, 5, 11, TEAL);
    g.circ(F.L(0.5, 12.6), 1.6, TEAL);
    qd(g, F.L, 0.36, 0.64, 9.5, 10.4, BLUE);
    g.circ(F.L(0.5, 14.3), 1, GOLD);
    qd(g, F.L, 0.26, 0.3, 5, 14, BLUE, { alpha: 0.7 });
    qd(g, F.L, 0.7, 0.74, 5, 14, BLUE, { alpha: 0.7 });
    for (let s = 3.5; s < 15; s += 2.2) if (hs(px, s, 3) > 0.3) qd(g, F.R, 0.2, 0.8, s, s + 0.7, '#9A8CA0', { alpha: 0.5 });
    box(g, px + 0.08, Y + 1.28, 0.59, 0.54, 1.4, 23, ['#F3EBDA', '#E2D7C4', '#C0B4C2']);
    const fp = U(p(px + 0.4, Y + 1.97), 2);
    g.line(fp, U(fp, 31), WOOD, 0.8);
    g.poly([U(fp, 31), [fp[0] + 9, fp[1] - 29], U(fp, 27)], px < X + 0.5 ? PINK : SERVICE_EMBLEM.temple);
  };
  pyl(X + 0.1);
  const G = box(g, X + 0.85, Y + 1.35, 0.3, 0.45, 12, 2, STONE);
  qd(g, G.L, 0.12, 0.88, 0, 9, DOOR);
  qd(g, G.L, 0, 1, 10, 12, GOLD);
  col(g, X + 0.86, Y + 1.86, 10, 2);
  col(g, X + 1.14, Y + 1.86, 10, 2);
  pyl(X + 1.15);
}

// One field tile at a growth stage: 0 fallow (ploughed furrows), 1 sprouting, 2 growing, 3 ripe. Each crop has its
// own look (spec 5.1): grain grows green (fieldTile) and ripens golden; barley grows blue-green and ripens into the
// mock-up's golden barley; flax grows as green stalks and ripens into the mock-up's blue flowers (both fieldTile).
const LOAM = '#8A6A42', FURROW = '#6E5234', RIDGE = '#B49268', SPROUT = '#7FB04A', SPROUT_TIP = '#B4D86A';
const RIPE = '#D4AE4E', RIPE_STALK = '#A88E3A', RIPE_HEAD = '#F2DE90';
const GROWING = {
  barley: { tile: '#A4B85C', stalk: '#6E8A34', tip: '#D2DE8E' },
  flax: { tile: '#7FA850', stalk: '#4F7A2C', tip: '#B4D488' },
};
export const CROPS = ['grain', 'barley', 'flax'];
export function cropTile(g, x, y, stage, crop = 'grain') {
  if (crop === 'grain' && stage === 2) { fieldTile(g, x, y, 'grain'); return; }
  if (crop !== 'grain' && stage === 3) { fieldTile(g, x, y, crop); return; }
  const edge = { stroke: TERRAIN.fieldEdge, strokeWidth: 0.6, strokeAlpha: 0.35 };
  if (stage === 3) {
    tile(g, x, y, RIPE, edge);
    for (let v = 0.14; v < 0.95; v += 0.18) {
      for (let u = 0.08; u < 0.98; u += 0.11) {
        const q = p(x + u, y + v), hh = 2.6 + hs(x * 7 + u, y * 3 + v, 1) * 1.2;
        g.line(q, [q[0] + 0.3, q[1] - hh], RIPE_STALK, 0.7);
        g.circ([q[0] + 0.3, q[1] - hh], 0.6, RIPE_HEAD);
      }
    }
    return;
  }
  if (stage === 2) {
    const look = GROWING[crop];
    tile(g, x, y, look.tile, edge);
    for (let v = 0.14; v < 0.95; v += 0.18) {
      for (let u = 0.08; u < 0.98; u += 0.11) {
        const q = p(x + u, y + v), hh = 2 + hs(x * 7 + u, y * 3 + v, 1) * 1.2;
        g.line(q, [q[0] + 0.1, q[1] - hh], look.stalk, 0.6);
        if (crop === 'barley') g.line([q[0] + 0.1, q[1] - hh], [q[0] + 1, q[1] - hh - 0.8], look.tip, 0.6);   // a whiskered ear
        else g.circ([q[0], q[1] - hh], 0.45, look.tip);                                                        // a closed bud
      }
    }
    return;
  }
  tile(g, x, y, LOAM, edge);
  for (let v = 0.14; v < 0.95; v += 0.18) {                 // a furrow per crop row, a pale ridge beside it
    g.line(p(x + 0.04, y + v), p(x + 0.96, y + v), FURROW, 0.8, 0.55);
    g.line(p(x + 0.04, y + v + 0.06), p(x + 0.96, y + v + 0.06), RIDGE, 0.6, 0.6);
  }
  if (stage !== 1) return;
  for (let v = 0.14; v < 0.95; v += 0.18) {
    for (let u = 0.08; u < 0.98; u += 0.11) {
      const q = p(x + u, y + v), hh = 0.9 + hs(x * 7 + u, y * 3 + v, 1) * 0.6;
      g.line(q, [q[0] - 0.3, q[1] - hh], SPROUT, 0.6);
      g.circ([q[0] - 0.3, q[1] - hh], 0.35, SPROUT_TIP);
    }
  }
}

// The small thatched farmhouse every farm keeps in its near corner, its yard (pots by the door, unless `yard` draws
// something else) and its pennant.
function farmhouse(g, X, Y, emblem, yard = () => pots(g, p(X + 1.2, Y + 1.78), 2)) {
  const a = X + 1.4, b = Y + 1.4, w = 0.52;
  const F = box(g, a, b, w, w, 5, 0, MUD2);
  crs(g, F, 5, '#9C7A54', 2.2);
  door(g, F, 0.34, 0.6, 3.6);
  tb(g, a - 0.06, b - 0.06, w + 0.12, w + 0.12, 4.5, 5, 0.3, THATCH);
  yard();
  pennant(g, U(p(a + w, b + 0.06), 0), 9, emblem);
}

// A fenced 2x2 field of one crop with the farmhouse in the near corner. `stage` (farmStage): 0 fallow,
// 1 sprouting, 2 growing, 3 ripe; the back row (the two tiles at j = 0) runs one stage ahead, capped at ripe, so a
// working field shows two stages at once.
export function farmField(g, X, Y, stage, crop, emblem) {
  const back = stage === 0 ? 0 : Math.min(3, stage + 1);
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cropTile(g, X + i, Y + j, j === 0 ? back : stage, crop);
  fence(g, X + 0.02, Y + 0.02, 1.96, 0.06);
  fence(g, X + 0.02, Y + 0.02, 0.06, 1.96);
  fence(g, X + 0.02, Y + 1.92, 1.3, 0.06);
  fence(g, X + 1.92, Y + 0.02, 0.06, 1.3);
  farmhouse(g, X, Y, emblem);
}

// Grain farm (Stage 1), barley farm and flax farm: the same fenced field with their own crop and pennant.
export function farmGrain(g, X, Y, stage = 2) { farmField(g, X, Y, stage, 'grain', SERVICE_EMBLEM.farm_grain); }
export function farmBarley(g, X, Y, stage = 3) { farmField(g, X, Y, stage, 'barley', SERVICE_EMBLEM.farm_barley); }
export function farmFlax(g, X, Y, stage = 3) { farmField(g, X, Y, stage, 'flax', SERVICE_EMBLEM.farm_flax); }

// Fig orchard: eight fig trees in rows on grassy loam inside the reed fence, and the farmhouse in the near corner.
// `stage` (farmStage): 0 bare branches (not working), 1 young leaves, 2 full green canopies, 3 ripe purple figs with
// full baskets by the farmhouse. The back row of trees runs a stage ahead, as on the fields.
const ORCHARD_FLOOR = '#9C8656';
const FIG = '#6B2F5E', FIG_LIGHT = '#A0588E', BARK = '#8A7058';
const ORCHARD_TREES = [[0.42, 0.4], [1.0, 0.36], [0.38, 1.0], [0.98, 0.98], [1.58, 0.42], [0.44, 1.6], [1.6, 0.92], [1.02, 1.58]];
export function figTree(g, gx, gy, stage) {
  const c = p(gx, gy), top = [c[0], c[1] - 4];
  g.ell([c[0] + 3, c[1] + 0.6], 6, 2, SHADOW, { alpha: 0.14 });
  g.line(c, top, TRUNK, 1.5);
  if (stage === 0) {
    for (const [dx, dy] of [[-3.6, -3.8], [3.2, -4.4], [0.4, -5.6], [-1.6, -2.8], [2, -2.2]]) g.line(top, [top[0] + dx, top[1] + dy], BARK, 0.8);
    return;
  }
  const r = stage === 1 ? 2.6 : 4.4, m = [top[0], top[1] - r * 0.6];
  const leaves = stage === 1 ? ['#8DBE4E', '#A6CC5E', '#B8D878', '#A6CC5E'] : [LEAF3, LEAF, LEAF2, '#86B64E'];
  [[-0.55, 0.15, 0.75], [0.55, 0.2, 0.75], [0, -0.3, 0.8], [-0.15, -0.45, 0.4]].forEach(([dx, dy, k], i) => {
    g.circ([m[0] + dx * r, m[1] + dy * r], r * k, leaves[i]);
  });
  if (stage === 3) {
    for (const [dx, dy] of [[-0.6, 0.3], [0.5, 0.45], [0.1, -0.1], [-0.25, -0.55], [0.7, -0.15], [-0.85, -0.2]]) {
      g.circ([m[0] + dx * r, m[1] + dy * r], 0.8, FIG);
      g.circ([m[0] + dx * r - 0.25, m[1] + dy * r - 0.25], 0.3, FIG_LIGHT);
    }
  }
}
export function figOrchard(g, X, Y, stage = 3) {
  const back = stage === 0 ? 0 : Math.min(3, stage + 1);
  const edge = { stroke: TERRAIN.fieldEdge, strokeWidth: 0.6, strokeAlpha: 0.35 };
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    tile(g, X + i, Y + j, ORCHARD_FLOOR, edge);
    tufts(g, X + i, Y + j, 5, 11);
  }
  fence(g, X + 0.02, Y + 0.02, 1.96, 0.06);
  fence(g, X + 0.02, Y + 0.02, 0.06, 1.96);
  for (const [u, v] of ORCHARD_TREES) figTree(g, X + u, Y + v, v < 0.5 ? back : stage);
  fence(g, X + 0.02, Y + 1.92, 1.3, 0.06);
  fence(g, X + 1.92, Y + 0.02, 0.06, 1.3);
  const baskets = () => { heapedBasket(g, p(X + 1.08, Y + 1.8), FIG); heapedBasket(g, p(X + 1.3, Y + 1.84), FIG_LIGHT); };
  farmhouse(g, X, Y, SERVICE_EMBLEM.farm_fig, stage === 3 ? baskets : undefined);
}

// Garden (1x1): a flower bed (the mock-up's gardenT) with a small pool in its front corner, two clipped shrubs and
// a young palm at the back.
export function garden(g, x, y) {
  bed(g, x + 0.1, y + 0.1, 0.8, 0.8);
  pool(g, x + 0.2, y + 0.56, 0.36, 0.28);
  palmAt(g, x + 0.66, y + 0.34, 0.6);
  for (const [u, v] of [[0.78, 0.74], [0.24, 0.3]]) {
    const q = p(x + u, y + v);
    g.ell([q[0] + 1.5, q[1] + 0.4], 2.6, 1, SHADOW, { alpha: 0.15 });
    g.circ(U(q, 2), 2.2, LEAF3, { outline: true });
    g.circ(U(q, 2.6), 1.4, LEAF2);
  }
}

// Statue (1x1): a seated figure in warm sandstone on a whitewashed plinth banded in teal, in the manner of the
// mock-up's colossus: a throne behind, knees and lap in front, arms on the knees, a head in a blue-striped
// headcloth, a gold collar and a gold crown.
const SANDSTONE = ['#E8CC94', '#D2AE72', '#A88E7E'];
export function seatedStatue(g, x, y) {
  const P = box(g, x + 0.2, y + 0.2, 0.6, 0.6, 4, 0, STONE);
  qd(g, P.L, 0, 1, 1.4, 2.4, TEAL);
  qd(g, P.R, 0, 1, 1.4, 2.4, TEAL_DARK);
  qd(g, P.L, 0, 1, 3.4, 4, GOLD);
  qd(g, P.R, 0, 1, 3.4, 4, GOLDC[2]);
  const Th = box(g, x + 0.3, y + 0.28, 0.4, 0.16, 9, 4, SANDSTONE);           // the throne's back
  qd(g, Th.R, 0, 1, 6.5, 7.5, BLUE, { alpha: 0.8 });
  const Lg = box(g, x + 0.36, y + 0.44, 0.28, 0.26, 4.4, 4, SANDSTONE);        // shins and lap
  qd(g, Lg.L, 0.48, 0.52, 0, 4.4, SANDSTONE[2], { alpha: 0.5 });
  const Tr = box(g, x + 0.38, y + 0.36, 0.24, 0.16, 6, 8.4, SANDSTONE);       // body
  qd(g, Tr.L, 0, 1, 4.6, 6, GOLD);                                             // the gold collar
  for (const u of [0.33, 0.6]) box(g, x + u, y + 0.44, 0.06, 0.24, 1.4, 8.4, SANDSTONE, 0);   // forearms on the knees
  const Hc = box(g, x + 0.4, y + 0.36, 0.2, 0.15, 4.2, 14, SANDSTONE);         // the headcloth, striped blue
  for (let s = 0.4; s < 4; s += 1.1) {
    qd(g, Hc.L, 0, 0.22, s, s + 0.55, BLUE);
    qd(g, Hc.L, 0.78, 1, s, s + 0.55, BLUE);
    qd(g, Hc.R, 0, 1, s, s + 0.55, BLUE, { alpha: 0.85 });
  }
  qd(g, Hc.L, 0.3, 0.7, 0.6, 3.4, SANDSTONE[1]);                               // the face
  qd(g, Hc.L, 0.36, 0.44, 2.2, 2.7, DOOR);
  qd(g, Hc.L, 0.56, 0.64, 2.2, 2.7, DOOR);
  box(g, x + 0.48, y + 0.5, 0.04, 0.04, 2, 12.4, SANDSTONE, 0);                // the beard
  tb(g, x + 0.43, y + 0.38, 0.14, 0.11, 3, 18.2, 0.035, GOLDC);                // the crown
}

// Booth (1x1): a low timber stage with a painted backdrop under a red-and-gold striped awning at the back, a dancer
// and a drum on the open front, a rug for the crowd and a pink pennant.
const PLANK = ['#D8B47A', '#C09A62', '#9C8072'];
export function booth(g, x, y) {
  rug(g, x + 0.1, y + 0.78, 0.5, 0.18, 0, RED, '#F2D7A8', GOLD);
  const F = box(g, x + 0.16, y + 0.14, 0.68, 0.6, 3, 0, PLANK);
  for (let u = 0.2; u < 1; u += 0.2) g.line(F.L(u, 0.4), F.L(u, 2.6), '#9C7A54', 0.4, 0.6);
  qd(g, F.L, 0, 1, 2.2, 2.8, TEAL);
  qd(g, F.R, 0, 1, 2.2, 2.8, TEAL_DARK);
  const B = box(g, x + 0.18, y + 0.16, 0.64, 0.08, 9, 3, WASH2);               // the backdrop, hung with cloth
  qd(g, B.L, 0.1, 0.9, 1, 8, ORANGE);
  for (const u of [0.25, 0.5, 0.75]) qd(g, B.L, u - 0.04, u + 0.04, 1, 8, GOLD);
  awn(g, x + 0.14, y + 0.12, 0.72, 0.3, 13.6, RED, RED_DARK, GOLD);
  g.ell(U(p(x + 0.72, y + 0.52), 4.4), 1.7, 1, '#B07A48', { outline: true });  // a drum
  g.ell(U(p(x + 0.72, y + 0.52), 5.4), 1.6, 0.75, '#F2E2BC');
  fig(g, x + 0.46, y + 0.56, 'woman', 3, 0.85);
  pennant(g, U(p(x + 0.86, y + 0.12), 14.8), 6, SERVICE_EMBLEM.booth);
}

// The plain type slots are what cards and assets show: a full granary, a piled bazaar, a green grain field, ripe
// barley, flax in flower and a fig orchard in fruit.
export const PLAIN_STAGE = { granary: 3, bazaar: 2, farm_grain: 2, farm_barley: 3, farm_flax: 3, farm_fig: 3 };

const FARM_SLOT = { w: 2, d: 2, height: 12, bounds: boundsFor(2, 2, 12), shadows: [[1.4, 1.4, 0.52, 0.52, 9]] };
const GRANARY_SLOT = { w: 2, d: 2, height: 22, bounds: boundsFor(2, 2, 22), shadows: [[0.1, 0.1, 1.8, 1.8, 16]] };
const BAZAAR_SLOT = {
  w: 2, d: 2, height: 16, bounds: boundsFor(2, 2, 16),
  shadows: [[0.12, 0.12, 0.76, 0.76, 9], [1.12, 0.12, 0.76, 0.76, 9], [0.12, 1.12, 0.76, 0.76, 9], [1.12, 1.12, 0.76, 0.76, 9]],
};
// Every farm's drawing by type, each taking (g, x, y, stage); slots are registered for each below.
export const FARM_DRAW = { farm_grain: farmGrain, farm_barley: farmBarley, farm_flax: farmFlax, farm_fig: figOrchard };

export const SERVICE_ART = {
  well: { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.28, 0.28, 0.44, 0.44, 6]], draw: well },
  granary: { ...GRANARY_SLOT, draw: (g, x, y) => granary(g, x, y, PLAIN_STAGE.granary) },
  bazaar: { ...BAZAAR_SLOT, draw: (g, x, y) => bazaar(g, x, y, PLAIN_STAGE.bazaar) },
  temple: { w: 2, d: 2, height: 40, bounds: boundsFor(2, 2, 40), shadows: [[0.25, 0.2, 1.5, 1, 15], [0.1, 1.2, 1.8, 0.7, 23]], draw: temple },
  garden: { w: 1, d: 1, height: 16, bounds: boundsFor(1, 1, 16), shadows: [], draw: garden },
  statue: { w: 1, d: 1, height: 22, bounds: boundsFor(1, 1, 22), shadows: [[0.2, 0.2, 0.6, 0.6, 4], [0.3, 0.28, 0.4, 0.42, 16]], draw: seatedStatue },
  booth: { w: 1, d: 1, height: 21, bounds: boundsFor(1, 1, 21), shadows: [[0.16, 0.14, 0.68, 0.6, 3], [0.14, 0.12, 0.72, 0.3, 13]], draw: booth },
};
// One slot per stage, named as slotFor (registry.js) names them: granary.s0-s3, bazaar.s0-s2, and g0-g3 for every
// farm; each farm also keeps its plain type slot.
for (let s = 0; s < 4; s++) SERVICE_ART[`granary.s${s}`] = { ...GRANARY_SLOT, draw: (g, x, y) => granary(g, x, y, s) };
for (let s = 0; s < 3; s++) SERVICE_ART[`bazaar.s${s}`] = { ...BAZAAR_SLOT, draw: (g, x, y) => bazaar(g, x, y, s) };
for (const [type, draw] of Object.entries(FARM_DRAW)) {
  SERVICE_ART[type] = { ...FARM_SLOT, draw: (g, x, y) => draw(g, x, y, PLAIN_STAGE[type]) };
  for (let s = 0; s < 4; s++) SERVICE_ART[`${type}.g${s}`] = { ...FARM_SLOT, draw: (g, x, y) => draw(g, x, y, s) };
}
