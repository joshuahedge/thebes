// Version 9.3.1, group G (rulings 2030-2034): the placing ghost's depth. Its footprint lies in the renderer's ground layer (drawGround: over the terrain and
// the shadows, under every sprite), its standing part (a monument's silhouette) is sorted with the buildings at its footprint's depth, and its badges and
// glyphs stay over everything (drawOverlay).
import { describe, it, expect } from '../../harness.js';
import { createRenderer, collectObjects, PLACING_ID } from '../../../src/render/renderer.js';
import { createCamera, visibleTileRange, tileToScreen } from '../../../src/render/camera.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { createTerrainBaker } from '../../../src/render/terrainBaker.js';
import { depthKey, quad } from '../../../src/render/iso.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { drawGhost, drawGhostGround, drawGhostMarks, drawGhostSilhouette } from '../../../src/render/overlays.js';
import { ghostsFor } from '../../../src/ui/placement.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas, pixelAt, nearColour } from '../../helpers/canvas.js';

const VIEW = { width: 400, height: 300 };
const MAGENTA = '#FF00FF';

function frame(w, opts, log = null) {
  const canvas = makeCanvas(VIEW.width, VIEW.height);
  const real = createSpriteCache();
  const spriteCache = log ? { get: (slot, ...a) => { log.push(['sprite', slot]); return real.get(slot, ...a); } } : real;
  const renderer = createRenderer({ canvas, dpr: 1, spriteCache, baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
  const cam = createCamera({ x: 11.5, y: 11.5, zoom: 1 });
  renderer.renderFrame(w, cam, { view: VIEW, ...opts });
  return { canvas, cam };
}
const magentaTile = (x, y) => (g) => g.poly(quad(x, y, 1, 1, 0), MAGENTA);
const centrePx = (canvas, cam, x, y) => { const [sx, sy] = tileToScreen(cam, VIEW, x + 0.5, y + 0.5); return pixelAt(canvas, Math.round(sx), Math.round(sy)); };

describe('v931 g the ghost in the ground layer and in depth order', () => {
  it('calls drawGround after the terrain and before the first sprite, and drawOverlay after the last', () => {
    const w = makeTestWorld({ size: 32, fertile: [] });
    addRaw(w, 'house', 12, 12, { tier: 4, residents: 16 });
    addRaw(w, 'well', 10, 12);
    const log = [];
    frame(w, { drawGround: (g, r) => log.push(['ground', typeof g.poly, r]), drawOverlay: () => log.push(['overlay']) }, log);
    const at = (k) => log.findIndex((c) => c[0] === k);
    const sprites = log.map((c, i) => (c[0] === 'sprite' ? i : -1)).filter((i) => i >= 0);
    expect(sprites.length > 0).toBe(true);
    expect([at('ground') >= 0, at('ground') < sprites[0], at('overlay') > sprites[sprites.length - 1]]).toEqual([true, true, true]);
    expect(log[at('ground')][1]).toBe('function');
    expect(log[at('ground')][2]).toEqual(visibleTileRange(createCamera({ x: 11.5, y: 11.5, zoom: 1 }), VIEW, 32));
  });

  it('lets a home in front cover the ground layer, while drawOverlay stays over it', () => {
    const bare = makeTestWorld({ size: 32, fertile: [] });
    const built = makeTestWorld({ size: 32, fertile: [] });
    addRaw(built, 'house', 12, 12, { tier: 4, residents: 16 });   // straight in front of tile (11, 11) on screen: its sprite rises over that tile's middle
    const open = frame(bare, { drawGround: magentaTile(11, 11) });
    const hid = frame(built, { drawGround: magentaTile(11, 11) });
    const over = frame(built, { drawOverlay: magentaTile(11, 11) });
    expect(nearColour(centrePx(open.canvas, open.cam, 11, 11), MAGENTA, 10)).toBe(true);
    expect(nearColour(centrePx(hid.canvas, hid.cam, 11, 11), MAGENTA, 60)).toBe(false);
    expect(nearColour(centrePx(over.canvas, over.cam, 11, 11), MAGENTA, 10)).toBe(true);
  });

  it('sorts the placing ghost between a building behind it and one in front of it', () => {
    const w = makeTestWorld({ size: 32, fertile: [] });
    addRaw(w, 'well', 10, 10);                     // behind: depth 21
    addRaw(w, 'granary', 12, 12, { store: {} });  // in front: depth 26
    const log = [];
    frame(w, { placing: [{ x: 11, y: 11, w: 1, d: 1, draw: (g) => log.push(['ghost', typeof g.poly]) }] }, log);
    const at = (pred) => log.findIndex(pred);
    const well = at((c) => c[0] === 'sprite' && c[1].startsWith('well'));
    const ghost = at((c) => c[0] === 'ghost');
    const granary = at((c) => c[0] === 'sprite' && c[1].startsWith('granary'));
    expect([well >= 0, ghost >= 0, granary >= 0]).toEqual([true, true, true]);
    expect([well < ghost, ghost < granary]).toEqual([true, true]);
    expect(log[ghost][1]).toBe('function');
    // At its footprint's depth, the key a building there would have: as many sprites before it as objects sort before that key.
    const objs = collectObjects(w, visibleTileRange(createCamera({ x: 11.5, y: 11.5, zoom: 1 }), VIEW, 32), [], undefined, { cam: createCamera({ x: 11.5, y: 11.5, zoom: 1 }), view: VIEW });
    const key = depthKey(11, 11, 1, 1);
    expect(log.slice(0, ghost).filter((c) => c[0] === 'sprite').length).toBe(objs.filter((o) => o.key < key || (o.key === key && o.id < PLACING_ID)).length);
  });

  it('hides the part of a monument\'s silhouette that a home in front stands over', () => {
    const w = makeTestWorld({ size: 32, fertile: [] });
    const [shape] = ghostsFor(w, { tool: { kind: 'building', type: 'mastaba_small', rot: 0 }, ghost: { x: 9, y: 9 } });
    expect(Boolean(shape.silhouette)).toBe(true);
    const placing = [{ x: shape.x, y: shape.y, w: shape.w, d: shape.d, draw: (g) => drawGhostSilhouette(g, shape) }];
    const front = makeTestWorld({ size: 32, fertile: [] });
    addRaw(front, 'house', shape.x + shape.w, shape.y + shape.d, { tier: 4, residents: 16 });
    const [fshape] = ghostsFor(front, { tool: { kind: 'building', type: 'mastaba_small', rot: 0 }, ghost: { x: 9, y: 9 } });
    const alone = frame(w, { placing });
    const behind = frame(front, { placing: [{ ...placing[0], draw: (g) => drawGhostSilhouette(g, fshape) }] });
    const empty = frame(front, {});
    // The home's own pixels are the same with the silhouette behind it as without one: the silhouette is under it, not laid over it.
    const [hx, hy] = tileToScreen(behind.cam, VIEW, shape.x + shape.w + 0.5, shape.y + shape.d + 0.1);
    const px = (c) => pixelAt(c, Math.round(hx), Math.round(hy) - 10);
    expect(px(behind.canvas)).toEqual(px(empty.canvas));
    expect(px(alone.canvas).join() === px(empty.canvas).join()).toBe(false);   // and there is silhouette there when no home stands in front
  });
});

describe('v931 g the interface\'s frame', () => {
  it('draws the spots, the desirability tint and every ghost but demolish\'s on the ground, and only their marks over the sprites', async () => {
    const ui = await fetch('/src/ui/createUI.js').then((r) => r.text());
    const ground = ui.slice(ui.indexOf('drawGround: (g, r) => {'), ui.indexOf('drawOverlay: (g, r) => {'));
    const overlay = ui.slice(ui.indexOf('drawOverlay: (g, r) => {'), ui.indexOf('drawMarkers(g, world, list, r, markerLayout)'));
    expect(overlay.length > 200).toBe(true);
    expect(['drawHouseSpots(', 'drawDesirabilityTint(', 'drawGhostGround('].map((s) => ground.includes(s))).toEqual([true, true, true]);
    expect(['drawHouseSpots(', 'drawDesirabilityTint(', 'drawGhostGround('].map((s) => overlay.includes(s))).toEqual([false, false, false]);
    const has = { marks: overlay.includes('if (onGround) drawGhostMarks(g, ghost); else drawGhost(g, ghost);'), demolish: ui.includes("s.tool.kind !== 'demolish'"),
      silhouette: ui.includes('drawGhostSilhouette(g, sh)') };   // a monument's silhouette goes to the renderer's placing list
    expect(has).toEqual({ marks: true, demolish: true, silhouette: true });
  });
});

describe('v931 g the ghost in two passes', () => {
  // A recording drawing context: what each pass draws, by primitive.
  function rec() {
    const g = makeDraw(makeCanvas(200, 200).getContext('2d'), 2);
    const calls = { poly: 0, text: 0, circ: 0, line: 0 };
    for (const k of Object.keys(calls)) { const f = g[k].bind(g); g[k] = (...a) => { calls[k]++; return f(...a); }; }
    return { g, calls };
  }
  const building = { x: 2, y: 2, w: 2, d: 2, state: 'warn', badge: true,
    tiles: [{ x: 2, y: 2, state: 'met' }, { x: 3, y: 2, state: 'met' }, { x: 2, y: 3, state: 'off' }, { x: 3, y: 3, state: 'met' }], joins: [[4, 2]], wet: [[1, 2]], roadAt: [[2, 1]] };

  it('draws a building ghost\'s footprint in the ground pass and only its badges and glyphs in the marks pass', () => {
    const ground = rec(), marks = rec(), both = rec();
    drawGhostGround(ground.g, building);
    drawGhostMarks(marks.g, building);
    drawGhost(both.g, building);
    expect([ground.calls.poly > 0, ground.calls.text, ground.calls.circ]).toEqual([true, 0, 0]);
    expect([marks.calls.poly, marks.calls.text > 0, marks.calls.circ > 0]).toEqual([0, true, true]);
    expect(both.calls).toEqual({ poly: ground.calls.poly + marks.calls.poly, text: ground.calls.text + marks.calls.text, circ: ground.calls.circ + marks.calls.circ, line: ground.calls.line + marks.calls.line });
  });

  it('splits an area\'s plots, a refused square, the ground left over and a road\'s bridge, ferry and gate squares the same way', () => {
    const square = (state, extra = {}) => ({ x: 0, y: 0, w: 1, d: 1, state, ...extra });
    for (const shape of [square('ok'), square('bad'), { ...square('warn'), w: 2, d: 2 }, square('left'), square('bridge'), square('ferry'), square('gate'), square('stub'), square('stub', { faint: true }), square('shown', { landing: true })]) {
      const ground = rec(), marks = rec();
      drawGhostGround(ground.g, shape);
      drawGhostMarks(marks.g, shape);
      expect([shape.state, ground.calls.text, ground.calls.circ, marks.calls.poly, marks.calls.line]).toEqual([shape.state, 0, 0, 0, 0]);
      expect(ground.calls.poly > 0).toBe(true);
    }
  });

  it('leaves drawGhost whole after a pass, and a pass that throws does not stick', () => {
    const first = rec();
    drawGhost(first.g, building);
    drawGhostGround(rec().g, building);
    drawGhostMarks(rec().g, building);
    expect(() => drawGhostGround({ ...rec().g, poly: () => { throw new Error('boom'); } }, building)).toThrow();
    const again = rec();
    drawGhost(again.g, building);
    expect(again.calls).toEqual(first.calls);
  });
});
