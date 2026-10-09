import { describe, it, expect } from '../harness.js';
import { idx, inBounds, footprint, ring, NEIGHBOURS4 } from '../../src/sim/grid.js';

describe('grid', () => {
  it('maps x,y to a row-major index', () => {
    expect(idx(64, 0, 0)).toBe(0);
    expect(idx(64, 3, 2)).toBe(131);
  });
  it('checks bounds', () => {
    expect(inBounds(64, 0, 0)).toBe(true);
    expect(inBounds(64, 63, 63)).toBe(true);
    expect(inBounds(64, -1, 0)).toBe(false);
    expect(inBounds(64, 0, 64)).toBe(false);
  });
  it('lists a footprint row by row', () => {
    expect(footprint(5, 6, 2, 2)).toEqual([[5, 6], [6, 6], [5, 7], [6, 7]]);
  });
  it('lists the tiles edge-adjacent to a footprint', () => {
    expect(ring(5, 5, 1, 1)).toEqual([[5, 4], [5, 6], [4, 5], [6, 5]]);
    expect(ring(5, 5, 2, 1).length).toBe(6);
  });
  it('exposes four neighbours', () => {
    expect(NEIGHBOURS4.length).toBe(4);
  });
});
