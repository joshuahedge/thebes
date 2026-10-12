import { describe, it, expect } from '../../harness.js';
import { OVERLAYS, OVERLAY_HUE, GRADED_OVERLAYS, FIRE_ALPHA, fireRiskMarks, drawOverlay, drawGhost, problemMarkers } from '../../../src/render/overlays.js';
import { AUTO_OVERLAY } from '../../../src/data/ui.js';
import { FIRE_BANDS } from '../../../src/data/fire.js';
import { staffedCover } from '../../../src/sim/fire.js';
import { createPlacement, firehouseReachFrom, ghostsFor, toolPreview } from '../../../src/ui/placement.js';
import { createConfirmBar } from '../../../src/ui/confirmBar.js';
import { createOverlayLegend } from '../../../src/ui/overlayUi.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { p } from '../../../src/render/iso.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { idx } from '../../../src/sim/grid.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, reasonText, DANGER_UI_TEXT as D } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';
import { mount } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

function town(gold = 1000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'market_town';
  return w;
}
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('s3 ui fire-risk overlay', () => {
  it('joins the overlays as a graded one, named, and turns on while a firehouse is placed', () => {
    expect(OVERLAYS).toEqual(['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'fire', 'housing', 'ground']);
    expect([GRADED_OVERLAYS, OVERLAY_NAMES.fire, typeof OVERLAY_HUE.fire, AUTO_OVERLAY.firehouse]).toEqual([['desirability', 'fire'], 'Fire risk', 'string', 'fire']);
    const store = createStore(INITIAL_UI_STATE);
    createPlacement({ world: town(), store }).start({ kind: 'building', type: 'firehouse' }, { x: 20, y: 11 });
    expect(store.get().overlay).toBe('fire');
  });

  it('marks every building that can burn by its band, with a dot only where a staffed firehouse reaches it', () => {
    const w = town();
    const low = addRaw(w, 'potter', 4, 11, { risk: 10 }), rising = addRaw(w, 'potter', 6, 11, { risk: 30 });
    const high = addRaw(w, 'potter', 8, 11, { risk: 70 }), hot = addRaw(w, 'granary', 20, 11, { risk: 120 });
    addRaw(w, 'garden', 18, 11);                                                        // never burns: no mark
    const fh = addRaw(w, 'firehouse', 22, 11, { staff: 4 });
    const marks = fireRiskMarks(w);
    expect(marks.map((m) => [m.id, m.band, m.has])).toEqual([[low.id, 0, false], [rising.id, 1, false], [high.id, 2, false], [hot.id, 3, true], [fh.id, 0, true]]);
    fh.staff = 1;                                                                       // covers at 0.25: not staffed, so a ring
    expect([staffedCover(w, hot), fireRiskMarks(w).find((m) => m.id === hot.id).has]).toEqual([false, false]);
    expect(FIRE_ALPHA.every((a, k) => k === 0 || a > FIRE_ALPHA[k - 1])).toBe(true);
  });

  it('draws the bands light to dark, hatched on High and above and plain below', () => {
    const w = town();
    addRaw(w, 'booth', 10, 11, { risk: 0 });                                          // 1x1, so its mark sits on its one tile
    addRaw(w, 'booth', 12, 11, { risk: 120 });
    const c = makeCanvas(400, 240);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#F3E7CB'; ctx.fillRect(0, 0, 400, 240);
    const [ax, ay] = p(11, 11);
    ctx.translate(200 - 2 * ax, 120 - 2 * ay);
    drawOverlay(makeDraw(ctx, 2), w, 'fire', null);
    const across = (tx) => { const q = p(tx + 0.5, 11.5); const out = []; for (let dx = -8; dx <= 8; dx++) out.push(pixelAt(c, 200 + 2 * (q[0] - ax) + dx, 120 + 2 * (q[1] - ay) + 6)); return out; };   // 3 art px under the centre, clear of the mark and the edges
    const low = across(10), hot = across(12);
    const mean = (row) => row.reduce((s, px) => s + luminance(px), 0) / row.length;
    expect(mean(hot)).toBeLessThan(mean(low) - 20);                                    // darker
    expect(new Set(low.map((px) => px.join())).size).toBe(1);                          // a plain tint
    expect(new Set(hot.map((px) => px.join())).size).toBeGreaterThan(2);               // stripes
  });

  it('shows a legend of the four bands with the hatching on the top two, the dot and ring, and what never burns', () => {
    const { root, cleanup } = mount();
    try {
      const store = createStore(INITIAL_UI_STATE);
      createOverlayLegend({ container: root, store });
      store.set({ overlay: 'fire' });
      const bands = [...root.querySelectorAll('.band')];
      expect(bands.map((b) => b.textContent)).toEqual(['Low', 'Rising', 'High', 'Can catch fire']);
      expect(bands.map((b) => b.getAttribute('aria-label'))).toEqual(['Low: fire risk 0 to 24', 'Rising: fire risk 25 to 59', 'High: fire risk 60 to 99', 'Can catch fire: fire risk 100 or more']);
      expect(FIRE_BANDS).toEqual([0, 25, 60, 100]);
      expect(bands.map((b) => b.querySelector('.swatch').classList.contains('hatch'))).toEqual([false, false, true, true]);
      expect(bands[3].querySelector('.swatch').style.backgroundImage.split('repeating-linear-gradient').length - 1).toBe(2);   // both ways
      expect([...root.querySelectorAll('.fire-keys .key')].map((k) => k.textContent.trim())).toEqual(OVERLAY_LEGEND.fire);
      expect(root.querySelector('.never-burn').textContent).toBe('Roads, gardens, statues, wells and walls never burn');
    } finally { cleanup(); }
  });

  it('keeps the fire legend under the top bar, on screen and above the middle on a phone at 150% text', async () => {
    const r = await rigUI({ width: 360, height: 640 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set({ overlay: 'fire' });
      const shell = r.root.getBoundingClientRect();
      const strip = r.root.querySelector('#legend .strip').getBoundingClientRect();
      expect([strip.left >= shell.left, strip.right <= shell.right + 0.5, strip.bottom - shell.top < shell.height / 2]).toEqual([true, true, true]);
      for (const n of r.root.querySelectorAll('#legend .band, #legend .key, #legend .never-burn')) expect(n.getBoundingClientRect().right).toBeLessThanOrEqual(shell.right + 0.5);
    } finally { r.cleanup(); }
  });

  it('badges a building the sim flags for fire risk or burning, as any problem', () => {
    const w = town();
    const potter = addRaw(w, 'potter', 8, 11, { risk: 70 });
    expect(problemMarkers(w, [{ code: 'fire_risk', id: potter.id }]).map((m) => [m.id, m.kind, m.cause])).toEqual([[potter.id, 'problem', 'fire_risk']]);   // a fire mark is the plain "!": only a missing road changes it
    expect(problemMarkers(w, [{ code: 'raid_warning', x: 31, y: 16 }])).toEqual([]);   // a map point has no building to badge
  });
});

describe('s3 ui danger tools', () => {
  it('says how many buildings that can burn a firehouse would cover from the ghost, by fireCoverage\'s rule', () => {
    const w = town();
    addRaw(w, 'potter', 14, 11); addRaw(w, 'granary', 16, 11); addRaw(w, 'garden', 18, 11);
    addRaw(w, 'potter', 2, 11);                                                        // 12 road tiles from (13, 9)
    expect(firehouseReachFrom(w, 13, 9)).toBe(2);
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: w, store });
    pl.start({ kind: 'building', type: 'firehouse' }, null);
    pl.moveGhost(13, 9);
    expect([pl.preview().state, pl.preview().effect]).toEqual(['ok', 'Covers 2 buildings that can burn']);
    pl.moveGhost(28, 4);                                                               // no road beside it
    expect(firehouseReachFrom(w, 28, 4)).toBe(0);
    expect(D.firehouseCovers(0)).toBe('No buildings that can burn in reach yet');
  });

  it('words a wall line by the tiles and gates it draws, marks the gates, and passes the sim\'s refusal on', () => {
    const w = town();
    const store = createStore({ ...INITIAL_UI_STATE, mode: 'drawing', tool: { kind: 'wall' }, line: { x0: 3, y0: 8, x1: 3, y1: 12, flip: false } });
    const p0 = toolPreview(w, store.get());
    expect([p0.state, p0.text]).toEqual(['ok', D.wallCount(5, 1)]);                    // previewWall: 5 tiles, the one on the road a gate
    w.road[idx(w.size, 3, 10)] = 0;
    expect(toolPreview(w, store.get()).text).toBe(D.wallCount(5, 0));
    w.road[idx(w.size, 3, 10)] = 1;
    w.milestone = 'town';                                                              // before Market town the sim refuses, and the bar says so in its words
    const locked = toolPreview(w, store.get());
    expect([locked.state, locked.text]).toEqual(['bad', reasonText('locked')]);
    w.milestone = 'market_town';
    w.gold = -499;                                                                     // the line costs more than the debt floor allows
    const broke = toolPreview(w, store.get());
    expect([broke.state, broke.text]).toEqual(['bad', reasonText('no_gold')]);
    w.gold = 1000;
    expect(D.wallCount(5, 1)).toBe('5 tiles, 1 gate on roads');
    expect(D.wallCount(1, 0)).toBe('1 tile');
    // A preview in previewWall's shape: tiles and gates are map indices.
    const okPreview = { state: 'ok', tiles: [[3, 8], [3, 9], [3, 10]], gates: [idx(w.size, 3, 10)] };
    expect(ghostsFor(w, store.get(), okPreview).map((g) => [g.x, g.y, g.state])).toEqual([[3, 8, 'ok'], [3, 9, 'ok'], [3, 10, 'gate']]);
    const c = makeCanvas(80, 60);
    const ctx = c.getContext('2d');
    ctx.translate(40, 10);
    drawGhost(makeDraw(ctx, 1), { x: 0, y: 0, w: 1, d: 1, state: 'gate' });            // draws, with its arch mark
    drawGhost(makeDraw(ctx, 1), { x: 0, y: 0, w: 1, d: 1, state: 'gate', badge: true });   // and the badge's arch, for a gate drawn as a building would be
  });

  it('says what clearing rubble costs in the demolish bar, and refuses it in the rule\'s words below the debt floor', () => {
    const { root, cleanup } = mount();
    try {
      const w = town(1000);
      for (const x of [12, 13, 14, 15]) addRaw(w, 'rubble', x, 11);
      addRaw(w, 'well', 17, 11);
      const store = createStore(INITIAL_UI_STATE);
      const pl = createPlacement({ world: w, store });
      createConfirmBar({ container: root, store, placement: pl, onCancel() {}, onConfirm() {}, onUndo() {} });
      pl.start({ kind: 'demolish' });
      pl.pointAt(12, 11); pl.pointAt(15, 11);
      let pv = pl.preview();
      expect([pv.state, pv.text, root.querySelector('.cost').textContent]).toEqual(['ok', 'Clear 4 rubble: 20 gold', '20 gold']);
      pl.pointAt(12, 11); pl.pointAt(17, 11);                                          // the well too: refund 7, clearing 20
      pv = pl.preview();
      expect([pv.text, root.querySelector('.cost').textContent]).toEqual(['1 item · Clear 4 rubble: 20 gold', '13 gold']);
      w.gold = -490;
      pl.pointAt(12, 11); pl.pointAt(15, 11);
      pv = pl.preview();
      expect([pv.state, pv.reason, pv.text]).toEqual(['bad', 'no_gold', 'Would put the treasury over 500 gold in debt']);
      w.gold = 1000;
      pl.pointAt(17, 11); pl.pointAt(17, 11);
      expect([pl.preview().text, root.querySelector('.cost').textContent]).toEqual(['1 item · Refund 7', 'Refund 7']);   // no rubble: as before
    } finally { cleanup(); }
  });
});
