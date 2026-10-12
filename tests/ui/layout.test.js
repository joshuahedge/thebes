import { describe, it, expect } from '../harness.js';
import { pickLayout, applyLayout, watchLayout } from '../../src/ui/layout.js';
import { mount } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';
import { measureRows } from '../../src/dev/scenes.js';
import { settle } from '../../src/sim/settle.js';
import { buildingAt } from '../../src/sim/world.js';
import { select, back } from '../../src/ui/modes.js';
import { TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { CHEER_HELD_MAX_MS } from '../../src/data/ui.js';

describe('ui layout', () => {
  it('picks the layout from the viewport size exactly as spec 6.2 says', () => {
    expect(pickLayout(390, 844)).toBe('portrait');
    expect(pickLayout(899, 1200)).toBe('portrait');
    expect(pickLayout(900, 1200)).toBe('wide');
    expect(pickLayout(1280, 800)).toBe('wide');
    expect(pickLayout(900, 520)).toBe('wide');
    expect(pickLayout(844, 390)).toBe('compact');
    expect(pickLayout(1000, 500)).toBe('compact');
    expect(pickLayout(768, 1024)).toBe('portrait');
  });
  it('writes the layout onto the root element', () => {
    const { root, cleanup } = mount();
    applyLayout(root, 'wide');
    expect(root.dataset.layout).toBe('wide');
    cleanup();
  });
  it('watches a size source and reports changes once each', () => {
    const { root, cleanup } = mount();
    let size = { width: 390, height: 844 };
    const listeners = [];
    const changes = [];
    const stop = watchLayout({
      root, getSize: () => size, onChange: (l) => changes.push(l),
      subscribe: (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); },
    });
    expect(changes).toEqual(['portrait']);
    listeners[0]();
    expect(changes).toEqual(['portrait']);
    size = { width: 1280, height: 800 };
    listeners[0]();
    expect(changes).toEqual(['portrait', 'wide']);
    expect(root.dataset.layout).toBe('wide');
    stop();
    expect(listeners.length).toBe(0);
    cleanup();
  });
});

// Phones held sideways and large text (mobile UX review, ruling 172 and section 4 items 8 and 9; spec 6.3 "Small phones").
describe('ui layout: landscape phones and large text', () => {
  const debt = (r, on) => { r.world.gold = on ? -5 : 500; r.ui.alerts.refresh(); r.frame(); };
  const layers = (r) => Object.keys(measureRows(r.root).layers);
  it('keeps one row under the top bar on a landscape phone at 125% and 150% text: the alert row when there is a banner, else the guidance row', async () => {
    for (const [w, h] of [[844, 390], [667, 375], [390, 844], [375, 667]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          r.store.set({ overlay: 'water' });
          debt(r, true);
          const one = r.store.get().layout === 'compact' && size >= 125;
          const at = `${w}x${h} at ${size}%`;
          expect([at, layers(r), document.body.dataset.guidance]).toEqual([at, one ? ['alert'] : ['alert', 'legend'], one ? 'none' : 'legend']);
          expect([at, measureRows(r.root).rowsEnd <= h * 0.4]).toEqual([at, true]);
          debt(r, false);
          expect([at, layers(r)]).toEqual([at, ['legend']]);                   // no banner: the guidance row has the one row
          r.store.set({ overlay: null }); r.frame();
          expect([at, layers(r)]).toEqual([at, ['goal']]);
          debt(r, true);
          expect([at, layers(r)]).toEqual([at, one ? ['alert'] : ['alert', 'goal']]);
        } finally { r.cleanup(); }
      }
    }
  });
  it('on a landscape phone at large text, a tip waits while the alert row has the one row and a tip already up steps off the screen; both come back when the banner clears', async () => {
    let t = 0;
    const r = await rigUI({ width: 844, height: 390, now: () => t });
    r.renderer.renderFrame = () => {};
    try {
      r.ui.settings.set({ textSize: 150 });
      settle(r.world, []);
      t = TIP_FIRST_DELAY_MS;
      debt(r, true);
      r.ui.onEvents([{ type: 'month' }]);
      expect([r.ui.tips.current(), document.body.dataset.guidance]).toEqual([null, 'none']);   // the tip waits in the held slot
      debt(r, false);
      expect([r.ui.tips.current(), document.body.dataset.guidance, layers(r)]).toEqual(['month_summary', 'tip', ['tip']]);
      debt(r, true);                                                           // a banner over a tip that is up: off the screen, still current
      expect([r.ui.tips.current(), r.root.querySelector('#tip').children.length, layers(r)]).toEqual(['month_summary', 0, ['alert']]);
      debt(r, false);
      expect([r.ui.tips.current(), layers(r)]).toEqual(['month_summary', ['tip']]);
    } finally { r.cleanup(); }
  });
  it('on a landscape phone at large text, an info caption waits while the alert row has the one row, and one that waits more than 10 s goes to Recent only', async () => {
    let t = 0;
    const r = await rigUI({ width: 667, height: 375, now: () => t });
    r.renderer.renderFrame = () => {};
    try {
      r.ui.settings.set({ textSize: 125 });
      debt(r, true);
      r.ui.celebrations.show({ tier: 'info', text: 'The blaze at the potter is out' });
      expect([r.ui.celebrations.showing(), layers(r)]).toEqual([false, ['alert']]);
      debt(r, false);
      expect([r.ui.celebrations.showing(), document.body.dataset.guidance]).toEqual([true, 'caption']);
      r.ui.celebrations.clear();
      debt(r, true);
      r.ui.celebrations.show({ tier: 'info', text: 'Raiders took 40 gold' });
      t += CHEER_HELD_MAX_MS + 1000;
      r.frame();
      debt(r, false);
      expect([r.ui.celebrations.showing(), r.ui.celebrations.recent()[0].text]).toEqual([false, 'Raiders took 40 gold']);
    } finally { r.cleanup(); }
  });
  it('stops the rows at the left edge of an open sheet on a landscape phone', async () => {
    for (const [w, h] of [[844, 390], [667, 375]]) {
      for (const size of [100, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          debt(r, true);
          r.store.set(select(r.store.get(), buildingAt(r.world, 12, 9).id));
          r.frame();
          const m = measureRows(r.root), bar = r.root.querySelector('#under-bar').getBoundingClientRect();
          const at = `${w}x${h} at ${size}%`;
          expect([at, Object.keys(m.layers), bar.right - r.root.getBoundingClientRect().left <= m.sheet.left]).toEqual([at, ['alert'], true]);
          r.store.set(back(r.store.get())); r.frame();
          expect([at, r.root.querySelector('#under-bar').getBoundingClientRect().right > bar.right]).toEqual([at, true]);   // the rows have the map's width again
        } finally { r.cleanup(); }
      }
    }
  });
});

