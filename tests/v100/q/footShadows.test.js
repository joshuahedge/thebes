// Version 10.0, Track Q (ruling 2142, Task Q.3): every sprite the 9.3 pass left without a foot shadow now stands in one. The check reads each drawing function's own source (the file
// contract of tests/v93/n/art.test.js, one function at a time), because a file that calls footShadow once passes the file test whatever its other drawings do.
import { describe, it, expect } from '../../harness.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART } from '../../../src/render/art/registry.js';
import { waterShadow } from '../../../src/render/art/primitives.js';

// [file, function, the shadow calls it may make (one of them is required)]
const MUST = [
  ['armies.js', 'raiderChariot', ['footShadow']],
  ['armies.js', 'raiderElephant', ['footShadow']],
  ['armies.js', 'raiderBoat', ['footShadow']],
  ['river.js', 'ibis', ['footShadow']],
  ['river.js', 'heron', ['footShadow']],
  ['river.js', 'hippo', ['waterShadow']],
  ['river.js', 'boat', ['waterShadow']],
  ['river.js', 'fishingWharf', ['contactShadow', 'waterShadow']],
];

const bodyOf = (text, name) => {
  const at = text.indexOf(`export function ${name}(`);
  if (at < 0) return '';
  const end = text.indexOf('\n}\n', at);
  return text.slice(at, end < 0 ? undefined : end);
};

describe('v100 q foot shadows: the drawing functions', () => {
  for (const [file, fn, calls] of MUST) {
    it(`${fn} (${file}) calls ${calls.join(' or ')}`, async () => {
      const text = await (await fetch(`/src/render/art/${file}`)).text();
      const body = bodyOf(text, fn);
      expect(body.length > 0).toBe(true);
      expect(calls.some((c) => body.includes(`${c}(`))).toBe(true);
    });
  }
  it("the charred stump (render/fire.js, drawScorch) casts a contact shadow where it meets the ground", async () => {
    const text = await (await fetch('/src/render/fire.js')).text();
    const body = bodyOf(text, 'drawScorch');
    expect(body.includes('rub.cast') && body.includes('rub.base')).toBe(true);   // batched (the 9.2 test counts its ellipses at none): a cast polygon and a contact line a tile
  });
  it('waterShadow is a darker ellipse on the water at alpha 0.25', () => {
    const calls = [];
    waterShadow({ ell: (c, rx, ry, colour, o) => calls.push({ c, rx, ry, colour, o }) }, 10, 20, 8);
    expect(calls.length).toBe(1);
    expect(calls[0].o.alpha).toBe(0.25);
    expect(calls[0].rx).toBe(8);
  });
});

describe('v100 q foot shadows: a shadow shows under each', () => {
  const SCALE = 2;
  // Opaque pixels in the strip just under the foot (art px 0 to +2 below the origin, 12 px either side).
  const underFoot = (slot) => {
    const canvas = makeCanvas(260 * SCALE, 260 * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 130 * SCALE, 170 * SCALE);
    ART[slot].draw(makeDraw(ctx, SCALE), 0, 0);
    const d = ctx.getImageData(0, 0, 260 * SCALE, 260 * SCALE).data;
    let n = 0;
    for (let y = 170 * SCALE; y < 172 * SCALE; y++) for (let x = (130 - 12) * SCALE; x < (130 + 12) * SCALE; x++) if (d[(y * 260 * SCALE + x) * 4 + 3] > 12) n++;
    return n;
  };
  for (const slot of ['fig.raider_chariot', 'fig.raider_elephant', 'fig.raider_boat', 'fig.ibis', 'fig.heron', 'fig.hippo', 'fig.boat']) {
    it(`${slot} has shadow pixels at its foot`, () => {
      expect(underFoot(slot) > 4).toBe(true);
    });
  }
});
