// Version 9.3, Track N (rulings 1920-1929): the rest of the art at the new bar. Every slot still exists with the same keys, each draws inside its bounds,
// every figure pose is still one cached pass, and every building drawing of N's files reaches the bar through the new primitives.
import { describe, it, expect } from '../../harness.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART } from '../../../src/render/art/registry.js';
import { FIGURE_KINDS, UNIT_KINDS, WALK_VARIANTS } from '../../../src/render/art/figures.js';

import { MONUMENT_KINDS } from '../../../src/data/monuments.js';

const SCALE = 2;

// Draws one registry entry at tile (0, 0) on a canvas with generous margins and counts the opaque pixels outside its bounds (art px from p(0, 0)).
function drawEntry(def) {
  const big = def.w > 3 || def.d > 3, W = big ? 520 : 260, H = big ? 420 : 260, OX = big ? 260 : 130, OY = big ? 330 : 170, SLACK = 1.5;
  const canvas = makeCanvas(W * SCALE, H * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, OX * SCALE, OY * SCALE);
  def.draw(makeDraw(ctx, SCALE), 0, 0);
  const d = ctx.getImageData(0, 0, W * SCALE, H * SCALE).data;
  const [l, t, r, b] = def.bounds;
  let n = 0, out = 0;
  for (let y = 0; y < H * SCALE; y++) for (let x = 0; x < W * SCALE; x++) {
    if (d[(y * W * SCALE + x) * 4 + 3] < 24) continue;
    n++;
    const ax = x / SCALE - OX, ay = y / SCALE - OY;
    if (ax < l - SLACK || ax > r + SLACK || ay < t - SLACK || ay > b + SLACK) out++;
  }
  return { n, out };
}

describe('v93 n slots: every slot still exists, under the same keys', () => {
  it('keeps the palace, nature, plaza, sphinx, rubble, boat and cart slots', () => {
    const keys = ['palace', 'palm', 'acacia', 'plaza', 'sphinx', 'rubble', 'rubble.v0', 'rubble.v1', 'rubble.v2', 'ferry_landing', 'fig.ferry_boat', 'fig.ferry_boat_l',
      'fig.trade_boat', 'fig.trade_boat_l', 'fig.trade_boat_moored', 'fig.boat', 'fig.gazelle', 'fig.croc', 'fig.cart_grain', 'archery_range', 'stables'];
    for (let s = 0; s < 5; s++) keys.push(`palace.s${s}`, `palace.s${s}.w`);
    for (let m = 0; m < 16; m++) keys.push(`plaza.e${m}`);
    for (let f = 0; f < 4; f++) keys.push(`sphinx.f${f}`);
    keys.push('palm.l1', 'palm.l-1', 'acacia.l1');
    const missing = keys.filter((k) => !ART[k]);
    expect(missing).toEqual([]);
  });
  it('keeps every figure kind with its walk poses and mirrors', () => {
    const missing = [];
    for (const kind of [...FIGURE_KINDS, ...UNIT_KINDS]) {
      if (!ART[`fig.${kind}`]) missing.push(`fig.${kind}`);
      for (const v of WALK_VARIANTS) if (!ART[`fig.${kind}${v}`]) missing.push(`fig.${kind}${v}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('v93 n bounds: each redrawn slot draws inside its bounds', () => {
  const slots = ['palace.s0', 'palace.s1', 'palace.s2', 'palace.s3', 'palace.s4', 'palace.s4.w', 'palm', 'acacia', 'plaza.e0', 'plaza.e5', 'sphinx.f1', 'sphinx.f0',
    'rubble.v0', 'rubble.v1', 'fig.ferry_boat', 'fig.trade_boat', 'fig.trade_boat_moored', 'fig.boat', 'fig.cart_grain', 'fig.citizen', 'fig.woman', 'fig.priest',
    'fig.noble', 'fig.hauler', 'fig.musician', 'fig.soldier', 'fig.raider', 'fig.citizen.w0', 'fig.citizen.w1m', 'fig.gazelle', 'fig.croc', 'archery_range', 'stables', 'nilometer', 'hunting_lodge'];
  for (const slot of slots) {
    it(`${slot} draws something, inside its bounds`, () => {
      const def = ART[slot];
      expect(!!def).toBe(true);
      const r = drawEntry(def);
      expect(r.n > 10).toBe(true);
      expect(r.out).toBe(0);
    });
  }
});

describe('v93 n monuments: each finished kind draws inside its bounds', () => {
  for (const kind of MONUMENT_KINDS) {
    it(`${kind} finished draws something, inside its bounds`, () => {
      const r = drawEntry(ART[kind]);
      expect(r.n > 50).toBe(true);
      expect(r.out).toBe(0);
    });
  }
});

describe('v93 n contract: the files draw through the new primitives', () => {
  const need = {
    'palace.js': ['shadeWall', 'contactLine', 'insetOpening', 'parapetSteps', 'cornice', 'gildedCap'],
    'monuments.js': ['shadeWall', 'contactLine', 'insetOpening'],
    'plaza.js': ['shadeWall', 'contactLine'],
    'armies.js': ['shadeWall', 'silhouette', 'contactLine', 'insetOpening', 'parapetSteps', 'footShadow'],   // Version 10.0 (Track Q): the raider chariot, elephant and boat raider too (tests/v100/q/footShadows.test.js reads each function)
    'river.js': ['shadeWall', 'contactLine', 'silhouette', 'footShadow', 'waterShadow', 'contactShadow'],
    'nature.js': ['contactShadow'],
    'figures.js': ['footShadow'],
    'carts.js': ['INK'],
  };
  for (const [file, names] of Object.entries(need)) {
    it(`${file} uses ${names.join(', ')}`, async () => {
      const text = await (await fetch(`/src/render/art/${file}`)).text();
      const lacking = names.filter((n) => !text.includes(`${n}(`) && !new RegExp(`import[^;]*\\b${n}\\b`).test(text));
      expect(lacking).toEqual([]);
      expect(text.includes('Version 9.3')).toBe(true);
    });
  }
  it('the boats, rubble, seasons and ferry carry the 9.3 mark', async () => {
    for (const file of ['trade.js', 'ferry.js', 'defence.js', 'seasons.js', 'carts.js']) {
      const text = await (await fetch(`/src/render/art/${file}`)).text();
      expect(text.includes('Version 9.3 (Track N')).toBe(true);
    }
  });
});
