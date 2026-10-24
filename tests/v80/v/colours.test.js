// Version 8.0, Track V (ruling 1135, design rule 5): colours mean one thing. Reach and range are blue or teal ("covered"); amber is "works, but something is missing" (or costs something);
// coral and red are only "cannot". The friend read a granary's coral hatching as "should not be there": it was the homes the granary would make less pleasant, which the game allows. So that
// hatching, the desirability overlay's below-zero ground and the confirm bar's "less pleasant" line are amber now; fire risk is a burnt amber rather than the ember red it was; what a service
// reaches is washed in teal whichever service it is; and the ghost's refusals (taken, water, off the map) stay coral.
import { describe, it, expect } from '../../harness.js';
import { drawOverlay, drawDesirabilityTint, drawGhost, FIRE_HUE, OVERLAY_HUE, COVER_HUE, desirabilityBands } from '../../../src/render/overlays.js';
import { p } from '../../../src/render/iso.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { UI } from '../../../src/render/art/palette.js';
import { TOKENS } from '../../../src/ui/theme.js';
import { makeCanvas, pixelAt, hexToRgb } from '../../helpers/canvas.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';

function scene(tx = 0, ty = 0) {
  const c = makeCanvas(240, 200), ctx = c.getContext('2d'), [ax, ay] = p(tx, ty);
  ctx.translate(120 - 2 * ax, 60 - 2 * ay);
  return { c, g: makeDraw(ctx, 2), at: (x, y) => { const q = p(x, y); return [120 + 2 * (q[0] - ax), 60 + 2 * (q[1] - ay)]; } };
}
// How many sampled pixels in the box are near the colour (alpha counted: only inked pixels are asked about).
function near(c, hex, within, box = [40, 20, 200, 130], minAlpha = 120) {
  const want = hexToRgb(hex);
  let n = 0;
  for (let x = box[0]; x < box[2]; x += 1) for (let y = box[1]; y < box[3]; y += 1) {
    const px = pixelAt(c, x, y);
    if (px[3] > minAlpha && Math.abs(px[0] - want[0]) <= within && Math.abs(px[1] - want[1]) <= within && Math.abs(px[2] - want[2]) <= within) n++;
  }
  return n;
}
const hueOf = (hex) => { const [r, g, b] = hexToRgb(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
const REGION = { x0: 0, y0: 0, x1: 31, y1: 31 };

describe('v80 v colours mean one thing', () => {
  it('hatches the homes a ghost would make less pleasant in amber, not coral, and washes the ones it makes nicer in teal', () => {
    const s = scene(3, 0);
    drawDesirabilityTint(s.g, [{ x: 3, y: 0, v: -4 }, { x: 4, y: 0, v: -4 }, { x: 5, y: 0, v: -4 }, { x: 3, y: 1, v: -4 }]);
    expect(near(s.c, UI.warn, 30)).toBeGreaterThan(20);
    expect(near(s.c, UI.bad, 30)).toBe(0);
    const t = scene(0, 0);
    drawDesirabilityTint(t.g, [{ x: 0, y: 0, v: 3 }]);
    expect(near(t.c, UI.nicer, 40, [40, 20, 200, 130], 20)).toBeGreaterThan(20);        // a wash is faint: any inked pixel counts
  });

  it('keeps the ghost\'s refusals coral: a footprint that cannot be placed is hatched coral and carries no amber', () => {
    const bad = scene();
    drawGhost(bad.g, { x: 0, y: 0, w: 2, d: 2, state: 'bad' });
    expect(near(bad.c, UI.bad, 40, [60, 60, 180, 124])).toBeGreaterThan(20);
    expect(near(bad.c, UI.warn, 30, [60, 60, 180, 124])).toBe(0);
  });

  it('draws the desirability overlay\'s below-zero ground in amber and its legend swatch the same', async () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    // Below-zero ground exists beside a bad neighbour; the test places one (a granary's smell is the sim's own) and reads the bands it makes.
    addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    addRaw(w, 'granary', 13, 12);
    const { below } = desirabilityBands(w, REGION);
    expect(below.length).toBeGreaterThan(0);
    const s = scene(below[0][0], below[0][1]);
    drawOverlay(s.g, w, 'desirability', REGION);
    expect(near(s.c, UI.warn, 30, [0, 0, 240, 200])).toBeGreaterThan(0);
    expect(near(s.c, UI.bad, 30, [0, 0, 240, 200])).toBe(0);
    // The legend's swatch hatches with the same amber (its source and the map's draw name the one colour).
    const source = await (await fetch(new URL('../../../src/ui/overlayUi.js', import.meta.url))).text();
    expect([source.includes('${UI.warn} 0 1.5px'), source.includes('${UI.bad} 0 1.5px')]).toEqual([true, false]);
  });

  it('draws fire risk in an amber hue, not red, and no overlay in the table is the coral or red of "cannot"', () => {
    const hue = hueOf(FIRE_HUE);
    expect(hue >= 25 && hue <= 50).toBe(true);                                       // amber to burnt orange
    for (const [name, hex] of Object.entries(OVERLAY_HUE)) {
      const h = hueOf(hex);
      expect([name, h >= 350 || h <= 12]).toEqual([name, false]);                    // none sits in the red
    }
    expect(hueOf(TOKENS.coral) <= 12 || hueOf(TOKENS.coral) >= 350).toBe(true);       // and the coral still does: that hue is kept for "cannot"
  });

  it('washes what a service reaches in teal (the water\'s in its own blue), whichever service it is', () => {
    expect(COVER_HUE).toEqual({ water: UI.water, other: UI.housing });
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'bazaar', 10, 11);
    staffAll(w);
    const s = scene(10, 11);
    drawOverlay(s.g, w, 'food', REGION);
    expect(near(s.c, UI.food, 40, [0, 0, 240, 200], 20)).toBe(0);                      // no gold wash (it read as amber)
    expect(near(s.c, UI.housing, 40, [0, 0, 240, 200], 20)).toBeGreaterThan(20);       // the teal one
  });

  it('keeps coral for refusals in the interface: the advice dot, a falling trend and a switch that is off are not coral any more', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const host = r.root.querySelector('#ui');
      const coral = ['rgb(163, 54, 36)', 'rgb(226, 96, 76)'];
      const dot = document.createElement('span'); dot.className = 'advice-dot';
      const btn = document.createElement('button'); btn.className = 'advice'; btn.append(dot);
      r.root.querySelector('#topbar').append(btn);
      expect(coral.includes(getComputedStyle(dot).backgroundColor)).toBe(false);
      btn.remove();
      const trends = document.createElement('div'); trends.className = 'trends';
      const down = document.createElement('span'); down.className = 'trend down'; trends.append(down);
      host.append(trends);
      expect(coral.includes(getComputedStyle(down).color)).toBe(false);
      trends.remove();
      // The confirm bar's "less pleasant" line: its class still says coral (the bar's own markup), its colour is amber.
      r.ui.placement.start({ kind: 'building', type: 'well' });
      const bar = r.root.querySelector('#confirm .confirm');
      const line = document.createElement('div'); line.className = 'nicer small coral'; bar.append(line);
      expect(getComputedStyle(line).color).toBe('rgb(122, 82, 0)');
      line.remove();
      r.ui.placement.cancel();
    } finally { r.cleanup(); }
  });
});
