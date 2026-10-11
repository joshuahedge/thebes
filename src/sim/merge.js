// Merging and splitting homes (spec 4.6). A Townhouse grows into a Manor only by joining the three plots beside it
// that make a 2x2 square: each must be a 1x1 housing plot at Townhouse or better, or one nobody lives in yet. When
// more than one square qualifies, a fixed order picks one: north-west first, then clockwise. The merged home keeps
// the lowest id and takes everyone's residents and stock. A 2x2 home that drops below Manor splits back into four
// Townhouses with its residents shared out. The monthly housing check (src/sim/housing.js) calls these.
import { TIERS } from '../data/housing.js';
import { buildingAt, makeBuilding, insertBuilding, removeBuilding } from './world.js';
import { inBounds } from './grid.js';

// The first tier whose homes are 2x2 (the Manor), and the tier a square's plots must have reached (the Townhouse).
export const MERGE_TIER = TIERS.findIndex((t) => t && t.size === 2);
const JOIN_TIER = MERGE_TIER - 1;

// The four squares that hold a home, as offsets of the square's north-west corner from the home: the square to its
// north-west first, then clockwise (north-east, south-east, south-west).
const SQUARES = [[-1, -1], [0, -1], [0, 0], [-1, 0]];
const CORNERS = [[0, 0], [1, 0], [0, 1], [1, 1]];   // a square's tiles: NW, NE, SW, SE

const isPlot = (b) => Boolean(b && b.type === 'house' && b.w === 1 && b.d === 1);

// A tile whose plot can join a square: a 1x1 housing plot at Townhouse or better, or one with no residents yet.
function joins(world, x, y) {
  if (!inBounds(world.size, x, y)) return false;
  const b = buildingAt(world, x, y);
  return isPlot(b) && (b.tier >= JOIN_TIER || b.residents === 0);
}

// The north-west corner { x, y } of the first square the home can merge into, or null when none can form.
export function mergeSquare(world, house) {
  if (!isPlot(house) || house.tier < JOIN_TIER) return null;
  for (const [dx, dy] of SQUARES) {
    const x = house.x + dx, y = house.y + dy;
    if (CORNERS.every(([cx, cy]) => joins(world, x + cx, y + cy))) return { x, y };
  }
  return null;
}

// Joins the square at origin into one Manor: the plot with the lowest id stays (its id, now 2x2), the other three
// go, and their residents and household stock are added together. Returns the merged home, or null when the square
// at origin cannot form.
export function mergeHouses(world, house, origin) {
  if (!origin) return null;
  const parts = CORNERS.map(([cx, cy]) => (inBounds(world.size, origin.x + cx, origin.y + cy) ? buildingAt(world, origin.x + cx, origin.y + cy) : null));
  if (!parts.every(isPlot) || new Set(parts.map((b) => b.id)).size !== 4) return null;
  const keep = parts.reduce((a, b) => (b.id < a.id ? b : a));
  const residents = parts.reduce((n, b) => n + b.residents, 0);
  const stock = {};
  for (const b of parts) for (const [good, n] of Object.entries(b.stock || {})) if (n > 0) stock[good] = (stock[good] || 0) + n;
  for (const b of parts) removeBuilding(world, b.id);
  Object.assign(keep, {
    x: origin.x, y: origin.y, w: 2, d: 2, tier: MERGE_TIER, residents, stock, stockedFor: residents,
    downTimer: 0, leftThisMonth: 0, met: { ...(house && house.met) },
  });
  return insertBuilding(world, keep);
}

// n shared among k parts as evenly as whole numbers allow, the first parts taking one more: part i's share.
const shareOf = (n, k, i) => Math.floor(n / k) + (i < n % k ? 1 : 0);

// Splits a 2x2 home into four plots: Townhouses sharing its residents evenly (the north-west plot keeps its id),
// with its household stock shared among the plots that have residents. A plot left with nobody is an empty plot,
// so a 2x2 home emptied of residents splits into four empty plots. Returns the four plots, NW, NE, SW, SE.
export function splitHouse(world, house) {
  const { x, y, residents } = house;
  const stock = house.stock || {};
  removeBuilding(world, house.id);
  const shares = CORNERS.map((_, i) => shareOf(residents, 4, i));
  const lived = shares.filter((r) => r > 0).length;
  let j = 0;
  return CORNERS.map(([cx, cy], i) => {
    const b = i === 0 ? house : makeBuilding(world, 'house', x + cx, y + cy);
    const r = shares[i];
    const own = {};
    if (r > 0) {
      for (const [good, n] of Object.entries(stock)) { const k = shareOf(n, lived, j); if (k > 0) own[good] = k; }
      j++;
    }
    Object.assign(b, {
      x: x + cx, y: y + cy, w: 1, d: 1, tier: r > 0 ? JOIN_TIER : 0, residents: r, stock: own,
      met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: r,
    });
    return insertBuilding(world, b);
  });
}
