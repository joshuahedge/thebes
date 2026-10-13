// Bridges (Stage 4.5, ruling 314): a road tile on water is drawn as a mudbrick and timber deck with low parapets, in the terrain
// layer after the roads. A deck is the tile's square inset from the edges that no road meets (so a run of bridge tiles is one
// long deck with a parapet down each side), a short step where it meets a land road, timber posts under the open edges, and a
// soft shadow on the water. Tiles are drawn in row order, so nearer ones cover the ones behind.
import { p } from './iso.js';
import { idx, inBounds } from '../sim/grid.js';
import { T } from '../sim/terrain.js';
import { MUD, WOOD } from './art/palette.js';
import { box } from './art/primitives.js';

export const DECK = { inset: 0.15, z: 1.5, h: 2, parapet: 4.5, thick: 0.1, step: 0.3 };
const TIMBER = [WOOD, '#7C5A46', '#4E3628'];
// Mudbrick for the parapets, darker and redder than the deck so the low walls read against it at phone zoom: top, lit face, shaded face.
const BRICK = ['#F1DFB6', '#B5834F', '#7E5A3C'];

const isRoad = (world, x, y) => inBounds(world.size, x, y) && Boolean(world.road[idx(world.size, x, y)]);
const isWater = (world, x, y) => inBounds(world.size, x, y) && world.terrain[idx(world.size, x, y)] === T.WATER;
export const isBridgeTile = (world, x, y) => isRoad(world, x, y) && isWater(world, x, y);

// The bridge tiles in range, as [[x, y]...] in row order.
export function bridgeTiles(world, range) {
  const out = [];
  for (let y = Math.max(0, range.y0); y <= Math.min(world.size - 1, range.y1); y++) {
    for (let x = Math.max(0, range.x0); x <= Math.min(world.size - 1, range.x1); x++) if (isBridgeTile(world, x, y)) out.push([x, y]);
  }
  return out;
}

function drawBridgeTile(g, world, x, y) {
  const { inset: a, z, h, parapet, thick, step } = DECK;
  const cw = isRoad(world, x - 1, y), ce = isRoad(world, x + 1, y), cn = isRoad(world, x, y - 1), cs = isRoad(world, x, y + 1);
  const x0 = cw ? x : x + a, x1 = ce ? x + 1 : x + 1 - a, y0 = cn ? y : y + a, y1 = cs ? y + 1 : y + 1 - a;
  const top = z + h;
  // The shadow on the water, offset a little to the south east.
  const sh = [p(x0 + 0.1, y0 + 0.14), p(x1 + 0.1, y0 + 0.14), p(x1 + 0.1, y1 + 0.14), p(x0 + 0.1, y1 + 0.14)];
  g.poly(sh, '#0F3B47', { alpha: 0.32 });
  // Timber posts under the open edges, one at the middle of each.
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, pw = 0.11;
  if (!cn) box(g, mx - pw / 2, y0 + 0.01, pw, pw, z + 1.5, -1.5, TIMBER, 0);
  if (!cw) box(g, x0 + 0.01, my - pw / 2, pw, pw, z + 1.5, -1.5, TIMBER, 0);
  if (!cs) box(g, mx - pw / 2, y1 - pw - 0.01, pw, pw, z + 1.5, -1.5, TIMBER, 0);
  if (!ce) box(g, x1 - pw - 0.01, my - pw / 2, pw, pw, z + 1.5, -1.5, TIMBER, 0);
  // The deck, its planks across the way it runs, and the steps down to land roads.
  box(g, x0, y0, x1 - x0, y1 - y0, h, z, MUD);
  const alongX = (ce || cw) && !(cn || cs);
  for (const f of [0.25, 0.5, 0.75]) {
    const a = alongX ? p(x0 + (x1 - x0) * f, y0) : p(x0, y0 + (y1 - y0) * f), b = alongX ? p(x0 + (x1 - x0) * f, y1) : p(x1, y0 + (y1 - y0) * f);
    g.line([a[0], a[1] - top], [b[0], b[1] - top], TIMBER[1], 0.6, 0.55);
  }
  const landRoad = (nx, ny) => isRoad(world, nx, ny) && !isWater(world, nx, ny);
  if (ce && landRoad(x + 1, y)) box(g, x + 1, y0, step, y1 - y0, 1.8, 0, MUD);
  if (cw && landRoad(x - 1, y)) box(g, x - step, y0, step, y1 - y0, 1.8, 0, MUD);
  if (cs && landRoad(x, y + 1)) box(g, x0, y + 1, x1 - x0, step, 1.8, 0, MUD);
  if (cn && landRoad(x, y - 1)) box(g, x0, y - step, x1 - x0, step, 1.8, 0, MUD);
  // Low parapets down the open edges: the two far ones (north, west) first, then the two near ones over the deck.
  if (!cn) box(g, x0, y0, x1 - x0, thick, parapet, top, BRICK);
  if (!cw) box(g, x0, y0, thick, y1 - y0, parapet, top, BRICK);
  if (!cs) box(g, x0, y1 - thick, x1 - x0, thick, parapet, top, BRICK);
  if (!ce) box(g, x1 - thick, y0, thick, y1 - y0, parapet, top, BRICK);
}

export function drawBridges(g, world, range) {
  for (const [x, y] of bridgeTiles(world, range)) drawBridgeTile(g, world, x, y);
}
