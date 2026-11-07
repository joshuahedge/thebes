// Version 9.0 Track D (design sections 2, 4 and 10; rulings 1571, 1576-1578): where the heir and the title show. The heir's first-screen line (a caption in
// the guidance row) in a heir's city's first 10 days; the score section's "Heir of ..." and, from City, "Remembered as" with why and the next title; the
// one-time caption at City; the heir_trait tip; How to play's Dynasty entry. And the lesson: always the Steady, no Pass, no caption, the tower step's words.
import { describe, it, expect } from '../../harness.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { RAIDS } from '../../../src/data/raids.js';
import { TIPS } from '../../../src/data/tips.js';
import { HEIR_LINE_DAYS } from '../../../src/data/dynasty.js';
import { titleOf } from '../../../src/sim/dynasty.js';
import { createWorld } from '../../../src/sim/world.js';
import { lessonWorld } from '../../../src/sim/lesson.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { createSaveStore } from '../../../src/save/store.js';
import { boot } from '../../../src/boot.js';
import { createDynastyUi } from '../../../src/ui/v90/dynastyUi.js';
import { V90_D_TEXT, V70_HELP, TIP_TEXT, DANGER_UI_TEXT } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { mount } from '../../helpers/dom.js';
import { openSheet } from '../../../src/ui/modes.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
async function bootWith(dynasty = { name: '', heir: 'steady' }) {
  const width = 390, height = 844;
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true }), [RECORDS_KEY]: JSON.stringify({ version: 2, cities: [], chronicle: [], rulers: [], rivals: [], dynasty }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}
// A dynasty interface with a caption and tip log, for one world.
function dynastyFor(world) {
  const shown = [], tips = [];
  const ui = createDynastyUi({ world, store: { get: () => ({}), set() {} }, celebrations: { show: (c) => shown.push(c) }, fireTip: (k) => tips.push(k), hooks: {} });
  return { ui, shown, tips };
}
const text = (nodes) => { const { root, cleanup } = mount('<div id="x"></div>'); try { root.querySelector('#x').append(...nodes); return root.querySelector('#x').textContent; } finally { cleanup(); } };

describe('v90 d ui: the heir\'s first-screen line', () => {
  it('is a caption in the guidance row when a heir\'s city opens in its first 10 days, and never for the Steady', () => {
    const w = createWorld({ seed: 3, heir: 'generous' });
    const d = dynastyFor(w);
    d.ui.opening();
    expect(d.shown).toEqual([{ tier: 'info', text: 'Heir of the Generous', why: '20% more newcomers; High taxes take 1.15x, not 1.25x. The city summary says it again.' }]);
    w.day = HEIR_LINE_DAYS;
    const later = dynastyFor(w); later.ui.opening();
    const plain = dynastyFor(createWorld({ seed: 3 })); plain.ui.opening();
    expect([later.shown.length, plain.shown.length, HEIR_LINE_DAYS]).toEqual([0, 0, 10]);
  });
  it('shows on a heir\'s new city in the game', async () => {
    const r = await bootWith({ name: 'Ana', heir: 'builder' });
    try {
      r.api.startGame(r.api.freshWorld());
      await frame();
      expect(r.api.game().ui.celebrations.recent()[0]).toEqual({ tier: 'info', text: 'Heir of the Builder', why: 'Monuments rise 15% faster; taxes 5% lower. The city summary says it again.', reward: 0 });
    } finally { r.cleanup(); }
  });
});

describe('v90 d ui: the score section', () => {
  it('heads a heir\'s city with its trait, and the Steady with nothing', () => {
    const w = createWorld({ seed: 3, heir: 'unconquered' });
    expect(text(dynastyFor(w).ui.summary())).toBe("Heir of the Unconquered soldiers' pay 20% lower; the first raid warning comes 100 days sooner");
    expect(dynastyFor(createWorld({ seed: 3 })).ui.summary()).toEqual([]);
  });
  it('says from City what the reign would be remembered as, why, and the next title with how far it is', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    w.tally.stoneLaid = 2500; w.tally.tradeGold = 100; w.tally.billsPaid = 1000;
    const t = titleOf(w);
    const said = text(dynastyFor(w).ui.summary());
    expect(said).toBe(`Remembered as: the Builder${V90_D_TEXT.whyLine('builder', t.rows)}Close behind: the Merchant (trade paid 10% of the bills; 40% earns it)${V90_D_TEXT.rememberedNote}`);
    w.milestone = 'great_city';
    expect(text(dynastyFor(w).ui.summary()).startsWith('Remembered as')).toBe(true);
    w.milestone = 'market_town';
    expect(dynastyFor(w).ui.summary()).toEqual([]);
  });
  it('names the Steady when no bar is met, with the closest title', () => {
    const w = createWorld({ seed: 4 });
    w.milestone = 'city';
    w.tally.stoneLaid = 500;
    expect(text(dynastyFor(w).ui.summary())).toBe(`Remembered as: the Steady${V90_D_TEXT.whyLine('steady', titleOf(w).rows)}Close behind: the Builder (500 of 2,000 units laid)${V90_D_TEXT.rememberedNote}`);
  });
  it('shows in the city summary sheet', async () => {
    const r = await bootWith({ name: 'Ana', heir: 'bountiful' });
    try {
      const w = r.api.freshWorld({ seed: 11, variant: 'classic' });   // a fixed map: the sample city reaches past City on it
      buildSampleCity(w);
      expect([w.heir, titleOf(w).rows.length]).toEqual(['bountiful', 5]);
      r.api.startGame(w);
      const ui = r.api.game().ui;
      ui.store.set(openSheet(ui.store.get(), 'summary'));
      await frame();
      const s = document.querySelector('#sheet');
      const sec = s.querySelector('.score-section');
      expect(Boolean(sec)).toBe(true);
      expect(sec.querySelector('.heir-head').textContent).toBe(`Heir of the Bountiful ${V90_D_TEXT.traitLine('bountiful')}`);
      expect(sec.querySelector('.remembered-as').textContent).toBe(V90_D_TEXT.rememberedAs(titleOf(w).id));
    } finally { r.cleanup(); }
  });
});

describe('v90 d ui: the City caption, the tip and How to play', () => {
  it('says once, at City, that the throne may pass', () => {
    const w = createWorld({ seed: 3 });
    w.milestone = 'city';
    const d = dynastyFor(w);
    d.ui.onEvents([{ type: 'milestone', id: 'market_town' }]);
    d.ui.onEvents([{ type: 'milestone', id: 'city' }]);
    expect(d.shown).toEqual([{ tier: 'first', text: 'You may now pass the throne (game menu)', why: V90_D_TEXT.cityCaptionWhy }]);
  });
  it('fires the heir_trait tip at a heir\'s city\'s month end, never the Steady\'s', () => {
    const h = dynastyFor(createWorld({ seed: 3, heir: 'merchant' })), s = dynastyFor(createWorld({ seed: 3 }));
    h.ui.onEvents([{ type: 'month' }]); s.ui.onEvents([{ type: 'month' }]);
    expect([h.tips, s.tips]).toEqual([['heirCity'], []]);
    expect(TIPS.find((t) => t.id === 'heir_trait')).toEqual({ id: 'heir_trait', trigger: 'heirCity', priority: false });
    expect(TIP_TEXT.heir_trait.length > 0).toBe(true);
  });
  it('has How to play\'s Dynasty entry, worded from the data', () => {
    const p = V70_HELP.p.find((x) => x.head === 'Dynasty');
    expect(p.text).toContain('From City (400 people), Pass the throne in the game menu ends the reign.');
    expect(p.text).toContain('the Builder (2,000 units of monuments laid)');
    expect(p.text).toContain('Heir of the Generous: 20% more newcomers; High taxes take 1.15x, not 1.25x');
    expect(p.text).toContain('The score never counts a trait.');
  });
});

describe('v90 d ui: the lesson (design section 10, items 1, 2 and 5)', () => {
  it('builds the lesson as the Steady, so no trait moves a step or the staged raid', () => {
    expect(lessonWorld().heir).toBe('steady');
  });
  it('never offers Pass the throne nor fires the City caption, the heir line or the tip in the lesson', () => {
    const l = lessonWorld();
    l.milestone = 'city'; l.heir = 'builder';   // even if it could reach City under a heir
    const d = dynastyFor(l);
    d.ui.opening();
    d.ui.onEvents([{ type: 'milestone', id: 'city' }, { type: 'month' }]);
    expect([d.shown, d.tips, d.ui.summary(), Object.keys(d.ui.sheets)]).toEqual([[], [], [], ['passThrone', 'passHeir']]);
  });
  it('keeps the tower step\'s "10 months" read from RAIDS.firstWarnAfter, untouched by any trait', () => {
    expect([RAIDS.firstWarnAfter, DANGER_UI_TEXT.duration(RAIDS.firstWarnAfter)]).toEqual([300, '10 months']);
  });
  it('has no Pass the throne hook in the lesson\'s game', async () => {
    const r = await bootWith({ name: 'Ana', heir: 'builder' });
    try {
      r.api.hooks.lesson({ step: 0 });
      await frame();
      const g = r.api.game();
      expect([g.lesson, g.world.heir, r.api.hooks.canPassThrone()]).toEqual([true, 'steady', false]);
      r.api.hooks.passThrone();
      expect((g.ui.store.get().sheet || {}).kind === 'passThrone').toBe(false);
    } finally { r.cleanup(); }
  });
});
