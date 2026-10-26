// Version 8.1 Track B: the top bar as drawn pictures with states and one size of number (rulings 1220, 1223, 1227), and each stat's explainer (ruling 1225).
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { mount, fire, key } from '../../helpers/dom.js';
import { createHud } from '../../../src/ui/hud.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { housesOf } from '../../../src/sim/world.js';
import { monthForecast } from '../../../src/sim/economy.js';
import { MOOD } from '../../../src/data/mood.js';
import { MOOD_NAMES } from '../../../src/ui/text.js';
import { V81_B_TEXT as B, moodFace } from '../../../src/ui/v81/bText.js';
import { STAT_KINDS, explainStat, compact } from '../../../src/ui/v81/stats.js';
import { goldPile } from '../../../src/ui/v81/statIcons.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

const TYPICAL = { gold: 2493, people: 317, day: 360 };
const BIG = { gold: 123456, people: 1317, day: 11 * 360 + 300 };
function setNumbers(r, { gold, people, day }) {
  r.world.gold = gold;
  const [a, b] = housesOf(r.world);
  a.residents = people - 4; b.residents = 4; a.tier = 3; b.tier = 3;
  r.world.day = day;
}
const statOf = (root, kind) => root.querySelector(`#topbar .stat.${kind}`);
const shown = (root) => [...root.querySelectorAll('#topbar .stats .stat')].filter((s) => !s.hidden && getComputedStyle(s).display !== 'none');

function town() {
  const w = makeTestWorld({ gold: 2000 });
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { grain: 2 } });
  addRaw(w, 'granary', 14, 11, { store: { grain: 30 } });
  addRaw(w, 'bazaar', 17, 11, { store: { grain: 6 } });
  staffAll(w);
  return w;
}

describe('v81 b top bar: pictures with states and one size of number (rulings 1220, 1223)', () => {
  it('makes each stat a 44 px button with its lock id, a drawn picture hidden from screen readers and a name that says the number and its state', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      setNumbers(r, TYPICAL);
      r.ui.refresh();
      for (const kind of STAT_KINDS) {
        const b = statOf(r.root, kind), q = b.getBoundingClientRect();
        expect([kind, b.tagName, b.dataset.lock, b.querySelector('svg').getAttribute('aria-hidden'), Math.round(q.width) >= 44, Math.round(q.height) >= 44, b.getAttribute('aria-label').startsWith(B.names[kind])]).toEqual([kind, 'BUTTON', `stat-${kind}`, 'true', true, true, true]);
      }
      expect(statOf(r.root, 'gold').getAttribute('aria-label')).toContain('2493');
      expect(statOf(r.root, 'date').getAttribute('aria-label')).toContain('Year 2, month 1, day 1');   // the phone shows "M1"; the name says the whole date
      expect([r.root.querySelector('#topbar .advice').dataset.lock, r.root.querySelector('#topbar .menu').dataset.lock]).toEqual(['papyrus', 'menu']);
      expect([...r.root.querySelectorAll('#corners [data-lock="speed"]')].length >= 2).toBe(true);   // the corner's main button and chevron
    } finally { r.cleanup(); }
    const wide = await rigUI({ width: 1280, height: 800 });
    try {
      const steps = [...wide.root.querySelectorAll('#topbar .speed-step')];
      expect([steps.length, steps.every((s) => s.dataset.lock === 'speed')]).toEqual([4, true]);
    } finally { wide.cleanup(); }
  });
  it('sets every number in one size and weight, with no words beside them, on a phone and on a wide screen at every text size', async () => {
    for (const [w, h] of [[390, 844], [375, 667], [1280, 800]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          setNumbers(r, TYPICAL);
          r.ui.refresh();
          const values = shown(r.root).map((s) => s.querySelector('.value'));
          const looks = new Set(values.map((v) => { const c = getComputedStyle(v); return `${c.fontSize}/${c.fontWeight}`; }));
          const words = [...r.root.querySelectorAll('#topbar .stats *')].filter((n) => n.children.length === 0 && n.textContent.trim() && n.getBoundingClientRect().width > 1 && !n.classList.contains('value'));
          expect([w, size, looks.size, words.map((n) => n.textContent)]).toEqual([w, size, 1, []]);
          expect(r.root.querySelector('#topbar .forecast, #topbar .season, #topbar .score-chip')).toBe(null);   // the second lines and the chip are gone
        } finally { r.cleanup(); }
      }
    }
  });
  it('keeps one row inside the bar at 375 px and 150% text with room to spare, and fits a big city without cutting a number off', async () => {
    for (const [w, h] of [[360, 640], [375, 667], [390, 844], [667, 375], [844, 390], [1024, 768], [1280, 800]]) {
      for (const size of [100, 125, 150]) {
        for (const [name, nums] of [['typical', TYPICAL], ['big', BIG]]) {
          const r = await rigUI({ width: w, height: h });
          try {
            r.ui.settings.set({ textSize: size });
            setNumbers(r, nums);
            r.ui.refresh();
            const bar = r.root.querySelector('#topbar').getBoundingClientRect(), stats = r.root.querySelector('#topbar .stats'), box = stats.getBoundingClientRect();
            const list = shown(r.root), rows = new Set(list.map((s) => Math.round(s.getBoundingClientRect().top))).size;
            const cut = list.filter((s) => { const q = s.getBoundingClientRect(); return q.left < box.left - 0.5 || q.right > box.right + 0.5 || q.top < bar.top - 0.5 || q.bottom > bar.bottom + 0.5; }).map((s) => s.className);
            const at = `${w}x${h} ${size}% ${name}`;
            expect([at, rows, cut, stats.scrollWidth <= stats.clientWidth + 1, bar.bottom <= r.root.querySelector('#under-bar').getBoundingClientRect().top]).toEqual([at, 1, [], true, true]);
            if (w === 375 && size === 150 && name === 'typical') {
              const used = list.reduce((s, x) => s + x.getBoundingClientRect().width, 0);
              expect([at, stats.classList.contains('squeeze'), box.width - used >= 8]).toEqual([at, false, true]);   // room to spare, unsqueezed
            }
          } finally { r.cleanup(); }
        }
      }
    }
  });
  it('draws the gold as a pile that grows with the treasury and turns amber with a falling mark, said in words, when the month\'s balance is negative', () => {
    const { root, cleanup } = mount();
    try {
      const w = town();
      const hud = createHud({ world: w, store: createStore({ ...INITIAL_UI_STATE, layout: 'portrait' }), container: root });
      const gold = () => root.querySelector('.stat.gold');
      for (const g of [40, 400, 2000, 9000]) { w.gold = g; hud.render(); expect([g, gold().querySelector('svg').querySelectorAll('.coin').length]).toEqual([g, goldPile(g)]); }
      expect([goldPile(40), goldPile(9000)]).toEqual([1, 4]);
      w.gold = 2000;
      w.stats.lastMonth = { taxes: 0, wages: 0, upkeep: 0, net: 0 };
      hud.render();
      const f = monthForecast(w);
      expect(gold().classList.contains('falling')).toBe(f.active && f.net < 0);
      // Make the month's balance negative: every building costs, nobody pays.
      for (const h of housesOf(w)) h.residents = 0;
      hud.render();
      const g = monthForecast(w);
      expect([g.net < 0, gold().classList.contains('falling'), gold().querySelector('svg').dataset.state.endsWith('-falling'), Boolean(gold().querySelector('svg .mark')), gold().getAttribute('aria-label').includes(B.goldFalling) || gold().getAttribute('aria-label').includes('runs out')]).toEqual([true, true, true, true, true]);
    } finally { cleanup(); }
  });
  it('gives the mood face four states from the sim\'s own thresholds, each a different mouth and said in words', () => {
    const { root, cleanup } = mount();
    try {
      const w = town();
      const hud = createHud({ world: w, store: createStore({ ...INITIAL_UI_STATE, layout: 'portrait' }), container: root });
      const seen = [];
      for (const [m, face] of [[MOOD.departuresBelow - 1, 'leaving'], [MOOD.departuresBelow, 'uneasy'], [MOOD.base - 1, 'uneasy'], [MOOD.base, 'content'], [MOOD.base + 20, 'joyful']]) {
        w.mood = m;
        hud.render();
        const b = root.querySelector('.stat.mood');
        expect([m, moodFace(m), b.querySelector('svg').dataset.state, b.getAttribute('aria-label').includes(B.faceWords[face])]).toEqual([m, face, face, true]);
        seen.push(b.querySelector('svg .mouth').getAttribute('d'));
      }
      expect(new Set(seen).size).toBe(4);
    } finally { cleanup(); }
  });
  it('compacts only numbers past four digits, and the name always says the whole number', () => {
    expect([compact(2493), compact(9999), compact(12500), compact(123456), compact(2500000)]).toEqual(['2493', '9999', '12.5k', '123k', '2.5M']);
  });
});

describe('v81 b explainers: tap a stat (ruling 1225)', () => {
  function rig() {
    const { root, cleanup } = mount();
    const w = town();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait' });
    const did = [];
    const hud = createHud({ world: w, store, container: root, onOpenSummary: (s) => did.push(`summary:${s}`), explain: { advice: { fix: (a) => did.push(`fix:${a.key}`), showMe: (t) => did.push(`show:${t.item}`) }, selectBuilding: (id) => did.push(`select:${id}`) } });
    return { root, w, store, hud, did, cleanup: () => { hud.destroy(); cleanup(); } };
  }
  const pop = (root) => root.querySelector('.stat-explainer');
  it('opens a small dialog under the stat on a tap, and closes it on a second tap, a tap elsewhere or Esc', () => {
    const r = rig();
    try {
      const gold = r.root.querySelector('.stat.gold');
      fire(gold, 'click', { detail: 1 });
      expect([pop(r.root).hidden, pop(r.root).getAttribute('role'), gold.getAttribute('aria-expanded'), pop(r.root).dataset.kind]).toEqual([false, 'dialog', 'true', 'gold']);
      fire(gold, 'click', { detail: 1 });
      expect([pop(r.root).hidden, gold.getAttribute('aria-expanded')]).toEqual([true, 'false']);
      fire(gold, 'click', { detail: 1 });
      fire(document.body, 'pointerdown');
      expect(pop(r.root).hidden).toBe(true);
      fire(gold, 'click', { detail: 1 });
      key(document.body, 'Escape');
      expect([pop(r.root).hidden, document.activeElement === gold]).toEqual([true, true]);
      // Another stat's tap moves it there: one explainer at a time.
      fire(gold, 'click', { detail: 1 });
      const mood = r.root.querySelector('.stat.mood');
      fire(mood, 'pointerdown'); fire(mood, 'click', { detail: 1 });
      expect([pop(r.root).dataset.kind, r.root.querySelectorAll('.stat-explainer').length, gold.getAttribute('aria-expanded')]).toEqual(['mood', 1, 'false']);
    } finally { r.cleanup(); }
  });
  it('is one panel at a time: opening it closes a sheet, and a sheet opening closes it', () => {
    const r = rig();
    try {
      r.store.set(openSheet(r.store.get(), 'menu'));
      fire(r.root.querySelector('.stat.people'), 'click', { detail: 1 });
      expect([r.store.get().sheet, pop(r.root).hidden]).toEqual([null, false]);
      r.store.set(openSheet(r.store.get(), 'menu'));
      expect(pop(r.root).hidden).toBe(true);
    } finally { r.cleanup(); }
  });
  it('is keyboard reachable: Enter on a stat opens it with focus on its one action, a 44 px named button', () => {
    const r = rig();
    try {
      const people = r.root.querySelector('.stat.people');
      people.focus();
      fire(people, 'click', { detail: 0 });                                                 // a keyboard press: detail 0
      const act = pop(r.root).querySelector('.explainer-action');
      const q = act.getBoundingClientRect(), c = pop(r.root).querySelector('.explainer-close').getBoundingClientRect();
      expect([document.activeElement === act, act.getAttribute('aria-label').length > 3, Math.round(q.height) >= 44, Math.round(c.width) >= 44, Math.round(c.height) >= 44]).toEqual([true, true, true, true, true]);
    } finally { r.cleanup(); }
  });
  it('says the gold\'s month from the sim\'s forecast, line for line', () => {
    const r = rig();
    try {
      for (const h of housesOf(r.w)) h.residents = 0;                                     // a falling month
      const f = monthForecast(r.w);
      const e = explainStat(r.w, 'gold', {});
      expect(e.lines).toEqual([[B.gold.taxes, B.signed(f.taxes)], [B.gold.wages, B.signed(-f.wages)], [B.gold.upkeep, B.signed(-f.upkeep)], [B.gold.net, B.signed(f.net)]]);
      fire(r.root.querySelector('.stat.gold'), 'click', { detail: 1 });
      const rows = [...pop(r.root).querySelectorAll('.explainer-lines .row')].map((x) => [x.querySelector('dt').textContent, x.querySelector('dd').textContent]);
      expect(rows).toEqual(e.lines);
    } finally { r.cleanup(); }
  });
  it('lists the mood\'s causes from the sim\'s breakdown, the biggest first, and offers the city\'s top advice with Show me', () => {
    const r = rig();
    try {
      r.w.moodBreakdown = { base: MOOD.base, food: -12, jobs: 3, debt: 0 };
      r.w.mood = MOOD.base - 9;
      const e = explainStat(r.w, 'mood', { advice: { fix() {} }, openSummary() {} });
      expect(e.lines).toEqual([[MOOD_NAMES.base, String(MOOD.base)], [MOOD_NAMES.food, '−12'], [MOOD_NAMES.jobs, '+3']]);
      expect(['advice', 'city'].includes(e.action.kind)).toBe(true);
      // With no breakdown it says so instead.
      r.w.moodBreakdown = { base: MOOD.base, food: 0 };
      expect(explainStat(r.w, 'mood', {}).notes).toContain(B.mood.none);
    } finally { r.cleanup(); }
  });
  it('falls back to the City page at the stat\'s section when the city has no advice for it', () => {
    const r = rig();
    try {
      fire(r.root.querySelector('.stat.score'), 'click', { detail: 1 });
      const act = pop(r.root).querySelector('.explainer-action');
      expect([act.dataset.action, act.textContent]).toEqual(['city', B.cityPage]);
      fire(act, 'click', { detail: 1 });
      expect([r.did, pop(r.root).hidden]).toEqual([['summary:score'], true]);
    } finally { r.cleanup(); }
  });
  it('is pinned under the bar beside its stat, inside a 375 px phone, never over the middle of the map', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150 });
      setNumbers(r, TYPICAL);
      r.ui.refresh();
      for (const kind of ['gold', 'mood', 'date']) {
        fire(statOf(r.root, kind), 'click', { detail: 1 });
        const p = r.root.querySelector('#topbar .stat-explainer').getBoundingClientRect(), bar = r.root.querySelector('#topbar').getBoundingClientRect(), shell = r.root.getBoundingClientRect();
        expect([kind, p.top >= bar.bottom - 8, p.left >= shell.left - 0.5, p.right <= shell.right + 0.5, p.top - shell.top < shell.height * 0.2]).toEqual([kind, true, true, true, true]);
        fire(statOf(r.root, kind), 'click', { detail: 1 });
      }
    } finally { r.cleanup(); }
  });
});
