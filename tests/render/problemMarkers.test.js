import { describe, it, expect } from '../harness.js';
import { problemMarkers, drawProblemMarkers } from '../../src/render/overlays.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { ART } from '../../src/render/art/registry.js';
import { UI } from '../../src/render/art/palette.js';
import { p } from '../../src/render/iso.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { artToScreen } from '../../src/render/camera.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, nearColour } from '../helpers/canvas.js';
import { rigUI } from '../helpers/uiWorld.js';

function town() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const bazaar = addRaw(w, 'bazaar', 9, 11);                                          // staffed, nothing to sell: bazaar_empty
  addRaw(w, 'granary', 6, 11, { store: { grain: 100 } });
  addRaw(w, 'well', 15, 11);
  const shack = addRaw(w, 'house', 12, 9, { tier: 2, residents: 6, downTimer: 1 });   // counting down to lose a tier
  addRaw(w, 'house', 13, 9, { tier: 1, residents: 4, downTimer: 1 });                // a hut has no tier to lose
  addRaw(w, 'house', 14, 9, { tier: 3, residents: 10 });                             // healthy
  staffAll(w);
  return { w, bazaar, shack };
}

const liftOf = (b, slot) => ART[slot].height + 4 * (b.w + b.d) + 6;

// Pixels within r of (cx, cy) that are near a colour.
function near(c, cx, cy, hex, r = 10) {
  let n = 0;
  for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) {
    for (let y = Math.round(cy - r); y <= Math.round(cy + r); y++) if (nearColour(pixelAt(c, x, y), hex, 30)) n++;
  }
  return n;
}

describe('render problem markers', () => {
  it('lists one marker per building with a problem, and a down arrow for a home losing a tier', () => {
    const { w, bazaar, shack } = town();
    const alerts = alertsFor(w);
    expect(alerts.map((a) => a.code)).toEqual(['bazaar_empty']);
    const marks = problemMarkers(w, alerts, null);
    expect(marks).toEqual([
      { id: bazaar.id, x: 10, y: 12, lift: liftOf(bazaar, 'bazaar'), kind: 'problem' },
      { id: shack.id, x: 12.5, y: 9.5, lift: liftOf(shack, 'house.t2'), kind: 'down' },
    ]);
    const noisy = [...alerts, { code: 'no_road', id: bazaar.id }, { code: 'no_road', id: shack.id }, { code: 'no_road', id: 999 }, { code: 'debt' }];
    expect(problemMarkers(w, noisy, null)).toEqual(marks);                            // one per building; homes, missing ids and city-wide alerts add nothing
    expect(problemMarkers(w, alerts, { x0: 0, y0: 0, x1: 8, y1: 31 })).toEqual([]);   // off screen
    expect(problemMarkers(w, alerts, { x0: 9, y0: 11, x1: 10, y1: 12 }).map((m) => m.kind)).toEqual(['problem']);
  });
  it('marks nothing in a healthy town', () => {
    const { w, bazaar, shack } = town();
    bazaar.store.grain = 50;
    shack.downTimer = 0;
    expect(problemMarkers(w, alertsFor(w), null)).toEqual([]);
  });
  it('draws a coral ! badge and an amber down-arrow badge just above the buildings', () => {
    const { w, bazaar, shack } = town();
    const alerts = alertsFor(w);
    for (const [b, disc, glyph] of [[bazaar, UI.problem, UI.halo], [shack, UI.warn, UI.label]]) {
      const c = makeCanvas(200, 200);
      const ctx = c.getContext('2d');
      const q = p(b.x + b.w / 2, b.y + b.d / 2);
      ctx.translate(100 - 2 * q[0], 170 - 2 * q[1]);                                  // the building's centre at (100, 170), 2 device px per art px
      drawProblemMarkers(makeDraw(ctx, 2), w, alerts, null);
      const m = problemMarkers(w, alerts, null).find((x) => x.id === b.id);
      const cy = 170 - 2 * m.lift;
      expect([b.type, near(c, 100, cy, disc) > 20]).toEqual([b.type, true]);
      expect([b.type, near(c, 100, cy, glyph, 5) > 0]).toEqual([b.type, true]);       // the glyph inside the disc
    }
  });
  it('draws the markers in the game frame from the live alerts', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.frame(0);
      const m = problemMarkers(r.world, r.ui.alerts.list(), null).find((x) => x.kind === 'problem');
      expect(r.world.buildings[m.id].type).toBe('bazaar');                             // uiWorld's bazaar has nothing to sell
      const q = p(m.x, m.y);
      const [sx, sy] = artToScreen(r.cam, { width: 390, height: 844 }, q[0], q[1] - m.lift);
      expect(near(r.canvas, sx, sy, UI.problem)).toBeGreaterThan(20);
    } finally { r.cleanup(); }
  });
});
