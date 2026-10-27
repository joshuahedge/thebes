import { describe, it, expect } from '../harness.js';
import { OVERLAYS, OVERLAY_HUE, GRADED_OVERLAYS, LAYER_OVERLAYS, DESIRABILITY_ALPHA, houseMark, drawOverlay, drawDesirabilityTint, hatchTiles, desirabilityStep, desirabilityBands } from '../../src/render/overlays.js';
import { AUTO_OVERLAY, DESIRABILITY_STEPS } from '../../src/data/ui.js';
import { TIERS } from '../../src/data/housing.js';
import { createOverlayLegend } from '../../src/ui/overlayUi.js';
import { createPlacement, toolPreview, nicerFor } from '../../src/ui/placement.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, desirabilityBand, nicerText } from '../../src/ui/text.js';
import { place } from '../../src/sim/commands.js';
import { createWorld } from '../../src/sim/world.js';
import { buildStressCity } from '../../src/dev/sampleCity.js';
import { p, tileDiamond } from '../../src/render/iso.js';
import { makeDraw, rgba } from '../../src/render/art/ctx.js';
import { UI, TERRAIN } from '../../src/render/art/palette.js';
import { tileToScreen } from '../../src/render/camera.js';
import { T as TILE } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, hexToRgb } from '../helpers/canvas.js';
import { uiWorld, rigUI } from '../helpers/uiWorld.js';
import { mount, fire } from '../helpers/dom.js';

const GARDEN = { kind: 'building', type: 'garden' };
const GRANARY = { kind: 'building', type: 'granary' };

// A canvas whose art origin sits at device (120, 60), drawn at 2 device px per art px, with tile (tx, ty) placed there.
function scene(tx = 0, ty = 0, background = null) {
  const c = makeCanvas(240, 200);
  const ctx = c.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, 240, 200); }
  const [ax, ay] = p(tx, ty);
  ctx.translate(120 - 2 * ax, 60 - 2 * ay);
  return { c, g: makeDraw(ctx, 2), at: (x, y) => { const q = p(x, y); return [120 + 2 * (q[0] - ax), 60 + 2 * (q[1] - ay)]; } };
}

// The device pixels along the middle row of tile (x, y), its centre 12 art px either side.
function rowAcross(s, x, y) {
  const [cx, cy] = s.at(x + 0.5, y + 0.5);
  const out = [];
  for (let dx = -20; dx <= 20; dx++) out.push(pixelAt(s.c, cx + dx, cy));
  return out;
}

const luminance = ([r, g, b]) => {
  const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

// A road along y = 10 with a home of the given tier at (12, 11).
function street(tier, extra = {}) {
  const w = makeTestWorld({ gold: 5000 });
  setRoad(w, 0, 10, 31, 10);
  const h = addRaw(w, 'house', 12, 11, { tier, residents: TIERS[tier].capacity, ...extra });
  return { w, h };
}

describe('stage 2 overlays', () => {
  it('lists the fourteen overlays in order, with a name, a hue and a legend each, and shows the new ones on placing', () => {
    expect(OVERLAYS).toEqual(['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'fire', 'health', 'crime', 'housing', 'ground', 'progress', 'supply', 'workers', 'lines']);   // Stage 3: fire risk; the placement review: Ground; Version 8.3: Supply lines
    for (const o of OVERLAYS) {
      expect([o, typeof OVERLAY_NAMES[o], typeof OVERLAY_HUE[o]]).toEqual([o, 'string', 'string']);
      if (!GRADED_OVERLAYS.includes(o)) expect([o, OVERLAY_LEGEND[o].length]).toEqual([o, o === 'ground' || LAYER_OVERLAYS.includes(o) ? 3 : 2]);   // Ground: fertile, rocky and (Stage 4.5) clay
    }
    expect(GRADED_OVERLAYS).toEqual(['desirability', 'fire', 'health', 'crime']);   // Stage 4.5: Health and Crime are banded like fire risk
    expect([AUTO_OVERLAY.booth, AUTO_OVERLAY.garden, AUTO_OVERLAY.statue, AUTO_OVERLAY.well]).toEqual(['entertainment', 'desirability', 'desirability', 'water']);
    for (const type of ['farm_grain', 'farm_fig', 'farm_barley', 'farm_flax', 'gem_mine', 'clay_pit']) expect([type, AUTO_OVERLAY[type]]).toEqual([type, 'ground']);   // placement review P1
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: uiWorld(), store });
    for (const [type, overlay] of [['booth', 'entertainment'], ['garden', 'desirability'], ['statue', 'desirability'], ['farm_grain', 'ground'], ['farm_fig', 'ground'], ['gem_mine', 'ground'], ['granary', null]]) {
      store.set({ overlay: null });
      pl.start({ kind: 'building', type }, { x: 20, y: 9 });
      expect([type, store.get().overlay]).toEqual([type, overlay]);
    }
  });
  it('marks the goods a home needs for its next tier, and entertainment from a booth in reach', () => {
    const plain = street(3);
    expect(houseMark(plain.w, plain.h, 'goods')).toBe(null);                  // a Cottage's next tier needs no household goods
    const house = street(4);
    expect(houseMark(house.w, house.h, 'goods')).toEqual({ has: false, need: 'pottery' });
    house.h.stock.pottery = 5;
    expect(houseMark(house.w, house.h, 'goods')).toEqual({ has: true, need: null });
    const town = street(5, { stock: { pottery: 5 } });
    expect(houseMark(town.w, town.h, 'entertainment')).toBe(null);           // Version 6.0: a Townhouse on a small plot grows no further, so it does not want it
    const lot = addRaw(town.w, 'house', 20, 11, { tier: 0, w: 2, d: 2, large: true });   // an empty Large plot opens as a Manor, so it does
    expect(houseMark(town.w, lot, 'entertainment')).toEqual({ has: false, need: 'entertainment' });
    addRaw(town.w, 'booth', 16, 9);
    staffAll(town.w);
    expect(houseMark(town.w, lot, 'entertainment')).toEqual({ has: true, need: 'entertainment' });
    expect(houseMark(plain.w, plain.h, 'entertainment')).toBe(null);         // only homes on the way to a Manor want it
    const s = scene(12, 11);
    addRaw(house.w, 'bazaar', 14, 8);
    staffAll(house.w);
    drawOverlay(s.g, house.w, 'goods', { x0: 0, y0: 0, x1: 31, y1: 31 });
    let inked = 0;
    for (let x = 0; x < 240; x += 2) for (let y = 0; y < 200; y += 2) if (pixelAt(s.c, x, y)[3] > 0) inked++;
    expect(inked).toBeGreaterThan(10);                                         // the bazaar's reach and the home's mark
  });
  it('grades desirability in bands that start at each tier\'s "to rise" value, and words each band', () => {
    expect(DESIRABILITY_STEPS).toEqual([0, ...TIERS.filter((t) => t && t.desirability).map((t) => t.desirability.rise)]);
    expect(DESIRABILITY_STEPS).toEqual([0, 20, 35, 50, 65]);
    expect([-1, 0, 19, 20, 34, 35, 49, 50, 64, 65, 200].map(desirabilityStep)).toEqual([-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect([-1, 0, 1, 2, 3, 4].map((k) => desirabilityBand(k).label)).toEqual(['<0', '0–19', '20–34', '35–49', '50–64', '65+']);
    expect(desirabilityBand(-1).words).toBe('Below 0: unpleasant');
    expect(desirabilityBand(1).words).toBe(`20 to 34: pleasant enough for a ${TIERS[6].name}`);
    expect(desirabilityBand(4).words).toBe(`65 or more: pleasant enough for a ${TIERS[9].name}`);
    // One hue, light to dark: over sand each band is darker than the one before by a clear step (spec 6.3, colour-blind safe).
    const sand = hexToRgb(TERRAIN.sand), hue = hexToRgb(OVERLAY_HUE.desirability);
    const lum = DESIRABILITY_ALPHA.map((a) => luminance(sand.map((v, i) => Math.round(v * (1 - a) + hue[i] * a))));
    for (let k = 1; k < lum.length; k++) expect([k, lum[k - 1] - lum[k] > 0.04]).toEqual([k, true]);
    // And by contrast, from bare sand on: the first band (0 to 19, most open ground in a Town) shows against no
    // overlay at all, and no step is fainter than that one (about 1.2:1 each).
    const ladder = [luminance(sand), ...lum];
    for (let k = 1; k < ladder.length; k++) expect([k, (ladder[k - 1] + 0.05) / (ladder[k] + 0.05) >= 1.18]).toEqual([k, true]);
  });
  it('puts every tile in its band, leaves water and other buildings clear, and hatches below zero where the rest is a wash', () => {
    const w = makeTestWorld({ gold: 5000 });
    setRoad(w, 0, 10, 31, 10);
    w.terrain[idx(32, 20, 20)] = TILE.WATER;
    addRaw(w, 'garden', 5, 5);
    addRaw(w, 'granary', 20, 4);
    setRoad(w, 22, 5, 22, 5);                                                   // a granary gives its values once a road touches it (P11)
    addRaw(w, 'house', 6, 5, { tier: 1, residents: 3 });
    const { below, steps } = desirabilityBands(w);
    const has = (list, x, y) => list.some(([a, b]) => a === x && b === y);
    expect(has(steps[0], 4, 4)).toBe(true);                                    // beside the garden: 3
    expect(has(steps[0], 6, 5)).toBe(true);                                    // the home's own tile counts
    expect(has(below, 19, 4)).toBe(true);                                      // beside the granary: -8
    expect([has(below, 20, 4), has(steps[0], 20, 4), has(below, 21, 5), has(steps[0], 21, 5)]).toEqual([false, false, false, false]);   // under the granary
    expect(steps.some((l) => has(l, 20, 20)) || has(below, 20, 20)).toBe(false); // water
    expect(steps[0].length + below.length + steps.slice(1).reduce((n, l) => n + l.length, 0)).toBe(32 * 32 - 1 - 4 - 1);   // all but water, the granary and the garden
    // Drawn on a clear canvas: the wash beside the garden is one even strength; the hatching beside the granary stripes.
    const s = scene(4, 4);
    drawOverlay(s.g, w, 'desirability', { x0: 0, y0: 0, x1: 31, y1: 31 });
    const wash = rowAcross(s, 4, 4).map((px) => px[3]);
    expect(Math.max(...wash) - Math.min(...wash)).toBeLessThanOrEqual(6);
    expect(Math.min(...wash)).toBeGreaterThan(0);
    const h = scene(18, 5);
    drawOverlay(h.g, w, 'desirability', { x0: 0, y0: 0, x1: 31, y1: 31 });
    const hatch = rowAcross(h, 18, 5).map((px) => px[3]);
    expect(Math.max(...hatch) - Math.min(...hatch)).toBeGreaterThan(100);
  });
  it('tints the ground a ghost would change: a teal wash where homes get nicer, coral hatching where they get worse', () => {
    const s = scene(0, 0);
    drawDesirabilityTint(s.g, [{ x: 0, y: 0, v: 3 }, { x: 3, y: 0, v: -4 }, { x: 0, y: 3, v: 0 }]);
    const wash = rowAcross(s, 0, 0);
    const alphas = wash.map((px) => px[3]);
    expect(Math.max(...alphas) - Math.min(...alphas)).toBeLessThanOrEqual(6);  // even: a wash
    const nicer = hexToRgb(UI.nicer);
    expect(wash.every((px) => Math.abs(px[0] - nicer[0]) <= 30 && Math.abs(px[1] - nicer[1]) <= 30 && Math.abs(px[2] - nicer[2]) <= 30)).toBe(true);
    const hatch = rowAcross(s, 3, 0).map((px) => px[3]);
    expect(Math.max(...hatch) - Math.min(...hatch)).toBeGreaterThan(100);     // stripes: a pattern, readable without colour
    expect(rowAcross(s, 0, 3).every((px) => px[3] === 0)).toBe(true);         // no change, no tint
  });
  it('hatches every tile with the same stripes, whatever else is hatched with it, and leaves no seam where tiles meet', () => {
    const alphas = (s, x, y) => rowAcross(s, x, y).map((px) => px[3]);
    const alone = scene(3, 0);
    hatchTiles(alone.g, [[3, 0]], UI.bad);
    const crowd = scene(3, 0);
    hatchTiles(crowd.g, [[3, 0], [4, 0], [5, 0], [3, 1], [2, 2]], UI.bad);
    const stripes = alphas(alone, 3, 0);
    expect(Math.max(...stripes) - Math.min(...stripes)).toBeGreaterThan(100);
    expect(alphas(crowd, 3, 0)).toEqual(stripes);                              // the stripes sit on the map, so they do not crawl as the set changes
    expect(alphas(crowd, 5, 0)).toEqual(stripes);
    expect(alphas(crowd, 2, 2)).toEqual(stripes);                              // and every tile in it has the same stripes
    // The lines lie on the art grid: along x + y = a multiple of 4 art px (here 8, the middle of tile (0, 0)), clear between them.
    const grid = scene(0, 0);
    hatchTiles(grid.g, [[0, 0]], UI.bad);
    expect([pixelAt(grid.c, 120, 76)[3] > 150, pixelAt(grid.c, 122, 78)[3] < 60]).toEqual([true, true]);
    // Along art y = 12 three tiles meet (0, 1), (0, 0) and (1, 0): one run, one edge between runs. The wash is one strength across both.
    const joined = scene(0, 0);
    drawDesirabilityTint(joined.g, [{ x: 0, y: 0, v: 3 }, { x: 1, y: 0, v: 3 }, { x: 0, y: 1, v: 3 }]);
    const across = [];
    for (let ax = -22; ax <= 22; ax++) across.push(pixelAt(joined.c, 120 + 2 * ax, 60 + 2 * 12)[3]);
    expect(Math.min(...across)).toBeGreaterThan(0);
    expect(Math.max(...across) - Math.min(...across)).toBeLessThanOrEqual(6);
  });
});

describe('stage 2 overlay legend', () => {
  it('shows the desirability scale as six bands with a label and words each, the first hatched, and cycles all eight overlays', () => {
    const { root, cleanup } = mount();
    try {
      const store = createStore(INITIAL_UI_STATE);
      const legend = createOverlayLegend({ container: root, store });
      store.set({ overlay: 'desirability' });
      const strip = root.querySelector('.strip');
      expect(strip.classList.contains('graded')).toBe(true);
      expect(strip.textContent).toContain(OVERLAY_NAMES.desirability);
      const bands = [...strip.querySelectorAll('.band')];
      expect(bands.map((b) => b.textContent)).toEqual(['<0', '0–19', '20–34', '35–49', '50–64', '65+']);
      expect(bands.map((b) => b.getAttribute('aria-label'))).toEqual([-1, 0, 1, 2, 3, 4].map((k) => desirabilityBand(k).words));
      expect(bands[0].querySelector('.swatch').classList.contains('hatch')).toBe(true);
      expect(bands[0].querySelector('.swatch').style.backgroundImage).toContain('repeating-linear-gradient');
      expect(bands[3].querySelector('.swatch').style.backgroundImage).toContain(rgba(OVERLAY_HUE.desirability, DESIRABILITY_ALPHA[2]).replace(/,/g, ', '));
      expect(strip.querySelector('.dot')).toBe(null);
      fire(strip.querySelector('.close'), 'click');
      expect(store.get().overlay).toBe(null);
      store.set({ overlay: 'goods' });
      expect(root.querySelector('.strip').textContent).toContain(OVERLAY_LEGEND.goods[1]);
      store.set({ overlay: null });
      const seen = [];
      for (let i = 0; i <= OVERLAYS.length; i++) { legend.cycle(); seen.push(store.get().overlay); }
      expect(seen).toEqual([...OVERLAYS, null]);
    } finally { cleanup(); }
  });
  it('keeps the scale on screen under the top bar on a phone at 150% text, with the close button 44 px', async () => {
    const r = await rigUI({ width: 360, height: 640 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set({ overlay: 'desirability' });
      const strip = r.root.querySelector('#legend .strip').getBoundingClientRect();
      const shell = r.root.getBoundingClientRect();
      expect([strip.left >= shell.left, strip.right <= shell.right + 0.5]).toEqual([true, true]);
      expect(strip.bottom - shell.top).toBeLessThan(shell.height / 2);
      const close = r.root.querySelector('#legend .close').getBoundingClientRect();
      expect([close.width >= 44, close.height >= 44]).toEqual([true, true]);
      for (const b of r.root.querySelectorAll('#legend .band')) expect(b.getBoundingClientRect().right).toBeLessThanOrEqual(shell.right + 0.5);
    } finally { r.cleanup(); }
  });
  it('shows the whole scale under a critical banner on a phone, in the guidance row, its name and labels readable and out of the middle of the map', async () => {
    const r = await rigUI({ width: 360, height: 640 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set({ overlay: 'desirability' });
      r.world.gold = -5;                                                       // debt: a critical alert, so a banner
      r.ui.alerts.refresh();
      expect(document.body.classList.contains('has-banner')).toBe(true);
      const shell = r.root.getBoundingClientRect();
      const strip = r.root.querySelector('#legend .strip');
      expect(getComputedStyle(strip).display === 'none').toBe(false);        // the legend has the guidance row (ruling 164), so no icon stands in for it
      expect(r.root.querySelector('#legend .legend-icon')).toBe(null);
      expect(getComputedStyle(r.root.querySelector('#goals')).display).toBe('none');   // the goal waits while an overlay is on
      const words = [...strip.querySelectorAll('.text')];
      expect(words.map((w) => w.textContent)).toEqual([OVERLAY_NAMES.desirability, '<0', '0–19', '20–34', '35–49', '50–64', '65+']);
      for (const w of words) {
        const box = w.getBoundingClientRect();                                 // not the 1 px of a screen-reader-only word
        expect([w.textContent, box.width > 1, box.height > 1]).toEqual([w.textContent, true, true]);
        expect([w.textContent, box.left >= shell.left, box.right <= shell.right + 0.5]).toEqual([w.textContent, true, true]);
      }
      expect(r.root.querySelector('#banner .critical') === null).toBe(false);
      expect(strip.getBoundingClientRect().top).toBeGreaterThanOrEqual(r.root.querySelector('#banner').getBoundingClientRect().bottom);   // under the alert row
      expect(strip.getBoundingClientRect().bottom - shell.top).toBeLessThan(shell.height / 2);
    } finally { r.cleanup(); }
  });
  it('keeps the scale on the name\'s row on a phone held sideways, so the legend stays above the middle under a banner', async () => {
    const r = await rigUI({ width: 844, height: 390 });
    try {
      r.world.gold = -5;                                                       // debt: a critical alert, so a banner
      r.ui.alerts.refresh();
      expect([r.store.get().layout, document.body.classList.contains('has-banner')]).toEqual(['compact', true]);
      const shell = r.root.getBoundingClientRect();
      const box = (el) => el.getBoundingClientRect();
      // The legend takes the guidance row in place of the goals strip (ruling 164): two rows under the top bar.
      r.store.set({ overlay: 'water' });
      expect(getComputedStyle(r.root.querySelector('#goals')).display).toBe('none');
      const plain = box(r.root.querySelector('#legend .strip'));
      expect(plain.bottom - shell.top).toBeLessThan(shell.height / 2);
      r.store.set({ overlay: 'desirability' });
      const strip = r.root.querySelector('#legend .strip');
      const name = box(strip.querySelector('strong.text')), scale = box(strip.querySelector('.scale')), close = box(strip.querySelector('.close'));
      expect([scale.top < name.bottom, close.top < scale.bottom, scale.left >= name.right]).toEqual([true, true, true]);   // one row: name, scale, close
      expect(box(strip).height).toBe(plain.height);                            // no taller than any overlay's strip
      expect(box(strip).bottom - shell.top).toBeLessThan(shell.height / 2);
    } finally { r.cleanup(); }
  });
  // Ruling 172 and the height budget (spec 6.3): on a phone held sideways the alert row and the legend end by 40% of the
  // height at 100% text, so the fire-risk legend keeps a plain strip's height (its name, scale and keys beside the x, the
  // never-burn line for screen readers as on a portrait phone); at 125% and 150% only the alert row shows under a banner.
  it('keeps the legend and the banner above 40% on a phone held sideways, the fire-risk legend as tall as a plain strip, and gives the one row to the banner at large text', async () => {
    for (const [w, h] of [[844, 390], [667, 375]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          r.world.gold = -5;
          r.ui.alerts.refresh();
          r.frame();
          const shell = r.root.getBoundingClientRect();
          const box = (el) => el.getBoundingClientRect();
          const at = `${w}x${h} at ${size}%`;
          r.store.set({ overlay: 'water' }); r.frame();
          const legend = r.root.querySelector('#legend');
          if (size >= 125) {
            expect([at, getComputedStyle(legend).display]).toEqual([at, 'none']);   // the alert row has the one row
            r.world.gold = 500; r.ui.alerts.refresh(); r.frame();
          }
          const plain = box(r.root.querySelector('#legend .strip'));
          expect([at, plain.bottom - shell.top <= h * 0.4]).toEqual([at, true]);
          r.store.set({ overlay: 'fire' }); r.frame();
          const strip = r.root.querySelector('#legend .strip');
          const name = box(strip.querySelector('strong.text')), scale = box(strip.querySelector('.scale')), keys = box(strip.querySelector('.fire-keys')), close = box(strip.querySelector('.close'));
          expect([at, scale.left >= name.right, keys.top >= scale.bottom - 1, close.left >= Math.max(scale.right, keys.right)]).toEqual([at, true, true, true]);
          expect([at, size > 100 || box(strip).height <= plain.height + 2, box(strip).bottom - shell.top <= h * 0.4, box(strip).right <= shell.right]).toEqual([at, true, true, true]);
          const never = strip.querySelector('.never-burn');
          expect([at, never.textContent.length > 0, box(never).width <= 1]).toEqual([at, true, true]);   // kept for screen readers
        } finally { r.cleanup(); }
      }
    }
  });
});

describe('stage 2 placement preview', () => {
  it('says how many homes a building makes nicer or less pleasant, from the ghost\'s tile', () => {
    const world = uiWorld();                                                   // huts at (12, 9) and (13, 9), road along y = 10
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world, store });
    pl.start(GARDEN, { x: 12, y: 8 });
    expect(store.get().ghost).toEqual({ x: 12, y: 8 });
    expect([pl.preview().nicer, pl.preview().nicerTone]).toEqual(['Makes 2 homes nicer', 'better']);
    expect(pl.tint().length).toBeGreaterThan(0);
    expect(pl.tint().every((t) => t.v > 0)).toBe(true);
    pl.moveGhost(28, 2);                                                       // no homes anywhere near: no line and no tint (final review 4)
    expect([pl.preview().state, pl.preview().nicer, pl.tint()]).toEqual(['ok', '', []]);
    pl.start(GRANARY, { x: 14, y: 8 });
    expect([pl.preview().nicer, pl.preview().nicerTone]).toEqual(['Makes 2 homes less pleasant', 'worse']);
    pl.moveGhost(13, 9);                                                       // on a hut: blocked, so no line and no tint
    expect([pl.preview().state, pl.preview().nicer, pl.tint()]).toEqual(['bad', '', []]);
    pl.start({ kind: 'road' });
    expect([pl.preview().nicer, pl.tint()]).toEqual(['', []]);
    expect(nicerText(1, 0)).toBe('Makes 1 home nicer');
    expect(nicerText(3, 2)).toBe('Makes 3 homes nicer and 2 less pleasant');
    expect(nicerText(0, 0)).toBe('');
  });
  it('works the preview out once per ghost tile, and again only when the city changes', () => {
    const world = uiWorld();
    const a = nicerFor(world, 'garden', 12, 8);
    expect(nicerFor(world, 'garden', 12, 8) === a).toBe(true);                // a redraw asks nothing new
    expect(nicerFor(world, 'garden', 11, 8) === a).toBe(false);               // the next tile asks once
    const b = nicerFor(world, 'garden', 11, 8);
    expect(nicerFor(world, 'garden', 11, 8) === b).toBe(true);
    expect(place(world, 'garden', 20, 20).ok).toBe(true);
    expect(nicerFor(world, 'garden', 11, 8) === b).toBe(false);               // a new building: worked out afresh
    // A crowded 64 x 64 city: sweeping the ghost along a row of 40 tiles stays well inside a frame each, and a frame
    // that only redraws the same tile costs next to nothing.
    const big = buildStressCity(createWorld({ seed: 3 }), { days: 0 });
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: big, store });
    pl.start(GARDEN, { x: 10, y: 4 });
    let started = performance.now();
    for (let x = 4; x < 44; x++) { pl.moveGhost(x, 4); pl.preview(); pl.tint(); }
    const sweep = performance.now() - started;
    expect(sweep).toBeLessThan(40 * 16);
    // The best of three batches, under 40 ms (8.3, ruling 1445): a hit is a pass over the city's buildings, about 9 ms for
    // 200 run alone but 20-35 ms late in the whole suite, where the engine has seen thousands of test worlds. 0.2 ms a call
    // is still under 1/80 of a frame; that the memo hits at all is proved by the identity checks above.
    let best = Infinity;
    for (let batch = 0; batch < 3; batch++) {
      started = performance.now();
      for (let i = 0; i < 200; i++) nicerFor(big, 'garden', 43, 4);
      best = Math.min(best, performance.now() - started);
    }
    expect(best).toBeLessThan(40);
  });
  it('puts the line in the confirm bar in teal or coral, and keeps room for it', () => {
    const { root, cleanup } = mount();
    try {
      const world = uiWorld();
      const store = createStore(INITIAL_UI_STATE);
      const placement = createPlacement({ world, store });
      createConfirmBar({ container: root, store, placement, onCancel() {}, onConfirm() {}, onUndo() {} });
      placement.start(GARDEN, { x: 12, y: 8 });
      const line = root.querySelector('.confirm .nicer');
      expect(line.textContent).toBe('Makes 2 homes nicer');
      expect(line.classList.contains('teal')).toBe(true);
      expect(root.querySelector('.confirm').classList.contains('desire')).toBe(true);
      placement.moveGhost(28, 2);
      expect(root.querySelector('.confirm .nicer')).toBe(null);
      placement.start(GRANARY, { x: 14, y: 8 });
      expect(root.querySelector('.confirm .nicer').classList.contains('coral')).toBe(true);
      placement.start({ kind: 'road' });
      expect(root.querySelector('.confirm').classList.contains('desire')).toBe(false);
      placement.cancel();
    } finally { cleanup(); }
  });
  it('keeps the portrait confirm bar one height as the line comes and goes, and the corners on it', async () => {
    for (const size of [100, 150]) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        r.ui.settings.set({ textSize: size });
        const read = () => {
          const bar = r.root.querySelector('#confirm').getBoundingClientRect();
          const corner = r.root.querySelector('#corners .minimap-button').getBoundingClientRect().bottom;
          expect([size, corner <= bar.top + 0.5]).toEqual([size, true]);
          return bar.height;
        };
        r.ui.placement.start(GARDEN, { x: 28, y: 2 });
        expect(r.root.querySelector('#confirm .nicer')).toBe(null);
        const before = read();
        r.ui.placement.moveGhost(12, 8);
        expect(r.root.querySelector('#confirm .nicer').textContent).toBe('Makes 2 homes nicer');
        expect([size, read()]).toEqual([size, before]);
        r.ui.placement.cancel();
      } finally { r.cleanup(); }
    }
  });
  it('draws the tint on the map under the ghost while placing, and nothing once the tool is gone', async () => {
    const r = await rigUI({ width: 800, height: 600 });
    try {
      const at = () => { const [sx, sy] = tileToScreen(r.cam, { width: 800, height: 600 }, 11.5, 7.5); return pixelAt(r.canvas, sx, sy); };
      for (let i = 0; i < 8; i++) r.frame(i);                                  // every chunk in view baked
      const plain = at();
      r.ui.placement.start(GARDEN, { x: 12, y: 8 });
      r.store.set({ overlay: null });                                          // the tint alone, without the desirability overlay
      r.frame(16);
      const tinted = at();
      const nicer = hexToRgb(UI.nicer);
      const towards = (px) => Math.abs(px[0] - nicer[0]) + Math.abs(px[1] - nicer[1]) + Math.abs(px[2] - nicer[2]);
      expect(towards(tinted)).toBeLessThan(towards(plain) - 20);
      r.ui.placement.cancel();
      r.frame(32);
      expect(towards(at())).toBe(towards(plain));
    } finally { r.cleanup(); }
  });
});
