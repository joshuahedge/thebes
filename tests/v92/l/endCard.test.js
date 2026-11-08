// Version 9.2 Track L (design 2.4, 2.7; rulings 1755, 1759; target T4): the lesson ends on one card on both paths, which waits for a dialog or a sheet; Keep building hands the city over,
// Start my own city goes to the title; the tips about what the lesson placed are seen at the hand-over and the tips wait after it; Esc on a lesson card means Leave.
import { describe, it, expect } from '../../harness.js';
import { LESSON_SCRIPT } from '../../../src/sim/lesson.js';
import { lessonTaughtTips, handOverHold } from '../../../src/ui/lesson.js';
import { LESSON_TAUGHT_TIPS, HANDOVER_HOLD_DAYS, HANDOVER_HOLD_MAX_DAYS } from '../../../src/data/tips.js';
import { BEAT_MS } from '../../../src/ui/v60/lesson.js';
import { V92L_TEXT, D2_TEXT } from '../../../src/ui/text.js';
import { packSave } from '../../../src/save/serialize.js';
import { createSaveStore } from '../../../src/save/store.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { dockCard, stepCard } from '../../helpers/lesson.js';
import { escape, enter } from '../helpers/keys.js';
import { pageAt, frame } from '../../v711/lessonPage.js';
import { walkLesson } from '../../v91/f/lesson.test.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) { for (let t = 0; t < ms; t += 50) { if (fn()) return true; await wait(50); } return fn(); }
const kind = (g) => { const s = g.ui.store.get().sheet; return s && s.kind; };
const savedStore = async () => {
  const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
  await store.save(packSave(buildSampleCity(createWorld({ seed: 11 })), { savedAt: 1760000000000, lastSpeed: 1 }));
  return store;
};

async function toLastStep(s) {
  const g = s.g();
  dockCard(s.root);
  await frame();
  g.ui.placement.cancel();
  return g;
}

describe('v92 l end: the lesson ends on one card on both paths (T4, ruling 1755)', () => {
  it('a first run on a device with no city: the card is up with both buttons and the game held; nothing hands over by itself; Keep building makes the city the player\'s', async () => {
    const s = await pageAt('raid', { width: 390, height: 844 });
    try {
      const g = await toLastStep(s);
      LESSON_SCRIPT.raid(g.world, s.io);
      await frame();
      expect([kind(g), g.world.speed, g.world.lesson]).toEqual(['lessonEnd', 0, true]);
      const keep = s.root.querySelector('#sheet .lesson-keep'), own = s.root.querySelector('#sheet .lesson-new-city');
      expect([keep.textContent, own.textContent, s.root.querySelector('#lesson-keep-hint').textContent]).toEqual([V92L_TEXT.endKeep, V92L_TEXT.endOwn, V92L_TEXT.keepHint]);
      expect(s.root.querySelector('#sheet .lesson-end .lead').textContent).toContain('people live here');
      expect(s.root.querySelectorAll('#sheet .lesson-learned li').length).toBe(V92L_TEXT.learned.length);
      await wait(BEAT_MS + 600);                                                        // the old timed hand-over would have come by now
      expect([Boolean(s.api.game().lesson), kind(s.api.game())]).toEqual([true, 'lessonEnd']);
      keep.click();
      expect(await waitFor(() => s.api.game() && !s.api.game().lesson)).toBe(true);
      const h = s.api.game();
      expect([Boolean(h.world.lesson), h.world.speed, Number.isInteger(h.world.handOverDay)]).toEqual([false, 1, true]);
      const seen = JSON.parse(s.storage.data['thebes.settings']).seenTips;
      for (const id of ['large_plot_card', 'fire_risk', 'raider_targets']) expect([id, seen.includes(id)]).toEqual([id, true]);
    } finally { s.cleanup(); }
  });

  it('a replay on a device with a saved city: the card is up too, says it replaces that city, and asks first with Export before it does', async () => {
    const s = await pageAt('raid', { width: 390, height: 844, store: await savedStore() });
    try {
      const g = await toLastStep(s);
      LESSON_SCRIPT.raid(g.world, s.io);
      await frame();
      expect(kind(g)).toBe('lessonEnd');
      expect(s.root.querySelector('#lesson-keep-hint').textContent).toBe(V92L_TEXT.keepHintSaved);
      s.root.querySelector('#sheet .lesson-keep').click();
      const d = g.ui.store.get().confirmDialog;
      expect([d.text, d.confirmLabel, d.extraLabel, Boolean(s.api.game().lesson)]).toEqual([V92L_TEXT.keepReplaceConfirm, V92L_TEXT.keepReplace, V92L_TEXT.exportFirst, true]);
      g.ui.store.set({ confirmDialog: null });
      expect(Boolean(s.api.game().lesson)).toBe(true);                                  // Cancel keeps the lesson's city and the card
      s.root.querySelector('#sheet .lesson-keep').click();
      s.root.querySelector('#dialog .ok').click();
      expect(await waitFor(() => s.api.game() && !s.api.game().lesson)).toBe(true);
    } finally { s.cleanup(); }
  });

  it('it never opens over a dialog or a sheet: it waits for them, and opens when they are gone', async () => {
    const s = await pageAt('raid', { width: 390, height: 844 });
    try {
      const g = await toLastStep(s);
      g.ui.store.set({ confirmDialog: { text: 'Sure?', confirmLabel: 'Yes', onConfirm() {} } });
      LESSON_SCRIPT.raid(g.world, s.io);
      await frame();
      expect([kind(g), Boolean(g.ui.store.get().confirmDialog)]).toEqual([null, true]);
      g.ui.store.set({ confirmDialog: null });
      await frame();
      expect(kind(g)).toBe('lessonEnd');
    } finally { s.cleanup(); }
  });

  it('Start my own city goes to the title', async () => {
    const s = await pageAt('raid', { width: 390, height: 844 });
    try {
      const g = await toLastStep(s);
      LESSON_SCRIPT.raid(g.world, s.io);
      await frame();
      s.root.querySelector('#sheet .lesson-new-city').click();
      expect(await waitFor(() => s.api.phase() === 'title')).toBe(true);
    } finally { s.cleanup(); }
  });
});

describe('v92 l end: the tips about what the lesson placed (design 2.4, 2.7; ruling 1759)', () => {
  it('the lesson city\'s Large plot, firehouse, tower and raid are the tips marked seen at the hand-over', () => {
    const { world } = walkLesson();
    expect(lessonTaughtTips(world)).toEqual(['large_plot_card', 'fire_risk', 'raider_targets', 'tribute_once']);
    expect(Object.values(LESSON_TAUGHT_TIPS).flat().sort()).toEqual(['fire_risk', 'large_plot_card', 'raider_targets', 'tribute_once']);
  });

  it('after the hand-over the tips wait until the goal in view is done and ten game minutes are past, whichever is later, and never beyond the cap', () => {
    const w = { day: 1000, handOverDay: 1000, handOverGoal: 'road', goals: { completed: [] } };
    expect(handOverHold(w)).toBe(true);
    w.day = 1000 + HANDOVER_HOLD_DAYS - 1; w.goals.completed = ['road'];
    expect(handOverHold(w)).toBe(true);                                                 // done, but not ten minutes yet
    w.day = 1000 + HANDOVER_HOLD_DAYS;
    expect(handOverHold(w)).toBe(false);                                                // done and the time is up
    w.goals.completed = [];
    expect(handOverHold(w)).toBe(true);                                                 // the time is up but the goal is not done
    w.day = 1000 + HANDOVER_HOLD_MAX_DAYS;
    expect(handOverHold(w)).toBe(false);                                                // never for ever
    expect(handOverHold({ day: 5, goals: { completed: [] } })).toBe(false);             // a city that was never handed over
  });
});

describe('v92 l card: Esc on a lesson card means Leave (D11)', () => {
  it('Esc opens Leave\'s question and the card stays; Enter still docks the step', async () => {
    const s = await pageAt('road', { width: 390, height: 844 });
    try {
      const g = s.g();
      expect(Boolean(stepCard(s.root))).toBe(true);
      document.activeElement && document.activeElement.blur();
      escape({ from: s.root.querySelector('.lc-go') });
      const d = g.ui.store.get().confirmDialog;
      expect([d && d.text, d && d.confirmLabel, Boolean(stepCard(s.root))]).toEqual([D2_TEXT.leaveConfirm, D2_TEXT.menuLeave, true]);
      g.ui.store.set({ confirmDialog: null });
      await frame();
      enter({ from: s.root.querySelector('.lc-go') });
      s.root.querySelector('.lc-go').click();                                           // (a focused button keeps its own Enter: the click is what that does)
      await frame();
      expect(Boolean(stepCard(s.root))).toBe(false);
    } finally { s.cleanup(); }
  });
});
