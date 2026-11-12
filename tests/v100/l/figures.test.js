// Version 10.0, Track L (L.1, ruling 2200): life's figures drawn: the child, goat, dog, builder and crocodile (Track 0's placeholders replaced), their
// poses, and the poses of the kinds that were (a woman grinding, a man sitting, a fisher casting, a woman kneeling). Each draws inside its bounds,
// stands on a foot shadow and is told apart from every other kind (tests/render/figuresArt.test.js walks FIGURE_KINDS for that).
import { describe, it, expect } from '../../harness.js';
import { FIGURE_KINDS, FIGURE_ART, fig, gang } from '../../../src/render/art/figures.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeCanvas, canvasHash } from '../../helpers/canvas.js';

export const LIFE_KINDS = ['child', 'goat', 'dog', 'builder', 'crocodile', 'child_sit', 'goat_lie', 'dog_lie', 'builder_climb', 'builder_hammer', 'crocodile_slide',
  'woman_grind', 'citizen_sit', 'fisher_cast', 'woman_kneel'];
const SCALE = 3, W = 60, H = 60, OX = 30, OY = 40;
function inkOf(draw) {
  const c = makeCanvas(W * SCALE, H * SCALE), ctx = c.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, OX * SCALE, OY * SCALE);
  draw(makeDraw(ctx, SCALE));
  return c;
}
function outside(c, [l, t, r, b]) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, out = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (d[(y * c.width + x) * 4 + 3] < 24) continue;
    n++;
    const ax = x / SCALE - OX, ay = y / SCALE - OY;
    if (ax < l - 1 || ax > r + 1 || ay < t - 1 || ay > b + 1) out++;
  }
  return { n, out };
}

describe('v100 l figures: life\'s kinds and poses are drawn', () => {
  it('registers every pose as a figure kind with the standard bounds and walk slots', () => {
    for (const k of LIFE_KINDS) {
      expect([k, FIGURE_KINDS.includes(k)]).toEqual([k, true]);
      expect(FIGURE_ART[`fig.${k}`].bounds).toEqual([-14, -30, 14, 6]);
      expect(Boolean(FIGURE_ART[`fig.${k}.m`])).toBe(true);
    }
  });
  it('draws each with ink, inside its bounds, each its own drawing (no placeholder left)', () => {
    const hashes = new Set();
    for (const k of LIFE_KINDS) {
      const c = inkOf((g) => fig(g, 0, 0, k)), r = outside(c, FIGURE_ART[`fig.${k}`].bounds);
      expect([k, r.n > 60, r.out]).toEqual([k, true, 0]);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(LIFE_KINDS.length);
    const citizen = canvasHash(inkOf((g) => fig(g, 0, 0, 'citizen')));
    expect(hashes.has(citizen)).toBe(false);
  });
  it('gives the gangs the builders\' poses: carrying, climbing (with his pole), sitting, in the builder\'s kilt', () => {
    const one = (pose, builder = false) => canvasHash(inkOf((g) => gang(g, [{ q: [0, 0], s: 1, pose, builder }])));
    const all = ['rest', 'pull', 'mallet', 'carry', 'climb', 'sit'].map((p) => one(p));
    expect(new Set(all).size).toBe(6);
    expect(one('rest', true) === one('rest')).toBe(false);
  });
});
