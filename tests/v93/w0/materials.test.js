import { describe, it, expect } from '../../harness.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import * as PALETTE from '../../../src/render/art/palette.js';
import { MATERIALS, BAND2 } from '../../../src/render/art/materials.js';
import {
  tb, shadeWall, silhouette, contactLine, insetOpening, parapetSteps, awning, cornice, band, porch, gildedCap, p, U,
} from '../../../src/render/art/primitives.js';

const palette = new Set();
const collect = (v) => { if (typeof v === 'string') palette.add(v.toUpperCase()); else if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') Object.values(v).forEach(collect); };
collect(PALETTE);

describe('v93 w0 materials: four looks, all from the palette', () => {
  it('gives every look every key, and takes every colour from palette.js', () => {
    expect(MATERIALS.length).toBe(4);
    const keys = ['wall', 'roof', 'trim', 'band', 'cornice', 'ground', 'paving'];
    const stray = [];
    MATERIALS.forEach((m, look) => {
      for (const k of keys) {
        expect(m[k] !== undefined).toBe(true);
        const list = [];
        const walk = (v) => (Array.isArray(v) ? v.forEach(walk) : list.push(v));
        walk(m[k]);
        for (const c of list) if (!palette.has(String(c).toUpperCase())) stray.push(`look ${look} ${k}: ${c}`);
      }
      expect(m.wall.length).toBe(3);
      expect(m.roof.length).toBe(3);
      expect(m.cornice.length).toBe(3);
      expect(m.ground.length).toBe(2);
    });
    for (const c of BAND2) if (!palette.has(c.toUpperCase())) stray.push(`BAND2: ${c}`);
    expect(stray).toEqual([]);
  });
  it('makes the four walls read apart (no two looks share a lit face)', () => {
    expect(new Set(MATERIALS.map((m) => m.wall[1])).size).toBe(3);   // the Town and the City both whitewash; the City tells itself by its bands and roofs
    expect(new Set(MATERIALS.map((m) => m.roof[1])).size).toBe(3);
  });
});

describe('v93 w0 primitives: each draws, and stays in its bounds', () => {
  const SCALE = 2, W = 160, H = 140, OX = 80, OY = 100;
  const BOUNDS = [-26, -30, 26, 22];   // art px round the one-tile block at the origin
  const run = (fn) => {
    const canvas = makeCanvas(W * SCALE, H * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, OX * SCALE, OY * SCALE);   // makeDraw multiplies by SCALE itself
    fn(makeDraw(ctx, SCALE));
    const d = ctx.getImageData(0, 0, W * SCALE, H * SCALE).data;
    let n = 0, out = 0;
    for (let y = 0; y < H * SCALE; y++) for (let x = 0; x < W * SCALE; x++) {
      if (d[(y * W * SCALE + x) * 4 + 3] === 0) continue;
      n++;
      const ax = x / SCALE - OX, ay = y / SCALE - OY;   // art px from the origin
      if (ax < BOUNDS[0] || ax > BOUNDS[2] || ay < BOUNDS[1] || ay > BOUNDS[3]) out++;
    }
    return { n, out };
  };
  const block = (g) => tb(g, 0, 0, 1, 1, 12, 0, 0, ['#EFE6D9', '#EFE6D9', '#C9BCCD']);
  const face = (F, s0, s1) => [F(0, s0), F(1, s0), F(1, s1), F(0, s1)];
  const cases = {
    shadeWall: (g) => { const F = block(g); shadeWall(g, face(F.L, 0, 12), 12); },
    silhouette: (g) => silhouette(g, 0, 0, 1, 1, 12),
    contactLine: (g) => contactLine(g, [0, 0, 1, 1]),
    insetOpening: (g) => { const F = block(g); insetOpening(g, { F: F.L, u: 0.3, s: 0 }, 0.3, 6, { lintel: '#2E8C83' }); },
    parapetSteps: (g) => parapetSteps(g, { x: 0, y: 0, w: 1, d: 1, z: 12 }, 4),
    awning: (g) => { const F = block(g); awning(g, { F: F.L, u: 0.2, s: 8 }, 0.5, '#C4473A'); },
    cornice: (g) => cornice(g, { x: 0, y: 0, w: 1, d: 1, z: 12 }, ['#2E8C83', '#2E8C83', '#22685F']),
    band: (g) => { const F = block(g); band(g, F, 8, '#E2B13C', 1.2); },
    porch: (g) => porch(g, [-6, 10], 8, 7),
    gildedCap: (g) => gildedCap(g, U(p(0.5, 0.5), 12), 4),
  };
  for (const [name, fn] of Object.entries(cases)) {
    it(`${name} draws something inside its bounds`, () => {
      const r = run(fn);
      expect(r.n > 20).toBe(true);
      expect(r.out).toBe(0);
    });
  }
});
