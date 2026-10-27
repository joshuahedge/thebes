// Version 8.3, Track C (ruling 1438): the workers' camp's tents, render only. They stand along the site's own edge inside its footprint, take no tile, are drawn the
// same under Full, Gentle and Still, and go with the camp when the monument is finished.
import { describe, it, expect } from '../../harness.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { drawMonument, campTents } from '../../../src/render/monuments.js';
import { MONUMENT_KINDS, MONUMENTS } from '../../../src/data/monuments.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeCanvas, canvasHash } from '../../helpers/canvas.js';

function siteIn(w, type, x, y, extra = {}) {
  const b = insertBuilding(w, makeBuilding(w, type, x, y));
  Object.assign(b.site, { stock: { stone: 40, bricks: 20 }, ...extra });
  return b;
}
function hashOf(w, b, opts) {
  const c = makeCanvas(520, 400);
  const ctx = c.getContext('2d');
  ctx.translate(260, 150);
  drawMonument(makeDraw(ctx, 2, 2), w, b, opts);
  return canvasHash(c);
}

describe('v83 c the camp\'s tents', () => {
  it('lays 2 to 5 tents inside every kind\'s footprint, none off the footprint and none the same place twice, the same every call', () => {
    const w = makeTestWorld();
    for (const type of MONUMENT_KINDS) {
      const b = siteIn(w, type, 6, 6);
      const tents = campTents(b);
      expect(tents.length >= 2 && tents.length <= 5).toBe(true);
      for (const t of tents) {
        expect(t.x >= b.x && t.x + t.w <= b.x + b.w && t.y >= b.y && t.y + t.d <= b.y + b.d).toBe(true);
        expect(t.h > 0 && t.w > 0 && t.d > 0).toBe(true);
      }
      expect(new Set(tents.map((t) => `${t.x},${t.y}`)).size).toBe(tents.length);
      expect(JSON.stringify(campTents(b))).toBe(JSON.stringify(tents));
      expect(MONUMENTS[type].w).toBe(b.w);
    }
  });

  it('draws tents on a site with a camp and none without, and draws them the same under Full, Gentle and Still', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'pyramid_small', 2, 2, { course: 2 });
    const plain = hashOf(w, b, { now: 0, motion: 'still' });
    b.site.camp = true;
    const withCamp = { still: hashOf(w, b, { now: 0, motion: 'still' }), gentle: hashOf(w, b, { now: 0, motion: 'gentle' }), full: hashOf(w, b, { now: 0, motion: 'full' }) };
    expect(withCamp.still !== plain).toBe(true);
    expect(withCamp.gentle).toBe(withCamp.still);
    expect(withCamp.full).toBe(withCamp.still);
    expect(hashOf(w, b, { now: 99999, motion: 'gentle' })).toBe(withCamp.still);      // nothing in them moves with the clock
  });

  it('draws a finished monument without them, whatever a stale camp flag says', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'obelisk_small', 2, 2, { course: 3, done: 5 });
    const plain = hashOf(w, b, { now: 0, motion: 'still' });
    b.site.camp = true;
    expect(hashOf(w, b, { now: 0, motion: 'still' })).toBe(plain);
  });
});
