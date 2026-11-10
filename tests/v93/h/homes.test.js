import { describe, it, expect } from '../../harness.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { homeDoor, HOME_TIERS } from '../../../src/render/art/housing.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { collectObjects } from '../../../src/render/renderer.js';
import { LOOKS } from '../../../src/render/looks.js';
import { MATERIALS } from '../../../src/render/art/materials.js';
import { makeCanvas, hexToRgb } from '../../helpers/canvas.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';

const M = 8, SCALE = 2;
const V = [0, 1, 2], L = [0, 1, 2, 3];
const key = (t, v, l) => `house.t${t}.v${v}.l${l}`;

// Draws a slot alone on a canvas with a margin round its bounds; returns { data, w, h, ring } for the ink tests.
function inkOf(slot) {
  const def = ART[slot], [left, top, right, bottom] = def.bounds;
  const w = Math.ceil((right - left + 2 * M) * SCALE), h = Math.ceil((bottom - top + 2 * M) * SCALE);
  const ctx = makeCanvas(w, h).getContext('2d');
  ctx.translate((-left + M) * SCALE, (-top + M) * SCALE);
  def.draw(makeDraw(ctx, SCALE), 0, 0);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h, ring: M * SCALE };
}

describe('v93 h homes: every tier, variant and look', () => {
  it('has every house.t{1..9}.v{0..2}.l{0..3} slot, and the lot stays one slot', () => {
    const missing = [];
    for (const t of HOME_TIERS) for (const v of V) for (const l of L) if (!ART[key(t, v, l)]) missing.push(key(t, v, l));
    expect(missing).toEqual([]);
    expect(Boolean(ART['house.lot'])).toBe(true);
    expect(Object.keys(ART).filter((k) => k.startsWith('house.lot')).length).toBe(1);
  });
  it('draws every one of them inside its bounds', () => {
    const failing = [];
    for (const t of HOME_TIERS) for (const v of V) for (const l of L) {
      const { data, w, h, ring } = inkOf(key(t, v, l));
      let out = 0;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
        if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
        if (data[(y * w + x) * 4 + 3] !== 0) out++;
      }
      if (out) failing.push(`${key(t, v, l)}: ${out} samples outside`);
    }
    expect(failing).toEqual([]);
  });
  it('never draws the Capital look shorter than the Village look at the same tier and variant', () => {
    const top = (slot) => { const { data, w, h } = inkOf(slot); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 8) return y; return h; };
    const shorter = [];
    for (const t of HOME_TIERS) for (const v of V) if (top(key(t, v, 3)) > top(key(t, v, 0)) + 1) shorter.push(`t${t} v${v}`);
    expect(shorter).toEqual([]);
  });
});

describe('v93 h homes: three variants that differ in shape', () => {
  const pixels = (slot) => { const { data, w, h } = inkOf(slot); return { data, w, h }; };
  it('differs by at least 3% of the drawn area between any two variants, in every tier and look, and keeps the lit face on the left', () => {
    const weak = [], flipped = [];
    for (const t of HOME_TIERS) for (const l of L) {
      const px = V.map((v) => pixels(key(t, v, l)));
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
        const A = px[a], B = px[b];
        let drawn = 0, differ = 0;
        for (let i = 0; i < A.data.length; i += 4) {
          const ia = A.data[i + 3] > 8, ib = B.data[i + 3] > 8;
          if (ia || ib) drawn++;
          if (ia !== ib || (ia && ib && (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2])) > 60)) differ++;
        }
        if (differ < 0.03 * drawn) weak.push(`t${t} l${l} v${a} v${b}: ${(100 * differ / drawn).toFixed(1)}%`);
      }
      V.forEach((v) => {   // the lit (+y) face is the left one: the material's lit wall colour sits mostly left of the footprint's middle, its shade mostly right
        const { data, w, h } = px[v], [lr, lg, lb] = hexToRgb(MATERIALS[l].wall[1]), [sr, sg, sb] = hexToRgb(MATERIALS[l].wall[2]);
        // the mean x of the lit wall's pixels is left of the mean x of the shaded wall's, as every block's lit face stands left of its shaded one (a mirrored drawing flips it)
        let ln = 0, lx = 0, sn = 0, sx = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (data[i + 3] < 250) continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (Math.abs(r - lr) + Math.abs(g - lg) + Math.abs(b - lb) < 50) { ln++; lx += x; }
            else if (Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb) < 50) { sn++; sx += x; }
          }
        }
        if (!(ln > 20 && sn > 20 && lx / ln < sx / sn)) flipped.push(`t${t} l${l} v${v}: lit ${ln} at ${(lx / ln).toFixed(0)}, shade ${sn} at ${(sx / sn).toFixed(0)}`);
      });
    }
    expect(weak).toEqual([]);
    expect(flipped).toEqual([]);
  });
  it('reports a main door for every tier and variant, on the lit face, the same whichever look is drawn', () => {
    for (const t of HOME_TIERS) for (const v of V) {
      const d = homeDoor(t, v);
      expect(Boolean(d)).toBe(true);
      expect(d.cx > 0 && d.cx < (t >= 6 ? 2 : 1)).toBe(true);
      expect(d.fy > 0.4 && d.fy < (t >= 6 ? 2 : 1)).toBe(true);
    }
  });
});

describe('v93 h homes: the far drawing', () => {
  const world = makeTestWorld({ size: 32 });
  const mk = (tier, x = 10, y = 10) => { const b = makeBuilding(world, 'house', x, y); b.tier = tier; return b; };
  it('has a far drawing for every tier and look', () => {
    for (const t of HOME_TIERS) for (const l of L) expect(typeof ART[`house.t${t}.l${l}.far`].draw).toBe('function');
    expect(LOOKS.length).toBe(4);
  });
  it('gives the far slot at far zoom and the variant slot otherwise', () => {
    const b = mk(3);
    expect(slotFor(b, world, { far: true })).toBe('house.t3.l0.far');
    expect(slotFor(b, world, { far: false }).includes('.far')).toBe(false);
    expect(slotFor(b, world).includes('.far')).toBe(false);
    expect(/^house\.t3\.v[012]\.l0$/.test(slotFor(b, world))).toBe(true);
  });
  it('collects far slots when the camera is at 0.6 or under, and near ones at 1', () => {
    const b = mk(7, 12, 12);
    insertBuilding(world, b);
    const range = { x0: 0, y0: 0, x1: 31, y1: 31 }, view = { width: 800, height: 600 };
    const homes = (zoom) => collectObjects(world, range, [], ART, { cam: { x: 12, y: 12, zoom }, view }).filter((o) => o.id === b.id).map((o) => o.slot);
    expect(homes(0.5)).toEqual(['house.t7.l0.far']);
    expect(homes(0.6)).toEqual(['house.t7.l0.far']);
    expect(homes(1).every((s) => !s.includes('.far'))).toBe(true);
    expect(homes(1).length).toBe(1);
  });
  it('draws no variant: the far drawing of a tier is the same whichever tile it stands on', () => {
    for (const t of [3, 7]) expect(slotFor(mk(t, 4, 5), world, { far: true })).toBe(slotFor(mk(t, 9, 2), world, { far: true }));
  });
});
