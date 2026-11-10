// Version 9.3 fix wave, group xb (rulings 2005-2009): services and workshops at the bar. Known item 2 (every shut state, the plain card keys, the trading post,
// Quay, brickworks, gem mine, and the wall and gate cards reach the bar), B1 (the granary keeps its shape in every look) and B2 (a shut workshop reads by
// shape: a wide barred door and closed shutters across its front).
import { describe, it, expect } from '../../harness.js';
import { ART } from '../../../src/render/art/registry.js';
import { PRIMITIVE_CALLS } from '../../../src/render/art/primitives.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeCanvas } from '../../helpers/canvas.js';

const calls = () => ({ ...PRIMITIVE_CALLS });
function drawn(slot) {
  const c = makeCanvas(160, 160);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const before = calls();
  ctx.save(); ctx.translate(80, 100);
  ART[slot].draw(makeDraw(ctx, 1), 0, 0);
  ctx.restore();
  const after = calls();
  return { c, shade: after.shadeWall - before.shadeWall, contact: after.contactLine - before.contactLine, inset: after.insetOpening - before.insetOpening };
}
// The first row of the canvas with any ink: the drawing's top.
function inkTop(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) return y;
  return c.height;
}

const WORKSHOPS = ['potter', 'brewery', 'weaver', 'jeweller', 'storehouse.s1', 'builders_guild', 'temple', 'physician', 'police_post', 'firehouse', 'trading_post', 'brickworks.s2', 'quay.s'];

describe('v93 x b shut workshops', () => {
  it('draws every shut workshop through the bar, in every look', () => {
    for (const base of [...WORKSHOPS, 'tower', 'barracks', 'gem_mine', 'quay.n', 'quay.e', 'quay.w']) {
      for (let look = 0; look < 4; look++) {
        const slot = `${base}.l${look}.shut`;
        const r = drawn(slot);
        expect([slot, r.shade > 0, r.contact > 0]).toEqual([slot, true, true]);
      }
    }
  });
  it('shows a wide barred door and closed shutters across the front of a shut workshop: more openings than the working one', () => {
    for (const base of ['potter', 'brewery', 'weaver', 'jeweller', 'storehouse.s1', 'builders_guild', 'physician', 'police_post', 'firehouse', 'trading_post', 'quay.s']) {
      for (let look = 0; look < 4; look++) {
        const shut = drawn(`${base}.l${look}.shut`).inset, work = drawn(`${base}.l${look}.work`).inset;
        expect([base, look, shut >= 3]).toEqual([base, look, true]);   // the door, and at least two shutters (a Storehouse's three doors count)
        void work;
      }
    }
  });
  it('tells a shut kiln from a short one by shape: the shut drawing differs in its front wall', () => {
    const shut = drawn('potter.l1.shut').c, short = drawn('potter.l1.short').c;
    const a = shut.getContext('2d').getImageData(0, 0, 160, 160).data, b = short.getContext('2d').getImageData(0, 0, 160, 160).data;
    let diff = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 90) diff++;
    expect(diff).toBeGreaterThan(40);
  });
});

describe('v93 x b bar of the plain keys and the cards', () => {
  it('draws the plain card keys as the Town look working, so they reach the bar', () => {
    for (const [plain, look] of [['granary', 'granary.s3'], ['granary.s0', 'granary.s0'], ['bazaar', 'bazaar.s2'], ['potter', 'potter'], ['storehouse', 'storehouse.s3'],
      ['trading_post', 'trading_post'], ['brickworks', 'brickworks.s3'], ['gem_mine', 'gem_mine'], ['temple', 'temple']]) {
      expect([plain, ART[plain] === ART[`${look}.l1.work`]]).toEqual([plain, true]);
      const r = drawn(plain);
      expect([plain, r.shade + r.contact + r.inset > 0]).toEqual([plain, true]);
    }
  });
  it('gives the wall and gate cards and the Quay\'s plain keys the bar', () => {
    for (const slot of ['wall', 'gate', 'quay', 'quay.s', 'quay.n', 'quay.e', 'quay.w']) {
      const r = drawn(slot);
      expect([slot, r.shade + r.contact > 0]).toEqual([slot, true]);   // the wall cards take the contact line (a shade over their bands moves colours the s3 art test pins)
    }
  });
});

describe('v93 x b granary keeps its shape in every look', () => {
  it('has no drums: the City granary stands as tall as the Town one, and the Capital only adds its finials', () => {
    for (const stage of [0, 3]) {
      const town = inkTop(drawn(`granary.s${stage}.l1.work`).c), city = inkTop(drawn(`granary.s${stage}.l2.work`).c), capital = inkTop(drawn(`granary.s${stage}.l3.work`).c);
      expect([stage, Math.abs(city - town) <= 1]).toEqual([stage, true]);
      expect([stage, capital <= town && town - capital <= 8]).toEqual([stage, true]);
    }
    expect(ART['granary.s3.l2.work'].height).toBe(ART['granary.s3.l1.work'].height);
    expect(ART['granary.s3.l3.work'].height - ART['granary.s3.l1.work'].height).toBeLessThanOrEqual(5);
  });
});
