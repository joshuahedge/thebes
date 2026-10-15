// Stage 4.7 (Task 6, ruling 467): the carts of the storehouses' orders, as figure slots (fig.cart_<good>, fig.cart_<good>_l facing left), registered in
// the registry through src/render/art/s47.js. House style: a small two-wheeled hand cart of weathered planks, a pusher behind it (the citizen figure,
// walking), and the good as the load: its own colour AND its own shape (jars, sacks, folded cloth, gems, blocks, fish, a heap), so the good is never told
// by colour alone. The cart is drawn a third larger than a walker so it reads at phone zoom. Figures face right; `_l` slots are the same drawing mirrored.
import { p } from './primitives.js';
import { fig } from './figures.js';
import { WOOD, GOLD, TEAL, SHADOW } from './palette.js';
import { GOODS } from '../../data/goods.js';

const PLANK = ['#CFA970', '#B58A56', '#8D6A44'];
// What each good looks like on a cart: [colour, shape]. Goods the table does not know ride as a grey heap.
export const CART_LOADS = {
  grain: ['#E4B948', 'sack'], figs: ['#8E5BA0', 'sack'], barley: ['#D3BD62', 'sack'], flax: ['#8FB36B', 'sack'], game: ['#B3794A', 'sack'],
  pottery: ['#C96A3C', 'jars'], beer: ['#D9962B', 'jars'],
  linen: ['#F4EFE2', 'bolts'],
  jewellery: ['#F0C94A', 'gems'], gems: ['#3FB6AE', 'gems'],
  stone: ['#BDB4BF', 'blocks'], bricks: ['#C98A5E', 'blocks'],
  clay: ['#A06E48', 'heap'],
  fish: ['#7DB3C8', 'fish'],
  empty: ['#000000', 'none'],   // a cart whose goods went back to the shelf
};
const FALLBACK = ['#A89AA8', 'heap'];
export const loadOf = (good) => CART_LOADS[good] || FALLBACK;

const S = 1.3;   // the cart is drawn this much larger than a walker

// A mirror of the drawing about x = X, so a left-facing cart is the right-facing one turned (as the River track's animals).
function facing(g, X, left) {
  if (!left) return g;
  const f = (q) => [2 * X - q[0], q[1]];
  const segs = (list) => list.map((sg) => [sg[0], ...sg.slice(1).map(f)]);
  return {
    ...g, poly: (pts, ...r) => g.poly(pts.map(f), ...r), ell: (q, ...r) => g.ell(f(q), ...r), circ: (q, ...r) => g.circ(f(q), ...r),
    line: (a, b, ...r) => g.line(f(a), f(b), ...r), stroke: (sg, ...r) => g.stroke(segs(sg), ...r), path: (sg, ...r) => g.path(segs(sg), ...r),
  };
}

// The load, from the bed's top (y = -9) upward, in cart units (before S). `P` turns cart units into art px.
function drawLoad(g, P, R, kind, col) {
  const poly = (pts, fill, o = { outline: true }) => g.poly(pts.map(([x, y]) => P(x, y)), fill, o);
  const ell = (x, y, rx, ry, fill, o = { outline: true }) => g.ell(P(x, y), rx * S, ry * S, fill, o);
  if (kind === 'none') return;
  if (kind === 'sack') {
    ell(-3.2, -11.6, 3.3, 3, col); ell(2.6, -11.8, 3.3, 3, col); ell(-0.4, -14.6, 3.2, 3, col);
    for (const [x, y] of [[-3.2, -14.2], [2.6, -14.4], [-0.4, -17.3]]) g.line(P(x - 1, y), P(x + 1, y), '#5A4A3A', 0.6);   // the tied necks
    ell(-1.6, -15.4, 1.2, 0.7, '#FFFFFF', { alpha: 0.35 });
  } else if (kind === 'jars') {
    for (const [x, y, top] of [[-3.6, -9, false], [3.4, -9, false], [-0.1, -13.2, true]]) {
      ell(x, y - 2.6, 2.7, 3.2, col);                                         // the belly
      poly([[x - 1.2, y - 5], [x + 1.2, y - 5], [x + 1.6, y - 7], [x - 1.6, y - 7]], col);   // the neck
      ell(x, y - 7, 1.9, 0.7, '#5A3A2A');                                     // the mouth
      g.line(P(x - 2.4, y - 3.2), P(x + 2.4, y - 3.2), top ? '#FFF3D6' : '#5A3A2A', 0.6);     // a band round it
    }
  } else if (kind === 'bolts') {
    for (let k = 0; k < 3; k++) {
      const y = -9 - k * 2.5, dx = k % 2 ? 0.8 : -0.4;
      poly([[-5.4 + dx, y], [5.4 + dx, y], [5.4 + dx, y - 2.5], [-5.4 + dx, y - 2.5]], col);
      g.line(P(-5.4 + dx, y - 1.25), P(5.4 + dx, y - 1.25), TEAL, 0.7);       // the coloured edge of the cloth
    }
  } else if (kind === 'gems') {
    poly([[-5, -9], [5, -9], [5, -12.8], [-5, -12.8]], '#8D6A44');            // a little chest
    g.line(P(-5, -11), P(5, -11), GOLD, 0.6);
    poly([[0, -19], [3.6, -15.6], [0, -12.4], [-3.6, -15.6]], col);           // the stone
    g.line(P(-3.6, -15.6), P(3.6, -15.6), '#FFFFFF', 0.5, 0.8); g.line(P(0, -19), P(0, -12.4), '#FFFFFF', 0.5, 0.5);
  } else if (kind === 'blocks') {
    for (const [x, y] of [[-3.4, -9], [3.4, -9], [0, -12.4]]) {
      poly([[x - 3.2, y], [x + 3.2, y], [x + 3.2, y - 3.4], [x - 3.2, y - 3.4]], col);
      poly([[x - 3.2, y - 3.4], [x + 3.2, y - 3.4], [x + 2.2, y - 4.6], [x - 2.2, y - 4.6]], '#FFFFFF', { outline: true, alpha: 0.4 });
    }
  } else if (kind === 'fish') {
    poly([[-5.2, -9], [5.2, -9], [4.4, -12.4], [-4.4, -12.4]], '#B58A56');    // a basket
    for (const [x, y, r] of [[-1.8, -13.6, 1], [1.8, -14.6, -1]]) {
      ell(x, y, 3.2, 1.4, col);
      poly([[x - r * 3, y], [x - r * 5.2, y - 1.6], [x - r * 5.2, y + 1.6]], col);   // the tail
      g.circ(P(x + r * 1.8, y - 0.3), 0.35 * S, '#1E150E');
    }
  } else {   // heap
    g.path([['M', P(-6, -9)], ['Q', P(-5, -17), P(0, -17)], ['Q', P(5, -17), P(6, -9)], ['Z']], col, { outline: true });
    for (const [x, y] of [[-2, -12], [1.6, -14], [3.2, -11], [-3.6, -10.4]]) g.circ(P(x, y), 0.5 * S, '#FFFFFF', { alpha: 0.3 });
  }
}

// A cart at tile point (gx, gy), seen from the side, moving right when not `left`: its pusher behind (to the left).
export function cart(g0, gx, gy, good, left = false) {
  const [X, Y] = (() => { const c = p(gx, gy); return [c[0], c[1]]; })();
  const g = facing(g0, X, left), [col, kind] = loadOf(good);
  const P = (dx, dy) => [X + dx * S, Y + dy * S];
  g.ell(P(-3, 0), 12 * S, 2 * S, SHADOW, { alpha: 0.25 });
  g.line(P(-6.5, -7), P(-13, -6.2), WOOD, 1.1);                                               // the handles the pusher holds
  g.line(P(-6.5, -5.4), P(-13, -5.2), WOOD, 0.9);
  // the pusher, a citizen a step behind the handles
  const a = (14 * S) / 32;
  fig(g, gx - a, gy + a, 'citizen', 0, S * 0.82);
  g.poly([P(-6.6, -5), P(6.6, -5), P(5.8, -9.2), P(-5.8, -9.2)].map((q) => q), PLANK[0], { outline: true });   // the bed
  g.line(P(-6.2, -6.4), P(6.2, -6.4), PLANK[2], 0.5, 0.8);
  g.line(P(-6.6, -5), P(6.6, -5), PLANK[2], 0.8);
  drawLoad(g, P, null, kind, col);
  g.circ(P(1.4, -3.2), 3.2 * S, PLANK[2], { outline: true });                                 // the wheel, in front of the bed's side
  g.circ(P(1.4, -3.2), 2.1 * S, PLANK[1]);
  for (const [dx, dy] of [[0, -2.1], [1.9, 0.9], [-1.9, 0.9]]) g.line(P(1.4, -3.2), P(1.4 + dx, -3.2 + dy), '#E9DAB8', 0.5);   // spokes
  g.circ(P(1.4, -3.2), 0.6 * S, '#E9DAB8');
}

// The registry's slots: one pair per good (and the fallback heap), bounds wide enough for the pusher behind and the load above.
const SLOT = (left) => ({ w: 0, d: 0, height: 26, bounds: left ? [-17, -40, 29, 8] : [-29, -40, 17, 8], shadows: [] });
export const CART_ART = {};
for (const good of new Set([...Object.keys(GOODS), 'unknown', 'empty'])) {
  CART_ART[`fig.cart_${good}`] = { ...SLOT(false), draw: (g, x, y) => cart(g, x, y, good, false) };
  CART_ART[`fig.cart_${good}_l`] = { ...SLOT(true), draw: (g, x, y) => cart(g, x, y, good, true) };
}
