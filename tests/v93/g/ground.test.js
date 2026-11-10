import { describe, it, expect } from '../../harness.js';
import { bakeChunk, blobFor } from '../../../src/render/terrainBaker.js';
import { p } from '../../../src/render/iso.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { riverWorld } from '../../helpers/renderWorld.js';
import { canvasHash } from '../../helpers/canvas.js';

describe('v93 g ground: soft edges between grounds, all baked from the seed', () => {
  it('baking the same chunk twice gives the same pixels, and a different seed a different picture', () => {
    const w = riverWorld();
    const a = canvasHash(bakeChunk(w, 0, 0, 1).canvas), b = canvasHash(bakeChunk(w, 0, 0, 1).canvas);
    expect(a).toBe(b);
    const w2 = riverWorld(); w2.seed = w.seed + 77;
    expect(canvasHash(bakeChunk(w2, 0, 0, 1).canvas) === a).toBe(false);
  });
  it('on a straight edge, the curve leaves the ideal line by at least 1 art px within every tile, so it never runs along the tile diagonal', () => {
    const w = makeTestWorld({ size: 32, fertile: [] });
    for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) w.terrain[idx(32, x, y)] = T.MEADOW;   // a straight edge along x = 16
    const n = [8, 16];                                          // the edge x = 16 runs along (-16, 8) in art; this is its normal
    const len = Math.hypot(n[0], n[1]);
    for (let y = 6; y < 20; y++) {
      const pts = blobFor(w, 15, y, T.MEADOW, 1, 0);
      expect(pts.length).toBe(16);
      const east = [pts[4], pts[5], pts[6], pts[7], blobFor(w, 15, y + 1, T.MEADOW, 1, 0)[4]];   // the east side's four points and the next tile's first
      const dist = east.map((q, k) => { const ideal = p(16, y + (k === 4 ? 1 : k * 0.25)); return ((q[0] - ideal[0]) * n[0] + (q[1] - ideal[1]) * n[1]) / len; });
      const spread = Math.max(...dist) - Math.min(...dist);
      expect(spread).toBeGreaterThan(1);
    }
  });
});
