// Version 9.2, Track V (rulings 1845-1849): the look. Roads carry a kerb shadow on the low side and a darker centre; a plot at the far zoom is a sand square with a shadow, not an outline;
// burnt rubble is a charred wall stump with blackened bricks; the score chip is a medal; the Health layer speaks in hatches, not rings. Nothing here touches the sim, the save or a pin.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { drawRoads, KERB, CART_TRACK } from '../../../src/render/terrainRoads.js';
import { drawUnbuilt, UNBUILT, FAR_ZOOM } from '../../../src/render/unbuilt.js';
import { MARKER } from '../../../src/render/markers.js';
import { drawScorch, STUMP, SCORCH } from '../../../src/render/fire.js';
import { drawOverlay } from '../../../src/render/overlays.js';
import { scoreIcon } from '../../../src/ui/v81/statIcons.js';
import { paintHouses } from '../../../src/sim/commands.js';
import { TERRAIN, SHADOW, UI } from '../../../src/render/art/palette.js';
import { p } from '../../../src/render/iso.js';
import { fallIll } from '../../../src/sim/health.js';
import { createOverlayLegend } from '../../../src/ui/overlayUi.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { mount } from '../../helpers/dom.js';

// A drawing object that records the calls this track's art makes (and still draws).
function spy(scale = 2, size = 64) {
  const g = makeDraw(makeCanvas(size, size).getContext('2d'), scale);
  const calls = [];
  for (const k of ['stroke', 'polys', 'poly', 'hatchPolys', 'circ', 'radial', 'ell', 'line']) {
    const f = g[k];
    g[k] = (...a) => { calls.push({ k, a }); return f(...a); };
  }
  return { g, calls };
}
const RANGE = { x0: 0, y0: 0, x1: 31, y1: 31 };

describe('v92 v roads: a kerb shadow on the low side and a darker centre', () => {
  it('draws the shadow as the road path moved down the screen, under the road, and a darker centre stroke over it', () => {
    const w = makeTestWorld();
    setRoad(w, 4, 10, 12, 10);
    const s = spy();
    drawRoads(s.g, w, RANGE);
    const strokes = s.calls.filter((c) => c.k === 'stroke');
    const kerb = strokes.find((c) => c.a[1] === SHADOW && c.a[2] === KERB.width);
    const top = strokes.find((c) => c.a[1] === TERRAIN.road);
    const centre = strokes.find((c) => c.a[1] === TERRAIN.roadEdge && c.a[2] === CART_TRACK.width);
    expect([!!kerb, !!centre]).toEqual([true, true]);
    expect(strokes.indexOf(kerb)).toBeLessThan(strokes.indexOf(top));         // under the road
    expect(strokes.indexOf(centre)).toBeGreaterThan(strokes.indexOf(top));    // over it
    const plain = top.a[0];
    expect(kerb.a[0].length).toBe(plain.length);
    kerb.a[0].forEach((seg, i) => { expect(seg[1][0]).toBe(plain[i][1][0]); expect(Math.abs(seg[1][1] - plain[i][1][1] - KERB.drop)).toBeLessThan(1e-6); });   // down, never sideways
    expect(KERB.alpha).toBeLessThan(0.5);
  });
  it('shows on the ground: below a road there is more shadow than above it', () => {
    const w = makeTestWorld();
    setRoad(w, 2, 8, 12, 8);
    const c = makeCanvas(400, 200), ctx = c.getContext('2d');
    ctx.fillStyle = TERRAIN.sand; ctx.fillRect(0, 0, 400, 200);
    const mid = p(7.5, 8.5);
    ctx.translate(200 - mid[0] * 2, 100 - mid[1] * 2);
    drawRoads(makeDraw(ctx, 2), w, RANGE);
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const edge = 6 * 2;   // the road's half width in px, then just past it (the shadow's reach)
    const below = lum(pixelAt(c, 200, 100 + edge + 3)), above = lum(pixelAt(c, 200, 100 - edge - 3));
    expect(below).toBeLessThan(above - 4);
  });
});

describe('v92 v plots: the far zoom is a sand square with a shadow', () => {
  function plots(n) {
    const w = makeTestWorld({ gold: 100000 });
    setRoad(w, 0, 10, 31, 10);
    paintHouses(w, 1, 9, n, 9);
    return w;
  }
  const at = (zoom, w) => { const s = spy(2 * zoom, 400); const orig = s.g.cssScale; s.g.cssScale = 2 * zoom; drawUnbuilt(s.g, w, RANGE); s.g.cssScale = orig; return s.calls; };
  it('keeps the far zoom the markers use', () => {
    expect(FAR_ZOOM).toBe(MARKER.farZoom);
  });
  it('near, the string and the stakes as before; far, a sand fill and a shadow and no outline, and the sign stays', () => {
    const w = plots(6);
    const near = at(1, w), far = at(FAR_ZOOM, w);
    const haloOutline = (cs) => cs.filter((c) => c.k === 'polys' && c.a[2] && c.a[2].stroke === UI.halo).length;
    expect(haloOutline(near)).toBeGreaterThan(0);
    expect(haloOutline(far)).toBe(0);
    expect(far.some((c) => c.k === 'polys' && c.a[1] === UNBUILT.sand)).toBe(true);
    expect(far.some((c) => c.k === 'polys' && c.a[1] === SHADOW)).toBe(true);
    expect(far.some((c) => c.k === 'polys' && c.a[1] === UNBUILT.board)).toBe(true);   // the sign says "a home goes here"
    expect(far.some((c) => c.k === 'stroke' && c.a[1] === UNBUILT.stake)).toBe(true);  // (the sign's post)
  });
  it('costs the same few fills however many plots there are (a frame bound kept, not loosened)', () => {
    const few = at(FAR_ZOOM, plots(4)).filter((c) => c.k === 'polys').length;
    const many = at(FAR_ZOOM, plots(28)).filter((c) => c.k === 'polys').length;
    expect(many).toBe(few);
  });
});

describe('v92 v rubble: a charred wall stump and blackened bricks', () => {
  function rubbleWorld(n = 1) {
    const w = makeTestWorld({ fertile: [] });
    for (let i = 0; i < n; i++) addRaw(w, 'rubble', 10 + i * 2, 10);
    return w;
  }
  it('is drawn from the tile alone: the same on every frame, a different stump on a different tile', () => {
    const w = rubbleWorld(2);
    const run = () => { const s = spy(); drawScorch(s.g, w, null); return JSON.stringify(s.calls.map((c) => [c.k, c.a])); };
    expect(run()).toBe(run());
    const first = (() => { const s = spy(); drawScorch(s.g, rubbleWorld(1), null); return JSON.stringify(s.calls.filter((c) => c.k === 'polys' && c.a[1] === STUMP.top)); })();
    const w2 = makeTestWorld({ fertile: [] }); addRaw(w2, 'rubble', 13, 14);
    const other = (() => { const s = spy(); drawScorch(s.g, w2, null); return JSON.stringify(s.calls.filter((c) => c.k === 'polys' && c.a[1] === STUMP.top)); })();
    expect(first === other).toBe(false);
  });
  it('draws the stump (top, long face, end face), mortar and bricks, as a few batched fills however many tiles', () => {
    const count = (n) => { const s = spy(); drawScorch(s.g, rubbleWorld(n), null); return s.calls.filter((c) => c.k === 'polys' || (c.k === 'stroke')).length; };
    const s = spy(); drawScorch(s.g, rubbleWorld(3), null);
    const fills = s.calls.filter((c) => c.k === 'polys').map((c) => c.a[1]);
    for (const colour of [STUMP.top, STUMP.long, STUMP.end, STUMP.brick, STUMP.brickLit]) expect(fills.includes(colour)).toBe(true);
    const tops = s.calls.find((c) => c.k === 'polys' && c.a[1] === STUMP.top).a[0];
    expect(tops.length).toBe(3);                    // one stump a tile ...
    expect(count(2)).toBe(count(8) - 0);            // ... in the same few batches (the stain's radial is not counted)
    expect(STUMP.hMax).toBeGreaterThan(STUMP.hMin);
  });
  it('still darkens the ground under the stump (the stain stays softer than a burning building\'s)', () => {
    const w = rubbleWorld(1), b = Object.values(w.buildings)[0];
    const c = makeCanvas(200, 120), ctx = c.getContext('2d');
    ctx.fillStyle = TERRAIN.sand; ctx.fillRect(0, 0, 200, 120);
    const q = p(b.x + 0.5, b.y + 0.5);
    ctx.translate(100 - q[0] * 2, 60 - q[1] * 2);
    drawScorch(makeDraw(ctx, 2), w, null);
    const lum = ([r, g, bl]) => 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    expect(lum(pixelAt(c, 4, 4)) - lum(pixelAt(c, 100, 60))).toBeGreaterThan(25);
    expect(SCORCH.rubble).toBeLessThan(SCORCH.burning);
  });
  it('is no more than the grey blotch cost: one radial and no ellipse streaks a rubble tile', () => {
    const s = spy(); drawScorch(s.g, rubbleWorld(4), null);
    expect(s.calls.filter((c) => c.k === 'radial').length).toBe(4);
    expect(s.calls.filter((c) => c.k === 'ell').length).toBe(0);
  });
});

describe('v92 v the cartouche heading wraps', () => {
  it('a long ruler name wraps (balanced, never an ellipsis over its end and its number): the last .cartouche-ruler rule in the stylesheet lets it', async () => {
    const css = await (await fetch('/css/v92.css')).text();
    const rules = css.split('}').filter((r) => /(^|\s|,)\.cartouche-ruler\s*\{/.test(r + '}') && /white-space/.test(r));
    const last = rules[rules.length - 1];
    expect(/white-space:\s*normal/.test(last)).toBe(true);
    expect(/text-overflow:\s*clip/.test(last)).toBe(true);
    expect(/text-wrap:\s*balance/.test(last)).toBe(true);
  });
});

describe('v92 v the score chip: a medal', () => {
  it('is a medal with ribbon tails and a star, not the cartouche and its sun', () => {
    mount(document.createElement('div'));
    const s = scoreIcon();
    expect(s.dataset.state).toBe('medal');
    expect(s.getAttribute('aria-hidden')).toBe('true');                       // the chip's own name says the number (Track A's rule for every stat picture)
    expect(s.querySelectorAll('.ribbon').length).toBe(2);
    expect(s.querySelectorAll('circle.ring').length).toBe(1);
    expect(s.querySelectorAll('.star').length).toBe(1);
    expect(s.querySelector('.disc')).toBe(null);
    expect(s.querySelector('rect')).toBe(null);
  });
});

describe('v92 v the Health layer: edges and the band\'s hatching, not rings', () => {
  function city() {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'market_town';
    w.mood = 60;
    w.labour = { workforce: 100, employed: 100, jobs: 100, shortLevels: [] };
    setRoad(w, 0, 10, 31, 10);
    const a = addRaw(w, 'house', 4, 9, { tier: 3, residents: 8 }), b = addRaw(w, 'house', 12, 9, { tier: 3, residents: 8 });
    addRaw(w, 'physician', 14, 11);
    staffAll(w);
    return { w, a, b };
  }
  it('edges a home a staffed physician reaches in a solid line, the one none reaches in a dashed one, and draws no ring or dot', () => {
    const { w } = city();
    const s = spy(2, 400);
    const dashes = [];
    const real = s.g.ctx.setLineDash.bind(s.g.ctx);
    s.g.ctx.setLineDash = (d) => { dashes.push(d.length); real(d); };
    drawOverlay(s.g, w, 'health', RANGE);
    expect(s.calls.filter((c) => c.k === 'circ').length).toBe(0);
    const edges = s.calls.filter((c) => c.k === 'polys' && c.a[1] === 'none' && c.a[2] && c.a[2].strokeWidth === 1.4);
    expect(edges.length).toBe(2);                                                  // the solid edge, then the dashed one
    expect([edges[0].a[0].length, edges[1].a[0].length]).toEqual([1, 1]);          // one home is covered and one is not
    expect(dashes).toEqual([2, 0]);                                                // dashed for the second, then reset to solid
  });
  it('keeps the sick home\'s own mark (the plague\'s heavy ring is another layer\'s shape) and the Crime layer\'s dots', () => {
    const { w, a } = city();
    w.day = 7; fallIll(w, a.id);
    const s = spy(2, 400);
    drawOverlay(s.g, w, 'crime', RANGE);
    drawOverlay(s.g, w, 'health', RANGE);
    expect(s.calls.length).toBeGreaterThan(0);
  });
  it('the legend shows the same two squares, a solid-edged one and a dashed one, with the same words', async () => {
    const { w } = city();
    const store = createStore({ ...INITIAL_UI_STATE, overlay: 'health' });
    const host = document.createElement('div');
    mount(host);
    createOverlayLegend({ container: host, store, world: w });
    const keys = [...host.querySelectorAll('.key')];
    expect(keys.length).toBe(2);
    expect(host.querySelector('.key .dot, .key .ring')).toBe(null);
    expect(keys.every((k) => k.querySelector('.swatch'))).toBe(true);
    expect(keys.map((k) => k.textContent.trim())).toEqual(['A staffed physician reaches it', 'No staffed physician reaches it']);
  });
});
