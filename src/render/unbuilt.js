// Version 7.0, Track P (ruling 1009): what is placed but not built. Josh (23 Oct, after the first playtest): a house plot "looks like plain land until it is finished", so he cannot
// see what he placed. The code has two such states and they are the whole list: an empty housing plot (a tier 0 home, awaiting settlers: a soft pad under the ground and nothing else)
// and a monument site before any work has begun (its stakes and cords are small art, lost at a distance). Each now gets one marker in its footprint, the same everywhere:
//   a string pegged out round the footprint (a solid dark line on a white halo, never dashed: dashed amber is the road-less plot's), a stake at each corner, and a small sign on a post
//   in the middle with a picture on it: a hut for a plot, a pyramid for a monument's site. The shapes say "marked out, not built" without colour.
// It is render only (never in the sim or the save) and static, so it reads the same under Full, Gentle and Still. Sizes are floored in CSS px, so it reads at the Huge map's zoom floor
// where a plot is about 11 px across. The strings and stakes of every plot in view are one path each (two strokes, whatever the count); the signs are drawn one by one while no more
// than SIGN_MOST are in view, and a crowd of them is left to the strings and stakes.
import { housesOf, allBuildings, isSite, buildingsVersion } from '../sim/world.js';
import { p, quad } from './iso.js';
import { UI } from './art/palette.js';

export const UNBUILT = {
  string: '#5E4120',    // the cord: dark brown, 4.9:1 on the pale ground pad
  stake: '#8A6532',     // the pegs and the sign's post
  board: '#FFFDF4',     // the sign
  inset: 0.08,          // tiles: the string runs just inside the footprint's edge
  stringPx: 1.7,        // CSS px
  haloPx: 3.6,          // CSS px
  stakeMin: 3, stakePx: 6,        // a stake's height: at least 3 art px, and 6 CSS px
  postMin: 6, postPx: 12,         // the sign's post
  boardMin: [9, 6], boardPx: [16, 11],   // the board (width, height): art px at the least, CSS px at the least
};
export const SIGN_MOST = 250;

// Whether a monument's site has had any work done (a course begun or a block laid): the art shows the rest.
const begun = (b) => b.site && (b.site.course > 0 || (b.site.laid && b.site.laid.stone + b.site.laid.bricks > 0));

const memo = new WeakMap();   // world -> { key, list }
// Every footprint placed but not built, as { id, kind: 'plot' | 'site', x, y, w, d }: an empty plot (a tier 0 home that is not a Large lot, which has its own marked-lot art) and a
// monument site before work has begun. Kept while the buildings are as they were and the day is the same (a site's first block changes neither).
export function unbuiltList(world) {
  const key = `${buildingsVersion(world)}|${world.day}`;
  let m = memo.get(world);
  if (!m || m.key !== key) {
    const list = [];
    for (const h of housesOf(world)) if (h.tier === 0 && h.large !== true) list.push({ id: h.id, kind: 'plot', x: h.x, y: h.y, w: h.w, d: h.d });
    for (const b of allBuildings(world)) if (isSite(b) && !begun(b)) list.push({ id: b.id, kind: 'site', x: b.x, y: b.y, w: b.w, d: b.d });
    m = { key, list };
    memo.set(world, m);
  }
  return m.list;
}

// The ones in view: range is the visible tile range, cull the renderer's view cull when it has one.
export function unbuiltIn(world, range = null, cull = null) {
  const list = unbuiltList(world);
  if (!range && !cull) return list;
  return list.filter((u) => {
    if (range && (u.x + u.w < range.x0 - 1 || u.x > range.x1 + 1 || u.y + u.d < range.y0 - 1 || u.y > range.y1 + 1)) return false;
    return !cull || cull.sees(u.x, u.y, [-16 * u.d - 8, -24, 16 * u.w + 8, 16 * (u.w + u.d) + 40]);
  });
}

// The sign's picture on its board, as polygons in art px: a hut (a roof over a body), or a pyramid (a triangle). (cx, cy) is the board's middle.
function pictureOf(kind, cx, cy, bw, bh) {
  const w = bw * 0.62, h = bh * 0.62;
  if (kind === 'plot') {
    return [[[cx - w / 2, cy - h * 0.05], [cx, cy - h / 2], [cx + w / 2, cy - h * 0.05]],
      [[cx - w * 0.36, cy - h * 0.05], [cx + w * 0.36, cy - h * 0.05], [cx + w * 0.36, cy + h * 0.5], [cx - w * 0.36, cy + h * 0.5]]];
  }
  return [[[cx - w / 2, cy + h / 2], [cx, cy - h / 2], [cx + w / 2, cy + h / 2]]];
}

export function drawUnbuilt(g, world, range = null) {
  if (!g || typeof g.polys !== 'function' || typeof g.stroke !== 'function') return;   // a stand-in drawing helper: nothing to mark
  const list = unbuiltIn(world, range, g.cull);
  if (!list.length) return;
  const css = g.cssScale || g.scale;
  const per = (px, min) => Math.max(min, px / css);                           // CSS px, floored in art px
  // The strings: one path for every footprint in view, a white halo and then the cord.
  const strings = list.map((u) => quad(u.x + UNBUILT.inset, u.y + UNBUILT.inset, u.w - 2 * UNBUILT.inset, u.d - 2 * UNBUILT.inset, 0));
  g.polys(strings, 'none', { stroke: UI.halo, strokeWidth: UNBUILT.haloPx / css, strokeAlpha: 0.85 });
  g.polys(strings, 'none', { stroke: UNBUILT.string, strokeWidth: UNBUILT.stringPx / css });
  // The stakes: a short post at each corner, one path (its halo wider).
  const h = per(UNBUILT.stakePx, UNBUILT.stakeMin);
  const posts = [];
  for (const pts of strings) for (const c of pts) posts.push(['M', c], ['L', [c[0], c[1] - h]]);
  g.stroke(posts, UI.halo, (UNBUILT.haloPx + 1) / css, 0.85);
  g.stroke(posts, UNBUILT.stake, (UNBUILT.stringPx + 1) / css);
  // The signs, while the crowd is small: a post from the middle of the footprint, a board on top of it, and the picture on the board.
  if (list.length > SIGN_MOST) return;
  const post = per(UNBUILT.postPx, UNBUILT.postMin), bw = per(UNBUILT.boardPx[0], UNBUILT.boardMin[0]), bh = per(UNBUILT.boardPx[1], UNBUILT.boardMin[1]);
  const poles = [], boards = [], pictures = { plot: [], site: [] };
  for (const u of list) {
    const c = p(u.x + u.w / 2, u.y + u.d / 2), top = c[1] - post;
    poles.push(['M', c], ['L', [c[0], top]]);
    boards.push([[c[0] - bw / 2, top - bh], [c[0] + bw / 2, top - bh], [c[0] + bw / 2, top], [c[0] - bw / 2, top]]);
    pictures[u.kind].push(...pictureOf(u.kind, c[0], top - bh / 2, bw, bh));
  }
  g.stroke(poles, UI.halo, (UNBUILT.haloPx + 1) / css, 0.85);
  g.stroke(poles, UNBUILT.stake, (UNBUILT.stringPx + 0.6) / css);
  g.polys(boards, UNBUILT.board, { stroke: UNBUILT.string, strokeWidth: 1.4 / css });
  for (const kind of ['plot', 'site']) g.polys(pictures[kind], UNBUILT.string);
}
