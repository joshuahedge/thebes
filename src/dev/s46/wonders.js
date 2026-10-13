// Stage 4.6, the Wonders track's dev scenes (rulings 342-343). Each opens a new seed-11 city on open desert (a patch of the map is levelled to
// desert, so the picture is the monuments and nothing else), lays the monuments out by writing their sites to the contract's shapes (b.site),
// and frames them. The city stays paused, so a scene holds still for the shot.
//   s46-wonders          the three new kinds finished: a column on a tall phone, else three rows of three, one row for each style
//   s46-wonders-sphinx   the great sphinx finished beside the same kind half built (a close view); likewise -temple and -step
//   s46-wonders-styles   the small pyramid in Classic, Whitewashed, Painted and Gilded side by side (an existing kind, every style)
//   s46-wonders-picker   the style picker at placement: the large mastaba's ghost on a road, the bar with its three styles
import { inGame, wait } from './base.js';
import { insertBuilding, makeBuilding } from '../../sim/world.js';
import { setGuide } from '../../sim/commands.js';
import { MONUMENTS } from '../../data/monuments.js';
import { T as TERRAIN } from '../../sim/terrain.js';
import { idx } from '../../sim/grid.js';
import { screenToTile } from '../../render/camera.js';
import { freeTop } from '../../ui/layout.js';

// Levels a w x d patch of the map's middle to desert (no water, no trees) so the monuments stand on plain sand, clearing what stood there.
function level(world, x0, y0, w, d) {
  for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) world.terrain[idx(world.size, x, y)] = TERRAIN.DESERT;
}

// A monument at (x, y) in a style: finished, or `part` of the way through its courses (0 to 1), with a stockpile and, when part, two crews' worth of
// idle gangs (the site has crews listed, so it reads as a working site; the sim does not run while the scene is open).
function put(world, type, x, y, style, part = null) {
  const m = MONUMENTS[type], b = insertBuilding(world, makeBuilding(world, type, x, y, 0, { style }));
  const n = m.courses.length;
  if (part === null) return Object.assign(b.site, { course: n, laid: { stone: 0, bricks: 0 }, crews: [], done: world.day, extraPaid: true }), b;
  const course = Math.min(n - 1, Math.floor(n * part)), frac = n * part - course, c = m.courses[course];
  Object.assign(b.site, { course, laid: { stone: c.stone * frac, bricks: c.bricks * frac }, stock: { stone: c.stone > 0 ? 70 : 0, bricks: c.bricks > 0 ? 70 : 0 }, crews: [0, 0], idle: 0, reason: null });
  return b;
}

// Puts tile (x, y) in the middle of the map the interface leaves free (the top bar and the rows under it, and the side panel or the dock), by a jump, so
// no camera tween is left running when the capture is taken (the same measure as the other scenes' focus, src/dev/scenes.js).
function focusOn(g, x, y) {
  const c = g.ui.cameraControl.centre(), v = { width: c.x * 2, height: c.y * 2 };
  const map = document.querySelector('#map'), layout = g.ui.store.get().layout, top = freeTop(map && map.parentElement, map, layout);
  const i = layout === 'portrait' ? { top, left: 0, right: 0, bottom: v.height * 0.2 } : { top, left: 0, bottom: 0, right: layout === 'compact' ? 56 + 268 : 320 };
  const midX = i.left + (v.width - i.left - i.right) / 2, midY = i.top + (v.height - i.top - i.bottom) / 2;
  const t = screenToTile({ x, y, zoom: g.cam.zoom }, v, v.width - midX, v.height - midY);
  g.ui.cameraControl.jumpTo(t.x, t.y);
}

// A new city with a levelled patch around (cx, cy), the guide off and the camera jumped to look at (lx, ly) from `zoom`.
async function arena(api, name, cx, cy, size, build, zoom, look = null) {
  const g = inGame(api, name);
  const world = api.freshWorld({ seed: 11, variant: 'classic', size: 64 });
  level(world, cx - size, cy - size, size * 2, size * 2);
  setGuide(world, false);
  const made = build(world, cx, cy);
  api.startGame(world, { saveNow: false });
  const game = api.game();
  game.ui.cameraControl.cancel();
  game.cam.zoom = zoom;
  const at = look || { x: cx, y: cy };
  focusOn(game, at.x, at.y);
  await wait(400);
  return { world, made, game, g };
}

const KINDS = ['great_sphinx', 'sun_temple', 'step_pyramid'];
const STYLES = ['whitewashed', 'painted', 'gilded'];

// A tall phone shows the three new kinds finished in one column (placed along the map's diagonal, which is vertical on screen), each in a style of
// its own (Painted, Gilded, Whitewashed); a wide screen shows three rows of three, one row for each style. options: zoom.
async function all(api, options = {}) {
  const tall = window.innerHeight > window.innerWidth;
  const { made } = await arena(api, 's46-wonders', 32, 32, 18, (world, cx, cy) => {
    const out = [];
    if (tall) KINDS.forEach((type, i) => out.push(put(world, type, cx - 5 + i * 7, cy - 5 + i * 7, ['painted', 'gilded', 'whitewashed'][i])));
    else STYLES.forEach((style, r) => KINDS.forEach((type, c) => out.push(put(world, type, cx - 9 + c * 7, cy - 9 + r * 7, style))));
    return out;
  }, options.zoom || (tall ? 0.75 : 0.62));
  return `wonders ${made.length} finished: ${made.map((b) => `${b.type}/${b.style}`).join(' ')}`;
}

// One kind close: finished (Painted) and half built, side by side along x. options: zoom, style (default painted), only ('finished' or 'site').
const pair = (name, type, zoom) => async (api, options = {}) => {
  const m = MONUMENTS[type], gap = 2, style = options.style || 'painted';
  const { made } = await arena(api, name, 32, 32, 12, (world, cx, cy) => {
    if (options.only === 'finished') return [put(world, type, cx - m.w / 2 | 0, cy - m.d / 2 | 0, style)];
    if (options.only === 'site') return [put(world, type, cx - m.w / 2 | 0, cy - m.d / 2 | 0, style, options.part || 0.55)];
    return [put(world, type, cx - m.w - gap, cy, style), put(world, type, cx + gap, cy, style, 0.55)];
  }, options.zoom || zoom);
  return `${name}: ${made.map((b) => (b.site.done === null ? `course ${b.site.course} of ${MONUMENTS[type].courses.length}` : 'finished')).join(', ')}`;
};

// The small pyramid, an existing kind, in every style, two by two: Classic first (as it was drawn before Stage 4.6), then the three offered.
async function styles(api, options = {}) {
  const { made } = await arena(api, 's46-wonders-styles', 32, 32, 16, (world, cx, cy) => ['classic', ...STYLES].map((style, i) => put(world, 'pyramid_small', cx - 5 + (i % 2) * 6, cy - 5 + Math.floor(i / 2) * 6, style)), options.zoom || 0.72);
  return `styles ${made.map((b) => b.style).join(' ')}`;
}

// The picker at placement: a Capital with the large mastaba's card picked and its ghost on open desert by a road, the bar showing the three styles.
async function picker(api, options = {}) {
  const { world, game } = await arena(api, 's46-wonders-picker', 32, 32, 14, (w, cx, cy) => {
    w.milestone = 'capital';
    w.gold = 20000;
    for (let x = cx - 8; x <= cx + 8; x++) w.road[idx(w.size, x, cy)] = 1;   // the road the mastaba's ghost lands beside
    w.roadVersion++;
    return null;
  }, 1);
  game.ui.refresh();
  await wait(100);
  game.ui.showMeAt({ category: 'monuments', item: 'mastaba_large', x: 32, y: 29 });
  await wait(600);
  game.ui.placement.moveGhost(28, 29);   // beside the road, so the bar shows a spot that can be founded
  focusOn(game, 30, 30.5);
  await wait(200);
  if (options.style) { game.ui.placement.setStyle(options.style); await wait(200); }
  return `picker ${game.ui.store.get().mode} style ${game.ui.store.get().tool && game.ui.store.get().tool.style} gold ${world.gold}`;
}

export const WONDER_SCENES = {
  's46-wonders': all,
  's46-wonders-sphinx': pair('s46-wonders-sphinx', 'great_sphinx', 0.78),
  's46-wonders-temple': pair('s46-wonders-temple', 'sun_temple', 0.68),
  's46-wonders-step': pair('s46-wonders-step', 'step_pyramid', 0.56),
  's46-wonders-styles': styles,
  's46-wonders-picker': picker,
};
