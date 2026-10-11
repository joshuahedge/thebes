import { describe, it, expect } from '../harness.js';
import { createHud, summaryData } from '../../src/ui/hud.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { advanceDays } from '../../src/sim/clock.js';
import { mount, fire } from '../helpers/dom.js';
import { T, shortDateText } from '../../src/ui/text.js';
import { rigUI } from '../helpers/uiWorld.js';
import { housesOf } from '../../src/sim/world.js';

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
  // The top bar's numbers, measured on the mounted shell: how many rows they take, and whether each is whole inside the
  // bar (not cut off by it) with the bar no taller than its own height (so #under-bar, set below it, never overlaps it).
  // The wide-only numbers are set to a real city's widths too: income from last month's net, jobless from the labour
  // count, and months of food from the grain in store against the homes' need.
  async function topBar(w, h, size, { gold, people, day, income, jobless, food }) {
    const r = await rigUI({ width: w, height: h });
    try {
      r.ui.settings.set({ textSize: size });
      r.world.gold = gold;
      const [a, b] = housesOf(r.world);
      a.residents = people - 4;
      b.residents = 4;
      a.tier = 3; b.tier = 3;                                                  // Cottages: homes that eat
      r.world.day = day;
      r.world.stats.lastMonth = { taxes: income, wages: 0, upkeep: 0, net: income };
      r.world.labour = { ...r.world.labour, workforce: 100 + jobless, employed: 100 };
      const stores = Object.values(r.world.buildings).filter((x) => x.type === 'granary' || x.type === 'bazaar');
      for (const st of stores) st.store = {};
      stores[0].store = { grain: Math.round(food * summaryData(r.world).foodNeed) };
      r.ui.refresh();
      expect([w, size, summaryData(r.world).monthsOfFood]).toEqual([w, size, food]);
      const bar = r.root.querySelector('#topbar').getBoundingClientRect();
      const stats = r.root.querySelector('#topbar .stats');
      const box = stats.getBoundingClientRect();
      const shown = [...stats.querySelectorAll('.stat')].filter((st) => getComputedStyle(st).display !== 'none');   // wide-only numbers hide on a phone
      const cut = shown.filter((st) => {
        const q = st.getBoundingClientRect();
        return !(q.left >= box.left - 0.5 && q.right <= box.right + 0.5 && q.top >= bar.top - 0.5 && q.bottom <= bar.bottom + 0.5);
      }).map((st) => st.textContent);
      return {
        rows: new Set(shown.map((st) => Math.round(st.getBoundingClientRect().top))).size,
        cut, overflow: stats.scrollWidth > stats.clientWidth || stats.scrollHeight > stats.clientHeight + 1,
        clear: bar.bottom <= r.root.querySelector('#under-bar').getBoundingClientRect().top,
        menuIn: r.root.querySelector('#topbar .menu').getBoundingClientRect().right <= bar.right,
      };
    } finally { r.cleanup(); }
  }
  // A city in its second year, as the sample city reads: "Gold 2493 People 317 Mood 60 Y2 M1 Income +233 Jobless 72 Food 7.3 mo".
  const TYPICAL = { gold: 2493, people: 317, day: 360, income: 233, jobless: 72, food: 7.3 };
  const BIG = { gold: 123456, people: 1317, day: 11 * 360 + 300, income: -1234, jobless: 312, food: 12.5 };   // six-figure gold, a two-figure year
  it('keeps the numbers on one row at 100% text, on a phone as on every wide screen, each one whole', async () => {
    for (const [w, h] of [[360, 640], [390, 844], [844, 390], [740, 360], [900, 560], [920, 560], [1000, 600], [1024, 768], [1280, 800]]) {
      const m = await topBar(w, h, 100, TYPICAL);
      expect([w, h, m.rows, m.cut, m.overflow, m.clear]).toEqual([w, h, 1, [], false, true]);
    }
  });
  it('wraps the numbers to a second row only where they would be cut off, never a third, and always inside the bar', async () => {
    const sizes = [[360, 640], [390, 844], [844, 390], [900, 560], [1024, 768], [1280, 800]];
    for (const [w, h] of sizes) {
      for (const size of [100, 125, 150]) {
        for (const [name, nums] of [['typical', TYPICAL], ['big', BIG]]) {
          const m = await topBar(w, h, size, nums);
          const at = `${w}x${h} at ${size}%, ${name}`;
          expect([at, m.rows <= 2, m.cut, m.overflow, m.clear, m.menuIn]).toEqual([at, true, [], false, true, true]);
        }
      }
    }
    expect((await topBar(360, 640, 150, TYPICAL)).rows).toBe(2);                // the narrowest phone at the largest text: two rows, not a cut-off
    const wide = await topBar(900, 560, 150, TYPICAL);                          // the narrowest wide screen at the largest text
    expect([wide.rows <= 2, wide.clear]).toEqual([true, true]);
  });
  it('reads the date short in the wide layout under 1000 px wide or at 150% text, so the numbers of a real city keep to one row', async () => {
    for (const [w, h, size, long] of [[900, 560, 100, false], [920, 560, 100, false], [999, 600, 100, false], [1000, 600, 100, true], [1280, 800, 125, true], [1280, 800, 150, false]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.ui.settings.set({ textSize: size });
        r.world.day = 360;
        r.ui.refresh();
        expect([w, size, r.root.querySelector('#topbar .stat.date .value').textContent]).toEqual([w, size, long ? 'Year 2, month 1, day 1' : 'Y2 M1']);
      } finally { r.cleanup(); }
    }
    for (const [w, h] of [[900, 560], [920, 560], [1000, 600]]) {
      const m = await topBar(w, h, 100, TYPICAL);
      expect([w, h, m.rows, m.cut, m.clear]).toEqual([w, h, 1, [], true]);       // "Food 7.3 mo" stays on the first row, the bar above the goals strip
    }
  });
  it('reads the date short on a phone, and in the wide layout only where shortDate() asks (150% text)', () => {
    const { root, cleanup } = mount();
    try {
      const w = town();
      w.day = 360;
      let short = false;
      const hud = createHud({ world: w, store: createStore({ ...INITIAL_UI_STATE, layout: 'wide' }), container: root, shortDate: () => short });
      expect(root.querySelector('.stat.date .value').textContent).toBe('Year 2, month 1, day 1');
      short = true;
      hud.render();
      expect(root.querySelector('.stat.date .value').textContent).toBe(shortDateText({ year: 2, month: 1 }));
      expect(shortDateText({ year: 2, month: 1 })).toBe('Y2 M1');
    } finally { cleanup(); }
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
