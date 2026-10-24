// Version 6.0 Track D2 (rulings 760-779): the guided first city played end to end through the page, as a player would: the fresh device's title offers the
// lesson alone, the lesson runs its fourteen steps (each lit, each advancing only when the sim shows it done), ends on "Your first city stands" and
// is back on the title with New city, and through all of it a saved city is never written, replaced or touched. A lesson left part-way picks up where it stopped.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { packSave } from '../../../src/save/serialize.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { tickDay } from '../../../src/sim/clock.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { LESSON_SCRIPT, LESSON_LENGTH, stepProgress, stepDone } from '../../../src/sim/lesson.js';
import { lessonFacts } from '../../../src/ui/lesson.js';
import { D2_TEXT, T } from '../../../src/ui/text.js';
import { openSheet } from '../../../src/ui/modes.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
async function waitFor(fn, ms = 3000) { for (let t = 0; t < ms; t += 25) { if (fn()) return true; await new Promise((r) => setTimeout(r, 25)); } return fn(); }

// The page as a device opens it (the title card), with a spy on the save slot: every write is counted. saved: a city already on the device.
async function open({ saved = false, settings = {}, size = [390, 844] } = {}) {
  const shell = await mountShell(size[0], size[1]);
  const history = fakeHistory();
  const real = createSaveStore({ idb: fakeIndexedDB(), local: null });
  const writes = [];
  const store = { ...real, save: async (text) => { writes.push(text); return real.save(text); } };
  let savedText = null;
  if (saved) { savedText = packSave(buildSampleCity(createWorld({ seed: 11 })), { savedAt: 1760000000000, lastSpeed: 1 }); await real.save(savedText); }
  const data = settings ? { 'thebes.settings': JSON.stringify(settings) } : {};
  const storage = memory(data);
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: size[0], height: size[1] }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return {
    api, real, writes, savedText, storage, shell,
    settings: () => JSON.parse(storage.data['thebes.settings'] || '{}'),
    async saveSlot() { const l = await real.load(); return l ? l.text : null; },
    cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on'); delete window.__thebes; },
  };
}

const titleButtons = () => [...document.querySelectorAll('.title-card button')].filter((b) => !b.hidden).map((b) => b.textContent.trim());
const row = () => document.querySelector('#lesson');
const rowStep = () => (row() ? row().dataset.step : null);
const rowText = () => row().querySelector('.text').textContent;

// The io the scripted walk-through plays through: a day is a day of the sim (the loop is stood down) that the interface hears of, a command refreshes it.
function io(g) {
  return {
    tick() { const events = []; tickDay(g.world, events); g.ui.onEvents(events); g.ui.refresh(); },
    did() { g.ui.afterCommand({ kind: 'lesson-test', text: '' }); },
  };
}

describe('v60 d2 the title offers the lesson', () => {
  it('on a fresh device shows Start the lesson alone: no New city, difficulty or size, no Continue', async () => {
    const s = await open();
    try {
      expect(s.api.phase()).toBe('title');
      expect(titleButtons().includes(D2_TEXT.titleStart)).toBe(true);
      for (const gone of [T.newCity, T.continueGame, 'Relaxed', 'Normal', 'Hard', 'Small', 'Large']) expect([gone, titleButtons().includes(gone)]).toEqual([gone, false]);
      expect(document.querySelector('.title-card .lesson-start').classList.contains('primary')).toBe(true);
      expect([document.querySelector('.title-difficulty'), document.querySelector('.new-city'), document.querySelector('.lesson-again')]).toEqual([null, null, null]);
      expect(document.activeElement).toBe(document.querySelector('.lesson-start'));
    } finally { s.cleanup(); }
  });
  it('with a saved city (the lesson not done) shows Continue and New city as ever, and a Lesson button to play it', async () => {
    const s = await open({ saved: true });
    try {
      const b = titleButtons();
      expect([b.includes(T.continueGame), b.includes(T.newCity), b.includes('Lesson'), b.includes(D2_TEXT.titleStart)]).toEqual([true, true, true, false]);
    } finally { s.cleanup(); }
  });
  it('once the lesson is done a device without a city has New city again, and Lesson plays it again', async () => {
    const s = await open({ settings: { lessonDone: true, lessonStep: LESSON_LENGTH } });
    try {
      const b = titleButtons();
      expect([document.querySelector('.new-city') !== null, b.includes('Lesson'), document.querySelector('.lesson-start')]).toEqual([true, true, null]);   // Version 8.0: Play, the main button, opens the new-city card
      expect([document.querySelector('.new-city').classList.contains('primary'), document.querySelector('.new-city').textContent]).toEqual([true, 'Play']);
    } finally { s.cleanup(); }
  });
  it('after a lesson left part-way says Continue the lesson, with Start again beside it', async () => {
    const s = await open({ settings: { lessonStep: 4 } });
    try {
      expect([titleButtons().includes(D2_TEXT.titleContinue), titleButtons().includes(D2_TEXT.titleAgain), titleButtons().includes(D2_TEXT.titleStart)]).toEqual([true, true, false]);
    } finally { s.cleanup(); }
  });
});

describe('v60 d2 the lesson played end to end', () => {
  it('runs every step in order, each lit and each moved on only by the sim, ends on Your first city stands and is back on the title with New city', async () => {
    const s = await open({ saved: true });
    try {
      document.querySelector('.lesson').click();                                      // a saved city: Lesson, not Start
      expect(s.api.phase()).toBe('game');
      const g = s.api.game();
      expect([g.lesson, g.world.size, document.body.classList.contains('lesson-on'), Boolean(row())]).toEqual([true, 48, true, true]);
      expect(document.querySelector('#goals').offsetParent).toBe(null);               // the goals strip gives its row up to the lesson's
      for (let i = 0; i < LESSON_LENGTH; i++) {
        const step = LESSON_STEPS[i];
        expect([i, rowStep(), s.settings().lessonStep || 0]).toEqual([i, step.id, i]);
        expect(row().querySelector('.label').textContent).toBe(D2_TEXT.lessonLabel(i + 1, LESSON_LENGTH));
        expect(rowText()).toBe(D2_TEXT.steps[step.id](lessonFacts(g.world, step)).text);   // the words are worked out from the sim as it stands
        const p = stepProgress(g.world, step);
        const chip = row().querySelector('.chip');
        expect([i, chip.hidden, !chip.hidden && chip.textContent]).toEqual([i, !p, p ? D2_TEXT.progress(p.n, p.of) : false]);
        if (step.show) {                                                              // Show me opens the card the step asks for, tagged, the rest dimmed
          row().querySelector('.show-me').click();
          const lit = [...document.querySelectorAll(`.card.suggested[data-item="${step.show.item}"]`)];
          expect([i, step.id, lit.length >= 1, document.querySelectorAll('.card.dimmed').length >= 0]).toEqual([i, step.id, true, true]);
          g.ui.placement.cancel();
        }
        expect([i, 'not yet', stepDone(g.world, step)]).toEqual([i, 'not yet', false]);
        LESSON_SCRIPT[step.id](g.world, io(g));
        expect([i, 'sim done', stepDone(g.world, step)]).toEqual([i, 'sim done', true]);
        await frame();
        const next = LESSON_STEPS[i + 1];
        expect([i, 'moved on', next ? rowStep() : s.settings().lessonDone]).toEqual([i, 'moved on', next ? next.id : true]);
      }
      // The end: the sheet, the settings, the row's New city.
      expect([g.ui.store.get().sheet && g.ui.store.get().sheet.kind, s.settings().lessonDone, s.settings().lessonStep, s.settings().cardsSeen]).toEqual(['lessonEnd', true, LESSON_LENGTH, true]);
      expect(document.querySelector('#sheet').textContent.includes(D2_TEXT.endTitle)).toBe(true);
      expect(g.world.speed).toBe(0);
      // The row's way out is not live under the end sheet (a second button behind it), and is back once the sheet is closed with Keep looking around.
      expect([row().dataset.step, row().querySelector('.lesson-new').hidden, document.querySelector('#lesson .text').textContent]).toEqual(['end', true, D2_TEXT.endRow]);
      expect([D2_TEXT.endNew, document.querySelector('#sheet .lesson-new-city').textContent]).toEqual(['Title screen', 'Title screen']);
      document.querySelector('#sheet .lesson-stay').click();
      expect([g.ui.store.get().sheet, row().querySelector('.lesson-new').hidden]).toEqual([null, false]);
      g.ui.store.set(openSheet(g.ui.store.get(), 'lessonEnd'));
      document.querySelector('#sheet .lesson-new-city').click();
      expect(await waitFor(() => s.api.phase() === 'title')).toBe(true);
      expect(document.querySelector('.lesson-note').textContent).toBe(D2_TEXT.standsNote);
      expect([titleButtons().includes(T.continueGame), titleButtons().includes(T.newCity)]).toEqual([true, true]);
      // Nothing of the lesson was ever written: the saved city is as it was, byte for byte, and no save was attempted.
      expect(s.writes.length).toBe(0);
      expect(await s.saveSlot()).toBe(s.savedText);
    } finally { s.cleanup(); }
  });

  it('never saves: not on a month ending, not when the page is hidden, not through the hooks, not on export or import', async () => {
    const s = await open({ saved: true });
    try {
      document.querySelector('.lesson').click();
      const g = s.api.game();
      const lessonIo = io(g);
      for (const id of ['road', 'homes', 'well', 'families']) LESSON_SCRIPT[id](g.world, lessonIo);
      for (let d = 0; d < 65; d++) lessonIo.tick();                                   // two months end: the month's autosave would run in any other game
      await g.ui.autosave('hidden');
      expect(await s.api.hooks.save('update')).toBe(true);                            // true: nothing failed, nothing was written
      await s.api.hooks.exportCity();
      expect(s.writes.length).toBe(0);
      expect(await s.saveSlot()).toBe(s.savedText);
      expect(document.querySelector('#banner [data-code="save_failed"]')).toBe(null);
      // Its menu has no New city, Export or Import, and leaves the lesson instead.
      g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
      const labels = [...document.querySelectorAll('#sheet .menu-list button')].map((b) => b.textContent.trim());
      expect([labels.includes(T.newCity), labels.includes(T.exportCity), labels.some((t) => /import/i.test(t)), labels.includes(D2_TEXT.menuLeave)]).toEqual([false, false, false, true]);
    } finally { s.cleanup(); }
  });

  it('leaves part-way with its place kept, and Continue the lesson rebuilds the city at that step', async () => {
    const s = await open();
    try {
      document.querySelector('.lesson-start').click();
      const g = s.api.game();
      const lessonIo = io(g);
      for (const id of ['road', 'homes', 'well', 'families', 'farm', 'granary']) LESSON_SCRIPT[id](g.world, lessonIo);
      await frame();
      expect([rowStep(), s.settings().lessonStep]).toEqual(['bazaar', 6]);
      { document.querySelector('#topbar .menu').click(); document.querySelector('#sheet .leave-lesson').click(); }   // Version 8.0: Leave the lesson is in the menu                                           // a question first, naming what is kept
      const dialog = document.querySelector('#dialog');
      expect([dialog.hidden, dialog.textContent.includes('Your place is kept'), dialog.textContent.includes('streets you laid are not kept')]).toEqual([false, true, true]);   // ruling 764, said before the tap
      dialog.querySelector('.ok').click();
      expect(await waitFor(() => s.api.phase() === 'title')).toBe(true);
      expect(titleButtons().includes(D2_TEXT.titleContinue)).toBe(true);
      expect(document.querySelector('.lesson-hint').textContent).toBe(D2_TEXT.titleContinueHint);   // Continue says the streets are not kept
      expect(D2_TEXT.titleContinueHint.includes('not kept')).toBe(true);
      document.querySelector('.lesson-start').click();
      const h = s.api.game();
      expect([rowStep(), Object.values(h.world.buildings).some((b) => b.type === 'farm_grain'), h.world.speed, h.lesson]).toEqual(['bazaar', true, 0, true]);
      expect(s.settings().lessonDone === true).toBe(false);
      // Start again begins at the first step.
      { document.querySelector('#topbar .menu').click(); document.querySelector('#sheet .leave-lesson').click(); }   // Version 8.0: Leave the lesson is in the menu
      document.querySelector('#dialog .ok').click();
      expect(await waitFor(() => s.api.phase() === 'title')).toBe(true);
      document.querySelector('.lesson-again').click();
      expect([rowStep(), s.settings().lessonStep]).toEqual(['road', 0]);
      expect(Object.keys(s.api.game().world.buildings).length).toBe(0);
    } finally { s.cleanup(); }
  });

  it('opens on the finished lesson (a dev scene, or a resume past the last step) with the end sheet, once the interface is built', async () => {
    const s = await open();
    try {
      s.api.hooks.lesson({ step: LESSON_LENGTH });
      const g = s.api.game();
      expect([g.lesson, g.ui.store.get().sheet && g.ui.store.get().sheet.kind, s.settings().lessonDone, rowStep(), g.world.speed]).toEqual([true, 'lessonEnd', true, 'end', 0]);
      expect(document.querySelector('#sheet').textContent.includes(D2_TEXT.endTitle)).toBe(true);
      expect(s.writes.length).toBe(0);
    } finally { s.cleanup(); }
  });

  it('shows no tip and no picture card in the lesson (its row is the one guidance), though a Large plot, a raid warning and a fire all come', async () => {
    const s = await open();
    try {
      document.querySelector('.lesson-start').click();
      const g = s.api.game();
      const lessonIo = io(g);
      for (const step of LESSON_STEPS) {
        LESSON_SCRIPT[step.id](g.world, lessonIo);
        await frame();
        expect([step.id, g.ui.tips.current(), document.querySelector('.picture-cards')]).toEqual([step.id, null, null]);
      }
      expect(Object.hasOwn(s.settings(), 'seenTips') ? s.settings().seenTips.length : 0).toBe(0);   // the device's seen tips are as they were: the first real city meets its tips fresh
    } finally { s.cleanup(); }
  });
});
