import { describe, it, expect } from '../harness.js';
import { OVERLAYS, houseMark, overlayMarks, reachTiles, drawOverlay, drawReachHighlight, drawGhost, groundTiles, roomTiles, GROUND_HUE } from '../../src/render/overlays.js';
import { T as TILE } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';
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
    expect(OVERLAYS.length).toBe(9);                                   // Stage 3 adds fire risk, the placement review Ground
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

// The Ground overlay (placement review P1): a 1-wide fertile strip down x = 0 (no 2 x 2 fits), a 3 x 3 fertile block, rocky ground.
function groundWorld() {
  const w = makeTestWorld({ size: 16, fertile: [[0, 0, 1, 4], [5, 5, 3, 3]] });
  for (let y = 10; y < 13; y++) for (let x = 10; x < 13; x++) w.terrain[idx(w.size, x, y)] = TILE.ROCKY;
  return w;
}
// A scene whose tile (tx, ty) sits at the canvas origin, with `at(x, y)`: the device point of a tile's corner.
function groundScene(tx, ty) {
  const s = scene([tx, ty]);
  const [ax, ay] = p(tx, ty);
  return { ...s, at: (x, y) => { const q = p(x, y); return [120 + 2 * (q[0] - ax), 60 + 2 * (q[1] - ay)]; } };
}
// Device alpha of the pixel just under tile (x, y)'s centre, clear of the two dots either side of it.
function tileAlpha(s, c, x, y) {
  const [cx, cy] = s.at(x + 0.5, y + 0.5);
  return pixelAt(c, Math.round(cx), Math.round(cy) + 6)[3];
}

describe('ground overlay (placement review P1)', () => {
  it('lists the free fertile and free rocky tiles, leaving out any with a building, a road or a wall, and honours the range', () => {
    const w = groundWorld();
    expect([groundTiles(w).fertile.length, groundTiles(w).rocky.length]).toEqual([4 + 9, 9]);
    addRaw(w, 'house', 5, 5);
    setRoad(w, 6, 5, 7, 5);
    w.wall[idx(w.size, 0, 3)] = 1;
    const g = groundTiles(w);
    expect(g.fertile.length).toBe(13 - 1 - 2 - 1);
    expect(g.fertile.some(([x, y]) => (x === 5 && y === 5) || (x === 6 && y === 5) || (x === 0 && y === 3))).toBe(false);
    expect(groundTiles(w, { x0: 10, y0: 10, x1: 11, y1: 11 })).toEqual({ fertile: [], rocky: [[10, 10], [11, 10], [10, 11], [11, 11]] });
  });
  it('finds the tiles with room for a whole footprint on its own ground, and memoises them until the buildings change', () => {
    const w = groundWorld();
    const farm = roomTiles(w, 'farm_grain');
    expect([farm.size, farm.has(idx(w.size, 6, 6)), farm.has(idx(w.size, 0, 0))]).toEqual([9, true, false]);   // the strip has no room for 2 x 2
    expect(roomTiles(w, 'farm_grain')).toBe(farm);
    const mine = roomTiles(w, 'gem_mine');
    expect([mine.size, mine.has(idx(w.size, 11, 11)), mine.has(idx(w.size, 6, 6))]).toEqual([9, true, false]);
    expect(roomTiles(w, 'well').size).toBe(0);                                                                  // no terrain: no ground to fit
    addRaw(w, 'house', 6, 6);                                                                                    // the 3 x 3 block's middle: every 2 x 2 in it needs it
    expect(roomTiles(w, 'farm_grain').size).toBe(0);
  });
  it('draws free fertile land green with dots, free rocky ground grey with hatching, and nothing on built tiles', () => {
    const w = groundWorld();
    addRaw(w, 'house', 7, 7);
    const s = groundScene(6, 6);
    drawOverlay(s.g, w, 'ground', null);
    const [cx, cy] = s.at(6.5, 6.5).map(Math.round);
    const open = pixelAt(s.c, cx, cy + 6), dot = pixelAt(s.c, cx - 8, cy);
    expect(open[3]).toBeGreaterThan(80);
    expect([open[1] > open[0], open[1] > open[2]]).toEqual([true, true]);               // green, not the other overlays' hues
    expect(dot[3]).toBeGreaterThan(open[3] + 40);                                        // a dot is stronger than the wash beside it
    expect(tileAlpha(s, s.c, 7, 7)).toBe(0);                                             // the house stands there
    const rock = groundScene(11, 11);
    drawOverlay(rock.g, w, 'ground', null);
    expect(inked(rock.c)).toBeGreaterThan(40);
    expect(GROUND_HUE.fertile === GROUND_HUE.rocky).toBe(false);
  });
  it('draws at half strength the tiles with no room for the building being placed, and at full strength those with room', () => {
    const w = groundWorld();
    const strip = groundScene(0, 0), block = groundScene(6, 6), plain = groundScene(0, 0), bare = groundScene(6, 6);
    drawOverlay(strip.g, w, 'ground', null, 'farm_grain');
    drawOverlay(block.g, w, 'ground', null, 'farm_grain');
    drawOverlay(plain.g, w, 'ground', null);
    drawOverlay(bare.g, w, 'ground', null);
    const dim = tileAlpha(strip, strip.c, 0, 0), bright = tileAlpha(block, block.c, 6, 6);
    expect([dim > 40 && dim < 66, bright > 90 && bright < 118]).toEqual([true, true]);
    expect([tileAlpha(plain, plain.c, 0, 0), tileAlpha(bare, bare.c, 6, 6)]).toEqual([bright, bright]);   // no tool: everything at full strength
    const none = groundScene(6, 6);
    addRaw(w, 'house', 6, 6);
    drawOverlay(none.g, w, 'ground', null, 'farm_grain');
    expect(tileAlpha(none, none.c, 5, 5)).toBe(dim);                                      // no room anywhere: all of it at half
  });
});
