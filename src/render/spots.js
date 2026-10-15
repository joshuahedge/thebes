// The next-house spots on the map (Stage 4.7, Task 4, ruling 465), drawn in the overlay layer while the house tool is active (src/ui/createUI.js drawOverlay).
// The sim decides which tiles and how good (src/sim/spots.js); this only paints. Good: a bright teal wash, a solid inset outline and both icons, a drop (water)
// and a basket (a market). Fair: teal diagonal hatching, a thinner outline and the one icon it has. So a plot reads without colour: wash against hatching, two icons
// against one. The icons (and the legend's, src/ui/s47/spots.js, which draws the same paths) are ICONS below.
import { houseSpots, SPOT } from '../sim/spots.js';
import { p, dia } from './iso.js';
import { UI } from './art/palette.js';
import { makeDraw } from './art/ctx.js';
import { tilePolys } from './overlays.js';

export const SPOT_HUE = { wash: '#0E9C8E', edge: '#07574F', icon: '#FFFFFF' };
export const SPOT_ALPHA = { good: 0.5, fairFill: 0.16, fairLine: 0.75 };

// Each icon in a 10 x 10 box: the shape (path segments, 'M' 'L' 'Q' 'Z' as src/render/art/ctx.js path takes them), its fill, and any open stroke (the basket's handle).
export const ICONS = {
  water: { segs: [['M', [5, 0.4]], ['Q', [9, 5], [8.3, 7]], ['Q', [7.6, 9.7], [5, 9.7]], ['Q', [2.4, 9.7], [1.7, 7]], ['Q', [1, 5], [5, 0.4]], ['Z']], fill: UI.water, strokes: [] },
  market: { segs: [['M', [0.6, 4.4]], ['L', [9.4, 4.4]], ['L', [8.2, 9.6]], ['L', [1.8, 9.6]], ['Z']], fill: UI.goods, strokes: [[['M', [2.2, 4.4]], ['Q', [5, -1.2], [7.8, 4.4]]]] },
};
// The same segments as an SVG path string (the legend).
export function iconPath(segs) {
  return segs.map((s) => (s[0] === 'Z' ? 'Z' : s[0] === 'Q' ? `Q${s[1][0]} ${s[1][1]} ${s[2][0]} ${s[2][1]}` : `${s[0]}${s[1][0]} ${s[1][1]}`)).join(' ');
}

const place = (segs, ox, oy, sc) => segs.map((s) => (s[0] === 'Z' ? s : [s[0], ...s.slice(1).map(([x, y]) => [ox + (x - 5) * sc, oy + (y - 5) * sc])]));
function drawIcon(g, kind, cx, cy, sc) {
  const icon = ICONS[kind];
  const body = place(icon.segs, cx, cy, sc), handles = icon.strokes.map((s) => place(s, cx, cy, sc));
  for (const h of handles) g.stroke(h, SPOT_HUE.icon, 3.4 * sc);                       // a white halo under everything, so it reads on any ground
  g.path(body, SPOT_HUE.icon, { stroke: SPOT_HUE.icon, strokeWidth: 2.6 * sc });
  for (const h of handles) g.stroke(h, UI.label, 1.5 * sc);
  g.path(body, icon.fill, { stroke: UI.label, strokeWidth: 0.9 * sc, strokeAlpha: 0.85 });
}

// A tile's icons (both for Good, the drop or the basket for Fair) are drawn once into a small canvas per variant and size, then stamped on each tile with
// drawImage: a screenful of spots costs a screenful of stamps, not four paths each. Kept per drawing context (a few sizes: a pinch zoom walks through them).
const SPRITE_PAD = 3, SPRITE_H = 16, ICON_GAP = 5.8;
const spriteMemo = new WeakMap();
export const spriteWidth = (variant, sc) => (variant === 'good' ? 2 * ICON_GAP * sc + 10 * sc : 10 * sc) + 2 * SPRITE_PAD * sc;
function iconSprite(g, variant, sc) {
  const key = `${variant}|${g.scale}|${sc.toFixed(3)}`;
  let byKey = spriteMemo.get(g.ctx);
  if (!byKey) { byKey = new Map(); spriteMemo.set(g.ctx, byKey); }
  if (byKey.has(key)) return byKey.get(key);
  const w = spriteWidth(variant, sc), h = SPRITE_H * sc;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w * g.scale)); cv.height = Math.max(1, Math.ceil(h * g.scale));
  const d = makeDraw(cv.getContext('2d'), g.scale, g.cssScale);
  if (variant === 'good') { drawIcon(d, 'water', w / 2 - ICON_GAP * sc, h / 2, sc); drawIcon(d, 'market', w / 2 + ICON_GAP * sc, h / 2, sc); }
  else drawIcon(d, variant, w / 2, h / 2, sc);
  if (byKey.size >= 12) byKey.clear();
  const sprite = { cv, w, h };
  byKey.set(key, sprite);
  return sprite;
}

// The icons stay about as big on the screen as they were at the phone's default zoom, and are left off once the tile is too small to hold them (the tint and
// hatching still say Good and Fair there).
export const ICON_MIN_CSS_SCALE = 0.75;
export const iconSize = (cssScale) => Math.round(Math.min(9, Math.max(6, 11 / cssScale)) * 2) / 20;   // in steps of 0.05, so a pinch zoom reuses a few sprites

export function drawHouseSpots(g, world, range) {
  const { list } = houseSpots(world);
  if (!list.length) return;
  const inView = range ? list.filter((s) => s.x >= range.x0 - 1 && s.x <= range.x1 + 1 && s.y >= range.y0 - 1 && s.y <= range.y1 + 1) : list;
  if (!inView.length) return;
  const good = inView.filter((s) => s.kind === SPOT.good), fair = inView.filter((s) => s.kind === SPOT.fair);
  if (good.length) g.polys(tilePolys(good.map((s) => [s.x, s.y])), SPOT_HUE.wash, { alpha: SPOT_ALPHA.good });
  if (fair.length) g.hatchPolys(tilePolys(fair.map((s) => [s.x, s.y])), SPOT_HUE.wash, { fill: SPOT_ALPHA.fairFill, line: SPOT_ALPHA.fairLine, gap: 6, width: 1.6 });
  const inset = (list) => list.map((s) => dia(s.x + 0.5, s.y + 0.5, 0.44));   // each tile's own inset outline, all of a kind in one stroke
  if (good.length) g.polys(inset(good), 'none', { stroke: SPOT_HUE.edge, strokeWidth: 1.4, strokeAlpha: 0.95 });
  if (fair.length) g.polys(inset(fair), 'none', { stroke: SPOT_HUE.edge, strokeWidth: 0.9, strokeAlpha: 0.6 });
  const css = g.cssScale || g.scale;
  if (css < ICON_MIN_CSS_SCALE) return;
  const sc = iconSize(css);
  for (const s of inView) {
    const c = p(s.x + 0.5, s.y + 0.5), sprite = iconSprite(g, s.kind === SPOT.good ? 'good' : s.via, sc);
    g.ctx.drawImage(sprite.cv, (c[0] - sprite.w / 2) * g.scale, (c[1] - 0.5 - sprite.h / 2) * g.scale, sprite.w * g.scale, sprite.h * g.scale);
  }
}
