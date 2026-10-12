import { describe, it, expect } from '../harness.js';
import { problemMarkers, drawProblemMarkers, roadlessPlots, roadlessPlotBadges } from '../../src/render/overlays.js';
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
      { id: bazaar.id, x: 10, y: 12, lift: liftOf(bazaar, 'bazaar'), kind: 'problem', cause: 'bazaar_empty' },
      { id: shack.id, x: 12.5, y: 9.5, lift: liftOf(shack, 'house.t2'), kind: 'down', cause: 'down' },
    ]);
    const noisy = [...alerts, { code: 'no_road', id: shack.id }, { code: 'no_road', id: 999 }, { code: 'debt' }, { code: 'plots_no_road', count: 2, ids: [shack.id] }];
    expect(problemMarkers(w, noisy, null)).toEqual(marks);                            // one per building; homes, missing ids, city-wide and many-plot alerts add nothing
    expect(problemMarkers(w, alerts, { x0: 0, y0: 0, x1: 8, y1: 31 })).toEqual([]);   // off screen
    expect(problemMarkers(w, alerts, { x0: 9, y0: 11, x1: 10, y1: 12 }).map((m) => m.kind)).toEqual(['problem']);
  });
  it('names the cause: the road beats any other alert on the same building', () => {
    const { w, bazaar } = town();
    const both = [{ code: 'bazaar_empty', id: bazaar.id }, { code: 'no_road', id: bazaar.id }];
    expect(problemMarkers(w, both, null).map((m) => [m.id, m.cause])).toEqual([[bazaar.id, 'no_road'], [4, 'down']]);
    expect(problemMarkers(w, [...both].reverse(), null)[0].cause).toBe('no_road');       // whatever order the alerts come in
    expect(problemMarkers(w, [{ code: 'fire_risk', id: bazaar.id }], null)[0].cause).toBe('fire_risk');
  });
  it('lists the homes and plots in view that have no road beside them', () => {
    const { w } = town();
    const lone = addRaw(w, 'house', 20, 20);                                          // far from the road on row 10
    const edge = addRaw(w, 'house', 5, 11);                                           // beside it
    expect(roadlessPlots(w, null)).toEqual([{ id: lone.id, x: 20, y: 20 }]);
    expect(edge.id).toBeGreaterThan(0);
    expect(roadlessPlots(w, { x0: 0, y0: 0, x1: 10, y1: 12 })).toEqual([]);           // off screen
    expect(roadlessPlots(w, { x0: 18, y0: 18, x1: 22, y1: 22 }).map((t) => t.id)).toEqual([lone.id]);
  });
  it('puts one road badge over each group of plots with no road, over the plot nearest its middle (final review 7)', () => {
    const { w } = town();
    const block = [];
    for (let y = 20; y < 22; y++) for (let x = 20; x < 23; x++) block.push(addRaw(w, 'house', x, y));   // a 3x2 block of plots
    const lone = addRaw(w, 'house', 27, 27);
    const corner = addRaw(w, 'house', 23, 22);                                        // touches the block only at a corner: a group of its own
    const badges = roadlessPlotBadges(w, null);
    expect(badges.map((b) => [b.id, b.ids.length, b.x, b.y])).toEqual([[block[1].id, 6, 21.5, 20.5], [lone.id, 1, 27.5, 27.5], [corner.id, 1, 23.5, 22.5]]);
    expect(badges[0].ids).toEqual(block.map((b) => b.id));
    expect(roadlessPlotBadges(w, { x0: 0, y0: 0, x1: 12, y1: 12 })).toEqual([]);     // off screen
    setRoad(w, 26, 27, 26, 27);                                                       // a road reaches the lone plot
    expect(roadlessPlotBadges(w, null).map((b) => b.id)).toEqual([block[1].id, corner.id]);
    setRoad(w, 20, 19, 22, 19);                                                       // and roads along both long sides of the block
    setRoad(w, 20, 22, 22, 22);
    expect(roadlessPlotBadges(w, null).map((b) => b.id)).toEqual([]);                 // the corner plot touches it too
  });
  it('draws the badge of a plot group as a coral disc with the road mark, 20 CSS px across when zoomed out', () => {
    const { w } = town();
    addRaw(w, 'house', 20, 20);
    const [b] = roadlessPlotBadges(w, null);
    const c = makeCanvas(200, 200);
    const ctx = c.getContext('2d');
    const q = p(b.x, b.y);
    ctx.translate(100 - 2 * q[0], 170 - 2 * q[1]);
    drawProblemMarkers(makeDraw(ctx, 2, 1), w, [], null);
    const cy = 170 - 2 * (b.lift + 5);
    expect(nearColour(pixelAt(c, 100 + 17, cy), UI.problem, 30)).toBe(true);           // 10 CSS px from the centre: inside the disc
    expect(nearColour(pixelAt(c, 100 + 24, cy), UI.problem, 30)).toBe(false);
    expect(nearColour(pixelAt(c, 100, cy - 6), UI.halo, 30)).toBe(true);               // the road mark's two bars
    expect(nearColour(pixelAt(c, 100, cy + 6), UI.halo, 30)).toBe(true);
    expect(nearColour(pixelAt(c, 100, cy), UI.problem, 30)).toBe(true);
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
  it('keeps the badge 20 CSS px across when the map is zoomed out, and draws the road mark for a missing road', () => {
    const { w, bazaar } = town();
    const alerts = [{ code: 'no_road', id: bazaar.id }];
    // 2 device px per art px but 1 CSS px per art px: a phone's pixel ratio of 2 with the map at half size.
    const c = makeCanvas(200, 200);
    const ctx = c.getContext('2d');
    const q = p(bazaar.x + bazaar.w / 2, bazaar.y + bazaar.d / 2);
    ctx.translate(100 - 2 * q[0], 170 - 2 * q[1]);
    drawProblemMarkers(makeDraw(ctx, 2, 1), w, alerts, null);
    const m = problemMarkers(w, alerts, null)[0];
    const cy = 170 - 2 * (m.lift + 5);                                                 // the badge rides up by what it grew (10 art px, not 5)
    expect(nearColour(pixelAt(c, 100 + 17, cy), UI.problem, 30)).toBe(true);           // 20 device px = 10 CSS px from the centre: inside the disc
    expect(nearColour(pixelAt(c, 100 + 24, cy), UI.problem, 30)).toBe(false);          // and not far past it
    expect(nearColour(pixelAt(c, 100, cy - 6), UI.halo, 30)).toBe(true);               // the road mark's two bars,
    expect(nearColour(pixelAt(c, 100, cy + 6), UI.halo, 30)).toBe(true);
    expect(nearColour(pixelAt(c, 100, cy), UI.problem, 30)).toBe(true);                // with coral between them
  });
  it('outlines a plot with no road in dashed amber, and leaves a plot beside the road plain', () => {
    const { w } = town();
    const lone = addRaw(w, 'house', 20, 20), fed = addRaw(w, 'house', 5, 11);
    const c = makeCanvas(600, 800);
    const ctx = c.getContext('2d');
    ctx.translate(300, 20);
    drawProblemMarkers(makeDraw(ctx, 2), w, [], { x0: 0, y0: 0, x1: 31, y1: 31 });
    const centre = (b) => { const q = p(b.x + 0.5, b.y + 0.5); return [300 + 2 * q[0], 20 + 2 * q[1]]; };
    const at = (b) => pixelAt(c, ...centre(b));
    expect(at(lone)[3]).toBeGreaterThan(0);                                            // a faint amber wash on the tile
    expect(at(fed)[3]).toBe(0);
    const [lx, ly] = centre(lone);
    expect(near(c, lx, ly, UI.warn, 18)).toBeGreaterThan(0);                           // and the dashes round it
  });
  it('draws the markers in the game frame from the live alerts', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.frame(0);
      const m = problemMarkers(r.world, r.ui.alerts.list(), null).find((x) => x.kind === 'problem');
      expect(r.world.buildings[m.id].type).toBe('bazaar');                             // uiWorld's bazaar has nothing to sell
      const pin = r.ui.markers().find((x) => x.ids.includes(m.id));                      // Stage 4: pinned on a stem (rulings 280-281)
      expect(near(r.canvas, pin.x, pin.y, UI.problem)).toBeGreaterThan(20);
    } finally { r.cleanup(); }
  });
});
