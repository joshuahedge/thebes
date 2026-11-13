// Version 10.0.2 (ruling 2441): the side rail is the PORTRAIT phone's. A phone held sideways (compact), a tablet and a laptop (wide) keep 10.0.1's corner buttons exactly: the rects below were measured on
// 635abaa (10.0.1, the extracted copy the before shots were taken from) with the same rig, [left, top, width, height] in px from the screen's corner, in the order Play, Speed, Map, Layers. On the wide
// layout (a tablet's 1024x768 too) the corner buttons are not drawn at all (the top bar has the speed steps and the Map and Layers buttons).
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';

const SEL = ['.speed-main', '.speed-chevron', '.minimap-button', '.overlay-button'];
const rectsOf = (r) => SEL.map((s) => { const n = r.root.querySelector(`#corners ${s}`), shell = r.root.getBoundingClientRect(); if (!n || !n.getClientRects().length || getComputedStyle(n).display === 'none') return null; const b = n.getBoundingClientRect(); return [b.left - shell.left, b.top - shell.top, b.width, b.height]; });
const near = (got, want) => got.every((q, i) => (want[i] === null ? q === null : q !== null && q.every((v, k) => Math.abs(v - want[i][k]) <= 1)));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const COMPACT = {
  '844x390 t100 idle': [[8, 330, 73, 52], [89, 330, 51, 52], [673, 330, 48, 52], [729, 330, 51, 52]],
  '844x390 t100 tray': [[8, 330, 73, 52], [89, 330, 51, 52], [388, 330, 48, 52], [444, 330, 51, 52]],
  '844x390 t100 placing': [[8, 330, 73, 52], [89, 330, 51, 52], [407, 330, 48, 52], [463, 330, 49, 52]],
  '844x390 t150 idle': [[8, 320, 93, 62], [109, 320, 68, 62], [650, 320, 54, 62], [712, 320, 68, 62]],
  '667x375 t100 idle': [[8, 315, 73, 52], [89, 315, 51, 52], [496, 315, 48, 52], [552, 315, 51, 52]],
  '667x375 t100 placing': [[8, 315, 73, 52], [89, 315, 51, 52], [230, 315, 48, 52], [286, 315, 49, 52]],
  '667x375 t150 idle': [[8, 315, 93, 52], [109, 315, 63, 52], [499, 315, 48, 52], [555, 315, 48, 52]],
};

describe('v1002 layouts: landscape phones keep 10.0.1\'s corner buttons', () => {
  it('has the same rects idle, with a tray open and while placing (844x390 and 667x375, 100% and 150% text)', async () => {
    const wrong = [];
    // The compact corner rules look at the whole page (body:has(#sheet:not([hidden])), :has(#confirm...)), so a shell another test left mounted would move the buttons: stand them aside while measuring.
    const strays = [...document.querySelectorAll('.test-mount')], homes = strays.map((n) => [n, n.parentNode, n.nextSibling]);
    for (const n of strays) n.remove();
    try {
    for (const [key, want] of Object.entries(COMPACT)) {
      const [size, text, state] = key.split(' ');
      const [w, h] = size.split('x').map(Number);
      const r = await rigUI({ width: w, height: h });
      try {
        r.renderer.renderFrame = () => {};
        r.ui.settings.set({ textSize: Number(text.slice(1)) });
        await tick();
        if (state === 'tray') { r.store.set({ category: 'services', dock: 'tray' }); await tick(); }
        if (state === 'placing') { r.store.set({ category: 'services', dock: 'tray' }); r.ui.placement.start({ kind: 'building', type: 'well' }, { x: 14, y: 9 }); await tick(); }
        expect([key, document.body.dataset.layout]).toEqual([key, 'compact']);
        const got = rectsOf(r);
        if (!near(got, want)) wrong.push(`${key}: ${JSON.stringify(got)}`);
        expect([key, document.body.classList.contains('rail-clear'), r.root.querySelector('#corners .speed-chevron .speed-now') !== null && getComputedStyle(r.root.querySelector('#corners .speed-chevron .speed-now')).display]).toEqual([key, false, 'none']);   // none of the rail's marks reach compact
      } finally { r.cleanup(); }
    }
    } finally { for (const [n, parent, next] of homes) parent.insertBefore(n, next && next.parentNode === parent ? next : null); }
    expect(wrong).toEqual([]);
  });
  it('draws no corner buttons on a tablet or a laptop (the top bar has them), as in 10.0.1', async () => {
    for (const [w, h] of [[1024, 768], [1280, 800]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        await tick();
        expect([w, document.body.dataset.layout, rectsOf(r)]).toEqual([w, 'wide', [null, null, null, null]]);
        expect(r.root.querySelectorAll('#topbar .speed button').length).toBe(4);
      } finally { r.cleanup(); }
    }
  });
});
