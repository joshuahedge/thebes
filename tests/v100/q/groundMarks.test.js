// Version 10.0, Track Q (rulings 2143-2145, Task Q.5): the ground marks that read as interface become ground. An empty plot is pegged out in the chunk's own pixels, a City street has wheel
// tracks, a burnt building leaves charred timbers and a drift of ash, and a troubled street at the far zoom shows one lighter badge.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas, pixelAt, canvasHash } from '../../helpers/canvas.js';
import { bakeChunk, drawPlotMarks, PLOT_PEGS } from '../../../src/render/terrainBaker.js';
import { drawRoads, WEAR } from '../../../src/render/terrainRoads.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART } from '../../../src/render/art/registry.js';
import { BURNT, ASH } from '../../../src/render/art/defence.js';
import { layoutMarkers, MARKER } from '../../../src/render/markers.js';
import { createCamera } from '../../../src/render/camera.js';
import { paintHouses } from '../../../src/sim/commands.js';
import { p } from '../../../src/render/iso.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';

const RANGE = { x0: 0, y0: 0, x1: 31, y1: 31 };
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('v100 q ground marks: a plot is pegged out in the ground', () => {
  it('drawPlotMarks puts a stake at each corner of an empty plot and a cord between them, and nothing for a hut', () => {
    const w = makeTestWorld({ fertile: [] });
    setRoad(w, 0, 10, 31, 10);
    paintHouses(w, 12, 9, 12, 9);
    const plot = Object.values(w.buildings).find((b) => b.type === 'house');
    expect(plot.tier).toBe(0);
    const S = 4, c = makeCanvas(300 * S, 200 * S), ctx = c.getContext('2d');
    const mid = p(12.5, 9.5);
    ctx.translate(150 * S - mid[0] * S, 100 * S - mid[1] * S);
    drawPlotMarks(makeDraw(ctx, S), w, RANGE);
    const at = (pt, dy = 0) => pixelAt(c, 150 * S + (pt[0] - mid[0]) * S, 100 * S + (pt[1] - mid[1] + dy) * S);
    const i = PLOT_PEGS.inset;
    const corners = [p(12 + i, 9 + i), p(13 - i, 9 + i), p(13 - i, 10 - i), p(12 + i, 10 - i)];
    for (const k of corners) expect([k, at(k, -2)[3] > 100]).toEqual([k, true]);                 // a stake, two art px up from each corner's foot
    const between = [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2];
    let cord = 0;
    for (let dy = -PLOT_PEGS.height - 1; dy <= 0; dy += 0.25) if (at(between, dy)[3] > 60) cord++;
    expect(cord > 0).toBe(true);                                                               // the cord's slack between two stakes
    plot.tier = 1;
    const c2 = makeCanvas(300 * S, 200 * S), ctx2 = c2.getContext('2d');
    ctx2.translate(150 * S - mid[0] * S, 100 * S - mid[1] * S);
    drawPlotMarks(makeDraw(ctx2, S), w, RANGE);
    expect(canvasHash(c2) === canvasHash(makeCanvas(300 * S, 200 * S))).toBe(true);           // a settled home has none
  });
  it("the chunk's bake carries them: a plot's pixels differ from the same tile as a Large lot, which is not pegged", () => {
    const make = (large) => {
      const w = makeTestWorld({ fertile: [] });
      setRoad(w, 0, 10, 31, 10);
      if (large) addRaw(w, 'house', 12, 9, { large: true });
      else paintHouses(w, 12, 9, 12, 9);
      return bakeChunk(w, 0, 0, 3);
    };
    expect(canvasHash(make(false).canvas) === canvasHash(make(true).canvas)).toBe(false);
  });
});

describe('v100 q ground marks: a City street has wheel tracks', () => {
  it('two darker lines run along the axis of a paved road either side of its middle', () => {
    const w = makeTestWorld({ fertile: [] });
    setRoad(w, 2, 10, 28, 10);
    for (const x of [5, 8, 11, 14]) { for (const y of [9, 11]) insertBuilding(w, makeBuilding(w, 'house', x, y)); }
    w.milestone = 'city';
    const S = 4, c = makeCanvas(400 * S, 200 * S), ctx = c.getContext('2d');
    ctx.fillStyle = '#EFDDB0'; ctx.fillRect(0, 0, c.width, c.height);
    const mid = p(9.75, 10.5);
    ctx.translate(200 * S - mid[0] * S, 100 * S - mid[1] * S);
    drawRoads(makeDraw(ctx, S), w, RANGE);
    const at = (a, o) => { const q = p(9.5 + a, 10.5 + o); return lum(pixelAt(c, 200 * S + (q[0] - mid[0]) * S, 100 * S + (q[1] - mid[1]) * S)); };
    const axis = at(0.25, 0), left = at(0.25, -WEAR.offset), right = at(0.25, WEAR.offset);
    expect(left < axis - 5).toBe(true);
    expect(right < axis - 5).toBe(true);
  });
});

describe('v100 q ground marks: a burnt building leaves timbers and ash', () => {
  it('the rubble draws three charred timbers and an ash drift', () => {
    const lines = [], ells = [];
    const g = makeDraw(makeCanvas(260, 260).getContext('2d'), 2);
    const rec = new Proxy(g, { get: (t, k) => (k === 'line' ? (a, b, colour, ...r) => { lines.push(colour); return t.line(a, b, colour, ...r); } : k === 'ell' ? (q, rx, ry, colour, ...r) => { ells.push(colour); return t.ell(q, rx, ry, colour, ...r); } : t[k]) });
    ART['rubble.v0'].draw(rec, 0, 0);
    expect(lines.filter((c) => c === BURNT).length >= 3).toBe(true);
    expect(ells.filter((c) => ASH.includes(c)).length >= 1).toBe(true);
  });
});

describe('v100 q ground marks: a troubled street at the far zoom', () => {
  it('shows one badge for five buildings of one cause, lighter than 9.2 drew it', () => {
    const w = makeTestWorld({ fertile: [] });
    setRoad(w, 2, 10, 28, 10);
    const bs = [4, 7, 10, 13, 16].map((x) => addRaw(w, 'potter', x, 11));
    const alerts = bs.map((b) => ({ code: 'no_input', id: b.id }));
    const view = { width: 390, height: 844 };
    const far = layoutMarkers(w, alerts, createCamera({ x: 10, y: 11, zoom: 0.6 }), view);
    expect(far.length).toBe(1);
    expect(far[0].count).toBe(5);
    expect(MARKER.drawScale).toBe(0.8);
    expect(MARKER.stemInk).toBe(1);
  });
});
