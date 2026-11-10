import { describe, it, expect } from '../../harness.js';
import { bakeChunk, chunkSignature } from '../../../src/render/terrainBaker.js';
import { pathFor } from '../../../src/render/yards.js';
import { TERRAIN, STONE } from '../../../src/render/art/palette.js';
import { MATERIALS } from '../../../src/render/art/materials.js';
import { makeTestWorld, setRoad } from '../../helpers/testWorld.js';
import { nearColour, pixelAt } from '../../helpers/canvas.js';
import { p } from '../../../src/render/iso.js';
import { CHUNK } from '../../../src/render/camera.js';
import { makeBuilding, insertBuilding, removeBuilding } from '../../../src/sim/world.js';

const put = (w, type, x, y) => { const b = makeBuilding(w, type, x, y); insertBuilding(w, b); return b; };
const bare = () => makeTestWorld({ size: 32, fertile: [] });
// The device pixel at a point in tiles (fractions allowed) of chunk (0, 0)'s bake.
const pixel = (w, tx, ty) => {
  const s = bakeChunk(w, 0, 0, 2), o = p(s.cx * CHUNK, s.cy * CHUNK), c = p(tx, ty);
  return pixelAt(s.canvas, s.ax + (c[0] - o[0]) * s.scale, s.ay + (c[1] - o[1]) * s.scale);
};
const WEST = [5.88, 6.6];   // just off a 1 x 1 home at (6, 6)'s west side, where its contact shadow does not fall

describe('v93 g yards: a trodden patch under every building, merged between neighbours', () => {
  it('placing a building changes the signature and draws its yard; removing it clears both', () => {
    const w = bare();
    const sig = chunkSignature(w, 0, 0);
    expect(nearColour(pixel(w, ...WEST), TERRAIN.sand, 30)).toBe(true);
    const b = put(w, 'house', 6, 6);
    expect(chunkSignature(w, 0, 0) === sig).toBe(false);
    expect(nearColour(pixel(w, ...WEST), MATERIALS[0].ground[0], 30)).toBe(true);          // the packed earth round it
    expect(nearColour(pixel(w, ...WEST), TERRAIN.sand, 12)).toBe(false);
    removeBuilding(w, b.id);
    expect(chunkSignature(w, 0, 0)).toBe(sig);
    expect(nearColour(pixel(w, ...WEST), TERRAIN.sand, 30)).toBe(true);
  });
  it('two neighbouring homes share one patch: no sand in the one-tile gap between them', () => {
    const w = bare();
    put(w, 'house', 6, 6); put(w, 'house', 8, 6);
    expect(nearColour(pixel(w, 7.5, 6.5), MATERIALS[0].ground[0], 30)).toBe(true);            // the gap's middle is yard
    const far = bare();
    put(far, 'house', 6, 6); put(far, 'house', 10, 6);
    expect(nearColour(pixel(far, 8.5, 6.5), TERRAIN.sand, 14)).toBe(true);                    // three tiles apart they do not merge
  });
  it('the yard is in the look\'s materials: packed earth, then paving under a City or a Capital home', () => {
    const w = bare();
    put(w, 'house', 6, 6);
    w.milestone = 'city';                                                                  // no recorded day: the whole city is already City
    expect(nearColour(pixel(w, ...WEST), MATERIALS[2].paving, 24)).toBe(true);
    w.milestone = 'capital';
    expect(nearColour(pixel(w, ...WEST), MATERIALS[3].paving, 24)).toBe(true);
    expect(MATERIALS[2].paving).toBe(STONE[1]);
  });
  it('a worn path runs to a road one or two tiles away, and to none that touches the footprint', () => {
    const w = bare();
    const b = put(w, 'house', 6, 6);
    setRoad(w, 2, 9, 12, 9);                                                               // two tiles south of the house (7 and 8 between)
    const path = pathFor(w, b);
    expect(path === null).toBe(false);
    expect(path.to).toEqual([6.5, 9.5]);
    const w2 = bare();
    const c = put(w2, 'house', 6, 6);
    setRoad(w2, 2, 7, 12, 7);                                                              // touching
    expect(pathFor(w2, c)).toBe(null);
  });
  it('a bake is the same every time (the yard noise hangs off the seed and the tile)', () => {
    const w = bare();
    put(w, 'house', 6, 6); put(w, 'granary', 9, 9);
    expect(pixel(w, ...WEST)).toEqual(pixel(w, ...WEST));
  });
});
