import { describe, it, expect } from '../harness.js';
import {
  chunkSignature, cornerWeight, blobFor, bakeChunk, createTerrainBaker, drawTileGrid, chunkScaleFor, CHUNK,
} from '../../src/render/terrainBaker.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { T } from '../../src/sim/terrain.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { riverWorld, chunkPixel } from '../helpers/renderWorld.js';
import { addRaw } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, canvasHash, nearColour } from '../helpers/canvas.js';

describe('terrain baker', () => {
  it('picks a capped chunk scale', () => {
    expect(chunkScaleFor(1, 1)).toBe(2);
    expect(chunkScaleFor(0.5, 1)).toBe(1);
    expect(chunkScaleFor(2, 3)).toBe(3);
    expect(chunkScaleFor(1, 2)).toBe(3);
  });
  it('changes the signature only for the chunk a change touches', () => {
    const w = riverWorld();
    const before = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy]) => chunkSignature(w, cx, cy));
    addRaw(w, 'house', 14, 21);
    const after = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy]) => chunkSignature(w, cx, cy));
    expect(after[2] === before[2]).toBe(false);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[3]).toBe(before[3]);
    w.buildings[w.occ[21 * 32 + 14]].tier = 3;
    expect(chunkSignature(w, 0, 1) === after[2]).toBe(false);
  });
  it('weights corners by how many of their tiles share the terrain', () => {
    const w = riverWorld();
    expect(cornerWeight(w, 15, 21, T.MEADOW)).toBe(1);
    expect(cornerWeight(w, 12, 18, T.MEADOW)).toBe(0.25);
    expect(cornerWeight(w, 15, 21, T.DESERT)).toBe(0);
    expect(blobFor(w, 15, 21, T.MEADOW, 0, 0).length).toBe(8);
  });
  it('bakes the same pixels twice and paints each terrain its colour', () => {
    const w = riverWorld();
    const a = bakeChunk(w, 0, 1, 2);
    const b = bakeChunk(w, 0, 1, 2);
    expect(canvasHash(a.canvas)).toBe(canvasHash(b.canvas));
    const meadow = chunkPixel(a, 15, 21);
    expect(meadow[1]).toBeGreaterThan(meadow[0]);
    expect(nearColour(chunkPixel(a, 12, 28), TERRAIN.sand, 45)).toBe(true);
    const rocky = chunkPixel(bakeChunk(w, 1, 0, 2), 22, 6);
    expect(rocky[3]).toBe(255);
    expect(rocky[2]).toBeLessThan(rocky[0]);
  });
  it('re-bakes only the chunk that changed', () => {
    const w = riverWorld();
    const counter = { bakes: 0 };
    const baker = createTerrainBaker({ counter });
    const first = baker.get(w, 0, 1, 1, 1);
    baker.get(w, 1, 1, 1, 1);
    baker.get(w, 0, 1, 1, 1);
    expect(counter.bakes).toBe(2);
    addRaw(w, 'house', 14, 21);
    const again = baker.get(w, 0, 1, 1, 1);
    baker.get(w, 1, 1, 1, 1);
    expect(counter.bakes).toBe(3);
    expect(again === first).toBe(false);
    expect(baker.get(w, 1, 0, 1, 1, false)).toBe(null);
    expect(counter.bakes).toBe(3);
    expect(baker.size(w)).toBe(2);
  });
  it('draws the placement grid hook', () => {
    const c = makeCanvas(200, 200);
    const ctx = c.getContext('2d');
    ctx.translate(100, 20);
    drawTileGrid(makeDraw(ctx, 2), { x0: 0, y0: 0, x1: 3, y1: 3 });
    let inked = 0;
    for (let x = 0; x < 200; x += 2) for (let y = 0; y < 200; y += 2) if (pixelAt(c, x, y)[3] > 0) inked++;
    expect(inked).toBeGreaterThan(40);
    expect(CHUNK).toBe(16);
  });
});
