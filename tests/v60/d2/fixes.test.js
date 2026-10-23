// Version 6.0, the final review's fix wave (Batch 2): the title and the lesson. A slot holding something unreadable is not "no saved city"; the lesson-only card offers Bring
// your city; a friend's link plays its own level and says where the lesson is; the menu's Lesson does not leave a city it could not save; a card waits for a tip; the lesson's
// ring sits inside the free map; and what a lesson left part-way says on the title.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { shareLink } from '../../../src/ui/share.js';
import { D2_TEXT, T } from '../../../src/ui/text.js';
import { openSheet } from '../../../src/ui/modes.js';
import { createCardMoments } from '../../../src/ui/cardMoments.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { LESSON_SCRIPT } from '../../../src/sim/lesson.js';
import { tickDay } from '../../../src/sim/clock.js';
import { createWorld } from '../../../src/sim/world.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { dockPlain } from '../../helpers/lesson.js';

const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
async function waitFor(fn, ms = 3000) { for (let t = 0; t < ms; t += 25) { if (fn()) return true; await new Promise((r) => setTimeout(r, 25)); } return fn(); }
const titleButtons = () => [...document.querySelectorAll('.title-card button')].filter((b) => !b.hidden).map((b) => b.textContent.trim());

// The page as a device opens it: junk in the save slot (an unreadable save), a hash (a friend's link), the settings the device holds.
async function open({ junk = false, hash = '', settings = {}, size = [390, 844] } = {}) {
  const was = window.location.hash;
  window.location.hash = hash;
  const shell = await mountShell(size[0], size[1]);
  const history = fakeHistory();
  const real = createSaveStore({ idb: fakeIndexedDB(), local: null });
  const store = junk ? { ...real, load: async () => ({ text: 'this is not a city' }) } : real;   // a slot that holds something unreadable
  const storage = memory({ 'thebes.settings': JSON.stringify(settings) });
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: size[0], height: size[1] }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return {
    api, shell, settings: () => JSON.parse(storage.data['thebes.settings'] || '{}'),
    cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on', 'lesson-names-alert'); delete window.__thebes; window.location.hash = was; },
  };
}

describe('v60 d2 the title with a slot that is not empty', () => {
  it('keeps New city (and says the save could not be read) when the slot holds something unreadable, instead of offering the lesson alone', async () => {
    const s = await open({ junk: true });
    try {
      const b = titleButtons();
      expect([b.includes(T.newCity), b.includes(D2_TEXT.titleStart), document.querySelector('.title-card .message') !== null]).toEqual([true, false, true]);
    } finally { s.cleanup(); }
  });
  it('offers Bring your city on the lesson-only card (a city file from another device), not only where the page is installed', async () => {
    const s = await open();
    try {
      expect([titleButtons().includes(D2_TEXT.titleStart), titleButtons().includes(T.bringCity)]).toEqual([true, true]);
    } finally { s.cleanup(); }
    const done = await open({ settings: { lessonDone: true } });
    try { expect([titleButtons().includes(T.newCity), titleButtons().includes(T.bringCity)]).toEqual([true, false]); } finally { done.cleanup(); }   // elsewhere as before: only where installed
  });
});

describe('v60 d2 a friend\'s share link (ruling 793)', () => {
  const link = () => { const l = shareLink({ seed: 4242, difficulty: 'hard', parts: PARTS, splits: {} }); return l.slice(l.indexOf('#')); };
  it('plays the link\'s seed at the link\'s level from the lesson-only card, and says the lesson is in the menu', async () => {
    const s = await open({ hash: link(), settings: { cardsSeen: true } });   // (the picture cards, seen, do not come first)
    try {
      expect(document.querySelector('.shared-score .friend-lesson').textContent).toBe(D2_TEXT.shareLessonLine);
      expect(D2_TEXT.shareLessonLine.includes('menu')).toBe(true);
      expect(s.settings().difficulty === 'hard').toBe(false);                    // the device's level is Normal until the link is played
      document.querySelector('.shared-score .start-seed').click();
      const w = await waitFor(() => s.api.phase() === 'game') && s.api.game().world;
      expect([w.seed, w.difficulty, s.settings().difficulty]).toEqual([4242, 'hard', 'hard']);
    } finally { s.cleanup(); }
  });
  it('adds no lesson line on a device that has finished the lesson, and still plays the link\'s level', async () => {
    const s = await open({ hash: link(), settings: { lessonDone: true, cardsSeen: true } });
    try {
      expect(document.querySelector('.shared-score .friend-lesson')).toBe(null);
      document.querySelector('.shared-score .start-seed').click();
      const w = await waitFor(() => s.api.phase() === 'game') && s.api.game().world;
      expect([w.seed, w.difficulty]).toEqual([4242, 'hard']);
    } finally { s.cleanup(); }
  });
});

describe('v60 d2 the menu\'s Lesson keeps a city it could not save', () => {
  it('says so in a toast and stays in the city when the save fails; leaves for the lesson when it works', async () => {
    const s = await open({ settings: { lessonDone: true, cardsSeen: true } });
    try {
      document.querySelector('.new-city').click();
      await waitFor(() => s.api.phase() === 'game');
      const g = s.api.game();
      const menuLesson = () => { g.ui.store.set(openSheet(g.ui.store.get(), 'menu')); document.querySelector('#sheet .menu-lesson').click(); document.querySelector('#dialog .ok').click(); };
      const real = s.api.hooks.save;
      s.api.hooks.save = async () => false;                                       // storage full, or a newer version's save in the slot
      menuLesson();
      await frame();
      expect([s.api.phase(), s.api.game().lesson, document.querySelector('#toasts').textContent.includes(D2_TEXT.menuLessonNotSaved)]).toEqual(['game', false, true]);
      s.api.hooks.save = async () => true;
      menuLesson();
      await frame();
      expect([s.api.phase(), s.api.game().lesson]).toEqual(['game', true]);
      s.api.hooks.save = real;
    } finally { s.cleanup(); }
  });
});

describe('v60 d2 a picture card waits for a tip', () => {
  it('does not open while a tip is on screen and opens at the next events once it is gone, marking the card seen only then', () => {
    const world = createWorld({ seed: 11, size: 48, mapVariant: 'classic' });
    world.raid.warning = { arrives: 90, dir: 'east', size: 3, entry: { x: 1, y: 1 } };   // the raid card's moment
    const tip = document.createElement('div');
    const root = { querySelector: (sel) => (sel === '#tip' ? tip : null) };
    const opened = [], seen = [];
    const moments = createCardMoments({ world, root, store: { get: () => ({ mode: 'select', sheet: null, confirmDialog: null }) }, settings: { get: () => ({ help: 'full', seenTips: [] }), set: (v) => seen.push(v) }, hooks: { pictureCard: (id) => { opened.push(id); return true; } } });
    tip.innerHTML = '<div class="tip-row">The raiders strike in order</div>';
    moments.onEvents([{ type: 'month' }]);
    expect([opened, seen.length]).toEqual([[], 0]);
    tip.innerHTML = '';
    moments.onEvents([{ type: 'month' }]);
    expect([opened, seen.length]).toEqual([['raid'], 1]);
    moments.destroy();
  });
});

describe('v60 d2 the lesson\'s ring sits inside the free map', () => {
  async function lessonAt(stepId, [width, height], settings = {}) {
    const s = await open({ size: [width, height], settings: { lessonDone: true, cardsSeen: true, motion: 'still', ...settings } });
    s.api.hooks.lesson({ step: LESSON_STEPS.findIndex((x) => x.id === stepId) });
    await frame();
    dockPlain(s.api);                                                                // Version 7.0 (Track P): the step's card first; these look at the ring it docks to
    await frame();
    return s;
  }
  it('road on a phone: the long ring is brought inside the screen, not cut at its edge', async () => {
    const s = await lessonAt('road', [390, 844]);
    try {
      const r = document.querySelector('.lesson-ring').getBoundingClientRect(), frameBox = s.shell.root.getBoundingClientRect();
      expect([r.left >= frameBox.left - 0.5, r.right <= frameBox.right + 0.5]).toEqual([true, true]);
    } finally { s.cleanup(); }
  });
  it('a step on a desktop: the ring is centred in the map the side panel leaves free, not under the panel', async () => {
    const s = await lessonAt('farm', [1280, 800]);
    try {
      const panel = document.querySelector('#panel').getBoundingClientRect(), r = document.querySelector('.lesson-ring').getBoundingClientRect(), box = s.shell.root.getBoundingClientRect();
      expect([r.right <= panel.left + 0.5, r.left >= box.left - 0.5, r.width > 0]).toEqual([true, true, true]);
    } finally { s.cleanup(); }
  });
  it('the tower step names the raid warning in its row, so the alert\'s line does not stand over it (one panel); the step before it keeps the alert', async () => {
    const s = await lessonAt('tower', [1280, 800]);
    try {
      expect(document.body.classList.contains('lesson-names-alert')).toBe(true);
      const g = s.api.game();
      g.world.speed = 1;
      const ev = []; tickDay(g.world, ev); g.ui.onEvents(ev); g.ui.refresh();
      await frame();
      const line = document.querySelector('#banner > .critical[data-code="raid_warning"]');
      expect([line !== null, line && getComputedStyle(line).display]).toEqual([true, 'none']);
      expect(document.querySelector('#lesson .text').textContent.includes('raiders come from')).toBe(true);
    } finally { s.cleanup(); }
    const before = await lessonAt('fire', [1280, 800]);
    try { expect(document.body.classList.contains('lesson-names-alert')).toBe(true); } finally { before.cleanup(); }
    const other = await lessonAt('workers', [1280, 800]);
    try { expect(document.body.classList.contains('lesson-names-alert')).toBe(false); } finally { other.cleanup(); }
  });
});

describe('v60 d2 a lesson left part-way, and one only opened', () => {
  it('opening the lesson and leaving at once leaves no place to continue from; finishing a step does', async () => {
    const s = await open();
    try {
      document.querySelector('.lesson-start').click();
      await frame();
      document.querySelector('#lesson .leave').click();
      document.querySelector('#dialog .ok').click();
      expect(await waitFor(() => s.api.phase() === 'title')).toBe(true);
      expect([titleButtons().includes(D2_TEXT.titleStart), titleButtons().includes(D2_TEXT.titleContinue), s.settings().lessonStep || 0]).toEqual([true, false, 0]);
      expect(document.querySelector('.lesson-hint').textContent).toBe(D2_TEXT.titleHint);
    } finally { s.cleanup(); }
    const part = await open();
    try {
      document.querySelector('.lesson-start').click();
      const g = part.api.game();
      LESSON_SCRIPT.road(g.world, { tick() { const events = []; tickDay(g.world, events); g.ui.onEvents(events); g.ui.refresh(); }, did() { g.ui.afterCommand({ kind: 'lesson-test', text: '' }); } });
      await frame();
      expect(part.settings().lessonStep).toBe(1);
      document.querySelector('#lesson .leave').click();
      document.querySelector('#dialog .ok').click();
      expect(await waitFor(() => part.api.phase() === 'title')).toBe(true);
      expect([titleButtons().includes(D2_TEXT.titleContinue), titleButtons().includes(D2_TEXT.titleStart)]).toEqual([true, false]);
    } finally { part.cleanup(); }
  });
  it('says on the title that the streets are not kept (ruling 764), with Continue; and a finished lesson says Lesson, never Continue', async () => {
    const s = await open({ settings: { lessonStep: 4 } });
    try {
      expect([document.querySelector('.lesson-hint').textContent, D2_TEXT.titleContinueHint.includes('not kept')]).toEqual([D2_TEXT.titleContinueHint, true]);
    } finally { s.cleanup(); }
    const done = await open({ settings: { lessonDone: true, lessonStep: 14 } });
    try { expect([titleButtons().includes(D2_TEXT.titleContinue), titleButtons().includes('Lesson')]).toEqual([false, true]); } finally { done.cleanup(); }
  });
});
