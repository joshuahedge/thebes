import { describe, it, expect } from '../../harness.js';
import { createSheets } from '../../../src/ui/sheets.js';
import { createMinimap } from '../../../src/ui/minimap.js';
import { createPlacement } from '../../../src/ui/placement.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { createCamera } from '../../../src/render/camera.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { mount, fire } from '../../helpers/dom.js';

function rig(layout = 'portrait') {
  const { root, cleanup } = mount();
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  addRaw(world, 'farm_grain', 2, 11, { blocked: 'no_storage' });
  addRaw(world, 'house', 12, 11, { tier: 2, residents: 8 });
  staffAll(world);
  const store = createStore({ ...INITIAL_UI_STATE, layout });
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: () => true });
  const log = [];
  const placement = createPlacement({ world, store, afterCommand: () => {} });
  const sheets = createSheets({
    container: root, store, world, placement, cameraControl,
    minimap: createMinimap({ world, cam, view, size: 100 }), getAlerts: () => alertsFor(world),
    onView: () => {}, afterCommand: () => {}, onFrame: () => log.push('frame'),
    parts: [{ summary: () => { const s = document.createElement('section'); s.className = 'score-section'; const h = document.createElement('h3'); h.textContent = 'City score'; h.dataset.section = 'score'; s.append(h, document.createElement('p')); return [s]; } }],   // scoreUi's section, in short
    custom: { menu: (body) => { body.textContent = 'menu here'; } },
  });
  return { root, store, sheets, log, cleanup };
}

describe('v931 n sheets', () => {
  it('S7: on a phone the minimap sheet puts the map first, the alerts under it, and Fit the city closes the sheet before framing', () => {
    const r = rig();
    try {
      r.store.set(openSheet(r.store.get(), 'minimap'));
      const body = r.root.querySelector('.body');
      const kids = [...body.children];
      const map = kids.findIndex((n) => n.classList.contains('minimap-wrap')), alerts = kids.findIndex((n) => n.tagName === 'H3' || n.classList.contains('alert-list'));
      expect(map).toBe(0);
      expect(alerts > map).toBe(true);
      fire(r.root.querySelector('.fit-city'), 'click');
      expect([r.store.get().sheet, r.log]).toEqual([null, ['frame']]);
    } finally { r.cleanup(); }
  });
  it('S7: on the wide layout Fit the city leaves the sheet open', () => {
    const r = rig('wide');
    try {
      r.store.set(openSheet(r.store.get(), 'minimap'));
      fire(r.root.querySelector('.fit-city'), 'click');
      expect([r.store.get().sheet !== null, r.log]).toEqual([true, ['frame']]);
    } finally { r.cleanup(); }
  });
  it('S6: a sheet opened from a scrolled sheet starts at its top', () => {
    const r = rig();
    try {
      let top = 0;
      Object.defineProperty(r.root, 'scrollTop', { get: () => top, set: (v) => { top = v; }, configurable: true });
      r.store.set(openSheet(r.store.get(), 'menu'));
      top = 101;                                   // the player scrolled the Menu
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(top).toBe(0);
    } finally { r.cleanup(); }
  });
  it('S8: on a phone the City summary is section rows, the score open at first and the named section open when asked', () => {
    const r = rig();
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      const rows = [...r.root.querySelectorAll('details.sum-section')];
      expect(rows.length > 4).toBe(true);
      const open = rows.filter((d) => d.open).map((d) => d.querySelector('summary h3').dataset.section);
      expect(open).toEqual(['score']);
      for (const d of rows) expect(d.querySelector('summary h3') !== null).toBe(true);
      r.store.set({ sheet: null });
      r.store.set(openSheet(r.store.get(), 'summary', 'employment'));
      const named = [...r.root.querySelectorAll('details.sum-section')].filter((d) => d.open).map((d) => d.querySelector('summary h3').dataset.section);
      expect(named).toEqual(['employment']);
    } finally { r.cleanup(); }
  });
  it('S8: the wide layout keeps the City summary open as before', () => {
    const r = rig('wide');
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(r.root.querySelectorAll('details.sum-section').length).toBe(0);
    } finally { r.cleanup(); }
  });
});
