// Version 7.0, Track P (ruling 1002): the lesson's step card. Josh's report: the lesson's instructions were easy to ignore, so each step now opens as a card in the middle of the
// screen with the game paused behind it, and docks to its row when it is dismissed. These tests hold: the card is there at every step and says the sim's own words; it fits a
// phone upright and sideways at 150% text and a desktop without scrolling, with a 44 px button and Leave the lesson always in it; Enter, Space and Esc dismiss it and the game's keys
// do not act behind it; the game plays again at the speed the player had (a waiting step on its dismissal, a step with a part of its own once that part is done); and placing
// and the build tray work while the game is paused. The sim half (playWhen, actionDone) is set up both ways.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { LESSON_STEPS, LESSON_PLACES } from '../../../src/data/lesson.js';
import { lessonWorld, replayTo, playWhen, actionBase, actionDone, firstOf, stepDone, LESSON_SCRIPT, LESSON_LENGTH } from '../../../src/sim/lesson.js';
import { lessonFacts } from '../../../src/ui/lesson.js';
import { pictureOf } from '../../../src/ui/lessonCard.js';
import { paintHouses, place, setSpeed } from '../../../src/sim/commands.js';
import { tickDay } from '../../../src/sim/clock.js';
import { towersNeeded } from '../../../src/sim/raids.js';
import { D2_TEXT, P_TEXT } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fire as fireEvent, key } from '../../helpers/dom.js';
import { stepCard, dockCard } from '../../helpers/lesson.js';

const index = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const step = (id) => LESSON_STEPS[index(id)];
const atStep = (id) => { const w = lessonWorld(); replayTo(w, index(id)); return w; };
const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

// The page as a phone or a screen opens the lesson at a step, with its card up (the dev scene's way: the steps before it laid by the walk-through).
async function lessonPage(stepId, { width = 390, height = 844, text = 100, motion = 'still' } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true, textSize: text, motion }) });
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
  return { api, g, root: shell.root, io, box: shell.root.getBoundingClientRect(), cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on', 'lesson-names-alert', 'lesson-card-up'); delete window.__thebes; } };
}

const rowOf = (s) => s.root.querySelector('#lesson');
const goOf = (s) => s.root.querySelector('.lesson-card .lc-go');
const leaveOf = (s) => s.root.querySelector('.lesson-card .lc-leave');
const shown = (n) => Boolean(n) && n.offsetParent !== null && n.getBoundingClientRect().height > 0;

describe('v70 p the lesson\'s clock, from the sim', () => {
  it('says which steps wait on the game, which ask the player first, and which end the moment the player has built', () => {
    const modes = Object.fromEntries(LESSON_STEPS.map((s) => [s.id, playWhen(lessonWorld(), s)]));
    expect(modes).toEqual({ road: null, homes: null, well: null, families: 'card', farm: null, granary: null, bazaar: null, workers: 'act', month: 'card', largeplot: null, firehouse: 'act', fire: 'card', tower: 'card', raid: 'card' });
  });
  it('the tower step waits on the game until the raid is warned, then asks the player to build', () => {
    const w = atStep('tower');
    expect(playWhen(w, step('tower'))).toBe('card');
    setSpeed(w, 1);
    for (let d = 0; d < 40 && !w.raid.warning; d++) tickDay(w);
    expect([Boolean(w.raid.warning), playWhen(w, step('tower'))]).toEqual([true, 'act']);
  });
  it('workers: the player\'s part is a plot painted since the step began; firehouse: the firehouse standing; tower: as many towers as the warning needs, built', () => {
    const w = atStep('workers');
    const base = actionBase(w);
    expect(actionDone(w, step('workers'), base)).toBe(false);
    paintHouses(w, ...LESSON_PLACES.moreHomes);
    expect(actionDone(w, step('workers'), base)).toBe(true);
    const f = atStep('firehouse');
    expect(actionDone(f, step('firehouse'))).toBe(false);
    expect(place(f, 'firehouse', ...LESSON_PLACES.firehouse).ok).toBe(true);
    expect([firstOf(f, 'firehouse') !== null, actionDone(f, step('firehouse'))]).toEqual([true, true]);
    const t = atStep('tower');
    expect(actionDone(t, step('tower'))).toBe(false);                                   // no warning yet: nothing to build for
    setSpeed(t, 1);
    for (let d = 0; d < 40 && !t.raid.warning; d++) tickDay(t);
    expect(actionDone(t, step('tower'))).toBe(false);
    expect(place(t, 'tower', ...LESSON_PLACES.tower).ok).toBe(true);
    expect(actionDone(t, step('tower'))).toBe(Boolean(t.raid.warning) && towersNeeded(t.raid.warning.size) <= 1);
    expect(stepDone(t, step('tower'))).toBe(false);                                     // built, not yet staffed: the step is not done, the part is
  });
  it('gives every step a picture or an icon for its card (a building\'s drawing, the speed, the coin)', () => {
    const pics = Object.fromEntries(LESSON_STEPS.map((s) => [s.id, pictureOf(s)]));
    expect(Object.values(pics).every((p) => p && (p.item || p.speed || p.coin))).toBe(true);
    expect(pics.well).toEqual({ item: 'well' });
    expect(pics.families).toEqual({ speed: 2 });
  });
});

describe('v70 p the lesson\'s step card in the page', () => {
  it('opens the first step as a card over the middle of the screen with the game paused, the sim\'s own words, one button and Leave the lesson, the row waiting behind it', async () => {
    const s = await lessonPage('road');
    try {
      const card = stepCard(s.root), words = card.querySelector('.lc-words');
      const facts = lessonFacts(s.g.world, step('road'));
      expect([Boolean(card), s.g.world.speed, document.body.classList.contains('lesson-card-up')]).toEqual([true, 0, true]);
      expect([words.textContent, card.querySelector('.lc-label').textContent, goOf(s).textContent, leaveOf(s).textContent]).toEqual([D2_TEXT.steps.road(facts).text, D2_TEXT.lessonLabel(1, LESSON_LENGTH), P_TEXT.card.showMe, D2_TEXT.leave]);
      const r = card.getBoundingClientRect(), v = s.box;
      expect([Math.abs((r.left + r.right) / 2 - (v.left + v.right) / 2) < 2, Math.abs((r.top + r.bottom) / 2 - (v.top + v.bottom) / 2) < 2]).toEqual([true, true]);
      expect([card.getAttribute('role'), shown(rowOf(s)), s.root.querySelector('.lesson-ring').hidden, document.activeElement === goOf(s)]).toEqual(['dialog', false, true, true]);
      const dim = s.root.querySelector('.lesson-card-scrim'), d = dim.getBoundingClientRect();
      expect([d.width >= v.width - 1, d.height >= v.height - 1, getComputedStyle(dim).backgroundColor.startsWith('rgba')]).toEqual([true, true, true]);
    } finally { s.cleanup(); }
  });
  it('the Show me button docks the step: the card goes, the row and the ring come, the road tool is lit at the place, and the game stays paused for a step with a part of its own', async () => {
    const s = await lessonPage('road');
    try {
      goOf(s).click();
      await frame();
      const st = s.g.ui.store.get();
      expect([stepCard(s.root), shown(rowOf(s)), s.root.querySelector('.lesson-ring').hidden, st.tool && st.tool.kind, s.g.world.speed, document.body.classList.contains('lesson-card-up')]).toEqual([null, true, false, 'road', 0, false]);
    } finally { s.cleanup(); }
  });
  it('Enter, Space and Esc dismiss it from anywhere, Delete does nothing, and Space does not pause or play behind it', async () => {
    for (const k of ['Enter', ' ', 'Escape']) {
      const s = await lessonPage('road');
      try {
        s.g.ui.speedControl.set(0);
        key(s.root, 'Delete');
        key(s.root, 'Backspace');
        expect([Boolean(stepCard(s.root)), s.g.world.speed]).toEqual([true, 0]);
        document.activeElement.blur();
        key(s.root, k);
        expect([k, stepCard(s.root), s.g.world.speed]).toEqual([k, null, 0]);        // dismissed, and a step that waits for the player's building stays paused (Space did not play)
      } finally { s.cleanup(); }
    }
  });
  it('keeps Tab on its two buttons, and a focused Leave keeps its own Enter', async () => {
    const s = await lessonPage('road');
    try {
      expect(document.activeElement).toBe(goOf(s));
      key(document.activeElement, 'Tab');                                              // a real Tab is aimed at the focused control
      expect(document.activeElement).toBe(leaveOf(s));
      key(document.activeElement, 'Tab');
      expect(document.activeElement).toBe(goOf(s));
      key(document.activeElement, 'Tab', { shiftKey: true });
      expect(document.activeElement).toBe(leaveOf(s));
      key(document.activeElement, 'Enter');                                            // left to the button itself: the card is still up (a real Enter would click it)
      expect(Boolean(stepCard(s.root))).toBe(true);
    } finally { s.cleanup(); }
  });
  it('Leave the lesson is in the card at every step, 44 px tall and named, and asks its question over the card (Esc closes the question, not the card)', async () => {
    const s = await lessonPage('road');
    try {
      const b = leaveOf(s).getBoundingClientRect();
      expect([b.height >= 44, b.width >= 44, leaveOf(s).textContent]).toEqual([true, true, D2_TEXT.leave]);
      leaveOf(s).click();
      const dialog = s.root.querySelector('#dialog');
      expect([dialog.hidden, Boolean(stepCard(s.root))]).toEqual([false, true]);
      expect(Number(getComputedStyle(dialog).zIndex) > Number(getComputedStyle(s.root.querySelector('.lesson-card-scrim')).zIndex)).toBe(true);
      key(s.root, 'Escape');
      expect([s.root.querySelector('#dialog').hidden, Boolean(stepCard(s.root))]).toEqual([true, true]);
    } finally { s.cleanup(); }
  });
  it('plays a waiting step on at the speed the player had before the card paused the game (and at normal speed with none), and a step that waits for the player\'s building does not', async () => {
    const s = await lessonPage('well', { width: 1280, height: 800 });
    try {
      goOf(s).click();                                                                 // the well step docked, the game paused, the well's ghost up
      await frame();
      expect(s.g.world.speed).toBe(0);
      s.g.ui.speedControl.set(2);                                                      // the player plays at double speed while he builds
      LESSON_SCRIPT.well(s.g.world, s.io);
      await frame();
      expect([rowOf(s).dataset.step, Boolean(stepCard(s.root)), s.g.world.speed]).toEqual(['families', true, 0]);   // the next step's card paused it
      expect(goOf(s).textContent).toBe(P_TEXT.card.play);
      goOf(s).click();
      expect([stepCard(s.root), s.g.world.speed]).toEqual([null, 2]);                  // and plays again at 2x
    } finally { s.cleanup(); }
    const none = await lessonPage('families', { width: 1280, height: 800 });
    try {
      expect([none.g.world.speed, goOf(none).textContent]).toEqual([0, P_TEXT.card.play]);
      goOf(none).click();
      expect(none.g.world.speed).toBe(1);                                              // paused from the start, nothing remembered: normal speed
    } finally { none.cleanup(); }
  });
  it('workers and firehouse: the game stays paused while the player builds, then plays again by itself once his part is done', async () => {
    const w = await lessonPage('workers', { width: 1280, height: 800 });
    try {
      goOf(w).click();
      await frame();
      expect(w.g.world.speed).toBe(0);
      paintHouses(w.g.world, ...LESSON_PLACES.moreHomes);
      w.io.did();
      expect([w.g.world.speed, rowOf(w).dataset.step]).toEqual([1, 'workers']);          // his part (the plots) is done: it plays, so the workers can come
    } finally { w.cleanup(); }
    const f = await lessonPage('firehouse', { width: 1280, height: 800 });
    try {
      goOf(f).click();
      await frame();
      expect(f.g.world.speed).toBe(0);
      place(f.g.world, 'firehouse', ...LESSON_PLACES.firehouse);
      f.io.did();
      expect(f.g.world.speed).toBe(1);
      expect([rowOf(f).dataset.step, stepDone(f.g.world, step('firehouse'))]).toEqual(['firehouse', false]);   // the crew still has to take their posts: the playing is for that
    } finally { f.cleanup(); }
  });
  it('the tower step: its card plays on to the raid warning (the sim pauses there), then the game plays again once the towers are built', async () => {
    const s = await lessonPage('tower', { width: 1280, height: 800 });
    try {
      expect([goOf(s).textContent, s.g.world.speed]).toEqual([P_TEXT.card.play, 0]);
      goOf(s).click();
      expect([s.g.world.speed, s.g.ui.store.get().tool]).toEqual([1, null]);          // it waits on the game: no tool is opened over the wait
      for (let d = 0; d < 40 && !s.g.world.raid.warning; d++) s.io.tick();
      expect([Boolean(s.g.world.raid.warning), s.g.world.speed]).toEqual([true, 0]);
      place(s.g.world, 'tower', ...LESSON_PLACES.tower);
      s.io.did();
      expect(s.g.world.speed).toBe(1);
    } finally { s.cleanup(); }
  });
  it('placing works while the game is paused, and so does the build tray: the well is laid by the card\'s own Show me, the tick, with the clock stopped', async () => {
    const s = await lessonPage('well', { width: 390, height: 844 });
    try {
      goOf(s).click();
      await frame();
      expect([s.g.world.speed, s.g.ui.store.get().category, s.g.ui.store.get().tool && s.g.ui.store.get().tool.type]).toEqual([0, 'services', 'well']);
      const ok = s.root.querySelector('#confirm .ok');
      fireEvent(ok, 'pointerdown', { pointerType: 'touch' });
      ok.click();
      await frame();
      expect([firstOf(s.g.world, 'well') !== null, s.g.world.speed, rowOf(s).dataset.step]).toEqual([true, 0, 'families']);
      expect(Boolean(stepCard(s.root))).toBe(true);
    } finally { s.cleanup(); }
  });
});

describe('v70 p the card fits and can always be left', () => {
  // Every step at the hardest phone sizes and a laptop; the longest words (and the first step's Show me) at the others.
  const SIZES = [[375, 667, 100], [375, 667, 150], [390, 844, 100], [390, 844, 150], [667, 375, 100], [667, 375, 150], [1280, 800, 100], [1920, 1080, 100]];
  const EVERY = new Set(['375x667@150', '667x375@150', '1280x800@100']);
  const LONGEST = ['road', 'workers', 'largeplot', 'tower', 'fire'];
  for (const [w, h, text] of SIZES) {
    it(`at ${w}x${h} and ${text}% text the card fits without scrolling, with a 44 px named button and Leave the lesson inside the screen`, async () => {
      const wrong = [];
      for (const st of LESSON_STEPS.filter((x) => EVERY.has(`${w}x${h}@${text}`) || LONGEST.includes(x.id))) {
        const s = await lessonPage(st.id, { width: w, height: h, text });
        try {
          const at = `${st.id} at ${w}x${h} ${text}%`;
          const card = stepCard(s.root);
          if (!card) { wrong.push(`${at}: no card`); continue; }
          const r = card.getBoundingClientRect(), v = s.box;
          if (card.scrollHeight > card.clientHeight + 1) wrong.push(`${at}: the card scrolls (${card.scrollHeight} of ${card.clientHeight})`);
          if (r.left < v.left - 0.5 || r.right > v.right + 0.5 || r.top < v.top - 0.5 || r.bottom > v.bottom + 0.5) wrong.push(`${at}: the card leaves the screen`);
          const words = card.querySelector('.lc-words').getBoundingClientRect();
          if (words.bottom > r.bottom + 0.5) wrong.push(`${at}: the words are cut`);
          for (const b of [goOf(s), leaveOf(s)]) {
            const bb = b.getBoundingClientRect();
            if (bb.width < 44 || bb.height < 44 || !b.textContent.trim()) wrong.push(`${at}: ${b.className} is ${Math.round(bb.width)}x${Math.round(bb.height)}`);
            if (bb.bottom > v.bottom + 0.5 || bb.top < v.top - 0.5) wrong.push(`${at}: ${b.className} is off the screen`);
          }
        } finally { s.cleanup(); }
      }
      expect(wrong).toEqual([]);
    });
  }
  it('every step can be completed through its card and the lesson left from it: the card is up at each step with that step\'s words, and the walk-through runs on through them', async () => {
    const s = await lessonPage('road', { width: 390, height: 844 });
    try {
      for (let i = 0; i < LESSON_LENGTH; i++) {
        const st = LESSON_STEPS[i];
        const card = stepCard(s.root);
        expect([i, Boolean(card), rowOf(s).dataset.step]).toEqual([i, true, st.id]);
        expect([i, s.g.world.speed, card.querySelector('.lc-label').textContent]).toEqual([i, 0, D2_TEXT.lessonLabel(i + 1, LESSON_LENGTH)]);
        expect([i, leaveOf(s).getBoundingClientRect().height >= 44]).toEqual([i, true]);
        dockCard(s.root);
        await frame();
        s.g.ui.placement.cancel();
        LESSON_SCRIPT[st.id](s.g.world, s.io);
        await frame();
        expect([i, stepDone(s.g.world, st)]).toEqual([i, true]);
      }
      expect(stepCard(s.root)).toBe(null);                                             // the end is the sheet, not a card
    } finally { s.cleanup(); }
  });
  it('Leave the lesson from the card goes back to the title', async () => {
    const s = await lessonPage('farm', { width: 390, height: 844 });
    try {
      leaveOf(s).click();
      s.root.querySelector('#dialog .ok').click();
      for (let i = 0; i < 80 && s.api.phase() !== 'title'; i++) await new Promise((r) => setTimeout(r, 25));
      expect([s.api.phase(), document.querySelector('.lesson-card-scrim')]).toEqual(['title', null]);
    } finally { s.cleanup(); }
  });
});
