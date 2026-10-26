// Version 8.0 Track U (rulings 1145-1159): the title (Continue or Play, I've played before, Options, What's new; no version number), the new-city card (difficulty tiles from the sim's
// data, map size and layout under More choices, Surprise me by default), and the end of Bring a city from Safari.
import { describe, it, expect } from '../../harness.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { boot, loadSave } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { packSave } from '../../../src/save/serialize.js';
import { createWorld } from '../../../src/sim/world.js';
import { createInstallFlow, detectEnvironment } from '../../../src/save/installFlow.js';
import { installGuide } from '../../../src/ui/installUi.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';
import { MAP_VARIANTS, MAP_VARIANTS_OFFERED, MAP_SIZES } from '../../../src/data/map.js';
import { T, V80_U_TEXT, V711_TEXT, D2_TEXT, S46_UX_TEXT, DIFFICULTY_NAMES } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { mount, fire, openNewCity } from '../../helpers/dom.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const shown = (container) => [...container.querySelectorAll('.title-buttons button')].filter((b) => !b.hidden).map((b) => b.textContent.trim());
const BIG = () => ({ width: 1280, height: 800 });

function card(props = {}) {
  const m = mount('<div id="title" hidden></div>');
  const container = m.root.querySelector('#title');
  const log = [];
  const tc = createTitleCard({ container, hasSave: false, onContinue: () => log.push('continue'), onNewCity: () => log.push('new'), onLesson: () => log.push('lesson'), renderSettings: () => {}, screen: BIG, ...props });
  return { container, log, tc, cleanup() { tc.destroy(); m.cleanup(); } };
}

async function bootAt({ width = 1280, height = 800, store = createSaveStore({ idb: fakeIndexedDB(), local: null }), settings = {}, platform = {}, params = '' } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true, ...settings }) });
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(params), now: () => 0, clock: () => 1760000000000, storage, platform,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, storage, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('v80 u title: the buttons', () => {
  it('leads with Continue when a city is saved, else Play; then the quieter ones, Options and What\'s new', () => {
    const saved = card({ hasSave: true });
    try {
      expect(shown(saved.container)).toEqual([T.continueGame, T.newCity, 'Lesson', T.settings, S46_UX_TEXT.whatsNew]);
      expect(saved.container.querySelector('.continue').classList.contains('primary')).toBe(true);
      expect(saved.container.querySelector('.new-city').classList.contains('primary')).toBe(false);
      expect(document.activeElement).toBe(saved.container.querySelector('.continue'));
    } finally { saved.cleanup(); }
    const done = card({ hasSave: false });                                    // lesson done (no lesson.due), nothing saved: Play opens the new-city card
    try {
      expect(shown(done.container).slice(0, 2)).toEqual(['Play', 'Lesson']);
      expect(done.container.querySelector('.new-city').classList.contains('primary')).toBe(true);
    } finally { done.cleanup(); }
  });
  it('on a device that has not done the lesson, Play starts it, I\'ve played before follows, then Options and What\'s new', () => {
    const skipped = [];
    const c = card({ lesson: { due: true, partWay: false, onSkip: () => skipped.push('skip') } });
    try {
      expect(shown(c.container)).toEqual(['Play', "I've played before", T.settings, S46_UX_TEXT.whatsNew]);
      expect([c.container.querySelector('.lesson-start').textContent, V711_TEXT.skip, D2_TEXT.titleStart]).toEqual(['Play', "I've played before", 'Play']);
      expect(c.container.querySelector('.lesson-start').classList.contains('primary')).toBe(true);
      expect(c.container.querySelector('.new-city')).toBe(null);
      fire(c.container.querySelector('.lesson-start'), 'click');
      fire(c.container.querySelector('.lesson-skip'), 'click');
      expect([c.log, skipped]).toEqual([['lesson'], ['skip']]);                // the same behaviour as 7.1.1's Skip
    } finally { c.cleanup(); }
    const part = card({ lesson: { due: true, partWay: true, onAgain() {} } });
    try { expect(shown(part.container)[0]).toBe('Continue'); } finally { part.cleanup(); }   // a lesson left part-way: Continue, with Start again under it
  });
  it('has no version number on the title, and no Bring a city from Safari', () => {
    const c = card({ hasSave: true, canInstall: true });
    try {
      expect([c.container.querySelector('.version'), c.container.querySelector('#title-version'), /version \d|build [0-9a-f]{7}/i.test(c.container.textContent)]).toEqual([null, null, false]);
      expect([c.container.querySelector('.bring'), /safari|bring/i.test(c.container.textContent)]).toEqual([null, false]);
    } finally { c.cleanup(); }
  });
});

describe('v80 u new-city card: difficulty tiles, More choices, Surprise me', () => {
  it('shows a tile per level with one line from the sim\'s own difficulty data, and the line follows the data both ways', () => {
    const c = card({ difficulty: 'hard' });
    try {
      openNewCity(c.container);
      const tiles = [...c.container.querySelectorAll('.choice.difficulty.tile')];
      expect(tiles.map((b) => b.dataset.value)).toEqual(DIFFICULTY_ORDER);
      expect(tiles.map((b) => b.querySelector('.tile-name').textContent)).toEqual(DIFFICULTY_ORDER.map((d) => DIFFICULTY_NAMES[d]));
      expect(tiles.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'true']);
      expect(c.container.querySelector('.new-city-head').textContent).toBe(T.newCity);
    } finally { c.cleanup(); }
    // the words come from DIFFICULTIES: change the data and the line changes with it (and is put back)
    expect(V80_U_TEXT.difficultyLine('peaceful')).toBe('No raids, sickness or thefts; buildings 20% cheaper.');
    expect(V80_U_TEXT.difficultyLine('relaxed')).toBe('Later raids 50% smaller; buildings 20% cheaper.');
    expect(V80_U_TEXT.difficultyLine('normal')).toBe('Raids and fire as designed; buildings at full price.');
    expect(V80_U_TEXT.difficultyLine('hard')).toBe('Later raids 50% bigger; buildings 25% dearer.');
    const was = { ...DIFFICULTIES.hard };
    try {
      DIFFICULTIES.hard.cost = 1.5; DIFFICULTIES.hard.risk = 2;
      expect(V80_U_TEXT.difficultyLine('hard')).toBe('Later raids 100% bigger; buildings 50% dearer.');
      DIFFICULTIES.hard.cost = 0.9; DIFFICULTIES.hard.risk = 0.75;
      expect(V80_U_TEXT.difficultyLine('hard')).toBe('Later raids 25% smaller; buildings 10% cheaper.');
    } finally { Object.assign(DIFFICULTIES.hard, was); }
  });
  it('keeps map size and layout under More choices, closed at first, with the defaults said in a line (Normal, Surprise me)', () => {
    const sizes = [], layouts = [];
    const c = card({ onMapSize: (id) => sizes.push(id), onLayout: (id) => layouts.push(id) });
    try {
      openNewCity(c.container);
      const toggle = c.container.querySelector('.more-choices-toggle'), region = c.container.querySelector('#more-choices-body');
      expect([toggle.textContent.trim(), toggle.getAttribute('aria-expanded'), toggle.getAttribute('aria-controls'), region.hidden]).toEqual(['More choices', 'false', 'more-choices-body', true]);
      expect(c.container.querySelector('.more-summary').textContent).toBe('Normal map, surprise me');
      fire(toggle, 'click');
      expect([toggle.textContent.trim(), toggle.getAttribute('aria-expanded'), region.hidden, c.container.querySelector('.more-summary').hidden]).toEqual(['Fewer choices', 'true', false, true]);
      expect(region.querySelector('.title-size')).toBeTruthy();
      const select = region.querySelector('.layout-select');
      expect([select.value, [...select.options].map((o) => o.value)]).toEqual(['auto', ['auto', ...MAP_VARIANTS_OFFERED]]);   // Version 8.2 (ruling 1300): the offered layouts
      expect(select.options[0].textContent).toBe('Surprise me');
      select.value = 'delta'; fire(select, 'change');
      fire(region.querySelector('.choice.mapsize[data-value="large"]'), 'click');
      expect([layouts, sizes]).toEqual([['delta'], ['large']]);
      fire(toggle, 'click');
      expect(c.container.querySelector('.more-summary').textContent).toBe('Large map, delta layout');
      fire(c.container.querySelector('.guide-back'), 'click');                 // Back, then the card again: what was chosen stays chosen
      openNewCity(c.container);
      expect(c.container.querySelector('.layout-select').value).toBe('delta');
      expect(c.container.querySelector('.choice.mapsize[aria-pressed="true"]').dataset.value).toBe('large');
    } finally { c.cleanup(); }
  });
  it('gives every control a name and 44 px to tap, by Tab and by tap, closed and open, on a phone at 150% text and on a computer', async () => {
    for (const [w, h, size] of [[390, 844, 100], [375, 667, 150], [1280, 800, 100]]) {
      const shell = await mountShell(w, h);
      document.body.dataset.textSize = String(size);
      const container = shell.root.querySelector('#title');
      const tc = createTitleCard({ container, hasSave: true, onContinue() {}, onNewCity() {}, renderSettings() {}, screen: () => ({ width: w, height: h }) });
      try {
        const at = `${w}x${h} at ${size}%`;
        const cardEl = container.querySelector('.title-card');
        fire(cardEl.querySelector('.new-city'), 'click');
        for (const step of ['closed', 'open']) {
          if (step === 'open') fire(cardEl.querySelector('.more-choices-toggle'), 'click');
          const box = cardEl.getBoundingClientRect(), outer = shell.root.getBoundingClientRect();
          expect([at, step, box.top >= outer.top - 0.5, box.bottom <= outer.bottom + 0.5, cardEl.scrollWidth <= cardEl.clientWidth + 1]).toEqual([at, step, true, true, true]);
          expect([at, step, cardEl.scrollHeight <= cardEl.clientHeight + 1 || getComputedStyle(cardEl).overflowY === 'auto']).toEqual([at, step, true]);
          for (const b of cardEl.querySelectorAll('.new-city-body button, .new-city-body select')) {
            if (b.closest('[hidden]')) continue;
            const r = b.getBoundingClientRect();
            const name = b.getAttribute('aria-label') || b.textContent.trim() || (b.labels && b.labels[0] && b.labels[0].textContent.trim());
            expect([at, step, b.className, Boolean(name), r.width >= 44 - 0.5, r.height >= 44 - 0.5, b.tabIndex >= 0]).toEqual([at, step, b.className, true, true, true, true]);
          }
        }
      } finally { tc.destroy(); shell.cleanup(); delete document.body.dataset.textSize; }
    }
  });
});

describe('v80 u new-city card: what it starts', () => {
  it('starts the picked layout and size, and a Surprise me city takes its layout from the seed', async () => {
    const r = await bootAt();
    try {
      openNewCity(r.root);
      fire(r.root.querySelector('#title .more-choices-toggle'), 'click');
      const select = r.root.querySelector('#title .layout-select');
      select.value = 'delta'; fire(select, 'change');
      fire(r.root.querySelector('#title .choice.mapsize[data-value="small"]'), 'click');
      fire(r.root.querySelector('#title .choice.difficulty[data-value="hard"]'), 'click');
      fire(r.root.querySelector('#title .start-city'), 'click');
      const w = r.api.game().world;
      expect([r.api.phase(), w.mapVariant, w.size, w.difficulty]).toEqual(['game', 'delta', MAP_SIZES.small, 'hard']);
    } finally { r.cleanup(); }
    const s = await bootAt();
    try {
      openNewCity(s.root);
      fire(s.root.querySelector('#title .start-city'), 'click');
      const w = s.api.game().world;
      expect([MAP_VARIANTS.includes(w.mapVariant), w.mapVariant === createWorld({ seed: w.seed, mapVariant: 'auto' }).mapVariant]).toEqual([true, true]);   // the seed's own pick
    } finally { s.cleanup(); }
  });
  it('asks before a saved city is replaced, and the card says so', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await store.save(packSave(createWorld({ seed: 4 }), { savedAt: 1760000000000 - 7200000, lastSpeed: 1 }));
    const r = await bootAt({ store });
    try {
      openNewCity(r.root);
      expect(r.root.querySelector('#title .replace-note').textContent).toBe(V80_U_TEXT.replaceNote);
      fire(r.root.querySelector('#title .start-city'), 'click');
      expect([r.api.phase(), r.root.querySelector('#title .guide').textContent.includes(T.newCityConfirm)]).toEqual(['title', true]);
    } finally { r.cleanup(); }
  });
});

describe('v80 u Bring a city from Safari is gone, the export stays', () => {
  it('has no canBring, no import hook, no Bring button on the title or the install guide, even in the installed app', async () => {
    const flow = createInstallFlow({ env: detectEnvironment({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', standalone: true }), hasSave: () => false });
    expect(typeof flow.canBring).toBe('undefined');
    const body = document.createElement('div');
    installGuide(flow, {})(body);
    expect([body.querySelector('.bring'), /safari|import/i.test(body.textContent)]).toEqual([null, false]);
    const r = await bootAt({ settings: { lessonDone: false } });
    try {
      expect([typeof r.api.hooks.importCity, typeof r.api.hooks.exportCity, r.root.querySelector('#title .bring')]).toEqual(['undefined', 'function', null]);
    } finally { r.cleanup(); }
    expect(typeof T.bringCity + typeof T.bringCityHelp + typeof T.importCity).toBe('undefinedundefinedundefined');
  });
  it('exports the saved city from Options > Saves on the title, byte for byte, and says so on the card', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    const text = packSave(createWorld({ seed: 4 }), { savedAt: 1760000000000 - 7200000, lastSpeed: 1 });
    await store.save(text);
    const downloaded = [];
    const r = await bootAt({ store, platform: { share: null, canShare: null, download: (f) => downloaded.push(f) } });
    try {
      fire(r.root.querySelector('#title .title-settings'), 'click');
      const exp = r.root.querySelector('#title .options-group.saves .export-city');
      expect(exp.textContent).toBe(T.exportCity);
      fire(exp, 'click');
      await flush(); await flush();
      expect(downloaded.length).toBe(1);
      expect(await downloaded[0].text()).toBe(text);
      expect(r.root.querySelector('#title .message').textContent).toBe(T.exported);
      expect((await loadSave(store)).state).toBe('ok');                          // the slot is untouched
    } finally { r.cleanup(); }
    const none = await bootAt();                                               // nothing saved: nothing to export, no button
    try {
      fire(none.root.querySelector('#title .title-settings'), 'click');
      expect(none.root.querySelector('#title .export-city')).toBe(null);
    } finally { none.cleanup(); }
  });
});
