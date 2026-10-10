import { describe, it, expect } from '../harness.js';
import { p, U, artToTile, tileDiamond, quad, dia, hs, depthKey, compareDepth, ART_SCALE, TILE_W } from '../../src/render/iso.js';

const close = (a, b) => Math.abs(a - b) < 1e-9;

describe('iso', () => {
  it('projects a tile corner to the mock-up grid', () => {
    expect(p(0, 0)).toEqual([0, 0]);
    expect(p(1, 0)).toEqual([16, 8]);
    expect(p(0, 1)).toEqual([-16, 8]);
    expect(p(3, 5)).toEqual([-32, 64]);
  });
  it('draws tiles 64 CSS px wide at zoom 1', () => {
    expect((p(1, 0)[0] - p(0, 1)[0]) * ART_SCALE).toBe(TILE_W);
  });
  it('round-trips art px back to fractional tiles', () => {
    for (const [x, y] of [[0, 0], [3, 5], [10.25, 2.5], [63, 63]]) {
      const q = p(x, y);
      const t = artToTile(q[0], q[1]);
      expect(close(t.x, x) && close(t.y, y)).toBe(true);
    }
  });
  it('raises points and builds diamonds', () => {
    expect(U([5, 9], 4)).toEqual([5, 5]);
    expect(tileDiamond(0, 0)).toEqual([[0, 0], [16, 8], [0, 16], [-16, 8]]);
    expect(quad(0, 0, 1, 1, 10)).toEqual([[0, -10], [16, -2], [0, 6], [-16, -2]]);
    expect(dia(1, 1, 1)).toEqual([p(1, 0), p(2, 1), p(1, 2), p(0, 1)]);
  });
  it('hashes deterministically into 0..1', () => {
    expect(hs(3, 4, 5)).toBe(hs(3, 4, 5));
    expect(hs(3, 4, 5) === hs(3, 4, 6)).toBe(false);
    for (let i = 0; i < 50; i++) {
      const v = hs(i, i * 7, 1);
      expect(v >= 0 && v < 1).toBe(true);
    }
  });
  it('orders by footprint centre, then id', () => {
    expect(depthKey(2, 2, 2, 2)).toBe(6);
    const a = { key: depthKey(2, 2, 1, 1), id: 1 };
    const b = { key: depthKey(3, 2, 1, 1), id: 2 };
    const c = { key: depthKey(2, 3, 1, 1), id: 3 };
    expect([c, b, a].sort(compareDepth).map((o) => o.id)).toEqual([1, 2, 3]);
  });
});
