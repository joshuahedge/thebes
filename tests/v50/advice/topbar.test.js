// Version 5.0 Task 1: the top bar with the City advice button (a scroll between the numbers and the menu). It comes with the first home, is a 44x44
// target named "City advice", shows a dot (and says so in its name) while something new is in the top items, and the bar still fits: at 375x667 and
// 390x844 at 100/125/150% text the numbers of a real city keep to one row, every number whole inside the bar, the advice and menu buttons inside the
// bar and the bar clear of the rows under it (the budget the mobile height tests hold).
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { summaryData } from '../../../src/ui/hud.js';
import { housesOf } from '../../../src/sim/world.js';
import { adviceTopKeys } from '../../../src/ui/adviceSheet.js';

async function topBar(w, h, size, { gold, people, day, income, jobless, food }, { dot = false } = {}) {
  const r = await rigUI({ width: w, height: h });
  try {
    r.ui.settings.set({ textSize: size });
    r.world.gold = gold;
    const [a, b] = housesOf(r.world);
    a.residents = people - 4;
    b.residents = 4;
    a.tier = 3; b.tier = 3;
    r.world.day = day;
    r.world.stats.lastMonth = { taxes: income, wages: 0, upkeep: 0, net: income };
    r.world.labour = { ...r.world.labour, workforce: 100 + jobless, employed: 100 };
    const stores = Object.values(r.world.buildings).filter((x) => x.type === 'granary' || x.type === 'bazaar');
    for (const st of stores) st.store = {};
    stores[0].store = { grain: Math.round(food * summaryData(r.world).foodNeed) };
    r.ui.settings.set({ adviceSeen: dot ? [] : adviceTopKeys(r.world) });                  // the sheet last showed these: no dot; or showed nothing: a dot
    r.ui.refresh();
    const bar = r.root.querySelector('#topbar').getBoundingClientRect();
    const stats = r.root.querySelector('#topbar .stats');
    const box = stats.getBoundingClientRect();
    const shown = [...stats.querySelectorAll('.stat')].filter((st) => getComputedStyle(st).display !== 'none');
    const cut = shown.filter((st) => {
      const q = st.getBoundingClientRect();
      return !(q.left >= box.left - 0.5 && q.right <= box.right + 0.5 && q.top >= bar.top - 0.5 && q.bottom <= bar.bottom + 0.5);
    }).map((st) => st.textContent);
    const btn = r.root.querySelector('#topbar .advice');
    const q = btn.getBoundingClientRect(), menu = r.root.querySelector('#topbar .menu').getBoundingClientRect();
    return {
      rows: new Set(shown.map((st) => Math.round(st.getBoundingClientRect().top))).size, cut,
      overflow: stats.scrollWidth > stats.clientWidth || stats.scrollHeight > stats.clientHeight + 1,
      clear: bar.bottom <= r.root.querySelector('#under-bar').getBoundingClientRect().top,
      advice: { hidden: btn.hidden, w: Math.round(q.width), h: Math.round(q.height), inBar: q.right <= bar.right + 0.5 && q.left >= bar.left && q.top >= bar.top - 0.5 && q.bottom <= bar.bottom + 0.5, beforeMenu: q.right <= menu.left + 0.5, name: btn.getAttribute('aria-label'), dot: !btn.querySelector('.advice-dot').hidden },
      menuIn: menu.right <= bar.right + 0.5,
    };
  } finally { r.cleanup(); }
}

const TYPICAL = { gold: 2493, people: 317, day: 360, income: 233, jobless: 72, food: 7.3 };
const BIG = { gold: 123456, people: 1317, day: 11 * 360 + 300, income: -1234, jobless: 312, food: 12.5 };

describe('v50 advice top bar', () => {
  it('holds the numbers on one row (two at 125% text, as before) beside the advice and menu buttons on the phones the budget names', async () => {
    const wrong = [];
    for (const [w, h] of [[360, 640], [375, 667], [390, 844]]) {
      for (const size of [100, 125, 150]) {
        for (const dot of [false, true]) {
          const m = await topBar(w, h, size, TYPICAL, { dot });
          const at = `${w}x${h} ${size}%${dot ? ' dot' : ''}`;
          if (m.rows > (size === 125 ? 2 : 1) || m.cut.length || m.overflow || !m.clear || !m.menuIn || !m.advice.inBar || !m.advice.beforeMenu) wrong.push(`${at}: ${JSON.stringify(m)}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
  it('never takes a third row or cuts a number, even with six-figure gold, wherever the bar is', async () => {
    const wrong = [];
    for (const [w, h] of [[360, 640], [375, 667], [390, 844], [844, 390], [900, 560], [1024, 768], [1280, 800]]) {
      for (const size of [100, 125, 150]) {
        for (const [name, nums] of [['typical', TYPICAL], ['big', BIG]]) {
          const m = await topBar(w, h, size, nums, { dot: true });
          if (m.rows > 2 || m.cut.length || m.overflow || !m.clear || !m.menuIn || !m.advice.inBar || !m.advice.beforeMenu) wrong.push(`${w}x${h} ${size}% ${name}: ${JSON.stringify(m)}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
  it('is a 44x44 target named City advice, with the dot named in the words, and hidden before the first home', async () => {
    for (const [w, h] of [[375, 667], [390, 844], [1280, 800]]) {
      const lit = await topBar(w, h, 100, TYPICAL, { dot: true });
      expect([w, lit.advice.hidden, lit.advice.w >= 44, lit.advice.h >= 44, lit.advice.name, lit.advice.dot]).toEqual([w, false, true, true, 'City advice: something new', true]);
      const quiet = await topBar(w, h, 100, TYPICAL, { dot: false });
      expect([w, quiet.advice.name, quiet.advice.dot]).toEqual([w, 'City advice', false]);
    }
  });
});
