import { describe, it, expect } from '../../harness.js';
import { bakeChunk, chunkSignature } from '../../../src/render/terrainBaker.js';
import { drawStreetFurniture, surfaceOf } from '../../../src/render/terrainRoads.js';
import { TERRAIN, STONE } from '../../../src/render/art/palette.js';
import { REBUILD_DAYS } from '../../../src/render/looks.js';
import { makeTestWorld, setRoad } from '../../helpers/testWorld.js';
import { chunkPixel } from '../../helpers/renderWorld.js';
import { nearColour } from '../../helpers/canvas.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';

const put = (w, type, x, y) => { const b = makeBuilding(w, type, x, y); insertBuilding(w, b); return b; };
const street = () => {
  const w = makeTestWorld({ size: 32, fertile: [] });
  setRoad(w, 2, 10, 28, 10);
  for (const x of [5, 8, 11, 14]) { put(w, 'house', x, 9); put(w, 'house', x, 11); }   // a street with homes along both sides
  return w;
};
const counting = () => {
  const calls = {};
  const g = new Proxy({ ctx: null, scale: 1 }, { get: (t, k) => (k in t ? t[k] : (...a) => { calls[k] = (calls[k] || 0) + 1; }) });
  return { g, calls };
};
const range = { x0: 0, y0: 0, x1: 31, y1: 31 };

describe('v93 g streets: roads by look, trees and lamps from the City look', () => {
  it('a Village road is a dirt track and a Town road is gravel; paving needs the City look and buildings along it', () => {
    const w = street();
    expect(surfaceOf(w, 0, 8, 10)).toBe('dirt');
    expect(surfaceOf(w, 1, 8, 10)).toBe('gravel');
    expect(surfaceOf(w, 2, 8, 10)).toBe('paved');       // between homes
    expect(surfaceOf(w, 2, 26, 10)).toBe('kerbed');     // a City road with nothing along it keeps its kerb but not its paving
    expect(surfaceOf(w, 3, 26, 10)).toBe('paved');      // a Capital avenue is paved throughout
  });
  it('bakes a dirt road at the Village look and a paved one between homes at the City look', () => {
    const w = street();
    expect(nearColour(chunkPixel(bakeChunk(w, 0, 0, 2), 9, 10), TERRAIN.road, 30)).toBe(true);
    w.milestone = 'city';
    expect(nearColour(chunkPixel(bakeChunk(w, 0, 0, 2), 9, 10), STONE[1], 20)).toBe(true);
  });
  it('trees and lamps are drawn only at the City and Capital looks', () => {
    const w = street();
    for (const [milestone, trees] of [['village', false], ['town', false], ['city', true], ['capital', true]]) {
      w.milestone = milestone;
      const { g, calls } = counting();
      drawStreetFurniture(g, w, range);
      expect((calls.circ || 0) > 0).toBe(trees);
    }
  });
  it('the signature changes when the day crosses a road tile\'s front', () => {
    const w = street();
    put(w, 'house', 28, 11);
    w.milestone = 'town'; w.splits.town = w.day;
    const before = chunkSignature(w, 1, 0);              // the far end of the street, where the front arrives last
    w.day += REBUILD_DAYS;
    expect(chunkSignature(w, 1, 0) === before).toBe(false);
  });
});
