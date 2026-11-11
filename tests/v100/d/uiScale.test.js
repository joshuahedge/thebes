// Version 10.0, Track D (the desktop scale; rulings 2120-2129): the default --ui-scale by width and pointer, a stored choice that wins, Auto in Options, the wide panel / drawer / minimap /
// title card that grow with it, and the wide top bar's date.
import { describe, it, expect } from '../../harness.js';
import { uiScaleDefault, effectiveTextSize, createSettings, DEFAULT_SETTINGS } from '../../../src/ui/settings.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { compactDateText, dateText } from '../../../src/ui/text.js';
import { explainStat } from '../../../src/ui/v81/stats.js';
import { mount } from '../../helpers/dom.js';
import { mountShell, rigUI } from '../../helpers/uiWorld.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const FINE = { finePointer: true, coarsePointer: false };

// A settings object whose window is a box the test moves: envBox.width, and resize() is the window's resize event.
function settingsAt(width, { storage = memory(), root = document.body, pointer = FINE } = {}) {
  const envBox = { width, ...pointer };
  const watchers = [];
  const settings = createSettings({
    storage, root, systemReducedMotion: () => false, watchSystem: () => () => {},
    env: () => ({ ...envBox }), watchEnv: (cb) => { watchers.push(cb); return () => watchers.splice(watchers.indexOf(cb), 1); },
  });
  return { settings, envBox, resize: (w) => { envBox.width = w; for (const fn of [...watchers]) fn(); }, watchers };
}

describe('v100 d ui scale: the default by width and pointer', () => {
  it('uiScaleDefault: 1 under 1600, 1.25 from 1600, 1.5 from 2200; any coarse pointer or no fine pointer is 1', () => {
    const at = (width, extra = {}) => uiScaleDefault({ width, ...FINE, ...extra });
    expect([at(1366), at(1599), at(1600), at(1920), at(2199), at(2200), at(3840)]).toEqual([1, 1, 1.25, 1.25, 1.25, 1.5, 1.5]);
    expect([at(1920, { coarsePointer: true }), at(3840, { coarsePointer: true }), at(1920, { finePointer: false }), at(390, FINE), at(375, FINE)]).toEqual([1, 1, 1, 1, 1]);
  });
  it('effectiveTextSize: a choice wins, no choice is Auto, no env is no Auto', () => {
    expect([effectiveTextSize(100, { width: 1920, ...FINE }), effectiveTextSize(200, { width: 1366, ...FINE }), effectiveTextSize(null, { width: 1920, ...FINE }), effectiveTextSize(null, { width: 2560, ...FINE }), effectiveTextSize(null, { width: 1366, ...FINE })]).toEqual([100, 200, 125, 150, 100]);
    expect([effectiveTextSize(null), effectiveTextSize(undefined, null), effectiveTextSize(150)]).toEqual([100, 100, 150]);
  });
  it('a missing stored text size is Auto; a stored one is a choice and wins over the width', () => {
    const { root, cleanup } = mount();
    try {
      expect(DEFAULT_SETTINGS.textSize).toBe(null);
      const fresh = settingsAt(1920, { root });
      expect([fresh.settings.get().textSize, fresh.settings.get().textSizeChoice, root.dataset.textSize]).toEqual([125, null, '125']);
      const noKey = settingsAt(2560, { root, storage: memory({ 'thebes.settings': JSON.stringify({ sound: false }) }) });
      expect([noKey.settings.get().textSize, root.dataset.textSize, noKey.settings.get().sound]).toEqual([150, '150', false]);
      const chose = settingsAt(1920, { root, storage: memory({ 'thebes.settings': JSON.stringify({ textSize: 100 }) }) });
      expect([chose.settings.get().textSize, chose.settings.get().textSizeChoice, root.dataset.textSize]).toEqual([100, 100, '100']);
      const small = settingsAt(1366, { root });
      expect(root.dataset.textSize).toBe('100');
      const touch = settingsAt(1920, { root, pointer: { finePointer: true, coarsePointer: true } });
      expect(root.dataset.textSize).toBe('100');
      for (const s of [fresh, noKey, chose, small, touch]) s.settings.destroy();
    } finally { cleanup(); }
  });
  it('choosing Auto again (null) clears the choice, and the choice is stored', () => {
    const { root, cleanup } = mount();
    try {
      const storage = memory();
      const r = settingsAt(1920, { root, storage });
      r.settings.set({ textSize: 150 });
      expect([r.settings.get().textSize, JSON.parse(storage.data['thebes.settings']).textSize]).toEqual([150, 150]);
      r.settings.set({ textSize: null });
      expect([r.settings.get().textSize, JSON.parse(storage.data['thebes.settings']).textSize, root.dataset.textSize]).toEqual([125, null, '125']);
      r.settings.destroy();
    } finally { cleanup(); }
  });
  it('the default follows a resize across 1600 and 2200 px (and tells the subscribers); a choice never moves', () => {
    const { root, cleanup } = mount();
    try {
      const r = settingsAt(1500, { root });
      const heard = [];
      r.settings.subscribe((v) => heard.push(v.textSize));
      expect(root.dataset.textSize).toBe('100');
      r.resize(1700); r.resize(1800);
      expect([root.dataset.textSize, heard]).toEqual(['125', [125]]);   // 1800 is no change: nobody is told twice
      r.resize(2300);
      r.resize(1500);
      expect([root.dataset.textSize, heard]).toEqual(['100', [125, 150, 100]]);
      r.settings.set({ textSize: 125 });
      r.resize(2400);
      expect([root.dataset.textSize, r.settings.get().textSize]).toEqual(['125', 125]);
      r.settings.destroy();
      expect(r.watchers.length).toBe(0);
    } finally { cleanup(); }
  });
  it('Options says "Auto (125%)" at 1920 with no choice, and the chosen size once there is one', () => {
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const r = settingsAt(1920, { root });
      const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings: r.settings, toasts: { show() {} }, hooks: {}, version: '0' });
      const body = root.querySelector('#body');
      menus.settings(body, { close() {} });
      const choices = () => [...body.querySelectorAll('.choice.textSize')].map((b) => [b.textContent, b.getAttribute('aria-pressed')]);
      expect(choices()).toEqual([['Auto (125%)', 'true'], ['100%', 'false'], ['125%', 'false'], ['150%', 'false'], ['200%', 'false']]);
      body.querySelector('.choice.textSize[data-value="150"]').click();
      expect(choices()).toEqual([['Auto (125%)', 'false'], ['100%', 'false'], ['125%', 'false'], ['150%', 'true'], ['200%', 'false']]);
      body.querySelector('.choice.textSize[data-value="null"]').click();
      expect([r.settings.get().textSizeChoice, choices()[0]]).toEqual([null, ['Auto (125%)', 'true']]);
      r.resize(2300);
      body.querySelector('.choice.textSize[data-value="100"]').click();
      expect(choices()[0]).toEqual(['Auto (150%)', 'false']);
      r.settings.destroy();
    } finally { cleanup(); }
  });
});

describe('v100 d ui scale: the wide panel, drawer, minimap and title card grow with --ui-scale', () => {
  const widthOf = (el) => el.getBoundingClientRect().width;
  const probe = (css) => { const p = document.createElement('div'); p.style.cssText = `position:fixed;visibility:hidden;height:1px;width:${css}`; document.body.append(p); const w = p.getBoundingClientRect().width; p.remove(); return w; };

  it('--panel-w, --drawer-w and the minimap are the base times the scale on the wide layout', async () => {
    const holder = settingsAt(1920);
    const r = await rigUI({ width: 1920, height: 1080, settings: holder.settings });
    try {
      r.ui.refresh();
      const panel = r.root.querySelector('#panel'), canvas = r.root.querySelector('#panel .minimap canvas');
      const seen = [];
      for (const size of [100, 125, 150]) {
        holder.settings.set({ textSize: size });
        r.ui.refresh();
        const k = size / 100;
        seen.push([size, widthOf(panel), probe('var(--drawer-w)'), widthOf(canvas), canvas.getBoundingClientRect().height]);
        expect([size, probe('var(--drawer-w)'), widthOf(canvas), canvas.getBoundingClientRect().height]).toEqual([size, 268 * k, 160 * k, 160 * k]);
        // the panel is 320 x the scale, but never more than 40% of the window nor less than 320 (the test window may be narrower than the shell it hosts)
        expect([size, Math.abs(widthOf(panel) - Math.max(320, Math.min(320 * k, 0.4 * window.innerWidth))) < 1.5]).toEqual([size, true]);   // (the panel's 1 px border is outside its width)
      }
      if (window.innerWidth >= 1200) expect(Math.round((seen[2][1] - 1) / (seen[0][1] - 1) * 100) / 100).toBe(1.5);   // 1.5x the 1.0 width where the window has the room for it
    } finally { r.cleanup(); holder.settings.destroy(); }
  });
  it('the Auto default scales the same way: 1920 wide is 125%, 2560 is 150%, 1366 is 100%', async () => {
    for (const [w, h, k] of [[1366, 768, 1], [1920, 1080, 1.25], [2560, 1440, 1.5]]) {
      const holder = settingsAt(w);
      const r = await rigUI({ width: w, height: h, settings: holder.settings });
      try {
        r.ui.refresh();
        expect([w, document.body.dataset.textSize, probe('var(--drawer-w)')]).toEqual([w, String(k * 100), 268 * k]);
      } finally { r.cleanup(); holder.settings.destroy(); }
    }
  });
  it('a phone layout keeps its widths at every text size, even with a fine pointer at a narrow width', async () => {
    for (const [w, h] of [[390, 844], [375, 667], [844, 390]]) {
      const holder = settingsAt(w);   // a fine pointer at a phone's width: the 1600 px threshold keeps Auto at 100%
      const r = await rigUI({ width: w, height: h, settings: holder.settings });
      try {
        r.ui.refresh();
        expect([w, document.body.dataset.textSize, probe('var(--panel-w)'), probe('var(--drawer-w)')]).toEqual([w, '100', 320, 268]);
        holder.settings.set({ textSize: 150 });
        r.ui.refresh();
        expect([w, probe('var(--panel-w)'), probe('var(--drawer-w)')]).toEqual([w, 320, 268]);   // the drawer does not grow with a chosen 150% on a phone
      } finally { r.cleanup(); holder.settings.destroy(); }
    }
  });
  it('the title card is at least 560 px wide at 1920x1080 (ruling 1673), 440 at 100%, and wider at 150%', async () => {
    const seen = [];
    for (const [w, h, size] of [[1920, 1080, 125], [1366, 768, 100], [2560, 1440, 150]]) {
      const shell = await mountShell(w, h);
      document.body.dataset.textSize = String(size);
      const container = shell.root.querySelector('#title');
      const tc = createTitleCard({ container, hasSave: true, onContinue() {}, onNewCity() {} });
      try {
        const card = container.querySelector('.title-card');
        card.classList.add('wide');   // the card decides "wide" from the window; the test window is smaller than the shell
        seen.push([w, size, Math.round(card.getBoundingClientRect().width)]);
      } finally { tc.destroy(); shell.cleanup(); delete document.body.dataset.textSize; }
    }
    expect(seen).toEqual([[1920, 125, 560], [1366, 100, 440], [2560, 150, 680]]);
    expect(seen[0][2]).toBeGreaterThan(559);
  });
});

describe('v100 d the top bar\'s date', () => {
  it('compactDateText reads Y2 · M9 · D1 and the words stay in dateText', () => {
    expect(compactDateText({ year: 2, month: 9, day: 1 })).toBe('Y2 · M9 · D1');
    expect(dateText({ year: 2, month: 9, day: 1 })).toBe('Year 2, month 9, day 1');
  });
  it('the wide bar shows Y2 · M9 · D1 and the explainer holds "Year 2, month 9, day 1"; the narrow layout is as it was', async () => {
    const wide = await rigUI({ width: 1280, height: 800 });
    try {
      wide.world.day = 360 + 8 * 30;   // year 2, month 9, day 1 (a 360-day year of twelve 30-day months)
      wide.ui.refresh();
      const stat = wide.root.querySelector('#topbar .stat.date');
      expect(stat.querySelector('.value').textContent).toBe('Y2 · M9 · D1');
      expect(stat.getAttribute('aria-label')).toContain('Year 2, month 9, day 1');
      expect(explainStat(wide.world, 'date').title).toBe('Year 2, month 9, day 1');   // the explainer's heading keeps the words
    } finally { wide.cleanup(); }
    const narrow = await rigUI({ width: 390, height: 844 });
    try {
      narrow.world.day = 360 + 8 * 30;
      narrow.ui.refresh();
      expect(narrow.root.querySelector('#topbar .stat.date .value').textContent).toBe('M9');
      expect(narrow.root.querySelector('#topbar .stat.date').getAttribute('aria-label')).toContain('Year 2, month 9, day 1');
    } finally { narrow.cleanup(); }
  });
});
