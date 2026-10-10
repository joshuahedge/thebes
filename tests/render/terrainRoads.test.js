import { describe, it, expect } from '../harness.js';
import { roadSegments } from '../../src/render/terrainRoads.js';
import { riverSpans, riverBanks, smoothPath } from '../../src/render/terrainWater.js';
import { bakeChunk, chunkSignature } from '../../src/render/terrainBaker.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { riverWorld, chunkPixel } from '../helpers/renderWorld.js';
import { setRoad } from '../helpers/testWorld.js';
import { nearColour } from '../helpers/canvas.js';

describe('river and roads', () => {
  it('lists road segments in a fixed order, east before south', () => {
    const w = riverWorld();
    const { segs, dots } = roadSegments(w, { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(segs[0]).toEqual([10, 12, 11, 12]);
    const east = segs.findIndex((s) => s.join() === [20, 12, 21, 12].join());
    const south = segs.findIndex((s) => s.join() === [20, 12, 20, 13].join());
    expect(east).toBeGreaterThan(-1);
    expect(south).toBe(east + 1);
    expect(segs.length).toBe(18 + 14);
    expect(dots).toEqual([]);
    setRoad(w, 2, 30, 2, 30);
    expect(roadSegments(w, { x0: 0, y0: 16, x1: 15, y1: 31 }).dots).toEqual([[2, 30]]);
  });
  it('only lists segments that touch the range or its ring', () => {
    const w = riverWorld();
    const { segs } = roadSegments(w, { x0: 16, y0: 16, x1: 31, y1: 31 });
    expect(segs.every(([ax, ay]) => ay >= 15)).toBe(true);
    expect(segs.some(([ax, ay, bx, by]) => by === 26)).toBe(true);
  });
  it('finds one water span per row and smooths the banks', () => {
    const w = riverWorld();
    const spans = riverSpans(w);
    expect(spans.length).toBe(32);
    expect(spans[0][1] - spans[0][0]).toBe(2);
    expect(riverSpans(w)).toBe(spans);
    const banks = riverBanks(w, 0, 31);
    expect(banks.left.length).toBe(32);
    expect(banks.centre[5][2]).toBe(3);
    const segs = smoothPath(banks.left);
    expect(segs[0][0]).toBe('M');
    expect(segs[1][0]).toBe('Q');
    expect(segs[segs.length - 1][0]).toBe('L');
  });
  it('paints water bluish and a road centre road-coloured', () => {
    const w = riverWorld();
    const s = bakeChunk(w, 0, 0, 2);
    const water = chunkPixel(s, 4, 8);
    expect(water[3]).toBe(255);
    expect(water[2]).toBeGreaterThan(water[0] + 20);
    expect(nearColour(chunkPixel(s, 15, 12), TERRAIN.road, 40)).toBe(true);
    expect(nearColour(chunkPixel(s, 15, 14), TERRAIN.road, 20)).toBe(false);
  });
  it('re-bakes a chunk when a road is drawn under it', () => {
    const w = riverWorld();
    const before = chunkSignature(w, 1, 1);
    setRoad(w, 24, 20, 28, 20);
    expect(chunkSignature(w, 1, 1) === before).toBe(false);
  });
});
