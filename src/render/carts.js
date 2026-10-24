// Carts on the roads (Stage 4.7, Task 6, ruling 467). Each cart of the sim (world.carts, src/sim/carts.js) is a walker entry: a small cart with its pusher,
// the good as the load (the figure slots of src/render/art/carts.js), walking the road path the sim worked out (cartPath), as far along it as the sim says
// (cartFraction). At most CART_CAP are drawn, those nearest the middle of the view first; under Still they stand at their store's door.
//
// Like the walkers, this reads the world and the time and keeps nothing: the same frame always looks the same. The sim moves a cart on a day tick (the clock
// adds the day after the cart's work), so the drawn day is timeDays - 1: a cart sets out at the start of the day after its set-out tick, and is home when the
// day it is due ends.
import { GOODS } from '../data/goods.js';
import { cartPath, cartFraction } from '../sim/carts.js';
import { hopCum, stepAt } from './ferryPace.js';

// The last road path a cart was drawn on, kept per cart object: a cart whose road has just been cut (it turns round) is still drawn where it was going,
// along the route it took, though no road joins its stores now. Render-only; a cart not yet drawn when the road breaks (a reload) is not drawn.
const lastPath = new WeakMap();
const pathOf = (world, c) => {
  const path = cartPath(world, c);
  if (path && path.length) { lastPath.set(c, path); return path; }
  return lastPath.get(c) || null;
};

export const CART_CAP = 30;
export const CART_ID_BASE = 3000000;   // cart figures: base + store id (units 100000+, processions 200000+, dedications 600000+, streamers 900000+, newcomers 1200000+, wildlife 1400000+)
export const cartKind = (good, left) => `cart_${good === null ? 'empty' : GOODS[good] ? good : 'unknown'}${left ? '_l' : ''}`;

const inRange = (range, x, y, m = 2) => x >= range.x0 - m && x <= range.x1 + m && y >= range.y0 - m && y <= range.y1 + m;
// Whether the cart carries its goods: from set-out to home, except a cart that turned round on the way out (the goods went back to the shelf).
const loaded = (c) => !(c.state === 'return' && c.dest === 'home');
// Whether the cart's way along the route runs from home toward the source (fraction rising) or back.
const outward = (c) => c.state === 'out' || (c.state === 'return' && c.dest === 'source');

// Where a cart stands on its route at a fraction (0 home, 1 source): the point in tiles and the direction of travel (dx, dy) of the leg it is on.
// Version 7.1.1: a running ferry is one step of the path that takes the crossing's own time (crossingTiles of road, render/ferryPace.js), so the cart
// moves along the water as long as the sim counts; the point then carries `hop: [from tile, to tile]` (tile indices of the two road tiles it crosses
// between). A path with no ferry step is divided in equal steps, as before.
export function pointOnPath(world, path, f) {
  const n = path.length;
  const tile = (t) => ({ x: (t % world.size) + 0.5, y: Math.floor(t / world.size) + 0.5 });
  if (n === 1) return { ...tile(path[0]), dx: 1, dy: 0 };
  const cum = hopCum(world, path, (t) => t);
  if (cum) {
    const at = stepAt(cum, Math.min(1, Math.max(0, f)) * cum[n - 1]), a = tile(path[at.i]), b = tile(path[at.i + 1]);
    const hop = cum[at.i + 1] - cum[at.i] > 1 ? [path[at.i], path[at.i + 1]] : null;
    return { x: a.x + (b.x - a.x) * at.k, y: a.y + (b.y - a.y) * at.k, dx: b.x - a.x, dy: b.y - a.y, ...(hop && at.k > 0 && at.k < 1 ? { hop } : {}) };
  }
  const s = Math.min(n - 1, Math.max(0, f * (n - 1))), i = Math.min(n - 2, Math.floor(s)), k = s - i;
  const a = tile(path[i]), b = tile(path[i + 1]);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dx: b.x - a.x, dy: b.y - a.y };
}

// The carts in view as walker entries [{ id, kind, x, y, dir }], at most CART_CAP, nearest the middle of the view first (ties by store id).
export function cartsAt(world, timeDays, range = null, motion = 'full') {
  return placedCarts(world, timeDays, range, motion).map(({ entry }) => entry);
}

// The carts now over a running ferry's water, for the ferry boat that carries each (src/render/ferries.js): [{ id, x, y, left, hop }], one per cart
// drawn, hop being the two road tiles it crosses between (tile indices). Not under Still (a cart stands at its store's door).
export function cartsOnFerries(world, timeDays, range = null, motion = 'full') {
  if (motion === 'still') return [];
  return placedCarts(world, timeDays, range, motion).filter(({ at }) => at.hop).map(({ c, at, entry }) => ({ id: c.id, x: at.x, y: at.y, left: entry.dir === 3, hop: at.hop }));
}

function placedCarts(world, timeDays, range, motion) {
  const carts = world.carts;
  if (!carts || !carts.length) return [];
  const mid = range ? { x: (range.x0 + range.x1) / 2, y: (range.y0 + range.y1) / 2 } : null;
  const found = [], still = motion === 'still';
  for (const c of carts) {
    const path = pathOf(world, c);
    if (!path) continue;
    const at = pointOnPath(world, path, still ? 0 : cartFraction(c, timeDays - 1));
    if (range && !inRange(range, at.x, at.y)) continue;
    found.push({ c, at, d: mid ? Math.abs(at.x - mid.x) + Math.abs(at.y - mid.y) : 0 });
  }
  found.sort((p, q) => p.d - q.d || p.c.id - q.c.id);
  return found.slice(0, CART_CAP).map(({ c, at }) => {
    const sign = outward(c) ? 1 : -1;
    const left = still ? false : (at.dx - at.dy) * sign < 0;                 // the screen's x runs with x - y: a cart heading down-left or up-left faces left
    return { c, at, entry: { id: CART_ID_BASE + c.id, kind: cartKind(loaded(c) ? c.good : null, left), x: at.x, y: at.y, dir: left ? 3 : 1, cart: true } };
  });
}
