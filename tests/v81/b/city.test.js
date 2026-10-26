// Version 8.1 Track B: the City page, the papyrus's second tab (ruling 1226). The papyrus opens Messages; a City tab beside it opens the city's figures and its
// last year, read from the sim's own month-end record (world.history, saved with the city), so it survives a reload with no new save version.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { T } from '../../../src/ui/text.js';
import { V81_B_TEXT as B } from '../../../src/ui/v81/bText.js';
import { trendSection } from '../../../src/ui/v81/stats.js';
import { HISTORY_MONTHS, WORLD_VERSION } from '../../../src/sim/world.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { makeTestWorld } from '../../helpers/testWorld.js';

const click = (n) => fire(n, 'click', { detail: 1 });
const tabs = (root) => [...root.querySelectorAll('#sheet .sheet-tabs .sheet-tab')];

describe('v81 b city page: the papyrus opens Messages, with the City tab beside it', () => {
  it('opens Messages on the papyrus, and the City tab opens the city summary, and back', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.refresh();
      click(r.root.querySelector('#topbar .advice'));
      expect([r.store.get().sheet.kind, tabs(r.root).map((t) => [t.textContent, t.getAttribute('aria-selected')])]).toEqual(['advice', [[B.tabMessages, 'true'], [B.tabCity, 'false']]]);
      for (const t of tabs(r.root)) { const q = t.getBoundingClientRect(); expect([t.textContent, t.getAttribute('role'), Math.round(q.height) >= 44, Math.round(q.width) >= 44]).toEqual([t.textContent, 'tab', true, true]); }
      click(tabs(r.root)[1]);
      expect([r.store.get().sheet.kind, tabs(r.root)[1].getAttribute('aria-selected'), r.root.querySelector('#sheet').textContent.includes(T.incomeVsSpending)]).toEqual(['summary', 'true', true]);
      expect(r.root.querySelector('#sheet [data-section="trend"]').textContent).toBe(B.trendHead);
      click(tabs(r.root)[0]);
      expect(r.store.get().sheet.kind).toBe('advice');
      expect(r.root.querySelectorAll('#sheet').length).toBe(1);
    } finally { r.cleanup(); }
  });
  it('lists income and spending, people and jobs, mood causes, food and goods on the City page', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      advanceDays(r.world, 31);
      r.ui.refresh();
      click(r.root.querySelector('#topbar .advice'));
      click(tabs(r.root)[1]);
      const t = r.root.querySelector('#sheet').textContent;
      for (const head of [T.incomeVsSpending, T.employment, T.moodBreakdown, T.foodInStore, T.goodsLastMonth, B.trendHead]) expect([head, t.includes(head)]).toEqual([head, true]);
    } finally { r.cleanup(); }
  });
});

describe('v81 b city page: the last year, from the sim\'s month-end record', () => {
  it('draws gold, people and mood as lines from world.history, with the first and last values in words', () => {
    const w = makeTestWorld();
    w.history = [];
    for (let i = 0; i < 5; i++) w.history.push({ day: (i + 1) * 30, people: 10 * i, gold: 1000 + 100 * i, mood: 50 + i });
    const host = document.createElement('div');
    host.append(...trendSection(w));
    const rows = [...host.querySelectorAll('.trend')];
    expect(rows.map((x) => x.getAttribute('aria-label'))).toEqual([B.trendLabel(T.gold, 1000, 1400, 5), B.trendLabel(T.people, 0, 40, 5), B.trendLabel(T.mood, 50, 54, 5)]);
    expect(rows.map((x) => x.querySelector('polyline').getAttribute('points').split(' ').length)).toEqual([5, 5, 5]);
    expect(host.textContent).toContain(B.trendNote(5));
  });
  it('says the trend starts at the first month\'s end when there is no row yet, and keeps HISTORY_MONTHS rows as the sim does', () => {
    const w = makeTestWorld();
    w.history = [];
    const host = document.createElement('div');
    host.append(...trendSection(w));
    expect([host.querySelector('.trend-none').textContent, host.querySelectorAll('.trend').length]).toEqual([B.trendNone, 0]);
    advanceDays(w, 30 * (HISTORY_MONTHS + 2));
    const again = document.createElement('div');
    again.append(...trendSection(w));
    expect([w.history.length, again.querySelector('.trend polyline').getAttribute('points').split(' ').length]).toEqual([HISTORY_MONTHS, HISTORY_MONTHS]);
  });
  it('needs no new save version: the record is already in the world (v10)', () => {
    expect(WORLD_VERSION).toBe(10);
  });
});
