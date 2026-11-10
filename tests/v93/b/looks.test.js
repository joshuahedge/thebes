import { describe, it, expect } from '../../harness.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeBuilding } from '../../../src/sim/world.js';
import { ART, EXPANDED, SERVICE_STATES, slotFor } from '../../../src/render/art/registry.js';
import { SERVICE_LOOKS } from '../../../src/render/art/services.js';
import { INDUSTRY_LOOKS } from '../../../src/render/art/industry.js';
import { DEFENCE_LOOKS } from '../../../src/render/art/defence.js';
import { SUPPLY_LOOKS } from '../../../src/render/art/supply.js';
import { TRADE_LOOKS } from '../../../src/render/art/trade.js';
import { FERRY_LOOKS } from '../../../src/render/art/ferry.js';

const TABLES = { ...SERVICE_LOOKS, ...INDUSTRY_LOOKS, ...DEFENCE_LOOKS, ...SUPPLY_LOOKS, ...TRADE_LOOKS, ...FERRY_LOOKS };
const BASES = Object.keys(TABLES);
const M = 8, SCALE = 2;

// A slot drawn alone on a canvas that covers its bounds with a margin; returns the pixel data and the geometry.
function paint(key) {
  const def = ART[key];
  const [left, top, right, bottom] = def.bounds;
  const w = Math.ceil((right - left + 2 * M) * SCALE), h = Math.ceil((bottom - top + 2 * M) * SCALE);
  const ctx = makeCanvas(w, h).getContext('2d');
  ctx.translate((-left + M) * SCALE, (-top + M) * SCALE);
  def.draw(makeDraw(ctx, SCALE), 0, 0);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h, left, top, right, bottom };
}
const diff = (a, b) => {   // how many pixels differ in colour or cover between two paints of the same size
  let n = 0;
  const len = Math.min(a.data.length, b.data.length);
  for (let i = 0; i < len; i += 4) if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) + Math.abs(a.data[i + 3] - b.data[i + 3]) > 40) n++;
  return n;
};
const area = (a) => { let n = 0; for (let i = 3; i < a.data.length; i += 4) if (a.data[i] > 16) n++; return n; };
// The bounding box of the drawn pixels, in art px.
const inkBox = (a) => {
  let x0 = a.w, y0 = a.h, x1 = 0, y1 = 0;
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.data[(y * a.w + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [x0 / SCALE, y0 / SCALE, x1 / SCALE, y1 / SCALE];
};
const keys = (base, look, state) => `${base}.l${look}.${state}`;

describe('v93 b looks: every service and workshop in four looks and three states', () => {
  it('registers every base in every look and state, and marks it expanded with states', () => {
    expect(BASES.length >= 28).toBe(true);
    for (const base of BASES) {
      expect(EXPANDED.has(base)).toBe(true);
      expect(EXPANDED.get(base).states).toBe(true);
      for (let look = 0; look < 4; look++) for (const st of SERVICE_STATES) {
        const def = ART[keys(base, look, st)];
        expect([base, look, st, Boolean(def && def.draw)]).toEqual([base, look, st, true]);
      }
    }
  });

  it('keeps every drawing inside its bounds, in every look and state', () => {
    const failing = [];
    for (const base of BASES) for (let look = 0; look < 4; look++) for (const st of SERVICE_STATES) {
      const key = keys(base, look, st), a = paint(key);
      const ring = M * SCALE;
      let over = 0;
      for (let y = 0; y < a.h; y += 2) for (let x = 0; x < a.w; x += 2) {
        if (x >= ring && x < a.w - ring && y >= ring && y < a.h - ring) continue;
        if (a.data[(y * a.w + x) * 4 + 3] !== 0) over++;
      }
      if (over) failing.push(`${key}: ${over} samples outside`);
    }
    expect(failing).toEqual([]);
  });

  it('draws a shut building differently from a working one, at the door, in every look', () => {
    const same = [];
    for (const base of BASES) for (let look = 0; look < 4; look++) {
      const work = paint(keys(base, look, 'work')), shut = paint(keys(base, look, 'shut'));
      if (diff(work, shut) < 60) same.push(`${base}.l${look}`);
    }
    expect(same).toEqual([]);
  });

  it('draws a short building as a working one, but with less in the yard than a working one', () => {
    for (const base of ['potter.l1', 'brewery.l2', 'weaver.l0', 'jeweller.l3'].map((s) => s.split('.')[0])) {
      for (let look = 0; look < 4; look++) {
        const work = paint(keys(base, look, 'work')), short = paint(keys(base, look, 'short'));
        expect([base, look, diff(work, short) > 0]).toEqual([base, look, true]);
      }
    }
  });

  it('keeps the stalls of the bazaar and the awnings red, gold, blue and green in every look', () => {
    for (let look = 0; look < 4; look++) {
      const a = paint(keys('bazaar.s2', look, 'work'));
      const found = { red: 0, blue: 0, green: 0 };
      for (let i = 0; i < a.data.length; i += 4) {
        const r = a.data[i], g = a.data[i + 1], b = a.data[i + 2], al = a.data[i + 3];
        if (al < 200) continue;
        if (Math.abs(r - 0xC4) < 14 && Math.abs(g - 0x47) < 14 && Math.abs(b - 0x3A) < 14) found.red++;
        if (Math.abs(r - 0x2F) < 14 && Math.abs(g - 0x6F) < 14 && Math.abs(b - 0xA8) < 14) found.blue++;
        if (Math.abs(r - 0x5E) < 14 && Math.abs(g - 0x9E) < 14 && Math.abs(b - 0x4A) < 14) found.green++;
      }
      expect([look, found.red > 30, found.blue > 30, found.green > 30]).toEqual([look, true, true, true]);
    }
  });
});

describe('v93 b landmarks: the eight change shape at City and at Capital', () => {
  const LANDMARKS = ['granary.s3', 'bazaar.s2', 'temple', 'potter', 'brickworks.s3', 'weaver', 'well', 'firehouse'];
  it('gives the City and the Capital a different silhouette from the Town', () => {
    const same = [];
    for (const base of LANDMARKS) {
      const town = paint(keys(base, 1, 'work'));
      for (const look of [2, 3]) {
        const a = paint(keys(base, look, 'work'));
        const [t0, t1, t2, t3] = inkBox(town), [a0, a1, a2, a3] = inkBox(a);
        const boxDiffers = Math.abs(t0 - a0) + Math.abs(t1 - a1) + Math.abs(t2 - a2) + Math.abs(t3 - a3) >= 3;
        // or the outline: more than 1.5% of the Town's drawn area is covered in one and not in the other
        let cover = 0;
        const n = Math.min(town.data.length, a.data.length);
        for (let i = 3; i < n; i += 4) if ((town.data[i] > 16) !== (a.data[i] > 16)) cover++;
        if (!boxDiffers && cover < 0.015 * area(town)) same.push(`${base}.l${look}`);
      }
    }
    expect(same).toEqual([]);
  });
  it('keeps the fill stages of the granary, the storehouse and the bazaar working in every look', () => {
    for (let look = 0; look < 4; look++) {
      for (const [base, n] of [['granary', 4], ['storehouse', 4], ['bazaar', 3]]) {
        const imgs = [];
        for (let s = 0; s < n; s++) imgs.push(paint(keys(`${base}.s${s}`, look, 'work')));
        for (let s = 1; s < n; s++) expect([base, look, s, diff(imgs[s - 1], imgs[s]) > 8]).toEqual([base, look, s, true]);
      }
    }
  });
});

describe('v93 b slots: slotFor names the look and the state', () => {
  it('names a staffed bazaar by stage, look and state, and a supply building nobody needs as shut', () => {
    const w = makeTestWorld();
    const bz = makeBuilding(w, 'bazaar', 4, 4);
    bz.staff = 6; bz.store = {};
    expect(slotFor(bz, w)).toBe('bazaar.s0.l0.work');
    bz.staff = 2; expect(slotFor(bz, w)).toBe('bazaar.s0.l0.short');
    bz.paused = true; expect(slotFor(bz, w)).toBe('bazaar.s0.l0.shut');
    const q = makeBuilding(w, 'quarry', 9, 9);
    q.staff = 10; expect(slotFor(q, w)).toBe('quarry.l0.work');
    q.blocked = 'idle'; expect(slotFor(q, w)).toBe('quarry.l0.shut');
    const bw = makeBuilding(w, 'brickworks', 14, 14);
    bw.staff = 8; expect(slotFor(bw, w)).toBe('brickworks.s3.l0.work');
  });
  it('keeps the .idle keys of the supply buildings as aliases for a shut drawing', () => {
    for (const type of ['builders_guild', 'quarry', 'brickworks']) {
      expect(ART[`${type}.idle`] !== undefined).toBe(true);
      const shut = paint(type === 'brickworks' ? 'brickworks.s1.l1.shut' : `${type}.l1.shut`), idle = paint(`${type}.idle`);
      expect([type, diff(shut, idle)]).toEqual([type, 0]);
    }
  });
});
