// Version 7.1, fix batch A (rulings 1060-1066), the lesson's step card: it holds the game while it is up even when the step's own part was done before (the nested sync of the pause),
// every game key stops at it (not only Enter, Space, Esc, Delete), and focus goes back into it when Leave the lesson's question is answered No.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { LESSON_STEPS, LESSON_PLACES } from '../../../src/data/lesson.js';
import { LESSON_SCRIPT } from '../../../src/sim/lesson.js';
import { place } from '../../../src/sim/commands.js';
import { tickDay } from '../../../src/sim/clock.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { key } from '../../helpers/dom.js';
import { stepCard } from '../../helpers/lesson.js';

const index = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

// The page as a screen opens the lesson at a step, with its card up (as tests/v70/p/lessonCard.test.js: the dev scene's way).
async function lessonPage(stepId, { width = 1280, height = 800 } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true, textSize: 100, motion: 'still', motionRig: true }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  api.hooks.lesson({ step: index(stepId) });
  await frame();
  const g = api.game();
  const io = {
    tick() { const events = []; tickDay(g.world, events); g.ui.onEvents(events); g.ui.refresh(); },
    did() { g.ui.afterCommand({ kind: 'lesson-test', text: '' }); },
  };
  return { api, g, root: shell.root, io, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on', 'lesson-names-alert', 'lesson-card-up'); delete window.__thebes; } };
}
const rowOf = (s) => s.root.querySelector('#lesson');
const goOf = (s) => s.root.querySelector('.lesson-card .lc-go');
// Version 8.0 (ruling 1171): Leave the lesson is in the menu while a lesson runs; its question, answered No, hands focus back to the card's one button.
const leaveViaMenu = (s) => { s.root.querySelector('#topbar .menu').click(); s.root.querySelector('#sheet .leave-lesson').click(); };

describe('v71 fa lesson: a step\'s card holds the game even when its own part is already done', () => {
  it('a firehouse built before its step: the card for the firehouse step is up with the game paused, stays paused through a day, and plays on at the speed he had when it is dismissed', async () => {
    const s = await lessonPage('largeplot');
    try {
      goOf(s).click();                                                                   // the large-plot step docked, the game paused
      await frame();
      place(s.g.world, 'firehouse', ...LESSON_PLACES.firehouse);                         // the player builds ahead: the firehouse step's part is done before the step comes
      s.io.did();
      s.g.ui.speedControl.set(2);
      expect([s.g.world.speed, rowOf(s).dataset.step]).toEqual([2, 'largeplot']);
      LESSON_SCRIPT.largeplot(s.g.world, s.io);                                          // the large plot is laid: the next step begins
      await frame();
      expect(rowOf(s).dataset.step).toBe('firehouse');
      expect([Boolean(stepCard(s.root)), s.g.world.speed]).toEqual([true, 0]);           // the card is up, the game is held behind it (it was playing on behind it)
      s.io.tick();
      expect([Boolean(stepCard(s.root)), s.g.world.speed]).toEqual([true, 0]);
      goOf(s).click();
      expect([stepCard(s.root), s.g.world.speed]).toEqual([null, 2]);                    // his part was done: the game plays again at his own speed once the card is gone
    } finally { s.cleanup(); }
  });
});

describe('v71 fa lesson: the card takes every game key', () => {
  it('with the card up, the clock, the minimap, Help, the layers, the categories and the pan keys do nothing', async () => {
    const s = await lessonPage('road');
    try {
      expect(Boolean(stepCard(s.root))).toBe(true);
      const st = s.g.ui.store.get(), cam = { ...s.g.cam };
      for (const k of ['m', 'o', '4', '?', ']', '.', 'ArrowLeft', 'ArrowDown', 'a', 'w', 'h', '+', '-']) key(s.root, k);
      const now = s.g.ui.store.get();
      expect([now.sheet, now.overlay, now.category, s.g.world.speed]).toEqual([st.sheet, st.overlay, st.category, 0]);
      expect([s.g.cam.x, s.g.cam.y, s.g.cam.zoom]).toEqual([cam.x, cam.y, cam.zoom]);
      expect(Boolean(stepCard(s.root))).toBe(true);
      // the control: with no card, the same key acts (so the test would catch the card not stopping it)
      goOf(s).click();
      expect(Boolean(stepCard(s.root))).toBe(false);
      key(s.root, 'm');
      expect(s.g.ui.store.get().sheet !== st.sheet).toBe(true);
    } finally { s.cleanup(); }
  });

  it('a Ctrl chord still goes through to the page (a browser\'s own keys are not ours to stop)', async () => {
    const s = await lessonPage('road');
    try {
      const seen = [];
      const spy = (ev) => seen.push(ev.key);
      s.root.addEventListener('keydown', spy);
      key(s.root, 'r', { ctrlKey: true });
      key(s.root, 'q');                                                                  // a plain key does not reach the page
      s.root.removeEventListener('keydown', spy);
      expect(seen).toEqual(['r']);
    } finally { s.cleanup(); }
  });
});

describe('v71 fa lesson: focus after Leave the lesson\'s question', () => {
  for (const how of ['Cancel', 'Escape']) {
    it(`${how}: the card is still the modal, and focus is back inside it (on the card's one button)`, async () => {
      const s = await lessonPage('road');
      try {
        leaveViaMenu(s);
        expect(s.root.querySelector('#dialog').hidden).toBe(false);
        if (how === 'Cancel') s.root.querySelector('#dialog .cancel').click(); else key(s.root, 'Escape');
        expect(s.root.querySelector('#dialog').hidden).toBe(true);
        expect(Boolean(stepCard(s.root))).toBe(true);
        const card = s.root.querySelector('.lesson-card');
        expect([how, card.contains(document.activeElement), document.activeElement === goOf(s)]).toEqual([how, true, true]);
      } finally { s.cleanup(); }
    });
  }
});
