import { describe, it, expect } from '../harness.js';
import { OVERLAYS, houseMark, overlayMarks, reachTiles, drawOverlay, drawReachHighlight, drawGhost } from '../../src/render/overlays.js';
import { p } from '../../src/render/iso.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { UI } from '../../src/render/art/palette.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, nearColour } from '../helpers/canvas.js';

function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

// The canvas origin sits at device (120, 60). `at` is the tile placed there: world scenes anchor on a
// tile of the river world (the default (0, 0) leaves the ghost scenes where their sampling expects them).
function scene(at = [0, 0]) {
  const c = makeCanvas(240, 200);
  const ctx = c.getContext('2d');
  const [ax, ay] = p(at[0], at[1]);
  ctx.translate(120 - 2 * ax, 60 - 2 * ay);
  return { c, g: makeDraw(ctx, 2) };
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('overlays', () => {
  it('classifies water, food and religion from the live checklist', () => {
    const w = street();
    const hut = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    const cottage = addRaw(w, 'house', 14, 11, { tier: 3, residents: 12, stock: { grain: 3 } });
    expect(houseMark(w, hut, 'water')).toEqual({ has: false, need: 'water' });
    expect(houseMark(w, hut, 'food')).toBe(null);
    addRaw(w, 'well', 13, 9);
    expect(houseMark(w, hut, 'water')).toEqual({ has: true, need: 'water' });
    expect(houseMark(w, cottage, 'food')).toEqual({ has: true, need: 'food' });
    expect(houseMark(w, cottage, 'religion')).toEqual({ has: false, need: 'religion' });
    addRaw(w, 'temple', 16, 8);
    staffAll(w);
    expect(houseMark(w, cottage, 'religion').has).toBe(true);
  });
  it('shows each home its next blocking need in the housing overlay', () => {
    const w = street();
    const hut = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    const plot = addRaw(w, 'house', 5, 20);
    expect(houseMark(w, hut, 'housing')).toEqual({ has: false, need: 'water' });
    expect(houseMark(w, plot, 'housing')).toEqual({ has: false, need: 'road' });
    addRaw(w, 'well', 13, 9);
    expect(houseMark(w, hut, 'housing')).toEqual({ has: true, need: null });
    const marks = overlayMarks(w, 'housing');
    expect(marks.length).toBe(2);
    expect(marks.find((m) => m.id === hut.id)).toEqual({ id: hut.id, x: 12.5, y: 11.5, has: true, need: null });
    expect(overlayMarks(w, 'water', { x0: 0, y0: 0, x1: 8, y1: 31 }).length).toBe(0);
    expect(OVERLAYS.length).toBe(7);
  });
  it('lists the tiles a building reaches', () => {
    const w = riverWorld();
    const well = Object.values(w.buildings).find((b) => b.type === 'well');
    const tiles = reachTiles(w, well);
    expect(tiles.length).toBe(9);
    expect(tiles).toContain(12 * 32 + 16);
    expect(tiles).toContain(12 * 32 + 12);
    expect(tiles).toContain(12 * 32 + 20);
    expect(tiles.includes(12 * 32 + 11)).toBe(false);
  });
  it('draws dots and rings, a reach highlight and the three ghost states', () => {
    const w = riverWorld();
    const full = { x0: 0, y0: 0, x1: 31, y1: 31 };
    const a = scene([16, 12]);
    drawOverlay(a.g, w, 'water', full);
    expect(inked(a.c)).toBeGreaterThan(10);
    const b = scene([24, 13]);
    drawReachHighlight(b.g, w, Object.values(w.buildings).find((o) => o.type === 'temple'));
    expect(inked(b.c)).toBeGreaterThan(10);
    const ok = scene();
    drawGhost(ok.g, { x: 0, y: 0, w: 1, d: 1, state: 'ok' });
    let blue = 0;
    for (let x = 80; x < 160; x += 2) for (let y = 56; y < 100; y += 2) if (nearColour(pixelAt(ok.c, x, y), UI.ok, 60)) blue++;
    expect(blue).toBeGreaterThan(5);
    const bad = scene();
    drawGhost(bad.g, { x: 0, y: 0, w: 2, d: 2, state: 'bad' });
    let coral = 0;
    for (let x = 60; x < 180; x += 2) for (let y = 60; y < 124; y += 2) if (nearColour(pixelAt(bad.c, x, y), UI.bad, 40)) coral++;
    expect(coral).toBeGreaterThan(20);
    const warn = scene();
    drawGhost(warn.g, { x: 0, y: 0, w: 1, d: 1, state: 'warn' });
    expect(inked(warn.c)).toBeGreaterThan(10);
  });
});
