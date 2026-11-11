// Version 10.0 (Track 0, ruling 2101): the life figure kinds are registered (placeholder drawings; Track L draws them) and life has its own id ranges.
import { describe, it, expect } from '../../harness.js';
import { FIGURE_KINDS, FIGURE_ART, walkSlotFor } from '../../../src/render/art/figures.js';
import { LIFE_IDS } from '../../../src/render/v100/life.js';
import { WILDLIFE_ID_BASE } from '../../../src/render/wildlife.js';
import { CART_ID_BASE } from '../../../src/render/carts.js';

const LIFE_KINDS = ['child', 'goat', 'dog', 'builder', 'crocodile'];

describe('v100 w0 figures: the new kinds exist with bounds, a foot and walk slots', () => {
  it('registers child, goat, dog, builder and crocodile', () => {
    for (const k of LIFE_KINDS) {
      expect(FIGURE_KINDS.includes(k)).toBe(true);
      expect(FIGURE_ART[`fig.${k}`].bounds).toEqual([-14, -30, 14, 6]);
      // ruling 2101: walkSlotFor takes the renderer's object and the registry (the plan wrote walkSlotFor(kind, x, y))
      expect(typeof walkSlotFor({ slot: `fig.${k}`, x: 0, y: 0, dir: 0, stand: false }, FIGURE_ART)).toBe('string');
      expect(walkSlotFor({ slot: `fig.${k}`, x: 0, y: 0, dir: 0, stand: false }, FIGURE_ART)).toBe(`fig.${k}.w0`);
    }
  });
  // Ruling 2101: the plan's 1600000-1900000 fall inside wildlife's span (1400000 + below 600000: its lodge and wharf figures are 1700000 + 3 x
  // building id), so life takes the free band between wildlife and the carts (3000000), 200000 a range.
  it('gives life its own id ranges, apart from every other', () => {
    expect(LIFE_IDS).toEqual({ townsfolk: 2000000, river: 2200000, builders: 2400000, crowd: 2600000 });
    const starts = Object.values(LIFE_IDS);
    expect(Math.min(...starts)).toBeGreaterThanOrEqual(WILDLIFE_ID_BASE + 600000);
    expect(Math.max(...starts) + 200000).toBeLessThanOrEqual(CART_ID_BASE);
  });
});
