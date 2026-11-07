// Version 9.0 Track L (ruling 1591): the map square a ruler row keeps. mapSquareOf writes 32 x 32 base-36 cells in drawMapSquare's colours; decodeMapSquare and
// share.js drawMapString draw them back. The round trip is pinned on a hand-built map, then on a real city of every size.
import { describe, it, expect } from '../../harness.js';
import { mapSquareOf, decodeMapSquare, MAP_SQUARE, MAP_CELL } from '../../../src/save/records.js';
import { drawMapSquare, drawMapString, mapSquareColour } from '../../../src/ui/share.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { TERRAIN } from '../../../src/render/art/palette.js';
import { T as TER } from '../../../src/sim/terrain.js';

// A canvas stand-in that records every rectangle as { colour, x, y, w, h } in the order drawn.
function recorder() {
  const rects = [];
  const g = { fillStyle: '', fillRect(x, y, w, h) { rects.push({ colour: this.fillStyle, x, y, w, h }); } };
  return { g, rects };
}
// The colour each of the 32 x 32 cells ends up with once every rectangle is laid down in order (a later one covers an earlier one).
function paintOf(rects, px) {
  const cell = px / MAP_SQUARE, out = new Array(MAP_SQUARE * MAP_SQUARE).fill(null);
  for (const r of rects) {
    for (let cy = 0; cy < MAP_SQUARE; cy++) for (let cx = 0; cx < MAP_SQUARE; cx++) {
      const x = cx * cell, y = cy * cell;
      if (r.x <= x + 1e-6 && x + cell <= r.x + r.w + 1e-6 && r.y <= y + 1e-6 && y + cell <= r.y + r.h + 1e-6) out[cy * MAP_SQUARE + cx] = r.colour;
    }
  }
  return out;
}

describe('v90 l map square: the encoder and the decoder', () => {
  it('writes MAP_SQUARE x MAP_SQUARE base-36 characters and reads them back as codes', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    const text = mapSquareOf(w);
    expect([text.length, MAP_SQUARE, /^[0-9a-z]+$/.test(text)]).toEqual([1024, 32, true]);
    const cells = decodeMapSquare(text);
    expect([cells.length, cells.every((c) => Number.isInteger(c) && c >= 0 && c < 36)]).toEqual([1024, true]);
    expect(cells.map((c) => c.toString(36)).join('')).toBe(text);
    expect(mapSquareOf(w)).toBe(text);                                      // the same city, the same string
    expect([decodeMapSquare('short'), decodeMapSquare(''), decodeMapSquare(null), decodeMapSquare('A'.repeat(1024))]).toEqual([null, null, null, null]);
  });
  it('names a road, a plot, a built-up house and another building by their own codes, and keeps the ground elsewhere', () => {
    const w = createWorld({ seed: 11, size: 64 });
    w.terrain.fill(TER.DESERT);
    w.road.fill(0);
    for (const k of Object.keys(w.buildings)) delete w.buildings[k];
    const at = (cx, cy) => (cy * MAP_SQUARE + cx);
    const tile = (cx, cy) => [cx * 2, cy * 2];                                // 64 wide: a cell is 2 x 2 tiles
    const put = (id, type, cx, cy, extra = {}) => { const [x, y] = tile(cx, cy); w.buildings[id] = { id, type, x, y, w: 1, d: 1, built: true, ...extra }; };
    put(1, 'house', 3, 3, { tier: 0 });
    put(2, 'house', 4, 3, { tier: 2 });
    put(3, 'well', 5, 3);
    const [rx, ry] = tile(6, 3); w.road[ry * 64 + rx] = 1;
    const [wx, wy] = tile(7, 3); w.terrain[wy * 64 + wx] = TER.WATER;
    const cells = mapSquareOf(w);
    expect([3, 4, 5, 6, 7, 8].map((cx) => cells[at(cx, 3)])).toEqual([MAP_CELL.plot, MAP_CELL.house, MAP_CELL.building, MAP_CELL.road, String(TER.WATER), String(TER.DESERT)]);
  });
  it('paints every cell with exactly the colour drawMapSquare gives the same tile (a 32-tile map: a cell is a tile)', () => {
    const n = 32, terrain = new Uint8Array(n * n), road = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) { terrain[i] = i % 8; road[i] = i % 11 === 0 ? 1 : 0; }
    const buildings = [{ type: 'house', tier: 0, x: 3, y: 4, w: 1, d: 1 }, { type: 'house', tier: 2, x: 4, y: 4, w: 1, d: 1 }, { type: 'well', x: 5, y: 4, w: 1, d: 1 }, { type: 'house', tier: 1, x: 22, y: 9, w: 1, d: 1 }];
    const world = { size: n, terrain, road, buildings: Object.fromEntries(buildings.map((b, k) => [k, b])) };
    const text = mapSquareOf(world);
    const a = recorder(), b = recorder();
    drawMapSquare(a.g, { size: n, terrain, road, buildings }, 0, 0, 320);
    expect(drawMapString(b.g, text, 0, 0, 320)).toBe(true);
    const want = paintOf(a.rects, 320), got = paintOf(b.rects, 320);
    expect(got.filter((c, i) => c !== want[i]).length).toBe(0);
    expect(new Set(got).size > 8).toBe(true);                                // the grounds, the road, a plot, a house and a building all show
  });
  it("encodes a new-land map's rock in the belt's colour, as drawMapSquare does with land on", () => {
    const n = 32, terrain = new Uint8Array(n * n).fill(TER.ROCKY), world = { size: n, terrain, road: new Uint8Array(n * n), buildings: {}, mapParams: { land: 99 } };
    expect(mapSquareOf(world)).toBe(MAP_CELL.belt.repeat(1024));
    expect(mapSquareColour(Number.parseInt(MAP_CELL.belt, 36))).toBe(TERRAIN.beltRock);
    expect(mapSquareOf({ ...world, mapParams: {} })).toBe(String(TER.ROCKY).repeat(1024));
  });
  it('gives a valid colour for every cell of a city of each map size', () => {
    for (const size of [48, 64, 80]) {
      const w = createWorld({ seed: 11, size });
      buildSampleCity(w);
      const r = recorder();
      expect(drawMapString(r.g, mapSquareOf(w), 0, 0, 320)).toBe(true);
      expect(r.rects.length).toBe(1024);
      expect(r.rects.every((x) => /^#[0-9A-Fa-f]{6}$/.test(x.colour))).toBe(true);
    }
  });
  it('is the empty string for what is not a world, and draws nothing for a string that is not a map square', () => {
    expect([mapSquareOf(null), mapSquareOf({}), mapSquareOf({ size: 0, terrain: [] })]).toEqual(['', '', '']);
    const r = recorder();
    expect(drawMapString(r.g, '', 0, 0, 32)).toBe(false);
    expect(r.rects.length).toBe(0);
    expect(allBuildings(createWorld({ seed: 2 })).length >= 0).toBe(true);
  });
});
