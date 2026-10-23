// Version 6.0.1 (rulings 820-823): the lesson never traps the player. The owner's report: at the staged fire (step 12) the view stayed on the burning bazaar with the
// rest of the map dimmed and covered, and there was no way past it. Two causes, each tested both ways:
//  1. the staged blaze's outcome hung on the player's firehouse: undo it (the "Firehouse placed · Undo" toast is up as the fire is lit), demolish it or pause it and
//     the blaze grew into a fire, the game paused itself, the row still said "watch the crew put it out", and fire spread through the bazaar and the homes for a
//     month. Now a staged blaze is fought every day (src/sim/fire.js blazeDay) and always goes out in its one or two days;
//  2. the firehouse's tool left its Fire risk overlay on, with its legend as a second panel above the lesson's row, and a phone's build tray open: held sideways the
//     two left a few pixels of map (none at 150% text) round the ringed bazaar. Now a step begins on a clear map (src/ui/v60/lesson.js clearForStep).
// And at every step, held sideways at 150% text and upright: the map has room, a drag pans it and the wheel zooms it, Play, the menu and its Leave the lesson are there.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { lessonWorld, replayTo, stepDone, firstOf, lessonAt, LESSON_LENGTH } from '../../../src/sim/lesson.js';
import { lessonFacts } from '../../../src/ui/lesson.js';
import { setSpeed, setPaused, demolishAt } from '../../../src/sim/commands.js';
import { tickDay } from '../../../src/sim/clock.js';
import { burning, igniteBuilding } from '../../../src/sim/fire.js';
import { FIRE } from '../../../src/data/fire.js';
import { D2_TEXT } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fire as fireEvent } from '../../helpers/dom.js';
import { dockPlain } from '../../helpers/lesson.js';

const index = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const step = (id) => LESSON_STEPS[index(id)];
const atStep = (id) => { const w = lessonWorld(); replayTo(w, index(id)); return w; };
const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

// What a player can do to the crew once the blaze is lit: nothing, take the firehouse down (Undo or Demolish), or pause it from its sheet.
const SABOTAGE = {
  none: () => {},
  demolished: (w) => { const f = firstOf(w, 'firehouse'); demolishAt(w, f.x, f.y); },
  paused: (w) => setPaused(w, firstOf(w, 'firehouse').id, true),
};

describe('v60 d2 the staged fire always goes out (ruling 820)', () => {
  for (const [how, undo] of Object.entries(SABOTAGE)) {
    it(`goes out in its days with the firehouse ${how}, never growing, spreading or pausing the game, and the step ends`, () => {
      const w = atStep('fire');
      const bz = firstOf(w, 'bazaar');
      expect([bz.fire && bz.fire.stage, bz.fire && bz.fire.staged]).toEqual(['blaze', true]);
      undo(w);
      if (how !== 'none') expect(firstOf(w, 'firehouse') === null || firstOf(w, 'firehouse').paused).toBe(true);
      setSpeed(w, 1);
      const need = bz.fire.need;
      for (let d = 0; d < need; d++) tickDay(w);
      expect([how, bz.fire, burning(w).length, w.speed, w.danger.firePaused, w.tally.burned || 0, w.buildings[bz.id] === bz]).toEqual([how, null, 0, 1, false, 0, true]);
      expect([how, stepDone(w, step('fire')), lessonAt(w, index('fire')) > index('fire')]).toEqual([how, true, true]);
    });
  }
  it('was the trap: the same blaze not marked staged, with its crew gone, grows into a fire, pauses the game and leaves the step waiting', () => {
    const w = atStep('fire');
    const bz = firstOf(w, 'bazaar');
    delete bz.fire.staged;                                           // the blaze as 6.0 lit it
    SABOTAGE.demolished(w);
    setSpeed(w, 1);
    for (let d = 0; d < FIRE.blazeDays; d++) tickDay(w);
    expect([bz.fire && bz.fire.stage, w.speed, w.danger.firePaused, stepDone(w, step('fire'))]).toEqual(['fire', 0, true, false]);
  });
  it('marks only the lesson\'s own blaze: a blaze a real city catches, with no firehouse, still grows into a fire', () => {
    const w = atStep('fire');
    const home = Object.values(w.buildings).find((b) => b.type === 'house' && b.tier > 0 && !b.fire);
    SABOTAGE.demolished(w);
    igniteBuilding(w, home.id);
    expect(Boolean(home.fire.staged)).toBe(false);
    setSpeed(w, 1);
    for (let d = 0; d < FIRE.blazeDays; d++) { tickDay(w); if (w.speed === 0) setSpeed(w, 1); }
    expect(home.fire && home.fire.stage).toBe('fire');
  });
  it('says who puts it out: the crew while a staffed firehouse reaches the bazaar, the lesson once none does, leading with what to do', () => {
    const w = atStep('fire');
    const crew = D2_TEXT.steps.fire(lessonFacts(w, step('fire')));
    expect([crew.text.startsWith('Press Play and watch the crew'), lessonFacts(w, step('fire')).crew]).toEqual([true, true]);
    SABOTAGE.demolished(w);
    const none = D2_TEXT.steps.fire(lessonFacts(w, step('fire')));
    expect([none.text.startsWith('Press Play: the lesson puts out'), none.text.includes('no staffed firehouse'), lessonFacts(w, step('fire')).crew]).toEqual([true, true, false]);
    setSpeed(w, 1);
    expect(D2_TEXT.steps.fire(lessonFacts(w, step('fire'))).text.startsWith('The lesson puts out')).toBe(true);
  });
});

// The page as a phone or a screen opens the lesson at a step (the dev scene's way: the steps before it laid by the walk-through).
async function lessonPage(stepId, { width, height, text = 100 }) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true, textSize: text, motion: 'still' }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  api.hooks.lesson({ step: index(stepId) });
  await frame();
  const g = api.game();
  dockPlain(api);                                                                    // Version 7.0 (Track P): the step's card first; these tests look at the row and the map it docks to
  await frame();
  return { api, g, root: shell.root, box: shell.root.getBoundingClientRect(), cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on', 'lesson-names-alert'); delete window.__thebes; } };
}

const shown = (n) => Boolean(n) && n.offsetParent !== null && n.getBoundingClientRect().height > 0;
// The band of map left free between the rows under the top bar and the corner buttons, as a share of the height; on a landscape phone also left of an open tray.
function freeMap(s) {
  const top = Math.max(...[...s.root.querySelectorAll('#topbar, #under-bar > *')].filter(shown).map((n) => n.getBoundingClientRect().bottom)) - s.box.top;
  const corners = [...s.root.querySelectorAll('#corners .group')].filter(shown).map((n) => n.getBoundingClientRect().top - s.box.top);
  const dock = s.root.querySelector('#dock');
  const bottom = Math.min(corners.length ? Math.min(...corners) : s.box.height, shown(dock) && s.g.ui.store.get().layout === 'portrait' ? dock.getBoundingClientRect().top - s.box.top : s.box.height);
  return Math.max(0, bottom - top) / s.box.height;
}
// The real firehouse step on a phone: the row's Show me, then the tick pressed with a finger (the tool ends, the tray and the overlay stay as a touch tick leaves them).
async function placeFirehouseByHand(s) {
  s.root.querySelector('#lesson .show-me').click();
  await frame();
  const ok = s.root.querySelector('#confirm .ok');
  fireEvent(ok, 'pointerdown', { pointerType: 'touch' });
  fireEvent(ok, 'pointerup', { pointerType: 'touch', clientX: ok.getBoundingClientRect().left + 4, clientY: ok.getBoundingClientRect().top + 4 });
  ok.click();
  await frame();
  dockPlain(s.api);                                                                  // Version 7.0 (Track P): the fire step's card, dismissed (the game plays on); paused again, as the row was before the card
  s.g.ui.speedControl.set(0);
  await frame();
}

describe('v60 d2 a step begins on a clear map (ruling 821)', () => {
  it('the leftovers of the firehouse\'s tool (its Fire risk legend and an open tray) left a phone held sideways at 150% text no map round the ringed bazaar', async () => {
    const s = await lessonPage('fire', { width: 667, height: 375, text: 150 });
    try {
      s.g.ui.store.set({ overlay: 'fire', dock: 'tray', category: 'services' });   // as 6.0 left them when the staged fire began
      await frame();
      expect([shown(s.root.querySelector('#legend > *')), freeMap(s) < 0.1]).toEqual([true, true]);
    } finally { s.cleanup(); }
  });
  for (const [w, h, text] of [[667, 375, 150], [667, 375, 100], [390, 844, 100], [1280, 800, 100]]) {
    it(`at ${w}x${h} and ${text}% text: placing the firehouse by hand begins the fire with the overlay off, a phone's tray folded and the map free round the ring`, async () => {
      const s = await lessonPage('firehouse', { width: w, height: h, text });
      try {
        await placeFirehouseByHand(s);
        const st = s.g.ui.store.get(), phone = st.layout !== 'wide';
        expect([s.root.querySelector('#lesson').dataset.step, st.overlay, phone ? st.dock : 'wide']).toEqual(['fire', null, phone ? 'slim' : 'wide']);
        expect([shown(s.root.querySelector('#lesson .text')), shown(s.root.querySelector('#legend > *'))]).toEqual([true, false]);
        if (phone) expect([`${w}x${h} ${text}%`, freeMap(s) >= 0.3]).toEqual([`${w}x${h} ${text}%`, true]);
        const play = phone ? s.root.querySelector('#corners .speed-main') : [...s.root.querySelectorAll('#topbar .speed-bar button')].find((b) => (b.getAttribute('aria-label') || '').startsWith('Play'));
        expect([shown(play), play.getBoundingClientRect().height >= 44]).toEqual([true, true]);
        play.click();
        expect(s.g.world.speed > 0).toBe(true);
      } finally { s.cleanup(); }
    });
  }
  it('keeps the tray open when the next step asks for a card (its Show me opens it anyway), and turns off an overlay all the same', async () => {
    const s = await lessonPage('granary', { width: 390, height: 844 });
    try {
      s.root.querySelector('#lesson .show-me').click();
      await frame();
      s.g.ui.store.set({ overlay: 'ground' });
      const ok = s.root.querySelector('#confirm .ok');
      fireEvent(ok, 'pointerdown', { pointerType: 'touch' });
      ok.click();
      await frame();
      const st = s.g.ui.store.get();
      expect([s.root.querySelector('#lesson').dataset.step, st.dock, st.overlay]).toEqual(['bazaar', 'tray', null]);
    } finally { s.cleanup(); }
  });
});

// Whether the instruction (the words from its start up to the end of `phrase`, what to do) sits inside the lines the row shows, on a row cut with More.
function instructionShown(s, phrase) {
  const body = s.root.querySelector('#lesson .body'), text = s.root.querySelector('#lesson .text'), node = text.firstChild;
  const at = text.textContent.indexOf(phrase);
  if (at < 0) return false;
  const range = document.createRange();
  range.setStart(node, 0); range.setEnd(node, at + phrase.length);
  const rects = [...range.getClientRects()];
  return rects.length > 0 && Math.max(...rects.map((q) => q.bottom)) <= body.getBoundingClientRect().bottom + 1;
}

describe('v60 d2 the steps that carry an alert lead with what to do (ruling 822)', () => {
  it('words the tower, fire and raid steps instruction first, from the sim both ways (a tower standing or not)', () => {
    const w = atStep('tower');
    setSpeed(w, 1); tickDay(w);
    const tower = D2_TEXT.steps.tower(lessonFacts(w, step('tower')));
    expect([tower.text.startsWith('Build a tower near the bazaar'), tower.text.includes('raiders come from the')]).toEqual([true, true]);
    const r = atStep('raid');
    setSpeed(r, 1);
    for (let d = 0; d < 400 && !r.raid.active; d++) { tickDay(r); if (r.speed === 0) setSpeed(r, 1); }
    const facts = lessonFacts(r, step('raid'));
    expect([facts.towers > 0, D2_TEXT.steps.raid(facts).text.startsWith(facts.towers > 1 ? 'Watch your towers stop' : 'Watch your tower stop')]).toEqual([true, true]);
    expect(D2_TEXT.steps.raid({ ...facts, towers: 0 }).text.startsWith('Watch what the raiders do')).toBe(true);
    expect(D2_TEXT.steps.raid({ ...facts, towers: 0 }).text.includes('no staffed tower')).toBe(true);
  });
  for (const text of [100, 125, 150]) {
    it(`keeps the instruction in sight without More on a phone held sideways at ${text}% text (the tower step with the raid warning, the fire, the raid)`, async () => {
      for (const id of ['tower', 'fire', 'raid']) {
        const s = await lessonPage(id, { width: 667, height: 375, text });
        try {
          if (id !== 'fire') {
            const w = s.g.world; setSpeed(w, 1);
            for (let d = 0; d < 400 && (id === 'tower' ? !w.raid.warning : !w.raid.active); d++) { const ev = []; tickDay(w, ev); s.g.ui.onEvents(ev); if (w.speed === 0) setSpeed(w, 1); }
            s.g.ui.refresh();
            await frame();
          }
          const at = `${id} at ${text}%: ${s.root.querySelector('#lesson .text').textContent}`;
          const phrase = { tower: 'Build a tower near the bazaar', fire: 'the crew put out the small fire', raid: 'Watch your tower stop the raiders' }[id];   // (the card's Play has the game running: "Watch the crew", not "Press Play and watch")
          expect([at, s.root.querySelector('#lesson').dataset.step, shown(s.root.querySelector('#lesson .text')), instructionShown(s, phrase)]).toEqual([at, id, true, true]);
        } finally { s.cleanup(); }
      }
    });
  }
});

describe('v60 d2 no step traps the player (ruling 823)', () => {
  for (const [w, h, text] of [[667, 375, 150], [390, 844, 100]]) {
    it(`at ${w}x${h} and ${text}% text, every step: room on the map, a drag pans it, the wheel zooms it, Play, the menu and Leave the lesson are there`, async () => {
      const wrong = [];
      for (const st of LESSON_STEPS) {
        const s = await lessonPage(st.id, { width: w, height: h, text });
        try {
          const at = `${st.id} at ${w}x${h} ${text}%`;
          if (freeMap(s) < 0.3) wrong.push(`${at}: ${Math.round(freeMap(s) * 100)}% of the height is free map`);
          const canvas = s.root.querySelector('#map'), r = canvas.getBoundingClientRect(), cam = s.g.cam;
          const x0 = r.left + r.width / 2, y0 = r.top + r.height * 0.6;
          const was = { x: cam.x, y: cam.y };
          fireEvent(canvas, 'pointerdown', { clientX: x0, clientY: y0, pointerId: 4, pointerType: 'touch' });
          for (let k = 1; k <= 6; k++) fireEvent(canvas, 'pointermove', { clientX: x0 + k * 15, clientY: y0 + k * 6, pointerId: 4, pointerType: 'touch' });
          fireEvent(canvas, 'pointerup', { clientX: x0 + 90, clientY: y0 + 36, pointerId: 4, pointerType: 'touch', buttons: 0 });
          s.g.ui.cameraControl.cancel();
          if (cam.x === was.x && cam.y === was.y) wrong.push(`${at}: a drag did not pan`);
          const z = cam.zoom;
          fireEvent(canvas, 'wheel', { clientX: x0, clientY: y0, deltaY: -200 });
          s.g.ui.cameraControl.tick(performance.now() + 5000);
          if (!(cam.zoom > z)) wrong.push(`${at}: the wheel did not zoom`);
          const play = s.root.querySelector('#corners .speed-main');
          if (!shown(play)) wrong.push(`${at}: no Play`);
          const menu = s.root.querySelector('#topbar .menu');
          if (!shown(menu)) wrong.push(`${at}: no menu`);
          else {
            menu.click();
            await frame();
            if (!shown(s.root.querySelector('#sheet .leave-lesson'))) wrong.push(`${at}: the menu has no Leave the lesson`);
          }
        } finally { s.cleanup(); }
      }
      expect(wrong).toEqual([]);
    });
  }
  it('every step that waits on the sim reaches its done state from where the walk-through leaves it, by pressing Play alone', () => {
    for (const id of ['families', 'month', 'firehouse', 'fire', 'tower', 'raid']) {
      const w = atStep(id);
      if (id === 'firehouse') continue;                               // asks the player to build first (tested by the steps' own tests)
      setSpeed(w, 1);
      let d = 0;
      for (; d < 400 && !stepDone(w, step(id)); d++) { tickDay(w); if (w.speed === 0) setSpeed(w, 1); }
      expect([id, stepDone(w, step(id))]).toEqual([id, true]);
    }
    expect(LESSON_LENGTH).toBe(LESSON_STEPS.length);
  });
});
