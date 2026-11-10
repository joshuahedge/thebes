// Version 9.3, fix wave, group H (xh): the 2x2 homes' variants differ in massing and each has its own shadow blocks (review H1); a Capital street reads differently from a City one at play zoom
// and is paved only where it is built up (G1, known items 3 and 4).
import { describe, it, expect } from '../../harness.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { bakeChunk } from '../../../src/render/terrainBaker.js';
import { surfaceOf, CAPITAL_STONE } from '../../../src/render/terrainRoads.js';
import { STONE } from '../../../src/render/art/palette.js';
import { makeTestWorld, setRoad } from '../../helpers/testWorld.js';
import { chunkPixel } from '../../helpers/renderWorld.js';
import { nearColour } from '../../helpers/canvas.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';

const put = (w, type, x, y) => { const b = makeBuilding(w, type, x, y); insertBuilding(w, b); return b; };

describe('v93 x h: the big homes differ in massing and in shadow', () => {
  it('has a different shadow set for each variant of tiers 6 to 9, in every look', () => {
    for (const t of [6, 7, 8, 9]) for (let l = 0; l < 4; l++) {
      const sets = [0, 1, 2].map((v) => JSON.stringify(ART[`house.t${t}.v${v}.l${l}`].shadows));
      expect(new Set(sets).size).toBe(3);
    }
  });
  it('keeps every shadow block inside the 2x2 footprint', () => {
    for (const t of [6, 7, 8, 9]) for (let v = 0; v < 3; v++) {
      for (const [dx, dy, w, d, h] of ART[`house.t${t}.v${v}.l0`].shadows) {
        expect(dx >= 0 && dy >= 0 && dx + w <= 2.001 && dy + d <= 2.001 && h > 0).toBe(true);
      }
    }
  });
  it('gives the far drawing the plain shadow set, and the small tiers theirs unchanged', () => {
    expect(ART['house.t6.l0.far'].shadows.length).toBeGreaterThan(0);
    expect(ART['house.t3.v1.l0'].shadows).toEqual(ART['house.t3.v0.l0'].shadows);
    expect(typeof slotFor).toBe('function');
  });
});

describe('v93 x h: a Capital street', () => {
  const street = () => {
    const w = makeTestWorld({ size: 32, fertile: [] });
    setRoad(w, 2, 10, 28, 10);
    for (const x of [5, 8, 11, 14]) { put(w, 'house', x, 9); put(w, 'house', x, 11); }
    return w;
  };
  it('is paved only where it is built up, and kerbed elsewhere', () => {
    const w = street();
    expect(surfaceOf(w, 3, 8, 10)).toBe('paved');
    expect(surfaceOf(w, 3, 26, 10)).toBe('kerbed');
  });
  it('is warm sandstone where the City\'s is cool white', () => {
    const w = street();
    w.milestone = 'city';
    const city = chunkPixel(bakeChunk(w, 0, 0, 2), 9, 10);
    expect(nearColour(city, STONE[1], 20)).toBe(true);
    w.milestone = 'capital';
    const cap = chunkPixel(bakeChunk(w, 0, 0, 2), 9, 10);
    expect(nearColour(cap, STONE[1], 12)).toBe(false);
    expect(nearColour(cap, CAPITAL_STONE.top, 40) || nearColour(cap, CAPITAL_STONE.edge, 40) || nearColour(cap, '#F2D9A0', 60)).toBe(true);
  });
});
