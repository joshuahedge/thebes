import { describe, it, expect } from '../harness.js';
import { createHud, summaryData } from '../../src/ui/hud.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { advanceDays } from '../../src/sim/clock.js';
import { mount, fire } from '../helpers/dom.js';
import { T } from '../../src/ui/text.js';
import { rigUI } from '../helpers/uiWorld.js';

function town(opts) {
  const w = makeTestWorld(opts);
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { grain: 2 } });
  addRaw(w, 'granary', 14, 11, { store: { grain: 30 } });
  addRaw(w, 'bazaar', 17, 11, { store: { grain: 6 } });
  staffAll(w);
  return w;
}

describe('ui hud', () => {
  it('summarises the city numbers', () => {
    const w = town();
    let d = summaryData(w);
    expect(d.people).toBe(12);
    expect(d.foodStored).toBe(36);
    expect(d.foodNeed).toBe(3);
    expect(d.monthsOfFood).toBe(12);
    expect(d.net).toBe(0);
    advanceDays(w, 30);
    d = summaryData(w);
    expect(d.taxes).toBeGreaterThan(0);
    expect(typeof d.net).toBe('number');
    expect(d.workforce).toBe(w.labour.workforce);
    expect(d.jobless).toBe(w.labour.workforce - w.labour.employed);
    expect(summaryData(makeTestWorld()).monthsOfFood).toBe(null);
  });
  it('shows every number whole inside the bar on a narrow phone at large text, wrapping to a second row within its height', async () => {
    const clipped = [];
    for (const [w, h] of [[360, 640], [390, 844], [640, 360], [1280, 800]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          r.world.gold = 123456;                                                // wide numbers: six-figure gold, a two-figure year
          r.world.day = 11 * 360 + 300;
          r.ui.refresh();
          const bar = r.root.querySelector('#topbar').getBoundingClientRect();
          const stats = r.root.querySelector('#topbar .stats');
          const box = stats.getBoundingClientRect();
          const under = r.root.querySelector('#under-bar').getBoundingClientRect();
          for (const stat of stats.querySelectorAll('.stat')) {
            if (getComputedStyle(stat).display === 'none') continue;             // the wide-only numbers in portrait and compact
            const s = stat.getBoundingClientRect();
            const inside = s.left >= box.left - 0.5 && s.right <= box.right + 0.5 && s.top >= bar.top - 0.5 && s.bottom <= bar.bottom + 0.5 && s.bottom <= box.bottom + 0.5;
            if (!inside) clipped.push(`${w}x${h} at ${size}%: ${stat.textContent}`);
          }
          expect([w, size, stats.scrollWidth <= stats.clientWidth, stats.scrollHeight <= stats.clientHeight + 1]).toEqual([w, size, true, true]);
          expect([w, size, under.top >= bar.bottom]).toEqual([w, size, true]);    // the bar keeps its height: nothing under it moves
          expect([w, size, r.root.querySelector('#topbar .menu').getBoundingClientRect().right <= bar.right]).toEqual([w, size, true]);
        } finally { r.cleanup(); }
      }
    }
    expect(clipped).toEqual([]);
  });
  it('renders the bar, refreshes numbers and opens the summary and the menu', () => {
    const { root, cleanup } = mount();
    const w = town({ gold: 2000 });
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'wide' });
    const opened = [];
    const speedBar = document.createElement('div');
    const hud = createHud({ world: w, store, container: root, speedBar, onOpenSummary: () => opened.push('summary'), onOpenMenu: () => opened.push('menu') });
    expect(root.textContent).toContain('2000');
    expect(root.textContent).toContain('12');
    const statsBtn = root.querySelector('.stats');
    expect(statsBtn.hasAttribute('aria-label')).toBe(false);
    expect(statsBtn.textContent).toContain('2000');
    expect(statsBtn.textContent).toContain(T.openSummary);
    expect(root.querySelectorAll('.wide-only').length).toBeGreaterThan(0);
    expect(root.contains(speedBar)).toBe(true);
    w.gold = 1234;
    hud.render();
    expect(root.textContent).toContain('1234');
    fire(root.querySelector('.stats'), 'click');
    fire(root.querySelector('.menu'), 'click');
    expect(opened).toEqual(['summary', 'menu']);
    expect(root.querySelector('.menu').getAttribute('aria-label').length).toBeGreaterThan(0);
    cleanup();
  });
});
