import { describe, it, expect } from '../harness.js';
import { createSidePanel } from '../../src/ui/sidePanel.js';
import { createRail } from '../../src/ui/rail.js';
import { createCorners } from '../../src/ui/corners.js';
import { createSpeedControl } from '../../src/ui/speed.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { startTool, openSheet } from '../../src/ui/modes.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

describe('ui panels', () => {
  it('side panel: tabs pick the category, the grid shows cards, the fold button folds', () => {
    const { root, cleanup } = mount();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'wide' });
    const picked = [];
    const panel = createSidePanel({ container: root, store, world: makeTestWorld(), onPick: (i) => picked.push(i) });
    const tabs = root.querySelectorAll('.tab');
    expect(tabs.length).toBe(5);                                   // categories with no card to show are hidden
    fire(tabs[4], 'click');
    expect(store.get().category).toBe('services');
    expect(tabs[4].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.cards .card').length).toBe(5);
    fire(root.querySelectorAll('.cards .card')[2], 'click');
    expect(picked).toEqual(['temple']);
    fire(root.querySelector('.fold'), 'click');
    expect(store.get().panelFolded).toBe(true);
    expect(document.body.classList.contains('panel-folded')).toBe(true);
    fire(root.querySelector('.fold'), 'click');
    expect(document.body.classList.contains('panel-folded')).toBe(false);
    expect(panel.details.classList.contains('details')).toBe(true);
    cleanup();
  });
  it('side panel: five tabs on one row at 100% text, and an open sheet below the tabs at any text size', async () => {
    for (const [width, height] of [[1024, 768], [1280, 800]]) {
      const r = await rigUI({ width, height });
      try {
        expect(r.store.get().layout).toBe('wide');
        const tabs = () => [...r.root.querySelectorAll('#panel .tab')].map((t) => t.getBoundingClientRect());
        expect(tabs().length).toBe(5);
        expect([width, new Set(tabs().map((t) => t.top)).size]).toEqual([width, 1]);   // one row
        for (const size of [100, 125, 150]) {
          r.ui.settings.set({ textSize: size });
          r.store.set(openSheet(r.store.get(), 'summary'));                 // a sheet tall enough to reach its full height
          const top = r.root.querySelector('#sheet').getBoundingClientRect().top;
          const rows = new Set(tabs().map((t) => t.top)).size;
          for (const t of tabs()) expect([`${width} at ${size}%, ${rows} rows`, t.bottom <= top + 0.5]).toEqual([`${width} at ${size}%, ${rows} rows`, true]);
          r.store.set({ sheet: null });
        }
      } finally { r.cleanup(); }
    }
  });
  it('rail: category icons open and close the drawer, and the rail holds no tick or cross (the confirm bar has them)', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld({ gold: 1000 });
    setRoad(world, 0, 10, 31, 10);
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'compact' });
    const placement = createPlacement({ world, store });
    const log = [];
    createRail({ container: root, store, world, onPick: (i) => log.push(i) });
    const cats = root.querySelectorAll('.cat');
    expect(cats.length).toBe(5);
    expect(root.querySelector('.drawer').hidden).toBe(true);
    fire(cats[1], 'click');
    expect(root.querySelector('.drawer').hidden).toBe(false);
    expect(root.querySelectorAll('.drawer .card').length).toBe(3);   // plots, garden, statue (locked until Town)
    fire(cats[1], 'click');
    expect(root.querySelector('.drawer').hidden).toBe(true);
    placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    expect([root.querySelector('.bottom'), root.querySelector('.ok'), root.querySelector('.cancel')]).toEqual([null, null, null]);   // a tool's x and tick are the confirm bar's (ruling 173)
    expect(log).toEqual([]);
    placement.cancel();
    fire(cats[1], 'click');
    expect(root.querySelector('.drawer').hidden).toBe(false);
    placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    expect(root.querySelector('.drawer').hidden).toBe(true);
    placement.cancel();
    expect(root.querySelector('.drawer').hidden).toBe(false);
    expect(store.get().dock).toBe('tray');
    store.set(openSheet(store.get(), 'menu'));
    expect(root.querySelector('.drawer').hidden).toBe(true);
    cleanup();
  });
  it('corners: speed on the left, minimap with a badge and overlay on the right', () => {
    const { root, cleanup } = mount();
    const store = createStore(INITIAL_UI_STATE);
    const world = makeTestWorld();
    let alerts = 0;
    const log = [];
    const corners = createCorners({ container: root, store, speedControl: createSpeedControl({ world, store }), onMinimap: () => log.push('minimap'), onOverlay: () => log.push('overlay'), alertCount: () => alerts });
    expect(root.querySelector('.left .speed-main')).toBeTruthy();
    expect(root.querySelector('.badge').hidden).toBe(true);
    alerts = 3;
    corners.render();
    expect(root.querySelector('.badge').hidden).toBe(false);
    expect(root.querySelector('.badge').textContent).toBe('3');
    alerts = 1;
    corners.render();
    const label = root.querySelector('.minimap-button').getAttribute('aria-label');
    expect(label).toContain('1 alert');
    expect(label.includes('1 alerts')).toBe(false);
    alerts = 3;
    corners.render();
    expect(root.querySelector('.minimap-button').getAttribute('aria-label')).toContain('3 alerts');
    fire(root.querySelector('.minimap-button'), 'click');
    fire(root.querySelector('.overlay-button'), 'click');
    expect(log).toEqual(['minimap', 'overlay']);
    store.set({ overlay: 'water' });
    expect(root.querySelector('.overlay-button').getAttribute('aria-pressed')).toBe('true');
    cleanup();
  });
});
