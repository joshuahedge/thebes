import { describe, it, expect } from '../harness.js';
import { createSpeedControl } from '../../src/ui/speed.js';
import { createCorners } from '../../src/ui/corners.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { openSheet } from '../../src/ui/modes.js';
import { T, OVERLAY_NAMES, pauseSpeedText, layersText } from '../../src/ui/text.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

const box = (r, sel) => r.root.querySelector(sel).getBoundingClientRect();

describe('ui corner words', () => {
  it('says Play when paused, and the speed with a pause mark when running', () => {
    const { root, cleanup } = mount('<div id="c"></div>');
    try {
      const w = makeTestWorld();
      const ctl = createSpeedControl({ world: w, store: createStore(INITIAL_UI_STATE) });
      ctl.mountCorner(root.querySelector('#c'));
      const main = root.querySelector('.speed-main');
      const parts = () => [main.querySelector('.icon').textContent, main.querySelector('.word').textContent];
      expect(parts()).toEqual(['▶', 'Play']);
      expect(main.getAttribute('aria-label')).toBe(T.play);
      expect(main.querySelector('.icon').getAttribute('aria-hidden')).toBe('true');
      ctl.set(2);
      expect(parts()).toEqual(['❚❚', '2×']);
      expect(main.getAttribute('aria-label')).toBe('Pause, speed 2×');
      expect(pauseSpeedText(3)).toBe('Pause, speed 3×');
      fire(main, 'click');                                                         // a tap pauses
      expect(w.speed).toBe(0);
      expect(main.getAttribute('aria-label')).toBe('Play');
      expect(root.querySelector('.speed-chevron .icon').textContent).toBe('▴');
    } finally { cleanup(); }
  });
  it('labels the map and layers buttons, and the layers word follows the overlay', () => {
    const { root, cleanup } = mount();
    try {
      const store = createStore(INITIAL_UI_STATE);
      const world = makeTestWorld();
      let alerts = 0;
      const corners = createCorners({ container: root, store, speedControl: createSpeedControl({ world, store }), onMinimap() {}, onOverlay() {}, alertCount: () => alerts });
      const map = root.querySelector('.minimap-button'), layers = root.querySelector('.overlay-button');
      expect([map.querySelector('.label').textContent, map.getAttribute('aria-label')]).toEqual(['Map', 'Map']);
      expect([layers.querySelector('.label').textContent, layers.getAttribute('aria-label')]).toEqual(['Layers', 'Layers']);
      store.set({ overlay: 'water' });
      expect(layers.querySelector('.label').textContent).toBe(OVERLAY_NAMES.water);
      expect(layers.getAttribute('aria-label')).toBe('Layers: Water');
      expect(layers.getAttribute('aria-pressed')).toBe('true');
      expect(layersText('religion')).toBe('Layers: Religion');
      store.set({ overlay: null });
      expect(layers.querySelector('.label').textContent).toBe(T.layers);
      expect(layers.getAttribute('aria-pressed')).toBe('false');
      alerts = 2;
      corners.render();
      expect(map.getAttribute('aria-label')).toBe('Map, 2 alerts');
      expect(map.querySelector('.badge').textContent).toBe('2');
    } finally { cleanup(); }
  });
  it('keeps the corner buttons tappable and apart at 150% text, and clear of the compact column', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.ui.speedControl.set(3);
      r.store.set({ overlay: 'religion' });                                       // the longest overlay word
      const left = box(r, '#corners .left'), right = box(r, '#corners .right'), shell = r.root.getBoundingClientRect();
      expect(left.right).toBeLessThanOrEqual(right.left);
      expect(left.left).toBeGreaterThanOrEqual(shell.left);
      expect(right.right).toBeLessThanOrEqual(shell.right);
      for (const sel of ['.speed-main', '.speed-chevron', '.minimap-button', '.overlay-button']) {
        const b = box(r, `#corners ${sel}`);
        expect([sel, b.width >= 44, b.height >= 44]).toEqual([sel, true, true]);
      }
      expect(parseFloat(getComputedStyle(r.root.querySelector('#corners .overlay-button .label')).fontSize)).toBeGreaterThanOrEqual(12);
    } finally { r.cleanup(); }
    const c = await rigUI({ width: 844, height: 390 });                          // compact: drawer, bar and sheets share the column by the rail
    try {
      c.ui.placement.start({ kind: 'building', type: 'well' }, { x: 14, y: 9 });
      expect(box(c, '#corners .right').right).toBeLessThanOrEqual(box(c, '#confirm').left + 0.5);
      c.ui.placement.cancel();
      fire(c.root.querySelector('#rail .cat[data-category="services"]'), 'click');
      expect(c.root.querySelector('#rail .drawer').hidden).toBe(false);
      expect(box(c, '#corners .right').right).toBeLessThanOrEqual(box(c, '#rail .drawer').left + 0.5);
      c.store.set(openSheet(c.store.get(), 'summary'));
      expect(box(c, '#corners .right').right).toBeLessThanOrEqual(box(c, '#sheet').left + 0.5);
    } finally { c.cleanup(); }
  });
});
