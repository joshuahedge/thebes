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
  it('keeps the speed button one width, so the chevron stays put between Play and every speed', async () => {
    for (const [w, h] of [[360, 640], [390, 844], [640, 360], [844, 390]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          const xs = [];
          for (const speed of [0, 1, 2, 3, 0]) {
            r.ui.speedControl.set(speed);
            xs.push(Math.round(box(r, '#corners .speed-chevron').left * 2) / 2);
          }
          expect([w, h, size, new Set(xs).size]).toEqual([w, h, size, 1]);
          const face = box(r, '#corners .speed-main .face'), main = box(r, '#corners .speed-main');
          expect([w, h, size, face.right <= main.right, face.left >= main.left]).toEqual([w, h, size, true, true]);   // the words fit inside it
        } finally { r.cleanup(); }
      }
    }
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
  it('keeps the two corner groups apart beside the open drawer on a phone held sideways under 700 px, at larger text', async () => {
    for (const [w, h] of [[667, 375], [640, 360]]) {
      for (const size of [125, 150]) {
        for (const speed of [0, 3]) {
          const r = await rigUI({ width: w, height: h });
          try {
            r.ui.settings.set({ textSize: size });
            if (speed) r.ui.speedControl.set(speed);                              // "❚❚ 3×" as well as "▶ Play"
            r.store.set({ overlay: 'religion' });                                 // the longest overlay word
            fire(r.root.querySelector('#rail .cat[data-category="services"]'), 'click');
            expect(r.root.querySelector('#rail .drawer').hidden).toBe(false);
            expect(document.body.classList.contains('narrow')).toBe(true);
            const left = box(r, '#corners .left'), right = box(r, '#corners .right'), drawer = box(r, '#rail .drawer'), shell = r.root.getBoundingClientRect();
            const at = `${w}x${h} at ${size}%, speed ${speed}`;
            expect([at, left.right + 2 < right.left, right.right <= drawer.left + 0.5, left.left >= shell.left]).toEqual([at, true, true, true]);   // apart, not touching
            expect([at, box(r, '#corners .speed-main').height <= box(r, '#corners .minimap-button').height + 0.5]).toEqual([at, true]);   // Play is not squeezed onto two lines
            for (const sel of ['.speed-main', '.speed-chevron', '.minimap-button', '.overlay-button']) {
              const b = box(r, `#corners ${sel}`);
              expect([at, sel, b.width >= 44, b.height >= 44]).toEqual([at, sel, true, true]);
            }
            for (const [sel, word] of [['.minimap-button', T.mapButton], ['.overlay-button', OVERLAY_NAMES.religion]]) {
              const b = r.root.querySelector(`#corners ${sel}`);
              expect(b.querySelector('.label').getBoundingClientRect().width).toBeLessThan(2);   // the word leaves the screen
              expect(b.querySelector('.label').textContent).toBe(word);
              expect(b.getAttribute('aria-label').startsWith(sel === '.minimap-button' ? T.mapButton : T.layers)).toBe(true);   // and stays in the name
            }
            expect(box(r, '#corners .speed-main .word').width).toBeGreaterThan(2);   // Play keeps its word
          } finally { r.cleanup(); }
        }
      }
    }
    for (const [w, h, size] of [[740, 360, 150], [640, 360, 100]]) {             // wider, or at the body text size, the words stay
      const r = await rigUI({ width: w, height: h });
      try {
        r.ui.settings.set({ textSize: size });
        fire(r.root.querySelector('#rail .cat[data-category="services"]'), 'click');
        expect([w, size, box(r, '#corners .minimap-button .label').width > 2]).toEqual([w, size, true]);
        expect([w, size, box(r, '#corners .left').right <= box(r, '#corners .right').left]).toEqual([w, size, true]);
      } finally { r.cleanup(); }
    }
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
