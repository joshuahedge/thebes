import { describe, it, expect } from '../harness.js';
import { createHud, summaryData } from '../../src/ui/hud.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { advanceDays } from '../../src/sim/clock.js';
import { mount, fire } from '../helpers/dom.js';
import { T } from '../../src/ui/text.js';

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
